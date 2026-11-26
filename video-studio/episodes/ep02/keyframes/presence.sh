#!/usr/bin/env bash
set -uo pipefail
cd "$(dirname "$0")/.."
VER=v3 ./keyframes/run.sh s08
./keyframes/run.sh s08end s08b s08c s09b
./gen.sh keyframes/prompts/s04b-scale.txt keyframes/s04b-v2.png keyframes/s04b-v1.png keyframes/s10-v2.png || echo "FAILED s04b"
