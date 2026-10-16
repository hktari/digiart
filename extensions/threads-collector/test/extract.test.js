const test = require("node:test");
const assert = require("node:assert");
const TC = require("../src/extract.js");

const VIDEO_URL =
  "https://scontent.cdninstagram.com/v/t51.71878-15/736142119_x_n.jpg" +
  "?efg=eyJ2ZW5jb2RlX3RhZyI6IkNBUk9VU0VMX0lURU0ueHBpZHMuNjQwLnNkci52aWRlb19kZWZhdWx0X2NvdmVyX2ZyYW1lLkMzIn0%3D&oe=6A51669B";
const PHOTO_URL =
  "https://scontent.cdninstagram.com/v/t51.82787-15/735128813_x_n.jpg" +
  "?efg=eyJ2ZW5jb2RlX3RhZyI6IkNBUk9VU0VMX0lURU0ueHBpZHMuMzI4MC5zZHIucmVndWxhcl9waG90by5DMyJ9&oe=6A516DCB";

test("parsePermalink extracts handle + shortcode from a post path", () => {
  const r = TC.parsePermalink("/@ryleelarae/post/DabUWTAkv7M");
  assert.deepEqual(r, {
    handle: "ryleelarae",
    shortcode: "DabUWTAkv7M",
    postUrl: "https://www.threads.com/@ryleelarae/post/DabUWTAkv7M",
  });
});

test("parsePermalink tolerates trailing segments/query", () => {
  const r = TC.parsePermalink("/@ryleelarae/post/DabUWTAkv7M/media?x=1");
  assert.equal(r.shortcode, "DabUWTAkv7M");
});

test("parsePermalink returns null for non-post paths", () => {
  assert.equal(TC.parsePermalink("/"), null);
  assert.equal(TC.parsePermalink("/search"), null);
  assert.equal(TC.parsePermalink("/@ryleelarae"), null);
});

test("parsePage classifies post vs media vs other", () => {
  const post = TC.parsePage("/@ryleelarae/post/DabUWTAkv7M");
  assert.equal(post.type, "post");
  assert.equal(post.shortcode, "DabUWTAkv7M");

  const media = TC.parsePage("/@ryleelarae/post/DabUWTAkv7M/media");
  assert.equal(media.type, "media");
  assert.equal(media.shortcode, "DabUWTAkv7M");
  assert.equal(media.handle, "ryleelarae");

  assert.equal(TC.parsePage("/").type, null);
  assert.equal(TC.parsePage("/@ryleelarae").type, null);
});

test("pickLargestSrcset returns the highest-width candidate", () => {
  const srcset = "https://cdn/a.jpg 245w, https://cdn/b.jpg 640w, https://cdn/c.jpg 3280w";
  assert.equal(TC.pickLargestSrcset(srcset, "https://cdn/fallback.jpg"), "https://cdn/c.jpg");
});

test("pickLargestSrcset falls back to src when srcset empty", () => {
  assert.equal(TC.pickLargestSrcset("", "https://cdn/fallback.jpg"), "https://cdn/fallback.jpg");
  assert.equal(TC.pickLargestSrcset(null, "https://cdn/fallback.jpg"), "https://cdn/fallback.jpg");
});

test("looksLikeVideoCover detects video cover frames via efg tag", () => {
  assert.equal(TC.looksLikeVideoCover(VIDEO_URL), true);
  assert.equal(TC.looksLikeVideoCover(PHOTO_URL), false);
  assert.equal(TC.looksLikeVideoCover("https://cdn/x.jpg"), false);
});

// Real URLs from the collect that produced a 14-page book. Same asset id, two
// variants: the fullscreen img and the carousel thumbnail beside it.
const FULL_URL =
  "https://scontent-bru2-1.cdninstagram.com/v/t51.82787-15/755422329_17977169313118422_8729933730871860257_n.jpg" +
  "?stp=dst-jpg_e35_tt6&efg=eyJ2ZW5jb2RlX3RhZyI6IkNBUk9VU0VMX0lURU0ueHBpZHMuMjk1OC5zZHIucmVndWxhcl9waG90by5DMyJ9";
const THUMB_URL =
  "https://scontent-bru2-1.cdninstagram.com/v/t51.82787-15/755422329_17977169313118422_8729933730871860257_n.jpg" +
  "?stp=dst-jpg_e35_p320x320_tt6&efg=eyJ2ZW5jb2RlX3RhZyI6IkNBUk9VU0VMX0lURU0ueHBpZHMuMjk1OC5zZHIucmVndWxhcl9waG90by5DMyJ9";
const SQUARE_THUMB_URL =
  "https://scontent-bru2-1.cdninstagram.com/v/t51.82787-15/763262817_17961691218159072_2670769876789355654_n.jpg" +
  "?stp=dst-jpg_e35_s480x480_tt6&efg=eyJ2ZW5jb2RlX3RhZyI6IkNBUk9VU0VMX0lURU0ueHBpZHMuMjA0OC5zZHIucmVndWxhcl9waG90by5DMyJ9";

test("resizeTokenOf reads the CDN's server-side resize box", () => {
  assert.deepEqual(TC.resizeTokenOf(THUMB_URL), { w: 320, h: 320 });
  assert.deepEqual(TC.resizeTokenOf(SQUARE_THUMB_URL), { w: 480, h: 480 });
  assert.equal(TC.resizeTokenOf(FULL_URL), null);
});

test("sourceWidthFromUrl recovers the true source width from the efg tag", () => {
  // Both variants describe the same 2958px original.
  assert.equal(TC.sourceWidthFromUrl(FULL_URL), 2958);
  assert.equal(TC.sourceWidthFromUrl(THUMB_URL), 2958);
  assert.equal(TC.sourceWidthFromUrl(SQUARE_THUMB_URL), 2048);
  assert.equal(TC.sourceWidthFromUrl("https://cdn/a.jpg"), null);
});

test("betterUrl prefers the untransformed variant over any resize", () => {
  assert.equal(TC.betterUrl(THUMB_URL, FULL_URL), FULL_URL);
  assert.equal(TC.betterUrl(FULL_URL, THUMB_URL), FULL_URL);
  assert.equal(TC.betterUrl(null, THUMB_URL), THUMB_URL);
  assert.equal(TC.betterUrl(THUMB_URL, null), THUMB_URL);
});

test("betterUrl takes the larger box when both are resized", () => {
  assert.equal(TC.betterUrl(THUMB_URL, SQUARE_THUMB_URL), SQUARE_THUMB_URL);
});

test("both variants of one asset share an imageId, so they can be grouped", () => {
  assert.equal(TC.imageId(THUMB_URL), TC.imageId(FULL_URL));
});

test("printShortfall rejects a thumbnail crop of a large original", () => {
  // Exactly the case that reached the PDF: 320x443 of a 2958px source.
  const msg = TC.printShortfall(320, 443, THUMB_URL);
  assert.match(msg, /320px crop of a 2958px original/);
});

test("printShortfall accepts the full-size variant of the same asset", () => {
  assert.equal(TC.printShortfall(2958, 4096, FULL_URL), null);
});

test("printShortfall accepts a modest original the print gate should judge", () => {
  // 1440x1803 grades MARGINAL at 210x210. That call belongs to
  // print-geometry, not to the extension, so it must pass through here.
  const url = "https://cdn/a.jpg?stp=dst-jpg_e35_tt6";
  assert.equal(TC.printShortfall(1440, 1803, url), null);
});

test("printShortfall rejects a small original even with no resize token", () => {
  const msg = TC.printShortfall(480, 480, "https://cdn/a.jpg?stp=dst-jpg_e35_tt6");
  assert.match(msg, /too small to print/);
});

test("looksLikeVideoCover survives unpadded base64", () => {
  // atob() throws on a length that is not a multiple of 4; the old bare call
  // fell into the catch and answered "not a video".
  const tag = Buffer.from('{"vencode_tag":"CAROUSEL_ITEM.video_default_cover_frame"}')
    .toString("base64")
    .replace(/=+$/, "");
  assert.equal(TC.looksLikeVideoCover(`https://cdn/a.jpg?efg=${tag}`), true);
});

test("srcsetUrls returns every candidate", () => {
  const urls = TC.srcsetUrls("https://cdn/a.jpg 320w, https://cdn/b.jpg 1080w");
  assert.deepEqual(urls.map((u) => u.url), ["https://cdn/a.jpg", "https://cdn/b.jpg"]);
});

test("extFromUrl reads a safe image extension", () => {
  assert.equal(TC.extFromUrl("https://cdn/a_n.webp?x=1"), "webp");
  assert.equal(TC.extFromUrl("https://cdn/a_n.jpg?x=1"), "jpg");
  assert.equal(TC.extFromUrl("https://cdn/weird?x=1"), "jpg");
});

test("buildFilename zero-pads and uses the url extension", () => {
  assert.equal(TC.buildFilename(1, "https://cdn/a_n.jpg?x"), "01.jpg");
  assert.equal(TC.buildFilename(12, "https://cdn/a_n.webp?x"), "12.webp");
});

test("imageId returns the filename stem for dedup", () => {
  assert.equal(
    TC.imageId("https://cdn/v/t51/735128813_18600781354061813_x_n.jpg?a=1"),
    "735128813_18600781354061813_x_n"
  );
});

test("buildMetadata assembles the outreach payload", () => {
  const meta = TC.buildMetadata({
    mode: "post",
    handle: "ryleelarae",
    shortcode: "DabUWTAkv7M",
    postUrl: "https://www.threads.com/@ryleelarae/post/DabUWTAkv7M",
    caption: "hello",
    collectedAt: "2026-07-06T00:00:00.000Z",
    images: [{ url: "https://cdn/a.jpg", width: 3280, height: 2000, filename: "01.jpg" }],
  });
  assert.equal(meta.source, "threads");
  assert.equal(meta.mode, "post");
  assert.equal(meta.imageCount, 1);
  assert.deepEqual(meta.images[0], {
    index: 1,
    url: "https://cdn/a.jpg",
    width: 3280,
    height: 2000,
    filename: "01.jpg",
  });
});
