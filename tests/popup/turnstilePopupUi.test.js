// tests/popup/turnstilePopupUi.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setTurnstileStatus, renderTurnstileWidget } from '../../src/popup/popup.js';
import { AUTH_STATES } from '../../src/shared/constants/index.js';

describe('Popup Turnstile Authentication UI States', () => {
  let badgeEl;
  let noticeEl;
  let containerEl;
  let btnReauthEl;
  let sectionEl;
  let frameEl;

  beforeEach(() => {
    document.body.innerHTML = `
      <section id="turnstileSection" style="display: none;">
        <span id="turnstileBadge"></span>
        <div id="turnstileNotice"></div>
        <div id="turnstileContainer"></div>
        <button id="btnReauth" style="display: none;"></button>
        <div id="turnstileFrame"></div>
      </section>
    `;

    badgeEl = document.getElementById('turnstileBadge');
    noticeEl = document.getElementById('turnstileNotice');
    containerEl = document.getElementById('turnstileContainer');
    btnReauthEl = document.getElementById('btnReauth');
    sectionEl = document.getElementById('turnstileSection');
    frameEl = document.getElementById('turnstileFrame');
  });

  it('State 1: REACHABLE: indicates server is reachable without Turnstile', () => {
    setTurnstileStatus(AUTH_STATES.REACHABLE);

    expect(badgeEl.textContent).toContain('Máy chủ sẵn sàng');
    expect(badgeEl.classList.contains('badge-authenticated')).toBe(true);
    expect(btnReauthEl.style.display).toBe('none');
  });

  it('State 2: TURNSTILE_REQUIRED: indicates instance requires Turnstile verification', () => {
    setTurnstileStatus(AUTH_STATES.TURNSTILE_REQUIRED);

    expect(badgeEl.textContent).toContain('Cần Turnstile');
    expect(badgeEl.classList.contains('badge-waiting')).toBe(true);
    expect(noticeEl.textContent).toContain('yêu cầu xác thực phiên Turnstile');
    expect(btnReauthEl.style.display).toBe('none');
  });

  it('State 3: WAITING_VERIFICATION: displays container and waiting prompt', () => {
    setTurnstileStatus(AUTH_STATES.WAITING_VERIFICATION);

    expect(badgeEl.textContent).toContain('Chờ giải đố');
    expect(badgeEl.classList.contains('badge-waiting')).toBe(true);
    expect(containerEl.style.display).toBe('flex');
    expect(btnReauthEl.style.display).toBe('none');
  });

  it('State 4: AUTHENTICATED: indicates active Bearer JWT session with remaining lifetime', () => {
    setTurnstileStatus(AUTH_STATES.AUTHENTICATED, { expiresIn: 175 });

    expect(badgeEl.textContent).toContain('Đã xác thực (JWT)');
    expect(badgeEl.classList.contains('badge-authenticated')).toBe(true);
    expect(noticeEl.textContent).toContain('175s');
    expect(btnReauthEl.style.display).toBe('none');
  });

  it('State 5: EXPIRED: indicates session expired and displays re-authentication button', () => {
    setTurnstileStatus(AUTH_STATES.EXPIRED);

    expect(badgeEl.textContent).toContain('Đã hết hạn');
    expect(badgeEl.classList.contains('badge-expired')).toBe(true);
    expect(btnReauthEl.style.display).toBe('block');
  });

  it('State 6: FAILED: indicates verification rejection and displays retry button', () => {
    const errorMsg = 'Cloudflare Turnstile từ chối widget: Domain policy violation.';
    setTurnstileStatus(AUTH_STATES.FAILED, { message: errorMsg });

    expect(badgeEl.textContent).toContain('Xác thực thất bại');
    expect(badgeEl.classList.contains('badge-failed')).toBe(true);
    expect(noticeEl.textContent).toBe(errorMsg);
    expect(btnReauthEl.style.display).toBe('block');
  });

  it('renderTurnstileWidget: reveals section and sends RENDER_TURNSTILE message to iframe', () => {
    const postMessageSpy = vi.fn();
    frameEl.contentWindow = { postMessage: postMessageSpy };

    renderTurnstileWidget('0x4AAAAAA-test-sitekey');

    expect(sectionEl.style.display).toBe('flex');
    expect(badgeEl.textContent).toContain('Chờ giải đố');
    expect(postMessageSpy).toHaveBeenCalledWith({
      action: 'RENDER_TURNSTILE',
      sitekey: '0x4AAAAAA-test-sitekey',
    }, '*');
  });
});
