#!/bin/bash
# Wrapper script for cron - runs social media post generation

set -e

# Set PATH for cron environment (include uv and common locations)
export PATH="/home/bostjan/.local/bin:$PATH:/usr/local/bin:/usr/bin:/bin"

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR/.."

# Load environment
if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

# Run generator and capture output
LOG_FILE="logs/generator-$(date +%Y%m%d-%H%M%S).log"
mkdir -p logs

{
  echo "=== Generator started at $(date) ==="
  uv run agent generate 2>&1
  EXIT_CODE=$?
  echo "=== Generator finished at $(date) with exit code $EXIT_CODE ==="

  if [ $EXIT_CODE -ne 0 ]; then
    if [ -n "$TELEGRAM_BOT_TOKEN" ] && [ -n "$TELEGRAM_CHAT_ID" ]; then
      MESSAGE="🚨 Social Media Generator Failed%0A%0AExit code: $EXIT_CODE%0ATime: $(date)%0A%0ACheck logs: $LOG_FILE"
      curl -s -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
        -d "chat_id=$TELEGRAM_CHAT_ID" \
        -d "text=$MESSAGE" \
        > /dev/null
    fi
    exit $EXIT_CODE
  fi
} | tee "$LOG_FILE"

# Restart Telegram bot so it picks up the new pending draft via notify_pending
systemctl --user restart social-media-bot.service 2>/dev/null || true

# Clean up old logs (keep last 30 days)
find logs/ -name "generator-*.log" -mtime +30 -delete 2>/dev/null || true
