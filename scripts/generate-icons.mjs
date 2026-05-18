// scripts/generate-icons.mjs
// Run: node scripts/generate-icons.mjs
// Requires: sharp (npm install --save-dev sharp)

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INPUT = path.resolve(__dirname, '../public/quotation-logo.png');
const OUT_DIR = path.resolve(__dirname, '../public/icons');
const SCREENSHOTS_DIR = path.resolve(__dirname, '../public/screenshots');

// Create output directories
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const BG_COLOR = { r: 255, g: 255, b: 255, alpha: 1 };

async function generateIcons() {
  console.log('Generating icons from:', INPUT);

  // Standard icons (any purpose)
  for (const size of sizes) {
    const outPath = path.join(OUT_DIR, `icon-${size}x${size}.png`);
    await sharp(INPUT)
      .resize(size, size, { fit: 'contain', background: BG_COLOR })
      .png()
      .toFile(outPath);
    console.log(`  ✓ icon-${size}x${size}.png`);
  }

  // Maskable icons — 20% safe-zone padding
  for (const size of [192, 512]) {
    const padding = Math.floor(size * 0.2);
    const innerSize = size - padding * 2;
    const outPath = path.join(OUT_DIR, `icon-maskable-${size}x${size}.png`);
    await sharp(INPUT)
      .resize(innerSize, innerSize, { fit: 'contain', background: BG_COLOR })
      .extend({
        top: padding,
        bottom: padding,
        left: padding,
        right: padding,
        background: BG_COLOR,
      })
      .png()
      .toFile(outPath);
    console.log(`  ✓ icon-maskable-${size}x${size}.png`);
  }

  // Screenshots — desktop 1280x720
  const desktopPath = path.join(SCREENSHOTS_DIR, 'desktop.png');
  await sharp(INPUT)
    .resize(1280, 720, { fit: 'contain', background: BG_COLOR })
    .png()
    .toFile(desktopPath);
  console.log('  ✓ screenshots/desktop.png');

  // Screenshots — mobile 390x844
  const mobilePath = path.join(SCREENSHOTS_DIR, 'mobile.png');
  await sharp(INPUT)
    .resize(390, 844, { fit: 'contain', background: BG_COLOR })
    .png()
    .toFile(mobilePath);
  console.log('  ✓ screenshots/mobile.png');

  console.log('\nAll icons generated successfully!');
}

generateIcons().catch((err) => {
  console.error('Icon generation failed:', err);
  process.exit(1);
});
