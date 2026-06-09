#!/usr/bin/env python3
"""Simple client script to call the DigiArt post generation graph via langgraph-sdk."""

import asyncio
import sys
from typing import Any

from langgraph_sdk import get_client


ASSISTANT_ID = "agent"  # Matches the key in langgraph.json


async def run_post_generation(
    segment: str,
    theme: str,
    output_folder: str,
    api_url: str = "http://localhost:2024",
    auto_approve: bool = True,
) -> dict[str, Any]:
    """Run the post generation graph with the given parameters.
    
    Args:
        segment: Either "creator" or "collector"
        theme: Content angle/theme to use (e.g., "algorithm-gatekeeping", "shelf-worthy")
        output_folder: Directory to save the generated post
        api_url: Optional LangGraph API URL (defaults to http://localhost:2024)
        auto_approve: If True, automatically approve the draft at human_review
        
    Returns:
        The final graph state after completion
    """
    # Initialize client (connects to local langgraph dev server by default)
    client = get_client(url=api_url)
    
    # Input state matching PostState structure
    input_state = {
        "segment": segment,
        "theme": theme,
        "output_folder": output_folder,
    }
    
    # Create a thread for this conversation
    thread = await client.threads.create()
    thread_id = thread["thread_id"]
    
    # Stream the run — runs.stream() creates and streams a run in one call
    final_state = None
    async for chunk in client.runs.stream(
        thread_id,
        ASSISTANT_ID,
        input=input_state,
        stream_mode="values",
    ):
        if chunk.event == "values":
            final_state = chunk.data
        elif chunk.event == "end":
            break
    
    # Check if the run was interrupted (human_review node)
    state = await client.threads.get_state(thread_id)
    
    if state["tasks"] and any(
        task.get("interrupts") for task in state["tasks"]
    ):
        # Extract interrupt payload
        interrupt_payload = None
        for task in state["tasks"]:
            if task.get("interrupts"):
                interrupt_payload = task["interrupts"][0]["value"]
                break
        
        if interrupt_payload:
            print("\n--- Draft Generated ---")
            print(f"Segment: {interrupt_payload.get('segment')}")
            print(f"Theme: {interrupt_payload.get('theme')}")
            print(f"\nDraft:\n{interrupt_payload.get('draft')}")
            print("\n--- End Draft ---\n")
            
            if auto_approve:
                print("Auto-approving draft...")
                # Resume by streaming again with Command(resume=...)
                async for chunk in client.runs.stream(
                    thread_id,
                    ASSISTANT_ID,
                    command={"resume": {"action": "approve"}},
                    stream_mode="values",
                ):
                    if chunk.event == "values":
                        final_state = chunk.data
                    elif chunk.event == "end":
                        break
    
    return final_state or {}


async def main():
    """Run example usage of the client."""
    # Example: Generate a creator-focused post
    result = await run_post_generation(
        segment="creator",
        theme="algorithm-gatekeeping",
        output_folder="./output",
    )
    
    print("\n=== Final Result ===")
    print(f"Final post:\n{result.get('final_post', 'No post generated')}")
    
    return result


if __name__ == "__main__":
    # Run with: python client.py
    # Make sure langgraph dev server is running first!
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nInterrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)
