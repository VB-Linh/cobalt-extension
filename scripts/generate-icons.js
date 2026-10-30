// scripts/generate-icons.js
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const outputDir = path.resolve(rootDir, 'assets/icons');

/**
 * Tạo buffer ảnh PNG RGBA chuẩn không cần phụ thuộc bên ngoài
 * @param {number} size - Chiều rộng và cao (pixel)
 * @returns {Buffer} Buffer định dạng PNG hoàn chỉnh
 */
export function generateIconPng(size) {
  const width = size;
  const height = size;
  const radius = Math.round(size * 0.22); // Bo góc tròn 22%
  
  // Màu sắc chủ đạo: Xanh Cobalt (#0066EE) và Trắng (#FFFFFF)
  const bgR = 0x00, bgG = 0x66, bgB = 0xEE;
  const fgR = 0xFF, fgG = 0xFF, fgB = 0xFF;

  // Scanline data: Mỗi hàng = 1 byte Filter (0x00) + width * 4 bytes RGBA
  const rawScanlines = Buffer.alloc(height * (1 + width * 4));
  let ptr = 0;

  for (let y = 0; y < height; y++) {
    rawScanlines[ptr++] = 0; // PNG Filter type: 0 (None)
    for (let x = 0; x < width; x++) {
      // 1. Kiểm tra biên bo góc tròn
      let inBounds = true;
      const dx = Math.min(x, width - 1 - x);
      const dy = Math.min(y, height - 1 - y);
      if (dx < radius && dy < radius) {
        const dist = Math.hypot(radius - dx, radius - dy);
        if (dist > radius) inBounds = false;
      }

      if (!inBounds) {
        rawScanlines[ptr++] = 0;
        rawScanlines[ptr++] = 0;
        rawScanlines[ptr++] = 0;
        rawScanlines[ptr++] = 0; // Trong suốt
        continue;
      }

      // 2. Vẽ biểu tượng Play tam giác căn giữa
      const nx = x / width;
      const ny = y / height;
      const inTriangle = (
        nx >= 0.35 && nx <= 0.72 &&
        ny >= (0.30 + (nx - 0.35) * ((0.50 - 0.30) / (0.72 - 0.35))) &&
        ny <= (0.70 - (nx - 0.35) * ((0.70 - 0.50) / (0.72 - 0.35)))
      );

      if (inTriangle) {
        rawScanlines[ptr++] = fgR;
        rawScanlines[ptr++] = fgG;
        rawScanlines[ptr++] = fgB;
        rawScanlines[ptr++] = 255;
      } else {
        rawScanlines[ptr++] = bgR;
        rawScanlines[ptr++] = bgG;
        rawScanlines[ptr++] = bgB;
        rawScanlines[ptr++] = 255;
      }
    }
  }

  function createChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crc = zlib.crc32(Buffer.concat([typeBuf, data]));
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc >>> 0, 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  // PNG Signature
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

  // IHDR Chunk: 13 bytes
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;  // Bit depth: 8-bit
  ihdrData[9] = 6;  // Color type: 6 (RGBA)
  ihdrData[10] = 0; // Compression: Deflate
  ihdrData[11] = 0; // Filter: 0
  ihdrData[12] = 0; // Interlace: 0

  const compressedData = zlib.deflateSync(rawScanlines);

  return Buffer.concat([
    signature,
    createChunk('IHDR', ihdrData),
    createChunk('IDAT', compressedData),
    createChunk('IEND', Buffer.alloc(0)),
  ]);
}

export function generateIcons() {
  console.log('🎨 Đang tạo bộ icon chuẩn (16x16, 48x48, 128x128)...');
  fs.mkdirSync(outputDir, { recursive: true });

  const sizes = [16, 48, 128];
  for (const size of sizes) {
    const pngBuffer = generateIconPng(size);
    const filePath = path.resolve(outputDir, `icon-${size}.png`);
    fs.writeFileSync(filePath, pngBuffer);
    console.log(`  ✓ Đã tạo ${path.relative(rootDir, filePath)} (${size}x${size}px, ${pngBuffer.length} bytes)`);
  }
  console.log('✨ Hoàn tất sinh bộ icon chuẩn.');
}

// Thực thi nếu chạy trực tiếp qua CLI
const isDirectCall = process.argv[1] && path.resolve(process.argv[1]) === __filename;
if (isDirectCall) {
  generateIcons();
}
