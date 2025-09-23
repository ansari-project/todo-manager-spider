/**
 * Tests for Service Worker MCP Handlers
 */

describe('MCP Protocol Handlers', () => {
  // Mock the SQLite functions
  let mockQuery, mockStatement;

  beforeEach(() => {
    // Reset mocks
    mockQuery = jest.fn();
    mockStatement = jest.fn();

    // Override the SQLite functions
    global.executeSQLiteQuery = mockQuery;
    global.executeSQLiteStatement = mockStatement;
  });

  describe('todo.list', () => {
    test('should list all todos without filters', async () => {
      const mockTodos = [
        { id: '1', title: 'Test 1', status: 'pending' },
        { id: '2', title: 'Test 2', status: 'completed' }
      ];

      mockQuery.mockResolvedValue(mockTodos);

      const result = await handleToolCall('todo.list', {});

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM todos WHERE 1=1 ORDER BY created_at DESC',
        []
      );
      expect(result).toEqual({
        todos: mockTodos,
        count: 2
      });
    });

    test('should filter by status', async () => {
      const mockTodos = [
        { id: '1', title: 'Test 1', status: 'pending' }
      ];

      mockQuery.mockResolvedValue(mockTodos);

      const result = await handleToolCall('todo.list', { status: 'pending' });

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM todos WHERE 1=1 AND status = ? ORDER BY created_at DESC',
        ['pending']
      );
      expect(result.count).toBe(1);
    });

    test('should filter by priority', async () => {
      const mockTodos = [
        { id: '1', title: 'Test 1', priority: 'high' }
      ];

      mockQuery.mockResolvedValue(mockTodos);

      const result = await handleToolCall('todo.list', { priority: 'high' });

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM todos WHERE 1=1 AND priority = ? ORDER BY created_at DESC',
        ['high']
      );
      expect(result.count).toBe(1);
    });
  });

  describe('todo.create', () => {
    test('should create a new todo', async () => {
      const newTodo = { title: 'New Task', description: 'Test description' };
      const createdTodo = { id: 'todo_123', ...newTodo, status: 'pending' };

      mockStatement.mockResolvedValue();
      mockQuery.mockResolvedValue([createdTodo]);

      const result = await handleToolCall('todo.create', newTodo);

      expect(mockStatement).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.todo).toEqual(createdTodo);
    });

    test('should throw error if title is missing', async () => {
      await expect(handleToolCall('todo.create', {})).rejects.toThrow('Title is required');
    });
  });

  describe('todo.update', () => {
    test('should update a todo', async () => {
      const updates = { id: 'todo_123', title: 'Updated Task' };
      const updatedTodo = { ...updates, status: 'pending' };

      mockStatement.mockResolvedValue();
      mockQuery.mockResolvedValue([updatedTodo]);

      const result = await handleToolCall('todo.update', updates);

      expect(mockStatement).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.todo).toEqual(updatedTodo);
    });

    test('should throw error if id is missing', async () => {
      await expect(handleToolCall('todo.update', { title: 'Test' })).rejects.toThrow('ID is required');
    });

    test('should throw error if no updates provided', async () => {
      await expect(handleToolCall('todo.update', { id: '123' })).rejects.toThrow('No updates provided');
    });
  });

  describe('todo.delete', () => {
    test('should delete a todo', async () => {
      mockStatement.mockResolvedValue();

      const result = await handleToolCall('todo.delete', { id: 'todo_123' });

      expect(mockStatement).toHaveBeenCalledWith(
        'DELETE FROM todos WHERE id = ?',
        ['todo_123']
      );
      expect(result.success).toBe(true);
    });

    test('should throw error if id is missing', async () => {
      await expect(handleToolCall('todo.delete', {})).rejects.toThrow('ID is required');
    });
  });

  describe('todo.complete', () => {
    test('should mark a todo as completed', async () => {
      const completedTodo = { id: 'todo_123', status: 'completed' };

      mockStatement.mockResolvedValue();
      mockQuery.mockResolvedValue([completedTodo]);

      const result = await handleToolCall('todo.complete', { id: 'todo_123' });

      expect(mockStatement).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.todo.status).toBe('completed');
    });

    test('should throw error if id is missing', async () => {
      await expect(handleToolCall('todo.complete', {})).rejects.toThrow('ID is required');
    });
  });

  describe('unknown tool', () => {
    test('should throw error for unknown tool', async () => {
      await expect(handleToolCall('unknown.tool', {})).rejects.toThrow('Unknown tool: unknown.tool');
    });
  });
});