// Split a tall full-page screenshot into readable segments: node scripts/qa/split.mjs <png> [segments]
import sharp from 'sharp';
const [file, n = '6'] = process.argv.slice(2);
const img = sharp(file);
const { width, height } = await img.metadata();
const parts = Number(n);
const h = Math.ceil(height / parts);
for (let i = 0; i < parts; i++) {
  const top = i * h;
  const ht = Math.min(h, height - top);
  if (ht <= 0) break;
  await sharp(file).extract({ left: 0, top, width, height: ht }).resize({ width: Math.min(width, 600) }).toFile(file.replace(/\.png$/, `.part${i + 1}.png`));
}
console.log(width, height, 'segment height', h);
