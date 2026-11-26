#!/usr/bin/env bash
# Hall/entrance keyframes: ./keyframes/run_b.sh <shot> <plate> <ver> [<shot> <plate> <ver> ...]
set -uo pipefail
cd "$(dirname "$0")/.."
M=../../../brand/mascot/refs
while (( $# >= 3 )); do
  s=$1; plate=$2; v=$3; shift 3
  cat keyframes/prompts/_head_b.txt keyframes/prompts/$s.txt keyframes/prompts/_tail.txt > keyframes/prompts/$s.full.txt
  ./gen.sh keyframes/prompts/$s.full.txt keyframes/$s-$v.png "$plate" \
    refs/ref02_tac-fullbody-standing.png refs/ref03_tac-sits-with-moss.png \
    $M/hero.png $M/turnaround.png refs/ref05_moss-closeup-smile.png || echo "FAILED $s"
  sleep 12
done
