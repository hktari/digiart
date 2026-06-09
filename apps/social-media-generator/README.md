# DigiArt Social Media Generator

LangGraph agent that generates Threads-optimised posts for DigiArt's two segments (Creators & Collectors), with optional AI-generated brand-consistent images.

## Features

- **Two segments**: Creator and Collector focused content
- **Rolling history**: Tracks last 5 posts per segment to avoid repetition
- **Human-in-the-loop**: Review, edit, or regenerate posts before publishing
- **AI Image Generation**: Automatically generates brand-consistent images using Replicate FLUX.2
- **Feedback learning**: Stores reflections from edits to improve future posts

## Project Structure

```
src/agent/
├── graph.py          # StateGraph definition
├── nodes.py          # Node functions (including image generation)
├── prompts.py        # LLM prompt templates
├── config.py         # Segment data, pain points, features
├── history.py        # Post history and persistence
├── state.py          # PostState dataclass
└── cli.py            # CLI entry point

image-generation-references/  # Brand assets for image generation
├── logo.png                   # Used as reference for brand consistency
├── booklet-front.png
├── booklet-open-2.png
├── booklet-open-3.png
└── booklet-showcase.png

output/
└── posts/
    └── YYYY-MM-DD_HHMM_{segment}_{theme}/
        ├── post.md            # Generated post text
        └── images/
            └── post-image.webp # Generated AI image
```

## Usage

### Generate drafts

```bash
uv run agent generate
```

Generates draft posts for both segments and pauses for human review.

### Review and approve

```bash
uv run agent review
```

Lists pending drafts with options to:

- `[a]` Approve as-is (saves post + generates image)
- `[e]` Edit the text manually
- `[r]` Regenerate a new draft

## Image Generation

When a post is approved, the graph automatically generates a brand-consistent image using:

- **Model**: FLUX.2 Pro via Replicate API
- **Reference**: Uses `image-generation-references/logo.png` for brand consistency
- **Prompts**: Professional booklet mockup prompts from `docs/outreach/booklet-mockup-image-prompts.md`
- **Style**: Premium editorial product mockup, quiet luxury, gloss-laminated softcover, silk-coated pages
- **Format**: 1:1 square (1080×1080), 1MP resolution, WebP format
- **Cost**: ~$0.04 per image (pay-per-use, no subscription)

### Prompt Variants

The system rotates through 3 professionally-written scene types:

1. **Hero Cover** - Closed booklet on warm studio surface
2. **Open Artwork Spread** - Two-page interior spread showing curated art
3. **Physical Product Context** - Partially open booklet as desirable art object

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Required for LLM text generation
FIREWORKS_API_KEY=your_key_here

# Required for image generation
REPLICATE_API_TOKEN=your_key_here

# Optional: Telegram notifications for image review
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
```

Get your Replicate API key at: https://replicate.com/account/api-tokens

### Telegram Setup (Optional)

When configured, generated images are automatically sent to your Telegram for review:

1. Create a bot with [@BotFather](https://t.me/botfather) and get the token
2. Start a chat with your bot and get your chat ID (use @userinfobot)
3. Add both to `.env`
4. Images are sent with approve/regenerate options

## Two-Stage Review Process

The workflow has two separate human review checkpoints:

### 1. Text Review (`uv run agent review`)

After running `generate`, you'll review the post text:

- `[a]` Approve → continues to image generation
- `[e]` Edit → modify text, then continues
- `[r]` Regenerate → creates new text draft

### 2. Image Review (`uv run agent review`)

After text approval, an image is generated and you'll review it:

- `[a]` Approve → image is finalized as `post-image.webp`
- `[r]` Regenerate → creates new image with same prompt

**Note**: If Telegram is configured, the image is also sent there with review instructions.

### Review Command Behavior

Running `uv run agent review` checks for **both** pending text reviews and image reviews:

```
# Example session
$ uv run agent review

Reviewing TEXT: CREATOR — theme: recurring-revenue

Draft text here...

Options:
  [a] Approve as-is
  [e] Edit the post text
  [r] Regenerate a new draft
Choice [a/e/r]: a

Generating image...

Reviewing IMAGE: CREATOR — theme: recurring-revenue

Image: output/posts/.../images/post-image-draft.webp
(Also sent to Telegram for review)

Image Review Options:
  [a] Approve image
  [r] Regenerate image
Choice [a/r]: a

✓ Post saved to: output/posts/...
✓ Image saved to: output/posts/.../images/post-image.webp
```

## Pricing

- **Text generation**: Via Fireworks AI (cost depends on model)
- **Image generation**: ~$0.04/image via Replicate FLUX.2 Pro
- **Typical cost per post**: ~$0.05-0.10 (text + image)

## Brand Assets

Place reference images in `image-generation-references/`:

- `logo.png` - Required, used as brand reference for all generated images
- Additional booklet images can be used for future fine-tuning

## Graph Flow

```
load_history → plan_post → write_post → human_review (text)
  → [regenerate] → write_post
  → [approve/edit] → reflect_on_feedback → save_output → generate_image → human_review_image
      → [regenerate] → generate_image
      → [approve] → END
```
