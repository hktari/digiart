// Shows a single floating Collect button whose action depends on the page:
//   post detail  (/@h/post/sc)        -> "Collect post"  (all images in the main post)
//   image detail (/@h/post/sc/media)  -> "Collect image" (the image shown fullscreen)
// Relies on globalThis.TC (extract.js, loaded first by the manifest).

(() => {
  const TC = globalThis.TC;
  if (!TC) return;

  const CONTENT_HOST = /cdninstagram|fbcdn/;
  const ICON_URL = chrome.runtime.getURL("icons/mark.svg");
  const CAPTION_MAX = 600;

  function isContentImg(img) {
    const url = img.currentSrc || img.src || "";
    return (
      CONTENT_HOST.test(url) &&
      (img.naturalWidth > 200 || img.width > 200) &&
      !/profile/i.test(img.alt || "")
    );
  }

  function bestUrl(img) {
    return TC.pickLargestSrcset(img.getAttribute("srcset"), img.currentSrc || img.src);
  }

  // The main post = the one whose permalink matches the current shortcode. Several
  // anchors can link to it; each climbs to a different image-bearing ancestor, and
  // the loosest ones spill into replies. Pick the TIGHTEST root (fewest content
  // images) so we scope to the main post's own media, not the thread.
  function mainPostRoot(shortcode) {
    const anchors = document.querySelectorAll(`a[href*="/post/${shortcode}"]`);
    let bestRoot = null;
    let bestCount = Infinity;
    for (const a of anchors) {
      let el = a;
      for (let i = 0; i < 10 && el; i++) {
        if (el.querySelector) {
          const n = [...el.querySelectorAll("img")].filter(isContentImg).length;
          if (n) {
            if (n < bestCount) {
              bestCount = n;
              bestRoot = el;
            }
            break;
          }
        }
        el = el.parentElement;
      }
    }
    return bestRoot;
  }

  function collectImagesFromRoot(root) {
    const seen = new Set();
    const out = [];
    for (const img of root.querySelectorAll("img")) {
      if (!isContentImg(img)) continue;
      const url = bestUrl(img);
      if (!url || TC.looksLikeVideoCover(url)) continue;
      const id = TC.imageId(url);
      if (seen.has(id)) continue;
      seen.add(id);
      out.push({ url, width: img.naturalWidth, height: img.naturalHeight });
    }
    return out;
  }

  // On the fullscreen media page the shown image is the largest one on screen.
  function largestVisibleImage() {
    let best = null;
    let bestArea = 0;
    for (const img of document.querySelectorAll("img")) {
      if (!isContentImg(img)) continue;
      const r = img.getBoundingClientRect();
      const area = r.width * r.height;
      if (area > bestArea) {
        bestArea = area;
        best = img;
      }
    }
    return best;
  }

  // Best-effort caption, length-bounded so it can't swallow the comment thread.
  function captionFor(root) {
    let best = "";
    for (const el of root.querySelectorAll("span, div")) {
      const t = (el.innerText || "").trim();
      if (t.length > best.length && t.length <= CAPTION_MAX) best = t;
    }
    return best.trim();
  }

  function buildPayload(mode, page, caption, images, filenames) {
    const dir = `art-collect/${page.handle}__${page.shortcode}`;
    const metadata = TC.buildMetadata({
      mode,
      handle: page.handle,
      shortcode: page.shortcode,
      postUrl: page.postUrl,
      caption,
      collectedAt: new Date().toISOString(),
      images: images.map((img, i) => ({
        url: img.url,
        width: img.width,
        height: img.height,
        filename: filenames[i],
      })),
    });
    return {
      dir,
      metadata,
      metaFile: `${dir}/metadata.json`,
      files: images.map((img, i) => ({ url: img.url, filename: `${dir}/${filenames[i]}` })),
    };
  }

  function send(payload, note) {
    chrome.runtime.sendMessage({ type: "collect", payload });
    flash(note);
  }

  function collectPost(page) {
    const root = mainPostRoot(page.shortcode) || document.body;
    const images = collectImagesFromRoot(root);
    if (!images.length) return flash("No images found in this post");
    const filenames = images.map((img, i) => TC.buildFilename(i + 1, img.url));
    send(
      buildPayload("post", page, captionFor(root), images, filenames),
      `Collected ${images.length} image(s) from @${page.handle}`
    );
  }

  function collectImage(page) {
    const img = largestVisibleImage();
    const url = img && bestUrl(img);
    if (!url) return flash("No image found on this page");
    const idNum = (TC.imageId(url).match(/\d+/) || ["img"])[0];
    const filename = `single_${idNum}.${TC.extFromUrl(url)}`;
    const item = { url, width: img.naturalWidth, height: img.naturalHeight };
    const root = mainPostRoot(page.shortcode) || document.body;
    send(
      buildPayload("single", page, captionFor(root), [item], [filename]),
      `Collected 1 image from @${page.handle}`
    );
  }

  function flash(text) {
    let el = document.getElementById("tc-toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "tc-toast";
      document.body.appendChild(el);
    }
    el.textContent = text;
    el.classList.add("tc-toast-show");
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove("tc-toast-show"), 2500);
  }

  // Ensure exactly one floating button matching the current page type.
  function ensureFab(page) {
    const mode = page.type === "media" ? "image" : page.type === "post" ? "post" : null;
    let fab = document.getElementById("tc-fab");
    if (!mode) {
      if (fab) fab.remove();
      return;
    }
    if (!fab) {
      fab = document.createElement("button");
      fab.id = "tc-fab";
      const mark = document.createElement("span");
      mark.className = "tc-mark";
      mark.style.webkitMaskImage = `url(${ICON_URL})`;
      mark.style.maskImage = `url(${ICON_URL})`;
      const label = document.createElement("span");
      label.className = "tc-fab-label";
      fab.append(mark, label);
      document.body.appendChild(fab);
    }
    fab.className = `tc-fab tc-fab--${mode}`;
    fab.querySelector(".tc-fab-label").textContent =
      mode === "image" ? "Collect image" : "Collect post";
    fab.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (mode === "image") collectImage(page);
      else collectPost(page);
    };
  }

  function refresh() {
    ensureFab(TC.parsePage(location.pathname));
  }

  let t;
  const debounced = () => {
    clearTimeout(t);
    t = setTimeout(refresh, 300);
  };
  new MutationObserver(debounced).observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("popstate", debounced);
  setInterval(refresh, 1000); // backstop for SPA pushState navigations
  refresh();
})();
