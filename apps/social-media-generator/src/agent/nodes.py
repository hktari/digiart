"""LangGraph node functions for the DigiArt social media generator."""

from __future__ import annotations

import random
from typing import Any

from dotenv import load_dotenv
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
    load_history,
    save_guidelines,
    save_post,
    seed_guidelines_to_store,
)
from agent.prompts import (
    EXAMPLE_POSTS,
    GUIDELINES_SECTION_TEMPLATE,
    GUIDELINES_UPDATE_PROMPT,
    PLANNER_PROMPT,
    WRITER_PROMPT,
)
from agent.state import PostState

load_dotenv()

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
    """Generate a Threads post, injecting guidelines if available."""
    pain_points = (
        CREATOR_PAIN_POINTS if state.segment == "creator" else COLLECTOR_PAIN_POINTS
    )
    pain_point = pain_points.get(state.theme, PRODUCT_FEATURES[0])

    guidelines_section = ""
    if store is not None:
        guidelines_item = store.get(("guidelines", state.segment), "content")
        if guidelines_item and guidelines_item.value:
            guidelines = guidelines_item.value.get("text", "")
            if guidelines:
                guidelines_section = GUIDELINES_SECTION_TEMPLATE.format(
                    guidelines=guidelines
                )

    prompt = WRITER_PROMPT.format(
        brand_voice=BRAND_VOICE,
        segment=state.segment,
        theme=state.theme,
        pain_point=pain_point,
        reflections_section=guidelines_section,
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
        feedback = decision.get("feedback", "")
        return {"review_action": "regenerate", "feedback": feedback}

    return {"review_action": "approve", "final_post": state.draft}


def update_guidelines_node(state: PostState, *, store: Any = None) -> dict[str, Any]:
    """Update style guidelines based on user feedback (edit or regenerate only).

    Skip update on 'approve' - no feedback to learn from.
    """
    # Skip if no actionable feedback (approve without changes)
    if state.review_action == "approve":
        return {}

    # Build feedback context based on action type
    if state.review_action == "edit":
        # For edit: compare draft vs final_post
        feedback_context = f"The user edited the draft. Changes made:\n\nOriginal:\n{state.draft}\n\nEdited version:\n{state.final_post}"
    elif state.review_action == "regenerate":
        # For regenerate: use the feedback text stored in state
        feedback_text = getattr(state, "feedback", "")
        if not feedback_text:
            return {}
        feedback_context = (
            f"The user requested regeneration with feedback:\n{feedback_text}"
        )
    else:
        return {}

    # Get current guidelines
    current_guidelines = ""
    if store is not None:
        guidelines_item = store.get(("guidelines", state.segment), "content")
        if guidelines_item and guidelines_item.value:
            current_guidelines = guidelines_item.value.get("text", "")

    # Generate updated guidelines
    prompt = GUIDELINES_UPDATE_PROMPT.format(
        current_guidelines=current_guidelines
        if current_guidelines
        else "No guidelines yet.",
        draft=state.draft,
        action=state.review_action,
        feedback_context=feedback_context,
    )
    response = _llm_extract.invoke(prompt)
    updated_guidelines = response.content.strip()

    # Save to disk and store
    save_guidelines(state.segment, updated_guidelines)
    if store is not None:
        store.put(
            ("guidelines", state.segment), "content", {"text": updated_guidelines}
        )

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
    """Seed the in-memory store with persisted guidelines at graph start."""
    if store is not None:
        for segment in SEGMENTS:
            seed_guidelines_to_store(store, segment)
    return {}
