// ========== 常數定義 ==========

const TRANSPORTATION_SHEET = '交通方式';

const TRANS_COLUMN = {
  TRIP_PLAN_ID: 0,
  TYPE: 1,
  ORIGIN: 2,
  DESTINATION: 3,
  COST: 4,
  CREATED_AT: 5
};

const TRANS_COLUMN_COUNT = 6;

const TRANS_ERROR = {
  TRIP_NOT_FOUND: '旅遊計畫不存在',
  TYPE_REQUIRED: '交通類型必須提供',
  ORIGIN_REQUIRED: '起點必須提供',
  DESTINATION_REQUIRED: '終點必須提供',
  COST_MIN: '費用必須大於等於 0',
  ALREADY_EXISTS: '相同交通方式已存在'
};

// ========== 工作表操作 ==========

function _getTransportationSheet() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TRANSPORTATION_SHEET);
}

function _getAllTransportationRows() {
  const sheet = _getTransportationSheet();
  const lastRow = sheet.getLastRow();
  // 需要至少 2 行（標題行 + 1 筆資料）
  if (lastRow < 2) return [];
  // 從第 2 行開始讀取，跳過標題行
  return sheet.getRange(2, 1, lastRow - 1, TRANS_COLUMN_COUNT).getValues();
}

// ========== 資料轉換 ==========

function _rowToTransportation(row) {
  return {
    tripPlanId: row[TRANS_COLUMN.TRIP_PLAN_ID],
    type: row[TRANS_COLUMN.TYPE],
    origin: row[TRANS_COLUMN.ORIGIN],
    destination: row[TRANS_COLUMN.DESTINATION],
    cost: row[TRANS_COLUMN.COST],
    createdAt: row[TRANS_COLUMN.CREATED_AT]
  };
}

function _transportationToRow(trans) {
  return [
    trans.tripPlanId,
    trans.type,
    trans.origin,
    trans.destination,
    trans.cost,
    trans.createdAt
  ];
}

// ========== 驗證邏輯 ==========

function _validateTransportation(tripPlanId, options, existingTransportations) {
  const { type, origin, destination, cost } = options;

  // 檢查旅遊計畫是否存在
  const plans = getTripPlans();
  const planExists = plans.length >= tripPlanId;
  if (!planExists) {
    return { valid: false, message: TRANS_ERROR.TRIP_NOT_FOUND };
  }

  if (!type || type.trim() === '') {
    return { valid: false, message: TRANS_ERROR.TYPE_REQUIRED };
  }

  if (!origin || origin.trim() === '') {
    return { valid: false, message: TRANS_ERROR.ORIGIN_REQUIRED };
  }

  if (!destination || destination.trim() === '') {
    return { valid: false, message: TRANS_ERROR.DESTINATION_REQUIRED };
  }

  if (cost < 0) {
    return { valid: false, message: TRANS_ERROR.COST_MIN };
  }

  // 檢查同一計畫內相同類型起點終點是否重複
  const samePlanTransportations = existingTransportations.filter(t => t.tripPlanId === tripPlanId);
  const exists = samePlanTransportations.some(t =>
    t.type === type && t.origin === origin && t.destination === destination
  );
  if (exists) {
    return { valid: false, message: TRANS_ERROR.ALREADY_EXISTS };
  }

  return { valid: true };
}

// ========== 公開函數 ==========

/**
 * 新增交通方式
 * @param {number} tripPlanId - 旅遊計畫 ID
 * @param {Object} options - 交通資料
 * @returns {{ success: boolean, message?: string }}
 */
function addTransportation(tripPlanId, options) {
  const { type, origin, destination, cost } = options;

  const existingTransportations = getTransportations();
  const validation = _validateTransportation(tripPlanId, options, existingTransportations);

  if (!validation.valid) {
    return { success: false, message: validation.message };
  }

  const transportation = {
    tripPlanId,
    type,
    origin,
    destination,
    cost,
    createdAt: new Date().toISOString()
  };

  _getTransportationSheet().appendRow(_transportationToRow(transportation));

  return { success: true };
}

/**
 * 取得交通方式
 * @param {number} [tripPlanId] - 旅遊計畫 ID（可選）
 * @returns {Array<Object>}
 */
function getTransportations(tripPlanId) {
  const rows = _getAllTransportationRows();
  let transportations = rows
    .filter(row => row[TRANS_COLUMN.TYPE])
    .map(_rowToTransportation);

  if (tripPlanId !== undefined) {
    transportations = transportations.filter(t => t.tripPlanId === tripPlanId);
  }

  return transportations;
}
