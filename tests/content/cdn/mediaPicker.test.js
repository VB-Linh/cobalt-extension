// tests/content/cdn/mediaPicker.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderMediaPicker } from '../../../src/content/cdn/mediaPicker.js';

describe('Media Picker Popover Component (tests/content/cdn/mediaPicker.test.js)', () => {
  let host;
  let shadowRoot;
  let container;

  beforeEach(() => {
    // Set up host, open Shadow DOM, and toolbar container
    host = document.createElement('div');
    host.className = 'xvt-toolbar-host';
    document.body.appendChild(host);

    shadowRoot = host.attachShadow({ mode: 'open' });
    container = document.createElement('div');
    container.className = 'xvt-toolbar-container';
    shadowRoot.appendChild(container);
  });

  afterEach(() => {
    // Teardown DOM elements
    if (host && host.parentNode) {
      host.parentNode.removeChild(host);
    }
    vi.restoreAllMocks();
  });

  // =========================================================================
  // 1. RENDERING INSIDE OPEN SHADOW DOM
  // =========================================================================
  describe('1. Open Shadow DOM Rendering & Structure', () => {
    it('1.1: mounts popover dialog inside open Shadow DOM without leaking to document body', () => {
      const candidates = [
        { id_str: 'vid_1', type: 'video' },
        { id_str: 'vid_2', type: 'video' },
      ];

      const picker = renderMediaPicker(shadowRoot, candidates);

      // Verify encapsulated inside shadowRoot
      const popover = shadowRoot.querySelector('.xvt-picker-popover');
      expect(popover).not.toBeNull();
      expect(popover.getAttribute('role')).toBe('dialog');
      expect(popover.getAttribute('aria-label')).toBe('Chọn video để mở');

      // Verify NOT leaked to light DOM
      expect(document.querySelector('.xvt-picker-popover')).toBeNull();

      picker.destroy();
      expect(shadowRoot.querySelector('.xvt-picker-popover')).toBeNull();
    });

    it('1.2: injects encapsulated styles once into Shadow DOM', () => {
      renderMediaPicker(shadowRoot, [{ id_str: '1' }]);
      const style1 = shadowRoot.querySelector('#xvt-picker-styles');
      expect(style1).not.toBeNull();
      expect(style1.textContent).toContain('.xvt-picker-popover');

      // Re-render: ensure style element is not duplicated
      renderMediaPicker(shadowRoot, [{ id_str: '2' }]);
      const allStyles = shadowRoot.querySelectorAll('#xvt-picker-styles');
      expect(allStyles).toHaveLength(1);
    });

    it('1.3: appends popover to .xvt-toolbar-container or directly to shadowRoot if container absent', () => {
      // 1. With container
      renderMediaPicker(shadowRoot, [{ id_str: 'c1' }]);
      expect(container.querySelector('.xvt-picker-popover')).not.toBeNull();

      // 2. Without container
      const emptyHost = document.createElement('div');
      const emptyShadow = emptyHost.attachShadow({ mode: 'open' });
      renderMediaPicker(emptyShadow, [{ id_str: 'c2' }]);
      expect(emptyShadow.querySelector('.xvt-picker-popover')).not.toBeNull();
    });

    it('1.4: replaces existing open popover when invoked again', () => {
      renderMediaPicker(shadowRoot, [{ id_str: 'c1' }, { id_str: 'c2' }]);
      expect(shadowRoot.querySelectorAll('.xvt-picker-item')).toHaveLength(2);

      renderMediaPicker(shadowRoot, [{ id_str: 'c3' }, { id_str: 'c4' }, { id_str: 'c5' }]);
      const popovers = shadowRoot.querySelectorAll('.xvt-picker-popover');
      expect(popovers).toHaveLength(1);
      expect(shadowRoot.querySelectorAll('.xvt-picker-item')).toHaveLength(3);
    });

    it('1.5: handles null or undefined shadowRoot gracefully without throwing', () => {
      expect(() => renderMediaPicker(null, [{ id_str: 'c1' }])).not.toThrow();
      const controller = renderMediaPicker(undefined, [{ id_str: 'c1' }]);
      expect(controller).toBeDefined();
      expect(typeof controller.destroy).toBe('function');
      expect(() => controller.destroy()).not.toThrow();
    });

    it('1.6: renders accessible header with title and close button', () => {
      renderMediaPicker(shadowRoot, [{ id_str: 'c1' }]);

      const header = shadowRoot.querySelector('.xvt-picker-header');
      expect(header).not.toBeNull();

      const title = shadowRoot.querySelector('.xvt-picker-title');
      expect(title).not.toBeNull();
      expect(title.textContent).toBe('Chọn video');

      const closeBtn = shadowRoot.querySelector('.xvt-picker-close');
      expect(closeBtn).not.toBeNull();
      expect(closeBtn.getAttribute('aria-label')).toBe('Đóng');
      expect(closeBtn.innerHTML).toMatch(/&times;|×/);
    });
  });

  // =========================================================================
  // 2. DISPLAYING CANDIDATE THUMBNAIL IMAGES, ASPECT RATIOS & RESOLUTIONS
  // =========================================================================
  describe('2. Candidate Metadata, Thumbnails, Aspect Ratios & Resolutions', () => {
    it('2.1: displays candidate thumbnail images with correct src and accessible alt text', () => {
      const candidates = [
        {
          id_str: 'v1',
          media_url_https: 'https://pbs.twimg.com/media/thumb1.jpg',
          video_info: { aspect_ratio: [16, 9] },
        },
        {
          id_str: 'v2',
          media_url_https: 'https://pbs.twimg.com/media/thumb2.jpg',
          video_info: { aspect_ratio: [9, 16] },
        },
      ];

      renderMediaPicker(shadowRoot, candidates);

      const thumbs = shadowRoot.querySelectorAll('.xvt-picker-thumb');
      expect(thumbs).toHaveLength(2);
      expect(thumbs[0].src).toBe('https://pbs.twimg.com/media/thumb1.jpg');
      expect(thumbs[0].alt).toBe('Thumbnail Video 1');
      expect(thumbs[1].src).toBe('https://pbs.twimg.com/media/thumb2.jpg');
      expect(thumbs[1].alt).toBe('Thumbnail Video 2');
    });

    it('2.2: handles candidate with missing thumbnail image gracefully', () => {
      const candidates = [
        { id_str: 'v1', type: 'video' }, // No media_url_https
        { id_str: 'v2', media_url_https: 'https://pbs.twimg.com/media/thumb2.jpg' },
      ];

      renderMediaPicker(shadowRoot, candidates);

      const items = shadowRoot.querySelectorAll('.xvt-picker-item');
      expect(items).toHaveLength(2);
      expect(items[0].querySelector('.xvt-picker-thumb')).toBeNull();
      expect(items[1].querySelector('.xvt-picker-thumb')).not.toBeNull();
    });

    it('2.3: displays candidate aspect ratios in metadata (16:9, 9:16, 1:1, 4:3)', () => {
      const candidates = [
        { id_str: 'v1', video_info: { aspect_ratio: [16, 9] } },
        { id_str: 'v2', video_info: { aspect_ratio: [9, 16] } },
        { id_str: 'v3', video_info: { aspect_ratio: [1, 1] } },
        { id_str: 'v4', video_info: { aspect_ratio: [4, 3] } },
      ];

      renderMediaPicker(shadowRoot, candidates);

      const metas = shadowRoot.querySelectorAll('.xvt-picker-meta');
      expect(metas).toHaveLength(4);
      expect(metas[0].textContent).toContain('16:9');
      expect(metas[1].textContent).toContain('9:16');
      expect(metas[2].textContent).toContain('1:1');
      expect(metas[3].textContent).toContain('4:3');
    });

    it('2.4: displays explicit candidate resolution when provided', () => {
      const candidates = [
        { id_str: 'v1', resolution: '1080p', video_info: { aspect_ratio: [16, 9] } },
        { id_str: 'v2', resolution: '720p', video_info: { aspect_ratio: [9, 16] } },
        { id_str: 'v3', resolution: '4K' },
      ];

      renderMediaPicker(shadowRoot, candidates);

      const metas = shadowRoot.querySelectorAll('.xvt-picker-meta');
      expect(metas[0].textContent).toContain('1080p');
      expect(metas[0].textContent).toContain('16:9');
      expect(metas[1].textContent).toContain('720p');
      expect(metas[1].textContent).toContain('9:16');
      expect(metas[2].textContent).toContain('4K');
    });

    it('2.5: extracts highest resolution from variants if explicit resolution is omitted', () => {
      const candidates = [
        {
          id_str: 'v1',
          video_info: {
            aspect_ratio: [16, 9],
            variants: [
              { bitrate: 288000, content_type: 'video/mp4', url: 'https://video.twimg.com/vid/avc1/640x360/vid.mp4' },
              { bitrate: 2176000, content_type: 'video/mp4', url: 'https://video.twimg.com/vid/avc1/1280x720/vid.mp4' },
              { bitrate: 4500000, content_type: 'video/mp4', url: 'https://video.twimg.com/vid/avc1/1920x1080/vid.mp4' },
            ],
          },
        },
      ];

      renderMediaPicker(shadowRoot, candidates);

      const meta = shadowRoot.querySelector('.xvt-picker-meta');
      // Should display aspect ratio and extracted resolution (1080p)
      expect(meta.textContent).toContain('16:9');
      expect(meta.textContent).toContain('1080p');
    });

    it('2.6: falls back to media type or default string when aspect ratio and resolution are missing', () => {
      const candidates = [
        { id_str: 'v1', type: 'animated_gif' },
        { id_str: 'v2' },
      ];

      renderMediaPicker(shadowRoot, candidates);

      const metas = shadowRoot.querySelectorAll('.xvt-picker-meta');
      expect(metas[0].textContent).toBe('animated_gif');
      expect(metas[1].textContent).toBe('MP4');
    });
  });

  // =========================================================================
  // 3. CANDIDATE SELECTION INTERACTIONS (CLICK & KEYBOARD)
  // =========================================================================
  describe('3. Candidate Selection Interactions', () => {
    it('3.1: clicking a candidate item invokes onSelect with selected media entity and index', () => {
      const candidates = [
        { id_str: 'c_0', media_url_https: 'https://pbs.twimg.com/media/t0.jpg' },
        { id_str: 'c_1', media_url_https: 'https://pbs.twimg.com/media/t1.jpg' },
        { id_str: 'c_2', media_url_https: 'https://pbs.twimg.com/media/t2.jpg' },
      ];

      const onSelect = vi.fn();
      renderMediaPicker(shadowRoot, candidates, { onSelect });

      const items = shadowRoot.querySelectorAll('.xvt-picker-item');
      items[1].dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

      expect(onSelect).toHaveBeenCalledTimes(1);
      expect(onSelect).toHaveBeenCalledWith(candidates[1], 1);

      // Popover must be unmounted on selection
      expect(shadowRoot.querySelector('.xvt-picker-popover')).toBeNull();
    });

    it('3.2: keyboard navigation (Enter key) selects candidate item', () => {
      const candidates = [{ id_str: 'c_0' }, { id_str: 'c_1' }];
      const onSelect = vi.fn();
      renderMediaPicker(shadowRoot, candidates, { onSelect });

      const items = shadowRoot.querySelectorAll('.xvt-picker-item');
      items[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

      expect(onSelect).toHaveBeenCalledTimes(1);
      expect(onSelect).toHaveBeenCalledWith(candidates[0], 0);
      expect(shadowRoot.querySelector('.xvt-picker-popover')).toBeNull();
    });

    it('3.3: keyboard navigation (Space key) selects candidate item', () => {
      const candidates = [{ id_str: 'c_0' }, { id_str: 'c_1' }];
      const onSelect = vi.fn();
      renderMediaPicker(shadowRoot, candidates, { onSelect });

      const items = shadowRoot.querySelectorAll('.xvt-picker-item');
      items[1].dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));

      expect(onSelect).toHaveBeenCalledTimes(1);
      expect(onSelect).toHaveBeenCalledWith(candidates[1], 1);
      expect(shadowRoot.querySelector('.xvt-picker-popover')).toBeNull();
    });

    it('3.4: ignores other keyboard keys (e.g. ArrowDown, Tab)', () => {
      const candidates = [{ id_str: 'c_0' }];
      const onSelect = vi.fn();
      renderMediaPicker(shadowRoot, candidates, { onSelect });

      const items = shadowRoot.querySelectorAll('.xvt-picker-item');
      items[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      items[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));

      expect(onSelect).not.toHaveBeenCalled();
      expect(shadowRoot.querySelector('.xvt-picker-popover')).not.toBeNull();
    });

    it('3.5: functions gracefully when onSelect callback is omitted', () => {
      const candidates = [{ id_str: 'c_0' }];
      renderMediaPicker(shadowRoot, candidates); // No callbacks

      const item = shadowRoot.querySelector('.xvt-picker-item');
      expect(() => item.dispatchEvent(new MouseEvent('click', { bubbles: true }))).not.toThrow();
      expect(shadowRoot.querySelector('.xvt-picker-popover')).toBeNull();
    });
  });

  // =========================================================================
  // 4. CLOSE BUTTON DISMISSAL
  // =========================================================================
  describe('4. Close Button Dismissal', () => {
    it('4.1: clicking close button (&times;) invokes onCancel and unmounts picker', () => {
      const candidates = [{ id_str: 'c_0' }];
      const onCancel = vi.fn();
      renderMediaPicker(shadowRoot, candidates, { onCancel });

      const closeBtn = shadowRoot.querySelector('.xvt-picker-close');
      expect(closeBtn).not.toBeNull();

      closeBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

      expect(onCancel).toHaveBeenCalledTimes(1);
      expect(shadowRoot.querySelector('.xvt-picker-popover')).toBeNull();
    });

    it('4.2: functions gracefully when onCancel callback is omitted', () => {
      const candidates = [{ id_str: 'c_0' }];
      renderMediaPicker(shadowRoot, candidates); // No callbacks

      const closeBtn = shadowRoot.querySelector('.xvt-picker-close');
      expect(() => closeBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }))).not.toThrow();
      expect(shadowRoot.querySelector('.xvt-picker-popover')).toBeNull();
    });
  });

  // =========================================================================
  // 5. ESCAPE KEY DISMISSAL
  // =========================================================================
  describe('5. Escape Key Dismissal', () => {
    it('5.1: pressing Escape on document invokes onCancel and unmounts picker', () => {
      const candidates = [{ id_str: 'c_0' }];
      const onCancel = vi.fn();
      renderMediaPicker(shadowRoot, candidates, { onCancel });

      expect(shadowRoot.querySelector('.xvt-picker-popover')).not.toBeNull();

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

      expect(onCancel).toHaveBeenCalledTimes(1);
      expect(shadowRoot.querySelector('.xvt-picker-popover')).toBeNull();
    });

    it('5.2: non-Escape keys on document do not dismiss picker', () => {
      const candidates = [{ id_str: 'c_0' }];
      const onCancel = vi.fn();
      renderMediaPicker(shadowRoot, candidates, { onCancel });

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true }));
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'x', bubbles: true }));

      expect(onCancel).not.toHaveBeenCalled();
      expect(shadowRoot.querySelector('.xvt-picker-popover')).not.toBeNull();
    });

    it('5.3: cleans up document keydown listener when unmounted', () => {
      const candidates = [{ id_str: 'c_0' }];
      const onCancel = vi.fn();
      const picker = renderMediaPicker(shadowRoot, candidates, { onCancel });

      picker.destroy();

      // Subsequent Escape should not trigger onCancel
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      expect(onCancel).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 6. OUTSIDE CLICK DISMISSAL
  // =========================================================================
  describe('6. Outside Click Dismissal', () => {
    it('6.1: clicking outside the popover invokes onCancel and dismisses picker', async () => {
      const candidates = [{ id_str: 'c_0' }, { id_str: 'c_1' }];
      const onCancel = vi.fn();
      renderMediaPicker(shadowRoot, candidates, { onCancel });

      // Allow deferred click listener attachment (setTimeout 0)
      await new Promise((r) => setTimeout(r, 10));

      expect(shadowRoot.querySelector('.xvt-picker-popover')).not.toBeNull();

      // Click outside on document body
      document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(onCancel).toHaveBeenCalledTimes(1);
      expect(shadowRoot.querySelector('.xvt-picker-popover')).toBeNull();
    });

    it('6.2: clicking inside the popover does NOT trigger outside click dismissal', async () => {
      const candidates = [{ id_str: 'c_0' }, { id_str: 'c_1' }];
      const onCancel = vi.fn();
      renderMediaPicker(shadowRoot, candidates, { onCancel });

      await new Promise((r) => setTimeout(r, 10));

      // Click on popover header
      const header = shadowRoot.querySelector('.xvt-picker-header');
      header.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(onCancel).not.toHaveBeenCalled();
      expect(shadowRoot.querySelector('.xvt-picker-popover')).not.toBeNull();
    });

    it('6.3: explicit destroy removes outside click listener without leaking callbacks', async () => {
      const candidates = [{ id_str: 'c_0' }];
      const onCancel = vi.fn();
      const picker = renderMediaPicker(shadowRoot, candidates, { onCancel });

      await new Promise((r) => setTimeout(r, 10));

      picker.destroy();

      // Click on document body
      document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(onCancel).not.toHaveBeenCalled();
    });
  });
});
