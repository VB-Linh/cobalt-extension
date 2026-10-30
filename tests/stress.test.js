// tests/stress.test.js
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createVideoObserver,
  collectVideosFromNode,
} from '../src/content/observers/index.js';
import {
  createVideoStateStore,
  getVideoKey,
} from '../src/content/state/index.js';
import { createTweetFixture, flushMutations } from './fixtures/factory.js';

describe('Adversarial Stress Testing: StateStore & VideoObserver', () => {
  let root;
  let stateStore;

  beforeEach(() => {
    root = document.createElement('div');
    root.id = 'stress-root';
    document.body.appendChild(root);
    stateStore = createVideoStateStore();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  describe('1. MutationObserver Stress Testing', () => {
    it('handles a burst of 600+ mixed mutations (elements, subtrees, text, attributes) collapsing via rAF without freezing', async () => {
      const detectedVideos = [];
      const onDetected = vi.fn((video, info) => {
        detectedVideos.push({ video, info });
      });

      const obs = createVideoObserver({
        root,
        stateStore,
        onVideoDetected: onDetected,
      });

      obs.start();

      const startTime = performance.now();
      const expectedVideoCount = 50;
      let videoCount = 0;

      // Generate 600 rapid mutations
      for (let i = 0; i < 600; i++) {
        const type = i % 6;

        if (type === 0 && videoCount < expectedVideoCount) {
          // Video tweet insertion with valid numeric snowflake ID
          videoCount++;
          const numericId = `1900000000000000${String(videoCount).padStart(3, '0')}`;
          const tweet = createTweetFixture({
            tweetId: numericId,
            username: `burst_user_${videoCount}`,
          });
          root.appendChild(tweet);
        } else if (type === 1) {
          // Plain elements
          const div = document.createElement('div');
          div.className = `plain-div-${i}`;
          div.innerHTML = '<span>text</span><button>click</button>';
          root.appendChild(div);
        } else if (type === 2) {
          // Deep subtree
          const deep = document.createElement('div');
          let current = deep;
          for (let depth = 0; depth < 5; depth++) {
            const child = document.createElement('section');
            child.setAttribute('data-depth', String(depth));
            current.appendChild(child);
            current = child;
          }
          current.textContent = `Deep leaf ${i}`;
          root.appendChild(deep);
        } else if (type === 3) {
          // Text content mutations on last child
          if (root.lastElementChild) {
            root.lastElementChild.textContent = `Updated text ${i}`;
          }
        } else if (type === 4) {
          // Attribute / dataset mutations
          if (root.lastElementChild) {
            root.lastElementChild.setAttribute('data-stress-test', `val_${i}`);
            root.lastElementChild.classList.add(`stress-cls-${i % 10}`);
          }
        } else {
          // Fragment insertion
          const frag = document.createDocumentFragment();
          const p1 = document.createElement('p');
          const p2 = document.createElement('p');
          frag.appendChild(p1);
          frag.appendChild(p2);
          root.appendChild(frag);
        }
      }

      const syncDuration = performance.now() - startTime;
      // Synchronous mutation creation must not lock the CPU excessively
      expect(syncDuration).toBeLessThan(1500);

      // Wait for rAF debounce to flush all queued mutations
      await flushMutations(60);

      expect(onDetected).toHaveBeenCalledTimes(expectedVideoCount);
      expect(detectedVideos).toHaveLength(expectedVideoCount);

      // Verify all detected videos are marked mounted
      for (const { video, info } of detectedVideos) {
        expect(video.dataset.xvtMounted).toBe('true');
        expect(stateStore.isMounted(video)).toBe(true);
        expect(info.tweetId).toMatch(/^190000000000000\d+$/);
      }

      // Verify internal pending queue drained to 0
      expect(obs._getPendingSize()).toBe(0);

      obs.stop();
    });

    it('survives rapid start() and stop() cycles without dangling observers, crashes, or leaks', async () => {
      const onDetected = vi.fn();
      const obs = createVideoObserver({
        root,
        stateStore,
        onVideoDetected: onDetected,
      });

      // Rapidly toggle start/stop 100 times in succession
      for (let i = 0; i < 100; i++) {
        obs.start();
        obs.start(); // Redundant start
        if (i % 2 === 0) {
          obs.stop();
          obs.stop(); // Redundant stop
        }
      }

      // Explicitly stop to confirm teardown
      obs.stop();
      expect(obs.isActive()).toBe(false);

      // Adding video while stopped must NOT trigger callback
      const tweet1 = createTweetFixture({ tweetId: '1910000000000000001' });
      root.appendChild(tweet1);
      await flushMutations();
      expect(onDetected).not.toHaveBeenCalled();

      // Restarting must rescan and detect existing video cleanly
      obs.start();
      expect(obs.isActive()).toBe(true);
      expect(onDetected).toHaveBeenCalledTimes(1);
      expect(onDetected.mock.calls[0][1].tweetId).toBe('1910000000000000001');

      // Stop again while a flush is pending
      const tweet2 = createTweetFixture({ tweetId: '1910000000000000002' });
      root.appendChild(tweet2);
      // Immediately stop before rAF flush
      obs.stop();
      expect(obs.isActive()).toBe(false);

      await flushMutations();
      // Since observer was stopped before flush, pendingVideos was cleared and callback canceled
      expect(onDetected).toHaveBeenCalledTimes(1); // Still 1, tweet2 not processed

      obs.stop();
    });

    it('cleanly ignores disconnected nodes that were added and immediately removed before rAF flush', async () => {
      const onDetected = vi.fn();
      const obs = createVideoObserver({
        root,
        stateStore,
        onVideoDetected: onDetected,
      });

      obs.start();

      const connectedTweets = [];
      const disconnectedTweets = [];

      // Create 30 tweets
      for (let i = 0; i < 30; i++) {
        const numericId = `1920000000000000${String(i).padStart(3, '0')}`;
        const tweet = createTweetFixture({ tweetId: numericId });
        root.appendChild(tweet);

        if (i < 20) {
          // Immediately disconnect 20 of them in the same synchronous cycle before rAF
          root.removeChild(tweet);
          disconnectedTweets.push(tweet);
        } else {
          // Keep 10 connected
          connectedTweets.push(tweet);
        }
      }

      // Verify DOM attachment status before rAF fires
      expect(root.children.length).toBe(10);
      for (const t of disconnectedTweets) {
        const vid = t.querySelector('video');
        expect(vid.isConnected).toBe(false);
      }
      for (const t of connectedTweets) {
        const vid = t.querySelector('video');
        expect(vid.isConnected).toBe(true);
      }

      // Allow rAF flush to execute
      await flushMutations();

      // ONLY the 10 connected tweets should have triggered onDetected
      expect(onDetected).toHaveBeenCalledTimes(10);

      const detectedIds = onDetected.mock.calls.map((c) => c[1].tweetId);
      expect(detectedIds).toHaveLength(10);
      for (let i = 20; i < 30; i++) {
        expect(detectedIds).toContain(`1920000000000000${String(i).padStart(3, '0')}`);
      }

      // Disconnected videos must remain unmounted in stateStore and DOM dataset
      for (const t of disconnectedTweets) {
        const vid = t.querySelector('video');
        expect(vid.dataset.xvtMounted).toBeUndefined();
        expect(stateStore.isMounted(vid)).toBe(false);
      }

      obs.stop();
    });

    it('recovers gracefully without crashing when onVideoDetected callback throws', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      let count = 0;

      const obs = createVideoObserver({
        root,
        stateStore,
        onVideoDetected: (_video, info) => {
          count++;
          if (info.tweetId === '1930000000000000002') {
            throw new Error('Explosive callback failure!');
          }
        },
      });

      obs.start();

      root.appendChild(createTweetFixture({ tweetId: '1930000000000000001' }));
      root.appendChild(createTweetFixture({ tweetId: '1930000000000000002' }));
      root.appendChild(createTweetFixture({ tweetId: '1930000000000000003' }));

      await flushMutations();

      // All 3 were processed despite the 2nd one throwing an error
      expect(count).toBe(3);
      expect(errorSpy).toHaveBeenCalled();

      obs.stop();
      errorSpy.mockRestore();
    });
  });

  describe('2. State Management Stress Testing', () => {
    it('maintains dismissed state across 10 cycles of infinite scrolling re-render churn (50 tweets)', async () => {
      const TOTAL_TWEETS = 50;
      const DISMISSED_COUNT = 25;

      // 1. Initial mount of 50 tweets
      for (let i = 1; i <= TOTAL_TWEETS; i++) {
        const numericId = `1940000000000000${String(i).padStart(3, '0')}`;
        root.appendChild(createTweetFixture({ tweetId: numericId }));
      }

      const allVideos = Array.from(root.querySelectorAll('video'));
      expect(allVideos).toHaveLength(TOTAL_TWEETS);

      // Dismiss first 25 tweets
      for (let i = 0; i < DISMISSED_COUNT; i++) {
        const vid = allVideos[i];
        const numericId = `1940000000000000${String(i + 1).padStart(3, '0')}`;
        const key = getVideoKey(numericId, null);
        stateStore.dismiss(key, vid);
        expect(stateStore.isDismissed(key, vid)).toBe(true);
      }
      expect(stateStore.getDismissedCount()).toBe(DISMISSED_COUNT);

      // 2. Simulate 10 scroll cycles: unmount all, then remount all with fresh DOM elements
      for (let cycle = 1; cycle <= 10; cycle++) {
        root.innerHTML = ''; // Unmount all DOM nodes

        // Remount 50 fresh DOM tweet elements
        for (let i = 1; i <= TOTAL_TWEETS; i++) {
          const numericId = `1940000000000000${String(i).padStart(3, '0')}`;
          root.appendChild(createTweetFixture({ tweetId: numericId }));
        }

        const freshVideos = Array.from(root.querySelectorAll('video'));
        expect(freshVideos).toHaveLength(TOTAL_TWEETS);

        // Check state across all 50 tweets
        for (let i = 0; i < TOTAL_TWEETS; i++) {
          const freshVid = freshVideos[i];
          const numericId = `1940000000000000${String(i + 1).padStart(3, '0')}`;
          const key = getVideoKey(numericId, null);

          if (i < DISMISSED_COUNT) {
            // Must be dismissed (via Tier 3 session persistence)
            const isDismissed = stateStore.isDismissed(key, freshVid);
            expect(isDismissed).toBe(true);
            expect(freshVid.dataset.xvtDismissed).toBe('true');
          } else {
            // Must NOT be dismissed
            const isDismissed = stateStore.isDismissed(key, freshVid);
            expect(isDismissed).toBe(false);
            expect(freshVid.dataset.xvtDismissed).toBeUndefined();
          }
        }
      }

      // Check with observer on remounted DOM
      const onDetected = vi.fn();
      const obs = createVideoObserver({
        root,
        stateStore,
        onVideoDetected: onDetected,
      });

      obs.start();
      await flushMutations();

      // Only the 25 non-dismissed tweets should be detected
      expect(onDetected).toHaveBeenCalledTimes(TOTAL_TWEETS - DISMISSED_COUNT);
      for (const call of onDetected.mock.calls) {
        const idNum = parseInt(call[1].tweetId.slice(-3), 10);
        expect(idNum).toBeGreaterThan(DISMISSED_COUNT);
      }

      obs.stop();
    });

    it('guarantees memory safety: WeakSet/WeakMap weak reference integrity and no memory leaks', () => {
      // Confirm that DOM-referencing collections are Weak collections
      expect(stateStore._mountedElements).toBeInstanceOf(WeakSet);
      expect(stateStore._dismissedElements).toBeInstanceOf(WeakSet);
      expect(stateStore._perVideoData).toBeInstanceOf(WeakMap);
      expect(stateStore._dismissedKeys).toBeInstanceOf(Set);

      // Stress test: allocate 1,000 ephemeral elements
      const count = 1000;
      for (let i = 0; i < count; i++) {
        const el = document.createElement('video');
        const key = `1950000000000000${String(i).padStart(4, '0')}_media_null`;
        stateStore.markMounted(el, key);
        stateStore.setPerVideoData(el, { index: i, timestamp: Date.now() });
        stateStore.dismiss(key, el);
      }

      // Tab session Set should strictly contain string keys, NO DOM elements
      expect(stateStore.getDismissedCount()).toBe(count);
      for (const key of stateStore._dismissedKeys) {
        expect(typeof key).toBe('string');
        expect(key).toMatch(/^1950000000000000\d{4}_media_null$/);
      }

      // Verify no strong DOM reference property exists on stateStore
      const propertyKeys = Object.getOwnPropertyNames(stateStore);
      for (const prop of propertyKeys) {
        const val = stateStore[prop];
        if (val instanceof Set) {
          for (const item of val) {
            expect(typeof item).toBe('string');
          }
        } else if (val instanceof Map || Array.isArray(val)) {
          throw new Error(`Unexpected strong collection found on stateStore: ${prop}`);
        }
      }
    });

    it('STRICT ARCHITECTURAL ENFORCEMENT: Never stores DOM node references in chrome.storage under heavy churn', async () => {
      const localStorageSpy = vi.spyOn(chrome.storage.local, 'set');
      const syncStorageSpy = vi.spyOn(chrome.storage.sync, 'set');

      const onDetected = vi.fn();
      const obs = createVideoObserver({
        root,
        stateStore,
        onVideoDetected: onDetected,
      });

      obs.start();

      // Generate heavy churn with dismissals, mountings, mutations
      for (let i = 0; i < 50; i++) {
        const numericId = `1960000000000000${String(i).padStart(3, '0')}`;
        const tweet = createTweetFixture({ tweetId: numericId });
        root.appendChild(tweet);
      }
      await flushMutations();

      const videos = Array.from(root.querySelectorAll('video'));
      for (let i = 0; i < videos.length; i++) {
        const numericId = `1960000000000000${String(i).padStart(3, '0')}`;
        const key = getVideoKey(numericId, null);
        if (i % 2 === 0) {
          stateStore.dismiss(key, videos[i]);
        }
      }

      obs.stop();

      // Function to recursively inspect values for DOM references
      function checkForDomNodes(obj, path = '') {
        if (!obj || typeof obj !== 'object') return;
        if (obj instanceof Element || obj instanceof Node || typeof obj.nodeType === 'number') {
          throw new Error(`CRITICAL VIOLATION: DOM node stored in chrome.storage at ${path}`);
        }
        for (const [k, v] of Object.entries(obj)) {
          checkForDomNodes(v, `${path}.${k}`);
        }
      }

      // Verify that chrome.storage.local.set was never invoked with DOM nodes
      for (const call of localStorageSpy.mock.calls) {
        for (const arg of call) {
          checkForDomNodes(arg);
        }
      }

      for (const call of syncStorageSpy.mock.calls) {
        for (const arg of call) {
          checkForDomNodes(arg);
        }
      }

      // In fact, stateStore and observer should never touch chrome.storage at all in Phase 1
      expect(localStorageSpy).not.toHaveBeenCalled();
      expect(syncStorageSpy).not.toHaveBeenCalled();

      localStorageSpy.mockRestore();
      syncStorageSpy.mockRestore();
    });

    it('handles reset(false) vs reset(true) accurately under session churn', () => {
      const vid = document.createElement('video');
      const key = '1970000000000000001_media_null';

      stateStore.markMounted(vid, key);
      stateStore.dismiss(key, vid);
      stateStore.setPerVideoData(vid, { foo: 'bar' });

      expect(stateStore.getDismissedCount()).toBe(1);
      expect(stateStore.isDismissed(key, vid)).toBe(true);

      // Soft reset: preserves session keys
      stateStore.reset(false);
      expect(stateStore.getDismissedCount()).toBe(1);
      expect(stateStore.getPerVideoData(vid)).toBeUndefined(); // Tier 2 cleared
      expect(stateStore._mountedElements.has(vid)).toBe(false); // Tier 2 cleared
      const unmountedVid = document.createElement('video');
      expect(stateStore.isMounted(unmountedVid)).toBe(false);

      // A fresh DOM element for the same key still evaluates as dismissed via Tier 3
      const freshVid = document.createElement('video');
      expect(stateStore.isDismissed(key, freshVid)).toBe(true);
      expect(freshVid.dataset.xvtDismissed).toBe('true');

      // Hard reset: clears Tier 3 session keys as well
      stateStore.reset(true);
      expect(stateStore.getDismissedCount()).toBe(0);
      const anotherVid = document.createElement('video');
      expect(stateStore.isDismissed(key, anotherVid)).toBe(false);
    });

    it('robustly handles edge cases and malformed inputs in state queries and video key generation', () => {
      // Null / undefined inputs
      expect(getVideoKey(null)).toBe('null_media_null');
      expect(getVideoKey(undefined)).toBe('undefined_media_null');
      expect(getVideoKey('12345', null)).toBe('12345_media_null');
      expect(getVideoKey('12345', undefined)).toBe('12345_media_null');
      expect(getVideoKey('12345', 1)).toBe('12345_media_1');
      expect(getVideoKey('12345', '2')).toBe('12345_media_2');

      // isDismissed with edge-case element types
      expect(stateStore.isDismissed(null, null)).toBe(false);
      expect(stateStore.isDismissed(undefined, undefined)).toBe(false);
      expect(stateStore.isMounted(null)).toBe(false);
      expect(stateStore.getPerVideoData(null)).toBeUndefined();

      // Non-element objects or elements without dataset
      const plainObj = {};
      expect(stateStore.isDismissed('key', plainObj)).toBe(false);
      expect(stateStore.isMounted(plainObj)).toBe(false);

      // Calling markMounted / unmarkMounted / dismiss with null is safe
      expect(() => stateStore.markMounted(null)).not.toThrow();
      expect(() => stateStore.unmarkMounted(null)).not.toThrow();
      expect(() => stateStore.dismiss(null, null)).not.toThrow();
      expect(() => stateStore.setPerVideoData(null, null)).not.toThrow();
    });

    it('collectVideosFromNode handles non-standard, null, comment, or throwing nodes without crashing', () => {
      const acc = new Set();

      // Null, undefined, numbers, strings
      expect(() => collectVideosFromNode(null, acc)).not.toThrow();
      expect(() => collectVideosFromNode(undefined, acc)).not.toThrow();
      expect(() => collectVideosFromNode('invalid', acc)).not.toThrow();
      expect(acc.size).toBe(0);

      // Comment node
      const comment = document.createComment('test comment');
      collectVideosFromNode(comment, acc);
      expect(acc.size).toBe(0);

      // Node with querySelectorAll that throws
      const throwingNode = {
        nodeType: 1,
        tagName: 'DIV',
        querySelectorAll: () => {
          throw new Error('Simulated DOMException');
        },
      };
      expect(() => collectVideosFromNode(throwingNode, acc)).not.toThrow();
      expect(acc.size).toBe(0);
    });
  });
});

