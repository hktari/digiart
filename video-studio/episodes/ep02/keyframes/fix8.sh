#!/usr/bin/env bash
set -uo pipefail
cd "$(dirname "$0")/.."
./gen.sh keyframes/prompts/s08-fix.txt keyframes/s08-v4.png keyframes/s08-v3.png || exit 1
sleep 12
./gen.sh keyframes/prompts/s08end-fix.txt keyframes/s08end-v2.png keyframes/s08-v4.png ../../../brand/mascot/refs/hero.png || echo "FAILED s08end"
sleep 12
