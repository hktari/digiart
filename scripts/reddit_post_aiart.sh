#!/usr/bin/env bash
set -euo pipefail

# Reddit posting helper using an already-running Chrome exposed on CDP port 9222.
#
# SAFE DEFAULT:
# - prepares the post but does not click Post unless --publish is passed
#
# Supports:
# - --mode link   (recommended for idea + landing/questionnaire posts)
# - --mode text
# - --mode image  (best-effort; Reddit's upload UI is custom and brittle)
#
# Notes for r/aiArt specifically:
# - flair is required
# - subreddit rules mention no advertising/self-promotion and that AI projects need modmail approval
# - use this script carefully for landing-page/questionnaire posts

usage() {
  cat <<'EOF'
Usage:
  reddit_post_aiart.sh --title TEXT [options]

Required:
  --title TEXT           Post title

Mode selection:
  --mode MODE            One of: link, text, image. Default: link

Mode-specific:
  --url URL              Required for --mode link
  --body TEXT            Optional body/caption text
  --image PATH           Required for --mode image

Optional:
  --flair NAME           Flair name to choose.
                         Defaults:
                           link/text -> Text
                           image     -> Image - Other
  --port PORT            CDP port. Default: 9222
  --subreddit NAME       Default: aiArt
  --publish              Actually click the final Post button
  --verbose              Print extra progress info
  -h, --help             Show this help

Examples:
  reddit_post_aiart.sh \
    --mode link \
    --title "I built a tool for AI artists" \
    --url "https://example.com" \
    --body "Would love feedback from working artists."

  reddit_post_aiart.sh \
    --mode text \
    --title "Question for AI artists" \
    --body "I'm exploring ..."

  reddit_post_aiart.sh \
    --mode image \
    --title "New piece" \
    --image ./art.png \
    --body "Made with ..."

Behavior:
  By default this script stops right before the final submit and prints a message.
EOF
}

TITLE=""
MODE="link"
URL=""
IMAGE=""
BODY=""
FLAIR=""
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

pick_default_flair() {
  if [[ -n "$FLAIR" ]]; then
    return
  fi
  case "$MODE" in
    link|text) FLAIR="Text" ;;
    image) FLAIR="Image - Other" ;;
    *) FLAIR="Text" ;;
  esac
}

upload_via_dom_injection() {
  local path="$1"
  local escaped
  escaped=$(printf '%s' "$path" | sed "s/'/'\\''/g")

  # Create a temporary file input, attach it, assign files via Playwright's setInputFiles,
  # and dispatch a change event so Reddit's custom media component can ingest it.
  agent-browser eval "(() => {
    const old = document.getElementById('__agent_browser_upload_input__');
    if (old) old.remove();
    const input = document.createElement('input');
    input.type = 'file';
    input.id = '__agent_browser_upload_input__';
    input.style.position = 'fixed';
    input.style.left = '-9999px';
    input.style.top = '0';
    document.body.appendChild(input);
    return { ok: true };
  })()" >/dev/null

  agent-browser upload "#__agent_browser_upload_input__" "$path" >/dev/null

  agent-browser eval "(() => {
    const input = document.getElementById('__agent_browser_upload_input__');
    if (!input) return { ok: false, reason: 'missing temp input' };
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return {
      ok: true,
      fileCount: input.files ? input.files.length : 0,
      names: input.files ? [...input.files].map(f => f.name) : []
    };
  })()"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --title)
      TITLE="${2:-}"
      shift 2
      ;;
    --mode)
      MODE="${2:-}"
      shift 2
      ;;
    --url)
      URL="${2:-}"
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

if [[ -z "$TITLE" ]]; then
  log "--title is required"
  usage
  exit 2
fi

case "$MODE" in
  link)
    [[ -n "$URL" ]] || { log "--url is required for --mode link"; exit 2; }
    ;;
  text)
    :
    ;;
  image)
    [[ -n "$IMAGE" ]] || { log "--image is required for --mode image"; exit 2; }
    ;;
  *)
    log "Invalid --mode: $MODE"
    exit 2
    ;;
esac

if ! command -v agent-browser >/dev/null 2>&1; then
  log "agent-browser not found in PATH"
  exit 1
fi

if [[ "$MODE" == "image" ]]; then
  if [[ ! -f "$IMAGE" ]]; then
    log "Image/file not found: $IMAGE"
    exit 1
  fi
  IMAGE="$(realpath "$IMAGE")"
fi

pick_default_flair

TMPDIR="$(mktemp -d)"
trap 'rm -rf "$TMPDIR"' EXIT

SNAP1="$TMPDIR/snap1.json"
SNAP2="$TMPDIR/snap2.json"
SNAP3="$TMPDIR/snap3.json"
SNAP4="$TMPDIR/snap4.json"
SNAP5="$TMPDIR/snap5.json"

log "Connecting to Chrome on CDP port $PORT"
agent-browser connect "$PORT" >/dev/null

log "Opening submit page for r/$SUBREDDIT"
agent-browser open "https://www.reddit.com/r/$SUBREDDIT/submit" >/dev/null
wait_ms 2500
run_snapshot "$SNAP1"

TITLE_REF="$(json_get_ref_by_name "$SNAP1" "Title")"
FLAIR_REF="$(json_get_ref_by_role_name_contains "$SNAP1" button "Add flair")"

case "$MODE" in
  link)
    TAB_REF="$(json_get_ref_by_name "$SNAP1" "Link")"
    log "Switching to Link"
    click_ref "$TAB_REF"
    wait_ms 1800
    run_snapshot "$SNAP2"

    TITLE_REF="$(json_get_ref_by_name "$SNAP2" "Title")"
    URL_REF="$(json_get_ref_by_role_name_contains "$SNAP2" textbox "Link URL")"
    BODY_REF="$(json_get_ref_by_role_name_contains "$SNAP2" textbox "Optional Body")" || true
    FLAIR_REF="$(json_get_ref_by_role_name_contains "$SNAP2" button "Add flair")"

    log "Filling title"
    fill_ref "$TITLE_REF" "$TITLE"
    log "Filling link URL"
    fill_ref "$URL_REF" "$URL"
    if [[ -n "$BODY" && -n "${BODY_REF:-}" ]]; then
      log "Filling optional body"
      fill_ref "$BODY_REF" "$BODY"
    fi
    ;;

  text)
    TAB_REF="$(json_get_ref_by_name "$SNAP1" "Text")"
    log "Using Text mode"
    click_ref "$TAB_REF" || true
    wait_ms 1200
    run_snapshot "$SNAP2"

    TITLE_REF="$(json_get_ref_by_name "$SNAP2" "Title")"
    BODY_REF="$(json_get_ref_by_role_name_contains "$SNAP2" textbox "Post body")"
    FLAIR_REF="$(json_get_ref_by_role_name_contains "$SNAP2" button "Add flair")"

    log "Filling title"
    fill_ref "$TITLE_REF" "$TITLE"
    if [[ -n "$BODY" ]]; then
      log "Filling body"
      fill_ref "$BODY_REF" "$BODY"
    fi
    ;;

  image)
    TAB_REF="$(json_get_ref_by_name "$SNAP1" "Images & Video")"
    log "Switching to Images & Video"
    click_ref "$TAB_REF"
    wait_ms 1800
    run_snapshot "$SNAP2"

    TITLE_REF="$(json_get_ref_by_name "$SNAP2" "Title")"
    BODY_REF="$(json_get_ref_by_role_name_contains "$SNAP2" textbox "Optional Body")" || true
    FLAIR_REF="$(json_get_ref_by_role_name_contains "$SNAP2" button "Add flair")"

    log "Filling title"
    fill_ref "$TITLE_REF" "$TITLE"

    log "Uploading file via DOM injection workaround: $IMAGE"
    upload_via_dom_injection "$IMAGE" >/dev/null || {
      log "Upload workaround failed. Reddit custom uploader did not accept the temp input."
      exit 1
    }
    wait_ms 3000

    if [[ -n "$BODY" && -n "${BODY_REF:-}" ]]; then
      log "Filling optional body"
      fill_ref "$BODY_REF" "$BODY"
    fi
    ;;
esac

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
run_snapshot "$SNAP5"

POST_REF="$(json_get_ref_by_name "$SNAP5" "Post")"

log "Prepared Reddit $MODE post for r/$SUBREDDIT"
if [[ "$SUBREDDIT" == "aiArt" && "$MODE" == "link" ]]; then
  log "Warning: r/aiArt rules mention no self-promotion/advertising and project posts may need modmail approval."
fi

if [[ "$PUBLISH" -eq 1 ]]; then
  log "Publishing"
  click_ref "$POST_REF"
  log "Post submitted"
else
  log "Dry run complete. Review the browser, then run again with --publish to actually submit."
fi
