/**
 * GAS Code Loader
 *
 * 載入 Apps Script 程式碼並在沙箱環境中執行
 *
 * 重要：此載入器會模擬 Google Apps Script 環境
 * - 支援 locale 設定，讓 getDisplayValues() 回傳正確的日期格式
 * - 預設使用 zh-TW locale（台灣繁體中文）
 */

import vm from 'vm';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  createMockSpreadsheet,
  createMockSpreadsheetApp,
  createMockUtilities,
  createMockSession,
  createMockHtmlService,
  createMockContentService,
  createMockPropertiesService,
  createMockLogger,
  createMockGoogleScriptRun,
  // 日期工具函式（重新導出供測試使用）
  formatDateForLocale,
  parseChineseDate,
  isToday
} from './gas-mock.js';

// 重新導出工具函式，讓 step definitions 可以使用
export {
  formatDateForLocale,
  parseChineseDate,
  isToday,
  createMockGoogleScriptRun
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 載入 GAS 程式碼進行測試
 *
 * @param {Object} options - 設定選項
 * @param {Object} options.sheets - 工作表設定 { 名稱: [標題列] }
 * @param {string} options.locale - 日期格式的語系（'zh-TW', 'en-US', 'iso'），預設 'zh-TW'
 * @param {boolean} options.strictSerialization - 是否啟用嚴格序列化檢查（E2E 測試用），預設 false
 * @returns {Object} 包含所有 GAS 函式的測試上下文
 *
 * @example
 * // 基本用法
 * const ctx = loadGasCodeForTesting({
 *   sheets: {
 *     '打卡記錄': ['ID', '類型', '時間', '建立時間']
 *   }
 * });
 *
 * @example
 * // E2E 測試用法（啟用嚴格序列化檢查）
 * const ctx = loadGasCodeForTesting({
 *   sheets: { '打卡記錄': ['ID', '類型', '時間', '建立時間'] },
 *   strictSerialization: true  // 會在序列化失敗時拋出錯誤
 * });
 *
 * @example
 * // 使用 ISO 日期格式（測試環境）
 * const ctx = loadGasCodeForTesting({
 *   sheets: { '打卡記錄': ['ID', '類型', '時間', '建立時間'] },
 *   locale: 'iso'  // getDisplayValues() 會回傳 ISO 格式
 * });
 */
export function loadGasCodeForTesting(options = {}) {
  const {
    sheets = {},
    locale = 'zh-TW',
    strictSerialization = false
  } = options;

  // 建立 Mock 物件（傳入 locale 設定）
  const mockSpreadsheet = createMockSpreadsheet({ locale });
  const mockSpreadsheetApp = createMockSpreadsheetApp(mockSpreadsheet);
  const mockUtilities = createMockUtilities();
  const mockSession = createMockSession();
  const mockHtmlService = createMockHtmlService();
  const mockContentService = createMockContentService();
  const mockPropertiesService = createMockPropertiesService();
  const mockLogger = createMockLogger();

  // 初始化工作表
  for (const [name, headers] of Object.entries(sheets)) {
    mockSpreadsheet._getOrCreateSheet(name, headers);
  }

  // 讀取 GAS 程式碼
  const srcDir = path.join(__dirname, '..', 'src');
  const gasCodePath = path.join(srcDir, '程式碼.js');

  if (!fs.existsSync(gasCodePath)) {
    throw new Error(`找不到 GAS 程式碼檔案: ${gasCodePath}`);
  }

  const gasCode = fs.readFileSync(gasCodePath, 'utf-8');

  // 建立沙箱環境
  const sandbox = {
    SpreadsheetApp: mockSpreadsheetApp,
    Utilities: mockUtilities,
    Session: mockSession,
    HtmlService: mockHtmlService,
    ContentService: mockContentService,
    PropertiesService: mockPropertiesService,
    Logger: mockLogger,
    console: console,

    // 測試輔助方法
    _getSheet(name) {
      return mockSpreadsheet.getSheetByName(name);
    },
    _getSpreadsheet() {
      return mockSpreadsheet;
    },
    _clearAllSheets() {
      mockSpreadsheet._clear();
      for (const [name, headers] of Object.entries(sheets)) {
        mockSpreadsheet._getOrCreateSheet(name, headers);
      }
    },
    _getLocale() {
      return locale;
    }
  };

  // 建立 VM 上下文並執行程式碼
  const context = vm.createContext(sandbox);

  try {
    vm.runInContext(gasCode, context);
  } catch (error) {
    throw new Error(`執行 GAS 程式碼時發生錯誤: ${error.message}`);
  }

  // 如果啟用嚴格序列化檢查，建立 google.script.run Mock
  if (strictSerialization) {
    context._googleScriptRun = createMockGoogleScriptRun(context, {
      strictMode: true
    });
  }

  // 回傳包含所有導出函式的上下文
  return context;
}

/**
 * 取得 GAS 程式碼中定義的所有函式名稱
 * @returns {string[]} 函式名稱陣列
 */
export function getGasFunctionNames() {
  const srcDir = path.join(__dirname, '..', 'src');
  const gasCodePath = path.join(srcDir, '程式碼.js');

  if (!fs.existsSync(gasCodePath)) {
    return [];
  }

  const gasCode = fs.readFileSync(gasCodePath, 'utf-8');

  // 簡單的正則匹配函式定義
  const functionRegex = /function\s+(\w+)\s*\(/g;
  const functions = [];
  let match;

  while ((match = functionRegex.exec(gasCode)) !== null) {
    functions.push(match[1]);
  }

  return functions;
}
