#!/usr/bin/env node
// Generates icons/icon-192.png and icons/icon-512.png without any image library:
// draws the checklist motif from icons/icon.svg into an RGBA buffer and encodes
// a minimal PNG (8-bit RGBA, no interlace) using node's zlib. Run once; commit output.
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const iconsDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'icons');

const BG = [0x16, 0x21, 0x1a, 255];
const GREEN = [0x8f, 0xd1, 0x4f, 255];
const GREY = [0x9d, 0xb3, 0x9e, 255];

// Strokes in the 64×64 coordinate system of icon.svg: [x0, y0, x1, y1, color]
const STROKES = [
  [14, 20, 18, 24, GREEN], [18, 24, 25, 16, GREEN],
  [14, 40, 18, 44, GREEN], [18, 44, 25, 36, GREEN],
  [32, 22, 50, 22, GREY],
  [32, 42, 50, 42, GREY],
];
const STROKE_WIDTH = 4;

function distToSegment(px, py, x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const lenSq = dx * dx + dy * dy;
  const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, ((px - x0) * dx + (py - y0) * dy) / lenSq));
  return Math.hypot(px - (x0 + t * dx), py - (y0 + t * dy));
}

function render(size) {
  const scale = size / 64;
  const radius = (STROKE_WIDTH / 2) * scale;
  const buf = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const cx = x + 0.5;
      const cy = y + 0.5;
      let color = BG;
      for (const [x0, y0, x1, y1, c] of STROKES) {
        if (distToSegment(cx, cy, x0 * scale, y0 * scale, x1 * scale, y1 * scale) <= radius) {
          color = c;
          break;
        }
      }
      buf.set(color, (y * size + x) * 4);
    }
  }
  return buf;
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  // scanlines, each prefixed with filter byte 0
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

for (const size of [192, 512]) {
  const file = join(iconsDir, `icon-${size}.png`);
  writeFileSync(file, encodePng(size, render(size)));
  console.log(`✓ ${file}`);
}
