import { Given, When, Then } from '@cucumber/cucumber';
import { strict as assert } from 'assert';

// ========== Given Steps ==========

Given(/^旅遊計畫 (\d+) 中有以下住宿選項：$/, function(tripPlanId, dataTable) {
  const rows = dataTable.hashes();
  for (const row of rows) {
    // 支援兩種格式：
    // 1. 提供 每晚價格 + 入住天數（完整格式）
    // 2. 只提供 總價（簡化格式，用於花費分析測試）
    let pricePerNight, nights;

    if (row['總價'] && !row['每晚價格'] && !row['入住天數']) {
      // 簡化格式：只有總價，預設 1 晚
      pricePerNight = parseFloat(row['總價']);
      nights = 1;
    } else {
      // 完整格式
      pricePerNight = parseFloat(row['每晚價格']);
      nights = parseInt(row['入住天數']);
    }

    this.ctx.addAccommodation(parseInt(tripPlanId), {
      name: row['住宿名稱'],
      location: row['地點'] || null,
      pricePerNight,
      nights,
      notes: row['備註'] || null,
      sourceUrl: row['來源網址'] || null
    });
  }
});

// ========== When Steps ==========

When(/^用戶 "(.+)" 在旅遊計畫 (\d+) 新增住宿選項：$/, function(userName, tripPlanId, dataTable) {
  const row = dataTable.hashes()[0];
  this.ctx._setMockEmail(`${userName.toLowerCase()}@example.com`);

  this.result = this.ctx.addAccommodation(parseInt(tripPlanId), {
    name: row['住宿名稱'] || '',
    location: row['地點'] || null,
    pricePerNight: row['每晚價格'] !== undefined && row['每晚價格'] !== ''
      ? parseFloat(row['每晚價格'])
      : 0,
    nights: row['入住天數'] !== undefined && row['入住天數'] !== ''
      ? parseInt(row['入住天數'])
      : 0,
    notes: row['備註'] || null,
    sourceUrl: row['來源網址'] || null
  });
});

// ========== Then Steps ==========

Then(/^旅遊計畫 (\d+) 中應有以下住宿選項：$/, function(tripPlanId, dataTable) {
  const expectedRows = dataTable.hashes();
  const accommodations = this.ctx.getAccommodations(parseInt(tripPlanId));

  for (const expected of expectedRows) {
    const found = accommodations.find(a => a.name === expected['住宿名稱']);
    assert.ok(found, `找不到住宿名稱為 "${expected['住宿名稱']}" 的住宿選項`);

    if (expected['地點']) {
      assert.strictEqual(found.location, expected['地點'], '地點不符');
    }
    if (expected['每晚價格']) {
      assert.strictEqual(found.pricePerNight, parseFloat(expected['每晚價格']), '每晚價格不符');
    }
    if (expected['入住天數']) {
      assert.strictEqual(found.nights, parseInt(expected['入住天數']), '入住天數不符');
    }
    if (expected['總價']) {
      assert.strictEqual(found.totalPrice, parseFloat(expected['總價']), '總價不符');
    }
    if (expected['備註']) {
      assert.strictEqual(found.notes, expected['備註'], '備註不符');
    }
    if (expected['來源網址']) {
      assert.strictEqual(found.sourceUrl, expected['來源網址'], '來源網址不符');
    }
  }
});
