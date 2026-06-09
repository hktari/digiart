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

WRITER_PROMPT = """\
You are a social media copywriter for DigiArt — a platform connecting digital artists \
with collectors who receive printed art booklets monthly.

Brand voice:
{brand_voice}

Segment: {segment}
Angle/theme: {theme}
Pain point or context: {pain_point}

{reflections_section}

Write a single Threads post (Meta's text-based social network).
Requirements:
- Maximum 500 characters total (including hashtags)
- Start with a strong hook (first line must stop the scroll)
- 2–3 short punchy sentences after the hook
- End with a clear CTA pointing to DigiArt
- 3–5 relevant hashtags on the last line
- Do NOT use emojis excessively (0–2 max)
- Do NOT mention competitor platforms by name
- Do NOT use corporate jargon

Respond with ONLY the post text, nothing else.
"""

REFLECTIONS_SECTION_TEMPLATE = """\
Style learnings from past human feedback (apply these):
{insights}
"""

REFLECTION_EXTRACTOR_PROMPT = """\
You are analysing human feedback on a social media post draft to extract style learnings.

Segment: {segment}
Theme: {theme}
Original draft:
---
{draft}
---
Human-approved final post:
---
{final_post}
---
Action taken: {action}

Compare the draft and the final. Extract 1–3 concise, actionable style insights that \
should influence future posts for the {segment} segment.

Focus on: tone shifts, structural changes, what was kept vs removed, length preferences, \
hook style, CTA style.

If the post was approved without edits, extract what made it work well.

Respond as a JSON array of insight strings. Example:
["Shorter hooks perform better — cut to the point in 8 words or fewer",
 "End CTA should name the platform explicitly: 'on DigiArt'"]

Respond with ONLY the JSON array, no other text.
"""
