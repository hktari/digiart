#!/usr/bin/env bash
# Build each keyframe prompt (_head + shot + _tail) and generate it on the approved plate.
set -uo pipefail
cd "$(dirname "$0")/.."
M=../../../brand/mascot/refs
# VER=v2 ./keyframes/run.sh s05  -> writes sNN-v2.png (default v1)
V=${VER:-v1}
for s in "$@"; do
  plate=plates/village-v5.png
  [[ $s == s11 || $s == s12 ]] && plate=plates/night-v5.png
  cat keyframes/prompts/_head.txt keyframes/prompts/$s.txt keyframes/prompts/_tail.txt > keyframes/prompts/$s.full.txt
  ./gen.sh keyframes/prompts/$s.full.txt keyframes/$s-$V.png "$plate" \
    refs/ref02_tac-fullbody-standing.png refs/ref03_tac-sits-with-moss.png \
    $M/hero.png $M/turnaround.png refs/ref05_moss-closeup-smile.png || echo "FAILED $s"
  sleep 12
done
