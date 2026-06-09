#!/usr/bin/env python3
"""Simple test script for image generation functionality."""

from __future__ import annotations

import os
import sys
from datetime import datetime
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / "src"))

from dotenv import load_dotenv

load_dotenv()

import replicate


def test_image_generation():
    """Test basic image generation with Replicate."""
    # Check API key
    api_key = os.getenv("REPLICATE_API_TOKEN")
    if not api_key:
        print("❌ REPLICATE_API_TOKEN not set in environment")
        print("Add it to .env file and try again")
        return False

    print(f"✓ REPLICATE_API_TOKEN found: {api_key[:10]}...")

    # Check logo exists
    refs_dir = Path(__file__).parent / "image-generation-references"
    logo_path = refs_dir / "logo.png"

    if not logo_path.exists():
        print(f"❌ Logo not found at {logo_path}")
        return False

    print(f"✓ Logo found at {logo_path}")

    # Create test output directory
    test_dir = Path(__file__).parent / "output" / "test_image_gen"
    test_dir.mkdir(parents=True, exist_ok=True)
    print(f"✓ Output directory: {test_dir}")

    # Simple test prompt
    test_prompt = """Create a premium editorial product mockup for a printed art subscription booklet.

Scene: A small premium printed art booklet lying on a warm off-white studio surface. The booklet is closed with a gloss-laminated softcover.

Cover: Only the DigiArt logo appears on the cover. No other text.

Design: Minimal, refined, premium, modern gallery-catalog aesthetic.

Use the uploaded DigiArt logo exactly as provided. Place it cleanly and minimally on the booklet cover.

Visual style: quiet luxury, warm neutral studio lighting, tactile paper texture, realistic shadows."""

    print("\n🎨 Sending request to Replicate (FLUX.2 Pro)...")
    print("This may take 30-60 seconds...")

    try:
        # Open file handle for upload
        logo_file = open(logo_path, "rb")

        output = replicate.run(
            "black-forest-labs/flux-2-pro",
            input={
                "prompt": test_prompt,
                "resolution": "1 MP",
                "aspect_ratio": "1:1",
                "input_images": [logo_file],
                "output_format": "webp",
                "output_quality": 90,
                "safety_tolerance": 2,
                "prompt_upsampling": False,
            },
        )

        # Save the image
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_path = test_dir / f"test_image_{timestamp}.webp"

        with open(output_path, "wb") as f:
            f.write(output.read())

        print(f"\n✅ Image generated successfully!")
        print(f"📁 Saved to: {output_path}")
        print(f"📊 File size: {output_path.stat().st_size / 1024:.1f} KB")

        return True

    except Exception as e:
        print(f"\n❌ Image generation failed: {e}")
        return False


def test_node_function():
    """Test the actual generate_image_node function."""
    from agent.nodes import generate_image_node
    from agent.state import PostState

    print("\n" + "=" * 60)
    print("Testing generate_image_node function")
    print("=" * 60)

    # Test 1: Empty output folder
    print("\nTest 1: Empty output folder...")
    state = PostState(segment="creator", output_folder="")
    result = generate_image_node(state)
    print(f"Result: {result}")
    assert result.get("image_draft_path") == "", "Should return empty image_draft_path"
    print("✅ Test 1 passed")

    # Test 2: With output folder (actual generation)
    print("\nTest 2: With valid output folder...")
    test_dir = Path(__file__).parent / "output" / "test_node"
    test_dir.mkdir(parents=True, exist_ok=True)

    state = PostState(
        segment="creator", theme="test_theme", output_folder=str(test_dir)
    )

    result = generate_image_node(state)
    print(f"Result: {result}")

    if result.get("image_draft_path"):
        print("✅ Image generated successfully")
        return True
    else:
        print("⚠️ No image generated (check REPLICATE_API_TOKEN and errors above)")
        return False


if __name__ == "__main__":
    print("=" * 60)
    print("DigiArt Image Generation Test")
    print("=" * 60)

    # Test 1: Basic API connectivity
    print("\n" + "=" * 60)
    print("Test 1: Basic Replicate API Test")
    print("=" * 60)
    basic_test_passed = test_image_generation()

    # Test 2: Node function
    print("\n" + "=" * 60)
    print("Test 2: generate_image_node function")
    print("=" * 60)
    node_test_passed = test_node_function()

    # Summary
    print("\n" + "=" * 60)
    print("Test Summary")
    print("=" * 60)
    print(f"Basic API test: {'✅ PASS' if basic_test_passed else '❌ FAIL'}")
    print(f"Node function test: {'✅ PASS' if node_test_passed else '❌ FAIL'}")

    if basic_test_passed and node_test_passed:
        print("\n🎉 All tests passed!")
        sys.exit(0)
    else:
        print("\n⚠️ Some tests failed")
        sys.exit(1)
