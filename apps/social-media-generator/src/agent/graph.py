"""DigiArt social media post generation graph.

Flow:
  load_history → plan_post → write_post → human_review (text)
    → (regenerate → write_post | reflect_on_feedback → save_output → generate_image → human_review_image)
      → (regenerate → generate_image | approve → END)
"""

from __future__ import annotations

from typing import Literal

from langgraph.graph import END, StateGraph

from agent.nodes import (
    generate_image_node,
    human_review_image_node,
    human_review_node,
    load_history_node,
    plan_post_node,
    reflect_on_feedback_node,
    save_output_node,
    write_post_node,
)
from agent.state import PostState


def _route_after_review(
    state: PostState,
) -> Literal["reflect_on_feedback", "write_post"]:
    """Route based on human review action."""
    if state.review_action == "regenerate":
        return "write_post"
    return "reflect_on_feedback"


def _route_after_image_review(
    state: PostState,
) -> Literal["generate_image", "__end__"]:
    """Route based on image review action."""
    if state.image_review_action == "regenerate":
        return "generate_image"
    return "__end__"


def build_graph() -> StateGraph:
    """Build and return the compiled post generation graph.

    Caller is responsible for compiling with checkpointer + store.
    """
    builder = StateGraph(PostState)

    builder.add_node("load_history", load_history_node)
    builder.add_node("plan_post", plan_post_node)
    builder.add_node("write_post", write_post_node)
    builder.add_node("human_review", human_review_node)
    builder.add_node("reflect_on_feedback", reflect_on_feedback_node)
    builder.add_node("save_output", save_output_node)
    builder.add_node("generate_image", generate_image_node)
    builder.add_node("human_review_image", human_review_image_node)

    builder.add_edge("__start__", "load_history")
    builder.add_edge("load_history", "plan_post")
    builder.add_edge("plan_post", "write_post")
    builder.add_edge("write_post", "human_review")
    builder.add_conditional_edges("human_review", _route_after_review)
    builder.add_edge("reflect_on_feedback", "save_output")
    builder.add_edge("save_output", "generate_image")
    builder.add_edge("generate_image", "human_review_image")
    builder.add_conditional_edges("human_review_image", _route_after_image_review)

    return builder


# Compiled graph for LangGraph API / langgraph dev.
# No checkpointer or store passed — the platform injects its own persistence.
# For CLI use (SqliteSaver), see cli.py.
graph = build_graph().compile(name="DigiArt Post Generator")
