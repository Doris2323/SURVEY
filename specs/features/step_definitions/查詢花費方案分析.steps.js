import { Given, When, Then } from '@cucumber/cucumber';
import { strict as assert } from 'assert';

// ========== When Steps ==========

When(/^用戶 "(.+)" 查詢花費方案分析$/, function(userName) {
  this.ctx._setMockEmail(`${userName.toLowerCase()}@example.com`);
  this.result = this.ctx.analyzeCosts();
});

When(/^用戶 "(.+)" 查詢旅遊計畫 (\d+) 的花費方案分析$/, function(userName, tripPlanId) {
  this.ctx._setMockEmail(`${userName.toLowerCase()}@example.com`);
  this.result = this.ctx.analyzeCosts(parseInt(tripPlanId));
});

// ========== Then Steps ==========

Then(/^查詢結果應包含 (\d+) 個組合$/, function(expectedCount) {
  const items = this.result.data || [];
  assert.strictEqual(items.length, parseInt(expectedCount),
    `預期 ${expectedCount} 個組合，實際 ${items.length} 個`);
});

// 注意: '查詢結果應包含：' 和 '查詢結果順序應為：' 已移至 共用查詢結果.steps.js
