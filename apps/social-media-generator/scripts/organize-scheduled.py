#!/usr/bin/env python3
"""Organize scheduled posts on disk from a Zernio schedule manifest.

For each manifest entry it:
  - writes a `scheduled.json` marker into the post folder (platform + slot + week)
For the week as a whole it:
  - gathers the manifest + generated CSV into output/scheduled/<ISO-week>/
  - writes a human-readable lineup.md
  - quarantines any leftover/duplicate drafts (passed via --unused) to output/_unused/

Post folders stay in output/posts/ so load_history() still sees them.

Usage:
    uv run python scripts/organize-scheduled.py \
        --manifest output/zernio-schedule.json \
        --csv output/zernio-week.csv \
        --tz +02:00 \
        --unused 2026-06-30_2041_collector_shelf-worthy
"""

from __future__ import annotations

import argparse
import json
import shutil
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / "output"
POSTS = OUTPUT / "posts"


def iso_week_label(d: date) -> str:
    y, w, _ = d.isocalendar()
    return f"{y}-W{w:02d}"


def folder_segment_theme(name: str) -> tuple[str, str]:
    parts = name.split("_", 3)
    return (parts[2], parts[3]) if len(parts) >= 4 else ("?", name)


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--manifest", required=True)
    p.add_argument("--csv", required=True)
    p.add_argument("--tz", default="+02:00")
    p.add_argument("--unused", nargs="*", default=[], help="Draft folder names to quarantine.")
    args = p.parse_args()

    entries = json.loads(Path(args.manifest).read_text(encoding="utf-8"))
    first_day = date.fromisoformat(entries[0]["scheduledAt"][:10])
    week = iso_week_label(first_day)
    week_dir = OUTPUT / "scheduled" / week
    week_dir.mkdir(parents=True, exist_ok=True)

    # Per-post markers.
    rows = []
    for e in entries:
        folder = POSTS / e["folder"]
        slot = e["scheduledAt"] + args.tz
        seg, theme = folder_segment_theme(e["folder"])
        marker = {
            "platform": "threads",
            "scheduledAt": slot,
            "week": week,
            "status": "scheduled",
            "scheduler": "zernio",
            "csv": str((week_dir / Path(args.csv).name).relative_to(OUTPUT)),
        }
        (folder / "scheduled.json").write_text(json.dumps(marker, indent=2) + "\n", encoding="utf-8")
        rows.append((slot, seg, theme, e["folder"]))

    # Gather week artifacts.
    shutil.copy2(args.csv, week_dir / Path(args.csv).name)
    shutil.copy2(args.manifest, week_dir / Path(args.manifest).name)

    # Human-readable lineup.
    lines = [
        f"# Threads schedule — {week}",
        "",
        f"7 posts, one per day. Imported via Zernio (`{Path(args.csv).name}`).",
        "",
        "| Slot | Segment | Theme | Folder |",
        "| --- | --- | --- | --- |",
    ]
    for slot, seg, theme, folder in rows:
        lines.append(f"| {slot} | {seg} | {theme} | `{folder}` |")
    (week_dir / "lineup.md").write_text("\n".join(lines) + "\n", encoding="utf-8")

    # Quarantine unused drafts.
    moved = []
    if args.unused:
        unused_dir = OUTPUT / "_unused"
        unused_dir.mkdir(parents=True, exist_ok=True)
        for name in args.unused:
            src = POSTS / name
            if src.is_dir():
                dest = unused_dir / name
                if dest.exists():
                    shutil.rmtree(dest)
                shutil.move(str(src), str(dest))
                moved.append(name)

    print(f"Week dir: {week_dir.relative_to(ROOT)}")
    print(f"Markers written: {len(rows)} post(s)")
    print(f"Quarantined: {moved or 'none'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
