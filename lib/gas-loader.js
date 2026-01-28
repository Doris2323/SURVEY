/**
 * GAS Code Loader
 *
 * 載入 Apps Script 程式碼並在沙箱環境中執行
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
  createMockGoogleScriptRun
} from './gas-mock.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 載入 GAS 程式碼進行測試
 *
 * @param {Object} options - 設定選項
 * @param {Object} options.sheets - 工作表設定 { 名稱: [標題列] }
 * @param {string} options.locale - 日期格式的語系，預設 'zh-TW'
 * @param {boolean} options.strictSerialization - 是否啟用嚴格序列化檢查
 * @returns {Object} 包含所有 GAS 函式的測試上下文
 */
export function loadGasCodeForTesting(options = {}) {
  const {
    sheets = {},
    locale = 'zh-TW',
    strictSerialization = false
  } = options;

  // 建立 Mock 物件
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

  // 讀取所有 GAS 程式碼
  const srcDir = path.join(__dirname, '..', 'src');

  if (!fs.existsSync(srcDir)) {
    throw new Error(`找不到 src 目錄: ${srcDir}`);
  }

  // 遞迴讀取所有 .js 檔案（包含子目錄如 utils/）
  function getAllJsFiles(dir) {
    const files = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...getAllJsFiles(fullPath));
      } else if (entry.name.endsWith('.js')) {
        files.push(fullPath);
      }
    }
    return files.sort();
  }

  const jsFiles = getAllJsFiles(srcDir);

  if (jsFiles.length === 0) {
    throw new Error(`src 目錄中沒有 .js 檔案`);
  }

  // 合併所有 JS 檔案內容
  const gasCode = jsFiles
    .map(f => fs.readFileSync(f, 'utf-8'))
    .join('\n\n');

  // Mock 時間變數
  let mockTimeValue = null;

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

    // 測試用 Mock 時間
    get _mockTime() {
      return mockTimeValue;
    },

    _setMockTime(timeString) {
      mockTimeValue = timeString;
    },

    _setMockEmail(email) {
      mockSession._setMockEmail(email);
    }
  };

  // 建立 VM 上下文並執行程式碼
  const context = vm.createContext(sandbox);

  try {
    vm.runInContext(gasCode, context);
  } catch (error) {
    throw new Error(`執行 GAS 程式碼時發生錯誤: ${error.message}`);
  }

  // 如果啟用嚴格序列化檢查
  if (strictSerialization) {
    context._googleScriptRun = createMockGoogleScriptRun(context, {
      strictMode: true
    });
  }

  return context;
}
