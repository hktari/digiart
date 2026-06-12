#!/bin/bash
# Long-running Telegram HITL bot — restart on crash, run persistently via systemd or screen

export PATH="/home/bostjan/.local/bin:$PATH:/usr/local/bin:/usr/bin:/bin"

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR/.."

if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

mkdir -p logs

while true; do
  echo "=== Telegram bot starting at $(date) ===" | tee -a logs/telegram-bot.log
  uv run telegram-bot 2>&1 | tee -a logs/telegram-bot.log
  EXIT_CODE=$?
  echo "=== Telegram bot exited with code $EXIT_CODE at $(date) — restarting in 10s ===" | tee -a logs/telegram-bot.log
  sleep 10
done
