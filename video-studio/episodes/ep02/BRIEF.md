# Ep 2 — "The village under the fig": production brief

Handoff from a Claude chat session (2026-11-25) to Claude Code. The story is approved; nothing has been generated yet. Start at **Step 1**.

## Read first

- Story and world: Claude Doc *Moss and Pa Khiao — story and world*, https://claude.ai/artifact/JhL72wFosaCL7MV1NksAiC (section "Episode 2: The village under the fig" holds the approved beats; the rest is world, palette, Mosskin, naga, Dreamers).
- Cost and model rules: Claude Doc *AI-Generated TikTok Channel Playbook*, https://claude.ai/artifact/4bbYfMYVDks3zYKjnjGELa, section "Video model costs: draft cheap, render once". Re-check model picks and prices before generating.
- Brand kit: `brand/mascot/` (character-bible.md, world-bible.md, look-and-sound.md, visual-paragraph.txt, negative-prompt.txt, sound/, graphics/).
- Scripts: `video-studio/scripts/` (`materialize.py`, `make_cards.py`, `make_sounds.py`).
- Episode 1 (the style and continuity reference): `~/Videos/printfeed/` — `episode 1.mp4` (67 s) and its three clips `ep1_clip1_arrival.mp4`, `ep1_clip2_resident.mp4`, `ep1_clip3_not_a_stranger.mp4`. Canva design "episode 1" (DAHbwvLEB8I).
- World keyframes: Canva folder *PrintFeed › Worlds – The Long Green › Keyframes* (Kneeling Giant, Moss in the palm, Naga Stair, Sleeping Town v2).

## Boštjan's working rules (non-negotiable)

1. Iterate on **stills first**; look at every generated image yourself and regenerate drift before showing him.
2. Animate only an approved keyframe. Drafts: 480p, 4–5 s, audio off, on Seedance 2.0 Mini or MiniMax H3 Lite, **one change per draft**. Never Veo 3.1 Fast.
3. **No final renders without his approval.** Finals: MiniMax H3 at 768p, upscale to 1080×1920 in post.
4. Sound is added in code (ambience, chime, materialize sounds from `brand/mascot/sound/`), never model audio.
5. No on-screen text or calls to action. End card = Tac's glyph + doctrine line, no logo: `make_cards.py endcard --line "…" --out ep02-endcard.mp4`.
6. No paper print materializing at the end; the breath is not the default ending.
7. Budget: about $10/week across 2–3 episodes; this episode is estimated at $14–16. Report actual spend.

## Continuity from episode 1

Ep 1: Tac materializes on the Kneeling Giant's wrist, fireflies rise, he meets Moss in the giant's palm and sits beside him; Moss leads him down a path past mossy statues; Tac joins a line of Mosskin carrying clay jars down the terraces; wide shot of the procession; end card "Arrive grateful, and you will not stay a stranger."

Match ep 1's look exactly: painterly 2D/2.5D illustration, lilac-hour sky (#B8AED0), layered misty hills, jade Mosskin (#5F9283) with clay belts (#C96F53), fern greens, cool yellow-green fireflies. Tac's heart (#FB9E58) is the only warm glow in frame. Extract reference frames from the ep 1 clips (Tac full body, Moss, a Mosskin group, a wide landscape) and attach them to every keyframe prompt, plus the hero + turnaround refs.

## The episode (approved)

About 75–90 s, 4 clips. Teaching: *the flow is constant*. End line: **"The rain falls on everyone. Only some hold out a cup."**

**Village:** a giant strangler fig grown over an old stone bridge by the river; its roots are the village. Calm and uneventful. Most Mosskin sit motionless (root hollows, shrine tops, river bank), some so mossed-over they read as boulders, others only hinted at (feet in a hollow, one eye in a crack). At most 2–3 per frame do anything, slowly. A peculiar folk.

**Naga shrines:** small coiled-serpent niches worn into the roots (path forks, water panels, big roots). Offerings: wild figs, mangosteens, longans, small green bananas (nothing bright orange/red), cups of leaf tea, fresh moss, fern fronds, a shed scale. **The naga never appear in the village**; only hints.

### Shot list

| # | Clip | Shot | Motion (for the draft) |
|---|------|------|------------------------|
| 1 | 1 Arrival | Wide: procession comes off the terraces to the river; the fig village ahead | carriers walk in |
| 2 | 1 | Carriers set jars down, each walks to its own spot and sits | Mosskin sit one by one |
| 3 | 1 | Village now still; Tac alone, the only thing moving | Tac looks around |
| 4 | 2 Explore | **Chime**: Tac flicks a tile-shard chime; every "boulder" opens its eyes; he freezes; eyes close; he lowers his hand | eyes open/close in unison |
| 5 | 2 | **Shy plant**: Mimosa pudica folds at his touch, the wave spreads onto a sitting Mosskin's head fern | leaves folding |
| 6 | 2 | **The relative**: mossy old computer mouse with curled cable; Tac compares tails, gives it a wai | head tilt, wai |
| 7 | 2 | **Tea**: Tac pours a drop from an old cup on bare earth; a tiny fern uncurls | pour, fern unfurls |
| 8 | 3 Presence | Lilac hour: canopy sways with no wind along a long line; Tac spins round; a gap in the leaves closes, maybe one gold glint | canopy sway |
| 9 | 3 | Rain begins; still Mosskin raise cups; one tips rain into a shrine | rain, cups lift |
| 10 | 3 | Tac finds a hand-sized iridescent jade scale in the moss, looks up | pick up, look up |
| 11 | 4 Leaving | Night, village asleep; downriver a small square cyan pixel-light flickers in the mist (not a firefly) | flicker |
| 12 | 4 | Tac walks away along the river; far off the Sleeping Town roofs with a faint cyan glow | Tac walks off |

Then the end card. Comedy is deadpan only: no slapstick, no falls, no crown gags (character bible).

### Village world paragraph (paste after `visual-paragraph.txt`, then the shot line)

> A village of small stone-skinned Mosskin living in the roots of a giant strangler fig that has grown over an old stone bridge beside a slow forest river in the hills of northern Thailand. Root hollows, moss beds, clay jars and old cups on root ledges, glass panels holding rainwater, small coiled-serpent shrine niches with wild figs, mangosteens and cups of tea. Most Mosskin sit perfectly still, some mossed-over like boulders. Lilac-hour sky, layered misty hills behind, cool yellow-green fireflies. Painterly illustration matching the reference frames, calm and quiet.

Negatives: humans, temples, Buddha images, monks, candles, fire, bright orange or red fruit, warm lamps, legible text, the naga visible in the village.

## Steps

1. **Refs.** Extract 6–8 reference frames from the ep 1 clips into `video-studio/episodes/ep02/refs/`.
2. **Plates.** Generate the empty village plate (shot 3 framing, no Tac) and the night plate (shot 11) on `google/nano-banana-2.1`, 9:16. Check them, iterate, then send both to Boštjan for approval.
3. **Keyframes.** After the plates are approved, make each shot's keyframe by editing Tac/Mosskin into the approved plate (keeps backgrounds consistent; see world-bible "How to make it"). Contact sheet to Boštjan.
4. **Drafts.** Cheap motion drafts per the rules above; assemble a rough cut with sound for review.
5. **Finals** only after his go-ahead; then `make_cards.py endcard --line "The rain falls on everyone. Only some hold out a cup." --out ep02-endcard.mp4`; master to about −14 LUFS, −1 dBTP.

Store everything under `video-studio/episodes/ep02/` (refs/, plates/, keyframes/, drafts/, final/), outputs also copied to `~/Videos/printfeed/ep2_*`.

## Open follow-ups

- Reword the religious-icons rule to allow Pa Khiao's own naga shrines and offerings: in `brand/mascot/character-bible.md` ("never appears with Buddha images, temple altars or other religious icons") and the story doc's "The statues: handle with care" / naga sections ("never shown being worshipped"). Suggested: "No real-world religious icons, Buddha images or temple architecture. Pa Khiao's invented naga shrines and natural offerings are allowed." Confirm wording with Boštjan.
- Update the story doc's episode table to the 4-episode plan: Ep 1 Arrival + The keeper (done) · Ep 2 The village under the fig · Ep 3 Sleeping Town + Inside the dream · Ep 4 The giants pass, the new plant, night on the stair.
