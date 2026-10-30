// src/content/toolbar/toolbarStyles.js

/**
 * Encapsulated CSS stylesheet injected into Shadow DOM.
 * Ensures 0% CSS leakage between X (Twitter) and the extension toolbar.
 * 
 * Layout: Horizontal pill toolbar anchored at top-left corner of video.
 */
export const TOOLBAR_STYLES = `
:host {
  all: initial;
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 9999;
  display: block;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  box-sizing: border-box;
  pointer-events: auto;
}

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

/* Outer hit-box buffer wrapper (~6px padding) for anti-flicker pointer transitions */
.xvt-toolbar-container {
  position: relative;
  display: inline-flex;
  flex-direction: column;
  padding: 6px;
  margin: -6px;
  pointer-events: auto;
}

/* Horizontal Pill Toolbar */
.xvt-toolbar-pill,
.xvt-toolbar-vertical {
  display: inline-flex;
  flex-direction: row;
  align-items: center;
  height: 32px;
  padding: 2px 6px;
  background: rgba(15, 20, 25, 0.65);
  -webkit-backdrop-filter: blur(12px);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 9999px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
  gap: 2px;
  user-select: none;
  transition: opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1), transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), visibility 0.2s ease;
}

/* Visibility states */
.xvt-toolbar-container.xvt-idle .xvt-toolbar-pill,
.xvt-toolbar-container.xvt-idle .xvt-toolbar-vertical {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transform: translateY(-4px);
}
.xvt-toolbar-container.xvt-idle {
  pointer-events: none;
}

/* Ensure Media Picker popover retains pointer-events even if container enters idle or mouse drifts */
.xvt-toolbar-container.xvt-idle:has(.xvt-picker-popover),
.xvt-toolbar-container:has(.xvt-picker-popover),
.xvt-picker-popover {
  pointer-events: auto;
}

.xvt-toolbar-container.xvt-hovered .xvt-toolbar-pill,
.xvt-toolbar-container.xvt-hovered .xvt-toolbar-vertical,
.xvt-toolbar-container.xvt-processing .xvt-toolbar-pill,
.xvt-toolbar-container.xvt-processing .xvt-toolbar-vertical,
.xvt-toolbar-container.xvt-ambiguous .xvt-toolbar-pill,
.xvt-toolbar-container.xvt-ambiguous .xvt-toolbar-vertical,
.xvt-toolbar-container.xvt-success .xvt-toolbar-pill,
.xvt-toolbar-container.xvt-success .xvt-toolbar-vertical,
.xvt-toolbar-container.xvt-error .xvt-toolbar-pill,
.xvt-toolbar-container.xvt-error .xvt-toolbar-vertical,
.xvt-toolbar-container.xvt-unconfigured .xvt-toolbar-pill,
.xvt-toolbar-container.xvt-unconfigured .xvt-toolbar-vertical {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
  transform: translateY(0);
}
.xvt-toolbar-container.xvt-hovered,
.xvt-toolbar-container.xvt-processing,
.xvt-toolbar-container.xvt-ambiguous,
.xvt-toolbar-container.xvt-success,
.xvt-toolbar-container.xvt-error,
.xvt-toolbar-container.xvt-unconfigured {
  pointer-events: auto;
}

/* Dismissing state animation (~150ms) */
.xvt-toolbar-container.xvt-dismissing .xvt-toolbar-pill,
.xvt-toolbar-container.xvt-dismissing .xvt-toolbar-vertical {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transform: scale(0.92);
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.xvt-toolbar-container.xvt-dismissing {
  pointer-events: none;
}

/* Buttons inside pill: compact circular icon buttons */
.xvt-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  outline: none;
  background: transparent;
  color: #E7E9EA;
  cursor: pointer;
  border-radius: 9999px;
  line-height: 1;
  transition: background-color 0.15s ease, color 0.15s ease, transform 0.1s ease;
}

.xvt-btn:focus-visible {
  outline: 2px solid #1d9bf0;
  outline-offset: 1px;
}

.xvt-btn:active {
  transform: scale(0.92);
}

.xvt-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}

/* Primary Button: Tải video */
.xvt-btn-download:hover {
  background-color: rgba(29, 155, 240, 0.25);
  color: #1d9bf0;
}

/* Secondary Button: Mở CDN */
.xvt-btn-cdn:hover {
  background-color: rgba(255, 255, 255, 0.2);
  color: #FFFFFF;
}

/* Utility Button: Đóng / Ẩn */
.xvt-btn-dismiss {
  color: rgba(231, 233, 234, 0.65);
}

.xvt-btn-dismiss:hover {
  color: #FFFFFF;
  background-color: rgba(244, 33, 46, 0.2);
}

/* Divider line between buttons */
.xvt-divider {
  width: 1px;
  height: 16px;
  background-color: rgba(255, 255, 255, 0.15);
  margin: 0 1px;
}

/* Hover Tooltips: Floating popup below the button */
.xvt-tooltip {
  position: absolute;
  top: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.9);
  color: #FFFFFF;
  font-size: 11px;
  font-weight: 500;
  padding: 4px 8px;
  border-radius: 4px;
  white-space: nowrap;
  pointer-events: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.15);
  z-index: 10001;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.15s ease, visibility 0.15s ease, transform 0.15s ease;
}

.xvt-btn:hover .xvt-tooltip,
.xvt-btn:focus-visible .xvt-tooltip {
  opacity: 1;
  visibility: visible;
}

/* Feedback Notice Banner */
.xvt-notice {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  padding: 6px 10px;
  background: rgba(15, 20, 25, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  color: #E7E9EA;
  font-size: 11px;
  font-weight: 500;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  white-space: nowrap;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.2s ease, visibility 0.2s ease, transform 0.2s ease;
  pointer-events: none;
  z-index: 10001;
}

.xvt-notice.xvt-notice-visible {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
}

/* Spinner Animation */
@keyframes xvt-spin {
  to {
    transform: rotate(360deg);
  }
}

.xvt-spinner {
  animation: xvt-spin 1s linear infinite;
}
`;

/**
 * 16x16 SVG Icons
 */
export const ICONS = {
  DOWNLOAD: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v11m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2"/></svg>`,
  CDN: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/></svg>`,
  CLOSE: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>`,
  SPINNER: `<svg class="xvt-spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" stroke-opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>`,
  CHECKMARK: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00ba7c" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>`,
  ERROR: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f4212e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
};