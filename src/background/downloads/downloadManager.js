// src/background/downloads/downloadManager.js

export const DOWNLOAD_STATES = Object.freeze({
  INITIATED: 'initiated',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  INTERRUPTED: 'interrupted',
  CANCELLED: 'cancelled',
  ERROR: 'error',
});

// Map of in-flight downloads keyed by videoKey: videoKey -> { downloadId, state, correlationId, ... }
const activeVideoDownloads = new Map();

// Map of downloadId -> { videoKey, resolve, reject, ... }
const trackedDownloadIds = new Map();

// Flag to ensure onChanged listener is registered only once
let hasRegisteredListener = false;

/**
 * Strips characters forbidden in file systems: \ / : * ? " < > |
 * 
 * @param {string} str
 * @returns {string}
 */
export function sanitizeFilenamePart(str) {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/[\\/:*?"<>|]/g, '_').trim();
}

/**
 * Builds standard filename: X_${username || 'video'}_${tweetId}.${extension}
 * Ensures no illegal characters and prevents double-extensions (.mp4.mp4).
 * 
 * @param {object|string} tweetInfoOrTweetId - Either tweetInfo object or tweetId string
 * @param {string} [username] - Tweet author username (if first arg is tweetId)
 * @param {string} [extension='mp4'] - File extension
 * @returns {string} Sanitized filename
 */
export function generateFilename(tweetInfoOrTweetId, username = '', extension = 'mp4') {
  let tweetId = '';
  let user = '';
  let ext = extension;

  if (tweetInfoOrTweetId && typeof tweetInfoOrTweetId === 'object') {
    tweetId = tweetInfoOrTweetId.tweetId || '';
    user = tweetInfoOrTweetId.username || '';
    ext = tweetInfoOrTweetId.extension || extension;
  } else {
    tweetId = String(tweetInfoOrTweetId || '');
    user = username;
  }

  // Sanitize extension (strip leading dot)
  ext = String(ext || 'mp4').replace(/^\.+/, '').trim() || 'mp4';

  // Sanitize user
  let userPart = 'video';
  if (user && typeof user === 'string' && user.trim() && user !== 'null' && user !== 'undefined') {
    userPart = sanitizeFilenamePart(user);
    if (!userPart) userPart = 'video';
  }

  // Sanitize tweetId
  const idPart = sanitizeFilenamePart(tweetId) || 'unknown';

  return `X_${userPart}_${idPart}.${ext}`;
}

/**
 * Alias for buildFilename matching interface contract
 */
export function buildFilename(tweetId, username = '', extension = 'mp4') {
  return generateFilename(tweetId, username, extension);
}

/**
 * Helper to safely broadcast download status events to a content script tab.
 */
function broadcastDownloadStatus(tabId, message) {
  if (typeof chrome !== 'undefined' && typeof chrome.tabs?.sendMessage === 'function' && tabId) {
    try {
      chrome.tabs.sendMessage(tabId, message, () => {
        if (chrome.runtime?.lastError) {
          // Tab may have navigated or closed, ignore safely
        }
      });
    } catch {
      // Ignore tab messaging error gracefully
    }
  }
}

/**
 * Initializes the global chrome.downloads.onChanged listener if not yet registered.
 */
function ensureDownloadListener() {
  if (hasRegisteredListener) return;
  if (typeof chrome === 'undefined' || !chrome.downloads?.onChanged?.addListener) return;

  chrome.downloads.onChanged.addListener((delta) => {
    if (!delta || !delta.id) return;
    const downloadId = delta.id;
    const task = trackedDownloadIds.get(downloadId);
    if (!task) return;

    if (delta.filename && delta.filename.current) {
      task.filename = delta.filename.current;
    }

    if (delta.state) {
      const currentState = delta.state.current;

      if (currentState === 'complete') {
        task.state = DOWNLOAD_STATES.COMPLETED;
        if (task.videoKey) activeVideoDownloads.delete(task.videoKey);
        trackedDownloadIds.delete(downloadId);

        broadcastDownloadStatus(task.tabId, {
          type: 'DOWNLOAD_STATUS_CHANGED',
          downloadId,
          videoKey: task.videoKey,
          state: 'complete',
          filename: task.filename,
        });

        if (typeof task.onComplete === 'function') {
          task.onComplete({ downloadId, state: DOWNLOAD_STATES.COMPLETED });
        }
        if (typeof task.resolve === 'function') {
          task.resolve({ success: true, downloadId, state: DOWNLOAD_STATES.COMPLETED });
        }
      } else if (currentState === 'interrupted') {
        const errorCurrent = delta.error?.current || 'UNKNOWN_ERROR';
        const isUserCancel = errorCurrent === 'USER_CANCELED';

        task.state = isUserCancel ? DOWNLOAD_STATES.CANCELLED : DOWNLOAD_STATES.INTERRUPTED;
        if (task.videoKey) activeVideoDownloads.delete(task.videoKey);
        trackedDownloadIds.delete(downloadId);

        if (isUserCancel) {
          broadcastDownloadStatus(task.tabId, {
            type: 'DOWNLOAD_STATUS_CHANGED',
            downloadId,
            videoKey: task.videoKey,
            state: 'cancelled',
          });

          if (typeof task.onCancel === 'function') {
            task.onCancel({ downloadId, state: DOWNLOAD_STATES.CANCELLED });
          }
          if (typeof task.resolve === 'function') {
            task.resolve({ success: true, downloadId, state: DOWNLOAD_STATES.CANCELLED, cancelled: true });
          }
        } else {
          console.error('[X Video Tools] Download interrupted:', {
            downloadId,
            videoKey: task.videoKey,
            error: errorCurrent,
          });

          const errorMsg = 'Quá trình tải video bị gián đoạn do lỗi kết nối mạng.';
          broadcastDownloadStatus(task.tabId, {
            type: 'DOWNLOAD_STATUS_CHANGED',
            downloadId,
            videoKey: task.videoKey,
            state: 'interrupted',
            error: errorCurrent,
            message: errorMsg,
          });

          if (typeof task.onError === 'function') {
            task.onError({ downloadId, error: errorCurrent, message: errorMsg });
          }
          if (typeof task.reject === 'function') {
            const err = new Error(errorMsg);
            Object.assign(err, { downloadId, error: errorCurrent, state: DOWNLOAD_STATES.INTERRUPTED });
            task.reject(err);
          }
        }
      }
    }
  });

  hasRegisteredListener = true;
}

/**
 * Starts a download via chrome.downloads.download and tracks its lifecycle.
 * 
 * @param {object} params
 * @param {string} params.url - URL to download
 * @param {string} [params.filename] - Target filename
 * @param {string} [params.tweetId] - Tweet ID
 * @param {string} [params.username] - Tweet author username
 * @param {string} [params.videoKey] - Unique key per video entity
 * @param {string} [params.correlationId] - Unique request correlation ID
 * @returns {Promise<{ success: boolean, downloadId?: number, filename?: string, error?: string }>}
 */
export async function startDownload(params = {}) {
  ensureDownloadListener();

  if (!params.url || typeof params.url !== 'string') {
    return {
      success: false,
      error: 'INVALID_URL',
      message: 'Thiếu đường dẫn tải tệp.',
    };
  }

  const downloadOptions = {
    url: params.url,
    conflictAction: 'uniquify',
    saveAs: params.saveAs !== undefined ? params.saveAs : false,
  };

  // Only pass filename if explicitly specified by caller.
  // When omitted, Chrome relies on the server's native filename and preserves
  // the user's last chosen directory in the Save As dialog.
  let filename = params.filename;
  if (filename && typeof filename === 'string') {
    filename = sanitizeFilenamePart(filename);
    if (!filename.endsWith('.mp4') && !filename.endsWith('.gif') && !filename.endsWith('.mp3')) {
      filename += '.mp4';
    }
    downloadOptions.filename = filename;
  }

  try {
    const downloadId = await chrome.downloads.download(downloadOptions);

    return {
      success: true,
      downloadId,
      filename,
    };
  } catch (err) {
    console.error('[X Video Tools] chrome.downloads.download failed:', {
      error: err.message,
      stack: err.stack,
      url: params.url,
      filename,
    });
    return {
      success: false,
      error: 'DOWNLOAD_FAILED',
      message: err.message || 'Không thể bắt đầu tải tệp.',
    };
  }
}

/**
 * Tracks a download lifecycle via callbacks or returned promise.
 * 
 * @param {number} downloadId
 * @param {object} [callbacks]
 * @param {string} [callbacks.videoKey]
 * @param {number} [callbacks.tabId]
 * @param {string} [callbacks.filename]
 * @param {(res: object) => void} [callbacks.onComplete]
 * @param {(err: object) => void} [callbacks.onError]
 * @param {(res: object) => void} [callbacks.onCancel]
 * @returns {Promise<object>}
 */
export function trackDownload(downloadId, callbacks = {}) {
  ensureDownloadListener();

  return new Promise((resolve, reject) => {
    trackedDownloadIds.set(downloadId, {
      downloadId,
      videoKey: callbacks.videoKey,
      tabId: callbacks.tabId,
      filename: callbacks.filename,
      state: DOWNLOAD_STATES.IN_PROGRESS,
      onComplete: callbacks.onComplete,
      onError: callbacks.onError,
      onCancel: callbacks.onCancel,
      resolve,
      reject,
    });
  });
}

/**
 * High-level download initiator with anti-duplicate lock per video entity.
 * 
 * @param {string} videoKey - Canonical unique video key
 * @param {object} params - Download params { url, filename, tweetId, username, correlationId, tabId }
 * @returns {Promise<object>}
 */
export async function initiateDownload(videoKey, params = {}) {
  if (videoKey && activeVideoDownloads.has(videoKey)) {
    const active = activeVideoDownloads.get(videoKey);
    if (active.state === DOWNLOAD_STATES.IN_PROGRESS || active.state === DOWNLOAD_STATES.INITIATED) {
      return {
        blocked: true,
        success: false,
        reason: 'DOWNLOAD_IN_PROGRESS',
        message: 'Video này đang trong quá trình tải xuống.',
      };
    }
  }

  // Acquire lock
  const correlationId = params.correlationId || `${videoKey}_${Date.now()}`;
  if (videoKey) {
    activeVideoDownloads.set(videoKey, {
      state: DOWNLOAD_STATES.INITIATED,
      correlationId,
      startTime: Date.now(),
    });
  }

  try {
    const res = await startDownload(params);
    if (!res.success) {
      if (videoKey) activeVideoDownloads.delete(videoKey);
      return res;
    }

    if (videoKey) {
      const active = activeVideoDownloads.get(videoKey);
      if (active) {
        active.downloadId = res.downloadId;
        active.state = DOWNLOAD_STATES.IN_PROGRESS;
      }
    }

    // Attach tracking
    trackDownload(res.downloadId, {
      videoKey,
      tabId: params.tabId,
      filename: res.filename,
    }).catch(() => {
      // Handled by tracker
    });

    return {
      success: true,
      downloadId: res.downloadId,
      filename: res.filename,
      correlationId,
    };
  } catch (err) {
    console.error('[X Video Tools] initiateDownload error:', {
      videoKey,
      error: err.message,
      stack: err.stack,
    });
    if (videoKey) activeVideoDownloads.delete(videoKey);
    return {
      success: false,
      error: 'DOWNLOAD_EXCEPTION',
      message: err.message,
    };
  }
}

/**
 * Resets tracked state (primarily for test harness cleanup).
 */
export function resetDownloadManager() {
  activeVideoDownloads.clear();
  trackedDownloadIds.clear();
}
