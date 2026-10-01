/** Renders PWA icons from scripts/icon.svg (run: npm run icons). */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";

const root = resolve(import.meta.dirname, "..");
const svg = readFileSync(resolve(root, "scripts/icon.svg"), "utf8");

// Full-bleed square background (maskable + Apple icons get their own corner masks).
const fullBleed = svg.replace('rx="112" ', "");
// Maskable: shrink the glyph into the 80% safe zone.
const maskable = fullBleed.replace(
  '<g fill="#c6f25e">',
  '<g fill="#c6f25e" transform="translate(64 64) scale(0.75)">',
);

const out = resolve(root, "public/icons");
mkdirSync(out, { recursive: true });

const render = (source: string, size: number, file: string) =>
  sharp(Buffer.from(source)).resize(size, size).png().toFile(file);

await Promise.all([
  render(svg, 192, resolve(out, "icon-192.png")),
  render(svg, 512, resolve(out, "icon-512.png")),
  render(maskable, 512, resolve(out, "maskable-512.png")),
  render(fullBleed, 180, resolve(root, "src/app/apple-icon.png")),
]);
writeFileSync(resolve(root, "src/app/icon.svg"), svg);
console.log("Icons generated.");
