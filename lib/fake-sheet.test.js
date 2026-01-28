/**
 * Unit tests for FakeSheet2DArray and FakeRange
 *
 * Feature: 001-sheet-fake-2d-array
 * Test Framework: Vitest
 *
 * Run: npx vitest run lib/v2/fake-sheet.test.js
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FakeSheet2DArray, FakeRange } from './fake-sheet.js';

// ========== US1: Core Data Operations ==========

describe('US1: FakeSheet2DArray Core Data Operations', () => {
  // T008: Empty initialization
  describe('constructor', () => {
    it('should initialize with empty data when no headers provided', () => {
      const sheet = new FakeSheet2DArray();
      expect(sheet._getData()).toEqual([]);
      expect(sheet.getLastRow()).toBe(0);
    });

    // T009: With headers initialization
    it('should initialize with headers when provided', () => {
      const sheet = new FakeSheet2DArray(['ID', 'Name', 'Value']);
      expect(sheet._getData()).toEqual([['ID', 'Name', 'Value']]);
      expect(sheet.getLastRow()).toBe(1);
    });

    it('should use zh-TW locale by default', () => {
      const sheet = new FakeSheet2DArray();
      expect(sheet._getLocale()).toBe('zh-TW');
    });

    it('should accept custom locale option', () => {
      const sheet = new FakeSheet2DArray([], { locale: 'en-US' });
      expect(sheet._getLocale()).toBe('en-US');
    });
  });

  // T010, T011: appendRow
  describe('appendRow', () => {
    it('should add a row to an empty sheet', () => {
      const sheet = new FakeSheet2DArray();
      sheet.appendRow(['A', 'B', 'C']);
      expect(sheet._getData()).toEqual([['A', 'B', 'C']]);
    });

    it('should add a row after headers', () => {
      const sheet = new FakeSheet2DArray(['ID', 'Name', 'Value']);
      sheet.appendRow(['1', 'Alice', '100']);
      expect(sheet._getData()).toEqual([
        ['ID', 'Name', 'Value'],
        ['1', 'Alice', '100']
      ]);
    });

    it('should return this for chaining', () => {
      const sheet = new FakeSheet2DArray();
      const result = sheet.appendRow(['A', 'B']);
      expect(result).toBe(sheet);
    });

    it('should allow multiple appends', () => {
      const sheet = new FakeSheet2DArray(['ID', 'Name']);
      sheet.appendRow(['1', 'Alice']);
      sheet.appendRow(['2', 'Bob']);
      sheet.appendRow(['3', 'Charlie']);
      expect(sheet._getData()).toEqual([
        ['ID', 'Name'],
        ['1', 'Alice'],
        ['2', 'Bob'],
        ['3', 'Charlie']
      ]);
    });
  });

  // T012: getLastRow
  describe('getLastRow', () => {
    it('should return 0 for empty sheet', () => {
      const sheet = new FakeSheet2DArray();
      expect(sheet.getLastRow()).toBe(0);
    });

    it('should return 1 for sheet with only headers', () => {
      const sheet = new FakeSheet2DArray(['A', 'B', 'C']);
      expect(sheet.getLastRow()).toBe(1);
    });

    it('should return correct row count after appends', () => {
      const sheet = new FakeSheet2DArray(['Header']);
      sheet.appendRow(['Row 1']);
      sheet.appendRow(['Row 2']);
      expect(sheet.getLastRow()).toBe(3);
    });
  });

  // T013: getLastColumn
  describe('getLastColumn', () => {
    it('should return 0 for empty sheet', () => {
      const sheet = new FakeSheet2DArray();
      expect(sheet.getLastColumn()).toBe(0);
    });

    it('should return max column width across all rows', () => {
      const sheet = new FakeSheet2DArray(['A', 'B', 'C', 'D']); // 4 columns
      sheet.appendRow(['1', '2']); // 2 columns
      sheet.appendRow(['1', '2', '3', '4', '5']); // 5 columns
      expect(sheet.getLastColumn()).toBe(5);
    });

    it('should return correct width for uniform rows', () => {
      const sheet = new FakeSheet2DArray(['A', 'B', 'C']);
      sheet.appendRow(['1', '2', '3']);
      expect(sheet.getLastColumn()).toBe(3);
    });
  });

  // T014: clear
  describe('clear', () => {
    it('should reset data to empty when no headers', () => {
      const sheet = new FakeSheet2DArray();
      sheet.appendRow(['A', 'B']);
      sheet.appendRow(['C', 'D']);
      sheet.clear();
      expect(sheet._getData()).toEqual([]);
      expect(sheet.getLastRow()).toBe(0);
    });

    it('should preserve headers when initialized with headers', () => {
      const sheet = new FakeSheet2DArray(['ID', 'Name', 'Value']);
      sheet.appendRow(['1', 'Alice', '100']);
      sheet.appendRow(['2', 'Bob', '200']);
      sheet.clear();
      expect(sheet._getData()).toEqual([['ID', 'Name', 'Value']]);
      expect(sheet.getLastRow()).toBe(1);
    });

    it('should return this for chaining', () => {
      const sheet = new FakeSheet2DArray();
      const result = sheet.clear();
      expect(result).toBe(sheet);
    });
  });

  // T020: Test helpers
  describe('test helpers', () => {
    it('_getData should return internal data array', () => {
      const sheet = new FakeSheet2DArray(['A']);
      sheet.appendRow(['1']);
      const data = sheet._getData();
      expect(data).toEqual([['A'], ['1']]);
    });

    it('_setData should replace internal data array', () => {
      const sheet = new FakeSheet2DArray();
      sheet._setData([['X', 'Y'], ['1', '2']]);
      expect(sheet._getData()).toEqual([['X', 'Y'], ['1', '2']]);
      expect(sheet.getLastRow()).toBe(2);
    });

    it('_getLocale should return locale setting', () => {
      const sheet = new FakeSheet2DArray([], { locale: 'iso' });
      expect(sheet._getLocale()).toBe('iso');
    });
  });
});

// ========== US2: Range Operations ==========

describe('US2: FakeRange Operations', () => {
  let sheet;

  beforeEach(() => {
    sheet = new FakeSheet2DArray(['A', 'B', 'C']);
    sheet.appendRow(['1', '2', '3']);
    sheet.appendRow(['4', '5', '6']);
    sheet.appendRow(['7', '8', '9']);
  });

  // T022: getDataRange
  describe('getDataRange', () => {
    it('should return FakeRange covering all data', () => {
      const range = sheet.getDataRange();
      expect(range).toBeInstanceOf(FakeRange);
      const values = range.getValues();
      expect(values).toEqual([
        ['A', 'B', 'C'],
        ['1', '2', '3'],
        ['4', '5', '6'],
        ['7', '8', '9']
      ]);
    });

    it('should return empty range for empty sheet', () => {
      const emptySheet = new FakeSheet2DArray();
      const range = emptySheet.getDataRange();
      expect(range.getValues()).toEqual([]);
    });
  });

  // T023: getRange
  describe('getRange', () => {
    it('should return FakeRange for specified area', () => {
      const range = sheet.getRange(2, 1, 2, 2);
      expect(range).toBeInstanceOf(FakeRange);
      const values = range.getValues();
      expect(values).toEqual([
        ['1', '2'],
        ['4', '5']
      ]);
    });

    it('should default to 1x1 range if numRows/numCols not provided', () => {
      const range = sheet.getRange(2, 2);
      const values = range.getValues();
      expect(values).toEqual([['2']]);
    });

    // T024: row <= 0 error
    it('should throw error when row <= 0', () => {
      expect(() => sheet.getRange(0, 1, 1, 1))
        .toThrow('The starting row of the range is too small.');
      expect(() => sheet.getRange(-1, 1, 1, 1))
        .toThrow('The starting row of the range is too small.');
    });

    // T025: col <= 0 error
    it('should throw error when col <= 0', () => {
      expect(() => sheet.getRange(1, 0, 1, 1))
        .toThrow('The starting column of the range is too small.');
      expect(() => sheet.getRange(1, -1, 1, 1))
        .toThrow('The starting column of the range is too small.');
    });

    // T029: beyond data bounds
    it('should return empty cells when range is beyond data bounds', () => {
      const range = sheet.getRange(10, 10, 2, 2);
      const values = range.getValues();
      // Beyond bounds should return empty strings or nulls
      expect(values).toEqual([
        ['', ''],
        ['', '']
      ]);
    });

    it('should handle partial overlap with data', () => {
      const range = sheet.getRange(3, 2, 3, 3); // rows 3-5, cols 2-4
      const values = range.getValues();
      // Row 3 (index 2): ['4', '5', '6'] -> cols 2-4: ['5', '6', '']
      // Row 4 (index 3): ['7', '8', '9'] -> cols 2-4: ['8', '9', '']
      // Row 5 doesn't exist: ['', '', '']
      expect(values).toEqual([
        ['5', '6', ''],
        ['8', '9', ''],
        ['', '', '']
      ]);
    });
  });

  // T026: getValues
  describe('FakeRange.getValues', () => {
    it('should return 2D array subset', () => {
      const range = sheet.getRange(1, 1, 2, 3);
      const values = range.getValues();
      expect(values).toEqual([
        ['A', 'B', 'C'],
        ['1', '2', '3']
      ]);
    });
  });

  // T027: getDisplayValues
  describe('FakeRange.getDisplayValues', () => {
    it('should return all values as strings', () => {
      const numSheet = new FakeSheet2DArray();
      numSheet._setData([[1, true, null]]);
      const range = numSheet.getDataRange();
      const displayValues = range.getDisplayValues();
      expect(displayValues).toEqual([['1', 'TRUE', '']]);
    });
  });

  // T028: setValues
  describe('FakeRange.setValues', () => {
    it('should write data to correct cells', () => {
      const range = sheet.getRange(2, 2, 2, 2);
      range.setValues([['X', 'Y'], ['Z', 'W']]);
      expect(sheet._getData()).toEqual([
        ['A', 'B', 'C'],
        ['1', 'X', 'Y'],
        ['4', 'Z', 'W'],
        ['7', '8', '9']
      ]);
    });

    it('should return this for chaining', () => {
      const range = sheet.getRange(1, 1, 1, 1);
      const result = range.setValues([['NEW']]);
      expect(result).toBe(range);
    });

    it('should expand data array if writing beyond bounds', () => {
      const smallSheet = new FakeSheet2DArray();
      smallSheet._setData([['A']]);
      const range = smallSheet.getRange(2, 2, 1, 1);
      range.setValues([['X']]);
      const data = smallSheet._getData();
      expect(data[1][1]).toBe('X');
    });
  });
});

// ========== US4: Date Conversion ==========

describe('US4: Date Conversion Behavior', () => {
  // T037: Chinese AM date string
  describe('Chinese date format conversion', () => {
    it('should convert 上午 date string to Date object', () => {
      const sheet = new FakeSheet2DArray();
      sheet.appendRow(['2026/1/27上午9:00:00']);
      const values = sheet.getDataRange().getValues();
      expect(values[0][0]).toBeInstanceOf(Date);
      expect(values[0][0].getHours()).toBe(9);
    });

    // T038: Chinese PM date string
    it('should convert 下午 date string to Date object', () => {
      const sheet = new FakeSheet2DArray();
      sheet.appendRow(['2026/1/27下午6:00:00']);
      const values = sheet.getDataRange().getValues();
      expect(values[0][0]).toBeInstanceOf(Date);
      expect(values[0][0].getHours()).toBe(18);
    });

    it('should handle 下午12 as noon (12:00)', () => {
      const sheet = new FakeSheet2DArray();
      sheet.appendRow(['2026/1/27下午12:30:00']);
      const values = sheet.getDataRange().getValues();
      expect(values[0][0].getHours()).toBe(12);
    });

    it('should handle 上午12 as midnight (0:00)', () => {
      const sheet = new FakeSheet2DArray();
      sheet.appendRow(['2026/1/27上午12:30:00']);
      const values = sheet.getDataRange().getValues();
      expect(values[0][0].getHours()).toBe(0);
    });
  });

  // T039: ISO date string
  describe('ISO date format conversion', () => {
    it('should convert ISO date string to Date object', () => {
      const sheet = new FakeSheet2DArray();
      sheet.appendRow(['2026-01-27T09:00:00']);
      const values = sheet.getDataRange().getValues();
      expect(values[0][0]).toBeInstanceOf(Date);
    });
  });

  // T040: getDisplayValues with Date
  describe('getDisplayValues with Date objects', () => {
    it('should return formatted strings for Date objects in zh-TW locale', () => {
      const sheet = new FakeSheet2DArray([], { locale: 'zh-TW' });
      sheet.appendRow(['2026/1/27上午9:00:00']);
      const displayValues = sheet.getDataRange().getDisplayValues();
      expect(displayValues[0][0]).toBe('2026/1/27上午9:00:00');
    });

    it('should return ISO formatted strings in iso locale', () => {
      const sheet = new FakeSheet2DArray([], { locale: 'iso' });
      const date = new Date(2026, 0, 27, 9, 0, 0);
      sheet._setData([[date]]);
      const displayValues = sheet.getDataRange().getDisplayValues();
      expect(displayValues[0][0]).toMatch(/2026-01-27/);
    });
  });

  // T041: Non-date strings
  describe('Non-date strings', () => {
    it('should remain as strings', () => {
      const sheet = new FakeSheet2DArray();
      sheet.appendRow(['Hello', 'World', '12345']);
      const values = sheet.getDataRange().getValues();
      expect(values[0][0]).toBe('Hello');
      expect(values[0][1]).toBe('World');
      expect(values[0][2]).toBe('12345');
    });

    it('should not convert partial date-like strings', () => {
      const sheet = new FakeSheet2DArray();
      sheet.appendRow(['2026/1/27', 'IN', 'OUT']);
      const values = sheet.getDataRange().getValues();
      // '2026/1/27' without time part should remain a string
      expect(typeof values[0][0]).toBe('string');
      expect(values[0][1]).toBe('IN');
    });
  });

  describe('setValues date conversion', () => {
    it('should convert date strings when using setValues', () => {
      const sheet = new FakeSheet2DArray();
      sheet._setData([['']]);
      const range = sheet.getRange(1, 1, 1, 1);
      range.setValues([['2026/1/27上午9:00:00']]);
      const values = sheet.getDataRange().getValues();
      expect(values[0][0]).toBeInstanceOf(Date);
    });
  });
});
