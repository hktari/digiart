"""Animate one approved keyframe on Replicate (default minimax/h3-lite, 480P drafts) and log it.

Reads REPLICATE_API_TOKEN from apps/social-media-generator/.env, like gen_image.py.
Keyframes are downscaled to a 864 px wide JPEG before upload (plenty for 480P/768P).
Every run is appended to <out dir>/../gen-log.jsonl.

    uv run --with replicate --with python-dotenv --with pillow python video-studio/scripts/gen_video.py \
        --prompt-file drafts/prompts/s03.txt --first keyframes/s03-v2.png --out drafts/s03-d1.mp4
"""

from __future__ import annotations

import argparse
import io
import json
import time
import urllib.request
from pathlib import Path

from dotenv import load_dotenv
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
load_dotenv(ROOT / "apps/social-media-generator/.env")

import replicate  # noqa: E402


def jpeg(path: Path, width: int = 864) -> io.BytesIO:
    im = Image.open(path).convert("RGB")
    im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, "JPEG", quality=92)
    buf.seek(0)
    buf.name = path.stem + ".jpg"
    return buf


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--prompt-file", required=True, type=Path)
    p.add_argument("--first", required=True, type=Path)
    p.add_argument("--last", type=Path)
    p.add_argument("--out", required=True, type=Path)
    p.add_argument("--model", default="minimax/h3-lite")
    p.add_argument("--resolution", default="480P")
    p.add_argument("--duration", type=int, default=5)
    a = p.parse_args()

    inp = {
        "prompt": a.prompt_file.read_text().strip(),
        "first_frame_image": jpeg(a.first),
        "duration": a.duration,
        "resolution": a.resolution,
    }
    if a.last:
        inp["last_frame_image"] = jpeg(a.last)
    t0 = time.time()
    pred = replicate.predictions.create(model=a.model, input=inp)
    pred.wait()
    if pred.status != "succeeded":
        print(f"FAILED {pred.id}: {pred.error}")
        return 1
    out = pred.output[0] if isinstance(pred.output, list) else pred.output
    a.out.parent.mkdir(parents=True, exist_ok=True)
    urllib.request.urlretrieve(str(out), a.out)
    log = a.out.parent.parent / "gen-log.jsonl"
    with log.open("a") as fh:
        fh.write(json.dumps({
            "t": time.strftime("%Y-%m-%d %H:%M:%S"), "id": pred.id, "model": a.model,
            "out": str(a.out.relative_to(log.parent)), "first": a.first.name,
            "last": a.last.name if a.last else None, "resolution": a.resolution,
            "duration_s": a.duration, "wall_s": round(time.time() - t0, 1),
            "prompt_file": a.prompt_file.name, "metrics": getattr(pred, "metrics", None),
        }) + "\n")
    print(f"{pred.id} -> {a.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
