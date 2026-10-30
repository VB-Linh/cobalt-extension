// tests/manifest.test.js
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

describe('Kiểm thử Xác Thực Manifest V3 & Quyền Hạn Least-Privilege', () => {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const manifestPath = path.resolve(currentDir, '../manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  it('phải sử dụng manifest_version 3', () => {
    expect(manifest.manifest_version).toBe(3);
  });

  it('chỉ khai báo đúng quyền cố định tối thiểu (storage, downloads) và KHÔNG chứa tabs', () => {
    expect(manifest.permissions).toEqual(['storage', 'downloads']);
    expect(manifest.permissions).not.toContain('tabs');
    expect(manifest.permissions).not.toContain('<all_urls>');
  });

  it('chỉ cấp host_permissions cố định cho Twitter, X và Syndication CDN', () => {
    expect(manifest.host_permissions).toEqual([
      '*://twitter.com/*',
      '*://x.com/*',
      '*://cdn.syndication.twimg.com/*',
    ]);
  });

  it('khai báo optional_host_permissions cho Cobalt instance người dùng tự cấu hình', () => {
    expect(manifest.optional_host_permissions).toEqual([
      'http://*/*',
      'https://*/*',
    ]);
  });

  it('Service Worker phải sử dụng type: module', () => {
    expect(manifest.background).toBeDefined();
    expect(manifest.background.service_worker).toBe('service-worker.js');
    expect(manifest.background.type).toBe('module');
  });

  it('Content Script phải gán đúng tệp content.js cho x.com và twitter.com', () => {
    expect(manifest.content_scripts).toBeDefined();
    expect(manifest.content_scripts.length).toBeGreaterThan(0);
    const cs = manifest.content_scripts[0];
    expect(cs.js).toContain('content.js');
    expect(cs.matches).toContain('*://x.com/*');
    expect(cs.matches).toContain('*://twitter.com/*');
  });

  it('khai báo đúng đường dẫn Popup và Icons', () => {
    expect(manifest.action.default_popup).toBe('popup.html');
    expect(manifest.icons['16']).toBe('icons/icon-16.png');
    expect(manifest.icons['48']).toBe('icons/icon-48.png');
    expect(manifest.icons['128']).toBe('icons/icon-128.png');
  });
});
