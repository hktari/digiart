// Pure extraction/URL helpers. No DOM, no chrome APIs.
// Exposed as globalThis.TC (browser) and module.exports (Node).

function parsePermalink(pathname) {
  const m = /^\/@([^/]+)\/post\/([^/?#]+)/.exec(pathname || "");
  if (!m) return null;
  const handle = m[1];
  const shortcode = m[2];
  return {
    handle,
    shortcode,
    postUrl: `https://www.threads.com/@${handle}/post/${shortcode}`,
  };
}

// Classify the current page from its path:
//   /@handle/post/shortcode        -> { type: "post", ... }   (collect all images)
//   /@handle/post/shortcode/media  -> { type: "media", ... }  (collect the shown image)
//   anything else                  -> { type: null }
function parsePage(pathname) {
  const p = parsePermalink(pathname);
  if (!p) return { type: null };
  const isMedia = /\/post\/[^/?#]+\/media(\/|$|\?|#)/.test(pathname || "");
  return { type: isMedia ? "media" : "post", ...p };
}

// Every URL candidate a srcset offers, in document order.
function srcsetUrls(srcset) {
  const out = [];
  for (const part of (srcset || "").split(",")) {
    const seg = part.trim();
    if (!seg) continue;
    const sp = seg.lastIndexOf(" ");
    out.push({
      url: sp === -1 ? seg : seg.slice(0, sp),
      w: sp === -1 ? 0 : parseInt(seg.slice(sp + 1), 10) || 0,
    });
  }
  return out;
}

function pickLargestSrcset(srcset, srcFallback) {
  let best = null;
  for (const cand of srcsetUrls(srcset)) {
    if (!best || cand.w > best.w) best = cand;
  }
  if (best && best.url) return best.url;
  return srcFallback || null;
}

// Threads' `efg` is base64 but arrives without padding often enough that a bare
// atob() throws — which used to make looksLikeVideoCover() quietly answer "not a
// video" and let cover frames through as artwork.
function decodeEfg(url) {
  const efg = new URLSearchParams((url || "").split("?")[1] || "").get("efg");
  if (!efg) return null;
  const pad = (4 - (efg.length % 4)) % 4;
  return atob(efg + "=".repeat(pad));
}

function looksLikeVideoCover(url) {
  try {
    const tag = decodeEfg(url);
    return tag ? /video/i.test(tag) : false;
  } catch {
    return false;
  }
}

// The CDN resizes server-side via the `stp` param: `dst-jpg_e35_p320x320_tt6`
// is a 320px box, `dst-jpg_e35_tt6` is the untouched asset. The whole URL —
// `stp` included — is covered by the `oh` signature, so editing the token out
// returns "URL signature mismatch". A thumbnail URL cannot be repaired after the
// fact; the only fix is to pick the right URL while the page still offers it.
function resizeTokenOf(url) {
  const stp = new URLSearchParams((url || "").split("?")[1] || "").get("stp") || "";
  const m = /_[ps](\d+)x(\d+)/.exec(stp);
  return m ? { w: parseInt(m[1], 10), h: parseInt(m[2], 10) } : null;
}

// The CDN advertises the true source width inside `efg`, e.g.
// {"vencode_tag":"CAROUSEL_ITEM.xpids.2958.sdr.regular_photo.C3"} -> 2958.
// That lets us recognise "this is a 320px crop of a 2958px original" without a
// network round trip.
function sourceWidthFromUrl(url) {
  try {
    const tag = decodeEfg(url);
    if (!tag) return null;
    const m = /\.xpids\.(\d+)\./.exec(JSON.parse(tag).vencode_tag || "");
    return m ? parseInt(m[1], 10) : null;
  } catch {
    return null;
  }
}

// Rank two URLs for the SAME asset: untransformed beats any resize, and among
// resizes the larger box wins.
function betterUrl(a, b) {
  if (!a) return b || null;
  if (!b) return a;
  const ta = resizeTokenOf(a);
  const tb = resizeTokenOf(b);
  if (!ta) return a;
  if (!tb) return b;
  return ta.w * ta.h >= tb.w * tb.h ? a : b;
}

// A coarse "this is obviously a thumbnail" catch, deliberately well below the
// real print gate — @printfeed/print-geometry decides printability server-side,
// where the page format is known. Duplicating that maths here is what let the
// two drift apart in the first place.
const MIN_PRINT_LONG_EDGE_PX = 1200;

function printShortfall(width, height, url) {
  const token = resizeTokenOf(url);
  const source = sourceWidthFromUrl(url);
  // Only call it a downscale when the URL actually carries a resize token —
  // otherwise an asset the CDN simply never serves at full size looks broken.
  if (token && source && width && width < source * 0.9) {
    return `${width}x${height} - Threads only offered a ${token.w}px crop of a ${source}px original`;
  }
  if (width && height && Math.max(width, height) < MIN_PRINT_LONG_EDGE_PX) {
    return `${width}x${height} - too small to print`;
  }
  return null;
}

function extFromUrl(url) {
  const path = (url || "").split("?")[0];
  const dot = path.lastIndexOf(".");
  const ext = dot === -1 ? "" : path.slice(dot + 1).toLowerCase();
  return /^(jpg|jpeg|png|webp|gif)$/.test(ext) ? ext : "jpg";
}

function buildFilename(index, url) {
  return `${String(index).padStart(2, "0")}.${extFromUrl(url)}`;
}

function imageId(url) {
  const path = (url || "").split("?")[0];
  const seg = path.substring(path.lastIndexOf("/") + 1);
  return seg.replace(/\.[a-z0-9]+$/i, "");
}

function buildMetadata({ mode, handle, shortcode, postUrl, caption, images, collectedAt }) {
  return {
    source: "threads",
    collectedAt,
    mode,
    handle,
    postUrl,
    shortcode,
    caption: caption || "",
    imageCount: images.length,
    images: images.map((img, i) => ({
      index: i + 1,
      url: img.url,
      width: img.width || null,
      height: img.height || null,
      filename: img.filename,
    })),
  };
}

const TC = {
  parsePermalink,
  parsePage,
  srcsetUrls,
  pickLargestSrcset,
  looksLikeVideoCover,
  resizeTokenOf,
  sourceWidthFromUrl,
  betterUrl,
  printShortfall,
  MIN_PRINT_LONG_EDGE_PX,
  extFromUrl,
  buildFilename,
  imageId,
  buildMetadata,
};

if (typeof module !== "undefined" && module.exports) module.exports = TC;
if (typeof globalThis !== "undefined") globalThis.TC = TC;
