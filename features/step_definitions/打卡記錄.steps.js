// features/step_definitions/打卡記錄.steps.js

import { Given, When, Then, Before, After } from '@cucumber/cucumber';
import { strict as assert } from 'assert';
import { loadGasCodeForTesting } from '../../lib/gas-loader.js';

// ========== 測試上下文 ==========

let ctx;  // GAS 執行環境

Before(function() {
  // 初始化 GAS 測試環境
  ctx = loadGasCodeForTesting({
    sheets: {
      // 打卡記錄工作表結構：UUID | 類型 | 時間 | createdAt
      '打卡記錄': ['UUID', '類型', '時間', 'createdAt']
    }
  });
  
  // ⚠️ 重要：測試隔離 - 清空工作表（確保每個 Scenario 獨立執行）
  // 注意：loadGasCodeForTesting 已經創建工作表並添加標題列
  // 這裡重新清空並添加標題列，確保每個場景開始時狀態一致
  const sheet = ctx.SpreadsheetApp.getActiveSpreadsheet().getSheetByName('打卡記錄');
  const data = sheet.getDataRange().getValues();
  // 只保留標題列，刪除其他行
  if (data.length > 1) {
    sheet.deleteRows(2, data.length - 1);
  }
  
  // 將 ctx 存到 this 上下文，讓其他 step definition 也能訪問
  this.ctx = ctx;
});

After(function() {
  // 清理測試環境
  ctx._clearAllSheets();
});

// ========== Given 步驟 ==========

Given(/^系統已準備好「(.+)」工作表$/, function(sheetName) {
  // Mock 策略: SpreadsheetApp.getActiveSpreadsheet + getSheetByName
  const sheet = this.ctx.SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  assert.ok(sheet, `工作表 "${sheetName}" 應該存在`);
});

Given('今日無打卡記錄', function() {
  // 確保工作表只有標題列（已經在 Before hook 清空）
  const sheet = this.ctx.SpreadsheetApp.getActiveSpreadsheet().getSheetByName('打卡記錄');
  const data = sheet.getDataRange().getValues();
  assert.strictEqual(data.length, 1, '應該只有標題列');
});

Given(/^已有一筆打卡記錄：類型「(.+)」時間「(.+)」$/, function(type, time) {
  // TODO: 使用 sheet.appendRow() 新增測試資料
  const sheet = this.ctx.SpreadsheetApp.getActiveSpreadsheet().getSheetByName('打卡記錄');
  const uuid = 'test-uuid-' + Date.now() + '-' + Math.random();
  const now = new Date();
  
  // ⚠️ 重要：createdAt 欄位使用 ISO 格式
  // 用於判斷「今日記錄」（防止時間欄位被修改）
  const createdAt = now.toISOString();
  
  sheet.appendRow([uuid, type, time, createdAt]);
});

// ========== When 步驟 ==========

When(/^我打卡「(.+)」$/, function(type) {
  // TODO: 呼叫 ctx.punch(type) 函式
  // 注意: 函式可能尚未實作，這會產生 ReferenceError（紅燈）
  try {
    this.result = this.ctx.punch(type);
  } catch (error) {
    this.error = error;
  }
});

When(/^我在「(.+)」打卡「(.+)」$/, function(time, type) {
  // TODO: 呼叫 ctx.punchAtTime(type, time) 函式
  // 注意: 函式可能尚未實作，這會產生 ReferenceError（紅燈）
  try {
    this.result = this.ctx.punchAtTime(type, time);
  } catch (error) {
    this.error = error;
  }
});

When('我查詢今日打卡記錄', function() {
  // TODO: 呼叫 ctx.getTodayRecords() 函式
  try {
    this.records = this.ctx.getTodayRecords();
  } catch (error) {
    this.error = error;
  }
});

When('我查詢今日工時', function() {
  // TODO: 呼叫 ctx.getTodayWorkHours() 函式
  try {
    this.workHours = this.ctx.getTodayWorkHours();
  } catch (error) {
    this.error = error;
  }
});

When('我呼叫網頁 API', function() {
  // TODO: 呼叫 ctx.getWebPageData() 函式
  try {
    this.apiResult = this.ctx.getWebPageData();
  } catch (error) {
    this.error = error;
  }
});

// ========== Then 步驟 ==========

Then('打卡結果應該成功', function() {
  assert.ok(!this.error, `不應該有錯誤: ${this.error?.message}`);
  assert.ok(this.result?.success, '打卡應該成功');
});

Then('打卡結果應該失敗', function() {
  assert.ok(this.result?.success === false || this.error, '打卡應該失敗');
});

Then(/^錯誤訊息應包含「(.+)」$/, function(expectedMessage) {
  const actualMessage = this.result?.message || this.error?.message || '';
  assert.ok(
    actualMessage.includes(expectedMessage),
    `錯誤訊息應包含 "${expectedMessage}"，實際為 "${actualMessage}"`
  );
});

Then(/^工作表應該有 (\d+) 筆記錄$/, function(expectedCount) {
  const sheet = this.ctx.SpreadsheetApp.getActiveSpreadsheet().getSheetByName('打卡記錄');
  const data = sheet.getDataRange().getValues();
  const actualCount = data.length - 1; // 扣除標題列
  assert.strictEqual(actualCount, parseInt(expectedCount),
    `記錄數應為 ${expectedCount}，實際為 ${actualCount}`);
});

Then(/^最新記錄的類型應該是「(.+)」$/, function(expectedType) {
  const sheet = this.ctx.SpreadsheetApp.getActiveSpreadsheet().getSheetByName('打卡記錄');
  const data = sheet.getDataRange().getValues();
  const lastRow = data[data.length - 1];
  const actualType = lastRow[1]; // 類型欄位（索引 1）
  assert.strictEqual(actualType, expectedType,
    `最新記錄類型應為 "${expectedType}"，實際為 "${actualType}"`);
});

Then(/^最新記錄的時間應該是「(.+)」$/, function(expectedTime) {
  const sheet = this.ctx.SpreadsheetApp.getActiveSpreadsheet().getSheetByName('打卡記錄');
  const data = sheet.getDataRange().getValues();
  const lastRow = data[data.length - 1];
  let actualTime = lastRow[2]; // 時間欄位（索引 2）
  
  // ⚠️ 處理 Google Sheets 自動轉換日期的行為
  // Mock 會將日期字串轉為 Date 物件（模擬真實環境）
  if (actualTime && typeof actualTime.getTime === 'function') {
    // 如果是 Date 物件，轉回中文格式
    const year = actualTime.getFullYear();
    const month = actualTime.getMonth() + 1;
    const day = actualTime.getDate();
    const hours = actualTime.getHours();
    const minutes = actualTime.getMinutes();
    const seconds = actualTime.getSeconds();
    
    let period = '上午';
    let displayHours = hours;
    if (hours >= 12) {
      period = '下午';
      if (hours > 12) displayHours = hours - 12;
    }
    if (hours === 0) displayHours = 12;
    
    const paddedMinutes = String(minutes).padStart(2, '0');
    const paddedSeconds = String(seconds).padStart(2, '0');
    actualTime = `${year}/${month}/${day}${period}${displayHours}:${paddedMinutes}:${paddedSeconds}`;
  }
  
  assert.strictEqual(actualTime, expectedTime,
    `最新記錄時間應為 "${expectedTime}"，實際為 "${actualTime}"`);
});

Then('記錄應該包含：', function(dataTable) {
  // TODO: 驗證記錄內容與 dataTable 相符
  assert.ok(Array.isArray(this.records), '應該有記錄陣列');
  
  const expectedRecords = dataTable.hashes(); // [{ 類型: 'IN', 時間: '...' }, ...]
  assert.strictEqual(this.records.length, expectedRecords.length,
    `記錄數應為 ${expectedRecords.length}，實際為 ${this.records.length}`);
  
  expectedRecords.forEach((expected, index) => {
    const actual = this.records[index];
    assert.strictEqual(actual['類型'], expected['類型'],
      `第 ${index + 1} 筆記錄類型應為 "${expected['類型']}"，實際為 "${actual['類型']}"`);
    assert.strictEqual(actual['時間'], expected['時間'],
      `第 ${index + 1} 筆記錄時間應為 "${expected['時間']}"，實際為 "${actual['時間']}"`);
  });
});

Then(/^第 (\d+) 筆記錄的時間應該是文字格式「(.+)」$/, function(index, expectedTime) {
  assert.ok(Array.isArray(this.records), '應該有記錄陣列');
  assert.ok(this.records.length >= parseInt(index), `應該至少有 ${index} 筆記錄`);
  
  const record = this.records[parseInt(index) - 1];
  const actualTime = record['時間'] || record.time;
  
  // ⚠️ 關鍵驗證：時間欄位必須是字串類型
  // 這會捕捉到 Google Sheets 自動將日期字串轉為 Date 物件的問題
  assert.strictEqual(typeof actualTime, 'string',
    `時間欄位應該是字串類型，實際為 ${typeof actualTime}`);
  
  assert.strictEqual(actualTime, expectedTime,
    `第 ${index} 筆記錄時間應為 "${expectedTime}"，實際為 "${actualTime}"`);
});

Then('時間欄位應可用於字串比對', function() {
  assert.ok(Array.isArray(this.records), '應該有記錄陣列');
  assert.ok(this.records.length > 0, '應該至少有一筆記錄');
  
  const record = this.records[0];
  const timeValue = record['時間'] || record.time;
  
  // ⚠️ 驗證：必須是字串，且有 match 方法
  // 這會捕捉到 "TypeError: timeValue.match is not a function" 的問題
  assert.strictEqual(typeof timeValue, 'string', '時間欄位必須是字串類型');
  assert.ok(typeof timeValue.match === 'function',
    '時間欄位應該支援 .match() 字串方法');
  
  // 驗證：可以用正則表達式匹配中文日期格式
  const regex = /^\d{4}\/\d{1,2}\/\d{1,2}(上午|下午)\d{1,2}:\d{2}:\d{2}$/;
  assert.ok(timeValue.match(regex),
    `時間格式應符合中文日期格式，實際為 "${timeValue}"`);
});

Then(/^工時應該是 (\d+) 分鐘$/, function(expectedMinutes) {
  assert.ok(this.workHours !== undefined, '應該有工時資料');
  assert.strictEqual(this.workHours, parseInt(expectedMinutes),
    `工時應為 ${expectedMinutes} 分鐘，實際為 ${this.workHours} 分鐘`);
});

// ========== API 驗證步驟 ==========

Then('API 應該回傳成功', function() {
  assert.ok(!this.error, `不應該有錯誤: ${this.error?.message}`);
  assert.ok(this.apiResult, 'API 應該有回傳值');
  assert.ok(this.apiResult.success, 'API 回傳應該標示成功');
});

Then(/^API 記錄應該有 (\d+) 筆$/, function(expectedCount) {
  assert.ok(this.apiResult, 'API 應該有回傳值');
  assert.ok(Array.isArray(this.apiResult.records), 'API 應該回傳記錄陣列');
  assert.strictEqual(this.apiResult.records.length, parseInt(expectedCount),
    `API 記錄數應為 ${expectedCount}，實際為 ${this.apiResult.records.length}`);
});

Then(/^API 工時應該是 (\d+) 分鐘$/, function(expectedMinutes) {
  assert.ok(this.apiResult, 'API 應該有回傳值');
  assert.strictEqual(this.apiResult.totalMinutes, parseInt(expectedMinutes),
    `API 工時應為 ${expectedMinutes} 分鐘，實際為 ${this.apiResult.totalMinutes} 分鐘`);
});

Then('API 狀態應該是：', function(dataTable) {
  // TODO: 驗證 API 狀態與 dataTable 相符
  assert.ok(this.apiResult, 'API 應該有回傳值');
  
  const expectedState = {};
  const rows = dataTable.raw();
  // 跳過標題列，從第 1 行開始
  for (let i = 0; i < rows.length; i++) {
    const key = rows[i][0];
    const value = rows[i][1] === 'true';
    expectedState[key] = value;
  }
  
  assert.strictEqual(this.apiResult.canPunchIn, expectedState.canPunchIn,
    `canPunchIn 應為 ${expectedState.canPunchIn}，實際為 ${this.apiResult.canPunchIn}`);
  assert.strictEqual(this.apiResult.canPunchOut, expectedState.canPunchOut,
    `canPunchOut 應為 ${expectedState.canPunchOut}，實際為 ${this.apiResult.canPunchOut}`);
});

Then('API 記錄應該包含：', function(dataTable) {
  // TODO: 驗證 API 記錄內容與 dataTable 相符
  assert.ok(this.apiResult, 'API 應該有回傳值');
  assert.ok(Array.isArray(this.apiResult.records), 'API 應該回傳記錄陣列');
  
  const expectedRecords = dataTable.hashes();
  assert.strictEqual(this.apiResult.records.length, expectedRecords.length,
    `API 記錄數應為 ${expectedRecords.length}，實際為 ${this.apiResult.records.length}`);
  
  expectedRecords.forEach((expected, index) => {
    const actual = this.apiResult.records[index];
    assert.strictEqual(actual['類型'], expected['類型'],
      `API 第 ${index + 1} 筆記錄類型應為 "${expected['類型']}"，實際為 "${actual['類型']}"`);
    assert.strictEqual(actual['時間'], expected['時間'],
      `API 第 ${index + 1} 筆記錄時間應為 "${expected['時間']}"，實際為 "${actual['時間']}"`);
  });
});
