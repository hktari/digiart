#!/usr/bin/env bash
# ./drafts/vid.sh <prompt> <out> <first> [last]
set -uo pipefail
cd "$(dirname "$0")/.."
args=(--prompt-file "$1" --out "$2" --first "$3")
[[ $# -ge 4 ]] && args+=(--last "$4")
uv run -q --with replicate --with python-dotenv --with pillow python ../../scripts/gen_video.py "${args[@]}"
