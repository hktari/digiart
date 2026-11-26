"""Ep 2 sound auditions — all synthesized (no licensing), episode-specific.

Writes to video-studio/episodes/ep02/sound/auditions/ and a labelled reel (reel.mp4).
The brand kit in brand/mascot/sound/ is not touched; chime.wav stays reserved.

    uv run --with numpy --with scipy --with pyloudnorm python video-studio/episodes/ep02/sound/make_ep02_sounds.py
"""

from __future__ import annotations

import subprocess
from pathlib import Path

import numpy as np
import pyloudnorm as pyln
from scipy.io import wavfile
from scipy.signal import butter, fftconvolve, sosfilt

SR = 48_000
HERE = Path(__file__).resolve().parent
OUT = HERE / "auditions"
RNG = np.random.default_rng(202)
METER = pyln.Meter(SR)


# ---------- helpers ----------
def t(sec):
    return np.arange(int(sec * SR)) / SR


def n(sec):
    return int(sec * SR)


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], btype="band", fs=SR, output="sos"), x, axis=0)


def lp(x, hi, order=2):
    return sosfilt(butter(order, hi, btype="low", fs=SR, output="sos"), x, axis=0)


def hp(x, lo, order=2):
    return sosfilt(butter(order, lo, btype="high", fs=SR, output="sos"), x, axis=0)


def noise(sec, ch=2):
    return RNG.standard_normal((n(sec), ch))


def brown(sec, ch=2):
    x = np.cumsum(noise(sec, ch), axis=0)
    x = hp(x, 20)
    return x / (np.abs(x).max() + 1e-9)


def smooth_lfo(sec, rate, depth, ch=1, lo=0.0):
    """Random smooth modulation in [lo, lo+depth] at roughly `rate` Hz."""
    pts = int(sec * rate) + 4
    knots = RNG.random((pts, ch))
    xs = np.linspace(0, pts - 3, n(sec))
    out = np.stack([np.interp(xs, np.arange(pts), knots[:, c]) for c in range(ch)], axis=1)
    out = lp(out, max(rate * 2, 0.5), order=1)
    out = (out - out.min()) / (out.max() - out.min() + 1e-9)
    return lo + depth * out


def pan(mono, p):
    """p: -1 left .. +1 right (scalar or array). Equal power."""
    p = np.asarray(p)
    a = (p + 1) * np.pi / 4
    return np.stack([mono * np.cos(a), mono * np.sin(a)], axis=1)


def place(buf, x, at):
    i = n(at)
    j = min(len(buf), i + len(x))
    buf[i:j] += x[: j - i]


def env(sec, attack, decay):
    tt = t(sec)
    return np.minimum(1, tt / max(attack, 1e-4)) * np.exp(-tt / decay)


def reverb(x, sec=2.0, mix=0.3, damp=4000):
    ir_t = t(sec)
    ir = RNG.standard_normal((len(ir_t), 2)) * np.exp(-ir_t / (sec / 5))[:, None]
    ir = lp(ir, damp)
    wet = np.stack([fftconvolve(x[:, c], ir[:, c])[: len(x)] for c in range(2)], axis=1)
    wet /= np.abs(wet).max() + 1e-9
    dry = x / (np.abs(x).max() + 1e-9)
    return (1 - mix) * dry + mix * wet


def loop_seam(x, xf=2.0):
    """Make a seamless loop: crossfade the tail into the head, drop the tail."""
    k = n(xf)
    fade = np.linspace(0, 1, k)[:, None]
    head = x[:k] * fade + x[-k:] * (1 - fade)
    return np.concatenate([head, x[k:-k]])


def save(name, x, lufs=-18.0):
    if x.ndim == 1:
        x = np.stack([x, x], axis=1)
    loud = METER.integrated_loudness(x)
    x = x * 10 ** ((lufs - loud) / 20)
    peak = np.abs(x).max()
    if peak > 0.89:  # keep ~-1 dBFS headroom
        x *= 0.89 / peak
    OUT.mkdir(parents=True, exist_ok=True)
    wavfile.write(OUT / name, SR, (np.clip(x, -1, 1) * 32767).astype(np.int16))
    print(f"wrote {name:28s} {len(x) / SR:5.1f}s  {METER.integrated_loudness(x):6.1f} LUFS")
    return x


# ---------- building blocks ----------
def river(sec, level=1.0, bright=1200):
    body = lp(brown(sec), bright) * smooth_lfo(sec, 0.15, 0.4, lo=0.6)
    burble = np.zeros((n(sec), 2))
    for at in RNG.uniform(0, sec - 0.2, int(sec * 9)):
        f = RNG.uniform(250, 800)
        d = RNG.uniform(0.02, 0.06)
        tt = t(d * 4)
        b = np.sin(2 * np.pi * f * (1 + 0.6 * tt / tt[-1]) * tt) * np.exp(-tt / d)
        place(burble, pan(b, RNG.uniform(-0.7, 0.7)) * RNG.uniform(0.05, 0.2), at)
    splash = bp(noise(sec), 1800, 8000) * smooth_lfo(sec, 0.4, 0.6, lo=0.4) * 0.06
    return level * (body * 0.55 + lp(burble, 1500) + splash)


def leaves(sec, level=1.0, gust_rate=0.12):
    g = smooth_lfo(sec, gust_rate, 1.0) ** 2
    return level * bp(noise(sec), 1800, 6500) * (0.15 + 0.85 * g) * 0.25


def insects(sec, level=1.0):
    carrier = bp(noise(sec), 5200, 6600, order=3)
    pulse = 0.6 + 0.4 * np.sin(2 * np.pi * 31 * t(sec))[:, None]
    swell = smooth_lfo(sec, 0.05, 0.5, lo=0.5)
    return level * carrier * pulse * swell * 0.25


def bird(f0=2800):
    tt = t(0.35)
    sweep = f0 * (1 + 0.35 * np.sin(np.pi * tt / tt[-1]))
    phase = 2 * np.pi * np.cumsum(sweep) / SR
    return np.sin(phase) * np.sin(np.pi * tt / tt[-1]) ** 2


def cricket(sec, f=4300, every=1.1, offset=0.0):
    x = np.zeros(n(sec))
    at = offset
    while at < sec - 0.3:
        for k in range(3):
            tt = t(0.035)
            c = np.sin(2 * np.pi * f * tt) * np.sin(np.pi * tt / tt[-1])
            i = n(at + k * 0.055)
            x[i : i + len(c)] += c[: len(x) - i]
        at += every * RNG.uniform(0.85, 1.2)
    return x


def tick(f, d, gain=1.0):
    tt = t(d * 5)
    return gain * np.sin(2 * np.pi * f * tt) * np.exp(-tt / d)


def mix(*xs):
    m = max(len(x) for x in xs)
    return sum(np.pad(x, (0, m - len(x))) for x in xs)


def grain(d, lo, hi):
    g = bp(RNG.standard_normal(n(d)), lo, hi)
    return g * np.hanning(len(g))


# ---------- the sounds ----------
def bed_clearing(sec=32):
    x = river(sec, 1.0) + leaves(sec, 1.0) + insects(sec, 0.8)
    for at in RNG.uniform(2, sec - 2, 3):
        place(x, pan(bird(RNG.uniform(2400, 3400)), RNG.uniform(-0.8, 0.8)) * 0.05, at)
    return loop_seam(x)


def bed_hillside(sec=32):
    """Opening (shots 1-3): the procession is still up the slope, far from the river.
    Leaves, insects and birds carry it; the river is only a dark, distant rumble."""
    x = leaves(sec, 1.1) + insects(sec, 0.9) + lp(river(sec, 0.12, bright=500), 400)
    for at in RNG.uniform(1.5, sec - 1.5, 6):
        place(x, pan(bird(RNG.uniform(2300, 3600)), RNG.uniform(-0.9, 0.9)) * 0.06, at)
    return loop_seam(x)


def bed_hall(sec=32):
    room = lp(brown(sec), 280) * 0.6
    tt = t(sec)
    hum = sum(g * np.sin(2 * np.pi * f * tt) for f, g in [(55, 1), (110, 0.4), (165.4, 0.15)])
    hum = hum * (0.7 + 0.3 * np.sin(2 * np.pi * 0.07 * tt))
    x = room + pan(hum * 0.05, 0)
    # dead tech: a faint buzz that flickers on for a moment now and then
    for at in RNG.uniform(3, sec - 3, 4):
        d = RNG.uniform(0.3, 0.9)
        b = bp(np.sign(np.sin(2 * np.pi * 120 * t(d))), 1800, 3200) * np.hanning(n(d))
        b *= (RNG.random(n(d)) > 0.3)  # stutter
        place(x, pan(b * 0.012, RNG.uniform(-0.5, 0.5)), at)
    # the drip hollow
    at = 1.3
    while at < sec - 1:
        tt = t(0.25)
        f = 1300 * (1 + 0.9 * np.minimum(1, tt / 0.03))
        d = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / 0.05)
        place(x, pan(d * 0.10, 0.35), at)
        at += RNG.uniform(3.2, 5.0)
    return loop_seam(reverb(x, 2.8, mix=0.45, damp=3000))


def bed_night(sec=32):
    x = river(sec, 0.8, bright=800) + leaves(sec, 0.3, gust_rate=0.06)
    x += pan(cricket(sec, 4300, 1.1) * 0.035, -0.6) + pan(cricket(sec, 3900, 1.6, 0.4) * 0.025, 0.55)
    for at in RNG.uniform(3, sec - 3, 3):  # a frog, far off
        tt = t(0.3)
        fr = np.sin(2 * np.pi * 320 * tt) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 16 * tt))) * np.hanning(len(tt))
        place(x, pan(lp(fr, 900) * 0.05, RNG.uniform(-0.8, 0.8)), at)
    return loop_seam(x)


def sfx_shard_chime():
    """Tac flicks the tile / circuit / lens chime: dull ceramic and glass clinks, not a bell."""
    x = np.zeros((n(2.5), 2))
    hits = [(0.05, 2350, -0.2), (0.16, 3120, 0.1), (0.24, 2710, 0.25), (0.41, 1980, -0.1), (0.62, 2890, 0.15), (0.9, 2500, 0.0)]
    for i, (at, f, p) in enumerate(hits):
        g = 1.0 if i < 3 else 0.55 * (0.7 ** (i - 3))
        c = mix(tick(f, 0.06, g), tick(f * 2.31, 0.025, 0.4 * g), tick(f * 0.53, 0.04, 0.25 * g))
        c[: n(0.002)] += grain(0.002, 3000, 9000) * g  # the contact
        place(x, pan(c, p), at)
    # one plastic circuit-board tock
    place(x, pan(mix(tick(700, 0.02, 0.5), grain(0.01, 600, 2000)), -0.15), 0.3)
    return reverb(x, 0.8, mix=0.15)


def sfx_stone_blink():
    """Shot 4: every 'boulder' opens its eyes at once — soft, low, almost unison."""
    x = np.zeros((n(2.0), 2))
    for k in range(6):
        at = 0.1 + RNG.uniform(0, 0.06)
        c = mix(lp(grain(0.05, 200, 900), 700) * 0.6, tick(RNG.uniform(260, 340), 0.03, 0.5))
        place(x, pan(c, -0.8 + k * 0.32), at)
    for k in range(6):  # ...and close again
        at = 1.25 + RNG.uniform(0, 0.08)
        c = mix(lp(grain(0.04, 200, 800), 600) * 0.4, tick(RNG.uniform(240, 300), 0.025, 0.35))
        place(x, pan(c, -0.8 + k * 0.32), at)
    return reverb(x, 0.6, mix=0.1)


def sfx_mimosa():
    """Leaflets fold one after another, the wave travelling left to right."""
    x = np.zeros((n(2.4), 2))
    for k in range(16):
        at = 0.05 + k * 0.09 * (1 + k * 0.02)
        g = 0.9 * (0.88 ** k)
        c = grain(RNG.uniform(0.02, 0.04), 2500, 7500) * g
        place(x, pan(c, -0.7 + k * 0.09), at)
    return x


def sfx_headset():
    """Shot 6: one weak diode flicker — a tiny electrical tick and a dying whine."""
    x = np.zeros((n(2.2), 2))
    place(x, pan(grain(0.006, 2000, 8000) * 0.8, 0.1), 0.1)
    tt = t(1.3)
    f = 3400 * np.exp(-tt / 0.8) + 900
    w = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / 0.45) * (0.6 + 0.4 * (RNG.random(len(tt)) > 0.15))
    place(x, pan(w * 0.18, 0.1), 0.12)
    place(x, pan(grain(0.004, 2000, 8000) * 0.4, 0.1), 0.95)
    return reverb(x, 1.2, mix=0.3)


def sfx_tea_drop():
    """Shot 7: one drop on bare earth, then a fiddlehead uncurls (tiny creaks)."""
    x = np.zeros((n(2.6), 2))
    tt = t(0.2)
    f = 950 * (1 + 0.8 * np.minimum(1, tt / 0.015))
    drop = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / 0.03) * 0.5
    pat = lp(grain(0.03, 150, 1200), 900) * 0.7
    place(x, pan(mix(drop, pat), 0), 0.15)
    for k in range(7):
        place(x, pan(mix(tick(RNG.uniform(1800, 2600), 0.006, 0.25), grain(0.008, 3000, 7000) * 0.15), 0.05), 0.8 + k * 0.17 + RNG.uniform(0, 0.04))
    return x


def naga_pass(with_bed=True):
    """Shot 8: insects and river drop out, a long rustle crosses the stereo field, a low swell is felt, leaves settle."""
    sec = 9.0
    out = np.zeros((n(sec), 2))
    if with_bed:
        bed = river(sec, 1.0) + leaves(sec, 0.8)
        ins = insects(sec, 0.8)
        tt = t(sec)
        duck = np.interp(tt, [0, 1.2, 1.8, 6.5, 8.5, 9], [1, 1, 0.12, 0.12, 0.9, 1])[:, None]
        ins_duck = np.interp(tt, [0, 1.0, 1.3, 7.2, 9], [1, 1, 0.0, 0.0, 0.8])[:, None]  # insects stop first
        out += bed * duck + ins * ins_duck
    # the rustle: dense leaf noise, panned left -> right over ~4 s, swelling
    rs = 4.4
    tt = t(rs)
    shape = np.sin(np.pi * tt / rs) ** 1.5
    r = bp(RNG.standard_normal(len(tt)), 1400, 6500) * shape * (0.6 + 0.4 * smooth_lfo(rs, 6, 1.0)[:, 0])
    r = r + bp(RNG.standard_normal(len(tt)), 2500, 8000) * shape * 0.4  # leaf edges
    out[n(1.9) : n(1.9) + len(tt)] += pan(r * 0.35, np.linspace(-0.95, 0.95, len(tt)))
    # a low swell under it, more felt than heard
    sw = np.sin(2 * np.pi * 42 * tt) * shape ** 2
    out[n(1.9) : n(1.9) + len(tt)] += pan(sw * 0.25, 0)
    # leaves settling, right side
    for k in range(9):
        place(out, pan(grain(RNG.uniform(0.02, 0.05), 2000, 7000) * 0.12 * (0.85 ** k), RNG.uniform(0.3, 0.9)), 6.3 + k * 0.18 + RNG.uniform(0, 0.08))
    return out


def sfx_rain_onset(sec=10.0):
    """Shot 9: first drops on leaves and clay cups, thickening into a soft rain."""
    x = np.zeros((n(sec), 2))
    tt = t(sec)
    rate = np.interp(tt, [0, 3, 7, sec], [1.5, 6, 35, 50])
    at = 0.2
    while at < sec - 0.1:
        g = RNG.uniform(0.2, 0.6)
        d = grain(RNG.uniform(0.004, 0.012), 1200, 7000) * g
        place(x, pan(d, RNG.uniform(-0.9, 0.9)), at)
        at += RNG.exponential(1 / np.interp(at, tt, rate))
    for at, f in [(0.9, 1180), (2.1, 1420), (3.4, 1180), (4.6, 1650), (5.5, 1420)]:  # drops in cups
        c = mix(tick(f, 0.09, 0.5), tick(f * 2.7, 0.03, 0.15))
        place(x, pan(c, RNG.uniform(-0.6, 0.6)), at)
    wash = bp(noise(sec), 800, 8000) * np.interp(tt, [0, 3, 8, sec], [0, 0.02, 0.12, 0.14])[:, None]
    return x + wash


def sfx_rain_long(sec=20.0, fade=5.0):
    """Shots 9 -> 9b -> 10 in one piece: the same onset, held as steady rain through 9b (with drops
    in the shrine cups), tapering away under shot 10. Replaces 11 + a second 11, which left a gap."""
    x = sfx_rain_onset(sec)
    for at, f in [(8.4, 1300), (9.6, 1550), (10.9, 1300), (12.3, 1720)]:  # drops into the shrine cups (9b)
        c = mix(tick(f, 0.09, 0.45), tick(f * 2.7, 0.03, 0.13))
        place(x, pan(c, RNG.uniform(-0.4, 0.4)), at)
    k = n(fade)
    x[-k:] *= np.linspace(1, 0, k)[:, None] ** 1.5
    return x


def sfx_pixel_flicker():
    """Shot 11: the cyan pixel downriver — a faint, irregular digital flicker, not a firefly."""
    sec = 4.0
    x = np.zeros(n(sec))
    on = [(0.2, 0.18), (0.5, 0.06), (0.62, 0.3), (1.4, 0.05), (1.5, 0.05), (2.3, 0.45), (3.1, 0.08)]
    for at, d in on:
        tt = t(d)
        sq = np.sign(np.sin(2 * np.pi * 1760 * tt)) * 0.5 + np.sign(np.sin(2 * np.pi * 120 * tt)) * 0.15
        sq = np.round(sq * 6) / 6  # a touch of bit-crush
        e = np.minimum(1, tt / 0.004) * np.minimum(1, (d - tt) / 0.004)
        x[n(at) : n(at) + len(tt)] += sq * e
    x = lp(x, 5000)
    return reverb(pan(x * 0.4, 0.35), 2.5, mix=0.55, damp=2500)


def sfx_scale_awaken():
    """Shot 10: the scale wakes at Tac's touch — a cool glassy swell, rising sparkle, then a slow breathing pulse.
    Deliberately not a bell (the brand chime can sit on top as the episode's one chime)."""
    sec = 5.0
    tt = t(sec)
    x = np.zeros((n(sec), 2))
    # the touch
    place(x, pan(grain(0.006, 2500, 9000) * 0.6, -0.1), 0.25)
    # glassy swell: detuned soft partials, rising in, cool and airy
    swell_env = np.interp(tt, [0, 0.3, 1.1, 2.2, sec], [0, 0, 1, 0.55, 0.25])
    for f, g, p in [(392, 0.5, -0.4), (587.3, 0.4, 0.4), (784.6, 0.25, -0.2), (1174.7, 0.12, 0.3)]:
        vib = 1 + 0.003 * np.sin(2 * np.pi * 5.5 * tt + RNG.uniform(0, 6))
        tone = np.sin(2 * np.pi * f * vib * tt) + 0.4 * np.sin(2 * np.pi * f * 1.004 * tt)
        x += pan(tone * swell_env * g * 0.25, p)
    # rising sparkle motes
    for _ in range(70):
        at = RNG.uniform(0.35, 2.6)
        f = 2500 + 4000 * (at - 0.35) / 2.25 + RNG.uniform(-400, 400)
        place(x, pan(tick(f, RNG.uniform(0.01, 0.03), RNG.uniform(0.05, 0.15)), RNG.uniform(-0.9, 0.9)), at)
    # slow breathing pulse after it settles
    pulse = (0.5 - 0.5 * np.cos(2 * np.pi * 0.6 * tt)) * np.interp(tt, [0, 2.2, 2.8, sec], [0, 0, 1, 0.8])
    x += pan(np.sin(2 * np.pi * 196 * tt) * pulse * 0.12, 0)
    # a felt low bloom under the touch
    x += pan(np.sin(2 * np.pi * 55 * tt) * np.interp(tt, [0, 0.3, 0.9, 2.5, sec], [0, 0, 0.5, 0, 0]) * 0.4, 0)
    return reverb(x, 2.5, mix=0.4, damp=6000)


def naga_pass_violent(hit=2.1, sec=8.0):
    """Shot 8 v2 (8 s draft): calm bed, then at `hit` something huge tears through the canopy L->R in ~1.2 s:
    insects cut dead, a big whoosh, violent leaf thrash, branch creaks and snaps, a felt low hit;
    then branches swing back, leaves rain down, the bed slowly returns."""
    tt = t(sec)
    out = np.zeros((n(sec), 2))
    bed = river(sec, 1.0) + leaves(sec, 0.6)
    ins = insects(sec, 0.8)
    out += bed * np.interp(tt, [0, hit, hit + 0.15, 5.5, sec], [1, 1, 0.15, 0.2, 0.7])[:, None]
    out += ins * np.interp(tt, [0, hit - 0.05, hit, sec - 0.8, sec], [1, 1, 0, 0, 0.5])[:, None]
    # the whoosh: broadband air, panned fast L -> R, swelling then tailing
    wl = 1.6
    wt = t(wl)
    shape = np.interp(wt, [0, 0.12, 0.6, wl], [0, 1, 0.7, 0])
    whoosh = bp(RNG.standard_normal(len(wt)), 250, 7000) * shape
    sweep = np.sin(np.pi * wt / wl * 0.9)  # brightness swell
    whoosh = whoosh * (0.6 + 0.4 * sweep)
    out[n(hit) : n(hit) + len(wt)] += pan(whoosh * 0.6, np.clip(np.linspace(-1.1, 1.1, len(wt)), -1, 1))
    # violent leaf thrash: dense high noise, fast irregular AM, decaying over ~3 s
    tl = 3.4
    tht = t(tl)
    am = (0.4 + 0.6 * smooth_lfo(tl, 14, 1.0)[:, 0]) * np.interp(tht, [0, 0.1, 0.8, tl], [0, 1, 0.6, 0])
    thrash = bp(noise(tl), 1500, 9000) * am[:, None] * 0.5
    out[n(hit + 0.05) : n(hit + 0.05) + len(tht)] += thrash
    # low hit, felt
    lt = t(1.4)
    low = np.sin(2 * np.pi * (48 - 14 * lt / 1.4) * lt) * np.exp(-lt / 0.45) * np.minimum(1, lt / 0.03)
    out[n(hit) : n(hit) + len(lt)] += pan(low * 0.7, 0)
    # branch snaps and creaks
    for at, p in [(hit + 0.35, -0.3), (hit + 0.7, 0.2), (hit + 1.05, 0.6)]:
        snap = mix(grain(0.02, 800, 6000) * 0.9, tick(RNG.uniform(180, 320), 0.05, 0.6))
        place(out, pan(snap, p), at)
    for at in [hit + 1.6, hit + 2.6, hit + 3.6]:  # branches swinging back
        ct = t(0.5)
        f = 140 + 60 * np.sin(np.pi * ct / 0.5)
        creak = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * np.hanning(len(ct))
        place(out, pan(lp(creak, 1500) * 0.06, RNG.uniform(-0.5, 0.7)), at)
    # leaves raining down
    at = hit + 0.8
    while at < sec - 0.3:
        place(out, pan(grain(RNG.uniform(0.02, 0.05), 2000, 7000) * RNG.uniform(0.04, 0.12), RNG.uniform(-0.9, 0.9)), at)
        at += RNG.exponential(0.12 + 0.25 * (at - hit) / (sec - hit))
    return out


def steps_moss():
    """Optional: Tac's soft padded steps on moss and earth."""
    x = np.zeros((n(3.2), 2))
    for k in range(6):
        at = 0.2 + k * 0.48 + RNG.uniform(-0.02, 0.02)
        s = mix(lp(grain(0.06, 80, 900), 500) * 0.8, grain(0.04, 2000, 6000) * 0.08)
        place(x, pan(s, -0.15 if k % 2 else 0.15), at)
    return x


# ---------- main ----------
def main():
    items = [
        ("01-bed-clearing.wav", "Bed A: fig clearing (river, leaves, insects, rare bird) - 30 s loop", bed_clearing(), -18),
        ("02-bed-hall.wav", "Bed B: Shared Hall (buried room tone, dead hum, drip, flickering buzz) - loop", bed_hall(), -18),
        ("03-bed-night-river.wav", "Bed C: night river (darker water, two crickets, far frog) - loop", bed_night(), -18),
        ("04-shard-chime.wav", "Shot 4: Tac flicks the shard chime (clinks, not the brand chime)", sfx_shard_chime(), -18),
        ("05-stone-blink.wav", "Shot 4: every boulder opens its eyes, then closes them", sfx_stone_blink(), -18),
        ("06-mimosa-fold.wav", "Shot 5: mimosa folds, wave travels left to right", sfx_mimosa(), -18),
        ("07-headset-diode.wav", "Shot 6: one weak diode flicker", sfx_headset(), -18),
        ("08-tea-drop.wav", "Shot 7: one drop on earth, fern uncurls", sfx_tea_drop(), -18),
        ("09-naga-pass.wav", "Shot 8: the pass, in the clearing bed (insects stop, rustle L to R, settle)", naga_pass(True), -18),
        ("10-naga-pass-dry.wav", "Shot 8: the pass on its own (rustle + low swell + settle)", naga_pass(False), -18),
        ("11-rain-onset.wav", "Shot 9: first rain on leaves and cups", sfx_rain_onset(), -18),
        ("12-pixel-flicker.wav", "Shot 11: cyan pixel flicker downriver", sfx_pixel_flicker(), -20),
        ("13-steps-moss.wav", "Optional: Tac's padded steps on moss", steps_moss(), -20),
        ("14-scale-awaken.wav", "Shot 10: the scale wakes at Tac's touch (swell, sparkle, breathing pulse)", sfx_scale_awaken(), -18),
        ("15-naga-pass-violent.wav", "Shot 8 v2: 2 s calm, then it tears through the canopy (whoosh, thrash, snaps, low hit), leaves fall", naga_pass_violent(), -16),
        ("16-bed-hillside.wav", "Bed A2: up the slope, far from the river (leaves, insects, birds, faint distant water) - opening shots 1-3", bed_hillside(), -18),
        ("17-rain-long.wav", "Shots 9-9b-10: rain onset held through 9b, fading under 10 (one piece, no gap) - 20 s", sfx_rain_long(), -18),
    ]
    reel_parts = []
    for name, label, x, lufs in items:
        save(name, x, lufs)
        reel_parts.append((name, label))
    make_reel(reel_parts)


def make_reel(parts):
    """Labelled audition reel: one title card per sound, 0.8 s of silence between them."""
    tmp = OUT / "_reel"
    tmp.mkdir(exist_ok=True)
    lst = []
    for i, (name, label) in enumerate(parts):
        seg = tmp / f"{i:02d}.mp4"
        dur = wavfile.read(OUT / name)[1].shape[0] / SR
        dur = min(dur, 12.0)  # beds are trimmed to 12 s in the reel
        import textwrap

        lines = textwrap.wrap(label.replace("'", ""), 34)
        draws = [f"drawtext=text='{i + 1:02d}':fontcolor=0xFB9E58:fontsize=120:x=(w-tw)/2:y=640"]
        for k, ln in enumerate(lines):
            ln = ln.replace(":", r"\:").replace(",", r"\,")
            draws.append(f"drawtext=text='{ln}':fontcolor=0xF4ECE1:fontsize=44:x=(w-tw)/2:y={840 + k * 62}")
        subprocess.run([
            "ffmpeg", "-y", "-loglevel", "error",
            "-f", "lavfi", "-i", "color=c=0x1F1834:s=1080x1920:r=30",
            "-i", str(OUT / name),
            "-filter_complex",
            f"[1:a]atrim=0:{dur},apad=pad_dur=0.8[a];"
            f"[0:v]{','.join(draws)}[v]",
            "-map", "[v]", "-map", "[a]", "-t", f"{dur + 0.8}",
            "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", str(seg),
        ], check=True)
        lst.append(f"file '{seg.name}'")
    (tmp / "list.txt").write_text("\n".join(lst) + "\n")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", str(tmp / "list.txt"),
                    "-c", "copy", str(HERE / "reel.mp4")], check=True)
    print("wrote reel.mp4")


if __name__ == "__main__":
    main()
