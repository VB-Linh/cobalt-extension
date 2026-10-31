// scripts/build.js
import { build } from 'vite';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { generateIcons } from './generate-icons.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');
const distDir = resolve(rootDir, 'dist');

// Hàm chuẩn hóa đường dẫn sang dạng POSIX (forward slash) an toàn cho Vite/Rollup trên Windows
const toPosix = (p) => p.replace(/\\/g, '/');

async function buildExtension() {
  console.log('🚀 [X Video Tools] Bắt đầu quá trình build Chrome Extension MV3...');

  // 1. Dọn dẹp sạch sẽ dist/ (kèm cơ chế chống khóa tệp trên Windows)
  if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
  fs.mkdirSync(distDir, { recursive: true });

  const srcAlias = {
    '@': toPosix(resolve(rootDir, 'src')),
  };

  // 2. Build Popup (HTML entrypoint)
  console.log('📦 [1/4] Đang đóng gói Popup HTML...');
  await build({
    configFile: false,
    root: toPosix(resolve(rootDir, 'src/popup')),
    base: './',
    resolve: {
      alias: srcAlias,
    },
    build: {
      outDir: toPosix(distDir),
      emptyOutDir: false,
      rollupOptions: {
        input: toPosix(resolve(rootDir, 'src/popup/popup.html')),
        output: {
          entryFileNames: 'popup.js',
          assetFileNames: 'assets/[name].[ext]',
        },
      },
    },
  });

  // Kiểm tra dự phòng nếu Vite tạo lồng thư mục thì di chuyển ra phẳng
  const nestedPopupHtml = resolve(distDir, 'src/popup/popup.html');
  if (fs.existsSync(nestedPopupHtml)) {
    fs.renameSync(nestedPopupHtml, resolve(distDir, 'popup.html'));
    fs.rmSync(resolve(distDir, 'src'), { recursive: true, force: true });
  }

  // 3. Build Content Script (Bắt buộc Standalone IIFE, không chunks, không dynamic imports)
  console.log('📦 [2/4] Đang đóng gói Content Script (Standalone IIFE)...');
  await build({
    configFile: false,
    root: toPosix(rootDir),
    resolve: {
      alias: srcAlias,
    },
    build: {
      outDir: toPosix(distDir),
      emptyOutDir: false,
      lib: {
        entry: toPosix(resolve(rootDir, 'src/content/index.js')),
        name: 'XVideoToolsContent',
        formats: ['iife'],
        fileName: () => 'content.js',
      },
      rollupOptions: {
        output: {
          inlineDynamicImports: true,
          extend: true,
        },
      },
    },
  });

  // 4. Build Service Worker (Bắt buộc ESM format)
  console.log('📦 [3/4] Đang đóng gói Background Service Worker (ESM)...');
  await build({
    configFile: false,
    root: toPosix(rootDir),
    resolve: {
      alias: srcAlias,
    },
    build: {
      outDir: toPosix(distDir),
      emptyOutDir: false,
      lib: {
        entry: toPosix(resolve(rootDir, 'src/background/service-worker.js')),
        formats: ['es'],
        fileName: () => 'service-worker.js',
      },
      rollupOptions: {
        output: {
          inlineDynamicImports: true,
          entryFileNames: 'service-worker.js',
        },
      },
    },
  });

  // 5. Đồng bộ manifest.json và sandbox.html vào dist/
  console.log('📄 [4/4] Sao chép manifest.json, sandbox.html và icons...');
  const manifestSrc = resolve(rootDir, 'manifest.json');
  if (fs.existsSync(manifestSrc)) {
    try {
      JSON.parse(fs.readFileSync(manifestSrc, 'utf8'));
    } catch (e) {
      throw new Error(`Tệp manifest.json không hợp lệ cú pháp JSON: ${e.message}`);
    }
    fs.copyFileSync(manifestSrc, resolve(distDir, 'manifest.json'));
  } else {
    throw new Error('Không tìm thấy tệp manifest.json tại thư mục gốc!');
  }

  const sandboxSrc = resolve(rootDir, 'src/popup/sandbox.html');
  if (fs.existsSync(sandboxSrc)) {
    fs.copyFileSync(sandboxSrc, resolve(distDir, 'sandbox.html'));
  }

  // 6. Đồng bộ thư mục icons vào dist/icons/
  const iconsSrcDir = resolve(rootDir, 'assets/icons');
  const iconsDistDir = resolve(distDir, 'icons');
  const requiredIcons = ['icon-16.png', 'icon-48.png', 'icon-128.png'];

  const allIconsExist = fs.existsSync(iconsSrcDir) && requiredIcons.every(icon => fs.existsSync(resolve(iconsSrcDir, icon)));
  if (!allIconsExist) {
    console.log('🎨 Icons chưa có hoặc thiếu, đang tự động tạo icons...');
    generateIcons();
  }

  fs.mkdirSync(iconsDistDir, { recursive: true });
  fs.cpSync(iconsSrcDir, iconsDistDir, { recursive: true });

  // 7. Xác nhận kiểm tra tính toàn vẹn đầu ra (Output Integrity Check)
  const requiredOutputFiles = [
    resolve(distDir, 'manifest.json'),
    resolve(distDir, 'content.js'),
    resolve(distDir, 'service-worker.js'),
    resolve(distDir, 'popup.html'),
    resolve(distDir, 'icons/icon-16.png'),
    resolve(distDir, 'icons/icon-48.png'),
    resolve(distDir, 'icons/icon-128.png'),
  ];

  for (const file of requiredOutputFiles) {
    if (!fs.existsSync(file)) {
      throw new Error(`Lỗi kiểm chứng: Không tìm thấy tệp bắt buộc "${file}" sau khi build!`);
    }
  }

  // 8. Đồng bộ bản build ra thư mục gốc để người dùng có thể "Load unpacked" từ root hoặc dist đều hoạt động
  console.log('🔄 [5/4] Đồng bộ bản build sang thư mục gốc để dự phòng Load unpacked...');
  fs.copyFileSync(resolve(distDir, 'content.js'), resolve(rootDir, 'content.js'));
  fs.copyFileSync(resolve(distDir, 'service-worker.js'), resolve(rootDir, 'service-worker.js'));
  fs.copyFileSync(resolve(distDir, 'popup.html'), resolve(rootDir, 'popup.html'));
  fs.copyFileSync(resolve(distDir, 'popup.js'), resolve(rootDir, 'popup.js'));
  if (fs.existsSync(resolve(distDir, 'sandbox.html'))) {
    fs.copyFileSync(resolve(distDir, 'sandbox.html'), resolve(rootDir, 'sandbox.html'));
  }
  if (fs.existsSync(resolve(distDir, 'assets'))) {
    fs.cpSync(resolve(distDir, 'assets'), resolve(rootDir, 'assets'), { recursive: true });
  }
  if (fs.existsSync(resolve(distDir, 'icons'))) {
    fs.cpSync(resolve(distDir, 'icons'), resolve(rootDir, 'icons'), { recursive: true });
  }

  console.log('✅ Đóng gói thành công! Cấu trúc tệp đầu ra tại dist/ (và đồng bộ tại root):');
  console.log('  ├── manifest.json');
  console.log('  ├── content.js (IIFE standalone, 0 chunks)');
  console.log('  ├── service-worker.js (ESM standalone)');
  console.log('  ├── popup.html (phẳng)');
  console.log('  ├── popup.js');
  console.log('  └── icons/ (icon-16.png, icon-48.png, icon-128.png)');
}

buildExtension().catch((err) => {
  console.error('❌ Lỗi đóng gói extension:', err);
  process.exit(1);
});
