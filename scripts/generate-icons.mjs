// scripts/generate-icons.mjs
// Run: node scripts/generate-icons.mjs
// Requires: sharp (npm install --save-dev sharp)

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INPUT = path.resolve(__dirname, '../public/Zyxen-logo.jpeg');
const OUT_DIR = path.resolve(__dirname, '../public/icons');
const SCREENSHOTS_DIR = path.resolve(__dirname, '../public/screenshots');

// Create output directories
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

async function generateIcons() {
  console.log('Generating icons from:', INPUT);

  // Standard icons (any purpose)
  for (const size of sizes) {
    const outPath = path.join(OUT_DIR, `icon-${size}x${size}.jpeg`);
    await sharp(INPUT)
      .resize(size, size, { fit: 'cover' })
      .jpeg({ quality: 100 })
      .toFile(outPath);
    console.log(`  ✓ icon-${size}x${size}.jpeg`);
  }

  // Maskable icons (no padding, just perfectly fit to square)
  for (const size of [192, 512]) {
    const outPath = path.join(OUT_DIR, `icon-maskable-${size}x${size}.jpeg`);
    await sharp(INPUT)
      .resize(size, size, { fit: 'cover' })
      .jpeg({ quality: 100 })
      .toFile(outPath);
    console.log(`  ✓ icon-maskable-${size}x${size}.jpeg`);
  }

  // Screenshots — desktop 1280x720 (cover to fill without white bars)
  const desktopPath = path.join(SCREENSHOTS_DIR, 'desktop.jpeg');
  await sharp(INPUT)
    .resize(1280, 720, { fit: 'cover' })
    .jpeg({ quality: 100 })
    .toFile(desktopPath);
  console.log('  ✓ screenshots/desktop.jpeg');

  // Screenshots — mobile 390x844 (cover to fill without white bars)
  const mobilePath = path.join(SCREENSHOTS_DIR, 'mobile.jpeg');
  await sharp(INPUT)
    .resize(390, 844, { fit: 'cover' })
    .jpeg({ quality: 100 })
    .toFile(mobilePath);
  console.log('  ✓ screenshots/mobile.jpeg');

  console.log('\nAll icons generated successfully!');
}

generateIcons().catch((err) => {
  console.error('Icon generation failed:', err);
  process.exit(1);
});
