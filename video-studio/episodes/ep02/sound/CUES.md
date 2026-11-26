# Ep 2 — sound cue sheet

For placing sound by hand in Canva at the end of production. Files are in `auditions/` (WAV, 48 kHz stereo, all synthesized). Rebuild them with `make_ep02_sounds.py`. Listen to everything in order in `reel.mp4`.

Episode 1 had no music: a forest-and-water bed with insects, a few bird calls, whooshes and the materialize ticks. Ep 2 follows that unless we decide otherwise (open choice 1).

## Levels in Canva

Every audition file is normalised to about −18 LUFS, so they compare fairly when you audition them. They are **not** mix levels. Starting points for Canva's volume slider:

| Layer | Canva volume |
| --- | --- |
| Beds (01–03) | 30–40 % |
| Spot sounds (04–08, 11, 12) | 70–100 % |
| Naga pass (10, the dry one, over bed 01) | 100 % |
| Chime on the end card (`brand/mascot/sound/chime.wav`) | 100 %, the loudest moment |

Canva can't master to a loudness target. After export, I run the video through a two-pass `loudnorm` to about −14 LUFS / −1 dBTP (ep 1 measured −14.5 LUFS but peaked at +0.3 dBTP, so it clipped slightly).

## Per shot

Shot order follows `STATUS.md` (final set). The beds loop seamlessly; lay them across whole clips and crossfade (about 1 s) where the location changes.

| # | Shot | Bed | Spot sound | Notes |
| --- | --- | --- | --- | --- |
| 1 | Procession heads down to the village | 01 clearing | optional 13 steps (very low) | Start the bed under a short fade from black. |
| 2 | Jars set down, carriers sit | 01 | — | A soft clay set-down isn't made yet; say if you want one. |
| 3 | Village still, Tac alone | 01 | — | Let the bed carry it: stillness. |
| 4 | **Chime**: Tac flicks the shard chime | 01 | 04 shard chime on the flick; 05 stone blink (opening half) when the eyes open | Deadpan option: drop the bed for a moment when the eyes open and bring it back as they close. 04 is clinks, **not** the brand chime. |
| 4b | Hatch under the bridge, scale on the shrine | 01 → crossfade into 02 | — | The crossfade moves us underground. |
| 5 | Mimosa folds | 02 hall | 06 mimosa fold, starting on Tac's touch | |
| 6 | Diode headset | 02 | 07 headset diode, on the weak flicker | The sad one: a dying whine in an abandoned room. |
| 7 | Drop of tea, fern uncurls | 02 | 08 tea drop on the drop | |
| 8 | **The pass** (start → end frame) | 01 back in the clearing, **dipped** for the pass | 10 naga pass (dry) | Pull bed 01 down to about 10 % from 0.3 s before the shadow arrives; insects stop first. Bring it back over about 2 s after the leaves settle. 09 is the same moment with the bed already dipped, for reference. |
| 8b | Mosskin slow blink | 01 (still low, coming back) | — | Silence is the sound here. |
| 8c | Reactions: glance, head tilt, cup raised | 01 | — | |
| 9 | First rain | 01 → rain | 11 rain onset across the shot | The rain thickens under the bed; fade insects out as it builds. |
| 9b | Rain into the shrine | 11 continues | — | One of the cup plinks in 11 can sit on the tipped cup. |
| 10 | Tac finds the scale | rain tail + 01 | — | Candidate for the one chime (open choice 2). |
| 11 | Night, cyan pixel downriver | 03 night river | 12 pixel flicker, synced to the visible flicker | Keep it faint and far off. |
| 12 | Tac walks off along the river | 03 | optional 13 steps | Fade 03 under the end card. |
| — | End card | 03 tail | `chime.wav` on the glyph | The one chime (if open choice 2 stays as proposed). |

## The chime rule

`world-bible.md`: one chime per video, on the transformation, or on the arrival if there is no transformation. Ep 2 has neither: Tac is already in the world and nothing transforms. Proposed: **the only chime is on the end card**, and the shard chime in shot 4 stays clearly not a bell (04).

## Open choices for Boštjan

1. **Music**: none, as in ep 1 (proposed), or a sparse pad or a few plucked notes under clip 3 (the pass) and the ending?
2. **The one chime**: end card only (proposed), or on the scale find in shot 10 as the episode's quiet "reveal"?
3. **The silence beats** (shot 4 eyes, shot 8 pass, 8b): a near-full drop to about 10 % (proposed), or a gentler dip to about 40 %?
4. **Steps**: Tac silent (proposed, matches "a peculiar folk, calm"), or soft padded steps (13)?
5. **Mood references**: any films, games or tracks whose sound you want this to lean toward?

## Transitions (rough cut v2) and the scale

| Cut | Transition | Why |
| --- | --- | --- |
| 1 → 2 | dissolve 0.8 s | arrival, time passes |
| 2 → 3 | dissolve 1.2 s | same framing: the carriers dissolve into stillness |
| 3 → 4, 5 → 6 → 7, 8 → 8b → 8c, 9 → 9b → 10 | cut | inside a beat |
| 4 → 4b | dissolve 0.6 s | over to the bridge |
| 4b → 5 | fade through black 1.2 s | down the hatch |
| 7 → 8 | fade through black 1.2 s | back up, into the lilac hour (the pass starts from the dark) |
| 8c → 9 | dissolve 0.8 s | the rain comes |
| 10 → 11 | fade through black 1.6 s | day into night |
| 11 → 12 | dissolve 1.0 s | |
| 12 → end card | fade through black 1.2 s | |

Crossfade the beds over the same lengths. Shot 10 now uses `14-scale-awaken.wav` starting about 1.0 s into the shot (the touch lands at 1.25 s). If the one chime moves to the scale (open choice 2), put `chime.wav` on the glow peak, about 2 s into the shot, and leave the end card on the night bed only.

## Shot 8 v2 — the violent pass (replaces the shot 8 row above)

Draft `s08-d2` (8 s). Use `15-naga-pass-violent.wav` from the start of the shot, with no separate bed under it (the calm bed is inside the file). The tear lands at 2.1 s: insects cut dead, a whoosh crosses left to right, leaves thrash, three branch snaps and a low hit; then creaks and falling leaves while the bed comes back. 8b (slow blink) follows on a hard cut while the bed is still low.

## Transitions v4 (replaces the transitions table above)

Only slides and fades, as in ep 1.

| Cut | Transition |
| --- | --- |
| 1 → 2 | slide up, 0.6 s (ep 1 style) |
| 2 → 3 | fade, 1.2 s (same framing: the carriers fade into stillness) |
| 4 → 4b | slide up, 0.6 s |
| 4b → 5 | fade through black, 1.2 s (down the hatch) |
| 7 → 8 | fade through black, 1.2 s (back up) |
| 8c → 9 | slide up, 0.6 s |
| 10 → 11 | fade through black, 1.6 s (day into night) |
| 11 → 12 | fade, 1.0 s |
| 12 → end card | fade through black, 1.2 s |
| everything else | cut |

## Transitions v5 and shot lengths (replace the tables above)

The slide only on chapter changes (a deliberate "new scene loaded"): **3 → 4** and **7 → 8**. Everywhere else: fade 1 → 2 (0.8 s), 2 → 3 (1.2 s), 4 → 4b (0.6 s), 8c → 9 (0.8 s), 11 → 12 (1.2 s); fade through black 4b → 5 (1.2 s), 10 → 11 (1.6 s), 12 → end card (1.4 s); cuts inside beats.

Shot lengths on screen: 1 6.5 · 2 6 · 3 6.5 · 4 6 · 4b 5.5 · 5 6 · 6 6.5 · 7 6.5 · 8 8 · 8b 6 · 8c 6 · 9 6.5 · 9b 6 · 10 7.5 · 11 8 · 12 9 · end card 5 s (about 101 s in all). Shot 8 is now draft `s08-d3`; `15-naga-pass-violent.wav` still lines up (the tear lands at about 2.1 s).

## The ending (v6)

New shot 10b between 10 and 11: the wide village shot after the rain (bed 01 at low level, fading). 10 → 10b fade 0.8 s; **10b → 11 a 2.5 s fade in the same framing (day into night)**: crossfade bed 01 into bed 03 over the same 2.5 s; 11 → 12 fade 1.5 s.

## Opening bed and shot 10 (reference v2)

Shots 1–3 now use **`16-bed-hillside.wav`**: the procession is still up the slope, far from the river, so leaves, insects and a few more birds carry it and the river is only a faint, dark rumble (about 1 % of the energy below 1 kHz, against 44 % in bed 01). Crossfade into bed 01 on the 3 → 4 slide, where we reach the village and the bridge.

Shot 10 is now the draft animation (`s10-d3`, 5.2 s instead of 8 s). `14-scale-awaken.wav` still starts about 1.0 s into the shot.
