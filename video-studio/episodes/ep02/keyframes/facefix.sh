#!/usr/bin/env bash
# ./keyframes/facefix.sh src.png dst.png [src dst ...]  — face-only edit (content Mosskin faces)
set -uo pipefail
cd "$(dirname "$0")/.."
while (( $# >= 2 )); do
  ./gen.sh keyframes/prompts/face-fix.txt "$2" "$1" refs/ref05_moss-closeup-smile.png || echo "FAILED $1"
  shift 2; sleep 12
done
