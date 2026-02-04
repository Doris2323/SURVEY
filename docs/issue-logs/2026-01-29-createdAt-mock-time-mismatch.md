# Issue Log: createdAt 與 Mock 時間不匹配問題

## 日期
2026-01-29

## 狀況

測試中有以下問題：
1. `Given 已有一筆打卡記錄` 創建的記錄，其 createdAt 是實際時間（2026/1/29）
2. `getTodayRecords()` 和 `getTodayWorkHours()` 使用 mock 時間（2026/1/27）判斷「今日」
3. 兩者日期不匹配，導致查詢今日記錄時返回空陣列，工時為 0

## 推論

測試環境的設計理念：
- Before hook 設定 mock 時間為 `2026/1/27上午10:00:00`
- 這個 mock 時間應該代表測試環境的「現在」
- 所有記錄的 createdAt 都應該基於這個「現在」

但目前的實作：
- Given step 使用 `new Date()` 創建 createdAt（實際時間 1/29）
- 業務函數使用 `_mockTime` 判斷今日（mock 時間 1/27）
- 日期不匹配

## 嘗試的修改

### 嘗試 1：使用 parseChineseDate(time)
```javascript
const timeDate = this.ctx.parseChineseDate(time);
sheet.appendRow([type, time, timeDate]);
```
結果：跨日記錄（1/28）會被排除在今日查詢外

### 嘗試 2：硬編碼 mock 日期
```javascript
const mockDate = this.ctx.parseChineseDate('2026/1/27上午10:00:00');
const createdAt = new Date(mockDate年月日, now時分秒);
```
結果：仍有問題

## 根本問題

Given step 無法訪問 Before hook 中設定的 mock 時間值。需要一個機制讓 Given step 知道當前的 mock 時間。

## 下一步計劃

需要修改設計，讓 Given step 能正確取得 mock 時間並用於 createdAt。
