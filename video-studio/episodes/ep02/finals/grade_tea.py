"""Shot 7 post fix: H3 paints the tea as a glowing orange pool, a second warm light next to Tac's heart.
Re-grade orange pixels in the lower part of the frame (well below the heart) to a dark, low-saturation earth brown.

    uv run --with opencv-python-headless --with numpy python finals/grade_tea.py finals/s07-f2.mp4 finals/s07-f3.mp4
"""

import sys

import cv2
import numpy as np

src, dst = sys.argv[1], sys.argv[2]
cap = cv2.VideoCapture(src)
fps = cap.get(cv2.CAP_PROP_FPS)
w, h = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)), int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
out = cv2.VideoWriter(dst, cv2.VideoWriter_fourcc(*"mp4v"), fps, (w, h))
y0 = int(h * 0.62)  # the heart sits around 0.55 h; the ground starts below ~0.65 h
ramp = np.clip((np.arange(h) - y0) / (h * 0.05), 0, 1)[:, None]  # soft top edge of the region
while True:
    ok, frame = cap.read()
    if not ok:
        break
    hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV).astype(np.float32)
    hue, sat, val = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    # orange / amber (OpenCV hue 0-180: ~8-28), clearly saturated and bright
    m = ((hue > 6) & (hue < 30) & (sat > 90) & (val > 90)).astype(np.float32)
    m = cv2.GaussianBlur(m, (0, 0), 2.0) * ramp
    target_s = sat * 0.35
    target_v = val * 0.45
    hsv[..., 1] = sat * (1 - m) + target_s * m
    hsv[..., 2] = val * (1 - m) + target_v * m
    hsv[..., 0] = hue * (1 - m) + 14 * m  # earth brown
    out.write(cv2.cvtColor(np.clip(hsv, 0, 255).astype(np.uint8), cv2.COLOR_HSV2BGR))
cap.release()
out.release()
print("wrote", dst)
