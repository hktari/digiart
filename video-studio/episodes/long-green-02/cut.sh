#!/usr/bin/env bash
# Reproduce the Episode 2 clips. Cut points live in cuts.txt.
set -euo pipefail
cd "$(dirname "$0")"
bash ../../scripts/cut_clips.sh episode_2.mp4 cuts.txt .
