// Service worker: receives collect payloads and writes files via chrome.downloads.
// Downloads hit signed CDN URLs directly (no fetch => no CORS), so they must run
// immediately while the URL signature is still valid.

chrome.runtime.onMessage.addListener((msg) => {
  if (!msg || msg.type !== "collect" || !msg.payload) return;
  const { files, metadata, metaFile, ingest, token, endpoint } = msg.payload;

  // Local download bundle (fallback / offline inspection).
  for (const f of files || []) {
    chrome.downloads
      .download({ url: f.url, filename: f.filename, saveAs: false, conflictAction: "overwrite" })
      .catch((e) => console.warn("[tc] image download failed", f.filename, e));
  }

  try {
    const json = JSON.stringify(metadata, null, 2);
    const dataUrl = "data:application/json;base64," + btoa(unescape(encodeURIComponent(json)));
    chrome.downloads
      .download({ url: dataUrl, filename: metaFile, saveAs: false, conflictAction: "overwrite" })
      .catch((e) => console.warn("[tc] metadata download failed", e));
  } catch (e) {
    console.warn("[tc] metadata build failed", e);
  }

  // Server ingest: push into the PrintFeed collect funnel (hosted collection +
  // two prospects). host_permissions grants cross-origin fetch from the worker.
  if (endpoint && token && ingest) {
    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, ...ingest }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((res) => console.log("[tc] ingested", res))
      .catch((e) => console.warn("[tc] ingest failed", e));
  }
});
