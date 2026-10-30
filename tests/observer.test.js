// tests/observer.test.js
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createVideoObserver,
  collectVideosFromNode,
} from '../src/content/observers/index.js';
import { createVideoStateStore } from '../src/content/state/index.js';
import { createTweetFixture, flushMutations } from './fixtures/factory.js';

describe('observer module (createVideoObserver)', () => {
  let rootContainer;
  let stateStore;

  beforeEach(() => {
    rootContainer = document.createElement('div');
    document.body.appendChild(rootContainer);
    stateStore = createVideoStateStore();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('collectVideosFromNode', () => {
    it('collects direct video elements', () => {
      const video = document.createElement('video');
      const acc = new Set();
      collectVideosFromNode(video, acc);
      expect(acc.size).toBe(1);
      expect(acc.has(video)).toBe(true);
    });

    it('collects nested video elements from subtree containers', () => {
      const container = document.createElement('div');
      const v1 = document.createElement('video');
      const v2 = document.createElement('video');
      container.appendChild(v1);
      container.appendChild(v2);

      const acc = new Set();
      collectVideosFromNode(container, acc);
      expect(acc.size).toBe(2);
      expect(acc.has(v1)).toBe(true);
      expect(acc.has(v2)).toBe(true);
    });

    it('safely ignores text nodes and elements without videos', () => {
      const textNode = document.createTextNode('hello');
      const emptyDiv = document.createElement('div');
      const acc = new Set();

      collectVideosFromNode(textNode, acc);
      collectVideosFromNode(emptyDiv, acc);
      expect(acc.size).toBe(0);
    });
  });

  describe('observer lifecycle and duplicate prevention', () => {
    it('starts, detects existing videos, and tracks active state', () => {
      const tweet = createTweetFixture({ tweetId: '3001' });
      rootContainer.appendChild(tweet);

      const onDetected = vi.fn();
      const obs = createVideoObserver({
        root: rootContainer,
        stateStore,
        onVideoDetected: onDetected,
      });

      expect(obs.isActive()).toBe(false);

      obs.start();
      expect(obs.isActive()).toBe(true);
      expect(onDetected).toHaveBeenCalledTimes(1);
      expect(onDetected.mock.calls[0][1].tweetId).toBe('3001');

      obs.stop();
      expect(obs.isActive()).toBe(false);
    });

    it('is idempotent: multiple start() calls do not create duplicate observers', async () => {
      const onDetected = vi.fn();
      const obs = createVideoObserver({
        root: rootContainer,
        stateStore,
        onVideoDetected: onDetected,
      });

      obs.start();
      obs.start(); // Second start call should be a no-op
      obs.start(); // Third start call should be a no-op

      expect(obs.isActive()).toBe(true);

      const tweet = createTweetFixture({ tweetId: '3002' });
      rootContainer.appendChild(tweet);

      await flushMutations();

      expect(onDetected).toHaveBeenCalledTimes(1);
      obs.stop();
    });

    it('disconnects and suppresses events when stop() is called', async () => {
      const onDetected = vi.fn();
      const obs = createVideoObserver({
        root: rootContainer,
        stateStore,
        onVideoDetected: onDetected,
      });

      obs.start();
      obs.stop();

      const tweet = createTweetFixture({ tweetId: '3003' });
      rootContainer.appendChild(tweet);

      await flushMutations();

      expect(onDetected).not.toHaveBeenCalled();
    });

    it('batches rapid mutations cleanly', async () => {
      const onDetected = vi.fn();
      const obs = createVideoObserver({
        root: rootContainer,
        stateStore,
        onVideoDetected: onDetected,
      });

      obs.start();

      // Append 3 tweets in rapid succession
      rootContainer.appendChild(createTweetFixture({ tweetId: '3004' }));
      rootContainer.appendChild(createTweetFixture({ tweetId: '3005' }));
      rootContainer.appendChild(createTweetFixture({ tweetId: '3006' }));

      await flushMutations();

      expect(onDetected).toHaveBeenCalledTimes(3);
      obs.stop();
    });
  });
});
