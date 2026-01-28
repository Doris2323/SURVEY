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

  this.ctx = ctx;
});
