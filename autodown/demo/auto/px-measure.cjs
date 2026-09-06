// px-measure.cjs — PLAN-053 W2.7: fence header y positions per pane
// (edit vs view alignment readout) from an autoui_screenshot PNG.
// Usage: node px-measure.cjs <screenshot.png>
const { inflateSync } = require('zlib');
const fs = require('fs');

function decodePng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not png');
  let pos = 8, w = 0, h = 0, ct = 0; const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos), typ = buf.toString('ascii', pos + 4, pos + 8), body = buf.subarray(pos + 8, pos + 8 + len);
    if (typ === 'IHDR') { w = body.readUInt32BE(0); h = body.readUInt32BE(4); ct = body[9]; if (body[8] !== 8 || (ct !== 6 && ct !== 2) || body[12] !== 0) throw new Error('unsup') } else if (typ === 'IDAT') idat.push(body); pos += 12 + len;
  }
  const bpp = ct === 6 ? 4 : 3, stride = w * bpp, raw = inflateSync(Buffer.concat(idat)), out = Buffer.alloc(w * h * 3); let prev = Buffer.alloc(stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)]; const line = Buffer.from(raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)));
    for (let i = 0; i < stride; i++) { const a = i >= bpp ? line[i - bpp] : 0, b = prev[i], c = i >= bpp ? prev[i - bpp] : 0; let v = line[i];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1; else if (f === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c } else if (f !== 0) throw new Error('filt'); line[i] = v & 255 }
    for (let x = 0; x < w; x++) { const si = x * bpp, di = (y * w + x) * 3; out[di] = line[si]; out[di + 1] = line[si + 1]; out[di + 2] = line[si + 2] } prev = line;
  }
  return { w, h, rgb: out };
}

const img = decodePng(fs.readFileSync(process.argv[2]));
const { w, h, rgb } = img;
const at = (x, y) => [rgb[(y * w + x) * 3], rgb[(y * w + x) * 3 + 1], rgb[(y * w + x) * 3 + 2]];
const near = (c, t, tol) => Math.abs(c[0] - t[0]) <= tol && Math.abs(c[1] - t[1]) <= tol && Math.abs(c[2] - t[2]) <= tol;
const HEADER = [229, 231, 235];

function headerBands(x0, x1) {
  const rows = [];
  for (let y = 0; y < h; y++) {
    let cnt = 0, total = 0;
    for (let x = x0; x < x1; x += 4) { total++; if (near(at(x, y), HEADER, 10)) cnt++ }
    if (cnt > total * 0.55) rows.push(y);
  }
  const bands = [];
  for (const y of rows) { if (bands.length && y - bands[bands.length - 1][1] <= 3) bands[bands.length - 1][1] = y; else bands.push([y, y]) }
  return bands.filter(b => b[1] - b[0] >= 10);
}

const half = Math.floor(w / 2);
const L = headerBands(60, half - 60);
const R = headerBands(half + 60, w - 20);
const lc = L.map(b => +((b[0] + b[1]) / 2).toFixed(1));
const rc = R.map(b => +((b[0] + b[1]) / 2).toFixed(1));
console.log('left  fence headers:', JSON.stringify(lc));
console.log('right fence headers:', JSON.stringify(rc));
if (lc.length === rc.length) lc.forEach((v, i) => console.log(`fence${i + 1}: dy=${(rc[i] - v).toFixed(1)}px`));
else console.log('band count mismatch', lc.length, rc.length);
