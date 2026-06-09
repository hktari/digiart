"""History and reflection persistence helpers."""

from __future__ import annotations

import json
import uuid
from datetime import datetime
from pathlib import Path

OUTPUT_DIR = Path(__file__).parent.parent.parent / "output"
POSTS_DIR = OUTPUT_DIR / "posts"


def _ensure_dirs() -> None:
    POSTS_DIR.mkdir(parents=True, exist_ok=True)


def load_history(segment: str, limit: int = 5) -> list[dict]:
    """Load last `limit` completed posts for a segment by scanning output/posts/.

    Returns a list of dicts with keys: theme, text, folder, generated_at.
    """
    _ensure_dirs()
    entries = []
    for folder in sorted(POSTS_DIR.iterdir(), reverse=True):
        if not folder.is_dir():
            continue
        # folder name: YYYY-MM-DD_HHMM_{segment}_{theme}
        parts = folder.name.split("_", 3)
        if len(parts) < 4:
            continue
        if parts[2] != segment:
            continue
        post_file = folder / "post.md"
        if not post_file.exists():
            continue
        content = post_file.read_text(encoding="utf-8")
        # Parse frontmatter
        meta = _parse_frontmatter(content)
        body = _parse_body(content)
        entries.append(
            {
                "theme": meta.get("theme", parts[3]),
                "text": body,
                "folder": folder.name,
                "generated_at": meta.get("generated_at", ""),
            }
        )
        if len(entries) >= limit:
            break
    return entries


def save_post(segment: str, theme: str, final_post: str) -> Path:
    """Write post.md + images/ dir. Returns the post folder path."""
    _ensure_dirs()
    timestamp = datetime.now().strftime("%Y-%m-%d_%H%M")
    folder_name = f"{timestamp}_{segment}_{theme}"
    folder = POSTS_DIR / folder_name
    folder.mkdir(parents=True, exist_ok=True)
    (folder / "images").mkdir(exist_ok=True)

    generated_at = datetime.now().isoformat(timespec="seconds")
    post_content = (
        f"---\n"
        f"segment: {segment}\n"
        f"theme: {theme}\n"
        f"generated_at: {generated_at}\n"
        f"---\n\n"
        f"{final_post}\n"
    )
    post_file = folder / "post.md"
    post_file.write_text(post_content, encoding="utf-8")
    return folder


def load_reflections(segment: str) -> list[dict]:
    """Load persisted reflections from JSON for a segment."""
    path = OUTPUT_DIR / f"reflections-{segment}.json"
    if not path.exists():
        return []
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return []


def save_reflections(segment: str, reflections: list[dict]) -> None:
    """Persist reflections list to JSON for a segment."""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    path = OUTPUT_DIR / f"reflections-{segment}.json"
    path.write_text(json.dumps(reflections, indent=2, ensure_ascii=False), encoding="utf-8")


def seed_store_from_disk(store: object, segment: str) -> None:
    """Load persisted reflections into the in-memory store.

    Uses duck-typing on store.put() — compatible with InMemoryStore.
    """
    reflections = load_reflections(segment)
    for item in reflections:
        key = item.get("id", str(uuid.uuid4()))
        store.put(("reflections", segment), key, item)


def append_and_save_reflection(segment: str, insight: str, theme: str, source: str) -> dict:
    """Append a new reflection insight and persist to disk. Returns the new item."""
    reflections = load_reflections(segment)
    new_item = {
        "id": str(uuid.uuid4()),
        "insight": insight,
        "source": source,
        "original_theme": theme,
        "created_at": datetime.now().isoformat(timespec="seconds"),
    }
    reflections.append(new_item)
    save_reflections(segment, reflections)
    return new_item


def _parse_frontmatter(content: str) -> dict:
    """Parse YAML-like frontmatter between --- delimiters."""
    lines = content.splitlines()
    if not lines or lines[0].strip() != "---":
        return {}
    meta: dict = {}
    for line in lines[1:]:
        if line.strip() == "---":
            break
        if ":" in line:
            key, _, value = line.partition(":")
            meta[key.strip()] = value.strip()
    return meta


def _parse_body(content: str) -> str:
    """Extract body text after the closing --- of frontmatter."""
    parts = content.split("---", 2)
    if len(parts) >= 3:
        return parts[2].strip()
    return content.strip()
