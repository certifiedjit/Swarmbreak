// Dev helper: render art to a PNG contact sheet for quick visual checks.
// usage: npx tsx scripts/sheet.ts <out.png>
import { PNG } from 'pngjs';
import { writeFileSync } from 'node:fs';
import type { Pix } from '../src/render/pixel';
import { previewSheet } from '../src/render/preview';

const out = process.argv[2] ?? 'sheet.png';
const { items, scale, bg } = previewSheet();
const pad = 4;
const cols = 12;
const rows: Pix[][] = [];
for (let i = 0; i < items.length; i += cols) rows.push(items.slice(i, i + cols));
const rowH = rows.map((r) => Math.max(...r.map((p) => p.h)) * scale + pad);
const W = Math.max(...rows.map((r) => r.reduce((a, p) => a + p.w * scale + pad, pad)));
const H = rowH.reduce((a, b) => a + b, pad);
const png = new PNG({ width: W, height: H });
for (let i = 0; i < W * H; i++) { png.data[i*4]=(bg>>16)&255; png.data[i*4+1]=(bg>>8)&255; png.data[i*4+2]=bg&255; png.data[i*4+3]=255; }
let y = pad;
rows.forEach((r, ri) => {
  let x = pad;
  for (const p of r) {
    for (let j = 0; j < p.h * scale; j++) for (let i = 0; i < p.w * scale; i++) {
      const s = (Math.floor(j / scale) * p.w + Math.floor(i / scale)) * 4;
      const a = p.data[s + 3] / 255; if (!a) continue;
      const d = ((y + j) * W + x + i) * 4;
      for (let k = 0; k < 3; k++) png.data[d + k] = png.data[d + k] * (1 - a) + p.data[s + k] * a;
    }
    x += p.w * scale + pad;
  }
  y += rowH[ri];
});
writeFileSync(out, PNG.sync.write(png));
console.log('wrote', out, W, H);
