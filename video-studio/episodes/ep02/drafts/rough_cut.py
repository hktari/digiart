"""Ep 2 rough cut for review: silent drafts in shot order, with transitions, a rough sound layer
from sound/auditions/ and the end card. Not the final mix (Boštjan places sound in Canva).

    uv run --with numpy --with scipy python video-studio/episodes/ep02/drafts/rough_cut.py [--out ep02-roughcut-v2.mp4]
"""

import argparse
import json
import subprocess
from pathlib import Path

import numpy as np
from scipy.io import wavfile

HERE = Path(__file__).resolve().parent
EP = HERE.parent
AUD = EP / "sound" / "auditions"
CHIME = EP.parents[2] / "brand" / "mascot" / "sound" / "chime.wav"
SR = 48_000
W, H, FPS = 480, 864, 24

# draft, bed, bed gain, [(sfx, offset in shot, gain)]
SHOTS = [
    ("s01-d2", "16-bed-hillside", 0.35, []),
    ("s02-d1", "16-bed-hillside", 0.35, []),
    ("s03-d2", "16-bed-hillside", 0.35, []),
    ("s04-d1", "01-bed-clearing", 0.35, [("04-shard-chime", 0.4, 0.9), ("05-stone-blink", 1.0, 0.8)]),
    ("s04b-d1", "01-bed-clearing", 0.35, []),
    ("s05-d1", "02-bed-hall", 0.35, [("06-mimosa-fold", 0.8, 1.0)]),
    ("s06-d1", "02-bed-hall", 0.35, [("07-headset-diode", 1.6, 0.9)]),
    ("s07-d1", "02-bed-hall", 0.35, [("08-tea-drop", 0.9, 1.0)]),
    ("s08-d3", None, 0.0, [("15-naga-pass-violent", 0.0, 1.0)]),
    ("s08b-d2", "01-bed-clearing", 0.15, []),
    ("s08c-d1", "01-bed-clearing", 0.3, []),
    ("s09-d1", "01-bed-clearing", 0.25, [("17-rain-long", 0.0, 0.9)]),  # rain runs on through 9b into 10
    ("s09b-d1", None, 0.0, []),
    ("s10-d3", "01-bed-clearing", 0.3, [("14-scale-awaken", 1.0, 1.0)]),
    ("s10b-d1", "01-bed-clearing", 0.3, []),
    ("s11-d1", "03-bed-night-river", 0.4, [("12-pixel-flicker", 0.6, 0.9)]),
    ("s12-d1", "03-bed-night-river", 0.4, []),
    ("endcard", "03-bed-night-river", 0.25, [("CHIME", 0.4, 0.9)]),
]
BED_TRIM = 0.75  # ambient beds 25 % down (v3: the water sat too loud under the scenes)

# transition into the NEXT shot: (xfade type, seconds); "cut" = one frame
TRANS = [
    ("fade", 0.8),       # 1 -> 2   arrival, time passes
    ("fade", 1.2),       # 2 -> 3   same framing: carriers fade into stillness
    ("slide", 0.55),     # 3 -> 4   chapter: exploring begins (new scene loaded)
    ("fade", 0.6),       # 4 -> 4b  over to the bridge
    ("fadeblack", 1.2),  # 4b -> 5  down the hatch
    ("cut", 0),          # 5 -> 6
    ("cut", 0),          # 6 -> 7
    ("slide", 0.55),     # 7 -> 8   chapter: the presence (new scene loaded)
    ("cut", 0),          # 8 -> 8b
    ("cut", 0),          # 8b -> 8c
    ("fade", 0.8),       # 8c -> 9  the rain comes
    ("cut", 0),          # 9 -> 9b
    ("cut", 0),          # 9b -> 10
    ("fade", 0.8),       # 10 -> 10b back to the wide village (same framing as 9 and 11)
    ("fade", 2.5),       # 10b -> 11 day into night IN PLACE: same framing, Tac on the same spot
    ("fade", 1.5),       # 11 -> 12
    ("fadeblack", 1.4),  # 12 -> end card
]
# The slide is the loudest transition: only on chapter changes, like ep 1.

# Hold each shot longer than the 5 s drafts (seconds on screen). Drafts are slowed with frame blending
# for review; finals get generated at these lengths instead.
TARGET = {"s01": 6.5, "s02": 6.0, "s03": 6.5, "s04": 6.0, "s04b": 5.5, "s05": 6.0, "s06": 6.5, "s07": 6.5,
          "s08": 8.0, "s08b": 6.0, "s08c": 6.0, "s09": 6.5, "s09b": 6.0, "s10": 7.5, "s10b": 7.0, "s11": 8.0, "s12": 9.0,
          "endcard": 5.0}

# ep 1's slide (frames at 0:43.0): the next shot rises from the bottom as a card rotated ~3 deg
# (top edge higher on the right), straightening as it lands; near-constant speed, easing only at the end;
# thin dark top edge; the old shot stays put and darkens as it is covered. (xfade P runs 1 -> 0)
SLIDE = ("st(1, 0.05*P); st(0, H*pow(P,1.7));"
         "st(2, X-W/2); st(3, Y-ld(0)-H/2);"
         "st(4, ld(2)*cos(ld(1)) - ld(3)*sin(ld(1)) + W/2);"
         "st(5, ld(2)*sin(ld(1)) + ld(3)*cos(ld(1)) + H/2);"
         "st(6, 1-0.45*(1-P));"
         "if(between(ld(4),0,W-1)*between(ld(5),0,H-1),"
         " if(eq(PLANE,0), b0(ld(4),ld(5)), if(eq(PLANE,1), b1(ld(4),ld(5)), b2(ld(4),ld(5)))),"
         " if(between(ld(4),0,W-1)*between(ld(5),-4,0), if(eq(PLANE,0),18,128),"
         "  if(eq(PLANE,0), A*ld(6), 128+(A-128)*ld(6))))")


def dur(p):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "json", str(p)],
                         capture_output=True, text=True, check=True).stdout
    return float(json.loads(out)["format"]["duration"])


def wav(name):
    p = CHIME if name == "CHIME" else AUD / f"{name}.wav"
    _, x = wavfile.read(p)
    x = x.astype(np.float32) / 32768
    return x if x.ndim == 2 else np.stack([x, x], 1)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="ep02-roughcut-v2.mp4")
    ap.add_argument("--stretch", action="store_true", help="preview TARGET timing by slowing drafts (review only)")
    ap.add_argument("--finals", action="store_true", help="use finals/1080/<shot>.mp4 at 1080x1920, 30 fps")
    a = ap.parse_args()

    global W, H, FPS
    if a.finals:
        W, H, FPS = 1080, 1920, 30
        files = [HERE / "ep02-endcard.mp4" if s[0] == "endcard" else EP / "finals" / "1080" / f"{s[0].split('-')[0]}.mp4"
                 for s in SHOTS]
    else:
        files = [HERE / ("ep02-endcard.mp4" if s[0] == "endcard" else f"silent/{s[0]}.mp4") for s in SHOTS]
    raw = [dur(f) for f in files]
    keys = [s[0].split("-")[0] for s in SHOTS]
    # Never slow footage down to fill time (it degrades the motion); shots play at native speed.
    # TARGET is the plan for generation lengths. Pass --stretch only to preview timing.
    durs = [max(r, TARGET.get(k, r)) for r, k in zip(raw, keys)] if a.stretch else list(raw)
    tlen = [max(d, 1 / FPS) if kind != "cut" else 1 / FPS for kind, d in TRANS]

    # start time of each shot on the timeline
    starts = [0.0]
    for i in range(1, len(SHOTS)):
        starts.append(starts[-1] + durs[i - 1] - tlen[i - 1])
    total = starts[-1] + durs[-1]

    # ---- video: normalise + chain xfades
    inputs, chain = [], []
    for i, f in enumerate(files):
        inputs += ["-i", str(f)]
        k = durs[i] / raw[i]
        chain.append(f"[{i}:v]scale={W}:{H},setpts={k:.4f}*(PTS-STARTPTS),framerate=fps={FPS},"
                     f"format=yuv444p,trim=duration={durs[i]:.3f},setpts=PTS-STARTPTS,settb=1/{FPS}[v{i}]")
    prev = "v0"
    for i, (kind, _) in enumerate(TRANS):
        off = starts[i + 1]
        if kind == "slide":
            tr = f"transition=custom:expr='{SLIDE}'"
        else:
            tr = f"transition={'fade' if kind == 'cut' else kind}"
        chain.append(f"[{prev}][v{i + 1}]xfade={tr}:duration={tlen[i]:.3f}:offset={off:.3f}[x{i}]")
        prev = f"x{i}"

    # ---- audio: beds with ramps matching the transitions, SFX at shot offsets
    mix = np.zeros((int(total * SR) + SR, 2), np.float32)
    for i, (name, bed, g, sfx) in enumerate(SHOTS):
        s, d = starts[i], durs[i]
        if bed:
            b = wav(bed)
            ii, jj = int(s * SR), int((s + d) * SR)
            seg = np.resize(b[int(s * SR) % len(b):], (jj - ii, 2))
            rin = tlen[i - 1] if i > 0 else 0.4
            rout = tlen[i] if i < len(TRANS) else 1.5
            k = np.arange(jj - ii)
            ramp = np.minimum(1, np.minimum(k / (max(rin, 0.15) * SR), (k[::-1]) / (max(rout, 0.15) * SR)))
            mix[ii:jj] += seg * g * BED_TRIM * ramp[:, None]
        for sname, off, sg in sfx:
            x = wav(sname)
            k0 = int((s + off * durs[i] / raw[i]) * SR)
            x = x[: len(mix) - k0]
            mix[k0 : k0 + len(x)] += x * sg
    mix = mix[: int(total * SR)]
    fade = int(1.2 * SR)
    mix[-fade:] *= np.linspace(1, 0, fade)[:, None]
    mix *= 0.89 / (np.abs(mix).max() + 1e-9)
    wavfile.write(HERE / "_rough.wav", SR, (mix * 32767).astype(np.int16))

    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-filter_complex_threads", "1", *inputs, "-i", str(HERE / "_rough.wav"),
                    "-filter_complex", ";".join(chain) + f";[{prev}]format=yuv420p[vout]", "-map", "[vout]", "-map", f"{len(files)}:a",
                    "-af", "loudnorm=I=-14:TP=-1.5:LRA=11",
                    "-c:v", "libx264", "-crf", "20", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k",
                    "-t", f"{total:.3f}", str(HERE / a.out)], check=True)
    print(f"{a.out}  {total:.1f}s")
    for (name, *_), s in zip(SHOTS, starts):
        print(f"  {s:6.2f}s  {name}")


if __name__ == "__main__":
    main()
