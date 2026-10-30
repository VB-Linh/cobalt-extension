// tests/content/toolbar/scenarios.test.js
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  setupToolbarTestEnv,
  teardownToolbarTestEnv,
  getToolbarHost,
  getShadowRoot,
  getToolbarButtons,
  simulatePointerEvent,
} from '../../fixtures/toolbarFixture.js';
import { attachToolbar, detachToolbar, getToolbar } from '../../../src/content/toolbar/index.js';
import { TOOLBAR_STATES } from '../../../src/content/toolbar/toolbarState.js';
import { createVideoObserver } from '../../../src/content/observers/videoObserver.js';
import { detectVideos, findTweetContainer } from '../../../src/content/detection/index.js';
import { extractTweetInfo } from '../../../src/content/extraction/index.js';

describe('Phase 2 R8: 20 Mandatory Acceptance Scenarios', () => {
  let env;

  beforeEach(() => {
    vi.useFakeTimers();
    env = setupToolbarTestEnv({ tweetId: '1900000000000000000' });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    teardownToolbarTestEnv(env);
  });

  // ==========================================
  // NHÓM A: TOOLBAR RENDERING (Scenarios 1–5)
  // ==========================================

  it('Scenario 1: Toolbar xuất hiện trong Open Shadow DOM với cấu trúc pill và 3 nút phân cấp', () => {
    const { video, videoWrapper, stateStore } = env;
    const controller = attachToolbar(video, { tweetId: '1900000000000000000' }, { stateStore });

    expect(controller).not.toBeNull();
    const host = getToolbarHost(videoWrapper);
    expect(host).not.toBeNull();
    expect(host.shadowRoot).not.toBeNull();

    const { downloadBtn, cdnBtn, dismissBtn } = getToolbarButtons(host);
    expect(downloadBtn).not.toBeNull();
    expect(cdnBtn).not.toBeNull();
    expect(dismissBtn).not.toBeNull();

    // Check SVG icons (~16x16)
    expect(downloadBtn.querySelector('svg')).not.toBeNull();
    expect(cdnBtn.querySelector('svg')).not.toBeNull();
    expect(dismissBtn.querySelector('svg')).not.toBeNull();

    // Check isolation
    expect(document.querySelector('.xvt-btn-download')).toBeNull();
  });

  it('Scenario 2: Neo đúng video wrapper tại góc trên bên trái (top: 10px, left: 10px, z-index: 9999)', () => {
    const { video, videoWrapper, stateStore } = env;
    attachToolbar(video, { tweetId: '1900000000000000000' }, { stateStore });
    const host = getToolbarHost(videoWrapper);

    expect(host.style.position).toBe('absolute');
    expect(host.style.top).toBe('10px');
    expect(host.style.left).toBe('10px');
    expect(host.style.zIndex).toBe('9999');
    expect(videoWrapper.style.position).toBe('relative');
  });

  it('Scenario 3: Hai video trong cùng tweet có hai toolbar riêng biệt, độc lập', () => {
    teardownToolbarTestEnv(env);
    env = setupToolbarTestEnv({
      tweetId: '1900000000000000001',
      videoIndices: [1, 2],
    });

    const [v1, v2] = env.videos;
    const c1 = attachToolbar(v1, { tweetId: '1900000000000000001', mediaIndex: 1 }, { stateStore: env.stateStore });
    const c2 = attachToolbar(v2, { tweetId: '1900000000000000001', mediaIndex: 2 }, { stateStore: env.stateStore });

    expect(c1).not.toBe(c2);
    expect(c1.host).not.toBe(c2.host);
    expect(c1.shadowRoot).not.toBe(c2.shadowRoot);
  });

  it('Scenario 4: Không tạo toolbar trùng lặp khi attachToolbar được gọi nhiều lần trên cùng một video', () => {
    const { video, videoWrapper, stateStore } = env;
    const c1 = attachToolbar(video, { tweetId: '1900000000000000000' }, { stateStore });
    const c2 = attachToolbar(video, { tweetId: '1900000000000000000' }, { stateStore });

    expect(c1).toBe(c2);
    expect(videoWrapper.querySelectorAll('.xvt-toolbar-host').length).toBe(1);
  });

  it('Scenario 5: Không làm thay đổi kích thước, vị trí hay layout của tweet chứa video', () => {
    const { tweet, video, videoWrapper, stateStore } = env;
    const initialChildrenCount = videoWrapper.children.length;

    attachToolbar(video, { tweetId: '1900000000000000000' }, { stateStore });

    // Host is added as absolute overlay, tweet header and video element are completely intact
    expect(videoWrapper.children.length).toBe(initialChildrenCount + 1);
    expect(tweet.querySelector('video')).toBe(video);
  });

  // ==========================================
  // NHÓM B: HOVER & ANTI-FLICKER (Scenarios 6–10)
  // ==========================================

  it('Scenario 6: Di chuyển chuột vào video làm toolbar xuất hiện (idle -> hovered)', () => {
    const { video, videoWrapper, stateStore } = env;
    const controller = attachToolbar(video, { tweetId: '1900000000000000000' }, { stateStore });

    expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.IDLE);
    simulatePointerEvent(videoWrapper, 'mouseenter');
    expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.HOVERED);
  });

  it('Scenario 7: Di chuyển chuột từ video sang toolbar trong khoảng 300ms duy trì hiển thị, không flicker', () => {
    const { video, videoWrapper, stateStore } = env;
    const controller = attachToolbar(video, { tweetId: '1900000000000000000' }, { stateStore });
    const host = getToolbarHost(videoWrapper);

    simulatePointerEvent(videoWrapper, 'mouseenter');
    simulatePointerEvent(videoWrapper, 'mouseleave');

    // Move to toolbar host at 100ms
    vi.advanceTimersByTime(100);
    simulatePointerEvent(host, 'mouseenter');

    // Advance 400ms further
    vi.advanceTimersByTime(400);

    expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.HOVERED);
  });

  it('Scenario 8: Grace period 300ms hoạt động chính xác: rời chuột quá 300ms toolbar tự ẩn', () => {
    const { video, videoWrapper, stateStore } = env;
    const controller = attachToolbar(video, { tweetId: '1900000000000000000' }, { stateStore });

    simulatePointerEvent(videoWrapper, 'mouseenter');
    simulatePointerEvent(videoWrapper, 'mouseleave');

    vi.advanceTimersByTime(250);
    expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.HOVERED);

    vi.advanceTimersByTime(60); // 310ms total
    expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.IDLE);
  });

  it('Scenario 9: Hủy timeout khi chuột quay lại video hoặc toolbar trước 300ms', () => {
    const { video, videoWrapper, stateStore } = env;
    const controller = attachToolbar(video, { tweetId: '1900000000000000000' }, { stateStore });

    simulatePointerEvent(videoWrapper, 'mouseenter');
    simulatePointerEvent(videoWrapper, 'mouseleave');

    vi.advanceTimersByTime(200);
    simulatePointerEvent(videoWrapper, 'mouseenter');

    vi.advanceTimersByTime(300);
    expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.HOVERED);
  });

  it('Scenario 10: Nhiều video cùng hiển thị không ảnh hưởng trạng thái hover của nhau', () => {
    teardownToolbarTestEnv(env);
    env = setupToolbarTestEnv({
      tweetId: '1900000000000000002',
      videoIndices: [1, 2],
    });

    const [v1, v2] = env.videos;
    const w1 = v1.closest('[data-testid="videoComponent"]');
    const w2 = v2.closest('[data-testid="videoComponent"]');

    const c1 = attachToolbar(v1, { tweetId: '1900000000000000002', mediaIndex: 1 }, { stateStore: env.stateStore });
    const c2 = attachToolbar(v2, { tweetId: '1900000000000000002', mediaIndex: 2 }, { stateStore: env.stateStore });

    simulatePointerEvent(w1, 'mouseenter');
    expect(c1.stateManager.getState()).toBe(TOOLBAR_STATES.HOVERED);
    expect(c2.stateManager.getState()).toBe(TOOLBAR_STATES.IDLE);

    simulatePointerEvent(w1, 'mouseleave');
    simulatePointerEvent(w2, 'mouseenter');
    vi.advanceTimersByTime(310);

    expect(c1.stateManager.getState()).toBe(TOOLBAR_STATES.IDLE);
    expect(c2.stateManager.getState()).toBe(TOOLBAR_STATES.HOVERED);
  });

  // ==========================================
  // NHÓM C: BUTTON INTERACTION (Scenarios 11–15)
  // ==========================================

  it('Scenario 11: Click "Tải video" không gửi request mạng, hiển thị thông báo chưa cấu hình', () => {
    const { video, videoWrapper, stateStore } = env;
    const controller = attachToolbar(video, { tweetId: '1900000000000000000' }, { stateStore });
    const host = getToolbarHost(videoWrapper);
    const { downloadBtn, noticeEl } = getToolbarButtons(host);

    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const dlSpy = vi.spyOn(chrome.downloads, 'download');

    simulatePointerEvent(downloadBtn, 'click');

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(dlSpy).not.toHaveBeenCalled();
    expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.UNCONFIGURED);
    expect(noticeEl.classList.contains('xvt-notice-visible')).toBe(true);
  });

  it('Scenario 12: Click "Mở CDN" không mở URL giả hay request mạng, hiển thị thông báo Phase 3', () => {
    const { video, videoWrapper, stateStore } = env;
    const controller = attachToolbar(
      video,
      { tweetId: '1900000000000000000' },
      { stateStore, enableCdnResolver: false }
    );
    const host = getToolbarHost(videoWrapper);
    const { cdnBtn, noticeEl } = getToolbarButtons(host);

    const tabSpy = vi.spyOn(chrome.tabs, 'create');
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    simulatePointerEvent(cdnBtn, 'click');

    expect(tabSpy).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.UNCONFIGURED);
    expect(noticeEl.textContent).toContain('Phase 3');
  });

  it('Scenario 13: Click "Đóng / Ẩn" fade-out và chỉ dismiss video hiện tại, đồng bộ VideoStateStore', () => {
    teardownToolbarTestEnv(env);
    env = setupToolbarTestEnv({
      tweetId: '1900000000000000003',
      videoIndices: [1, 2],
    });

    const [v1, v2] = env.videos;
    const c1 = attachToolbar(v1, { tweetId: '1900000000000000003', mediaIndex: 1 }, { stateStore: env.stateStore });
    const c2 = attachToolbar(v2, { tweetId: '1900000000000000003', mediaIndex: 2 }, { stateStore: env.stateStore });

    const { dismissBtn: d1 } = getToolbarButtons(c1.host);
    simulatePointerEvent(d1, 'click');

    expect(c1.stateManager.getState()).toBe(TOOLBAR_STATES.DISMISSED);
    expect(env.stateStore.isDismissed(undefined, v1)).toBe(true);
    expect(c2.stateManager.getState()).toBe(TOOLBAR_STATES.IDLE);
    expect(env.stateStore.isDismissed(undefined, v2)).toBe(false);

    vi.advanceTimersByTime(160);
    expect(c1.host.parentNode).toBeNull();
  });

  it('Scenario 14: Hai nút chưa tích hợp hiển thị phản hồi/tooltip rõ ràng cho người dùng', () => {
    const { video, videoWrapper, stateStore } = env;
    attachToolbar(video, { tweetId: '1900000000000000000' }, { stateStore });
    const host = getToolbarHost(videoWrapper);

    const tooltips = Array.from(host.shadowRoot.querySelectorAll('.xvt-tooltip'));
    expect(tooltips.length).toBe(2);
    expect(tooltips[0].textContent).toContain('Tải');
    expect(tooltips[1].textContent).toContain('Link');
    expect(host.shadowRoot.querySelector('.xvt-btn-dismiss .xvt-tooltip')).toBeNull();
  });

  it('Scenario 15: Click liên tục (rapid clicks) không tạo nhiều thao tác thừa hay crash lỗi', () => {
    const { video, videoWrapper, stateStore } = env;
    const controller = attachToolbar(video, { tweetId: '1900000000000000000' }, { stateStore });
    const host = getToolbarHost(videoWrapper);
    const { downloadBtn } = getToolbarButtons(host);

    for (let i = 0; i < 8; i++) {
      simulatePointerEvent(downloadBtn, 'click');
      vi.advanceTimersByTime(25);
    }

    expect(controller.stateManager.getState()).toBe(TOOLBAR_STATES.UNCONFIGURED);
    expect(host.shadowRoot.querySelectorAll('.xvt-notice').length).toBe(1);
  });

  // ==========================================
  // NHÓM D: STATE & LIFECYCLE (Scenarios 16–20)
  // ==========================================

  it('Scenario 16: Toolbar không phục hồi trên video đã dismissed khi MutationObserver quét DOM lại', () => {
    const { root, video, videoWrapper, stateStore } = env;
    const observer = createVideoObserver({
      root,
      stateStore,
      detectVideos,
      findTweetContainer,
      extractTweetInfo,
      onVideoDetected: (v, info) => attachToolbar(v, info, { stateStore }),
    });

    observer.start();
    const controller = getToolbar(video);
    expect(controller).not.toBeNull();

    controller.dismiss();
    vi.advanceTimersByTime(160);

    observer.scan();
    vi.advanceTimersByTime(50);

    expect(getToolbarHost(videoWrapper)).toBeNull();
    observer.stop();
  });

  it('Scenario 17: Virtual scrolling không tạo toolbar trùng lặp, khôi phục dismissed theo canonical key', () => {
    teardownToolbarTestEnv(env);
    env = setupToolbarTestEnv({
      tweetId: '1900000000000000004',
      videoIndices: [1],
    });

    const { video, videoWrapper, stateStore } = env;
    const tweetInfo = { tweetId: '1900000000000000004', mediaIndex: 1 };
    const controller = attachToolbar(video, tweetInfo, { stateStore });

    controller.dismiss();
    vi.advanceTimersByTime(160);

    // Simulate DOM recycle
    detachToolbar(video);
    videoWrapper.innerHTML = '';

    const newVideo = document.createElement('video');
    newVideo.src = 'blob:https://x.com/vid-recycled';
    const link = document.createElement('a');
    link.href = 'https://x.com/testuser/status/1900000000000000004/video/1';
    link.appendChild(newVideo);
    videoWrapper.appendChild(link);

    const reattach = attachToolbar(newVideo, tweetInfo, { stateStore });
    expect(reattach).toBeNull();
    expect(getToolbarHost(videoWrapper)).toBeNull();
  });

  it('Scenario 18: X re-render tweet và thay thế video không để lại toolbar mồ côi trên DOM', () => {
    const { root, video, videoWrapper, stateStore } = env;
    attachToolbar(video, { tweetId: '1900000000000000000' }, { stateStore });
    expect(getToolbarHost(videoWrapper)).not.toBeNull();

    detachToolbar(video);

    expect(getToolbarHost(videoWrapper)).toBeNull();
    expect(root.querySelectorAll('.xvt-toolbar-host').length).toBe(0);
  });

  it('Scenario 19: Cleanup listener và timer khi video bị xóa hoặc destroy() được gọi', () => {
    const { video, videoWrapper, stateStore } = env;
    const controller = attachToolbar(video, { tweetId: '1900000000000000000' }, { stateStore });

    simulatePointerEvent(videoWrapper, 'mouseenter');
    simulatePointerEvent(videoWrapper, 'mouseleave');
    expect(controller.eventController.getHideTimer()).not.toBeNull();

    controller.destroy();
    expect(controller.eventController.getHideTimer()).toBeNull();

    expect(() => vi.advanceTimersByTime(500)).not.toThrow();
  });

  it('Scenario 20: Toolbar sử dụng đúng và đồng bộ trực tiếp với VideoStateStore của Phase 1', () => {
    const { video, stateStore } = env;
    const tweetInfo = { tweetId: '1900000000000000000', mediaIndex: null };
    const controller = attachToolbar(video, tweetInfo, { stateStore });

    expect(stateStore.isDismissed(undefined, video)).toBe(false);

    controller.dismiss();

    expect(video.dataset.xvtDismissed).toBe('true');
    expect(stateStore.isDismissed(undefined, video)).toBe(true);
    expect(stateStore.getDismissedCount()).toBe(1);
  });
});
