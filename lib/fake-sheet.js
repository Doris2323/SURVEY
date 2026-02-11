/**
 * FakeSheet2DArray and FakeRange - Pure JavaScript simulation of GAS Sheet/Range APIs
 *
 * Feature: 001-sheet-fake-2d-array
 *
 * Design Principles:
 * - 100% GAS API Fidelity: API must match real GAS exactly
 * - 1-based indexing: All row/column indices are 1-based (matching GAS)
 * - Date auto-conversion: Date-formatted strings converted to Date objects on write
 *
 * @module fake-sheet
 */

// ========== Date Conversion Helpers ==========

/**
 * Checks if a string looks like a date-time format
 * @param {*} value - Value to check
 * @returns {boolean}
 */
function isDateTimeString(value) {
  if (typeof value !== 'string') return false;

  // Chinese format: 2026/1/27上午9:00:00
  const chineseFormat = /^\d{4}\/\d{1,2}\/\d{1,2}(上午|下午)\d{1,2}:\d{2}:\d{2}$/;
  if (chineseFormat.test(value)) return true;

  // English format: 2026/1/27 AM9:00:00 or 2026/1/27 PM 06:00:00
  const englishFormat = /^\d{4}\/\d{1,2}\/\d{1,2}\s*(AM|PM)\s*\d{1,2}:\d{2}:\d{2}$/;
  if (englishFormat.test(value)) return true;

  // ISO format
  return /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}/.test(value);
}

function convertToDateIfNeeded(value) {
  if (typeof value === 'string' && isDateTimeString(value)) {
    const str = value.trim();

    // Chinese format
    const chineseMatch = str.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})(上午|下午)(\d{1,2}):(\d{2}):(\d{2})$/);
    if (chineseMatch) {
      const [, y, m, d, period, hh, mm, ss] = chineseMatch;
      let hour = parseInt(hh, 10);
      if (period === '下午' && hour !== 12) hour += 12;
      else if (period === '上午' && hour === 12) hour = 0;
      return new Date(y, m - 1, d, hour, mm, ss);
    }

    // English format
    const englishMatch = str.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})\s+(AM|PM)(\d{1,2}):(\d{2}):(\d{2})$/);
    if (englishMatch) {
      const [, y, m, d, period, hh, mm, ss] = englishMatch;
      let hour = parseInt(hh, 10);
      if (period === 'PM' && hour !== 12) hour += 12;
      else if (period === 'AM' && hour === 12) hour = 0;
      return new Date(y, m - 1, d, hour, mm, ss);
    }

    // ISO
    return new Date(str.replace(' ', 'T'));
  }
  return value;
}

/**
 * Formats a Date to locale-specific display string
 *
 * @param {Date} date - Date to format
 * @param {string} locale - Locale ('zh-TW', 'en-US', 'iso')
 * @returns {string}
 */
function formatDateForLocale(date, locale = 'zh-TW') {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    return String(date);
  }

  if (locale === 'zh-TW') {
    // Chinese format: 2026/1/27上午9:00:00
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    let hour = date.getHours();
    const minute = String(date.getMinutes()).padStart(2, '0');
    const second = String(date.getSeconds()).padStart(2, '0');

    const period = hour >= 12 ? '下午' : '上午';
    if (hour > 12) hour -= 12;
    if (hour === 0) hour = 12;

    return `${year}/${month}/${day}${period}${hour}:${minute}:${second}`;
  }

  if (locale === 'en-US') {
    return date.toLocaleString('en-US');
  }

  // Default ISO format
  return date.toISOString();
}

/**
 * Formats a cell value for display (simulates getDisplayValues behavior)
 *
 * @param {*} cell - Cell value
 * @param {string} locale - Locale
 * @returns {string}
 */
function formatCellForDisplay(cell, locale) {
  if (cell === null || cell === undefined) {
    return '';
  }
  if (cell instanceof Date) {
    return formatDateForLocale(cell, locale);
  }
  if (typeof cell === 'boolean') {
    return cell ? 'TRUE' : 'FALSE';
  }
  return String(cell);
}

// ========== FakeRange Class ==========

/**
 * FakeRange - Simulates Google Apps Script Range class
 *
 * Represents a rectangular area of cells in a FakeSheet2DArray.
 * All row/column indices are 1-based (matching GAS API).
 */
export class FakeRange {
  /**
   * @param {FakeSheet2DArray} sheet - Parent sheet reference
   * @param {number} row - Starting row (1-based)
   * @param {number} col - Starting column (1-based)
   * @param {number} numRows - Number of rows
   * @param {number} numCols - Number of columns
   */
  constructor(sheet, row, col, numRows, numCols) {
    this._sheet = sheet;
    this._row = row;
    this._col = col;
    this._numRows = numRows;
    this._numCols = numCols;
  }

  /**
   * Returns the values in the range as a 2D array.
   * Date-formatted strings are converted to Date objects.
   *
   * @returns {any[][]}
   */
  getValues() {
    const data = this._sheet._getData();
    const result = [];

    for (let i = 0; i < this._numRows; i++) {
      const rowData = [];
      for (let j = 0; j < this._numCols; j++) {
        const rowIndex = this._row - 1 + i;
        const colIndex = this._col - 1 + j;
        const cell = data[rowIndex]?.[colIndex] ?? '';
        // Convert date strings to Date objects when reading
        rowData.push(convertToDateIfNeeded(cell));
      }
      result.push(rowData);
    }

    return result;
  }

  /**
   * Returns the display values in the range as formatted strings.
   *
   * @returns {string[][]}
   */
  getDisplayValues() {
    const data = this._sheet._getData();
    const locale = this._sheet._getLocale();
    const result = [];

    for (let i = 0; i < this._numRows; i++) {
      const rowData = [];
      for (let j = 0; j < this._numCols; j++) {
        const rowIndex = this._row - 1 + i;
        const colIndex = this._col - 1 + j;
        const cell = data[rowIndex]?.[colIndex] ?? '';
        rowData.push(formatCellForDisplay(cell, locale));
      }
      result.push(rowData);
    }

    return result;
  }

  /**
   * Sets the values in the range.
   *
   * @param {any[][]} values - 2D array of values to set
   * @returns {FakeRange} - Returns this for chaining
   */
  setValues(values) {
    const data = this._sheet._getData();

    for (let i = 0; i < values.length; i++) {
      for (let j = 0; j < values[i].length; j++) {
        const rowIndex = this._row - 1 + i;
        const colIndex = this._col - 1 + j;

        // Ensure row exists
        if (!data[rowIndex]) {
          data[rowIndex] = [];
        }

        // Fill any gaps with empty strings
        while (data[rowIndex].length < colIndex) {
          data[rowIndex].push('');
        }

        // Convert date strings to Date objects on write (simulating GAS behavior)
        data[rowIndex][colIndex] = convertToDateIfNeeded(values[i][j]);
      }
    }

    return this;
  }

  /**
   * Sets a single value in the range (matching GAS Range.setValue 行為).
   *
   * @param {*} value - Value to assign
   * @returns {FakeRange}
   */
  setValue(value) {
    return this.setValues([[value]]);
  }
}

// ========== FakeSheet2DArray Class ==========

/**
 * FakeSheet2DArray - Simulates Google Apps Script Sheet class
 *
 * Maintains spreadsheet data as a 2D array with optional headers.
 * All row/column indices are 1-based (matching GAS API).
 */
export class FakeSheet2DArray {
  /**
   * @param {string[]} [headers=[]] - Optional header row
   * @param {Object} [options={}] - Options
   * @param {string} [options.locale='zh-TW'] - Date formatting locale
   */
  constructor(headers = [], options = {}) {
    this._headers = headers.length > 0 ? [...headers] : null;
    this._data = this._headers ? [[...this._headers]] : [];
    this._locale = options.locale || 'zh-TW';
  }

  /**
   * Appends a row to the end of the sheet.
   * Date-formatted strings are auto-converted to Date objects.
   *
   * @param {any[]} rowData - Array of cell values
   * @returns {FakeSheet2DArray} - Returns this for chaining
   */
  appendRow(rowData) {
    // Convert date strings to Date objects on write (simulating GAS behavior)
    const convertedRow = rowData.map(cell => convertToDateIfNeeded(cell));
    this._data.push(convertedRow);
    return this;
  }

  /**
   * Returns a FakeRange covering all data in the sheet.
   *
   * @returns {FakeRange}
   */
  getDataRange() {
    const lastRow = this.getLastRow();
    const lastCol = this.getLastColumn();

    if (lastRow === 0 || lastCol === 0) {
      // Return an empty range for empty sheet
      return new FakeRange(this, 1, 1, 0, 0);
    }

    return new FakeRange(this, 1, 1, lastRow, lastCol);
  }

  /**
   * Returns a FakeRange for the specified area.
   * Uses 1-based indexing (matching GAS API).
   *
   * @param {number} row - Starting row (1-based)
   * @param {number} col - Starting column (1-based)
   * @param {number} [numRows=1] - Number of rows
   * @param {number} [numCols=1] - Number of columns
   * @returns {FakeRange}
   * @throws {Error} "The starting row of the range is too small." if row <= 0
   * @throws {Error} "The starting column of the range is too small." if col <= 0
   */
  getRange(row, col, numRows = 1, numCols = 1) {
    // Validate row index (GAS-identical error message)
    if (row <= 0) {
      throw new Error('The starting row of the range is too small.');
    }

    // Validate column index (GAS-identical error message)
    if (col <= 0) {
      throw new Error('The starting column of the range is too small.');
    }

    return new FakeRange(this, row, col, numRows, numCols);
  }

  /**
   * Returns the number of rows with data.
   *
   * @returns {number}
   */
  getLastRow() {
    return this._data.length;
  }

  /**
   * Returns the maximum column width across all rows.
   *
   * @returns {number}
   */
  getLastColumn() {
    if (this._data.length === 0) return 0;
    return Math.max(...this._data.map(row => row.length));
  }

  /**
   * Clears all data from the sheet.
   * If initialized with headers, preserves the header row.
   *
   * @returns {FakeSheet2DArray} - Returns this for chaining
   */
  clear() {
    if (this._headers) {
      this._data = [[...this._headers]];
    } else {
      this._data = [];
    }
    return this;
  }

  // ========== Test Helpers (prefixed with _) ==========

  /**
   * Returns the internal data array (for testing).
   * @returns {any[][]}
   */
  _getData() {
    return this._data;
  }

  /**
   * Sets the internal data array (for testing).
   * @param {any[][]} data
   */
  _setData(data) {
    this._data = data;
  }

  /**
   * Returns the locale setting (for testing).
   * @returns {string}
   */
  _getLocale() {
    return this._locale;
  }
}
