#!/usr/bin/env bash
# ./final/master.sh in.mp4 out.mp4  -> two-pass loudnorm to -14 LUFS / -1 dBTP (video copied)
set -euo pipefail
J=$(ffmpeg -hide_banner -nostats -i "$1" -af loudnorm=I=-14:TP=-1:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
read -r i tp lra th off < <(echo "$J" | python3 -c "import json,sys;d=json.load(sys.stdin);print(d['input_i'],d['input_tp'],d['input_lra'],d['input_thresh'],d['target_offset'])")
ffmpeg -hide_banner -loglevel error -y -i "$1" -c:v copy \
  -af "loudnorm=I=-14:TP=-1:LRA=11:measured_I=${i}:measured_TP=${tp}:measured_LRA=${lra}:measured_thresh=${th}:offset=${off}:linear=true,aresample=48000,alimiter=limit=0.79:attack=2:release=60:level=false" \
  -c:a aac -b:a 256k "$2"
ffmpeg -hide_banner -nostats -i "$2" -af ebur128=peak=true -f null - 2>&1 | grep -A14 Summary | grep -E " I:| Peak:"
