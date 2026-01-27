/**
 * Cucumber.js 設定檔
 * 支援中文 Gherkin 語法
 */

export default {
  // Feature 檔案路徑
  paths: ['features/**/*.feature'],

  // Step Definition 路徑（使用 ES Module）
  import: ['features/step_definitions/**/*.js'],

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
