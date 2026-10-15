// Renders PNG app icons from vector shapes (no font dependency). Run: npm run icons
import sharp from 'sharp';
import { writeFileSync } from 'node:fs';

const BG = '#635bdb';
// 4-point star centred on (256,256); `s` scales it (1 = 300px tall).
const star = (s) => {
  const r = 150 * s, i = 38 * s, c = 256;
  const p = [[0, -r], [i, -i], [r, 0], [i, i], [0, r], [-i, i], [-r, 0], [-i, -i]].map(([x, y]) => `${c + x},${c + y}`).join(' ');
  return `<polygon points="${p}" fill="#fff" stroke="#fff" stroke-width="${14 * s}" stroke-linejoin="round"/>`;
};
const svg = (inner) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${inner}</svg>`;

// "any": rounded tile, star fills most of it.
const anySvg = svg(`<rect width="512" height="512" rx="112" fill="${BG}"/>${star(1)}`);
// "maskable": full-bleed background, star inside the central 60% safe zone.
const maskSvg = svg(`<rect width="512" height="512" fill="${BG}"/>${star(0.78)}`);

writeFileSync('public/icon.svg', anySvg);

const jobs = [
  [anySvg, 192, 'pwa-192.png'],
  [anySvg, 512, 'pwa-512.png'],
  [maskSvg, 512, 'pwa-maskable-512.png'],
  [maskSvg, 180, 'apple-touch-icon.png'], // iOS applies its own rounding; full-bleed is correct
];
for (const [src, size, name] of jobs) {
  await sharp(Buffer.from(src)).resize(size, size).png().toFile(`public/${name}`);
  console.log('wrote public/' + name);
}
