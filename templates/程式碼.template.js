/**
 * 打卡系統 - Apps Script 程式碼
 *
 * 這個檔案是你要實作的 GAS 程式碼
 * 請使用 BDD 流程：綁定 → 紅燈 → 綠燈 → 重構
 */

// ========== 常數 ==========

const SHEET_NAME = '打卡記錄';

// ========== Web App 入口 ==========

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('打卡系統')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ========== 打卡功能 ==========
// TODO: 使用 BDD 流程實作以下功能

// function punch(type) {
//   // 實作打卡功能
// }

// function getTodayRecords() {
//   // 實作查詢今日記錄
// }

// function getRecordsForWeb() {
//   // 實作給前端的 API
// }
