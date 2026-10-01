/**
 * Renders every app icon from the brand logo (run: npm run icons).
 * Source: assets/brand/logo-source.webp — the official M&K logo (dark rounded square, 1254 px).
 */
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";

const root = resolve(import.meta.dirname, "..");
const SOURCE = resolve(root, "assets/brand/logo-source.webp");

/** Logo content regions in source pixels. */
const FULL = { left: 120, top: 360, width: 1015, height: 575 }; // M&K + barbell + GYM TRACKER + heart
const MARK = { left: 185, top: 360, width: 885, height: 380 }; // M&K + inner plates (favicon)

type Box = typeof FULL;

/**
 * Square icon: the content crop scaled to `contentRatio` × size, then grown to the full square by
 * repeating its own edge pixels — the background always matches the crop, so there is no seam.
 */
async function icon(opts: {
  size: number;
  box: Box;
  contentRatio: number;
  rounded: boolean;
  file: string;
}): Promise<void> {
  const { size, box, contentRatio, rounded, file } = opts;
  const width = Math.round(size * contentRatio);
  const height = Math.round((box.height / box.width) * width);
  const left = Math.floor((size - width) / 2);
  const top = Math.floor((size - height) / 2);

  const square = await sharp(SOURCE)
    .extract(box)
    .removeAlpha()
    .resize(width, height)
    .extend({
      left,
      right: size - width - left,
      top,
      bottom: size - height - top,
      extendWith: "copy",
    })
    .png()
    .toBuffer();

  let img = sharp(square).ensureAlpha();
  if (rounded) {
    const r = Math.round(size * 0.22);
    const mask = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${r}" fill="#fff"/></svg>`;
    img = sharp(
      await img
        .composite([{ input: Buffer.from(mask), blend: "dest-in" }])
        .png()
        .toBuffer(),
    );
  }
  await img.png({ compressionLevel: 9 }).toFile(file);
}

const out = resolve(root, "public/icons");
const brand = resolve(root, "public/brand");
mkdirSync(out, { recursive: true });
mkdirSync(brand, { recursive: true });

await Promise.all([
  // Android / install "any" icons: rounded square, like the source logo.
  icon({
    size: 192,
    box: FULL,
    contentRatio: 0.84,
    rounded: true,
    file: resolve(out, "icon-192.png"),
  }),
  icon({
    size: 512,
    box: FULL,
    contentRatio: 0.84,
    rounded: true,
    file: resolve(out, "icon-512.png"),
  }),
  // Maskable: full bleed, content inside the 80 % safe circle (diagonal ≤ 0.8 × size).
  icon({
    size: 512,
    box: FULL,
    contentRatio: 0.68,
    rounded: false,
    file: resolve(out, "maskable-512.png"),
  }),
  // iOS home screen: full bleed (iOS applies its own corner mask).
  icon({
    size: 180,
    box: FULL,
    contentRatio: 0.8,
    rounded: false,
    file: resolve(root, "src/app/apple-icon.png"),
  }),
  // Browser tab favicon: the mark only — "GYM TRACKER" is unreadable at 16–32 px.
  icon({
    size: 64,
    box: MARK,
    contentRatio: 0.94,
    rounded: true,
    file: resolve(root, "src/app/icon.png"),
  }),
  // Login screen logo (rendered at 160 CSS px → 2× / 3× density).
  sharp(SOURCE).resize(480, 480).webp({ quality: 88 }).toFile(resolve(brand, "logo.webp")),
]);
console.log("Icons generated.");
