"""Prompt templates for the DigiArt social media generator."""

from __future__ import annotations

PLANNER_PROMPT = """\
You are a content strategist for DigiArt — a platform where digital artists publish \
art booklet releases that collectors subscribe to and receive as printed physical booklets.

Segment: {segment}
Recent post themes (avoid repeating these): {recent_themes}
Available angles: {available_angles}

Choose ONE angle from the available list that has NOT been used recently.
Respond with ONLY the angle key, nothing else. Example: algorithm-gatekeeping
"""

EXAMPLE_POSTS = """\
Example posts — match this exact tone and style:

---
Are you a creator looking to monetize your digital art ?

Interested in how much you could earn by uploading and promoting on DigiArt ?
Made a calculator so you can see if it's worth your time

digiart.btechhub.top/creat…

let me know what you think
---

---
what's so charming about digital art feeds ? 🤔
Is it the exploration ? Maybe, but it doesn't feel like exploring. There's not enough agency.
when I see something interesting I zoom in, then pleasant feelings emerge.
Also a desire to store it, save it. So that I can look at it again when I want to feel.

It's special because it made you feel something
Are you collecting art ?
Why not ?
---

---
We're exploring news ways to experience, share and support digital artists

looking for creators willing to test this idea with their audience. Payouts are transparent and automated.

you can get the gist here: https://digiart.btechhub.top/creators
---

---
For creators who capture moments with words + visuals:
What if your impressions did not disappear into the feed?
What if they became a small printed magazine/booklet instead?
One page for the text.
One page for the image.
A physical object built around a feeling people can keep.
like this if you find this interesting
---
"""

WRITER_PROMPT = """\
You are writing a Threads post for DigiArt — a platform connecting digital artists \
with collectors who receive printed art booklets monthly.

Brand voice:
{brand_voice}

Segment: {segment}
Angle/theme: {theme}
Pain point or context: {pain_point}

{reflections_section}

{example_posts}

Tone and style rules (derived from the examples above):
- Write in lowercase where it feels natural — do NOT capitalise every sentence start
- Short, fragmented lines — like thoughts typed in real time, not polished copy
- Use direct questions to the reader ("Are you ...?", "Why not ?", "What if ...?")
- First-person voice when appropriate ("I", "we", "Made a ...", "looking for ...")
- No hashtags unless they genuinely add value — if used, max 2, no # spam
- 0–1 emojis max
- No corporate structure: no "Introducing:", no bullet-point lists, no numbered steps
- End with a quiet CTA or a question — never a hard sell
- Maximum 500 characters total

Respond with ONLY the post text, nothing else.
"""

GUIDELINES_SECTION_TEMPLATE = """\
Style guidelines based on past feedback (follow these):
{guidelines}
"""

# Legacy template (kept for compatibility)
REFLECTIONS_SECTION_TEMPLATE = GUIDELINES_SECTION_TEMPLATE

GUIDELINES_UPDATE_PROMPT = """\
You are updating a style guidelines document for social media posts based on user feedback.

Current guidelines (if any):
---
{current_guidelines}
---

Original draft that was reviewed:
---
{draft}
---

User action: {action}

User feedback context:
---
{feedback_context}
---

Your task:
1. Analyze the feedback context to identify what the user wants changed or what worked well
2. Update the guidelines document to reflect these learnings
3. Preserve all existing guidelines that are still relevant
4. Add new guidelines based on the feedback
5. Consolidate or refine existing guidelines if they overlap with new learnings

Guidelines should be:
- Specific enough to guide future post generation
- General enough to apply across different themes/topics
- Written as bullet points
- Actionable and clear

Output ONLY the updated guidelines as markdown bullet points. Do not include any other text.
"""

# Legacy prompt (kept for compatibility)
REFLECTION_EXTRACTOR_PROMPT = GUIDELINES_UPDATE_PROMPT
