// src/popup/popup.js
import { getSettings } from '../shared/utils/storage.js';

document.addEventListener('DOMContentLoaded', async () => {
  console.log('[X Video Tools] Popup DOM ready');
  try {
    const settings = await getSettings();
    console.log('[X Video Tools] Settings khởi tạo:', settings);
  } catch (error) {
    console.error('[X Video Tools] Lỗi khi nạp settings trong popup:', error);
  }
});
