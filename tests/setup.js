// tests/setup.js
import { vi } from 'vitest';

let localStore = {};
let syncStore = {};
let sessionStore = {};
const downloadListeners = new Set();

globalThis.chrome = {
  storage: {
    local: {
      get: vi.fn((keys) => {
        if (!keys) return Promise.resolve({ ...localStore });
        if (typeof keys === 'string') return Promise.resolve({ [keys]: localStore[keys] });
        if (Array.isArray(keys)) {
          const res = {};
          for (const k of keys) res[k] = localStore[k];
          return Promise.resolve(res);
        }
        const res = { ...keys };
        for (const k in keys) {
          if (k in localStore) res[k] = localStore[k];
        }
        return Promise.resolve(res);
      }),
      set: vi.fn((items) => {
        Object.assign(localStore, items);
        return Promise.resolve();
      }),
      remove: vi.fn((keys) => {
        const arr = Array.isArray(keys) ? keys : [keys];
        for (const k of arr) delete localStore[k];
        return Promise.resolve();
      }),
      clear: vi.fn(() => {
        localStore = {};
        return Promise.resolve();
      }),
    },
    sync: {
      get: vi.fn(() => Promise.resolve({ ...syncStore })),
      set: vi.fn((items) => {
        Object.assign(syncStore, items);
        return Promise.resolve();
      }),
    },
    session: {
      get: vi.fn((keys) => {
        if (!keys) return Promise.resolve({ ...sessionStore });
        if (typeof keys === 'string') return Promise.resolve({ [keys]: sessionStore[keys] });
        if (Array.isArray(keys)) {
          const res = {};
          for (const k of keys) res[k] = sessionStore[k];
          return Promise.resolve(res);
        }
        const res = { ...keys };
        for (const k in keys) {
          if (k in sessionStore) res[k] = sessionStore[k];
        }
        return Promise.resolve(res);
      }),
      set: vi.fn((items) => {
        Object.assign(sessionStore, items);
        return Promise.resolve();
      }),
      remove: vi.fn((keys) => {
        const arr = Array.isArray(keys) ? keys : [keys];
        for (const k of arr) delete sessionStore[k];
        return Promise.resolve();
      }),
      clear: vi.fn(() => {
        sessionStore = {};
        return Promise.resolve();
      }),
    },
    onChanged: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
      hasListener: vi.fn(),
    },
  },
  runtime: {
    sendMessage: vi.fn(() => Promise.resolve()),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
      hasListener: vi.fn(),
    },
    getURL: vi.fn((p) => `chrome-extension://mock-extension-id/${p}`),
    lastError: null,
  },
  downloads: {
    download: vi.fn(() => Promise.resolve(1001)),
    search: vi.fn(() => Promise.resolve([])),
    cancel: vi.fn(() => Promise.resolve()),
    onChanged: {
      addListener: vi.fn((fn) => downloadListeners.add(fn)),
      removeListener: vi.fn((fn) => downloadListeners.delete(fn)),
      hasListener: vi.fn((fn) => downloadListeners.has(fn)),
      dispatch: (delta) => {
        for (const fn of downloadListeners) {
          fn(delta);
        }
      },
    },
  },
  tabs: {
    create: vi.fn((opts) => Promise.resolve({ id: 1, ...opts })),
  },
  permissions: {
    request: vi.fn(() => Promise.resolve(true)),
    contains: vi.fn(() => Promise.resolve(true)),
    remove: vi.fn(() => Promise.resolve(true)),
  },
  action: {
    setBadgeText: vi.fn(() => Promise.resolve()),
    setBadgeBackgroundColor: vi.fn(() => Promise.resolve()),
    setIcon: vi.fn(() => Promise.resolve()),
    setTitle: vi.fn(() => Promise.resolve()),
  },
};
