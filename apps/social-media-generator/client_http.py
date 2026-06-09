#!/usr/bin/env python3
"""Simple HTTP client to call the DigiArt post generation graph API."""

import asyncio
import sys
from typing import Any

import httpx

API_BASE = "http://localhost:2024"
ASSISTANT_ID = "fe096781-5601-53d2-b2f6-0d3403f7e9ca"


async def run_post_generation(
    segment: str,
    theme: str,
    output_folder: str,
    auto_approve: bool = True,
) -> dict[str, Any]:
    """Run the post generation graph with the given parameters.
    
    Args:
        segment: Either "creator" or "collector"
        theme: Content angle/theme to use
        output_folder: Directory to save the generated post
        auto_approve: If True, automatically approve the draft at human_review
        
    Returns:
        The final graph state after completion
    """
    async with httpx.AsyncClient(base_url=API_BASE, timeout=300.0) as client:
        # Create a thread
        thread_resp = await client.post("/threads", json={})
        thread = thread_resp.json()
        thread_id = thread["thread_id"]
        
        # Input state
        input_state = {
            "segment": segment,
            "theme": theme,
            "output_folder": output_folder,
            "history": [],
            "draft": "",
            "final_post": "",
            "review_action": "",
        }
        
        # Start the run (non-streaming first to check for immediate errors)
        run_resp = await client.post(
            f"/threads/{thread_id}/runs",
            json={
                "assistant_id": ASSISTANT_ID,
                "input": input_state,
            },
        )
        run = run_resp.json()
        run_id = run["run_id"]
        
        # Poll for status and check for interrupts
        while True:
            status_resp = await client.get(f"/threads/{thread_id}/runs/{run_id}")
            status = status_resp.json()
            
            if status["status"] == "interrupted":
                # Get the interrupt payload
                state_resp = await client.get(f"/threads/{thread_id}/state")
                state = state_resp.json()
                
                # Find interrupt in tasks
                interrupt_data = None
                for task in state.get("tasks", []):
                    if task.get("interrupts"):
                        interrupt_data = task["interrupts"][0]
                        break
                
                if interrupt_data and auto_approve:
                    print("\n--- Draft Generated ---")
                    payload = interrupt_data.get("value", {})
                    print(f"Segment: {payload.get('segment')}")
                    print(f"Theme: {payload.get('theme')}")
                    print(f"\nDraft:\n{payload.get('draft')}")
                    print("\n--- End Draft ---\n")
                    print("Auto-approving draft...")
                    
                    # Resume with approval
                    await client.post(
                        f"/threads/{thread_id}/runs/{run_id}/resume",
                        json={"input": {"action": "approve"}},
                    )
                    continue
                else:
                    print("Interrupted (no auto-approve)")
                    return state
                    
            elif status["status"] in ("success", "completed"):
                # Get final state
                state_resp = await client.get(f"/threads/{thread_id}/state")
                return state_resp.json()
                
            elif status["status"] == "error":
                raise RuntimeError(f"Run failed: {status}")
            
            # Wait before polling again
            await asyncio.sleep(1)


async def main():
    """Run example usage of the client."""
    result = await run_post_generation(
        segment="creator",
        theme="algorithm-gatekeeping",
        output_folder="./output",
    )
    
    print("\n=== Final Result ===")
    final_values = result.get("values", {})
    print(f"Final post saved to: {final_values.get('output_folder')}")
    print(f"\nFinal post content:\n{final_values.get('final_post', 'N/A')[:200]}...")
    
    return result


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nInterrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)
