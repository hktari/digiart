"""LangGraph node functions for the DigiArt social media generator."""

from __future__ import annotations

import json
import os
import random
from pathlib import Path
from typing import Any

import replicate
import requests
from dotenv import load_dotenv
from langchain_fireworks import ChatFireworks
from langgraph.types import interrupt

load_dotenv()

from agent.config import (
    BRAND_VOICE,
    COLLECTOR_ANGLES,
    COLLECTOR_PAIN_POINTS,
    CREATOR_ANGLES,
    CREATOR_PAIN_POINTS,
    PRODUCT_FEATURES,
    SEGMENTS,
)
from agent.history import (
    append_and_save_reflection,
    load_history,
    save_post,
    seed_store_from_disk,
)
from agent.prompts import (
    EXAMPLE_POSTS,
    PLANNER_PROMPT,
    REFLECTION_EXTRACTOR_PROMPT,
    REFLECTIONS_SECTION_TEMPLATE,
    WRITER_PROMPT,
)
from agent.state import PostState

_llm = ChatFireworks(
    model="accounts/fireworks/models/minimax-m2p7",
    temperature=0.7,
)

_llm_extract = ChatFireworks(
    model="accounts/fireworks/models/minimax-m2p7",
    temperature=0.2,
)


def load_history_node(state: PostState) -> dict[str, Any]:
    """Load last 5 completed posts for the segment from disk."""
    history = load_history(state.segment)
    return {"history": history}


def plan_post_node(state: PostState) -> dict[str, Any]:
    """Choose a theme not used in recent history."""
    recent_themes = [h["theme"] for h in state.history]

    angles = CREATOR_ANGLES if state.segment == "creator" else COLLECTOR_ANGLES
    available = [a for a in angles if a not in recent_themes]
    if not available:
        available = angles

    prompt = PLANNER_PROMPT.format(
        segment=state.segment,
        recent_themes=", ".join(recent_themes) if recent_themes else "none",
        available_angles=", ".join(available),
    )
    response = _llm.invoke(prompt)
    theme = response.content.strip().strip('"').strip("'")

    if theme not in angles:
        theme = random.choice(available)

    return {"theme": theme}


def write_post_node(state: PostState, *, store: Any = None) -> dict[str, Any]:
    """Generate a Threads post, injecting store reflections if available."""
    pain_points = (
        CREATOR_PAIN_POINTS if state.segment == "creator" else COLLECTOR_PAIN_POINTS
    )
    pain_point = pain_points.get(state.theme, PRODUCT_FEATURES[0])

    reflections_section = ""
    if store is not None:
        items = store.search(("reflections", state.segment), limit=10)
        if items:
            insights = "\n".join(f"- {item.value['insight']}" for item in items)
            reflections_section = REFLECTIONS_SECTION_TEMPLATE.format(insights=insights)

    prompt = WRITER_PROMPT.format(
        brand_voice=BRAND_VOICE,
        segment=state.segment,
        theme=state.theme,
        pain_point=pain_point,
        reflections_section=reflections_section,
        example_posts=EXAMPLE_POSTS,
    )
    response = _llm.invoke(prompt)
    draft = response.content.strip()
    return {"draft": draft, "final_post": draft}


def human_review_node(state: PostState) -> dict[str, Any]:
    """Pause for human review via interrupt().

    The interrupt payload surfaces the draft to the caller.
    Resume with: {"action": "approve"} | {"action": "edit", "text": "..."} | {"action": "regenerate"}
    """
    decision: dict = interrupt(
        {
            "segment": state.segment,
            "theme": state.theme,
            "draft": state.draft,
        }
    )

    action = decision.get("action", "approve")

    if action == "edit":
        final_post = decision.get("text", state.draft)
        return {"review_action": "edit", "final_post": final_post}

    if action == "regenerate":
        return {"review_action": "regenerate"}

    return {"review_action": "approve", "final_post": state.draft}


def reflect_on_feedback_node(state: PostState, *, store: Any = None) -> dict[str, Any]:
    """Extract style learnings from draft vs final and persist to store + disk."""
    if state.review_action == "regenerate":
        return {}

    prompt = REFLECTION_EXTRACTOR_PROMPT.format(
        segment=state.segment,
        theme=state.theme,
        draft=state.draft,
        final_post=state.final_post,
        action=state.review_action,
    )
    response = _llm_extract.invoke(prompt)
    raw = response.content.strip()

    try:
        insights: list[str] = json.loads(raw)
        if not isinstance(insights, list):
            insights = [raw]
    except json.JSONDecodeError:
        insights = [raw] if raw else []

    for insight in insights:
        if not insight:
            continue
        item = append_and_save_reflection(
            segment=state.segment,
            insight=insight,
            theme=state.theme,
            source=state.review_action,
        )
        if store is not None:
            store.put(("reflections", state.segment), item["id"], item)

    return {}


def save_output_node(state: PostState) -> dict[str, Any]:
    """Write the approved post to output/posts/{folder}/post.md."""
    folder = save_post(
        segment=state.segment,
        theme=state.theme,
        final_post=state.final_post,
    )
    return {"output_folder": str(folder)}


def seed_store_node(state: PostState, *, store: Any = None) -> dict[str, Any]:
    """Seed the in-memory store with persisted reflections at graph start."""
    if store is not None:
        for segment in SEGMENTS:
            seed_store_from_disk(store, segment)
    return {}


def generate_image_node(state: PostState) -> dict[str, Any]:
    """Generate a brand-consistent image using Replicate FLUX.2.

    Uses professional booklet mockup prompts from docs/outreach/booklet-mockup-image-prompts.md.
    Uses the DigiArt logo as a reference image for brand consistency.
    Saves the generated image to the post's images/ folder.
    """
    if not state.output_folder:
        return {"image_draft_path": ""}

    # Paths
    refs_dir = Path(__file__).parent.parent.parent / "image-generation-references"
    logo_path = refs_dir / "logo.png"
    output_dir = Path(state.output_folder) / "images"
    output_dir.mkdir(parents=True, exist_ok=True)

    # Select prompt variant based on theme hash for consistency
    # These are from docs/outreach/booklet-mockup-image-prompts.md
    _BOOKLET_PROMPTS = [
        # Slide 1: Hero Cover
        """Create a square 1080x1080 social carousel image.

Scene: A small premium printed art booklet lying on a warm off-white studio surface. The booklet is closed or slightly lifted at one corner. It has a gloss-laminated softcover with subtle realistic reflective highlights.

Cover: Only the DigiArt logo appears on the cover. No other text on the cover.

Design: Minimal, refined, premium, modern gallery-catalog aesthetic. The booklet should feel collectible and real, not like a corporate brochure.

Composition: Booklet centered slightly off-axis, soft natural shadows, warm paper tones, clean background, tactile print texture. Leave some clean negative space around the booklet.

Mood: Quiet luxury, physical art object, independent artist discovery, collectible print.""",
        # Slide 2: Open Artwork Spread
        """Create a square 1080x1080 social carousel image.

Scene: An open printed art booklet on a warm neutral studio surface. The booklet has a gloss-laminated softcover visible at the edges and fold, with subtle reflections. The interior pages are silk-coated paper with a smooth satin sheen.

Content: Show a two-page spread with several artworks laid out like a refined art catalog. Abstract digital art pieces in beige, fuchsia, ocean blue, and jade tones.

Interior text only: Small gallery-style captions beneath artworks. Optional small page heading: "Curated independent art."

Design: Elegant white margins, precise layout, quiet gallery-caption typography, premium printed booklet feel.

Composition: Booklet open at a realistic angle, visible center fold, slight page curvature, soft shadows, tactile paper texture.""",
        # Slide 4: Physical Product Context
        """Create a square 1080x1080 social carousel image.

Scene: A premium printed art booklet shown partially open with a few stacked pages visible. The gloss-laminated softcover catches a soft highlight. The silk-coated interior pages have a satin finish.

Cover: Only the DigiArt logo appears on the cover. No other cover text.

Visual: Show the booklet as a desirable physical object, like a small art catalog or collector zine. Include glimpses of artwork pages inside with small creator-name captions.

Design: Editorial, minimal, sophisticated. Warm off-white background, refined black or fuchsia accent typography, realistic shadows, no clutter.

Overlay text outside the booklet in surrounding negative space: "A monthly printed art release"

Mood: A physical alternative to the endless online feed.""",
    ]

    # Global style prefix - always prepended
    global_prefix = """Create a premium editorial product mockup for a printed art subscription booklet. The booklet has a gloss-laminated softcover with subtle reflective highlights and silk-coated interior paper with a smooth satin sheen. Visual style: refined contemporary art catalog, quiet luxury, warm neutral studio lighting, tactile paper texture, minimal typography, gallery-like spacing, realistic shadows, physical printed object. Avoid corporate brochure aesthetics, fake app UI, loud marketing graphics, hands, people, phones, or cluttered backgrounds.

The booklet cover must contain only the DigiArt logo. No title, no subtitle, no marketing copy, no creator names on the cover. Interior pages may include small creator-name captions."""

    logo_instruction = """Use the uploaded DigiArt logo exactly as provided. Do not redesign, distort, recolor, or replace it. Place it cleanly and minimally on the booklet cover."""

    # Select prompt based on theme for variety
    theme_hash = hash(state.theme) % len(_BOOKLET_PROMPTS)
    selected_prompt = _BOOKLET_PROMPTS[theme_hash]

    # Combine all parts
    full_prompt = f"{global_prefix}\n\n{logo_instruction}\n\n{selected_prompt}"

    # Prepare input images (logo as brand reference)
    input_images = []
    if logo_path.exists():
        input_images.append(str(logo_path))

    try:
        # Open files for upload to Replicate
        input_file_handles = []
        for img_path in input_images:
            input_file_handles.append(open(img_path, "rb"))  # noqa: SIM115

        output = replicate.run(
            "black-forest-labs/flux-2-pro",
            input={
                "prompt": full_prompt,
                "resolution": "1 MP",
                "aspect_ratio": "1:1",
                "input_images": input_file_handles,
                "output_format": "webp",
                "output_quality": 90,
                "safety_tolerance": 2,
                "prompt_upsampling": False,
            },
        )

        # Save the image as draft (pending review)
        image_draft_path = output_dir / "post-image-draft.webp"
        with open(image_draft_path, "wb") as f:
            f.write(output.read())

        return {"image_draft_path": str(image_draft_path)}

    except Exception as e:
        # Log error but don't fail the whole flow
        print(f"Image generation failed: {e}")  # noqa: T201
        return {"image_draft_path": ""}


# Telegram integration for image review
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "")


def _send_telegram_image(
    image_path: str, caption: str, *, reply_markup: dict | None = None
) -> dict | None:
    """Send image to Telegram for review. Returns message info if sent successfully."""
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        return None

    try:
        url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendPhoto"
        with open(image_path, "rb") as photo:
            files = {"photo": photo}
            data = {
                "chat_id": TELEGRAM_CHAT_ID,
                "caption": caption,
                "parse_mode": "HTML",
            }
            if reply_markup:
                data["reply_markup"] = json.dumps(reply_markup)
            response = requests.post(url, files=files, data=data, timeout=30)
            if response.status_code == 200:
                return response.json().get("result", {})
            return None
    except Exception as e:
        print(f"Telegram send failed: {e}")  # noqa: T201
        return None


def human_review_image_node(state: PostState) -> dict[str, Any]:
    """Pause for human review of generated image via interrupt().

    Also sends the image to Telegram with inline keyboard if configured.
    Resume with: {"action": "approve"} | {"action": "regenerate"}
    """
    if not state.image_draft_path:
        return {"image_path": "", "image_review_action": "skip"}

    # Send to Telegram if configured with inline keyboard
    telegram_message = None
    if TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID:
        # Use date-based thread_id to match telegram_bot.py format
        from datetime import date

        thread_id = f"{state.segment}-{date.today().isoformat()}"
        caption = (
            f"🎨 <b>Image Review Required</b>\n\n"
            f"Segment: {state.segment.upper()}\n"
            f"Theme: {state.theme}\n\n"
            f"Approve or regenerate this image?"
        )
        keyboard = {
            "inline_keyboard": [
                [
                    {
                        "text": "✅ Approve Image",
                        "callback_data": f"approve_image:{thread_id}",
                    },
                    {
                        "text": "🔁 Regenerate Image",
                        "callback_data": f"regen_image:{thread_id}",
                    },
                ]
            ]
        }
        telegram_message = _send_telegram_image(
            state.image_draft_path, caption, reply_markup=keyboard
        )
        if telegram_message:
            print(f"Image sent to Telegram for review: {state.image_draft_path}")  # noqa: T201

    # Prepare interrupt payload
    telegram_sent = bool(telegram_message)
    decision: dict = interrupt(
        {
            "segment": state.segment,
            "theme": state.theme,
            "image_draft_path": state.image_draft_path,
            "telegram_sent": telegram_sent,
            "message": "Review generated image. Options: [a]pprove or [r]egenerate",
        }
    )

    action = decision.get("action", "approve")

    if action == "regenerate":
        return {"image_review_action": "regenerate"}

    # Approve: move draft to final
    draft_path = Path(state.image_draft_path)
    if draft_path.exists():
        final_path = draft_path.parent / "post-image.webp"
        draft_path.rename(final_path)
        return {"image_path": str(final_path), "image_review_action": "approve"}

    return {"image_path": state.image_draft_path, "image_review_action": "approve"}
