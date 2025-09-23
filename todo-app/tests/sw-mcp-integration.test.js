/**
 * Integration tests for Service Worker MCP with SQLite
 */

describe('Service Worker MCP Integration', () => {
  let mockDb;
  let mockSQL;
  let mockSaveDatabase;

  beforeEach(() => {
    // Mock the database
    mockDb = {
      run: jest.fn(),
      prepare: jest.fn(),
      export: jest.fn(() => new Uint8Array())
    };

    // Mock SQL.js
    mockSQL = {
      Database: jest.fn(() => mockDb)
    };

    // Mock global functions
    global.initSqlJs = jest.fn(() => Promise.resolve(mockSQL));
    global.indexedDB = {
      open: jest.fn(() => ({
        onerror: null,
        onupgradeneeded: null,
        onsuccess: function() {
          if (this.onsuccess) {
            this.onsuccess({
              target: {
                result: {
                  objectStoreNames: { contains: () => true },
                  transaction: () => ({
                    objectStore: () => ({
                      get: () => ({ onsuccess: function() { this.result = null; if (this.onsuccess) this.onsuccess(); } }),
                      put: jest.fn()
                    })
                  })
                }
              }
            });
          }
        }
      }))
    };

    // Mock fetch for Service Worker
    global.fetch = jest.fn();

    mockSaveDatabase = jest.fn(() => Promise.resolve());
  });

  describe('MCP Request Handling', () => {
    test('should handle tools/list request', async () => {
      const request = new Request('/api/mcp/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'tools/list',
          id: 1
        })
      });

      // Simulate the Service Worker response
      const response = await handleMCPRequest(request);
      const result = await response.json();

      expect(result.jsonrpc).toBe('2.0');
      expect(result.id).toBe(1);
      expect(Array.isArray(result.result)).toBe(true);
      expect(result.result.length).toBeGreaterThan(0);
    });

    test('should reject non-POST requests', async () => {
      const request = new Request('/api/mcp/', {
        method: 'GET'
      });

      const response = await handleMCPRequest(request);
      const result = await response.json();

      expect(result.error).toBeDefined();
      expect(result.error.code).toBe(-32600);
      expect(result.error.message).toContain('POST required');
    });

    test('should reject non-JSON content type', async () => {
      const request = new Request('/api/mcp/', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: 'not json'
      });

      const response = await handleMCPRequest(request);
      const result = await response.json();

      expect(result.error).toBeDefined();
      expect(result.error.code).toBe(-32600);
      expect(result.error.message).toContain('application/json required');
    });

    test('should handle parse errors', async () => {
      const request = new Request('/api/mcp/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json'
      });

      const response = await handleMCPRequest(request);
      const result = await response.json();

      expect(result.error).toBeDefined();
      expect(result.error.code).toBe(-32700);
      expect(result.error.message).toContain('Parse error');
    });
  });

  describe('Todo Tool Execution', () => {
    let mockStatement;

    beforeEach(() => {
      mockStatement = {
        bind: jest.fn(),
        step: jest.fn(),
        getAsObject: jest.fn(),
        free: jest.fn()
      };
      mockDb.prepare.mockReturnValue(mockStatement);
    });

    test('should create a todo', async () => {
      const request = new Request('/api/mcp/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'tools/call',
          params: {
            name: 'todo.create',
            arguments: {
              title: 'Test Todo',
              description: 'Test description',
              priority: 'high'
            }
          },
          id: 1
        })
      });

      mockStatement.step.mockReturnValueOnce(true).mockReturnValueOnce(false);
      mockStatement.getAsObject.mockReturnValue({
        id: 'test-id',
        title: 'Test Todo',
        description: 'Test description',
        status: 'pending',
        priority: 'high'
      });

      const response = await handleMCPRequest(request);
      const result = await response.json();

      expect(result.result.success).toBe(true);
      expect(result.result.todo.title).toBe('Test Todo');
      expect(mockSaveDatabase).toHaveBeenCalled();
    });

    test('should list todos with filters', async () => {
      const request = new Request('/api/mcp/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'tools/call',
          params: {
            name: 'todo.list',
            arguments: {
              status: 'pending',
              priority: 'high'
            }
          },
          id: 1
        })
      });

      const mockTodos = [
        { id: '1', title: 'Todo 1', status: 'pending', priority: 'high' },
        { id: '2', title: 'Todo 2', status: 'pending', priority: 'high' }
      ];

      mockStatement.step
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false);
      mockStatement.getAsObject
        .mockReturnValueOnce(mockTodos[0])
        .mockReturnValueOnce(mockTodos[1]);

      const response = await handleMCPRequest(request);
      const result = await response.json();

      expect(result.result.todos).toEqual(mockTodos);
      expect(result.result.count).toBe(2);
    });

    test('should update a todo', async () => {
      const request = new Request('/api/mcp/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'tools/call',
          params: {
            name: 'todo.update',
            arguments: {
              id: 'test-id',
              title: 'Updated Title',
              status: 'in_progress'
            }
          },
          id: 1
        })
      });

      mockStatement.step.mockReturnValueOnce(true).mockReturnValueOnce(false);
      mockStatement.getAsObject.mockReturnValue({
        id: 'test-id',
        title: 'Updated Title',
        status: 'in_progress'
      });

      const response = await handleMCPRequest(request);
      const result = await response.json();

      expect(result.result.success).toBe(true);
      expect(result.result.todo.title).toBe('Updated Title');
      expect(mockSaveDatabase).toHaveBeenCalled();
    });

    test('should complete a todo', async () => {
      const request = new Request('/api/mcp/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'tools/call',
          params: {
            name: 'todo.complete',
            arguments: { id: 'test-id' }
          },
          id: 1
        })
      });

      mockStatement.step.mockReturnValueOnce(true).mockReturnValueOnce(false);
      mockStatement.getAsObject.mockReturnValue({
        id: 'test-id',
        status: 'completed'
      });

      const response = await handleMCPRequest(request);
      const result = await response.json();

      expect(result.result.success).toBe(true);
      expect(result.result.todo.status).toBe('completed');
      expect(mockSaveDatabase).toHaveBeenCalled();
    });

    test('should delete a todo', async () => {
      const request = new Request('/api/mcp/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'tools/call',
          params: {
            name: 'todo.delete',
            arguments: { id: 'test-id' }
          },
          id: 1
        })
      });

      const response = await handleMCPRequest(request);
      const result = await response.json();

      expect(result.result.success).toBe(true);
      expect(result.result.message).toContain('deleted');
      expect(mockSaveDatabase).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    test('should handle unknown methods', async () => {
      const request = new Request('/api/mcp/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'unknown/method',
          id: 1
        })
      });

      const response = await handleMCPRequest(request);
      const result = await response.json();

      expect(result.error).toBeDefined();
      expect(result.error.code).toBe(-32601);
      expect(result.error.message).toContain('Method not found');
    });

    test('should handle tool errors gracefully', async () => {
      const request = new Request('/api/mcp/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'tools/call',
          params: {
            name: 'todo.create',
            arguments: {} // Missing required title
          },
          id: 1
        })
      });

      const response = await handleMCPRequest(request);
      const result = await response.json();

      expect(result.error).toBeDefined();
      expect(result.error.code).toBe(-32603);
      expect(result.error.message).toContain('Title is required');
    });

    test('should validate enum values', async () => {
      const request = new Request('/api/mcp/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'tools/call',
          params: {
            name: 'todo.create',
            arguments: {
              title: 'Test',
              priority: 'invalid'
            }
          },
          id: 1
        })
      });

      const response = await handleMCPRequest(request);
      const result = await response.json();

      expect(result.error).toBeDefined();
      expect(result.error.message).toContain('Invalid priority');
    });
  });
});