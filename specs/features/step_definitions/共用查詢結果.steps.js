import { Then } from '@cucumber/cucumber';
import { strict as assert } from 'assert';

// ========== 共用 Then Steps ==========
// 這些步驟被多個 feature 使用，根據欄位名稱智能判斷資料類型

Then('查詢結果應包含：', function(dataTable) {
  const expectedRows = dataTable.hashes();
  const items = this.result.data || [];

  for (const expected of expectedRows) {
    // 根據欄位判斷是花費分析組合還是住宿列表
    const isCostAnalysis = expected['交通方式'] !== undefined;

    if (isCostAnalysis) {
      // 花費分析組合：使用 accommodationName 和 transportationType
      const found = items.find(item =>
        item.accommodationName === expected['住宿名稱'] &&
        item.transportationType === expected['交通方式']
      );

      assert.ok(found, `找不到組合: ${expected['住宿名稱']} + ${expected['交通方式']}`);

      if (expected['住宿總價']) {
        assert.strictEqual(found.accommodationPrice, parseFloat(expected['住宿總價']), '住宿總價不符');
      }
      if (expected['交通費用']) {
        assert.strictEqual(found.transportationCost, parseFloat(expected['交通費用']), '交通費用不符');
      }
      if (expected['組合總花費']) {
        assert.strictEqual(found.totalCost, parseFloat(expected['組合總花費']), '組合總花費不符');
      }
      if (expected['每人平均花費']) {
        assert.strictEqual(found.costPerPerson, parseFloat(expected['每人平均花費']), '每人平均花費不符');
      }
      if (expected['是否超過預算']) {
        const expectedOverBudget = expected['是否超過預算'] === '是';
        assert.strictEqual(found.overBudget, expectedOverBudget, '是否超過預算不符');
      }
    } else {
      // 住宿列表：使用 name
      const found = items.find(item => item.name === expected['住宿名稱']);
      assert.ok(found, `找不到住宿: ${expected['住宿名稱']}`);

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
  }
});

Then('查詢結果順序應為：', function(dataTable) {
  const expectedRows = dataTable.hashes();
  const items = this.result.data || [];

  for (const expected of expectedRows) {
    const index = parseInt(expected['順序']) - 1;
    assert.ok(items[index], `找不到順序 ${expected['順序']} 的項目`);

    // 根據欄位判斷是花費分析組合還是住宿列表
    const isCostAnalysis = expected['交通方式'] !== undefined;

    if (isCostAnalysis) {
      // 花費分析組合
      if (expected['住宿名稱']) {
        assert.strictEqual(items[index].accommodationName, expected['住宿名稱'],
          `順序 ${expected['順序']} 的住宿名稱不符`);
      }
      if (expected['交通方式']) {
        assert.strictEqual(items[index].transportationType, expected['交通方式'],
          `順序 ${expected['順序']} 的交通方式不符`);
      }
      if (expected['組合總花費']) {
        assert.strictEqual(items[index].totalCost, parseFloat(expected['組合總花費']),
          `順序 ${expected['順序']} 的組合總花費不符`);
      }
    } else {
      // 住宿列表
      assert.strictEqual(items[index].name, expected['住宿名稱'],
        `順序 ${expected['順序']} 的住宿名稱不符，預期 ${expected['住宿名稱']}，實際 ${items[index].name}`);
    }
  }
});
