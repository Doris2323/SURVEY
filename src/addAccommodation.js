// ========== 常數定義 ==========

const ACCOMMODATION_SHEET = '住宿選項';

const ACC_COLUMN = {
  TRIP_PLAN_ID: 0,
  NAME: 1,
  LOCATION: 2,
  PRICE_PER_NIGHT: 3,
  NIGHTS: 4,
  TOTAL_PRICE: 5,
  NOTES: 6,
  SOURCE_URL: 7,
  CREATED_AT: 8
};

const ACC_COLUMN_COUNT = 9;

const ACC_ERROR = {
  TRIP_NOT_FOUND: '旅遊計畫不存在',
  NAME_REQUIRED: '住宿名稱必須提供',
  NAME_EXISTS: '住宿名稱已存在',
  PRICE_MIN: '每晚價格必須大於 0',
  NIGHTS_MIN: '入住天數必須大於 0',
  URL_INVALID: '來源網址格式錯誤'
};

// ========== 工作表操作 ==========

function _getAccommodationSheet() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ACCOMMODATION_SHEET);
}

function _getAllAccommodationRows() {
  const sheet = _getAccommodationSheet();
  const lastRow = sheet.getLastRow();
  // 需要至少 2 行（標題行 + 1 筆資料）
  if (lastRow < 2) return [];
  // 從第 2 行開始讀取，跳過標題行
  return sheet.getRange(2, 1, lastRow - 1, ACC_COLUMN_COUNT).getValues();
}

// ========== 資料轉換 ==========

function _rowToAccommodation(row) {
  return {
    tripPlanId: row[ACC_COLUMN.TRIP_PLAN_ID],
    name: row[ACC_COLUMN.NAME],
    location: row[ACC_COLUMN.LOCATION] || null,
    pricePerNight: row[ACC_COLUMN.PRICE_PER_NIGHT],
    nights: row[ACC_COLUMN.NIGHTS],
    totalPrice: row[ACC_COLUMN.TOTAL_PRICE],
    notes: row[ACC_COLUMN.NOTES] || null,
    sourceUrl: row[ACC_COLUMN.SOURCE_URL] || null,
    createdAt: row[ACC_COLUMN.CREATED_AT]
  };
}

function _accommodationToRow(acc) {
  return [
    acc.tripPlanId,
    acc.name,
    acc.location || '',
    acc.pricePerNight,
    acc.nights,
    acc.totalPrice,
    acc.notes || '',
    acc.sourceUrl || '',
    acc.createdAt
  ];
}

// ========== 驗證邏輯 ==========

function _isValidUrl(url) {
  if (!url) return true;
  try {
    const pattern = /^https?:\/\/.+/i;
    return pattern.test(url);
  } catch {
    return false;
  }
}

function _validateAccommodation(tripPlanId, options, existingAccommodations) {
  const { name, pricePerNight, nights, sourceUrl } = options;

  // 檢查旅遊計畫是否存在
  const plans = getTripPlans();
  const planExists = plans.length >= tripPlanId;
  if (!planExists) {
    return { valid: false, message: ACC_ERROR.TRIP_NOT_FOUND };
  }

  if (!name || name.trim() === '') {
    return { valid: false, message: ACC_ERROR.NAME_REQUIRED };
  }

  if (pricePerNight <= 0) {
    return { valid: false, message: ACC_ERROR.PRICE_MIN };
  }

  if (nights <= 0) {
    return { valid: false, message: ACC_ERROR.NIGHTS_MIN };
  }

  if (sourceUrl && !_isValidUrl(sourceUrl)) {
    return { valid: false, message: ACC_ERROR.URL_INVALID };
  }

  // 檢查同一計畫內名稱是否重複
  const samePlanAccommodations = existingAccommodations.filter(a => a.tripPlanId === tripPlanId);
  if (samePlanAccommodations.some(a => a.name === name)) {
    return { valid: false, message: ACC_ERROR.NAME_EXISTS };
  }

  return { valid: true };
}

// ========== 公開函數 ==========

/**
 * 新增住宿選項
 * @param {number} tripPlanId - 旅遊計畫 ID
 * @param {Object} options - 住宿資料
 * @returns {{ success: boolean, message?: string }}
 */
function addAccommodation(tripPlanId, options) {
  const { name, location, pricePerNight, nights, notes, sourceUrl } = options;

  const existingAccommodations = getAccommodations();
  const validation = _validateAccommodation(tripPlanId, options, existingAccommodations);

  if (!validation.valid) {
    return { success: false, message: validation.message };
  }

  const totalPrice = pricePerNight * nights;

  const accommodation = {
    tripPlanId,
    name,
    location,
    pricePerNight,
    nights,
    totalPrice,
    notes,
    sourceUrl,
    createdAt: new Date().toISOString()
  };

  _getAccommodationSheet().appendRow(_accommodationToRow(accommodation));

  return { success: true };
}

/**
 * 取得住宿選項
 * @param {number} [tripPlanId] - 旅遊計畫 ID（可選）
 * @returns {Array<Object>}
 */
function getAccommodations(tripPlanId) {
  const rows = _getAllAccommodationRows();
  let accommodations = rows
    .filter(row => row[ACC_COLUMN.NAME])
    .map(_rowToAccommodation);

  if (tripPlanId !== undefined) {
    accommodations = accommodations.filter(a => a.tripPlanId === tripPlanId);
  }

  return accommodations;
}

/**
 * 查詢住宿列表（帶結果包裝）
 * @param {number} [tripPlanId] - 旅遊計畫 ID（可選）
 * @returns {{ success: boolean, data: Array<Object> }}
 */
function queryAccommodations(tripPlanId) {
  const accommodations = getAccommodations(tripPlanId);
  return {
    success: true,
    data: accommodations
  };
}
