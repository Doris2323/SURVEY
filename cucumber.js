/**
 * Cucumber.js 設定檔
 * 支援中文 Gherkin 語法
 */

export default {
  // Feature 檔案路徑
  paths: ['specs/features/**/*.feature'],

  // Step Definition 與 Support 檔案路徑（使用 ES Module）
  import: [
    'specs/features/support/**/*.js',
    'specs/features/step_definitions/**/*.js'
  ],

  // 跳過帶有 @ignore 標籤的 Feature（規格化階段產出，尚未實作）
  tags: 'not @ignore',

  // 輸出格式
  format: [
    'progress-bar',
    'summary',
    // HTML 報告輸出
    'html:reports/cucumber-report.html'
  ],

  // 語言設定（支援中文）
  language: 'zh-TW',

  // 失敗時停止
  failFast: false,

  // 強制退出
  forceExit: true
};
