// src/popup/popup.js
import { getSettings, saveSettings } from '../shared/utils/storage.js';
import { normalizeCobaltUrl, validateCobaltUrl, extractOriginPattern } from '../shared/utils/urlHelper.js';
import { checkServerHealth } from '../background/clients/cobaltClient.js';
import { AUTH_STATES } from '../shared/constants/index.js';
import { formatErrorMessage } from '../shared/utils/errorHelper.js';

/**
 * Sets up password show/hide toggle behavior on API Key input.
 * 
 * @param {HTMLInputElement} inputEl
 * @param {HTMLElement} toggleBtnEl
 */
export function setupApiKeyToggle(inputEl, toggleBtnEl) {
  if (!inputEl || !toggleBtnEl) return;

  toggleBtnEl.addEventListener('click', (e) => {
    e.preventDefault();
    if (inputEl.type === 'password') {
      inputEl.type = 'text';
      toggleBtnEl.textContent = '🔒';
      toggleBtnEl.setAttribute('aria-label', 'Ẩn API Key');
    } else {
      inputEl.type = 'password';
      toggleBtnEl.textContent = '👁';
      toggleBtnEl.setAttribute('aria-label', 'Hiện API Key');
    }
  });
}

/**
 * Updates status card presentation.
 * 
 * @param {string} text
 * @param {'connected'|'unconfigured'|'error'|'warning'|'busy'} type
 */
export function setStatusBadge(text, type = 'unconfigured') {
  const indicator = document.getElementById('statusIndicator');
  const textEl = document.getElementById('statusText');
  if (!indicator || !textEl) return;

  indicator.className = 'status-indicator';
  indicator.classList.add(`status-${type}`);
  textEl.textContent = formatErrorMessage(text);
}

/**
 * Shows temporary or sticky notice banner in popup.
 * 
 * @param {string} message
 * @param {'success'|'error'|'info'} [type='info']
 */
export function showNotice(message, type = 'info') {
  const noticeEl = document.getElementById('popupNotice');
  if (!noticeEl) return;

  const text = formatErrorMessage(message);
  noticeEl.className = 'popup-notice';
  noticeEl.classList.add(`notice-${type}`);
  noticeEl.textContent = text;
  noticeEl.style.display = 'block';
}

/**
 * Clears notice banner.
 */
export function clearNotice() {
  const noticeEl = document.getElementById('popupNotice');
  if (!noticeEl) return;
  noticeEl.style.display = 'none';
  noticeEl.textContent = '';
}

/**
 * Updates Turnstile session authentication state and presentation in popup.
 * 
 * @param {string} state - One of AUTH_STATES
 * @param {object} [details={}]
 */
export function setTurnstileStatus(state, details = {}) {
  const badgeEl = document.getElementById('turnstileBadge');
  const noticeEl = document.getElementById('turnstileNotice');
  const containerEl = document.getElementById('turnstileContainer');
  const btnReauthEl = document.getElementById('btnReauth');

  if (!badgeEl || !noticeEl) return;

  badgeEl.className = 'turnstile-badge';

  switch (state) {
    case AUTH_STATES.REACHABLE:
      badgeEl.classList.add('badge-authenticated');
      badgeEl.textContent = 'Máy chủ sẵn sàng';
      noticeEl.textContent = 'Máy chủ phản hồi tốt (không yêu cầu Turnstile).';
      if (btnReauthEl) btnReauthEl.style.display = 'none';
      break;

    case AUTH_STATES.TURNSTILE_REQUIRED:
      badgeEl.classList.add('badge-waiting');
      badgeEl.textContent = 'Cần Turnstile';
      noticeEl.textContent = 'Máy chủ yêu cầu xác thực phiên Turnstile để tải video.';
      if (btnReauthEl) btnReauthEl.style.display = 'none';
      break;

    case AUTH_STATES.WAITING_VERIFICATION:
      badgeEl.classList.add('badge-waiting');
      badgeEl.textContent = 'Chờ giải đố';
      noticeEl.textContent = 'Đang chờ bạn hoàn thành xác thực Cloudflare Turnstile bên dưới...';
      if (containerEl) containerEl.style.display = 'flex';
      if (btnReauthEl) btnReauthEl.style.display = 'none';
      break;

    case AUTH_STATES.AUTHENTICATED:
      badgeEl.classList.add('badge-authenticated');
      badgeEl.textContent = 'Đã xác thực (JWT)';
      const expText = details.expiresIn ? ` (còn ${details.expiresIn}s)` : '';
      noticeEl.textContent = `Phiên Bearer JWT đã được xác thực thành công${expText}. Bạn đã có thể tải video!`;
      if (btnReauthEl) btnReauthEl.style.display = 'none';
      break;

    case AUTH_STATES.EXPIRED:
      badgeEl.classList.add('badge-expired');
      badgeEl.textContent = 'Đã hết hạn';
      noticeEl.textContent = 'Phiên xác thực Turnstile đã hết hạn. Vui lòng bấm Xác thực lại để tiếp tục tải.';
      if (btnReauthEl) btnReauthEl.style.display = 'block';
      break;

    case AUTH_STATES.FAILED:
    default:
      badgeEl.classList.add('badge-failed');
      badgeEl.textContent = 'Xác thực thất bại';
      noticeEl.textContent = details.message || 'Không thể xác thực phiên với máy chủ. Vui lòng thử lại hoặc sử dụng API Key.';
      if (btnReauthEl) btnReauthEl.style.display = 'block';
      break;
  }
}

/**
 * Triggers the Turnstile widget inside the sandboxed iframe.
 * 
 * @param {string} sitekey
 */
export function renderTurnstileWidget(sitekey) {
  const section = document.getElementById('turnstileSection');
  const frame = document.getElementById('turnstileFrame');
  if (!section || !frame || !sitekey) return;

  section.style.display = 'flex';
  setTurnstileStatus(AUTH_STATES.WAITING_VERIFICATION);

  const message = { action: 'RENDER_TURNSTILE', sitekey };
  try {
    frame.contentWindow?.postMessage(message, '*');
  } catch {
    // ignore
  }
}

/**
 * Performs connection test against configured Cobalt instance.
 * 
 * @param {string} url
 * @param {string} [apiKey]
 * @returns {Promise<{ healthy: boolean, version?: string, message?: string, error?: string }>}
 */
export async function testConnection(url, apiKey = '') {
  const validation = validateCobaltUrl(url);
  if (!validation.valid) {
    return {
      healthy: false,
      error: validation.error || 'INVALID_URL',
      message: 'Đường dẫn máy chủ Cobalt không hợp lệ.',
    };
  }

  // Request host permission if needed before testing
  const originPattern = extractOriginPattern(url);
  if (originPattern && chrome.permissions?.request) {
    try {
      const hasPerm = await chrome.permissions.contains({ origins: [originPattern] });
      if (!hasPerm) {
        const granted = await chrome.permissions.request({ origins: [originPattern] });
        if (!granted) {
          return {
            healthy: false,
            error: 'PERMISSION_DENIED',
            message: 'Cần cấp quyền truy cập để kiểm tra kết nối tới máy chủ.',
          };
        }
      }
    } catch (err) {
      return {
        healthy: false,
        error: 'PERMISSION_ERROR',
        message: err.message,
      };
    }
  }

  try {
    const health = await checkServerHealth(url, apiKey);
    return health;
  } catch (err) {
    return {
      healthy: false,
      error: 'TEST_EXCEPTION',
      message: err.message || 'Lỗi khi kiểm tra kết nối.',
    };
  }
}

/**
 * Saves instance settings and requests host permission dynamically.
 * 
 * @param {string} url
 * @param {string} [apiKey]
 * @param {string} [videoQuality='max']
 * @returns {Promise<{ success: boolean, settings?: object, error?: string, message?: string }>}
 */
export async function handleSaveInstance(url, apiKey = '', videoQuality = 'max') {
  clearNotice();

  if (!url || !url.trim()) {
    showNotice('Vui lòng nhập URL máy chủ Cobalt.', 'error');
    setStatusBadge('Chưa cấu hình', 'unconfigured');
    return { success: false, error: 'EMPTY_URL', message: 'Vui lòng nhập URL máy chủ Cobalt.' };
  }

  const validation = validateCobaltUrl(url);
  if (!validation.valid) {
    const msg = validation.error === 'INVALID_PROTOCOL'
      ? 'Chỉ chấp nhận giao thức http:// hoặc https://'
      : 'URL máy chủ Cobalt không hợp lệ.';
    showNotice(msg, 'error');
    setStatusBadge('Lỗi định dạng', 'error');
    return { success: false, error: validation.error, message: msg };
  }

  const normalizedUrl = normalizeCobaltUrl(url);
  const originPattern = extractOriginPattern(normalizedUrl);

  // Request host permission using optional_host_permissions
  if (originPattern && chrome.permissions?.request) {
    try {
      const hasPerm = await chrome.permissions.contains({ origins: [originPattern] });
      if (!hasPerm) {
        const granted = await chrome.permissions.request({ origins: [originPattern] });
        if (!granted) {
          showNotice('Bạn đã từ chối cấp quyền truy cập máy chủ Cobalt.', 'error');
          setStatusBadge('Cần cấp quyền', 'warning');
          return {
            success: false,
            error: 'PERMISSION_DENIED',
            message: 'Bạn đã từ chối cấp quyền truy cập máy chủ Cobalt.',
          };
        }
      }
    } catch (err) {
      showNotice(`Lỗi quyền: ${err.message}`, 'error');
      return { success: false, error: 'PERMISSION_ERROR', message: err.message };
    }
  }

  try {
    const saved = await saveSettings({
      cobaltUrl: normalizedUrl,
      apiKey: apiKey ? apiKey.trim() : '',
      videoQuality: videoQuality || 'max',
    });

    showNotice('Đã lưu cấu hình thành công!', 'success');
    setStatusBadge('Đã lưu cấu hình', 'saved');
    return { success: true, settings: saved };
  } catch (err) {
    showNotice(`Không thể lưu cài đặt: ${err.message}`, 'error');
    return { success: false, error: 'STORAGE_ERROR', message: err.message };
  }
}

// Bind DOM handlers when running in browser extension context
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', async () => {
    const urlInput = document.getElementById('cobaltUrl');
    const keyInput = document.getElementById('apiKey');
    const qualitySelect = document.getElementById('videoQuality');
    const toggleKeyBtn = document.getElementById('toggleApiKey');
    const btnTest = document.getElementById('btnTest');
    const btnSave = document.getElementById('btnSave');
    const form = document.getElementById('settingsForm');

    if (keyInput && toggleKeyBtn) {
      setupApiKeyToggle(keyInput, toggleKeyBtn);
    }

    // Load initial settings
    try {
      const settings = await getSettings();
      if (urlInput && settings.cobaltUrl) {
        urlInput.value = settings.cobaltUrl;
      }
      if (keyInput && settings.apiKey) {
        keyInput.value = settings.apiKey;
      }
      if (qualitySelect && settings.videoQuality) {
        qualitySelect.value = settings.videoQuality;
      }

      if (settings.cobaltUrl) {
        setStatusBadge('Đã lưu cấu hình', 'saved');
        if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
          try {
            chrome.runtime.sendMessage({
              action: 'GET_SESSION_STATUS',
              payload: { instanceUrl: settings.cobaltUrl },
            }, (sessionRes) => {
              if (sessionRes && sessionRes.authenticated) {
                const section = document.getElementById('turnstileSection');
                if (section) section.style.display = 'flex';
                setTurnstileStatus(AUTH_STATES.AUTHENTICATED, { expiresIn: sessionRes.expiresIn });
              } else if (sessionRes && sessionRes.expired) {
                const section = document.getElementById('turnstileSection');
                if (section) section.style.display = 'flex';
                setTurnstileStatus(AUTH_STATES.EXPIRED);
              }
            });
          } catch {
            // ignore
          }
        }
      } else {
        setStatusBadge('Chưa cấu hình', 'unconfigured');
      }
    } catch (err) {
      console.error('[X Video Tools] Lỗi nạp settings:', err);
    }

    // Test Connection Button click
    if (btnTest) {
      btnTest.addEventListener('click', async () => {
        clearNotice();
        const url = urlInput?.value?.trim() || '';
        const key = keyInput?.value?.trim() || '';

        if (!url) {
          showNotice('Vui lòng nhập URL trước khi kiểm tra.', 'error');
          return;
        }

        setStatusBadge('Đang kiểm tra...', 'busy');
        btnTest.disabled = true;

        const res = await testConnection(url, key);
        btnTest.disabled = false;

        const isLocalhost = Boolean(
          url.includes('localhost') ||
          url.includes('127.0.0.1') ||
          url.includes('[::1]')
        );

        if (res.healthy) {
          const ver = res.version ? ` (v${res.version})` : '';
          const quality = qualitySelect?.value || 'max';
          await handleSaveInstance(url, key, quality);
          if (res.turnstileRequired && !key) {
            const section = document.getElementById('turnstileSection');
            if (section) section.style.display = 'flex';
            if (res.turnstileSitekey) {
              renderTurnstileWidget(res.turnstileSitekey);
            } else {
              setTurnstileStatus(AUTH_STATES.TURNSTILE_REQUIRED);
            }
            setStatusBadge('Cần xác thực Turnstile', 'warning');
            showNotice(`Máy chủ Cobalt${ver} yêu cầu xác thực phiên Turnstile. Vui lòng hoàn thành giải đố bên dưới.`, 'info');
          } else {
            const section = document.getElementById('turnstileSection');
            if (section) section.style.display = 'none';
            setStatusBadge(`Đang hoạt động${ver}`, 'connected');
            showNotice(`Kết nối máy chủ Cobalt thành công${ver} và đã lưu cấu hình!`, 'success');
          }
        } else {
          if (isLocalhost) {
            setStatusBadge('Cobalt chưa chạy (port 9000)', 'error');
            showNotice('Cobalt local chưa khởi động. Vui lòng chạy file scripts\\start-cobalt-windows.bat', 'error');
          } else {
            setStatusBadge('Không thể kết nối', 'error');
            showNotice(res.message || 'Không thể kết nối đến máy chủ Cobalt. Vui lòng kiểm tra lại URL hoặc mạng.', 'error');
          }
        }
      });
    }

    // Listen for Turnstile verification events from sandboxed iframe
    window.addEventListener('message', async (event) => {
      const data = event.data;
      if (!data) return;

      if (data.type === 'TURNSTILE_SUCCESS' && data.token) {
        const url = urlInput?.value?.trim() || '';
        if (!url) return;

        setTurnstileStatus(AUTH_STATES.WAITING_VERIFICATION);
        const noticeEl = document.getElementById('turnstileNotice');
        if (noticeEl) noticeEl.textContent = 'Đang gửi mã xác thực tới máy chủ Cobalt...';

        if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
          try {
            chrome.runtime.sendMessage({
              action: 'VERIFY_SESSION',
              payload: {
                instanceUrl: url,
                turnstileResponse: data.token,
              },
            }, (sessionRes) => {
              if (sessionRes && sessionRes.success) {
                setTurnstileStatus(AUTH_STATES.AUTHENTICATED, { expiresIn: sessionRes.exp });
                setStatusBadge('Đã xác thực phiên', 'connected');
                showNotice('Xác thực phiên Turnstile thành công!', 'success');
              } else {
                setTurnstileStatus(AUTH_STATES.FAILED, {
                  message: sessionRes?.message || 'Máy chủ từ chối mã xác thực Turnstile.',
                });
              }
            });
          } catch (err) {
            setTurnstileStatus(AUTH_STATES.FAILED, { message: err.message });
          }
        }
      }

      if (data.type === 'TURNSTILE_ERROR') {
        setTurnstileStatus(AUTH_STATES.FAILED, {
          message: 'Cloudflare Turnstile từ chối widget hoặc không cho phép tên miền tiện ích (' + (data.errorCode || 'Domain policy') + '). Nếu máy chủ chặn tiện ích, bạn cần sử dụng API Key do chủ máy chủ cấp.',
        });
      }

      if (data.type === 'TURNSTILE_EXPIRED') {
        setTurnstileStatus(AUTH_STATES.EXPIRED);
      }
    });

    const btnReauth = document.getElementById('btnReauth');
    if (btnReauth) {
      btnReauth.addEventListener('click', () => {
        const frame = document.getElementById('turnstileFrame');
        if (frame) {
          frame.src = 'sandbox.html';
          setTurnstileStatus(AUTH_STATES.WAITING_VERIFICATION);
        }
      });
    }

    // Save Settings Submit
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const url = urlInput?.value?.trim() || '';
        const key = keyInput?.value?.trim() || '';
        const quality = qualitySelect?.value || 'max';

        if (btnSave) btnSave.disabled = true;
        await handleSaveInstance(url, key, quality);
        if (btnSave) btnSave.disabled = false;
      });
    }
  });
}
