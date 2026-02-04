import { Before, After } from '@cucumber/cucumber';
import { loadGasCodeForTesting } from '../../lib/gas-loader.js';

/**
 * 全局 Before hook - 所有 scenario 執行前自動載入 GAS 測試環境
 */
Before(function() {
  const ctx = loadGasCodeForTesting({
    sheets: {
      '打卡記錄': ['類型', '時間', 'createdAt']
    }
  });

  // Clear sheet for test isolation
  const sheet = ctx.SpreadsheetApp.getActiveSpreadsheet().getSheetByName('打卡記錄');
  sheet.clear();
  
  // 設定默認的 mock 時間為 2026/1/27 上午 10:00:00
  // 這樣所有沒有明確指定時間的打卡操作都會使用這個時間
  ctx._setMockTime('2026/1/27上午10:00:00');

  this.ctx = ctx;
});
