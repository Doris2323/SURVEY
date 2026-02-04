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
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * 封裝給前端呼叫的 API
 */
function apiClockIn(type) {
  try {
    return clockIn(type);
  } catch (e) {
    throw new Error(e.message);
  }
}

function apiGetTodayData() {
  try {
    return {
      records: getTodayRecords(),
      workHours: getTodayWorkHours()
    };
  } catch (e) {
    throw new Error(e.message);
  }
}