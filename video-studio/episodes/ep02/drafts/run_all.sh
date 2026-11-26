#!/usr/bin/env bash
# First drafts: H3 Lite 480P, 5 s (shot 8: 6 s, first + last frame)
set -uo pipefail
cd "$(dirname "$0")/.."
K=keyframes
pairs=(s01:s01-v7 s02:s02-v3 s03:s03-v2 s04:s04-v2 s04b:s04b-v2 s05:s05-v3 s06:s06-v4 s07:s07-v4 s08b:s08b-v2 s08c:s08c-v1 s09:s09-v4 s09b:s09b-v1 s10:s10-v2 s11:s11-v2 s12:s12-v2)
for p in "${pairs[@]}"; do
  s=${p%%:*}; k=${p##*:}
  v=d1; [[ $s == s03 ]] && v=d2
  [[ -f drafts/$s-$v.mp4 ]] && continue
  ./drafts/vid.sh drafts/prompts/$s.txt drafts/$s-$v.mp4 $K/$k.png || echo "FAILED $s"
  sleep 12
done
uv run -q --with replicate --with python-dotenv --with pillow python ../../scripts/gen_video.py \
  --prompt-file drafts/prompts/s08.txt --out drafts/s08-d1.mp4 --first $K/s08-v6.png --last $K/s08end-v4.png --duration 6 || echo "FAILED s08"
echo ALL DONE
