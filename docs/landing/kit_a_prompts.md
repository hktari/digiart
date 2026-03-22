# Kit A – Contemporary Editorial Minimal (Prompts)

**Global constraints (append to every prompt)**
```
Photoreal product mockup, premium zine/booklet print, realistic paper grain, matte soft‑touch cover, crisp ink detail, natural soft daylight, shallow depth of field, clean background, no logos, no watermarks, no readable text.
```
**Negative prompt (if supported)**
```
watermark, logo, QR code, readable text, blurry, low‑res, CGI/plastic, warped pages, distorted hands
```
---
## Prompt templates (use as *image‑to‑image* with a reference booklet photo for composition & lighting)

| # | Scenario | Prompt (replace `{PALETTE}` with one of the three accent colors) |
|---|----------|---------------------------------------------------------------|
| 1️⃣ | **Artist hero – workflow & product** | `Using the reference image for composition and lighting: an artist desk scene with an open A5 perfect‑bound booklet (48 pages). Contemporary editorial minimal, Swiss grid feel, bone/ivory paper + graphite text, accent `{PALETTE}`. Add artist customization: tablet showing layout thumbnails (no readable UI), color swatches, proof sheets, crop‑marks as abstract shapes. ` + global constraints |
| 2️⃣ | **Collector hero – unboxing** | `Using the reference image for composition and lighting: hands lifting the premium A5 booklet from a minimal kraft mailer. Contemporary editorial minimal, bone/ivory + graphite with accent `{PALETTE}`. Collector customization: archival sleeve, personalized belly‑band with abstract nameplate (no readable text), numbered sticker rendered as blurred glyphs. ` + global constraints |
| 3️⃣ | **Cover close‑up – material & finish** | `Using the reference image for composition and lighting: a 3/4 view close‑up of the booklet cover, matte soft‑touch finish, subtle debossed pattern (abstract, no readable text). Color palette bone/ivory + graphite with accent `{PALETTE}`. ` + global constraints |
| 4️⃣ | **Open spread – print quality & layout** | `Using the reference image for composition and lighting: open booklet to a double‑page spread. Left page full‑bleed illustration, right page grid layout with captions as blurred blocks (no readable text). Editorial minimal style, bone/ivory paper, graphite headings, accent `{PALETTE}` on call‑outs. ` + global constraints |
| 5️⃣ | **Shelf stack – completionist collector** | `Using the reference image for composition and lighting: a tidy stack of eight A5 issues on a wooden shelf. All spines share consistent thickness; each cover varies only by accent `{PALETTE}` (different hue intensity). Collector customization: abstract numbered stickers (blurred glyphs) on each spine, subtle belly‑band peek. ` + global constraints |
| 6️⃣ | **Customization detail – belly‑band & sticker** | `Using the reference image for composition and lighting: macro shot of the archival belly‑band wrapped around the booklet, abstract nameplate shape (no readable text) and a small numbered sticker rendered as a blurred glyph. Bone/ivory paper, graphite text, accent `{PALETTE}` on the band edge. ` + global constraints |

### Accent‑color options for Kit A
| Accent | Hex | Usage example |
|--------|-----|---------------|
| **Ultramarine** | `#3F48CC` | `PALETTE=ultramarine` |
| **Vermilion**   | `#E24B2A` | `PALETTE=vermilion` |
| **Acid Green**  | `#A8E61D` | `PALETTE=acid‑green` |

#### How to use (CLI example for Stable Diffusion XL)
```bash
# Replace <REF> with path to your reference image and <ACC> with one of the hex values
sdxl generate \
  --init-img <REF> \
  --prompt "$(cat kit_a_prompts.md | grep -A1 '\| 1️⃣' | tail -n1 | sed 's/`//g')" \
  --negative-prompt "watermark, logo, QR code, readable text" \
  --width 1024 --height 1024 \
  --seed 42 \
  --output ./outputs/artist_hero_<ACC>.png
```

#### Quick copy‑paste ready prompts (replace `{PALETTE}` manually)
```
Using the reference image for composition and lighting: an artist desk scene with an open A5 perfect‑bound booklet (48 pages). Contemporary editorial minimal, Swiss grid feel, bone/ivory paper + graphite text, accent {PALETTE}. Add artist customization: tablet showing layout thumbnails (no readable UI), color swatches, proof sheets, crop‑marks as abstract shapes. Photoreal product mockup, premium zine/booklet print, realistic paper grain, matte soft‑touch cover, crisp ink detail, natural soft daylight, shallow depth of field, clean background, no logos, no watermarks, no readable text.
```
```
Using the reference image for composition and lighting: hands lifting the premium A5 booklet from a minimal kraft mailer. Contemporary editorial minimal, bone/ivory + graphite with accent {PALETTE}. Collector customization: archival sleeve, personalized belly‑band with abstract nameplate (no readable text), numbered sticker rendered as blurred glyphs. Photoreal product mockup, premium zine/booklet print, realistic paper grain, matte soft‑touch cover, crisp ink detail, natural soft daylight, shallow depth of field, clean background, no logos, no watermarks, no readable text.
```
... (repeat for rows 3‑6)   
