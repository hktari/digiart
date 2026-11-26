# Ep 2 — status

Working log next to `BRIEF.md` (the brief stays the source of truth).

## 2026-11-25

**Step 1 — refs: done.** 8 frames from `~/Videos/printfeed/episode 1.mp4` in `refs/`: kneeling giant landscape, Tac full body, Tac sitting with Moss, Moss with pot, Moss close-up, Mosskin procession group, wide terraces, path with statues.

**2026-11-26:** full-size refs exported from Canva ("Plain image asset holder" `DAHbpWLgEjM`, pages 1–2) into `brand/mascot/refs/hero.png` (1587×2245, A4 page crop) and `turnaround.png` (1587×1200, cropped from the A4 page). ~1.6k wide, lower than the 2752 px originals but fine as refs. ~~Not available yet: full-size hero + turnaround refs.~~ `brand/mascot/refs/` only has low-res previews ("never feed them to a model"). They're needed for Step 3 (Tac keyframes): export `hero.png` and `turnaround.png` from Canva (`MAHbkc6tVi8`, `MAHbkRBArD4`) into `brand/mascot/refs/`.

**Step 2 — plates: waiting for approval.** `google/nano-banana-2.1`, 2K (1536×2752), 9:16. Generator: `../../scripts/gen_image.py` via `./gen.sh <prompt> <out> [refs…]`; every run is logged in `gen-log.jsonl`.

| Plate | File | Notes |
| --- | --- | --- |
| A1 village | `plates/village-v1.png` | First pass. Clear open clearing for Tac; eye-in-a-crack; shrine niche bottom right. Less mist than ep 1; the bridge sits beside the fig more than under it. |
| A2 night | `plates/night-v2.png` | Same village as A1 at night (A1 as ref). Cyan pixel far upriver, clearly readable. |
| B1 village | `plates/village-v2.png` | Second pass: bridge swallowed by roots, glass rain panels, chime, shrine in the centre, river mist like ep 1. A couple of small orange fruits on the shrine to fix with an edit if chosen. |
| B2 night | `plates/night-v3.png` | Same framing as B1 at night. Cyan pixel small, under the bridge arch. |
| rejected | `plates/night-v1.png` | Fig didn't match the village; Mosskin lying down like babies. |

Contact sheet: `plates-contact-sheet.jpg`.

## 2026-11-26 — plate round 2

Feedback: likes the river and the wide shot (A1 framing); human-made objects should be futuristic post-apocalyptic.

| Plate | File | Notes |
| --- | --- | --- |
| C1 village | `plates/village-v4.png` | Edit of A1: snapped pale composite footbridge with hanging cables, cracked hex solar panels, metal canisters, mossy machine hull in the foreground, circuit/lens chime. Shrine stays carved stone with mangosteens, green figs, tea (no orange). |
| C2 night | `plates/night-v4.png` | Same as C1 at night; relics dark; cyan pixel clearly readable far upriver. |
| test | `plates/village-v3.png` | Same tech edit on B1 (narrower framing), superseded by C1. |

Contact sheet: `plates-v4-contact-sheet.jpg`.

**Approved 2026-11-26: C1 `village-v4.png` + C2 `night-v4.png`.** These are the plates for Step 3.

**Step 3 — keyframes: waiting for approval.** Each keyframe is an edit of the approved plate (night plate for 11–12) with refs: ep-1 Tac frames (ref02, ref03), `hero.png`, `turnaround.png`, Mosskin group (ref06). Prompts: `keyframes/prompts/_head.txt` + `sNN.txt` + `_tail.txt`; runner `keyframes/run.sh sNN …`.

| # | File | Notes |
| --- | --- | --- |
| 1 | `s01-v3.png` | Varied straggling carriers on the terraces (v2), huts on the far bank removed (v3). v1 line was too uniform |
| 2 | `s02-v2.png` | Varied carriers setting loads down at different moments. v1 too uniform |
| 3 | `s03-v1.png` | Village still, Tac alone in the clearing |
| 4 | `s04-v1.png` | Tac's finger at the circuit/lens chime, two mossy "boulders" behind |
| 5 | `s05-v1.png` | Mimosa clump next to a Mosskin with a head fern (leaflets read a bit fern-like) |
| 6 | `s06-v1.png` | Mossy computer mouse with looped cable; Tac kneels, tail looped |
| 7 | `s07-v2.png` | Small chipped cup, one drop, fiddlehead. v1 (jar pouring a stream) replaced |
| 8 | `s08-v2.png` | Canopy wide. v1 had a solid black glitch band in the leaves |
| 9 | `s09-v1.png` | First rain; some Mosskin hold cups |
| 10 | `s10-v1.png` | Iridescent jade scale in wet moss; Tac reaching |
| 11 | `s11-v1.png` | Night; square cyan pixel far upriver, Tac on the bank |
| 12 | `s12-v2.png` | Tac walks off; town a faint cyan glow on the horizon. v1 had huts right next to the camera |

Contact sheet: `keyframes-contact-sheet.jpg` (round 1).

### Round 2 — more than one space (feedback 2026-11-26)

Feedback: the village feels too small; the episode should use 2–3 locations, e.g. an enclosed/underground space with an entrance near the fig. Carriers' line too uniform (fixed in s01-v3, s02-v2).

New plates (waiting for approval): `plates/entrance-v1.png` (round half-open composite hatch between the fig roots, steps down, sleeping doorkeeper, shrine) and `plates/room-v1.png` (buried dome under the fig: cracked solar-glass skylight, root columns, light shafts, sleeping Mosskin in wall niches, dead consoles, tea drip hollow, mimosa in the light). Sheet: `spaces-contact-sheet.jpg`.

Proposed locations:
- **A — fig clearing:** shots 1–4 (arrival, chime), 8–9 (presence, rain), 11 (night).
- **B — under the fig:** new shot 4b Tac finds the hatch and peers down (entrance plate); 5 shy plant, 6 the relative (computer mouse on a dead console), 7 tea (drip hollow) in the room.
- **C — river bank under the broken bridge** (optional, plate not made yet): 10 scale at the water's edge, 12 leaving.

Shots 5–7 get redone in the room once the plates are approved.

## Spend

| Date | Model | Runs | Cost |
| --- | --- | --- | --- |
| 2026-11-25 | nano-banana-2.1, 2K | 5 images | price not published on the model page; estimated $0.50–0.75. Check the Replicate dashboard |
| 2026-11-26 | nano-banana-2.1, 2K | 3 images | est. $0.30–0.45 |
| 2026-11-26 | nano-banana-2.1, 2K | 15 keyframes (12 + 3 redos) | est. $1.50–2.25 |
| 2026-11-26 | nano-banana-2.1, 2K | 2 plates + 3 keyframe edits | est. $0.50–0.75 |
| 2026-11-26 | nano-banana-2.1, 2K | 2 face tests + 8 wasted + 2 plates + 6 face edits | est. $1.80–2.70 |
| **Total so far** | | **46 images** | **est. $4.60–6.90** |

Replicate credit is below $5 (API rate-limit notice, 2026-11-25). The episode is estimated at $14–16, so it needs a top-up before drafts.

### Round 3 — what the relics mean (feedback 2026-11-26)

Shot 6 "the relative" (computer mouse) is dropped. Lore for the relics: the vanished civilisation was rational and productivity-driven; late on it realised it had neglected feeling, connection and spirit, and tried to fix that with devices. Keywords: sad, desperate, abandoned, futuristic, high-tech. Boštjan's device ideas: (1) a face-facing headset with flickering diodes for altered states of mind; (2) LED headphones all linked to one audio source for a shared listening/movement experience. More device ideas proposed in chat, waiting for his pick.

### Round 4 — content faces, hall, entrance under the bridge (2026-11-26)

- Mosskin faces must be content/serene (sad faces contradict their character). The "downturned lip" was my prompt wording; replaced in `_head.txt` and plate prompts with a contented half-smile, and sad faces added to Avoid. Face-only edit (`keyframes/facefix.sh`, prompt `keyframes/prompts/face-fix.txt`) applied: `plates/village-v5.png`, `plates/night-v5.png`, `s01-v4`, `s02-v3`, `s03-v2`, `s04-v2`, `s09-v2`, `s11-v2`.
- Entrance moved under the bridge: `plates/entrance-v3.png` (hatch in the bridge abutment by the river, doorkeeper, shrine). Bridge underside reads more stone than composite; fix with an edit if needed.
- Room rebuilt as the shared hall: `plates/hall-v1.png` — central audio column, ring of reclined seats with diode headsets and linked LED headphones on cables, cracked forest-screen wall with ferns growing through, holding pod with a sleeping Mosskin, tray of unused pulse bands, breathing stones, drip hollow with cups. Waiting for approval.
- Mistake: one batch of 8 face edits ran with a broken zsh loop (pairs not split), so the outputs were junk and were deleted; logged as WASTED in `gen-log.jsonl` (~$0.80–1.20).
- Next after approval: hall keyframes — 4b Tac at the hatch, 5 shy plant in the light shaft, 6 the headset (one weak diode flicker, a content Mosskin beside it with no device), 7 tea at the drip hollow.

Sheet: `plates-round3-contact-sheet.jpg`.

### Round 5 — hall keyframes (2026-11-26)

Entrance (`entrance-v3`) and hall (`hall-v1`) approved. New keyframes via `keyframes/run_b.sh` (head `_head_b.txt`): 4b `s04b-v1` (Tac at the hatch under the bridge), 5 `s05-v3` (mimosa in the light shaft by a content Mosskin), 6 `s06-v4` (diode headset, content Mosskin without device), 7 `s07-v4` (drop of tea by the drip hollow). The heart was drawn as a heart symbol in 6, 7, 10; fixed to a round core with `keyframes/heartfix.sh` (s06-v4, s07-v4, s10-v2).

**Current keyframe set (waiting for approval):** 1 s01-v4 · 2 s02-v3 · 3 s03-v2 · 4 s04-v2 · 4b s04b-v1 · 5 s05-v3 · 6 s06-v4 · 7 s07-v4 · 8 s08-v2 · 9 s09-v2 · 10 s10-v2 · 11 s11-v2 · 12 s12-v2. Sheet: `keyframes-contact-sheet-v2.jpg`.

Spend: 53 image runs in `gen-log.jsonl` (8 wasted), est. $5.30–7.95.

### Round 6 — naga presence (2026-11-26)

The naga stay off screen; their presence comes through traces and Mosskin reactions (glances, head tilts, lifting cups, slow blinks — Boštjan agreed). New shots:
- 4b `s04b-v2`: shed scale planted on the shrine by the hatch (pays off in shot 10).
- 8 start `s08-v4` / end `s08end-v2`: a long diagonal wake of parted leaves across the canopy, two Mosskin looking up → canopy closed, small gap with a gold glint, Tac spun round. Animate with first + last frame. (v3 had the ep-1 stone hand and a heart visible through Tac's back; fixed.)
- 8b `s08b-v2`: one Mosskin lifts its eyes to the canopy and slow-blinks (v1 too human/smug).
- 8c `s08c-v1`: three Mosskin react: glance over the shoulder, head tilt, cup raised.
- 9b `s09b-v1`: a Mosskin tips its cup of rain into a shrine basin.

Sound idea (not yet designed): river and insects drop out for a beat, a long leaf rustle travels across the stereo field.

**Current keyframe set:** 1 s01-v4 · 2 s02-v3 · 3 s03-v2 · 4 s04-v2 · 4b s04b-v2 · 5 s05-v3 · 6 s06-v4 · 7 s07-v4 · 8 s08-v4 (+ end s08end-v2) · 8b s08b-v2 · 8c s08c-v1 · 9 s09-v2 · 9b s09b-v1 · 10 s10-v2 · 11 s11-v2 · 12 s12-v2. Sheets: `keyframes-contact-sheet-v2.jpg`, `presence-contact-sheet.jpg`.

Spend: 62 image runs in `gen-log.jsonl` (8 wasted), est. $6.20–9.30.

### Round 7 — shadow over the village, no camera gaze (2026-11-26)

Feedback: a shadow cast over the village; Tac should never look straight into the camera (s08end-v2 had him facing camera, my prompt wording).
- 8 start `s08-v6`: a vast soft shadow covers the clearing, bridge, roots and Mosskin with a long curved edge following the canopy wake; sky and far forest stay lit. The heart glow that showed through Tac's back (v5) is removed.
- 8 end `s08end-v4`: shadow gone, lilac light back, gap with gold glint; Tac turned in side profile looking up toward the gap, not at camera. Crown fixed to the hero ref.
- 9 `s09-v4`: heart was still a ♥ symbol (fixed in v3); v3 added a warm glow in his palm, removed in v4.
- Checked the rest of the set for camera gaze: 3, 4, 9, 11 are three-quarter or profile, 12 from behind. Only 8 end was frontal.

**Current keyframe set:** 1 s01-v4 · 2 s02-v3 · 3 s03-v2 · 4 s04-v2 · 4b s04b-v2 · 5 s05-v3 · 6 s06-v4 · 7 s07-v4 · 8 s08-v6 (+ end s08end-v4) · 8b s08b-v2 · 8c s08c-v1 · 9 s09-v4 · 9b s09b-v1 · 10 s10-v2 · 11 s11-v2 · 12 s12-v2. Sheets: `keyframes-contact-sheet-v2.jpg`, `presence-contact-sheet.jpg`, `shadow-contact-sheet.jpg`.

Spend: 68 image runs in `gen-log.jsonl` (8 wasted), est. $6.80–10.20.

### Round 8 — shot 1 heads downhill (2026-11-26)

Feedback: in shot 1 the carriers faced the camera, walking away from the village. Redone as edits of s01-v4: procession seen from behind, facing down toward the fig village (s01-v5); v5 put carriers in the river and on the broken bridge, fixed in v6, which in turn erased the bridge and river; v7 restores them from v4. **Shot 1 is now `s01-v7`.** Final sequence sheet: `keyframes-final-sheet.jpg`.

Spend: 71 image runs in `gen-log.jsonl` (8 wasted), est. $7.10–10.65.

## Sound (started 2026-11-26, in parallel with the Replicate top-up)

Boštjan places the sound effects himself in Canva at the end of production, so the deliverable is separate files plus a cue sheet, not a mix. Ep 1 had no music (spectrogram: forest/water bed, insects, chirps, whooshes, materialize ticks); it measured −14.5 LUFS with a +0.3 dBTP peak.
- `sound/make_ep02_sounds.py` synthesizes 13 auditions into `sound/auditions/`: 3 seamless beds (clearing, Shared Hall, night river) and spot sounds (shard chime, stone blink, mimosa, headset diode, tea drop, naga pass with and without the bed, rain onset, pixel flicker, padded steps). Labelled reel: `sound/reel.mp4` (93 s).
- `sound/CUES.md`: per-shot placement, Canva volume starting points, the chime rule (proposed: the only chime is on the end card), open choices.
- After the Canva export: two-pass loudnorm to −14 LUFS / −1 dBTP.

## Step 4 — motion drafts (2026-11-26)

Model: `minimax/h3-lite`, 480P, 5 s (shot 8: 6 s, first frame `s08-v6` → last frame `s08end-v4`). Runner `../../scripts/gen_video.py` via `drafts/vid.sh`; batch `drafts/run_all.sh`; review strips + silent copies via `drafts/review.sh`. H3 Lite returns an audio track although none was asked for; it is stripped (`drafts/silent/`), never used.
- Test `s03-d1`: Tac looked into the camera for ~2 s and his crown warped while turning. All prompts now forbid facing the camera and keep the crown rigid; `s03-d2` fixed it.
- `s08b-d1`: the model put a gold crown on the Mosskin. `s08b-d2` (prompt forbids anything on its head) is clean.
- `s01-d1`: carriers barely moved. `s01-d2` (stronger walking wording) walks, but covers little ground; revisit at finals.
- Gaze checked frame by frame in 3, 4, 6, 8, 9: profile, looking down or turned away throughout. Shot 4's boulders open and close their eyes; shot 5's mimosa folds; shot 6's diode flickers cyan; shot 8's shadow lifts and the leaves close while Tac turns in profile.

**Draft set:** 1 s01-d2 · 2 s02-d1 · 3 s03-d2 · 4 s04-d1 · 4b s04b-d1 · 5 s05-d1 · 6 s06-d1 · 7 s07-d1 · 8 s08-d1 · 8b s08b-d2 · 8c s08c-d1 · 9 s09-d1 · 9b s09b-d1 · 10 s10-d1 · 11 s11-d1 · 12 s12-d1.

Rough cut for review: `drafts/ep02-roughcut-v1.mp4` (84 s, 480×864, −14.9 LUFS, rough sound from `sound/auditions/`, no end card), copied to `~/Videos/printfeed/ep2_roughcut_v1.mp4`.

Spend: 19 H3 Lite runs (~96 s of video). Replicate doesn't publish the H3 Lite price (H3 is $0.08/s at 768P); estimate $0.03–0.05/s → ~$3–5. Episode total so far ≈ $10–16 (images $7.10–10.65 + drafts). Check the Replicate dashboard for the actual figure.

### Shot 10 legendary scale + rough cut v2 (2026-11-26)

Feedback: picking up the scale should feel like an epic, legendary object that reacts to touch, with Tac surprised. `s10-d2`: the scale lights from his touch, moss glows cool green, but the surprise was mild. **`s10-d3`** (one change: a sharper startle): ears shoot up, eyes wide, he rocks back holding the glowing scale out; looks at the scale, not the camera; heart stays the warm round core, the scale's light stays cool. New sound audition `sound/auditions/14-scale-awaken.wav` (swell, rising sparkle, breathing pulse; not a bell).

Boštjan is pleased with the drafts; the focus now is transitions and sound. End card rendered per the brief (`brand/mascot/graphics/ep02-endcard.mp4`, copy in `drafts/`). `drafts/rough_cut.py` now chains transitions (xfade): dissolves where time passes (1→2, 2→3 same framing, 4→4b, 8c→9, 11→12), fades through black on location/time changes (4b→5 down the hatch, 7→8 back up, 10→11 day to night, 12→end card), cuts inside beats. Chime on the end card in this cut. **`drafts/ep02-roughcut-v2.mp4`** (78 s, −14.3 LUFS; true peak −0.2 dBTP, so the final needs the two-pass master), copied to `~/Videos/printfeed/ep2_roughcut_v2.mp4`.

Spend: 21 H3 Lite runs (~106 s of video), est. ~$3–5.50.

### Shot 8 reworked — the violent pass (2026-11-26)

Feedback: the rustling should be violent with canopies bending; a dark shape moves fast across the canopy; 1–2 s of calm first so the event reads as extraordinary; Tac feels the force, looks up and instinctively takes a defensive stance.
- New keyframes: `s08calm-v1.png` (start: calm canopy, Tac relaxed in profile) and `s08defend-v1.png` (end: canopy tossed, leaves flying, dark streak, Tac braced low with arms raised in profile, Mosskin unbothered). The heart in the end frame reads slightly ♥-shaped; fix at finals.
- **`s08-d2`** (H3 Lite, 8 s, first → last frame): about 2 s of calm, then a dark shape tears across the canopy in about 1 s; branches whip, leaves rain down; Tac jolts, snaps his head up in profile and braces. Never faces the camera.
- New sound `sound/auditions/15-naga-pass-violent.wav`, timed to the draft: calm bed, insects cut dead at 2.1 s, big L→R whoosh, leaf thrash, three branch snaps, a felt low hit, then creaks and falling leaves while the bed returns.
- **`drafts/ep02-roughcut-v3.mp4`** (80 s), copied to `~/Videos/printfeed/ep2_roughcut_v3.mp4`.

Spend: 73 image runs (est. $7.30–10.95) + 22 H3 Lite runs (~114 s of video, est. ~$3.50–6). Episode ≈ $11–17 so far.

### Transitions: slide + fade only (2026-11-26)

Feedback: use ep 1's slide and fades; a "circle fade" didn't work (my v2/v3 cuts had no circle transition, but they used ffmpeg's `dissolve`, a grainy random-pixel dissolve, which is the likely culprit); a paper fade only if needed. `drafts/rough_cut.py` now has only cut / smooth `fade` / `fadeblack` / `slide`. The slide reproduces ep 1 (frames at 0:03.9 and 0:43.0): the next shot rises from the bottom like a card, tilted ~4° and straightening, fast then easing, thin dark top edge, old shot stays put; 0.6 s, built as an xfade custom expression. Slides on 1→2, 4→4b, 8c→9; fades on 2→3, 11→12; fades through black on 4b→5, 7→8, 10→11, 12→end card. No paper fade needed so far (`brand/mascot/fx/matte-paper-grain.mp4` exists if wanted). **`drafts/ep02-roughcut-v4.mp4`** (80 s), copied to `~/Videos/printfeed/ep2_roughcut_v4.mp4`.

### Rough cut v5 — pacing, ep 1 slide, clean sky (2026-11-26)

Feedback: cutting too fast, especially towards the end; the slide still didn't match ep 1 (reference 0:42); use the slide sparingly, only where a "new scene loaded" effect is intended; the naga scene is great but had a leftover artifact in the sky.
- **Sky artifact:** the dark streak came from the end keyframe ("a long dark streak of shadow"). Removed in `s08defend-v2.png` (heart also made a round core); re-rendered as **`s08-d3`** with the same prompt: the dark shape crosses in ~0.5 s and leaves a clean lilac sky.
- **Slide:** no slide asset exists in the repo or brand kit (ep 1 was edited in Canva, so it is Canva's own transition). Rebuilt from ep 1's frames at 0:43.0 (30 fps): card rotated ~3° (top edge higher on the right) straightening as it lands, near-constant speed easing only at the end, thin dark top edge, old shot darkens underneath, ~0.55 s. Runs single-threaded (`-filter_complex_threads 1`; the expression's variables collide across slice threads otherwise).
- **Slide only on chapter changes:** 3→4 (exploring begins) and 7→8 (the presence). Everything else is a fade, a fade through black or a cut.
- **Pacing:** each shot held longer (`TARGET` in `rough_cut.py`): mostly 6–6.5 s, 10 at 7.5 s, 11 at 8 s, 12 at 9 s, end card 5 s. Drafts are slowed with frame blending for review only; finals get generated at these lengths. SFX offsets scale with each shot's stretch.
- **`drafts/ep02-roughcut-v5.mp4`** (101 s), copied to `~/Videos/printfeed/ep2_roughcut_v5.mp4`.

Feedback on v5: the pacing between cuts is better, but slowing playback is the wrong lever (it degrades the motion). `rough_cut.py` now plays every shot at native speed; `--stretch` exists only to preview timing. The longer holds have to come from generating each shot at its target length (`TARGET`), with prompts that fill the extra seconds with calm motion.

### The ending, un-hurried (2026-11-26)

Feedback: the end (9b–12) feels hurried, probably because every shot changes location. Fix (agreed): return to one place before night. New shot **10b** (`keyframes/s10b-v1.png`, draft `drafts/s10b-d1.mp4`): the wide village shot (same plate as 9 and 11), the last drops stopping, fireflies coming out, Tac standing on his shot-11 spot holding the glowing scale, looking up. Ending now: 10 → fade 0.8 s → 10b → **fade 2.5 s in place, day into night** → 11 → fade 1.5 s → 12 → fade through black → end card. **`drafts/ep02-roughcut-v6.mp4`** (83 s at native speed), copied to `~/Videos/printfeed/ep2_roughcut_v6.mp4`. Boštjan is otherwise satisfied with the video production.

For finals: Tac must keep the scale in 11 and 12 (in the current 11 keyframe it isn't in his hands, so it fades out during the day-to-night fade). Edit `s11-v2` and `s12-v2` before rendering. Generate each final at its `TARGET` length (10b: 7 s).

## Step 5 — finals (2026-11-26)

Boštjan chose 768P + upscale (over 2K native). Keyframes 11 and 12 edited so Tac keeps the scale (`s11-v3`, `s12-v3`). Prompts in `finals/prompts/` (approved draft prompts + a pacing line). Runner `finals/run_finals.sh`: `minimax/h3`, 768P, each shot at its target length (1 7 · 2 6 · 3 7 · 4 6 · 4b 6 · 5 6 · 6 7 · 7 7 · 8 8 (first → last frame) · 8b 6 · 8c 6 · 9 7 · 9b 6 · 10 8 · 10b 7 · 11 8 · 12 9 s). Output is 768×1344.
- All 17 checked frame by frame: no camera gaze (profile, looking down or turned away), crown upright, scale carried through 10b–12, clean sky after the pass.
- Shot 7: H3 painted the tea as a glowing orange pool (a second warm light). A second take (`s07-f2`, stricter prompt) did the same, so it is fixed in post: `finals/grade_tea.py` re-grades orange below 62 % of the frame height (well under the heart) to dark earth brown → `s07-f3`.
- Upscale: `finals/upscale.sh` → `finals/1080/` (scale to 1920 high, crop 1080 wide, lanczos + light unsharp, 30 fps, model audio removed).
- Reference cut: `drafts/rough_cut.py --finals` (transitions v5 + 10b ending, rough sound from the auditions, end card with chime) → mastered with `final/master.sh` (two-pass loudnorm + limiter): **`final/ep02-reference-mastered.mp4`**, 115 s, 1080×1920, −14.3 LUFS, −1.2 dBTP.
- Copied to `~/Videos/printfeed/`: `ep2_final_reference.mp4`, `ep2_final_clips/` (01–17 shots in order + 18 end card, silent, for Canva), `ep2_sound/` (auditions, `00-chime.wav`, `CUES.md`).
- After Boštjan's Canva sound pass: run `final/master.sh <canva-export> <out>` for −14 LUFS / −1 dBTP.

## Spend (total, from `gen-log.jsonl`)

| Item | Runs | Estimate |
| --- | --- | --- |
| nano-banana-2.1 stills (plates, keyframes, edits; 8 wasted) | 77 | $7.70–11.55 |
| H3 Lite drafts, 480P (~119 s) | 24 | ~$3.60–6.00 (price not published) |
| H3 finals, 768P (124 s at $0.08/s) | 18 | $9.92 |
| **Episode total** | | **≈ $21–27.50** (estimate was $14–16; check the Replicate dashboard) |

## Reference v2 (2026-11-26)

- Shot 10: Boštjan preferred the H3 Lite draft's animation to the H3 final. `finals/1080/s10.mp4` is now `drafts/silent/s10-d3.mp4`, cover-scaled to 1080×1920 (see the override at the end of `finals/upscale.sh`). No new generation.
- Opening sound: new `sound/auditions/16-bed-hillside.wav` for shots 1–3 (far from the river: almost no water). `rough_cut.py` uses it.
- New reference: `final/ep02-reference-v2-mastered.mp4`, copied to `~/Videos/printfeed/ep2_final_reference_v2.mp4`. Spend this round: $0.

## Reference v3 and release cuts (2026-11-26)

- Fixed a 1.5 s dead silence at 1:21: the 10 s rain file ended at full level and 9b restarted the onset from zero. New `17-rain-long.wav` (20 s) runs from shot 9 through 9b and fades under 10.
- Ambient beds 25 % down (`BED_TRIM = 0.75` in `rough_cut.py`): the water sat too loud.
- End card line changed to "The rain falls on everyone, those who notice hold out their cup." (`make_cards.py` now takes `|` as a forced line break; the card breaks after "everyone," and "notice").
- Final: `final/ep02-reference-v3-mastered.mp4` (−14.3 LUFS). Release folder `../long-green-02/` with `episode_2.mp4`, three clips, beats and caption drafts. Spend: $0.
