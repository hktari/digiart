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
