// Builds every logo asset from the Host Grotesk ExtraBold outlines (so nothing depends on a webfont).
// Run: npm run logo   →  public/logo.svg, public/icon.svg, public/*.png, src/logo-paths.ts
import opentype from 'opentype.js';
import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'node:fs';

const INK = '#16191f';
const PAPER = '#fcfcfd';
const RED = '#074ce0'; // accent blue

const buf = readFileSync('node_modules/@fontsource/host-grotesk/files/host-grotesk-latin-800-normal.woff');
const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
const upm = font.unitsPerEm;

/** Lay out `text` as glyph paths with optional tracking (em). Returns one path per glyph. */
function layout(text, size, tracking, x0 = 0, y0 = 0) {
  const glyphs = font.stringToGlyphs(text);
  const scale = size / upm;
  let x = x0;
  const out = [];
  glyphs.forEach((g, i) => {
    out.push({ ch: text[i], path: g.getPath(x, y0, size) });
    const kern = i < glyphs.length - 1 ? font.getKerningValue(g, glyphs[i + 1]) * scale : 0;
    x += g.advanceWidth * scale + kern + tracking * size;
  });
  return out;
}

// (Path.extend in opentype.js v2 corrupts coordinates, so join path data as strings instead.)
// Own serializer: toPathData in opentype.js 2.0 emits NaN for some glyphs.
const n = (v) => { if (!Number.isFinite(v)) throw new Error('non-finite coordinate'); return +v.toFixed(2); };
const pathData = (p) => p.commands.map((c) => {
  switch (c.type) {
    case 'M': case 'L': return c.type + n(c.x) + ' ' + n(c.y);
    case 'C': return 'C' + [c.x1, c.y1, c.x2, c.y2, c.x, c.y].map(n).join(' ');
    case 'Q': return 'Q' + [c.x1, c.y1, c.x, c.y].map(n).join(' ');
    case 'Z': return 'Z';
    default: throw new Error('unexpected command ' + c.type);
  }
}).join('');
const join = (paths) => paths.map(pathData).join('');
const bbox = (paths) => {
  const bs = paths.map((p) => p.getBoundingBox());
  return { x1: Math.min(...bs.map((b) => b.x1)), y1: Math.min(...bs.map((b) => b.y1)), x2: Math.max(...bs.map((b) => b.x2)), y2: Math.max(...bs.map((b) => b.y2)) };
};
// ---------- wordmark: "TeacherNotes" (ink) + "." (red) ----------
const SIZE = 200;
const parts = layout('TeacherNotes.', SIZE, -0.03);
const inkParts = parts.slice(0, -1).map((p) => p.path);
const dotPart = parts[parts.length - 1].path;
const all = bbox([...inkParts, dotPart]);
const PAD = 6;
const wmW = Math.ceil(all.x2 - all.x1 + PAD * 2);
const wmH = Math.ceil(all.y2 - all.y1 + PAD * 2);
const ox = PAD - all.x1, oy = PAD - all.y1;
const placed = layout('TeacherNotes.', SIZE, -0.03, ox, oy);
const wmInk = join(placed.slice(0, -1).map((p) => p.path));
const wmDot = pathData(placed[placed.length - 1].path);
if (/NaN/.test(wmInk + wmDot)) throw new Error('NaN in wordmark path');
const wordmarkSvg = (ink, dot) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${wmW} ${wmH}" role="img" aria-label="TeacherNotes"><path fill="${ink}" d="${wmInk}"/><path fill="${dot}" d="${wmDot}"/></svg>`;
writeFileSync('public/logo.svg', wordmarkSvg(INK, RED));

// ---------- monogram: "T" + red full stop, centred on a paper tile ----------
function markSvg({ frame, glyphSize }) {
  const g = layout('T.', glyphSize, -0.02);
  const b = bbox(g.map((x) => x.path));
  const placedG = layout('T.', glyphSize, -0.02, 256 - (b.x1 + b.x2) / 2, 256 - (b.y1 + b.y2) / 2);
  const gInk = pathData(placedG[0].path);
  const gDot = pathData(placedG[1].path);
  const border = frame ? `<rect x="30" y="30" width="452" height="452" fill="none" stroke="${PAPER}" stroke-opacity=".35" stroke-width="6"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="${RED}"/>${border}<path fill="${PAPER}" d="${gInk}"/><path fill="${PAPER}" d="${gDot}"/></svg>`;
}
const markAny = markSvg({ frame: false, glyphSize: 330 });       // favicon, "any" icons
const markMask = markSvg({ frame: false, glyphSize: 250 });     // maskable: keep inside the 80% safe zone
writeFileSync('public/icon.svg', markAny);

const jobs = [
  [markAny, 192, 'pwa-192.png'],
  [markAny, 512, 'pwa-512.png'],
  [markMask, 512, 'pwa-maskable-512.png'],
  [markMask, 180, 'apple-touch-icon.png'],
];
for (const [svg, size, name] of jobs) {
  await sharp(Buffer.from(svg), { density: 300 }).resize(size, size).png().toFile('public/' + name);
  console.log('wrote public/' + name);
}
// 32px favicon for browsers/tabs that ignore SVG icons
await sharp(Buffer.from(markAny), { density: 300 }).resize(48, 48).png().toFile('public/favicon-48.png');

// ---------- inline paths for the app (no extra request, recolourable via CSS) ----------
const mk = (frame, glyphSize) => {
  const g = layout('T.', glyphSize, -0.02);
  const b = bbox(g.map((x) => x.path));
  const pg = layout('T.', glyphSize, -0.02, 256 - (b.x1 + b.x2) / 2, 256 - (b.y1 + b.y2) / 2);
  return { ink: pathData(pg[0].path), dot: pathData(pg[1].path) };
};
const mono = mk(false, 330);
writeFileSync(
  'src/logo-paths.ts',
  `// Generated by scripts/make-logo.mjs — do not edit by hand.
export const WORDMARK = { viewBox: '0 0 ${wmW} ${wmH}', width: ${wmW}, height: ${wmH}, ink: '${wmInk}', dot: '${wmDot}' };
export const MONOGRAM = { viewBox: '0 0 512 512', ink: '${mono.ink}', dot: '${mono.dot}' };
`
);
console.log(`wordmark ${wmW}x${wmH}`);

// ---------- social preview (1200x630), used for og:image ----------
{
  const scale = 1.02;
  const w = wmW * scale, h = wmH * scale;
  const x = (1200 - w) / 2, y = (630 - h) / 2 - 6;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<rect width="1200" height="630" fill="${PAPER}"/>
<g transform="translate(${x} ${y}) scale(${scale})"><path fill="${INK}" d="${wmInk}"/><path fill="${RED}" d="${wmDot}"/></g>
</svg>`;
  await sharp(Buffer.from(svg), { density: 96 }).png().toFile('public/og.png');
  console.log('wrote public/og.png');
}
