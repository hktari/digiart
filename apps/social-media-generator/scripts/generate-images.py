#!/usr/bin/env python3
"""Generate brand-consistent images (Replicate FLUX.2 Pro) matching specific posts.

Uses the DigiArt logo as a brand reference (input_images) and the booklet
mockup style from docs/outreach/booklet-mockup-image-prompts.md. Saves each
image into the post folder's images/post-image.webp.

Usage:
    uv run python scripts/generate-images.py
"""

from __future__ import annotations

from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

import replicate

ROOT = Path(__file__).resolve().parent.parent
POSTS = ROOT / "output" / "posts"
LOGO = ROOT / "image-generation-references" / "logo.png"

STYLE_PREFIX = (
    "Create a premium editorial product mockup for a printed art subscription magazine. "
    "PRODUCT FORMAT (critical): a thin, lightweight A5-size saddle-stitched printed art "
    "magazine / zine (about 148x210mm, portrait), with a flexible soft paper cover and a "
    "thin stapled spine, only a few millimetres thick. It is NOT a hardcover book, NOT a "
    "thick hardback, NOT a bound board-cover book, NOT a chunky catalog — show a slim, "
    "bendable magazine. The cover is gloss-laminated soft paper with subtle reflective "
    "highlights; interior pages are silk-coated with a smooth satin sheen. "
    "Visual style: refined contemporary art magazine, quiet luxury, warm neutral studio "
    "lighting, tactile paper texture, minimal typography, gallery-like spacing, realistic "
    "shadows, physical printed object. Avoid corporate brochure aesthetics, fake app UI, "
    "loud marketing graphics, hands, people, phones, or cluttered backgrounds.\n\n"
    "Place the uploaded DigiArt logo lockup (the emblem plus its 'DigiArt Booklet drop' "
    "wordmark) exactly ONCE on the cover, cleanly and minimally, unchanged. That single "
    "logo lockup is the ONLY text allowed in the entire image. Do NOT duplicate, repeat, "
    "echo, or scatter the logo or its words. Do NOT add any extra titles, subtitles, "
    "marketing copy, spine text, page numbers, body paragraphs, or small captions, and "
    "absolutely no garbled, fake, or nonsense lettering anywhere. Interior artwork pages, "
    "if shown, must be wordless — art only, no text.\n\n"
    "Use the uploaded DigiArt logo exactly as provided. Do not redesign, distort, "
    "recolor, or replace it."
)

# folder name -> scene description matched to that post's message
SCENES: dict[str, str] = {
    # collector / shelf-worthy: "art that lives on your shelf, a printed object you can hold"
    "2026-06-30_2042_collector_shelf-worthy": (
        "Scene: A slim A5 printed art magazine lying flat on a warm off-white surface with two "
        "more thin issues fanned beneath it, showing how thin and lightweight each saddle-"
        "stitched issue is (only a few millimetres, visible staple in the fold). The top issue "
        "is angled so its flexible cover bends slightly, proving it is a soft magazine and not "
        "a rigid book. Soft daylight, clean negative space. Mood: a collectible physical art "
        "object worth keeping, a tangible alternative to a screen. Composition: gentle overhead "
        "three-quarter flat-lay, soft realistic shadows, tactile print texture."
    ),
    # creator / zero-audience-needed: "20 true collectors, a tight-knit community, premium small release"
    "2026-06-30_2040_creator_zero-audience-needed": (
        "Scene: A single small premium printed art booklet lying on a warm off-white studio "
        "surface, slightly lifted at one corner, presented as a desirable collectible hero "
        "object. Only the DigiArt logo on the cover. Design: minimal, refined, modern "
        "gallery-catalog aesthetic, the booklet feels collectible and real, made for a small "
        "dedicated audience rather than mass reach. Composition: booklet centered slightly "
        "off-axis, warm paper tones, soft natural shadows, generous clean negative space. "
        "Mood: quiet luxury, independent-artist discovery, a release worth subscribing to."
    ),
    # creator / algorithm-gatekeeping: "your work is buried by the feed; printed, it shows up as something people keep"
    "2026-06-30_2040_creator_algorithm-gatekeeping": (
        "Scene: An open printed art booklet on a warm neutral studio surface, showing a "
        "two-page spread where a single independent artwork is presented large and calm, like "
        "a gallery catalog page, with a small creator-name caption beneath. Silk-coated pages "
        "with a soft satin sheen, visible center fold and slight page curvature. Mood: art "
        "that is seen and kept rather than buried in a feed, no screens, no algorithm. "
        "Composition: booklet open at a realistic angle, soft shadows, generous white margins."
    ),
    # collector / collectible-archive: "make the collection feel real, a curated physical archive"
    "2026-06-12_1120_collector_collectible-archive": (
        "Scene: A small curated archive of premium printed art booklets on a warm wooden desk: "
        "one booklet open to a two-page curated artwork spread, two more closed issues stacked "
        "neatly beside it like a growing personal collection. Silk-coated satin pages, "
        "gloss-laminated covers with the DigiArt logo. Mood: a personal, curated archive of "
        "collected digital art made physical. Composition: tidy editorial still life, soft "
        "daylight, realistic shadows, clean negative space, no devices."
    ),
    # creator / direct-fan-support: "fans keep a physical piece of your work; direct monthly support"
    "2026-06-16_2317_creator_direct-fan-support": (
        "Scene: A premium printed art booklet shown partially open beside a few loose "
        "silk-coated printed art pages that preview independent artworks with small "
        "creator-name captions. The gloss-laminated softcover with the DigiArt logo catches a "
        "soft highlight. Mood: a tangible piece of an artist's work that a fan keeps and "
        "supports directly, gift-like and personal. Composition: warm off-white surface, soft "
        "realistic shadows, refined editorial layout, clean negative space, no people."
    ),
    # collector / digital-art-no-physical-form: "digital art is a passing cloud; printed monthly, kept and flipped through"
    "2026-06-16_2317_collector_digital-art-no-physical-form": (
        "Scene: A close-up macro view of an open printed booklet page on silk-coated paper "
        "caught mid-flip, a single atmospheric independent artwork printed with premium quality "
        "and a small gallery-style caption. Shallow depth of field, soft satin sheen, realistic "
        "paper texture and page curl. Mood: a fleeting digital image made into a permanent, "
        "tactile object you can hold and revisit. Composition: intimate close crop at an angle, "
        "warm soft light, gentle shadows."
    ),
    # creator / recurring-revenue: "subscription rhythm; collectors get a printed booklet every month"
    "2026-06-10_1027_creator_recurring-revenue": (
        "Scene: A row of premium printed art booklets lined up left to right on a warm neutral "
        "surface like a monthly subscription series, each a gloss-laminated softcover with the "
        "DigiArt logo, receding gently into shallow depth of field. Mood: a steady recurring "
        "monthly rhythm of releases, predictable and ongoing rather than a one-off. Composition: "
        "clean editorial lineup, soft directional light, realistic shadows, generous negative "
        "space, no text other than the logo, no devices or people."
    ),
}


def main() -> int:
    if not LOGO.exists():
        raise SystemExit(f"Logo not found: {LOGO}")

    for folder, scene in SCENES.items():
        post_dir = POSTS / folder
        if not post_dir.is_dir():
            print(f"SKIP (missing): {folder}")
            continue
        images_dir = post_dir / "images"
        images_dir.mkdir(parents=True, exist_ok=True)
        out_path = images_dir / "post-image.webp"

        if out_path.exists():
            print(f"SKIP (exists): {folder}")
            continue

        prompt = f"{STYLE_PREFIX}\n\n{scene}"
        print(f"Generating: {folder} ...")
        with open(LOGO, "rb") as logo_file:
            output = replicate.run(
                "black-forest-labs/flux-2-pro",
                input={
                    "prompt": prompt,
                    "resolution": "1 MP",
                    "aspect_ratio": "1:1",
                    "input_images": [logo_file],
                    "output_format": "webp",
                    "output_quality": 90,
                    "safety_tolerance": 2,
                    "prompt_upsampling": False,
                },
            )
        with open(out_path, "wb") as f:
            f.write(output.read())
        print(f"  -> {out_path.relative_to(ROOT)}  ({out_path.stat().st_size / 1024:.0f} KB)")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
