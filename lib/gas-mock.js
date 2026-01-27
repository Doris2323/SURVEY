/**
 * Google Apps Script API Mock（通用版本）
 *
 * 模擬 SpreadsheetApp、Utilities 等 Google API，讓我們可以在本地測試 Apps Script
 *
 * 重要：此 Mock 會模擬 google.script.run 的序列化行為
 * - Date 物件無法序列化，會導致前端收到 null
 * - 請使用 getDisplayValues() 而非 getValues() 來回傳資料給前端
 */

import fs from 'fs';
import path from 'path';

// ========== 日期格式化工具 ==========

/**
 * 格式化日期為指定 locale 的顯示格式
 * 模擬 Google Sheets 在不同語系環境下的日期顯示
 *
 * @param {Date} date - 要格式化的日期
 * @param {string} locale - 語系（'zh-TW', 'en-US', 'iso'）
 * @returns {string} 格式化後的日期字串
 *
 * @example
 * // 中文格式
 * formatDateForLocale(new Date(), 'zh-TW')
 * // => "2026/1/26 下午 4:44:36"
 *
 * // ISO 格式
 * formatDateForLocale(new Date(), 'iso')
 * // => "2026-01-26T16:44:36.000Z"
 */
export function formatDateForLocale(date, locale = 'zh-TW') {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    return String(date);
  }

  if (locale === 'zh-TW') {
    // 模擬 Google Sheets 繁體中文環境的日期格式
    // 格式：2026/1/26 下午 4:44:36
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    let hour = date.getHours();
    const minute = String(date.getMinutes()).padStart(2, '0');
    const second = String(date.getSeconds()).padStart(2, '0');

    const period = hour >= 12 ? '下午' : '上午';
    if (hour > 12) hour -= 12;
    if (hour === 0) hour = 12;

    return `${year}/${month}/${day} ${period} ${hour}:${minute}:${second}`;
  }

  if (locale === 'en-US') {
    return date.toLocaleString('en-US');
  }

  // 預設 ISO 格式
  return date.toISOString();
}

/**
 * 解析中文日期格式
 * 支援 Google Sheets 繁體中文環境的日期格式
 *
 * @param {string|Date} dateInput - 日期字串或 Date 物件
 * @returns {Date} 解析後的 Date 物件
 *
 * @example
 * parseChineseDate('2026/1/26 下午 4:44:36')
 * // => Date object (16:44:36)
 *
 * parseChineseDate('2026/1/26 上午 9:30:00')
 * // => Date object (09:30:00)
 */
export function parseChineseDate(dateInput) {
  // 如果已經是 Date 物件，直接回傳
  if (dateInput instanceof Date) {
    return dateInput;
  }

  const str = String(dateInput);

  // 中文格式：2026/1/26 下午 4:44:36
  const zhFormat = /^(\d{4})\/(\d{1,2})\/(\d{1,2})\s*(上午|下午)\s*(\d{1,2}):(\d{2}):(\d{2})$/;
  const match = str.match(zhFormat);

  if (match) {
    const [, year, month, day, period, hour, minute, second] = match;
    let h = parseInt(hour, 10);

    // 12 小時制轉換為 24 小時制
    if (period === '下午' && h !== 12) {
      h += 12;
    } else if (period === '上午' && h === 12) {
      h = 0;
    }

    return new Date(
      parseInt(year, 10),
      parseInt(month, 10) - 1,
      parseInt(day, 10),
      h,
      parseInt(minute, 10),
      parseInt(second, 10)
    );
  }

  // 嘗試標準格式（ISO 或其他）
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }

  // 無法解析，回傳 Invalid Date
  return new Date(NaN);
}

/**
 * 智能判斷日期是否為今天
 * 自動偵測中文格式或 ISO 格式並正確比較
 *
 * @param {string|Date} dateInput - 日期字串或 Date 物件
 * @returns {boolean} 是否為今天
 *
 * @example
 * isToday('2026/1/26 下午 4:44:36')  // 如果今天是 2026/1/26 => true
 * isToday(new Date())                 // => true
 */
export function isToday(dateInput) {
  const date = parseChineseDate(dateInput);

  if (isNaN(date.getTime())) {
    return false;
  }

  const today = new Date();

  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

/**
 * 檢查字串是否為日期時間格式
 * @param {*} value - 要檢查的值
 * @returns {boolean}
 */
function isDateTimeString(value) {
  if (typeof value !== 'string') return false;
  
  // 匹配中文格式：2026/1/27上午9:00:00 或 2026/1/27下午2:00:00
  const chineseFormat = /^\d{4}\/\d{1,2}\/\d{1,2}(上午|下午)\d{1,2}:\d{2}:\d{2}$/;
  if (chineseFormat.test(value)) {
    return true;
  }
  
  // 匹配 "yyyy-MM-dd HH:mm:ss" 或 ISO 格式
  return /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}/.test(value);
}

/**
 * 將日期時間字串轉換為 Date 物件（模擬 GAS 行為）
 * 
 * ⚠️ 重要：模擬 Google Sheets 的自動類型轉換
 * 當寫入看起來像日期的字串時，Google Sheets 會自動將它轉換為 Date 物件
 * 
 * @param {*} value - 要轉換的值
 * @returns {*} Date 物件或原始值
 */
function convertToDateIfNeeded(value) {
  if (typeof value === 'string' && isDateTimeString(value)) {
    // 中文格式：2026/1/27上午9:00:00
    const chineseFormat = /^(\d{4})\/(\d{1,2})\/(\d{1,2})(上午|下午)(\d{1,2}):(\d{2}):(\d{2})$/;
    const match = value.match(chineseFormat);
    
    if (match) {
      const [, year, month, day, period, hour, minute, second] = match;
      let hour24 = parseInt(hour, 10);
      
      // 12 小時制轉 24 小時制
      if (period === '下午' && hour24 !== 12) {
        hour24 += 12;
      } else if (period === '上午' && hour24 === 12) {
        hour24 = 0;
      }
      
      return new Date(
        parseInt(year, 10),
        parseInt(month, 10) - 1,
        parseInt(day, 10),
        hour24,
        parseInt(minute, 10),
        parseInt(second, 10)
      );
    }
    
    // ISO 格式或其他標準格式
    return new Date(value.replace(' ', 'T'));
  }
  
  return value;
}

/**
 * 格式化儲存格值為顯示字串
 * 模擬 getDisplayValues() 的行為
 *
 * @param {*} cell - 儲存格值
 * @param {string} locale - 語系
 * @returns {string}
 */
function formatCellForDisplay(cell, locale) {
  if (cell instanceof Date) {
    return formatDateForLocale(cell, locale);
  }
  return String(cell);
}

/**
 * 建立 Mock Sheet（模擬試算表工作表）
 *
 * @param {string[]} headers - 標題列（可選）
 * @param {Object} options - 選項
 * @param {string} options.locale - 日期格式的語系（'zh-TW', 'en-US', 'iso'），預設 'zh-TW'
 */
export function createMockSheet(headers = [], options = {}) {
  const { locale = 'zh-TW' } = options;
  let data = headers.length > 0 ? [headers] : [];

  return {
    getDataRange() {
      return {
        /**
         * getValues() 模擬真實 GAS 行為：日期時間會轉為 Date 物件
         *
         * ⚠️ 警告：如果透過 google.script.run 傳遞給前端，
         * Date 物件會導致序列化失敗，前端收到 null
         *
         * 請使用 getDisplayValues() 來回傳資料給前端
         */
        getValues() {
          return data.map(row => row.map(cell => convertToDateIfNeeded(cell)));
        },

        /**
         * getDisplayValues() 回傳格式化後的字串
         *
         * ✅ 推薦：用於回傳資料給前端
         *
         * 注意：在 zh-TW locale 下，日期會格式化為中文格式
         * 例如：「2026/1/26 下午 4:44:36」
         * 前端需使用 parseChineseDate() 來解析
         */
        getDisplayValues() {
          return data.map(row => row.map(cell => formatCellForDisplay(cell, locale)));
        }
      };
    },

    getRange(row, col, numRows, numCols) {
      return {
        /**
         * getValues() - 回傳原始值（包含 Date 物件）
         * ⚠️ 不適合透過 google.script.run 傳遞給前端
         */
        getValues() {
          const result = [];
          for (let i = 0; i < numRows; i++) {
            const rowData = [];
            for (let j = 0; j < numCols; j++) {
              const cell = data[row - 1 + i]?.[col - 1 + j] ?? '';
              rowData.push(convertToDateIfNeeded(cell));
            }
            result.push(rowData);
          }
          return result;
        },

        /**
         * getDisplayValues() - 回傳格式化字串
         * ✅ 適合透過 google.script.run 傳遞給前端
         */
        getDisplayValues() {
          const result = [];
          for (let i = 0; i < numRows; i++) {
            const rowData = [];
            for (let j = 0; j < numCols; j++) {
              const cell = data[row - 1 + i]?.[col - 1 + j] ?? '';
              rowData.push(formatCellForDisplay(cell, locale));
            }
            result.push(rowData);
          }
          return result;
        },

        setValues(values) {
          for (let i = 0; i < values.length; i++) {
            for (let j = 0; j < values[i].length; j++) {
              if (!data[row - 1 + i]) data[row - 1 + i] = [];
              data[row - 1 + i][col - 1 + j] = values[i][j];
            }
          }
        }
      };
    },

    /**
     * appendRow - 模擬 Google Sheets 的自動類型轉換
     * 
     * ⚠️ 重要：Google Sheets 會在寫入時自動將日期字串轉換為 Date 物件
     * 例如：寫入「2026/1/27上午9:00:00」→ 自動轉為 Date 物件
     * 
     * 這個行為導致：
     * - getValues() 返回 Date 物件
     * - getDisplayValues() 返回格式化的字串
     */
    appendRow(row) {
      // 模擬 Google Sheets 的自動類型轉換
      const convertedRow = row.map(cell => convertToDateIfNeeded(cell));
      data.push(convertedRow);
    },

    getLastRow() {
      return data.length;
    },

    getLastColumn() {
      return data.length > 0 ? Math.max(...data.map(row => row.length)) : 0;
    },

    clear() {
      data = headers.length > 0 ? [headers] : [];
    },

    // 測試用：取得所有資料
    _getData() {
      return data;
    },

    // 測試用：設定資料
    _setData(newData) {
      data = newData;
    },

    // 測試用：取得 locale 設定
    _getLocale() {
      return locale;
    }
  };
}

/**
 * 建立 Mock Spreadsheet（模擬試算表）
 *
 * @param {Object} options - 選項
 * @param {string} options.locale - 日期格式的語系（'zh-TW', 'en-US', 'iso'），預設 'zh-TW'
 */
export function createMockSpreadsheet(options = {}) {
  const { locale = 'zh-TW' } = options;
  const sheets = {};

  return {
    getSheetByName(name) {
      return sheets[name] || null;
    },

    insertSheet(name) {
      sheets[name] = createMockSheet([], { locale });
      return sheets[name];
    },

    getSheets() {
      return Object.values(sheets);
    },

    getName() {
      return 'Mock Spreadsheet';
    },

    // 測試用：取得或建立工作表
    _getOrCreateSheet(name, headers = []) {
      if (!sheets[name]) {
        sheets[name] = createMockSheet(headers, { locale });
      }
      return sheets[name];
    },

    // 測試用：清空所有工作表
    _clear() {
      for (const name in sheets) {
        delete sheets[name];
      }
    },

    // 測試用：取得 locale 設定
    _getLocale() {
      return locale;
    }
  };
}

/**
 * 建立 Mock SpreadsheetApp
 */
export function createMockSpreadsheetApp(mockSpreadsheet) {
  return {
    openById(id) {
      return mockSpreadsheet;
    },

    getActiveSpreadsheet() {
      return mockSpreadsheet;
    },

    getUi() {
      return {
        createMenu(name) {
          return {
            addItem() { return this; },
            addSeparator() { return this; },
            addSubMenu() { return this; },
            addToUi() {}
          };
        },
        alert(message) {
          console.log('[UI Alert]', message);
        },
        prompt(title, message, buttons) {
          return { getSelectedButton: () => 'OK', getResponseText: () => '' };
        },
        ButtonSet: { OK: 'OK', OK_CANCEL: 'OK_CANCEL', YES_NO: 'YES_NO' },
        Button: { OK: 'OK', CANCEL: 'CANCEL', YES: 'YES', NO: 'NO' }
      };
    }
  };
}

/**
 * 建立 Mock Utilities
 */
export function createMockUtilities() {
  let uuidCounter = 0;

  return {
    getUuid() {
      uuidCounter++;
      return `mock-uuid-${Date.now()}-${uuidCounter}`;
    },

    formatDate(date, timezone, format) {
      // 簡單實作，實際可依 format 調整
      if (format === 'yyyy-MM-dd HH:mm:ss') {
        return date.toISOString().replace('T', ' ').substring(0, 19);
      }
      if (format === 'yyyy-MM-dd') {
        return date.toISOString().substring(0, 10);
      }
      if (format === 'HH:mm:ss') {
        return date.toISOString().substring(11, 19);
      }
      return date.toISOString();
    },

    sleep(milliseconds) {
      // 在測試中不真的 sleep
    }
  };
}

/**
 * 建立 Mock Session
 */
export function createMockSession() {
  return {
    getScriptTimeZone() {
      return 'Asia/Taipei';
    },

    getActiveUser() {
      return {
        getEmail() {
          return 'test@example.com';
        }
      };
    },

    getEffectiveUser() {
      return {
        getEmail() {
          return 'test@example.com';
        }
      };
    }
  };
}

/**
 * 建立 Mock HtmlService
 */
export function createMockHtmlService() {
  return {
    createHtmlOutputFromFile(filename) {
      // 實際讀取 HTML 檔案內容
      let htmlContent;
      try {
        // 尋找 HTML 檔案：優先 src/，其次當前目錄
        const possiblePaths = [
          path.join(process.cwd(), 'src', `${filename}.html`),
          path.join(process.cwd(), 'src', filename),
          path.join(process.cwd(), `${filename}.html`),
          path.join(process.cwd(), filename)
        ];
        
        let found = false;
        for (const filePath of possiblePaths) {
          if (fs.existsSync(filePath)) {
            htmlContent = fs.readFileSync(filePath, 'utf-8');
            found = true;
            break;
          }
        }
        
        if (!found) {
          throw new Error(`HTML file not found: ${filename}`);
        }
      } catch (error) {
        // 如果檔案不存在，返回錯誤訊息（這樣測試會失敗）
        htmlContent = `<!-- ERROR: ${error.message} -->`;
      }
      
      return {
        _title: '',
        _content: htmlContent,
        setTitle(title) { 
          this._title = title;
          return this; 
        },
        setXFrameOptionsMode(mode) { return this; },
        setFaviconUrl(url) { return this; },
        getContent() { return this._content; },
        getTitle() { return this._title; }
      };
    },

    createHtmlOutput(html) {
      return {
        _title: '',
        _content: html,
        setTitle(title) { 
          this._title = title;
          return this; 
        },
        setXFrameOptionsMode(mode) { return this; },
        getContent() { return this._content; },
        getTitle() { return this._title; }
      };
    },

    createTemplateFromFile(filename) {
      const serviceInstance = this;
      return {
        evaluate() {
          // 簡化版：直接讀取檔案（實際 Apps Script 的 Template 支援更多功能）
          return serviceInstance.createHtmlOutputFromFile(filename);
        }
      };
    },

    XFrameOptionsMode: {
      ALLOWALL: 'ALLOWALL',
      DEFAULT: 'DEFAULT'
    }
  };
}

/**
 * 建立 Mock ContentService
 */
export function createMockContentService() {
  return {
    createTextOutput(text) {
      let content = text;
      let mimeType = 'TEXT';

      return {
        setMimeType(type) {
          mimeType = type;
          return this;
        },
        getContent() {
          return content;
        },
        getMimeType() {
          return mimeType;
        }
      };
    },

    MimeType: {
      JSON: 'JSON',
      TEXT: 'TEXT',
      XML: 'XML',
      HTML: 'HTML'
    }
  };
}

/**
 * 建立 Mock PropertiesService
 */
export function createMockPropertiesService() {
  const scriptProperties = {};
  const userProperties = {};
  const documentProperties = {};

  function createPropertyStore(store) {
    return {
      getProperty(key) {
        return store[key] || null;
      },
      setProperty(key, value) {
        store[key] = value;
      },
      deleteProperty(key) {
        delete store[key];
      },
      getProperties() {
        return { ...store };
      },
      setProperties(props, deleteAllOthers = false) {
        if (deleteAllOthers) {
          for (const key in store) delete store[key];
        }
        Object.assign(store, props);
      }
    };
  }

  return {
    getScriptProperties() {
      return createPropertyStore(scriptProperties);
    },
    getUserProperties() {
      return createPropertyStore(userProperties);
    },
    getDocumentProperties() {
      return createPropertyStore(documentProperties);
    }
  };
}

/**
 * 檢查值是否包含無法序列化的內容
 * 模擬 google.script.run 的行為：Date 物件、NaN 會導致回傳 null
 *
 * @param {*} value - 要檢查的值
 * @param {string} path - 當前路徑（用於錯誤訊息）
 * @returns {{ canSerialize: boolean, reason?: string, solution?: string, example?: string }}
 */
function checkSerializable(value, path = 'root') {
  if (value === null || value === undefined) {
    return { canSerialize: true };
  }

  // Date 物件無法正確序列化
  if (value instanceof Date) {
    return {
      canSerialize: false,
      reason: `Date 物件在 ${path}`,
      solution: '請使用 getDisplayValues() 而非 getValues() 來取得資料',
      example: `
// ❌ 錯誤：getValues() 回傳 Date 物件，無法透過 google.script.run 傳遞
function getRecordsForWeb() {
  const data = sheet.getDataRange().getValues();
  return { records: data };  // Date 物件會導致前端收到 null
}

// ✅ 正確：getDisplayValues() 回傳字串，可以正確序列化
function getRecordsForWeb() {
  const data = sheet.getDataRange().getDisplayValues();
  return { records: data };  // 字串可以正確傳遞給前端
}

// ✅ 前端解析中文日期格式
import { parseChineseDate } from './gas-mock.js';
const date = parseChineseDate('2026/1/26 下午 4:44:36');
`
    };
  }

  // NaN 會被序列化為 null，導致整個回傳值變成 null
  if (typeof value === 'number' && isNaN(value)) {
    return {
      canSerialize: false,
      reason: `NaN 在 ${path}`,
      solution: '請在計算前檢查輸入值，或使用預設值',
      example: `
// ❌ 錯誤：NaN 會導致整個回傳值變成 null
function getTodayWorkHours() {
  const minutes = calculateMinutes();  // 可能回傳 NaN
  return minutes / 60;
}

// ✅ 正確：檢查並處理 NaN
function getTodayWorkHours() {
  const minutes = calculateMinutes();
  if (isNaN(minutes)) {
    return 0;  // 使用預設值
  }
  return minutes / 60;
}
`
    };
  }

  // 遞迴檢查陣列
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      const check = checkSerializable(value[i], `${path}[${i}]`);
      if (!check.canSerialize) return check;
    }
    return { canSerialize: true };
  }

  // 遞迴檢查物件
  if (typeof value === 'object') {
    for (const key in value) {
      const check = checkSerializable(value[key], `${path}.${key}`);
      if (!check.canSerialize) return check;
    }
    return { canSerialize: true };
  }

  return { canSerialize: true };
}

/**
 * 建立 Mock google.script.run（給前端測試用）
 * 使用 Proxy 動態處理任何後端函式呼叫
 *
 * 模擬真實 google.script.run 的序列化行為：
 * - 如果回傳值包含 Date 物件，會回傳 null（不會拋錯）
 * - 如果回傳值包含 NaN，會回傳 null（不會拋錯）
 *
 * @param {Object} gasContext - GAS 執行環境
 * @param {Object} options - 選項
 * @param {boolean} options.strictMode - 是否在序列化失敗時拋出錯誤（預設 false，模擬真實行為）
 */
export function createMockGoogleScriptRun(gasContext, options = {}) {
  const { strictMode = false } = options;
  let successHandler = () => {};
  let failureHandler = () => {};

  const handler = {
    get(target, prop) {
      if (prop === 'withSuccessHandler') {
        return (handler) => {
          successHandler = handler;
          return new Proxy({}, handler);
        };
      }
      if (prop === 'withFailureHandler') {
        return (handler) => {
          failureHandler = handler;
          return new Proxy({}, handler);
        };
      }

      // 動態處理任何函式呼叫
      return (...args) => {
        if (typeof gasContext[prop] === 'function') {
          try {
            const result = gasContext[prop](...args);

            // 模擬 google.script.run 的序列化行為
            const serializeCheck = checkSerializable(result);
            if (!serializeCheck.canSerialize) {
              const errorMessage = [
                `[Mock google.script.run] 序列化失敗`,
                ``,
                `問題: ${serializeCheck.reason}`,
                `解法: ${serializeCheck.solution}`,
                serializeCheck.example ? `\n範例:${serializeCheck.example}` : ''
              ].join('\n');

              if (strictMode) {
                // 嚴格模式：拋出錯誤讓測試失敗
                throw new Error(errorMessage);
              } else {
                // 模擬真實行為：靜默回傳 null + 警告
                console.warn(errorMessage);
                setTimeout(() => successHandler(null), 0);
                return;
              }
            }

            setTimeout(() => successHandler(result), 0);
          } catch (error) {
            setTimeout(() => failureHandler(error), 0);
          }
        } else {
          setTimeout(() => failureHandler(new Error(`函式 ${prop} 不存在`)), 0);
        }
      };
    }
  };

  return new Proxy({}, handler);
}

/**
 * 建立 Mock Logger
 */
export function createMockLogger() {
  const logs = [];

  return {
    log(message) {
      logs.push(message);
      console.log('[Logger]', message);
    },
    clear() {
      logs.length = 0;
    },
    getLog() {
      return logs.join('\n');
    },
    // 測試用
    _getLogs() {
      return [...logs];
    }
  };
}
