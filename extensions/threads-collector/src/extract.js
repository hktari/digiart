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

function pickLargestSrcset(srcset, srcFallback) {
  let best = null;
  if (srcset) {
    for (const part of srcset.split(",")) {
      const seg = part.trim();
      if (!seg) continue;
      const sp = seg.lastIndexOf(" ");
      const url = sp === -1 ? seg : seg.slice(0, sp);
      const w = sp === -1 ? 0 : parseInt(seg.slice(sp + 1), 10) || 0;
      if (!best || w > best.w) best = { url, w };
    }
  }
  if (best && best.url) return best.url;
  return srcFallback || null;
}

function looksLikeVideoCover(url) {
  try {
    const q = (url || "").split("?")[1] || "";
    const efg = new URLSearchParams(q).get("efg");
    if (!efg) return false;
    return /video/i.test(atob(efg));
  } catch {
    return false;
  }
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
  pickLargestSrcset,
  looksLikeVideoCover,
  extFromUrl,
  buildFilename,
  imageId,
  buildMetadata,
};

if (typeof module !== "undefined" && module.exports) module.exports = TC;
if (typeof globalThis !== "undefined") globalThis.TC = TC;
