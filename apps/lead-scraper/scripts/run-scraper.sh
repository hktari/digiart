#!/bin/bash
# Wrapper script for cron - catches any fatal errors and sends notification

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR/.."

# Load environment
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Run scraper and capture output
LOG_FILE="logs/scraper-$(date +%Y%m%d-%H%M%S).log"
mkdir -p logs

{
  echo "=== Scraper started at $(date) ==="
  pnpm run scrape --daily 2>&1
  EXIT_CODE=$?
  echo "=== Scraper finished at $(date) with exit code $EXIT_CODE ==="
  
  if [ $EXIT_CODE -ne 0 ]; then
    # Send Telegram notification on failure
    if [ ! -z "$TELEGRAM_BOT_TOKEN" ] && [ ! -z "$TELEGRAM_CHAT_ID" ]; then
      MESSAGE="🚨 Lead Scraper Failed%0A%0AExit code: $EXIT_CODE%0ATime: $(date)%0A%0ACheck logs: $LOG_FILE"
      curl -s -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
        -d "chat_id=$TELEGRAM_CHAT_ID" \
        -d "text=$MESSAGE" \
        > /dev/null
    fi
    exit $EXIT_CODE
  fi
} | tee "$LOG_FILE"

# Clean up old logs (keep last 30 days)
find logs/ -name "scraper-*.log" -mtime +30 -delete 2>/dev/null || true
