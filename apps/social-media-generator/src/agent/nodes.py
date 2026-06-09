"""LangGraph node functions for the DigiArt social media generator."""

from __future__ import annotations

import json
import random
from typing import Any

from langchain_fireworks import ChatFireworks
from langgraph.types import interrupt

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
    pain_points = CREATOR_PAIN_POINTS if state.segment == "creator" else COLLECTOR_PAIN_POINTS
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
