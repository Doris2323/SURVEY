// ========== 常數定義 ==========

const SHEET_NAME = '旅遊計畫';

const COLUMN = {
  NAME: 0,
  START_DATE: 1,
  END_DATE: 2,
  PARTICIPANTS: 3,
  BUDGET_LIMIT: 4,
  NOTES: 5,
  CREATED_AT: 6
};

const COLUMN_COUNT = 7;

const ERROR_MESSAGE = {
  NAME_REQUIRED: '計畫名稱必須提供',
  PARTICIPANTS_MIN: '參與人數必須大於等於 1',
  DATE_INVALID: '結束日期必須大於等於出發日期',
  NAME_EXISTS: '計畫名稱已存在'
};

// ========== 工作表操作 ==========

function _getSheet() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
}

function _getAllRows() {
  const sheet = _getSheet();
  const lastRow = sheet.getLastRow();
  // 需要至少 2 行（標題行 + 1 筆資料）
  if (lastRow < 2) return [];
  // 從第 2 行開始讀取，跳過標題行
  return sheet.getRange(2, 1, lastRow - 1, COLUMN_COUNT).getValues();
}

// ========== 資料轉換 ==========

function _rowToTripPlan(row) {
  return {
    name: row[COLUMN.NAME],
    startDate: row[COLUMN.START_DATE] || null,
    endDate: row[COLUMN.END_DATE] || null,
    participants: row[COLUMN.PARTICIPANTS] || 1,
    budgetLimit: row[COLUMN.BUDGET_LIMIT] || null,
    notes: row[COLUMN.NOTES] || null,
    createdAt: row[COLUMN.CREATED_AT]
  };
}

function _tripPlanToRow(plan) {
  return [
    plan.name,
    plan.startDate || '',
    plan.endDate || '',
    plan.participants,
    plan.budgetLimit || '',
    plan.notes || '',
    plan.createdAt
  ];
}

// ========== 驗證邏輯 ==========

function _validateTripPlan(options, existingPlans) {
  const { name, startDate, endDate, participants } = options;

  if (!name || name.trim() === '') {
    return { valid: false, message: ERROR_MESSAGE.NAME_REQUIRED };
  }

  if (participants < 1) {
    return { valid: false, message: ERROR_MESSAGE.PARTICIPANTS_MIN };
  }

  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) {
      return { valid: false, message: ERROR_MESSAGE.DATE_INVALID };
    }
  }

  if (existingPlans.some(p => p.name === name)) {
    return { valid: false, message: ERROR_MESSAGE.NAME_EXISTS };
  }

  return { valid: true };
}

// ========== 公開函數 ==========

/**
 * 建立旅遊計畫
 * @param {Object} options - 計畫資料
 * @returns {{ success: boolean, message?: string }}
 */
function createTripPlan(options) {
  const { name, startDate, endDate, participants = 1, budgetLimit, notes } = options;

  const existingPlans = getTripPlans();
  const validation = _validateTripPlan({ name, startDate, endDate, participants }, existingPlans);

  if (!validation.valid) {
    return { success: false, message: validation.message };
  }

  const plan = {
    name,
    startDate,
    endDate,
    participants,
    budgetLimit,
    notes,
    createdAt: new Date().toISOString()
  };

  _getSheet().appendRow(_tripPlanToRow(plan));

  return { success: true };
}

/**
 * 取得所有旅遊計畫
 * @returns {Array<Object>}
 */
function getTripPlans() {
  const rows = _getAllRows();
  return rows
    .filter(row => row[COLUMN.NAME])
    .map(_rowToTripPlan);
}
