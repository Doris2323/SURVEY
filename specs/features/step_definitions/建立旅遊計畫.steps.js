import { Given, When, Then } from '@cucumber/cucumber';
import { strict as assert } from 'assert';

// ========== Given Steps ==========

Given('系統中尚無任何旅遊計畫', function() {
  const sheet = this.ctx.SpreadsheetApp.getActiveSpreadsheet().getSheetByName('旅遊計畫');
  sheet.clear();
});

Given('系統中有以下旅遊計畫：', function(dataTable) {
  const rows = dataTable.hashes();

  // 初始化 tripPlanMap 用於 id 對照
  this.tripPlanMap = this.tripPlanMap || {};

  for (const row of rows) {
    const plan = {
      name: row['計畫名稱'],
      startDate: row['出發日期'] || null,
      endDate: row['結束日期'] || null,
      participants: parseInt(row['參與人數']) || 1,
      budgetLimit: row['預算上限'] ? parseFloat(row['預算上限']) : null,
      notes: row['備註'] || null
    };

    const result = this.ctx.createTripPlan(plan);

    // 如果有 id 欄位，建立對照表
    if (row['id']) {
      this.tripPlanMap[row['id']] = plan.name;
    }
  }
});

// ========== When Steps ==========

When(/^用戶 "(.+)" 建立旅遊計畫：$/, function(userName, dataTable) {
  const row = dataTable.hashes()[0];

  this.ctx._setMockEmail(`${userName.toLowerCase()}@example.com`);

  this.result = this.ctx.createTripPlan({
    name: row['計畫名稱'] || '',
    startDate: row['出發日期'] || null,
    endDate: row['結束日期'] || null,
    participants: row['參與人數'] !== undefined && row['參與人數'] !== ''
      ? parseInt(row['參與人數'])
      : 1,
    budgetLimit: row['預算上限'] ? parseFloat(row['預算上限']) : null,
    notes: row['備註'] || null
  });
});

// ========== Then Steps ==========

Then('操作失敗', function() {
  assert.strictEqual(this.result.success, false, '預期操作應該失敗');
});

Then('操作成功', function() {
  assert.strictEqual(this.result.success, true, `預期操作應該成功，但失敗了: ${this.result.message || ''}`);
});

Then(/^錯誤訊息為 "(.+)"$/, function(expectedMessage) {
  assert.strictEqual(this.result.message, expectedMessage,
    `預期錯誤訊息為 "${expectedMessage}"，但實際為 "${this.result.message}"`);
});

Then('系統中應有以下旅遊計畫：', function(dataTable) {
  const expectedRows = dataTable.hashes();
  const plans = this.ctx.getTripPlans();

  for (const expected of expectedRows) {
    const found = plans.find(p => p.name === expected['計畫名稱']);
    assert.ok(found, `找不到計畫名稱為 "${expected['計畫名稱']}" 的旅遊計畫`);

    if (expected['出發日期']) {
      assert.strictEqual(found.startDate, expected['出發日期'], '出發日期不符');
    }
    if (expected['結束日期']) {
      assert.strictEqual(found.endDate, expected['結束日期'], '結束日期不符');
    }
    if (expected['參與人數']) {
      assert.strictEqual(found.participants, parseInt(expected['參與人數']), '參與人數不符');
    }
    if (expected['預算上限'] !== undefined) {
      if (expected['預算上限'] === '') {
        assert.ok(found.budgetLimit === null || found.budgetLimit === undefined, '預算上限應為空');
      } else {
        assert.strictEqual(found.budgetLimit, parseFloat(expected['預算上限']), '預算上限不符');
      }
    }
    if (expected['備註']) {
      assert.strictEqual(found.notes, expected['備註'], '備註不符');
    }
  }
});
