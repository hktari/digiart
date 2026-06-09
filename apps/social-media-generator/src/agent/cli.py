"""CLI entry point for the DigiArt social media generator.

Usage:
    uv run agent generate    # generate drafts for both segments, pause at HITL
    uv run agent review      # review pending drafts and approve/edit/regenerate
"""

from __future__ import annotations

import sys
from pathlib import Path

from dotenv import load_dotenv
from langgraph.checkpoint.sqlite import SqliteSaver
from langgraph.store.memory import InMemoryStore
from langgraph.types import Command

from agent.config import SEGMENTS
from agent.graph import build_graph
from agent.history import seed_store_from_disk
from agent.state import PostState

load_dotenv()

OUTPUT_DIR = Path(__file__).parent.parent.parent / "output"
DB_PATH = OUTPUT_DIR / "checkpoints.db"


def _make_thread_id(segment: str) -> str:
    """Stable thread ID per segment per day."""
    from datetime import date

    return f"{segment}-{date.today().isoformat()}"


def _build_compiled_graph(checkpointer: SqliteSaver, store: InMemoryStore):
    """Build and compile graph with persistent checkpointer and store."""
    return build_graph().compile(
        checkpointer=checkpointer,
        store=store,
        name="DigiArt Post Generator",
    )


def _seed_store(store: InMemoryStore) -> None:
    for segment in SEGMENTS:
        seed_store_from_disk(store, segment)


def cmd_generate() -> None:
    """Generate drafts for both segments and pause at human review."""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    with SqliteSaver.from_conn_string(str(DB_PATH)) as checkpointer:
        store = InMemoryStore()
        _seed_store(store)
        graph = _build_compiled_graph(checkpointer, store)

        for segment in SEGMENTS:
            thread_id = _make_thread_id(segment)
            config = {"configurable": {"thread_id": thread_id}}

            print("\n" + "="*60)  # noqa: T201
            print(f"Generating post for segment: {segment.upper()}")  # noqa: T201
            print(f"Thread ID: {thread_id}")  # noqa: T201
            print("="*60)  # noqa: T201

            result = graph.invoke(
                PostState(segment=segment),
                config,
            )

            if "__interrupt__" in result:
                payload = result["__interrupt__"][0].value
                print("\nDraft ready for review!")  # noqa: T201
                print(f"Theme: {payload['theme']}")  # noqa: T201
                print(f"\n--- DRAFT ---\n{payload['draft']}\n--- END DRAFT ---")  # noqa: T201
                print("\nRun `uv run agent review` to approve, edit, or regenerate.")  # noqa: T201
            else:
                print("Post completed without interrupt (already reviewed?).")  # noqa: T201


def cmd_review() -> None:
    """Review all pending interrupted drafts interactively."""
    if not DB_PATH.exists():
        print("No checkpoints found. Run `uv run agent generate` first.")  # noqa: T201
        return

    with SqliteSaver.from_conn_string(str(DB_PATH)) as checkpointer:
        store = InMemoryStore()
        _seed_store(store)
        graph = _build_compiled_graph(checkpointer, store)

        pending = []
        for segment in SEGMENTS:
            thread_id = _make_thread_id(segment)
            config = {"configurable": {"thread_id": thread_id}}
            state = graph.get_state(config)
            if state and state.tasks:
                for task in state.tasks:
                    if hasattr(task, "interrupts") and task.interrupts:
                        for intr in task.interrupts:
                            pending.append((segment, thread_id, config, intr.value))

        if not pending:
            print("No pending drafts to review.")  # noqa: T201
            return

        for segment, thread_id, config, payload in pending:
            print("\n" + "="*60)  # noqa: T201
            print(f"Reviewing: {segment.upper()} — theme: {payload.get('theme', '?')}")  # noqa: T201
            print("="*60)  # noqa: T201
            print(f"\n{payload.get('draft', '')}\n")  # noqa: T201

            resume = _prompt_review(payload)
            result = graph.invoke(Command(resume=resume), config)

            if "__interrupt__" in result:
                print("Post regenerated — draft ready for another review.")  # noqa: T201
                new_payload = result["__interrupt__"][0].value
                print(f"\n--- NEW DRAFT ---\n{new_payload['draft']}\n--- END ---")  # noqa: T201
                reresume = _prompt_review(new_payload)
                graph.invoke(Command(resume=reresume), config)
            else:
                folder = result.get("output_folder", "")
                print(f"\nPost saved to: {folder}")  # noqa: T201


def _prompt_review(payload: dict) -> dict:
    """Prompt user for approve / edit / regenerate and return resume dict."""
    print("Options:")  # noqa: T201
    print("  [a] Approve as-is")  # noqa: T201
    print("  [e] Edit the post text")  # noqa: T201
    print("  [r] Regenerate a new draft")  # noqa: T201

    while True:
        choice = input("Choice [a/e/r]: ").strip().lower()
        if choice in ("a", ""):
            return {"action": "approve"}
        if choice == "r":
            return {"action": "regenerate"}
        if choice == "e":
            print("Enter your edited post (press Enter twice when done):")  # noqa: T201
            lines = []
            while True:
                line = input()
                if line == "" and lines and lines[-1] == "":
                    break
                lines.append(line)
            text = "\n".join(lines).strip()
            return {"action": "edit", "text": text}
        print("Invalid choice. Enter a, e, or r.")  # noqa: T201


def main() -> None:
    """Entry point dispatching to subcommands."""
    if len(sys.argv) < 2 or sys.argv[1] not in ("generate", "review"):
        print("Usage: agent <generate|review>")  # noqa: T201
        sys.exit(1)

    cmd = sys.argv[1]
    if cmd == "generate":
        cmd_generate()
    elif cmd == "review":
        cmd_review()


if __name__ == "__main__":
    main()
