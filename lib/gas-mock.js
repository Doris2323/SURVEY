/**
 * Google Apps Script API Mock
 *
 * 純粹的 GAS API Fake 實現，使用 FakeSheet2DArray 作為資料後端
 *
 * 重要：此 Mock 會模擬 google.script.run 的序列化行為
 * - Date 物件無法序列化，會導致前端收到 null
 * - 請使用 getDisplayValues() 而非 getValues() 來回傳資料給前端
 */

import fs from 'fs';
import path from 'path';
import { FakeSheet2DArray } from './fake-sheet.js';

// ========== Mock Sheet ==========

/**
 * 建立 Mock Sheet（模擬試算表工作表）
 * 委派給 FakeSheet2DArray 處理所有資料操作
 */
export function createMockSheet(headers = [], options = {}) {
  const sheet = new FakeSheet2DArray(headers, options);

  return {
    getDataRange() {
      return sheet.getDataRange();
    },

    getRange(row, col, numRows, numCols) {
      return sheet.getRange(row, col, numRows, numCols);
    },

    appendRow(row) {
      sheet.appendRow(row);
      return this;
    },

    getLastRow() {
      return sheet.getLastRow();
    },

    getLastColumn() {
      return sheet.getLastColumn();
    },

    clear() {
      sheet.clear();
      return this;
    },

    _getData() {
      return sheet._getData();
    },

    _setData(data) {
      sheet._setData(data);
    }
  };
}

// ========== Mock Spreadsheet ==========

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

    _getOrCreateSheet(name, headers = []) {
      if (!sheets[name]) {
        sheets[name] = createMockSheet(headers, { locale });
      }
      return sheets[name];
    }
  };
}

// ========== Mock SpreadsheetApp ==========

export function createMockSpreadsheetApp(mockSpreadsheet) {
  return {
    openById() {
      return mockSpreadsheet;
    },

    getActiveSpreadsheet() {
      return mockSpreadsheet;
    },

    getUi() {
      return {
        createMenu() {
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
        prompt() {
          return { getSelectedButton: () => 'OK', getResponseText: () => '' };
        },
        ButtonSet: { OK: 'OK', OK_CANCEL: 'OK_CANCEL', YES_NO: 'YES_NO' },
        Button: { OK: 'OK', CANCEL: 'CANCEL', YES: 'YES', NO: 'NO' }
      };
    }
  };
}

// ========== Mock Utilities ==========

export function createMockUtilities() {
  let uuidCounter = 0;

  return {
    getUuid() {
      uuidCounter++;
      return `mock-uuid-${Date.now()}-${uuidCounter}`;
    },

    formatDate(date, timezone, format) {
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

    sleep() {}
  };
}

// ========== Mock Session ==========

export function createMockSession(options = {}) {
  let mockEmail = options.email || 'test@example.com';

  return {
    getScriptTimeZone() {
      return 'Asia/Taipei';
    },

    getActiveUser() {
      return {
        getEmail() {
          return mockEmail;
        }
      };
    },

    getEffectiveUser() {
      return {
        getEmail() {
          return mockEmail;
        }
      };
    },

    _setMockEmail(email) {
      mockEmail = email;
    }
  };
}

// ========== Mock HtmlService ==========

export function createMockHtmlService() {
  return {
    createHtmlOutputFromFile(filename) {
      let htmlContent;
      try {
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
        htmlContent = `<!-- ERROR: ${error.message} -->`;
      }

      return this._createHtmlOutput(htmlContent);
    },

    createHtmlOutput(html) {
      return this._createHtmlOutput(html);
    },

    _createHtmlOutput(content) {
      return {
        _title: '',
        _content: content,
        setTitle(title) {
          this._title = title;
          return this;
        },
        setXFrameOptionsMode() { return this; },
        setFaviconUrl() { return this; },
        getContent() { return this._content; },
        getTitle() { return this._title; }
      };
    },

    createTemplateFromFile(filename) {
      const serviceInstance = this;
      const templateContext = {};

      return new Proxy(templateContext, {
        set(target, prop, value) {
          target[prop] = value;
          return true;
        },
        get(target, prop) {
          if (prop === 'evaluate') {
            return function() {
              return serviceInstance._evaluateTemplate(filename, target);
            };
          }
          return target[prop];
        }
      });
    },

    _evaluateTemplate(filename, context) {
      const htmlOutput = this.createHtmlOutputFromFile(filename);
      let html = htmlOutput.getContent();

      // <?!= unescaped output ?>
      html = html.replace(/<\?!=\s*(\w+)\s*\?>/g, (match, varName) => {
        if (!(varName in context)) {
          throw new Error(`模板錯誤：變數 '${varName}' 未定義。`);
        }
        return context[varName];
      });

      // <?= escaped output ?>
      html = html.replace(/<\?=\s*(\w+)\s*\?>/g, (match, varName) => {
        if (!(varName in context)) {
          throw new Error(`模板錯誤：變數 '${varName}' 未定義。`);
        }
        return String(context[varName])
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');
      });

      return this.createHtmlOutput(html);
    },

    XFrameOptionsMode: {
      ALLOWALL: 'ALLOWALL',
      DEFAULT: 'DEFAULT'
    }
  };
}

// ========== Mock ContentService ==========

export function createMockContentService() {
  return {
    createTextOutput(text) {
      let mimeType = 'TEXT';

      return {
        setMimeType(type) {
          mimeType = type;
          return this;
        },
        getContent() {
          return text;
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

// ========== Mock PropertiesService ==========

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

// ========== Mock Logger ==========

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
    }
  };
}

// ========== Mock google.script.run ==========

function checkSerializable(value, path = 'root') {
  if (value === null || value === undefined) {
    return { canSerialize: true };
  }

  if (value instanceof Date) {
    return {
      canSerialize: false,
      reason: `Date 物件在 ${path}`,
      solution: '請使用 getDisplayValues() 而非 getValues() 來取得資料'
    };
  }

  if (typeof value === 'number' && isNaN(value)) {
    return {
      canSerialize: false,
      reason: `NaN 在 ${path}`,
      solution: '請在計算前檢查輸入值，或使用預設值'
    };
  }

  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      const check = checkSerializable(value[i], `${path}[${i}]`);
      if (!check.canSerialize) return check;
    }
    return { canSerialize: true };
  }

  if (typeof value === 'object') {
    for (const key in value) {
      const check = checkSerializable(value[key], `${path}.${key}`);
      if (!check.canSerialize) return check;
    }
    return { canSerialize: true };
  }

  return { canSerialize: true };
}

export function createMockGoogleScriptRun(gasContext, options = {}) {
  const { strictMode = false } = options;
  let successHandler = () => {};
  let failureHandler = () => {};

  const handler = {
    get(target, prop) {
      if (prop === 'withSuccessHandler') {
        return (fn) => {
          successHandler = fn;
          return new Proxy({}, handler);
        };
      }
      if (prop === 'withFailureHandler') {
        return (fn) => {
          failureHandler = fn;
          return new Proxy({}, handler);
        };
      }

      return (...args) => {
        if (typeof gasContext[prop] === 'function') {
          try {
            const result = gasContext[prop](...args);

            const serializeCheck = checkSerializable(result);
            if (!serializeCheck.canSerialize) {
              const errorMessage = `[google.script.run] 序列化失敗\n問題: ${serializeCheck.reason}\n解法: ${serializeCheck.solution}`;

              if (strictMode) {
                throw new Error(errorMessage);
              } else {
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
