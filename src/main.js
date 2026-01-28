/**
 * 打卡系統 - Apps Script 程式碼
 *
 * 這個檔案是你要實作的 GAS 程式碼
 * 請使用 BDD 流程：綁定 → 紅燈 → 綠燈 → 重構
 */

// ========== Web App 入口 ==========

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('打卡系統')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}