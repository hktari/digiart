"""State definition for the DigiArt post generation graph."""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class PostState:
    """State threaded through the post generation graph."""

    segment: str = ""
    history: list[dict] = field(default_factory=list)
    theme: str = ""
    draft: str = ""
    final_post: str = ""
    review_action: str = ""
    output_folder: str = ""
    image_path: str = ""
    image_draft_path: str = ""
    image_review_action: str = ""
