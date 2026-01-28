/**
 * Integration tests for GAS Mock APIs
 *
 * Test Framework: Vitest
 * Run: npx vitest run lib/gas-mock.test.js
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createMockSheet,
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

// ========== createMockSheet ==========

describe('createMockSheet', () => {
  it('should create a sheet with headers', () => {
    const sheet = createMockSheet(['ID', 'Name']);
    expect(sheet.getLastRow()).toBe(1);
    expect(sheet._getData()).toEqual([['ID', 'Name']]);
  });

  it('should support appendRow', () => {
    const sheet = createMockSheet(['ID', 'Name']);
    sheet.appendRow(['1', 'Alice']);
    expect(sheet.getLastRow()).toBe(2);
  });

  it('should support getDataRange', () => {
    const sheet = createMockSheet(['A', 'B']);
    sheet.appendRow(['1', '2']);
    const values = sheet.getDataRange().getValues();
    expect(values).toEqual([['A', 'B'], ['1', '2']]);
  });

  it('should support getRange', () => {
    const sheet = createMockSheet(['A', 'B']);
    sheet.appendRow(['1', '2']);
    const range = sheet.getRange(2, 1, 1, 2);
    expect(range.getValues()).toEqual([['1', '2']]);
  });

  it('should support clear', () => {
    const sheet = createMockSheet(['A', 'B']);
    sheet.appendRow(['1', '2']);
    sheet.clear();
    expect(sheet.getLastRow()).toBe(1); // Headers preserved
    expect(sheet._getData()).toEqual([['A', 'B']]);
  });

  it('should support method chaining', () => {
    const sheet = createMockSheet(['A']);
    const result = sheet.appendRow(['1']).appendRow(['2']).clear();
    expect(result).toBe(sheet);
  });
});

// ========== createMockSpreadsheet ==========

describe('createMockSpreadsheet', () => {
  let spreadsheet;

  beforeEach(() => {
    spreadsheet = createMockSpreadsheet();
  });

  describe('getSheetByName', () => {
    it('should return null for non-existent sheet', () => {
      expect(spreadsheet.getSheetByName('NotExist')).toBeNull();
    });

    it('should return sheet after insertSheet', () => {
      spreadsheet.insertSheet('MySheet');
      const sheet = spreadsheet.getSheetByName('MySheet');
      expect(sheet).not.toBeNull();
      expect(sheet.getLastRow()).toBe(0);
    });
  });

  describe('insertSheet', () => {
    it('should create and return a new sheet', () => {
      const sheet = spreadsheet.insertSheet('NewSheet');
      expect(sheet).not.toBeNull();
      expect(sheet.appendRow).toBeDefined();
    });

    it('should allow data operations on inserted sheet', () => {
      const sheet = spreadsheet.insertSheet('DataSheet');
      sheet.appendRow(['A', 'B', 'C']);
      expect(sheet.getLastRow()).toBe(1);
    });
  });

  describe('getSheets', () => {
    it('should return empty array initially', () => {
      expect(spreadsheet.getSheets()).toEqual([]);
    });

    it('should return all inserted sheets', () => {
      spreadsheet.insertSheet('Sheet1');
      spreadsheet.insertSheet('Sheet2');
      expect(spreadsheet.getSheets().length).toBe(2);
    });
  });

  describe('getName', () => {
    it('should return spreadsheet name', () => {
      expect(spreadsheet.getName()).toBe('Mock Spreadsheet');
    });
  });

  describe('_getOrCreateSheet', () => {
    it('should create sheet if not exists', () => {
      const sheet = spreadsheet._getOrCreateSheet('Auto', ['Col1', 'Col2']);
      expect(sheet.getLastRow()).toBe(1);
      expect(sheet._getData()).toEqual([['Col1', 'Col2']]);
    });

    it('should return existing sheet without modifying headers', () => {
      spreadsheet._getOrCreateSheet('Existing', ['Original']);
      const sheet = spreadsheet._getOrCreateSheet('Existing', ['NewHeader']);
      expect(sheet._getData()).toEqual([['Original']]);
    });
  });
});

// ========== createMockSpreadsheetApp ==========

describe('createMockSpreadsheetApp', () => {
  let mockSpreadsheet;
  let app;

  beforeEach(() => {
    mockSpreadsheet = createMockSpreadsheet();
    app = createMockSpreadsheetApp(mockSpreadsheet);
  });

  describe('getActiveSpreadsheet', () => {
    it('should return the mock spreadsheet', () => {
      expect(app.getActiveSpreadsheet()).toBe(mockSpreadsheet);
    });
  });

  describe('openById', () => {
    it('should return the mock spreadsheet', () => {
      expect(app.openById('any-id')).toBe(mockSpreadsheet);
    });
  });

  describe('getUi', () => {
    it('should return UI object with createMenu', () => {
      const ui = app.getUi();
      expect(ui.createMenu).toBeDefined();
    });

    it('should support menu chaining', () => {
      const ui = app.getUi();
      const menu = ui.createMenu('Test');
      expect(menu.addItem('Item', 'fn')).toBe(menu);
      expect(menu.addSeparator()).toBe(menu);
      expect(menu.addSubMenu({})).toBe(menu);
    });

    it('should have ButtonSet and Button constants', () => {
      const ui = app.getUi();
      expect(ui.ButtonSet.OK).toBe('OK');
      expect(ui.Button.CANCEL).toBe('CANCEL');
    });

    it('should support prompt', () => {
      const ui = app.getUi();
      const response = ui.prompt('Enter value');
      expect(response.getSelectedButton()).toBe('OK');
      expect(response.getResponseText()).toBe('');
    });
  });
});

// ========== createMockUtilities ==========

describe('createMockUtilities', () => {
  let utilities;

  beforeEach(() => {
    utilities = createMockUtilities();
  });

  describe('getUuid', () => {
    it('should return unique UUIDs', () => {
      const uuid1 = utilities.getUuid();
      const uuid2 = utilities.getUuid();
      expect(uuid1).not.toBe(uuid2);
    });

    it('should return string starting with mock-uuid', () => {
      const uuid = utilities.getUuid();
      expect(uuid).toMatch(/^mock-uuid-/);
    });
  });

  describe('formatDate', () => {
    it('should format yyyy-MM-dd HH:mm:ss', () => {
      const date = new Date('2026-01-27T09:30:45Z');
      const result = utilities.formatDate(date, 'Asia/Taipei', 'yyyy-MM-dd HH:mm:ss');
      expect(result).toBe('2026-01-27 09:30:45');
    });

    it('should format yyyy-MM-dd', () => {
      const date = new Date('2026-01-27T09:30:45Z');
      const result = utilities.formatDate(date, 'Asia/Taipei', 'yyyy-MM-dd');
      expect(result).toBe('2026-01-27');
    });

    it('should format HH:mm:ss', () => {
      const date = new Date('2026-01-27T09:30:45Z');
      const result = utilities.formatDate(date, 'Asia/Taipei', 'HH:mm:ss');
      expect(result).toBe('09:30:45');
    });

    it('should return ISO string for unknown format', () => {
      const date = new Date('2026-01-27T09:30:45Z');
      const result = utilities.formatDate(date, 'Asia/Taipei', 'unknown');
      expect(result).toContain('2026-01-27');
    });
  });

  describe('sleep', () => {
    it('should be a no-op function', () => {
      expect(() => utilities.sleep(1000)).not.toThrow();
    });
  });
});

// ========== createMockSession ==========

describe('createMockSession', () => {
  describe('default options', () => {
    let session;

    beforeEach(() => {
      session = createMockSession();
    });

    it('should return default email', () => {
      expect(session.getActiveUser().getEmail()).toBe('test@example.com');
    });

    it('should return same email for getEffectiveUser', () => {
      expect(session.getEffectiveUser().getEmail()).toBe('test@example.com');
    });

    it('should return Asia/Taipei timezone', () => {
      expect(session.getScriptTimeZone()).toBe('Asia/Taipei');
    });
  });

  describe('custom options', () => {
    it('should use provided email', () => {
      const session = createMockSession({ email: 'custom@test.com' });
      expect(session.getActiveUser().getEmail()).toBe('custom@test.com');
    });
  });

  describe('_setMockEmail', () => {
    it('should change email at runtime', () => {
      const session = createMockSession();
      session._setMockEmail('new@email.com');
      expect(session.getActiveUser().getEmail()).toBe('new@email.com');
      expect(session.getEffectiveUser().getEmail()).toBe('new@email.com');
    });
  });
});

// ========== createMockHtmlService ==========

describe('createMockHtmlService', () => {
  let htmlService;

  beforeEach(() => {
    htmlService = createMockHtmlService();
  });

  describe('createHtmlOutput', () => {
    it('should create output with content', () => {
      const output = htmlService.createHtmlOutput('<h1>Hello</h1>');
      expect(output.getContent()).toBe('<h1>Hello</h1>');
    });

    it('should support setTitle', () => {
      const output = htmlService.createHtmlOutput('<h1>Hello</h1>');
      output.setTitle('My Title');
      expect(output.getTitle()).toBe('My Title');
    });

    it('should support method chaining', () => {
      const output = htmlService.createHtmlOutput('<h1>Hello</h1>');
      const result = output.setTitle('Title').setXFrameOptionsMode('ALLOWALL');
      expect(result).toBe(output);
    });
  });

  describe('XFrameOptionsMode', () => {
    it('should have ALLOWALL constant', () => {
      expect(htmlService.XFrameOptionsMode.ALLOWALL).toBe('ALLOWALL');
    });

    it('should have DEFAULT constant', () => {
      expect(htmlService.XFrameOptionsMode.DEFAULT).toBe('DEFAULT');
    });
  });
});

// ========== createMockContentService ==========

describe('createMockContentService', () => {
  let contentService;

  beforeEach(() => {
    contentService = createMockContentService();
  });

  describe('createTextOutput', () => {
    it('should create output with text', () => {
      const output = contentService.createTextOutput('Hello World');
      expect(output.getContent()).toBe('Hello World');
    });

    it('should default to TEXT mime type', () => {
      const output = contentService.createTextOutput('Hello');
      expect(output.getMimeType()).toBe('TEXT');
    });

    it('should support setMimeType', () => {
      const output = contentService.createTextOutput('{}');
      output.setMimeType(contentService.MimeType.JSON);
      expect(output.getMimeType()).toBe('JSON');
    });

    it('should support method chaining', () => {
      const output = contentService.createTextOutput('{}');
      const result = output.setMimeType('JSON');
      expect(result).toBe(output);
    });
  });

  describe('MimeType', () => {
    it('should have JSON constant', () => {
      expect(contentService.MimeType.JSON).toBe('JSON');
    });

    it('should have TEXT constant', () => {
      expect(contentService.MimeType.TEXT).toBe('TEXT');
    });

    it('should have XML constant', () => {
      expect(contentService.MimeType.XML).toBe('XML');
    });

    it('should have HTML constant', () => {
      expect(contentService.MimeType.HTML).toBe('HTML');
    });
  });
});

// ========== createMockPropertiesService ==========

describe('createMockPropertiesService', () => {
  let propertiesService;

  beforeEach(() => {
    propertiesService = createMockPropertiesService();
  });

  describe('getScriptProperties', () => {
    it('should return property store', () => {
      const props = propertiesService.getScriptProperties();
      expect(props.getProperty).toBeDefined();
      expect(props.setProperty).toBeDefined();
    });

    it('should store and retrieve properties', () => {
      const props = propertiesService.getScriptProperties();
      props.setProperty('key1', 'value1');
      expect(props.getProperty('key1')).toBe('value1');
    });

    it('should return null for non-existent key', () => {
      const props = propertiesService.getScriptProperties();
      expect(props.getProperty('nonexistent')).toBeNull();
    });

    it('should support deleteProperty', () => {
      const props = propertiesService.getScriptProperties();
      props.setProperty('key1', 'value1');
      props.deleteProperty('key1');
      expect(props.getProperty('key1')).toBeNull();
    });

    it('should support getProperties', () => {
      const props = propertiesService.getScriptProperties();
      props.setProperty('a', '1');
      props.setProperty('b', '2');
      expect(props.getProperties()).toEqual({ a: '1', b: '2' });
    });

    it('should support setProperties', () => {
      const props = propertiesService.getScriptProperties();
      props.setProperties({ x: '10', y: '20' });
      expect(props.getProperty('x')).toBe('10');
      expect(props.getProperty('y')).toBe('20');
    });

    it('should support setProperties with deleteAllOthers', () => {
      const props = propertiesService.getScriptProperties();
      props.setProperty('old', 'value');
      props.setProperties({ new: 'value' }, true);
      expect(props.getProperty('old')).toBeNull();
      expect(props.getProperty('new')).toBe('value');
    });
  });

  describe('getUserProperties', () => {
    it('should be independent from scriptProperties', () => {
      const scriptProps = propertiesService.getScriptProperties();
      const userProps = propertiesService.getUserProperties();

      scriptProps.setProperty('key', 'script-value');
      userProps.setProperty('key', 'user-value');

      expect(scriptProps.getProperty('key')).toBe('script-value');
      expect(userProps.getProperty('key')).toBe('user-value');
    });
  });

  describe('getDocumentProperties', () => {
    it('should be independent from other property stores', () => {
      const docProps = propertiesService.getDocumentProperties();
      docProps.setProperty('doc-key', 'doc-value');
      expect(docProps.getProperty('doc-key')).toBe('doc-value');
    });
  });
});

// ========== createMockLogger ==========

describe('createMockLogger', () => {
  let logger;

  beforeEach(() => {
    logger = createMockLogger();
  });

  describe('log', () => {
    it('should store log messages', () => {
      logger.log('Message 1');
      logger.log('Message 2');
      expect(logger.getLog()).toBe('Message 1\nMessage 2');
    });
  });

  describe('clear', () => {
    it('should clear all logs', () => {
      logger.log('Message');
      logger.clear();
      expect(logger.getLog()).toBe('');
    });
  });

  describe('getLog', () => {
    it('should return empty string when no logs', () => {
      expect(logger.getLog()).toBe('');
    });
  });
});

// ========== createMockGoogleScriptRun ==========

describe('createMockGoogleScriptRun', () => {
  describe('basic function calls', () => {
    it('should call function and return result via success handler', async () => {
      const context = {
        add: (a, b) => a + b
      };
      const scriptRun = createMockGoogleScriptRun(context);

      const result = await new Promise((resolve) => {
        scriptRun.withSuccessHandler(resolve).add(2, 3);
      });

      expect(result).toBe(5);
    });

    it('should call failure handler on error', async () => {
      const context = {
        fail: () => { throw new Error('Test error'); }
      };
      const scriptRun = createMockGoogleScriptRun(context);

      const error = await new Promise((resolve) => {
        scriptRun.withFailureHandler(resolve).fail();
      });

      expect(error.message).toBe('Test error');
    });

    it('should call failure handler for non-existent function', async () => {
      const context = {};
      const scriptRun = createMockGoogleScriptRun(context);

      const error = await new Promise((resolve) => {
        scriptRun.withFailureHandler(resolve).nonExistent();
      });

      expect(error.message).toContain('nonExistent');
    });
  });

  describe('serialization check', () => {
    it('should warn and return null for Date objects (non-strict)', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const context = {
        getDate: () => new Date()
      };
      const scriptRun = createMockGoogleScriptRun(context, { strictMode: false });

      const result = await new Promise((resolve) => {
        scriptRun.withSuccessHandler(resolve).getDate();
      });

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should throw error for Date objects in strict mode', async () => {
      const context = {
        getDate: () => new Date()
      };
      const scriptRun = createMockGoogleScriptRun(context, { strictMode: true });

      const error = await new Promise((resolve) => {
        scriptRun.withFailureHandler(resolve).getDate();
      });

      expect(error.message).toContain('序列化失敗');
      expect(error.message).toContain('Date');
    });

    it('should allow serializable data', async () => {
      const context = {
        getData: () => ({ name: 'Test', values: [1, 2, 3] })
      };
      const scriptRun = createMockGoogleScriptRun(context);

      const result = await new Promise((resolve) => {
        scriptRun.withSuccessHandler(resolve).getData();
      });

      expect(result).toEqual({ name: 'Test', values: [1, 2, 3] });
    });

    it('should detect nested Date objects', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const context = {
        getNestedDate: () => ({ data: { timestamp: new Date() } })
      };
      const scriptRun = createMockGoogleScriptRun(context, { strictMode: false });

      const result = await new Promise((resolve) => {
        scriptRun.withSuccessHandler(resolve).getNestedDate();
      });

      expect(result).toBeNull();

      consoleSpy.mockRestore();
    });

    it('should detect Date in arrays', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const context = {
        getArrayWithDate: () => [['A', new Date()], ['B', 'C']]
      };
      const scriptRun = createMockGoogleScriptRun(context, { strictMode: false });

      const result = await new Promise((resolve) => {
        scriptRun.withSuccessHandler(resolve).getArrayWithDate();
      });

      expect(result).toBeNull();

      consoleSpy.mockRestore();
    });

    it('should warn for NaN values', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const context = {
        getNaN: () => NaN
      };
      const scriptRun = createMockGoogleScriptRun(context, { strictMode: false });

      const result = await new Promise((resolve) => {
        scriptRun.withSuccessHandler(resolve).getNaN();
      });

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('handler chaining', () => {
    it('should support chaining withSuccessHandler and withFailureHandler', async () => {
      const context = {
        succeed: () => 'success'
      };
      const scriptRun = createMockGoogleScriptRun(context);

      const result = await new Promise((resolve, reject) => {
        scriptRun
          .withSuccessHandler(resolve)
          .withFailureHandler(reject)
          .succeed();
      });

      expect(result).toBe('success');
    });
  });
});

// ========== Integration: Full GAS-like workflow ==========

describe('Integration: Full GAS-like workflow', () => {
  it('should simulate typical GAS spreadsheet operations', () => {
    // Setup
    const spreadsheet = createMockSpreadsheet();
    const app = createMockSpreadsheetApp(spreadsheet);

    // Get or create sheet
    const ss = app.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('Orders');
    if (!sheet) {
      sheet = ss.insertSheet('Orders');
      sheet.appendRow(['OrderID', 'Product', 'Quantity', 'CreatedAt']);
    }

    // Add data
    sheet.appendRow(['ORD-001', 'iPhone', 2, '2026/1/27上午9:00:00']);
    sheet.appendRow(['ORD-002', 'MacBook', 1, '2026/1/27下午2:30:00']);

    // Read data
    const values = sheet.getDataRange().getValues();
    expect(values.length).toBe(3); // Header + 2 rows
    expect(values[1][1]).toBe('iPhone');

    // Date conversion
    expect(values[1][3]).toBeInstanceOf(Date);
    expect(values[1][3].getHours()).toBe(9);

    // Display values
    const displayValues = sheet.getDataRange().getDisplayValues();
    expect(displayValues[1][3]).toBe('2026/1/27上午9:00:00');
  });

  it('should simulate Session and Utilities usage', () => {
    const session = createMockSession({ email: 'user@company.com' });
    const utilities = createMockUtilities();

    // Get user email
    const email = session.getActiveUser().getEmail();
    expect(email).toBe('user@company.com');

    // Generate UUID
    const orderId = utilities.getUuid();
    expect(orderId).toMatch(/^mock-uuid-/);

    // Format date
    const now = new Date();
    const formatted = utilities.formatDate(now, 'Asia/Taipei', 'yyyy-MM-dd');
    expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('should simulate PropertiesService for configuration', () => {
    const propertiesService = createMockPropertiesService();
    const scriptProps = propertiesService.getScriptProperties();

    // Store API key
    scriptProps.setProperty('API_KEY', 'secret-key-123');
    scriptProps.setProperty('MAX_ITEMS', '100');

    // Retrieve configuration
    expect(scriptProps.getProperty('API_KEY')).toBe('secret-key-123');
    expect(scriptProps.getProperty('MAX_ITEMS')).toBe('100');
  });
});
