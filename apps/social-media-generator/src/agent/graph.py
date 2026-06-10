"""DigiArt social media post generation graph.

Flow:
  load_history → plan_post → write_post → human_review (text)
    → (regenerate → write_post | reflect_on_feedback → save_output → END)
"""

from __future__ import annotations

from typing import Literal

from langgraph.graph import END, StateGraph

from agent.nodes import (
    human_review_node,
    load_history_node,
    plan_post_node,
    save_output_node,
    update_guidelines_node,
    write_post_node,
)
from agent.state import PostState


def _route_after_review(
    state: PostState,
) -> Literal["update_guidelines"]:
    """Always route to update_guidelines to process feedback (or skip if approve)."""
    return "update_guidelines"


def _route_after_guidelines_update(
    state: PostState,
) -> Literal["write_post", "save_output"]:
    """Route after guidelines update based on original action."""
    if state.review_action == "regenerate":
        return "write_post"
    return "save_output"


def build_graph() -> StateGraph:
    """Build and return the compiled post generation graph.

    Caller is responsible for compiling with checkpointer + store.
    """
    builder = StateGraph(PostState)

    builder.add_node("load_history", load_history_node)
    builder.add_node("plan_post", plan_post_node)
    builder.add_node("write_post", write_post_node)
    builder.add_node("human_review", human_review_node)
    builder.add_node("update_guidelines", update_guidelines_node)
    builder.add_node("save_output", save_output_node)

    builder.add_edge("__start__", "load_history")
    builder.add_edge("load_history", "plan_post")
    builder.add_edge("plan_post", "write_post")
    builder.add_edge("write_post", "human_review")
    builder.add_conditional_edges("human_review", _route_after_review)
    builder.add_conditional_edges("update_guidelines", _route_after_guidelines_update)
    builder.add_edge("save_output", END)

    return builder


# Compiled graph for LangGraph API / langgraph dev.
# No checkpointer or store passed — the platform injects its own persistence.
# For CLI use (SqliteSaver), see cli.py.
graph = build_graph().compile(name="DigiArt Post Generator")
