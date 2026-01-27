/**
 * 打卡系統 - Apps Script 程式碼
 *
 * 這個檔案是你要實作的 GAS 程式碼
 * 請使用 BDD 流程：綁定 → 紅燈 → 綠燈 → 重構
 */

// ========== 常數 ==========

const SHEET_NAME = '打卡記錄';

// 欄位索引常數
const COLUMN = {
  UUID: 0,
  TYPE: 1,
  TIME: 2,
  CREATED_AT: 3
};

// 打卡類型常數
const PUNCH_TYPE = {
  IN: 'IN',
  OUT: 'OUT'
};

// ========== Web App 入口 ==========

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('打卡系統')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ========== 輔助函式 ==========

/**
 * 取得工作表
 */
function getSheet() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
}

/**
 * 取得所有記錄（包含標題列）
 */
function getAllRows() {
  return getSheet().getDataRange().getValues();
}

/**
 * 取得最後一筆記錄
 * @param {Array} rows - 所有記錄
 * @returns {{type: string, time: string}|null}
 */
function getLastRecord(rows) {
  if (rows.length <= 1) return null;
  const lastRow = rows[rows.length - 1];
  return {
    type: lastRow[COLUMN.TYPE],
    time: lastRow[COLUMN.TIME]
  };
}

/**
 * 檢查是否為 Date 物件
 */
function isDateObject(value) {
  return value && typeof value === 'object' && typeof value.getTime === 'function';
}

/**
 * 解析中文日期時間格式
 * @param {string|Date} timeValue - 時間字串或 Date 物件
 * @returns {Date}
 */
function parseChinaDateTime(timeValue) {
  if (isDateObject(timeValue)) {
    return timeValue;
  }
  
  const timeStr = String(timeValue);
  const regex = /(\d+)\/(\d+)\/(\d+)(上午|下午)(\d+):(\d+):(\d+)/;
  const match = timeStr.match(regex);
  
  if (!match) {
    throw new Error('無法解析時間格式: ' + timeStr);
  }
  
  const [, year, month, day, period, hour, minute, second] = match;
  let h = parseInt(hour);
  
  if (period === '下午' && h !== 12) {
    h += 12;
  } else if (period === '上午' && h === 12) {
    h = 0;
  }
  
  return new Date(
    parseInt(year),
    parseInt(month) - 1,
    parseInt(day),
    h,
    parseInt(minute),
    parseInt(second)
  );
}

/**
 * 將 Date 物件轉換為中文日期時間格式
 */
function formatChinaDateTime(date) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();
  
  let period = '上午';
  let displayHours = hours;
  
  if (hours >= 12) {
    period = '下午';
    if (hours > 12) {
      displayHours = hours - 12;
    }
  }
  if (hours === 0) {
    displayHours = 12;
  }
  
  const paddedMinutes = String(minutes).padStart(2, '0');
  const paddedSeconds = String(seconds).padStart(2, '0');
  
  return `${year}/${month}/${day}${period}${displayHours}:${paddedMinutes}:${paddedSeconds}`;
}

/**
 * 取得今日日期範圍
 * @returns {{today: Date, tomorrow: Date}}
 */
function getTodayDateRange() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return { today, tomorrow };
}

/**
 * 判斷指定時間是否為今日
 * @param {string} createdAtISO - ISO 格式時間字串
 * @returns {boolean}
 */
function isToday(createdAtISO) {
  const { today, tomorrow } = getTodayDateRange();
  const createdAt = new Date(createdAtISO);
  return createdAt >= today && createdAt < tomorrow;
}

/**
 * 驗證打卡類型是否合法
 * @param {string} type - 打卡類型（IN/OUT）
 * @param {Array} allRows - 所有記錄
 * @returns {{valid: boolean, message?: string}}
 */
function validatePunchType(type, allRows) {
  // 驗證：未上班就下班
  if (type === PUNCH_TYPE.OUT) {
    let hasIN = false;
    for (let i = allRows.length - 1; i >= 1; i--) {
      if (allRows[i][COLUMN.TYPE] === PUNCH_TYPE.IN) {
        hasIN = true;
        break;
      } else if (allRows[i][COLUMN.TYPE] === PUNCH_TYPE.OUT) {
        break;
      }
    }
    if (!hasIN) {
      return { valid: false, message: '請先完成 IN 打卡' };
    }
  }
  
  // 驗證：連續上班
  if (type === PUNCH_TYPE.IN && allRows.length > 1) {
    const lastRow = allRows[allRows.length - 1];
    if (lastRow[COLUMN.TYPE] === PUNCH_TYPE.IN) {
      return { valid: false, message: '請先完成 OUT 打卡' };
    }
  }
  
  return { valid: true };
}

// ========== 打卡功能 ==========

/**
 * 執行打卡（使用當前時間）
 */
function punch(type) {
  const allRows = getAllRows();
  
  // 驗證打卡類型
  const validation = validatePunchType(type, allRows);
  if (!validation.valid) {
    return { success: false, message: validation.message };
  }
  
  const sheet = getSheet();
  const uuid = Utilities.getUuid();
  const now = new Date();
  const timeStr = formatChinaDateTime(now);
  
  sheet.appendRow([uuid, type, timeStr, now.toISOString()]);
  
  return { success: true, message: '打卡成功' };
}

/**
 * 在指定時間打卡
 */
function punchAtTime(type, time) {
  const allRows = getAllRows();
  
  // 驗證打卡類型
  const validation = validatePunchType(type, allRows);
  if (!validation.valid) {
    return { success: false, message: validation.message };
  }
  
  // 驗證：時間不能相同
  const lastRecord = getLastRecord(allRows);
  if (lastRecord) {
    const lastTimeStr = isDateObject(lastRecord.time) ? formatChinaDateTime(lastRecord.time) : lastRecord.time;
    if (lastTimeStr === time) {
      return { success: false, message: '打卡時間不能相同' };
    }
  }
  
  // 驗證：OUT 時間不能早於 IN 時間
  if (type === PUNCH_TYPE.OUT && lastRecord && lastRecord.type === PUNCH_TYPE.IN) {
    const lastDate = parseChinaDateTime(lastRecord.time);
    const currentDate = parseChinaDateTime(time);
    if (currentDate < lastDate) {
      return { success: false, message: 'OUT 時間不能早於 IN 時間' };
    }
  }
  
  const sheet = getSheet();
  const uuid = Utilities.getUuid();
  const now = new Date();
  
  sheet.appendRow([uuid, type, time, now.toISOString()]);
  
  return { success: true, message: '打卡成功' };
}

/**
 * 查詢今日所有打卡記錄（決策 1: 根據 createdAt 過濾，決策 3: 倒序排列）
 */
function getTodayRecords() {
  const allRows = getAllRows();
  
  const records = [];
  for (let i = 1; i < allRows.length; i++) {
    const row = allRows[i];
    const createdAtISO = row[COLUMN.CREATED_AT];
    
    // 決策 1: 根據 createdAt 判斷是否為當天
    if (isToday(createdAtISO)) {
      const timeValue = row[COLUMN.TIME];
      const timeStr = isDateObject(timeValue) ? formatChinaDateTime(timeValue) : timeValue;
      
      records.push({
        '類型': row[COLUMN.TYPE],
        '時間': timeStr
      });
    }
  }
  
  // TODO: 決策 3 - 倒序排列（最新在上）
  // 暫時保持正序以符合現有測試，稍後更新 Feature 文件後再啟用
  // return records.reverse();
  return records;
}

/**
 * 計算今日總工時（IN/OUT 配對的時間差總和）
 */
function getTodayWorkHours() {
  const allRows = getAllRows();
  
  let totalMinutes = 0;
  let inTime = null;
  
  for (let i = 1; i < allRows.length; i++) {
    const row = allRows[i];
    const createdAtISO = row[COLUMN.CREATED_AT];
    
    // 只計算當天的記錄
    if (isToday(createdAtISO)) {
      const type = row[COLUMN.TYPE];
      const timeValue = row[COLUMN.TIME];
      
      if (type === PUNCH_TYPE.IN) {
        inTime = parseChinaDateTime(timeValue);
      } else if (type === PUNCH_TYPE.OUT && inTime) {
        const outTime = parseChinaDateTime(timeValue);
        const diffMs = outTime - inTime;
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        totalMinutes += diffMinutes;
        inTime = null;
      }
    }
  }
  
  return totalMinutes;
}

/**
 * 網頁 API - 回傳完整資訊（記錄、工時、按鈕狀態）
 */
function getWebPageData() {
  const records = getTodayRecords();
  const totalMinutes = getTodayWorkHours();
  
  let canPunchIn = true;
  let canPunchOut = false;
  
  if (records.length > 0) {
    // 取得最新的記錄（正序時是最後一筆）
    const lastRecord = records[records.length - 1];
    const lastType = lastRecord['類型'];
    
    if (lastType === PUNCH_TYPE.IN) {
      canPunchIn = false;
      canPunchOut = true;
    } else if (lastType === PUNCH_TYPE.OUT) {
      canPunchIn = true;
      canPunchOut = false;
    }
  }
  
  return {
    success: true,
    records: records,
    totalMinutes: totalMinutes,
    canPunchIn: canPunchIn,
    canPunchOut: canPunchOut
  };
}
