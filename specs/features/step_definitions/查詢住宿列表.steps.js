import { Given, When, Then } from '@cucumber/cucumber';
import { strict as assert } from 'assert';

// ========== Given Steps ==========

Given(/^旅遊計畫 (\d+) 中依序新增以下住宿選項：$/, function(tripPlanId, dataTable) {
  const rows = dataTable.hashes();
  for (const row of rows) {
    // 如果有指定新增時間，先設定 mock 時間
    if (row['新增時間']) {
      this.ctx._setMockTime(row['新增時間']);
    }

    this.ctx.addAccommodation(parseInt(tripPlanId), {
      name: row['住宿名稱'],
      location: row['地點'] || null,
      pricePerNight: parseFloat(row['每晚價格']),
      nights: parseInt(row['入住天數']),
      notes: row['備註'] || null,
      sourceUrl: row['來源網址'] || null
    });
  }
});

// ========== When Steps ==========

When(/^用戶 "(.+)" 查詢旅遊計畫 (\d+) 的住宿列表$/, function(userName, tripPlanId) {
  this.ctx._setMockEmail(`${userName.toLowerCase()}@example.com`);
  this.result = this.ctx.queryAccommodations(parseInt(tripPlanId));
});

When(/^用戶 "(.+)" 查詢所有住宿列表$/, function(userName) {
  this.ctx._setMockEmail(`${userName.toLowerCase()}@example.com`);
  this.result = this.ctx.queryAccommodations();
});

// ========== Then Steps ==========
// 注意: '查詢結果應包含：' 和 '查詢結果順序應為：' 已移至 共用查詢結果.steps.js

Then('查詢結果應為空列表', function() {
  const items = this.result.data || [];
  assert.strictEqual(items.length, 0, '預期結果應為空列表');
});
