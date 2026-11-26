#!/usr/bin/env bash
# Wrapper: ./gen.sh <prompt-file> <out.png> [ref ...]
set -euo pipefail
pf=$1; out=$2; shift 2
args=()
for r in "$@"; do args+=(--ref "$r"); done
exec uv run -q --with replicate --with python-dotenv python "$(dirname "$0")/../../scripts/gen_image.py" \
  --prompt-file "$pf" --out "$out" "${args[@]}"
