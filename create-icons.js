/**
 * Generates minimal PNG icons for the extension using pure Node.js Buffer.
 * No external dependencies required — creates valid 1x1 purple PNG placeholders
 * that can be replaced with real icons later.
 *
 * Run: node create-icons.js
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function createPNG(size, r, g, b) {
  // PNG header
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function chunk(type, data) {
    const typeBytes = Buffer.from(type, 'ascii');
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const crcBuf = Buffer.concat([typeBytes, data]);
    const crc = crc32(crcBuf);
    const crcBytes = Buffer.alloc(4);
    crcBytes.writeInt32BE(crc);
    return Buffer.concat([len, typeBytes, data, crcBytes]);
  }

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 2;   // color type: RGB
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  // Image data: each row is filter byte (0) + RGB pixels
  const rowSize = 1 + size * 3;
  const raw = Buffer.alloc(size * rowSize);
  for (let y = 0; y < size; y++) {
    raw[y * rowSize] = 0; // filter type None
    for (let x = 0; x < size; x++) {
      const off = y * rowSize + 1 + x * 3;
      raw[off] = r; raw[off + 1] = g; raw[off + 2] = b;
    }
  }

  const compressed = zlib.deflateSync(raw);
  const idat = chunk('IDAT', compressed);
  const iend = chunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, chunk('IHDR', ihdr), idat, iend]);
}

// Minimal CRC32
function crc32(buf) {
  let crc = -1;
  for (const byte of buf) {
    let c = (crc ^ byte) & 0xff;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ -1) | 0;
}

const iconDir = path.join(__dirname, 'extension', 'icons');
const sizes = [16, 48, 128];
// Purple: #7c3aed = rgb(124, 58, 237)
sizes.forEach(s => {
  const png = createPNG(s, 124, 58, 237);
  const fp = path.join(iconDir, `icon${s}.png`);
  fs.writeFileSync(fp, png);
  console.log(`Created: ${fp}`);
});

console.log('Icons generated. Replace with proper icons when available.');
