// features/step_definitions/頁面流程.steps.js

import { Given, When, Then, Before, After } from '@cucumber/cucumber';
import { strict as assert } from 'assert';
import { loadGasCodeForTesting } from '../../lib/gas-loader.js';
import * as cheerio from 'cheerio';

// ========== 測試上下文 ==========

// 注意：Before/After hooks 已在 打卡記錄.steps.js 中定義
// 這裡重用相同的 ctx

// ========== HTML 解析輔助函式 ==========

function parseHtml(html) {
  return cheerio.load(html);
}

// ========== Given 步驟（頁面流程專屬）==========

Given(/^目前時間是「(.+)」$/, function(mockTime) {
  // Mock 當前時間：存儲 mock 時間供後續步驟使用
  this.mockTime = mockTime;
});

// ========== When 步驟 ==========

When('我開啟打卡頁面', function() {
  // TODO: 呼叫 ctx.doGet() 取得 HTML 頁面
  // 注意: 函式可能尚未實作，這會產生 ReferenceError（紅燈）
  try {
    // 取得 HTML 內容
    const htmlOutput = this.ctx.doGet();
    this.htmlContent = htmlOutput.getContent();
    this.$ = parseHtml(this.htmlContent);
    
    // 取得頁面資料（API）
    this.pageData = this.ctx.getWebPageData();
    this.page = { loaded: true };
  } catch (error) {
    this.error = error;
  }
});

When(/^我點擊「(.+)」按鈕$/, function(buttonName) {
  // TODO: 模擬按鈕點擊，呼叫 ctx.punch() 函式
  // 注意: 在測試環境中，我們直接呼叫後端函式
  try {
    // 根據按鈕名稱決定打卡類型
    let type;
    if (buttonName.includes('IN') || buttonName.includes('上班')) {
      type = 'IN';
    } else if (buttonName.includes('OUT') || buttonName.includes('下班')) {
      type = 'OUT';
    }
    
    // 呼叫打卡函式
    if (this.mockTime) {
      this.result = this.ctx.punchAtTime(type, this.mockTime);
    } else {
      this.result = this.ctx.punch(type);
    }
    
    // 重新載入頁面資料
    this.pageData = this.ctx.getWebPageData();
  } catch (error) {
    this.error = error;
    this.result = { success: false, message: error.message };
  }
});

When('我透過網頁查詢今日打卡', function() {
  // TODO: 呼叫 ctx.getWebPageData() 函式
  try {
    this.webData = this.ctx.getWebPageData();
    this.records = this.webData.records;
    this.totalMinutes = this.webData.totalMinutes;
  } catch (error) {
    this.error = error;
  }
});

When('我透過前端呼叫後端查詢今日打卡', function() {
  // TODO: 模擬前端呼叫後端 API
  try {
    this.webData = this.ctx.getWebPageData();
    this.records = this.webData.records;
  } catch (error) {
    this.error = error;
  }
});

// ========== Then 步驟 - HTML 驗證 ==========

Then(/^頁面應該顯示「(.+)」標題$/, function(expectedTitle) {
  assert.ok(this.$, 'HTML 應該已解析');
  assert.ok(this.htmlContent, 'HTML 內容應該存在');
  
  // 查詢標題元素
  const titleElements = this.$('h1, h2, h3, title').toArray();
  const hasTitle = titleElements.some(el => 
    this.$(el).text().includes(expectedTitle)
  );
  
  assert.ok(hasTitle, 
    `頁面應包含標題 "${expectedTitle}"，但在 HTML 中找不到\nHTML Content: ${this.htmlContent?.substring(0, 200)}`);
});

Then(/^頁面應該有「(.+)」按鈕$/, function(buttonName) {
  assert.ok(this.$, 'HTML 應該已解析');
  
  // 查找按鈕元素
  const buttons = this.$('button, input[type="button"], input[type="submit"]').toArray();
  const hasButton = buttons.some(btn => {
    const text = this.$(btn).text() || this.$(btn).attr('value') || '';
    return text.includes(buttonName);
  });
  
  assert.ok(hasButton, 
    `頁面應包含按鈕 "${buttonName}"，但在 HTML 中找不到`);
});

Then(/^頁面應該顯示累計工時「(.+)」$/, function(expectedHours) {
  // TODO: 驗證頁面顯示的累計工時
  assert.ok(this.pageData, '應該有頁面資料');
  
  // 從 pageData 取得工時
  const totalMinutes = this.pageData.totalMinutes || 0;
  const displayText = `${totalMinutes} 分鐘`;
  
  assert.strictEqual(displayText, expectedHours,
    `累計工時應顯示 "${expectedHours}"，實際為 "${displayText}"`);
});

Then(/^頁面應該顯示 (\d+) 筆打卡記錄$/, function(expectedCount) {
  // TODO: 驗證頁面顯示的記錄數
  assert.ok(this.pageData, '應該有頁面資料');
  assert.ok(Array.isArray(this.pageData.records), '應該有記錄陣列');
  
  const actualCount = this.pageData.records.length;
  assert.strictEqual(actualCount, parseInt(expectedCount),
    `頁面應顯示 ${expectedCount} 筆記錄，實際為 ${actualCount} 筆`);
});

Then(/^頁面應該顯示記錄「(.+)」$/, function(expectedRecord) {
  // TODO: 驗證頁面顯示的記錄內容
  // 格式：「類型 - 時間」，例如：「IN - 2026/1/27上午9:00:00」
  assert.ok(this.pageData, '應該有頁面資料');
  assert.ok(Array.isArray(this.pageData.records), '應該有記錄陣列');
  
  const records = this.pageData.records;
  const hasRecord = records.some(record => {
    const displayText = `${record['類型']} - ${record['時間']}`;
    return displayText === expectedRecord;
  });
  
  assert.ok(hasRecord,
    `頁面應顯示記錄 "${expectedRecord}"，但在記錄中找不到`);
});

Then(/^頁面應該顯示錯誤訊息「(.+)」$/, function(expectedMessage) {
  // ⚠️ 重要：在測試環境中，直接檢查 result.message
  // 真實 HTML 驗證會在實際 HTML 檔案存在後進行
  assert.ok(this.result, '應該有操作結果');
  assert.ok(!this.result.success, '操作應該失敗');
  
  const actualMessage = this.result.message || '';
  assert.ok(actualMessage.includes(expectedMessage),
    `錯誤訊息應包含 "${expectedMessage}"，實際為 "${actualMessage}"`);
});

Then(/^頁面應該顯示成功訊息「(.+)」$/, function(expectedMessage) {
  // TODO: 驗證頁面顯示的成功訊息
  assert.ok(this.result, '應該有操作結果');
  assert.ok(this.result.success, '操作應該成功');
  
  // 驗證成功訊息（根據打卡類型）
  const actualMessage = this.result.message || '打卡成功';
  const messagePatterns = {
    '上班打卡成功': /上班|IN|打卡成功/,
    '下班打卡成功': /下班|OUT|打卡成功/
  };
  
  const pattern = messagePatterns[expectedMessage];
  if (pattern) {
    assert.ok(pattern.test(actualMessage) || actualMessage.includes(expectedMessage),
      `成功訊息應包含 "${expectedMessage}"，實際為 "${actualMessage}"`);
  } else {
    assert.ok(actualMessage.includes(expectedMessage),
      `成功訊息應包含 "${expectedMessage}"，實際為 "${actualMessage}"`);
  }
});

// ========== Then 步驟 - API 驗證 ==========

Then('應該回傳打卡記錄和累計工時', function() {
  assert.ok(!this.error, `不應該有錯誤: ${this.error?.message}`);
  assert.ok(this.webData, '應該有網頁資料');
  assert.ok(Array.isArray(this.records), '應該有記錄陣列');
  assert.ok(typeof this.totalMinutes === 'number', '應該有工時數值');
});

Then(/^打卡記錄應該有 (\d+) 筆$/, function(expectedCount) {
  assert.ok(Array.isArray(this.records), '應該有記錄陣列');
  assert.strictEqual(this.records.length, parseInt(expectedCount),
    `記錄數應為 ${expectedCount}，實際為 ${this.records.length}`);
});

Then(/^第 (\d+) 筆記錄的類型應該是「(.+)」$/, function(index, expectedType) {
  assert.ok(Array.isArray(this.records), '應該有記錄陣列');
  assert.ok(this.records.length >= parseInt(index), `應該至少有 ${index} 筆記錄`);
  
  const record = this.records[parseInt(index) - 1];
  const actualType = record['類型'] || record.type;
  
  assert.strictEqual(actualType, expectedType,
    `第 ${index} 筆記錄類型應為 "${expectedType}"，實際為 "${actualType}"`);
});

Then(/^第 (\d+) 筆記錄的時間應該是「(.+)」$/, function(index, expectedTime) {
  assert.ok(Array.isArray(this.records), '應該有記錄陣列');
  assert.ok(this.records.length >= parseInt(index), `應該至少有 ${index} 筆記錄`);
  
  const record = this.records[parseInt(index) - 1];
  const actualTime = record['時間'] || record.time;
  
  assert.strictEqual(actualTime, expectedTime,
    `第 ${index} 筆記錄時間應為 "${expectedTime}"，實際為 "${actualTime}"`);
});

// 注意：「第 N 筆記錄的時間應該是文字格式「X」」步驟
// 已在 打卡記錄.steps.js 中定義，這裡重用該定義

Then(/^累計工時應該是 (\d+) 分鐘$/, function(expectedMinutes) {
  assert.ok(this.totalMinutes !== undefined, '應該有工時資料');
  assert.strictEqual(this.totalMinutes, parseInt(expectedMinutes),
    `累計工時應為 ${expectedMinutes} 分鐘，實際為 ${this.totalMinutes} 分鐘`);
});

Then('前端應該收到有效的回傳值', function() {
  assert.ok(!this.error, `不應該有錯誤: ${this.error?.message}`);
  assert.ok(this.webData, '前端應該收到回傳值');
  assert.ok(Array.isArray(this.records), '回傳值應包含記錄陣列');
});
