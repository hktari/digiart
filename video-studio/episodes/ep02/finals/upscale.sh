#!/usr/bin/env bash
# ./finals/upscale.sh  -> finals/1080/<shot>.mp4 for every finals/<shot>-f*.mp4 (newest take wins; model audio removed)
set -uo pipefail
cd "$(dirname "$0")"
mkdir -p 1080
for f in s*-f*.mp4; do
  s=${f%%-f*}
  ffmpeg -hide_banner -loglevel error -y -i "$f" -an \
    -vf "scale=-2:1920:flags=lanczos,crop=1080:1920,unsharp=5:5:0.45:5:5:0.0,fps=30" \
    -c:v libx264 -crf 16 -preset slow -pix_fmt yuv420p "1080/$s.mp4"
  echo "1080/$s.mp4 <- $f"
done
# Shots where Boštjan preferred the H3 Lite draft's animation over the final (480x864, cover-scale to 1080x1920)
for pair in "s10:s10-d3"; do
  s=${pair%%:*}; d=${pair#*:}
  ffmpeg -hide_banner -loglevel error -y -i "../drafts/silent/$d.mp4" -an \
    -vf "scale=1080:1920:force_original_aspect_ratio=increase:flags=lanczos,crop=1080:1920,unsharp=5:5:0.6:5:5:0.0,fps=30" \
    -c:v libx264 -crf 16 -preset slow -pix_fmt yuv420p "1080/$s.mp4"
  echo "1080/$s.mp4 <- drafts/silent/$d.mp4 (draft preferred)"
done
