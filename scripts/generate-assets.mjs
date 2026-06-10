// Generates all app icon / splash / favicon PNGs from the master Kagu logo
// raster (assets/images/Kagu logo enhanced.png — the ribbon-fold bird on a
// black field). Run with: node ./scripts/generate-assets.mjs
//
// The mark is designed for a black background (its white/gray facets only read
// on dark), so the icon and splash both keep a black field. Where transparency
// is required (android foreground/monochrome) we cut the bird out of the black
// background via a luminance threshold.
import { fileURLToPath } from "node:url";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const IMAGES = path.join(ROOT, "assets", "images");
const SRC = path.join(IMAGES, "Kagu logo enhanced.png");
const BLACK = "#000000";
const THRESHOLD = 35; // luminance cutoff separating the bird from the field

// 1-channel alpha mask (255 where the bird is, 0 on the black field).
async function birdAlpha(n) {
  return sharp(SRC).resize(n, n).grayscale().threshold(THRESHOLD).extractChannel(0).raw().toBuffer();
}

// The bird in full color (white + grays) on a transparent field, size n.
async function birdCutout(n) {
  const alpha = await birdAlpha(n);
  return sharp(SRC)
    .resize(n, n)
    .joinChannel(alpha, { raw: { width: n, height: n, channels: 1 } })
    .png()
    .toBuffer();
}

// A solid-white silhouette of the bird on transparent (for Android themed icon).
async function birdSilhouette(n) {
  const alpha = await birdAlpha(n);
  return sharp({ create: { width: n, height: n, channels: 3, background: "#ffffff" } })
    .joinChannel(alpha, { raw: { width: n, height: n, channels: 1 } })
    .png()
    .toBuffer();
}

// Center a smaller PNG buffer on a transparent square canvas of `size`.
function centerOnTransparent(buffer, size) {
  return sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: buffer, gravity: "center" }])
    .png()
    .toBuffer();
}

async function write(file, buffer) {
  const out = path.join(IMAGES, file);
  await sharp(buffer).toFile(out);
  const meta = await sharp(out).metadata();
  console.log(`wrote ${file} (${meta.width}x${meta.height})`);
}

async function main() {
  // App icon + favicon: the mark full-bleed on its black field.
  await write("icon.png", await sharp(SRC).resize(1024, 1024).flatten({ background: BLACK }).png().toBuffer());
  await write("favicon.png", await sharp(SRC).resize(48, 48).flatten({ background: BLACK }).png().toBuffer());

  // Splash (light + dark both use a black field — see app.json): bird cut out
  // onto transparent so it composites cleanly over the black splash color.
  const splash = await centerOnTransparent(await birdCutout(820), 1024);
  await write("splash-icon.png", splash);
  await write("splash-icon-dark.png", splash);

  // Android adaptive foreground: bird in the inner safe zone (~60%) on
  // transparent; adaptiveIcon.backgroundColor (#000000) supplies the field.
  await write("android-icon-foreground.png", await centerOnTransparent(await birdCutout(640), 1024));

  // Android themed (monochrome) icon: white silhouette on transparent.
  await write("android-icon-monochrome.png", await centerOnTransparent(await birdSilhouette(640), 1024));

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
