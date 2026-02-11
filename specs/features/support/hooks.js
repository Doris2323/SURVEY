import { Before, After } from '@cucumber/cucumber';
import { loadGasCodeForTesting } from '../../../lib/gas-loader.js';

/**
 * 全局 Before hook - 所有 scenario 執行前自動載入 GAS 測試環境
 */
Before(function() {
  const ctx = loadGasCodeForTesting({
    sheets: {
      // 根據 specs/erm.dbml 配置
    }
  });

  // Clear all sheets for test isolation
  const ss = ctx.SpreadsheetApp.getActiveSpreadsheet();
  ['旅遊計畫', '住宿選項', '交通方式', '旅遊方案', '方案住宿安排', '方案交通安排'].forEach(sheetName => {
    const sheet = ss.getSheetByName(sheetName);
    if (sheet) sheet.clear();
  });

  // 設定默認的 mock 時間
  ctx._setMockTime('2026/1/27上午10:00:00');

  this.ctx = ctx;
});
