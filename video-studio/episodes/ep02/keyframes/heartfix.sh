#!/usr/bin/env bash
# ./keyframes/heartfix.sh src dst [src dst ...]
set -uo pipefail
cd "$(dirname "$0")/.."
while (( $# >= 2 )); do
  ./gen.sh keyframes/prompts/heart-fix.txt "$2" "$1" ../../../brand/mascot/refs/hero.png || echo "FAILED $1"
  shift 2; sleep 12
done
