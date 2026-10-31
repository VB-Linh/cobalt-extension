// tests/fixtures/cobaltFixtures.js
import { vi } from 'vitest';

/**
 * Creates mock Cobalt redirect response (200 OK)
 */
export function createMockRedirectResponse(options = {}) {
  return {
    status: 'redirect',
    url: options.url || 'https://video.twimg.com/amplify_video/1800000000000000001/vid/avc1/1920x1080/vid.mp4',
    filename: options.filename || 'X_video_1800000000000000001.mp4',
  };
}

/**
 * Creates mock Cobalt tunnel response (200 OK with signed stream parameters)
 */
export function createMockTunnelResponse(options = {}) {
  const base = options.baseUrl || 'https://cobalt.example.com';
  const query = `id=abc123456789012345678&exp=1730332800000&sig=abcdefghijklmnopqrstuvwxyz0123456789ABCDEF&sec=1234567890123456789012345678901234567890123&iv=1234567890123456789012`;
  return {
    status: 'tunnel',
    url: `${base}/tunnel?${query}`,
    filename: options.filename || 'X_video_1800000000000000001.mp4',
  };
}

/**
 * Creates mock Cobalt picker response (200 OK with media items array)
 */
export function createMockPickerResponse(options = {}) {
  return {
    status: 'picker',
    picker: options.items || [
      {
        type: 'video',
        url: 'https://video.twimg.com/amplify_video/1800000000000000001/vid/avc1/1920x1080/vid.mp4',
        thumb: 'https://pbs.twimg.com/amplify_video_thumb/1800000000000000001/img/thumb.jpg',
      },
      {
        type: 'photo',
        url: 'https://pbs.twimg.com/media/photo_thumb.jpg',
      },
    ],
  };
}

/**
 * Creates mock Cobalt error response
 */
export function createMockErrorResponse(code, context = {}) {
  return {
    status: 'error',
    error: {
      code,
      context,
    },
  };
}

/**
 * Creates mock Cobalt GET / server info metadata
 */
export function createMockServerInfo(options = {}) {
  return {
    cobalt: {
      version: options.version || '11.7.1',
      url: options.url || 'https://cobalt.example.com/',
      startTime: `${Date.now()}`,
      services: options.services || ['twitter', 'youtube'],
    },
    git: {
      commit: '1234567',
      branch: 'main',
      remote: 'imputnet/cobalt',
    },
  };
}

/**
 * Creates isolated downloads mock harness for lifecycle testing
 */
export function createDownloadsMockHarness() {
  const listeners = new Set();
  const downloadsMap = new Map();
  let nextId = 2000;

  const mock = {
    download: vi.fn((options) => {
      const id = ++nextId;
      downloadsMap.set(id, { id, ...options, state: 'in_progress' });
      return Promise.resolve(id);
    }),
    search: vi.fn((query) => {
      return Promise.resolve(Array.from(downloadsMap.values()));
    }),
    cancel: vi.fn((id) => {
      const item = downloadsMap.get(id);
      if (item) item.state = 'interrupted';
      return Promise.resolve();
    }),
    onChanged: {
      addListener: vi.fn((fn) => listeners.add(fn)),
      removeListener: vi.fn((fn) => listeners.delete(fn)),
      hasListener: vi.fn((fn) => listeners.has(fn)),
      dispatch: (changeDelta) => {
        for (const fn of listeners) {
          fn(changeDelta);
        }
      },
    },
  };

  return mock;
}
