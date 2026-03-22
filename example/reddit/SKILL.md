---
name: reddit
description: Minimal Reddit posting via agent-browser CLI. KISS helper for link, text, and best-effort image posts using an already-running Chrome on CDP.
---

# Reddit via agent-browser

Small Python CLI, modeled after the Facebook example.

## Requirements

- Python 3.11+
- `agent-browser` installed and on `PATH`
- Chrome/Chromium already running with CDP enabled, usually on port `9222`
- valid Reddit cookies already present in that browser

## Entry point

```bash
python3 reddit.py post-link <subreddit> <title> <url> [--body TEXT] [--flair TEXT] [--cdp-port 9222] [--publish]
python3 reddit.py post-text <subreddit> <title> [--body TEXT] [--flair TEXT] [--cdp-port 9222] [--publish]
python3 reddit.py post-image <subreddit> <title> <image_path> [--body TEXT] [--flair TEXT] [--cdp-port 9222] [--publish]
```

## Examples

Dry-run a link post:

```bash
python3 reddit.py post-link aiArt "Question for AI artists" "https://example.com" --body "Looking for feedback" 
```

Publish a text post:

```bash
python3 reddit.py post-text aiArt "Question for AI artists" --body "What tools are you using?" --publish
```

Image post (best effort):

```bash
python3 reddit.py post-image aiArt "New piece" ./art.png --body "Made with ..." --flair "Image - Other" --publish
```

## Notes

- Safe by default: no final submit unless `--publish` is passed.
- `post-image` is best-effort because Reddit's upload UI is custom and may change.
- For `r/aiArt`, check subreddit rules before posting links or project promos.
