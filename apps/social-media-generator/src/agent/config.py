"""DigiArt social media generator configuration.

Defines segment data, content angles, product features, and brand voice.
"""

from __future__ import annotations

BRAND_NAME = "DigiArt"
PLATFORM_URL = "https://app.digiart.btechhub.top"

SEGMENTS = ["creator", "collector"]

CREATOR_ANGLES = [
    "algorithm-gatekeeping",
    "no-passive-income",
    "fulfillment-headache",
    "ip-ownership",
    "recurring-revenue",
    "zero-audience-needed",
    "direct-fan-support",
]

COLLECTOR_ANGLES = [
    "shelf-worthy",
    "digital-art-no-physical-form",
    "curated-not-scrolled",
    "direct-creator-support",
    "monthly-surprise-unboxing",
    "collectible-archive",
    "gifting",
]

PRODUCT_FEATURES = [
    "transparent-revenue-split",
    "platform-handles-print-and-ship",
    "subscription-cycle-model",
    "browse-and-curate",
    "collectible-numbering",
    "archive-access",
    "no-algorithm",
]

CREATOR_PAIN_POINTS: dict[str, str] = {
    "algorithm-gatekeeping": "Algorithms bury your art unless you pay to boost it. Your followers never see your best work.",
    "no-passive-income": "You pour hours into digital art that lives on a feed and earns nothing once the post is stale.",
    "fulfillment-headache": "Selling physical prints means dealing with printing, packaging, shipping, and customer complaints — all on you.",
    "ip-ownership": "Most platforms claim rights to your work. You create it, they profit.",
    "recurring-revenue": "One-off sales are unpredictable. Real financial stability requires recurring, predictable income.",
    "zero-audience-needed": "You don't need 100k followers to earn. Even a small dedicated subscriber base pays consistently.",
    "direct-fan-support": "Your fans want to support you directly, not just like a post. Give them a way to.",
}

COLLECTOR_PAIN_POINTS: dict[str, str] = {
    "shelf-worthy": "You love digital art but there's nowhere to put it. A screen doesn't feel like ownership.",
    "digital-art-no-physical-form": "AI and digital art is stunning but ephemeral — it disappears in a feed and leaves nothing behind.",
    "curated-not-scrolled": "You're tired of endlessly scrolling for art you love. You want someone to curate it for you.",
    "direct-creator-support": "Liking a post doesn't pay an artist. You want your support to actually reach them.",
    "monthly-surprise-unboxing": "There's something special about physical mail — the anticipation, the unboxing, the smell of fresh print.",
    "collectible-archive": "You want to build a shelf of art you love, numbered and archiveable like a collector's library.",
    "gifting": "Gifting art is meaningful but hard. A subscription makes it easy and personal.",
}

CREATOR_FEATURE_COPY: dict[str, str] = {
    "transparent-revenue-split": "DigiArt pays out a clear % every cycle. No hidden fees, no surprises — just your earnings.",
    "platform-handles-print-and-ship": "We handle layout, printing, packaging, and worldwide shipping. You just upload and publish.",
    "subscription-cycle-model": "Collectors subscribe to you each cycle and select your releases for their personalised booklet.",
    "browse-and-curate": "Your creator page is your storefront. Share the link anywhere — it's link-in-bio ready.",
    "no-algorithm": "Your subscribers see your releases. No algorithm, no boosting, no pay-to-play.",
}

COLLECTOR_FEATURE_COPY: dict[str, str] = {
    "subscription-cycle-model": "Each cycle, you subscribe to your favourite creators and pick which releases go in your booklet.",
    "browse-and-curate": "Browse releases, subscribe to creators, and build your own personalised booklet — fully curated by you.",
    "collectible-numbering": "Every booklet is numbered. Your collection is uniquely yours.",
    "archive-access": "Missed a past issue? Access the archive and add it to a future booklet.",
    "platform-handles-print-and-ship": "Premium matte paper, perfect binding, delivered to your door. We handle everything.",
}

BRAND_VOICE = """
DigiArt brand voice:
- Casual and human — like a builder typing thoughts, not a marketer writing copy
- Lowercase-leaning: sentences don't always start with capitals
- Fragmented lines — short, one thought per line, breathing room between ideas
- Curious and honest: ask real questions, admit what you're still figuring out
- Never salesy — no "Introducing:", no urgency pressure, no hype
- Avoid corporate buzzwords ("synergy", "leverage", "disruptive", "game-changer")
- No hashtag spam — skip them entirely or use at most 1–2 that feel natural
- 0–1 emojis, only if they add warmth not decoration
"""
