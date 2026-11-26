#!/usr/bin/env bash
# Finals: MiniMax H3, 768P, each shot at its target length (shot 8: first + last frame). Skips shots already rendered.
set -uo pipefail
cd "$(dirname "$0")/.."
K=keyframes
# shot:keyframe:seconds[:lastframe]
list=(s01:s01-v7:7 s02:s02-v3:6 s03:s03-v2:7 s04:s04-v2:6 s04b:s04b-v2:6 s05:s05-v3:6 s06:s06-v4:7 s07:s07-v4:7
      s08:s08calm-v1:8:s08defend-v2 s08b:s08b-v2:6 s08c:s08c-v1:6 s09:s09-v4:7 s09b:s09b-v1:6 s10:s10-v2:8
      s10b:s10b-v1:7 s11:s11-v3:8 s12:s12-v3:9)
for e in "${list[@]}"; do
  IFS=: read -r s k d last <<< "$e"
  out=finals/$s-f1.mp4
  [[ -f $out ]] && continue
  args=(--prompt-file finals/prompts/$s.txt --out $out --first $K/$k.png --model minimax/h3 --resolution 768P --duration $d)
  [[ -n ${last:-} ]] && args+=(--last $K/$last.png)
  uv run -q --with replicate --with python-dotenv --with pillow python ../../scripts/gen_video.py "${args[@]}" || echo "FAILED $s"
  sleep 12
done
echo ALL DONE
