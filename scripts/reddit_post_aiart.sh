#!/usr/bin/env bash
set -euo pipefail

# Post to https://www.reddit.com/r/aiArt/ using an already-running Chrome
# exposed on the default CDP port (9222) with valid Reddit cookies.
#
# Default behavior is SAFE: it prepares everything but does not click Post
# unless --publish is passed.
#
# Requirements:
#   - agent-browser installed
#   - Chrome/Chromium running with --remote-debugging-port=9222
#   - valid Reddit login cookies already present in that browser
#
# Example:
#   scripts/reddit_post_aiart.sh \
#     --title "My latest AI artwork" \
#     --image /absolute/path/to/image.png \
#     --body "Made with ..." \
#     --flair Video
#
# Publish for real:
#   scripts/reddit_post_aiart.sh ... --publish

usage() {
  cat <<'EOF'
Usage:
  reddit_post_aiart.sh --title TEXT --image PATH [options]

Required:
  --title TEXT           Post title
  --image PATH           Absolute or relative path to image/video file

Optional:
  --body TEXT            Optional body/caption text
  --flair NAME           Flair name to choose. Default: Video
                         Known examples on r/aiArt: Video, Music, Text, No flair
  --port PORT            CDP port. Default: 9222
  --subreddit NAME       Default: aiArt
  --publish              Actually click the final Post button
  --verbose              Print extra progress info
  -h, --help             Show this help

Behavior:
  By default this script stops right before the final submit and prints a message.
EOF
}

TITLE=""
IMAGE=""
BODY=""
FLAIR="Video"
PORT="9222"
SUBREDDIT="aiArt"
PUBLISH=0
VERBOSE=0

log() {
  printf '%s\n' "$*" >&2
}

vlog() {
  if [[ "$VERBOSE" -eq 1 ]]; then
    log "$@"
  fi
}

json_get_ref_by_name() {
  local file="$1"
  local name="$2"
  node -e '
const fs = require("fs");
const file = process.argv[1];
const wanted = process.argv[2];
const obj = JSON.parse(fs.readFileSync(file, "utf8"));
const refs = obj?.data?.refs || {};
for (const [ref, meta] of Object.entries(refs)) {
  if ((meta?.name || "") === wanted) {
    process.stdout.write(ref);
    process.exit(0);
  }
}
process.exit(1);
' "$file" "$name"
}

json_get_ref_by_role_name_contains() {
  local file="$1"
  local role="$2"
  local needle="$3"
  node -e '
const fs = require("fs");
const file = process.argv[1];
const wantedRole = process.argv[2];
const needle = process.argv[3].toLowerCase();
const obj = JSON.parse(fs.readFileSync(file, "utf8"));
const refs = obj?.data?.refs || {};
for (const [ref, meta] of Object.entries(refs)) {
  const role = meta?.role || "";
  const name = (meta?.name || "").toLowerCase();
  if (role === wantedRole && name.includes(needle)) {
    process.stdout.write(ref);
    process.exit(0);
  }
}
process.exit(1);
' "$file" "$role" "$needle"
}

run_snapshot() {
  local outfile="$1"
  agent-browser snapshot -i --json > "$outfile"
}

click_ref() {
  local ref="$1"
  vlog "click $ref"
  agent-browser click "@$ref" >/dev/null
}

fill_ref() {
  local ref="$1"
  local text="$2"
  vlog "fill $ref"
  agent-browser fill "@$ref" "$text" >/dev/null
}

wait_ms() {
  local ms="$1"
  agent-browser wait "$ms" >/dev/null
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --title)
      TITLE="${2:-}"
      shift 2
      ;;
    --image)
      IMAGE="${2:-}"
      shift 2
      ;;
    --body)
      BODY="${2:-}"
      shift 2
      ;;
    --flair)
      FLAIR="${2:-}"
      shift 2
      ;;
    --port)
      PORT="${2:-}"
      shift 2
      ;;
    --subreddit)
      SUBREDDIT="${2:-}"
      shift 2
      ;;
    --publish)
      PUBLISH=1
      shift
      ;;
    --verbose)
      VERBOSE=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      log "Unknown argument: $1"
      usage
      exit 2
      ;;
  esac
done

if [[ -z "$TITLE" || -z "$IMAGE" ]]; then
  log "--title and --image are required"
  usage
  exit 2
fi

if ! command -v agent-browser >/dev/null 2>&1; then
  log "agent-browser not found in PATH"
  exit 1
fi

if [[ ! -f "$IMAGE" ]]; then
  log "Image/file not found: $IMAGE"
  exit 1
fi

IMAGE="$(realpath "$IMAGE")"
TMPDIR="$(mktemp -d)"
trap 'rm -rf "$TMPDIR"' EXIT

SNAP1="$TMPDIR/snap1.json"
SNAP2="$TMPDIR/snap2.json"
SNAP3="$TMPDIR/snap3.json"
SNAP4="$TMPDIR/snap4.json"

log "Connecting to Chrome on CDP port $PORT"
agent-browser connect "$PORT" >/dev/null

log "Opening submit page for r/$SUBREDDIT"
agent-browser open "https://www.reddit.com/r/$SUBREDDIT/submit" >/dev/null
wait_ms 2500
run_snapshot "$SNAP1"

TAB_IMAGE="$(json_get_ref_by_name "$SNAP1" "Images & Video")"
TITLE_REF="$(json_get_ref_by_name "$SNAP1" "Title")"
FLAIR_REF="$(json_get_ref_by_role_name_contains "$SNAP1" button "Add flair")"

log "Switching to Images & Video"
click_ref "$TAB_IMAGE"
wait_ms 2000
run_snapshot "$SNAP2"

TITLE_REF="$(json_get_ref_by_name "$SNAP2" "Title")"
UPLOAD_REF="$(json_get_ref_by_name "$SNAP2" "Upload files")"
BODY_REF="$(json_get_ref_by_role_name_contains "$SNAP2" textbox "Optional Body")" || true
POST_REF="$(json_get_ref_by_name "$SNAP2" "Post")"
FLAIR_REF="$(json_get_ref_by_role_name_contains "$SNAP2" button "Add flair")"

log "Filling title"
fill_ref "$TITLE_REF" "$TITLE"

log "Uploading file: $IMAGE"
agent-browser upload "@$UPLOAD_REF" "$IMAGE" >/dev/null
wait_ms 3000
run_snapshot "$SNAP3"

log "Opening flair chooser"
click_ref "$FLAIR_REF"
wait_ms 1200
run_snapshot "$SNAP4"

FLAIR_OPTION_REF="$(json_get_ref_by_role_name_contains "$SNAP4" radio "$FLAIR")" || {
  log "Could not find flair named like: $FLAIR"
  log "Available flair refs in snapshot:"
  node -e '
const fs = require("fs");
const obj = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
for (const [ref, meta] of Object.entries(obj?.data?.refs || {})) {
  if ((meta?.role || "") === "radio") console.error(`  ${ref}: ${meta?.name || ""}`);
}
' "$SNAP4"
  exit 1
}
ADD_REF="$(json_get_ref_by_name "$SNAP4" "Add")"

log "Selecting flair: $FLAIR"
click_ref "$FLAIR_OPTION_REF"
click_ref "$ADD_REF"
wait_ms 1000

if [[ -n "$BODY" && -n "${BODY_REF:-}" ]]; then
  log "Filling optional body"
  fill_ref "$BODY_REF" "$BODY"
  wait_ms 500
fi

log "Prepared Reddit post for r/$SUBREDDIT"
if [[ "$PUBLISH" -eq 1 ]]; then
  run_snapshot "$SNAP2"
  POST_REF="$(json_get_ref_by_name "$SNAP2" "Post")"
  log "Publishing"
  click_ref "$POST_REF"
  log "Post submitted"
else
  log "Dry run complete. Review the browser, then run again with --publish to actually submit."
fi
