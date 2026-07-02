#!/usr/bin/env python3
"""Build a Zernio bulk-import CSV from approved post drafts.

Scans output/posts/*/post.md, strips the YAML frontmatter, and schedules one
post per day for Threads. Import the resulting CSV via Zernio's dashboard
(Import CSV) or API.

Usage:
    ZERNIO_PROFILE_ID=<threads_profile_id> \
    uv run python scripts/build-zernio-csv.py --start 2026-07-01 --time 12:00 --tz +02:00

Zernio CSV columns (per zernio.com bulk-upload): content, platforms,
profileIds, scheduledAt, mediaUrls. Adjust COLUMNS below if your downloaded
sample template differs.
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import sys
from datetime import date, datetime, time, timedelta
from pathlib import Path

COLUMNS = ["content", "platforms", "profileIds", "scheduledAt", "mediaUrls"]
PLATFORM = "threads"

ROOT = Path(__file__).resolve().parent.parent
POSTS_DIR = ROOT / "output" / "posts"


def strip_frontmatter(text: str) -> str:
    """Drop a leading YAML frontmatter block (--- ... ---)."""
    if text.startswith("---"):
        parts = text.split("---", 2)
        if len(parts) == 3:
            return parts[2].strip()
    return text.strip()


def load_drafts() -> list[tuple[str, str]]:
    """Return [(folder_name, body)] sorted by folder name (chronological)."""
    drafts: list[tuple[str, str]] = []
    for d in sorted(POSTS_DIR.iterdir()):
        post = d / "post.md"
        if post.is_file():
            body = strip_frontmatter(post.read_text(encoding="utf-8"))
            if body:
                drafts.append((d.name, body))
    return drafts


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--start",
        type=lambda s: date.fromisoformat(s),
        default=date.today() + timedelta(days=1),
        help="First posting date (YYYY-MM-DD). Default: tomorrow.",
    )
    parser.add_argument("--time", default="12:00", help="Posting time HH:MM. Default: 12:00.")
    parser.add_argument("--tz", default="+02:00", help="UTC offset, e.g. +02:00 (Europe/Ljubljana CEST).")
    parser.add_argument("--out", default=str(ROOT / "output" / "zernio-week.csv"))
    parser.add_argument(
        "--manifest",
        default="",
        help="Optional JSON: [{folder, scheduledAt}] for explicit order/slots. "
        "scheduledAt is local time (tz appended); overrides --start/--time.",
    )
    parser.add_argument(
        "--profile-id",
        default=os.environ.get("ZERNIO_PROFILE_ID", ""),
        help="Zernio Threads profile ID (or set ZERNIO_PROFILE_ID).",
    )
    args = parser.parse_args()

    if not args.profile_id:
        print("WARNING: no --profile-id / ZERNIO_PROFILE_ID set; leaving profileIds blank.", file=sys.stderr)

    # Build the (folder_name, body, scheduledAt) plan.
    plan: list[tuple[str, str, str]] = []
    if args.manifest:
        entries = json.loads(Path(args.manifest).read_text(encoding="utf-8"))
        for e in entries:
            post = POSTS_DIR / e["folder"] / "post.md"
            if not post.is_file():
                print(f"ERROR: manifest folder not found: {e['folder']}", file=sys.stderr)
                return 1
            body = strip_frontmatter(post.read_text(encoding="utf-8"))
            plan.append((e["folder"], body, e["scheduledAt"] + args.tz))
    else:
        hh, mm = (int(x) for x in args.time.split(":"))
        post_time = time(hh, mm)
        drafts = load_drafts()
        if not drafts:
            print("No drafts found in output/posts/*/post.md", file=sys.stderr)
            return 1
        for i, (name, body) in enumerate(drafts):
            scheduled = datetime.combine(args.start + timedelta(days=i), post_time)
            plan.append((name, body, scheduled.strftime("%Y-%m-%dT%H:%M:%S") + args.tz))

    out_path = Path(args.out)
    with out_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=COLUMNS)
        writer.writeheader()
        for name, body, scheduled_at in plan:
            writer.writerow(
                {
                    "content": body,
                    "platforms": PLATFORM,
                    "profileIds": args.profile_id,
                    "scheduledAt": scheduled_at,
                    "mediaUrls": "",
                }
            )
            print(f"{scheduled_at}  {name}")

    print(f"\nWrote {len(plan)} rows -> {out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
