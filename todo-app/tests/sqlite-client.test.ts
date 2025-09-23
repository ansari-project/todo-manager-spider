/**
 * Tests for Client-side SQLite (Phase 2)
 */

import {
  initializeDatabase,
  getDatabase,
  executeQuery,
  executeStatement,
  clearDatabase,
  exportDatabase,
  saveDatabase
} from '../app/lib/sqlite-client';

// Mock sql.js
const mockDatabase = {
  run: jest.fn(),
  prepare: jest.fn(),
  export: jest.fn(() => new Uint8Array([1, 2, 3])),
  close: jest.fn()
};

const mockStatement = {
  bind: jest.fn(),
  step: jest.fn(),
  getAsObject: jest.fn(),
  free: jest.fn()
};

jest.mock('sql.js', () => ({
  default: jest.fn(() => Promise.resolve({
    Database: jest.fn(() => mockDatabase)
  }))
}));

// Mock IndexedDB
const mockIndexedDB = {
  open: jest.fn()
};

global.indexedDB = mockIndexedDB as any;

describe('SQLite Client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset singleton
    (global as any).sqliteDb = null;
    (global as any).SQL = null;
  });

  describe('initializeDatabase', () => {
    test('initializes new database when no existing data', async () => {
      // Mock IndexedDB to return no existing data
      mockIndexedDB.open.mockReturnValue({
        onerror: null,
        onupgradeneeded: null,
        onsuccess: function(this: any) {
          const mockDB = {
            objectStoreNames: { contains: () => true },
            transaction: () => ({
              objectStore: () => ({
                get: () => ({
                  onsuccess: function(this: any) {
                    this.result = null; // No existing data
                    if (this.onsuccess) this.onsuccess();
                  },
                  onerror: null,
                  result: null
                })
              })
            })
          };
          if (this.onsuccess) this.onsuccess({ target: { result: mockDB } });
        }
      });

      const db = await initializeDatabase();

      expect(db).toBe(mockDatabase);
      // Should create schema for new database
      expect(mockDatabase.run).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS todos')
      );
    });

    test('loads existing database from IndexedDB', async () => {
      const existingData = new ArrayBuffer(8);

      // Mock IndexedDB to return existing data
      mockIndexedDB.open.mockReturnValue({
        onerror: null,
        onupgradeneeded: null,
        onsuccess: function(this: any) {
          const mockDB = {
            objectStoreNames: { contains: () => true },
            transaction: () => ({
              objectStore: () => ({
                get: () => ({
                  onsuccess: function(this: any) {
                    this.result = existingData;
                    if (this.onsuccess) this.onsuccess();
                  },
                  onerror: null,
                  result: existingData
                })
              })
            })
          };
          if (this.onsuccess) this.onsuccess({ target: { result: mockDB } });
        }
      });

      await initializeDatabase();

      // Should not create schema for existing database
      expect(mockDatabase.run).not.toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE')
      );
    });

    test('returns existing database on subsequent calls', async () => {
      // First call
      const db1 = await initializeDatabase();

      // Second call should return same instance
      const db2 = await initializeDatabase();

      expect(db1).toBe(db2);
    });
  });

  describe('executeQuery', () => {
    beforeEach(async () => {
      await initializeDatabase();
      mockDatabase.prepare.mockReturnValue(mockStatement);
    });

    test('executes SELECT query and returns results', async () => {
      const mockResults = [
        { id: '1', title: 'Test 1' },
        { id: '2', title: 'Test 2' }
      ];

      mockStatement.step.mockReturnValueOnce(true).mockReturnValueOnce(true).mockReturnValueOnce(false);
      mockStatement.getAsObject.mockReturnValueOnce(mockResults[0]).mockReturnValueOnce(mockResults[1]);

      const results = await executeQuery('SELECT * FROM todos WHERE status = ?', ['pending']);

      expect(mockDatabase.prepare).toHaveBeenCalledWith('SELECT * FROM todos WHERE status = ?');
      expect(mockStatement.bind).toHaveBeenCalledWith(['pending']);
      expect(results).toEqual(mockResults);
      expect(mockStatement.free).toHaveBeenCalled();
    });

    test('handles query errors', async () => {
      mockDatabase.prepare.mockImplementation(() => {
        throw new Error('SQL error');
      });

      await expect(executeQuery('INVALID SQL')).rejects.toThrow('SQL error');
    });

    test('schedules save after write operations', async () => {
      jest.useFakeTimers();

      await executeQuery('INSERT INTO todos VALUES (?)', ['test']);

      // Should schedule save
      expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 1000);

      jest.useRealTimers();
    });
  });

  describe('executeStatement', () => {
    beforeEach(async () => {
      await initializeDatabase();
    });

    test('executes statement without returning results', async () => {
      await executeStatement('DELETE FROM todos WHERE id = ?', ['123']);

      expect(mockDatabase.run).toHaveBeenCalledWith(
        'DELETE FROM todos WHERE id = ?',
        ['123']
      );
    });

    test('schedules save after statement', async () => {
      jest.useFakeTimers();

      await executeStatement('UPDATE todos SET title = ?', ['New Title']);

      expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 1000);

      jest.useRealTimers();
    });
  });

  describe('clearDatabase', () => {
    beforeEach(async () => {
      await initializeDatabase();
    });

    test('drops and recreates tables', async () => {
      await clearDatabase();

      expect(mockDatabase.run).toHaveBeenCalledWith('DROP TABLE IF EXISTS todos');
      expect(mockDatabase.run).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS todos')
      );
    });
  });

  describe('exportDatabase', () => {
    beforeEach(async () => {
      await initializeDatabase();
    });

    test('exports database as Blob', async () => {
      const blob = await exportDatabase();

      expect(mockDatabase.export).toHaveBeenCalled();
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/x-sqlite3');
    });
  });

  describe('saveDatabase', () => {
    beforeEach(async () => {
      await initializeDatabase();
    });

    test('saves database to IndexedDB', async () => {
      const mockStore = {
        put: jest.fn()
      };

      const mockTransaction = {
        objectStore: jest.fn(() => mockStore),
        oncomplete: null,
        onerror: null
      };

      mockIndexedDB.open.mockReturnValue({
        onerror: null,
        onupgradeneeded: null,
        onsuccess: function(this: any) {
          const mockDB = {
            objectStoreNames: { contains: () => true },
            transaction: jest.fn(() => mockTransaction)
          };
          if (this.onsuccess) {
            this.onsuccess({ target: { result: mockDB } });
            // Simulate transaction completion
            if (mockTransaction.oncomplete) mockTransaction.oncomplete();
          }
        }
      });

      await saveDatabase();

      expect(mockDatabase.export).toHaveBeenCalled();
      expect(mockStore.put).toHaveBeenCalledWith(expect.any(Uint8Array), 'main');
    });
  });
});