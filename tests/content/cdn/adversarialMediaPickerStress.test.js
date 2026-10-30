// tests/content/cdn/adversarialMediaPickerStress.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderMediaPicker } from '../../../src/content/cdn/mediaPicker.js';
import { createToolbar } from '../../../src/content/toolbar/toolbar.js';
import { TOOLBAR_STATES } from '../../../src/content/toolbar/toolbarState.js';
import { createVideoStateStore } from '../../../src/content/state/videoState.js';

describe('Empirical Challenger: Media Picker & AMBIGUOUS State Stress Suite', () => {
  let wrapper;
  let video;
  let store;

  beforeEach(() => {
    document.body.innerHTML = '';
    wrapper = document.createElement('div');
    wrapper.setAttribute('data-testid', 'videoComponent');
    wrapper.style.position = 'relative';

    video = document.createElement('video');
    video.src = 'blob:https://x.com/mock-blob';
    wrapper.appendChild(video);
    document.body.appendChild(wrapper);

    store = createVideoStateStore();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  // =========================================================================
  // SECTION 1: Outside Click Dismissal Rigorous Stress & Edge Cases
  // =========================================================================
  describe('1. Outside Click Dismissal Rigorous Stress', () => {
    it('1.1: outside click reliably dismisses picker across document body and host siblings', async () => {
      const host = document.createElement('div');
      const shadowRoot = host.attachShadow({ mode: 'open' });
      const container = document.createElement('div');
      container.className = 'xvt-toolbar-container';
      shadowRoot.appendChild(container);
      document.body.appendChild(host);

      const onCancel = vi.fn();
      renderMediaPicker(shadowRoot, [{ id_str: 'cand1' }], { onCancel });

      // Wait for deferred listener attachment (setTimeout 0)
      await new Promise((r) => setTimeout(r, 15));

      expect(shadowRoot.querySelector('.xvt-picker-popover')).not.toBeNull();

      // Click sibling on document body
      const externalSibling = document.createElement('div');
      document.body.appendChild(externalSibling);

      externalSibling.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));

      expect(onCancel).toHaveBeenCalledTimes(1);
      expect(shadowRoot.querySelector('.xvt-picker-popover')).toBeNull();
    });

    it('1.2: clicks deeply nested inside popover (thumbnail, label, meta) do NOT trigger dismissal', async () => {
      const host = document.createElement('div');
      const shadowRoot = host.attachShadow({ mode: 'open' });
      document.body.appendChild(host);

      const onCancel = vi.fn();
      const candidates = [
        {
          id_str: 'cand1',
          media_url_https: 'https://pbs.twimg.com/media/test.jpg',
          resolution: '1080p',
          video_info: { aspect_ratio: [16, 9] },
        },
      ];

      renderMediaPicker(shadowRoot, candidates, { onCancel });
      await new Promise((r) => setTimeout(r, 15));

      const popover = shadowRoot.querySelector('.xvt-picker-popover');
      const thumb = shadowRoot.querySelector('.xvt-picker-thumb');
      const label = shadowRoot.querySelector('.xvt-picker-label');
      const meta = shadowRoot.querySelector('.xvt-picker-meta');

      expect(popover).not.toBeNull();
      expect(thumb).not.toBeNull();
      expect(label).not.toBeNull();
      expect(meta).not.toBeNull();

      // Click on meta text
      meta.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
      // Note: clicking on meta/label bubbles up to .xvt-picker-item which triggers selection,
      // but NOT outside click onCancel!
      expect(onCancel).not.toHaveBeenCalled();
    });

    it('1.3: clicking on popover title or empty list area does NOT dismiss popover', async () => {
      const host = document.createElement('div');
      const shadowRoot = host.attachShadow({ mode: 'open' });
      document.body.appendChild(host);

      const onCancel = vi.fn();
      renderMediaPicker(shadowRoot, [{ id_str: 'cand1' }], { onCancel });
      await new Promise((r) => setTimeout(r, 15));

      const title = shadowRoot.querySelector('.xvt-picker-title');
      const header = shadowRoot.querySelector('.xvt-picker-header');
      const list = shadowRoot.querySelector('.xvt-picker-list');

      title.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
      header.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
      list.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));

      expect(onCancel).not.toHaveBeenCalled();
      expect(shadowRoot.querySelector('.xvt-picker-popover')).not.toBeNull();
    });

    it('1.4: early destroy before setTimeout(..., 0) executes cleans up timer and prevents listener leak', async () => {
      const host = document.createElement('div');
      const shadowRoot = host.attachShadow({ mode: 'open' });
      document.body.appendChild(host);

      const onCancel = vi.fn();
      const picker = renderMediaPicker(shadowRoot, [{ id_str: 'cand1' }], { onCancel });

      // Synchronously destroy immediately without waiting for timer
      picker.destroy();
      expect(shadowRoot.querySelector('.xvt-picker-popover')).toBeNull();

      // Now wait for timer expiration
      await new Promise((r) => setTimeout(r, 20));

      // Click outside
      document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(onCancel).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // SECTION 2: Keyboard & Escape Stress
  // =========================================================================
  describe('2. Keyboard & Escape Stress', () => {
    it('2.1: Escape key unmounts picker and removes document keydown listener', () => {
      const host = document.createElement('div');
      const shadowRoot = host.attachShadow({ mode: 'open' });
      document.body.appendChild(host);

      const onCancel = vi.fn();
      renderMediaPicker(shadowRoot, [{ id_str: 'cand1' }], { onCancel });

      expect(shadowRoot.querySelector('.xvt-picker-popover')).not.toBeNull();

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

      expect(onCancel).toHaveBeenCalledTimes(1);
      expect(shadowRoot.querySelector('.xvt-picker-popover')).toBeNull();

      // Second escape must be inert
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('2.2: Space key on candidate item triggers selection without page scroll or leak', () => {
      const host = document.createElement('div');
      const shadowRoot = host.attachShadow({ mode: 'open' });
      document.body.appendChild(host);

      const onSelect = vi.fn();
      const candidates = [{ id_str: 'item1' }, { id_str: 'item2' }];
      renderMediaPicker(shadowRoot, candidates, { onSelect });

      const items = shadowRoot.querySelectorAll('.xvt-picker-item');
      expect(items).toHaveLength(2);

      const spaceEvent = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
      const preventDefaultSpy = vi.spyOn(spaceEvent, 'preventDefault');

      items[1].dispatchEvent(spaceEvent);

      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(onSelect).toHaveBeenCalledTimes(1);
      expect(onSelect).toHaveBeenCalledWith(candidates[1], 1);
      expect(shadowRoot.querySelector('.xvt-picker-popover')).toBeNull();
    });

    it('2.3: Enter key on candidate item triggers selection with preventDefault and stopPropagation', () => {
      const host = document.createElement('div');
      const shadowRoot = host.attachShadow({ mode: 'open' });
      document.body.appendChild(host);

      const onSelect = vi.fn();
      const candidates = [{ id_str: 'itemA' }];
      renderMediaPicker(shadowRoot, candidates, { onSelect });

      const item = shadowRoot.querySelector('.xvt-picker-item');
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
      const preventDefaultSpy = vi.spyOn(enterEvent, 'preventDefault');
      const stopPropSpy = vi.spyOn(enterEvent, 'stopPropagation');

      item.dispatchEvent(enterEvent);

      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(stopPropSpy).toHaveBeenCalled();
      expect(onSelect).toHaveBeenCalledWith(candidates[0], 0);
      expect(shadowRoot.querySelector('.xvt-picker-popover')).toBeNull();
    });
  });

  // =========================================================================
  // SECTION 3: Toolbar AMBIGUOUS State Machine & Spinner Inactivation
  // =========================================================================
  describe('3. Toolbar AMBIGUOUS State Machine & Spinner Inactivation', () => {
    it('3.1: toolbar transitions to TOOLBAR_STATES.AMBIGUOUS: stops spinner, removes aria-busy, restores CDN icon', () => {
      const toolbar = createToolbar(video, { tweetId: '1800000000000000001' }, { stateStore: store });
      expect(toolbar).not.toBeNull();

      const shadowRoot = toolbar.shadowRoot;
      const cdnBtn = shadowRoot.querySelector('.xvt-btn-cdn');
      const cdnIcon = shadowRoot.querySelector('.xvt-btn-cdn .xvt-btn-icon');
      const container = shadowRoot.querySelector('.xvt-toolbar-container');

      // 1. First transition to PROCESSING
      toolbar.stateManager.setState(TOOLBAR_STATES.PROCESSING, { action: 'cdn' });
      expect(container.classList.contains('xvt-processing')).toBe(true);
      expect(cdnBtn.getAttribute('aria-busy')).toBe('true');
      expect(cdnIcon.innerHTML).toContain('xvt-spinner');

      // 2. Transition from PROCESSING to AMBIGUOUS
      const success = toolbar.stateManager.setState(TOOLBAR_STATES.AMBIGUOUS, {
        candidates: [{ id_str: 'c1' }, { id_str: 'c2' }],
      });
      expect(success).toBe(true);
      expect(toolbar.stateManager.getState()).toBe(TOOLBAR_STATES.AMBIGUOUS);

      // Verify DOM reflects non-busy, non-spinner state
      expect(container.classList.contains('xvt-ambiguous')).toBe(true);
      expect(container.classList.contains('xvt-processing')).toBe(false);
      expect(cdnBtn.hasAttribute('aria-busy')).toBe(false);
      expect(cdnIcon.innerHTML).not.toContain('xvt-spinner');
      expect(cdnIcon.querySelector('svg')).not.toBeNull();
      // SVG path must match the CDN external link icon path
      expect(cdnIcon.innerHTML).toContain('M18 13v6a2 2 0 01-2 2H5');

      toolbar.destroy();
    });

    it('3.2: auto-hide and hide() are completely inhibited while in TOOLBAR_STATES.AMBIGUOUS', async () => {
      const toolbar = createToolbar(video, { tweetId: '1800000000000000002' }, { stateStore: store });
      const container = toolbar.shadowRoot.querySelector('.xvt-toolbar-container');

      // Move into PROCESSING, then AMBIGUOUS state
      toolbar.stateManager.setState(TOOLBAR_STATES.PROCESSING, { action: 'cdn' });
      toolbar.stateManager.setState(TOOLBAR_STATES.AMBIGUOUS, { candidates: [{ id_str: 'c1' }] });
      expect(toolbar.stateManager.getState()).toBe(TOOLBAR_STATES.AMBIGUOUS);

      // Call hide() directly
      toolbar.hide();
      expect(toolbar.stateManager.getState()).toBe(TOOLBAR_STATES.AMBIGUOUS);
      expect(container.classList.contains('xvt-ambiguous')).toBe(true);

      // Simulate mouse leave from video wrapper
      wrapper.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));

      // Wait past GRACE_PERIOD_MS (300ms)
      await new Promise((r) => setTimeout(r, 350));

      // Must STILL be in AMBIGUOUS state and visible
      expect(toolbar.stateManager.getState()).toBe(TOOLBAR_STATES.AMBIGUOUS);
      expect(container.classList.contains('xvt-ambiguous')).toBe(true);
      expect(container.classList.contains('xvt-idle')).toBe(false);

      toolbar.destroy();
    });

    it('3.3: selection during AMBIGUOUS state returns toolbar to PROCESSING, then SUCCESS', async () => {
      let disambiguateCallback = null;
      const fakeResolver = vi.fn().mockImplementation((v, info, opts) => {
        return new Promise((resolve) => {
          opts.onAmbiguous(
            [{ id_str: 'v1', media_url_https: 'https://pbs.twimg.com/media/v1.jpg' }],
            async (chosen) => {
              disambiguateCallback = chosen;
              return { success: true, url: 'https://video.twimg.com/amplify_video/chosen.mp4' };
            }
          );
        });
      });

      const toolbar = createToolbar(
        video,
        { tweetId: '1800000000000000003' },
        { stateStore: store, cdnResolver: fakeResolver }
      );

      const shadowRoot = toolbar.shadowRoot;
      const cdnBtn = shadowRoot.querySelector('.xvt-btn-cdn');

      // Click CDN button
      cdnBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

      expect(toolbar.stateManager.getState()).toBe(TOOLBAR_STATES.AMBIGUOUS);
      expect(shadowRoot.querySelector('.xvt-picker-popover')).not.toBeNull();

      // Click the candidate item in popover
      const item = shadowRoot.querySelector('.xvt-picker-item');
      item.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

      // Immediately upon selection, state transitions to PROCESSING
      expect(toolbar.stateManager.getState()).toBe(TOOLBAR_STATES.PROCESSING);

      // Wait for promise resolution
      await new Promise((r) => setTimeout(r, 50));

      expect(disambiguateCallback).toEqual({
        id_str: 'v1',
        media_url_https: 'https://pbs.twimg.com/media/v1.jpg',
      });
      expect(toolbar.stateManager.getState()).toBe(TOOLBAR_STATES.SUCCESS);

      toolbar.destroy();
    });

    it('3.4: cancellation during AMBIGUOUS state restores IDLE/HOVERED state smoothly', async () => {
      const fakeResolver = vi.fn().mockImplementation((v, info, opts) => {
        opts.onAmbiguous([{ id_str: 'v1' }], () => {});
        return { isAmbiguous: true };
      });

      const toolbar = createToolbar(
        video,
        { tweetId: '1800000000000000004' },
        { stateStore: store, cdnResolver: fakeResolver }
      );

      const shadowRoot = toolbar.shadowRoot;
      const cdnBtn = shadowRoot.querySelector('.xvt-btn-cdn');

      // Click CDN button
      cdnBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      expect(toolbar.stateManager.getState()).toBe(TOOLBAR_STATES.AMBIGUOUS);

      // Click close button on popover
      const closeBtn = shadowRoot.querySelector('.xvt-picker-close');
      expect(closeBtn).not.toBeNull();

      closeBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

      // Should transition out of AMBIGUOUS (to IDLE or HOVERED)
      expect(toolbar.stateManager.getState()).not.toBe(TOOLBAR_STATES.AMBIGUOUS);
      expect(shadowRoot.querySelector('.xvt-picker-popover')).toBeNull();

      toolbar.destroy();
    });
  });

  // =========================================================================
  // SECTION 4: Popover Interactivity When Mouse Leaves Wrapper
  // =========================================================================
  describe('4. Popover Interactivity When Mouse Leaves Wrapper', () => {
    it('4.1: popover remains clickable and active when mouse leaves the video wrapper', async () => {
      let chosenCandidate = null;
      const fakeResolver = vi.fn().mockImplementation((v, info, opts) => {
        opts.onAmbiguous(
          [
            { id_str: 'vid_a', media_url_https: 'https://pbs.twimg.com/1.jpg' },
            { id_str: 'vid_b', media_url_https: 'https://pbs.twimg.com/2.jpg' },
          ],
          async (chosen) => {
            chosenCandidate = chosen;
            return { success: true, url: 'https://video.twimg.com/vid_b.mp4' };
          }
        );
        return { isAmbiguous: true };
      });

      const toolbar = createToolbar(
        video,
        { tweetId: '1800000000000000005' },
        { stateStore: store, cdnResolver: fakeResolver }
      );

      const shadowRoot = toolbar.shadowRoot;
      const cdnBtn = shadowRoot.querySelector('.xvt-btn-cdn');

      // Open media picker
      cdnBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      expect(toolbar.stateManager.getState()).toBe(TOOLBAR_STATES.AMBIGUOUS);

      const popover = shadowRoot.querySelector('.xvt-picker-popover');
      expect(popover).not.toBeNull();

      // Mouse leaves video wrapper into external page area
      wrapper.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));

      // Wait 350ms (longer than grace period)
      await new Promise((r) => setTimeout(r, 350));

      // The popover must still be present and container still ambiguous
      expect(toolbar.stateManager.getState()).toBe(TOOLBAR_STATES.AMBIGUOUS);
      expect(shadowRoot.querySelector('.xvt-picker-popover')).not.toBeNull();

      // Click on second candidate item
      const items = shadowRoot.querySelectorAll('.xvt-picker-item');
      items[1].dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

      // Candidate must be selected and resolution completed
      await new Promise((r) => setTimeout(r, 50));
      expect(chosenCandidate).toEqual({
        id_str: 'vid_b',
        media_url_https: 'https://pbs.twimg.com/2.jpg',
      });
      expect(toolbar.stateManager.getState()).toBe(TOOLBAR_STATES.SUCCESS);

      toolbar.destroy();
    });
  });

  // =========================================================================
  // SECTION 5: Extreme Edge Cases & Malformed Inputs
  // =========================================================================
  describe('5. Extreme Edge Cases & Malformed Inputs', () => {
    it('5.1: handles candidates with missing, partial, or malformed metadata gracefully', () => {
      const host = document.createElement('div');
      const shadowRoot = host.attachShadow({ mode: 'open' });
      document.body.appendChild(host);

      const candidates = [
        {},
        { id_str: 'm1', video_info: null },
        { id_str: 'm2', video_info: { variants: 'not-an-array' } },
        { id_str: 'm3', video_info: { variants: [{ url: null }, { no_url: true }] } },
        { id_str: 'm4', video_info: { aspect_ratio: [16, 9], variants: [] } },
      ];

      expect(() => renderMediaPicker(shadowRoot, candidates)).not.toThrow();
      const items = shadowRoot.querySelectorAll('.xvt-picker-item');
      expect(items).toHaveLength(candidates.length);
    });

    it('5.2: handles empty candidates array gracefully', () => {
      const host = document.createElement('div');
      const shadowRoot = host.attachShadow({ mode: 'open' });
      document.body.appendChild(host);

      const controller = renderMediaPicker(shadowRoot, []);
      expect(shadowRoot.querySelector('.xvt-picker-popover')).not.toBeNull();
      expect(shadowRoot.querySelectorAll('.xvt-picker-item')).toHaveLength(0);

      expect(() => controller.destroy()).not.toThrow();
      expect(shadowRoot.querySelector('.xvt-picker-popover')).toBeNull();
    });

    it('5.3: double destroy call on controller is safely idempotent', () => {
      const host = document.createElement('div');
      const shadowRoot = host.attachShadow({ mode: 'open' });
      document.body.appendChild(host);

      const controller = renderMediaPicker(shadowRoot, [{ id_str: '1' }]);
      expect(() => {
        controller.destroy();
        controller.destroy();
      }).not.toThrow();
    });
  });
});
