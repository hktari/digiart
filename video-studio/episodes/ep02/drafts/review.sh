#!/usr/bin/env bash
# ./drafts/review.sh draft.mp4 [...]  -> silent copy (model audio removed) + frame strip in drafts/review/
set -uo pipefail
cd "$(dirname "$0")"
mkdir -p silent review
for f in "$@"; do
  b=$(basename "$f" .mp4)
  ffmpeg -hide_banner -loglevel error -y -i "$f" -an -c:v copy "silent/$b.mp4"
  ffmpeg -hide_banner -loglevel error -y -i "$f" -vf "fps=1.6,scale=200:-1,tile=8x1" -frames:v 1 "review/$b.jpg"
done
