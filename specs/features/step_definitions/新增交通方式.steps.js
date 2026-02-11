import { Given, When, Then } from '@cucumber/cucumber';
import { strict as assert } from 'assert';

// ========== Given Steps ==========

Given(/^旅遊計畫 (\d+) 中有以下交通方式：$/, function(tripPlanId, dataTable) {
  const rows = dataTable.hashes();
  for (const row of rows) {
    this.ctx.addTransportation(parseInt(tripPlanId), {
      type: row['交通類型'],
      origin: row['起點'],
      destination: row['終點'],
      cost: parseFloat(row['費用'])
    });
  }
});

// ========== When Steps ==========

When(/^用戶 "(.+)" 在旅遊計畫 (\d+) 新增交通方式：$/, function(userName, tripPlanId, dataTable) {
  const row = dataTable.hashes()[0];
  this.ctx._setMockEmail(`${userName.toLowerCase()}@example.com`);

  this.result = this.ctx.addTransportation(parseInt(tripPlanId), {
    type: row['交通類型'] || '',
    origin: row['起點'] || '',
    destination: row['終點'] || '',
    cost: row['費用'] !== undefined && row['費用'] !== ''
      ? parseFloat(row['費用'])
      : 0
  });
});

// ========== Then Steps ==========

Then(/^旅遊計畫 (\d+) 中應有以下交通方式：$/, function(tripPlanId, dataTable) {
  const expectedRows = dataTable.hashes();
  const transportations = this.ctx.getTransportations(parseInt(tripPlanId));

  for (const expected of expectedRows) {
    const found = transportations.find(t =>
      t.type === expected['交通類型'] &&
      t.origin === expected['起點'] &&
      t.destination === expected['終點']
    );
    assert.ok(found, `找不到交通方式: ${expected['交通類型']} ${expected['起點']} → ${expected['終點']}`);

    if (expected['費用']) {
      assert.strictEqual(found.cost, parseFloat(expected['費用']), '費用不符');
    }
  }
});
