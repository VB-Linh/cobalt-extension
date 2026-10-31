// src/content/cdn/mediaPicker.js

/**
 * Encapsulated CSS for the Media Picker Popover inside Shadow DOM.
 */
const MEDIA_PICKER_STYLES = `
.xvt-picker-popover {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  min-width: 200px;
  max-width: 300px;
  background: rgba(15, 20, 25, 0.95);
  -webkit-backdrop-filter: blur(16px);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
  padding: 8px;
  z-index: 10002;
  color: #E7E9EA;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  animation: xvt-popover-in 0.18s cubic-bezier(0.16, 1, 0.3, 1);
  pointer-events: auto;
}

@keyframes xvt-popover-in {
  from {
    opacity: 0;
    transform: translateY(-6px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.xvt-picker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 6px 6px 6px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 6px;
}

.xvt-picker-title {
  font-size: 11px;
  font-weight: 600;
  color: #71767B;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.xvt-picker-close {
  background: transparent;
  border: none;
  color: #71767B;
  cursor: pointer;
  padding: 2px;
  border-radius: 4px;
  line-height: 1;
  font-size: 14px;
}

.xvt-picker-close:hover {
  color: #FFFFFF;
  background: rgba(255, 255, 255, 0.1);
}

.xvt-picker-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 220px;
  overflow-y: auto;
}

.xvt-picker-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  cursor: pointer;
  transition: background 0.15s ease, transform 0.1s ease;
  user-select: none;
}

.xvt-picker-item:hover,
.xvt-picker-item:focus-visible {
  background: rgba(29, 155, 240, 0.25);
  outline: none;
}

.xvt-picker-item:active {
  transform: scale(0.98);
}

.xvt-picker-thumb {
  width: 44px;
  height: 32px;
  border-radius: 4px;
  object-fit: cover;
  background: #000000;
  flex-shrink: 0;
}

.xvt-picker-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow: hidden;
}

.xvt-picker-label {
  font-size: 12px;
  font-weight: 600;
  color: #FFFFFF;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.xvt-picker-meta {
  font-size: 10px;
  color: #71767B;
}
`;

/**
 * Extracts candidate resolution string if present in candidate metadata or variants.
 * 
 * @param {object} candidate
 * @returns {string | null} E.g. "1080p", "720p", "1920x1080", or null
 */
function getCandidateResolution(candidate) {
  if (!candidate || typeof candidate !== 'object') return null;

  // 1. Explicit resolution property (e.g. "1080p", "720p")
  if (candidate.resolution) {
    const res = String(candidate.resolution).trim();
    if (res.length > 0) return res;
  }

  // 2. Extract highest resolution from video_info.variants
  const variants = candidate.video_info?.variants;
  if (Array.isArray(variants) && variants.length > 0) {
    let bestHeight = 0;
    let bestWidth = 0;
    for (const v of variants) {
      if (!v || typeof v.url !== 'string') continue;
      const match = v.url.match(/\/(\d+)x(\d+)\//);
      if (match) {
        const w = Number(match[1]);
        const h = Number(match[2]);
        if (!isNaN(w) && !isNaN(h) && (w * h > bestWidth * bestHeight)) {
          bestWidth = w;
          bestHeight = h;
        }
      }
    }
    if (bestHeight > 0) {
      return `${bestHeight}p`;
    }
  }

  return null;
}

/**
 * Renders a compact Media Picker popover in the toolbar Shadow DOM.
 * 
 * @param {ShadowRoot} shadowRoot
 * @param {Array<object>} candidates - Array of candidate video items
 * @param {object} callbacks
 * @param {(selectedMedia: object, index: number) => void} callbacks.onSelect
 * @param {() => void} [callbacks.onCancel]
 * @returns {{ destroy: () => void }} Controller to unmount the popover
 */
export function renderMediaPicker(shadowRoot, candidates = [], { onSelect, onCancel } = {}) {
  if (!shadowRoot) {
    return { destroy: () => {} };
  }

  // Remove existing picker if already open
  const existing = shadowRoot.querySelector('.xvt-picker-popover');
  if (existing) {
    existing.remove();
  }

  // Inject styles if not present
  let styleEl = shadowRoot.querySelector('#xvt-picker-styles');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'xvt-picker-styles';
    styleEl.textContent = MEDIA_PICKER_STYLES;
    shadowRoot.appendChild(styleEl);
  }

  const popover = document.createElement('div');
  popover.className = 'xvt-picker-popover';
  popover.setAttribute('role', 'dialog');
  popover.setAttribute('aria-label', 'Chọn video để mở');

  const header = document.createElement('div');
  header.className = 'xvt-picker-header';

  const title = document.createElement('span');
  title.className = 'xvt-picker-title';
  title.textContent = 'Chọn video';

  const closeBtn = document.createElement('button');
  closeBtn.className = 'xvt-picker-close';
  closeBtn.setAttribute('aria-label', 'Đóng');
  closeBtn.innerHTML = '&times;';

  header.appendChild(title);
  header.appendChild(closeBtn);
  popover.appendChild(header);

  const list = document.createElement('div');
  list.className = 'xvt-picker-list';
  list.setAttribute('role', 'menu');

  candidates.forEach((candidate, idx) => {
    const itemEl = document.createElement('div');
    itemEl.className = 'xvt-picker-item';
    itemEl.setAttribute('role', 'menuitem');
    itemEl.setAttribute('tabindex', '0');

    // Thumbnail image
    if (candidate.media_url_https) {
      const thumb = document.createElement('img');
      thumb.className = 'xvt-picker-thumb';
      thumb.src = candidate.media_url_https;
      thumb.alt = `Thumbnail Video ${idx + 1}`;
      itemEl.appendChild(thumb);
    }

    const info = document.createElement('div');
    info.className = 'xvt-picker-info';

    const label = document.createElement('span');
    label.className = 'xvt-picker-label';
    label.textContent = `Video ${idx + 1}`;

    const meta = document.createElement('span');
    meta.className = 'xvt-picker-meta';

    let aspectStr = null;
    if (candidate.video_info?.aspect_ratio) {
      const [w, h] = candidate.video_info.aspect_ratio;
      aspectStr = `${w}:${h}`;
    }

    const resStr = getCandidateResolution(candidate);

    if (aspectStr && resStr) {
      meta.textContent = `${aspectStr} • ${resStr}`;
    } else if (aspectStr) {
      meta.textContent = aspectStr;
    } else if (resStr) {
      meta.textContent = resStr;
    } else {
      meta.textContent = candidate.type || 'MP4';
    }

    info.appendChild(label);
    info.appendChild(meta);
    itemEl.appendChild(info);

    // Event listeners
    const selectHandler = (e) => {
      if (e && e.button !== undefined && e.button !== 0) return;
      e.stopPropagation();
      e.preventDefault();
      destroy();
      if (typeof onSelect === 'function') {
        onSelect(candidate, idx);
      }
    };

    itemEl.addEventListener('pointerdown', selectHandler);
    itemEl.addEventListener('click', selectHandler);
    itemEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        selectHandler(e);
      }
    });

    list.appendChild(itemEl);
  });

  popover.appendChild(list);

  let outsideTimer = null;

  // Close handlers
  function destroy() {
    if (outsideTimer !== null) {
      clearTimeout(outsideTimer);
      outsideTimer = null;
    }
    document.removeEventListener('click', onOutsideClick, true);
    document.removeEventListener('keydown', onKeyDown);
    if (popover.parentNode) {
      popover.parentNode.removeChild(popover);
    }
  }

  function handleCancel(e) {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    destroy();
    if (typeof onCancel === 'function') {
      onCancel();
    }
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') {
      handleCancel(e);
    }
  }

  function onOutsideClick(e) {
    const path = typeof e.composedPath === 'function' ? e.composedPath() : [];
    if (path.includes(popover) || (popover.contains && popover.contains(e.target))) {
      return;
    }
    handleCancel(e);
  }

  closeBtn.addEventListener('pointerdown', (e) => {
    if (e.button === 0) handleCancel(e);
  });
  closeBtn.addEventListener('click', handleCancel);
  document.addEventListener('keydown', onKeyDown);

  // Defer listener registration to prevent the current opening click from immediately closing the popover
  outsideTimer = setTimeout(() => {
    document.addEventListener('click', onOutsideClick, true);
  }, 0);

  const container = shadowRoot.querySelector('.xvt-toolbar-container') || shadowRoot;
  container.appendChild(popover);

  return { destroy };
}
