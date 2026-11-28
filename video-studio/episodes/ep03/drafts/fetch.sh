#!/usr/bin/env bash
# ./fetch.sh < "id url" lines  -> raw/<shot>-d1.mp4, silent/<shot>-d1.mp4, strips/<shot>-d1.jpg
cd "$(dirname "$0")"
while read -r id url; do
  [[ -z "$url" ]] && continue
  shot=$(awk -v i="$id" '$2==i{print $1}' ids.txt); [[ -z "$shot" ]] && continue
  [[ -f "silent/$shot-d1.mp4" ]] && continue
  curl -s -o "raw/$shot-d1.mp4" "$url"
  ffmpeg -nostdin -loglevel error -y -i "raw/$shot-d1.mp4" -an -c:v copy "silent/$shot-d1.mp4"
  ffmpeg -nostdin -loglevel error -y -i "silent/$shot-d1.mp4" -vf "fps=1,scale=180:-1,tile=5x1" -frames:v 1 "strips/$shot-d1.jpg"
  echo "$shot ok"
done
