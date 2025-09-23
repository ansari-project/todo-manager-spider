/**
 * MCP Protocol Handlers for Service Worker
 * Implements the actual MCP tool handlers that interact with SQLite
 */

// MCP Tools available
const MCP_TOOLS = {
  'todo.list': {
    description: 'List todos with optional filtering',
    parameters: {
      status: { type: 'string', enum: ['pending', 'in_progress', 'completed'] },
      priority: { type: 'string', enum: ['low', 'medium', 'high'] }
    }
  },
  'todo.create': {
    description: 'Create a new todo',
    parameters: {
      title: { type: 'string', required: true },
      description: { type: 'string' },
      priority: { type: 'string', enum: ['low', 'medium', 'high'] }
    }
  },
  'todo.update': {
    description: 'Update an existing todo',
    parameters: {
      id: { type: 'string', required: true },
      title: { type: 'string' },
      description: { type: 'string' },
      status: { type: 'string', enum: ['pending', 'in_progress', 'completed'] },
      priority: { type: 'string', enum: ['low', 'medium', 'high'] }
    }
  },
  'todo.delete': {
    description: 'Delete a todo',
    parameters: {
      id: { type: 'string', required: true }
    }
  },
  'todo.complete': {
    description: 'Mark a todo as completed',
    parameters: {
      id: { type: 'string', required: true }
    }
  }
};

/**
 * Handle MCP tool call
 */
async function handleToolCall(toolName, parameters) {
  console.log(`[SW-MCP] Handling tool call: ${toolName}`, parameters);

  switch (toolName) {
    case 'todo.list':
      return await listTodos(parameters);

    case 'todo.create':
      return await createTodo(parameters);

    case 'todo.update':
      return await updateTodo(parameters);

    case 'todo.delete':
      return await deleteTodo(parameters);

    case 'todo.complete':
      return await completeTodo(parameters);

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

/**
 * List todos with optional filtering
 */
async function listTodos(params) {
  const { status, priority } = params || {};

  // Validate enum values
  if (status && !['pending', 'in_progress', 'completed'].includes(status)) {
    throw new Error(`Invalid status: ${status}`);
  }
  if (priority && !['low', 'medium', 'high'].includes(priority)) {
    throw new Error(`Invalid priority: ${priority}`);
  }

  // Build SQL query with filters
  let sql = 'SELECT * FROM todos WHERE 1=1';
  const bindings = [];

  if (status) {
    sql += ' AND status = ?';
    bindings.push(status);
  }

  if (priority) {
    sql += ' AND priority = ?';
    bindings.push(priority);
  }

  sql += ' ORDER BY created_at DESC';

  const result = await executeSQLiteQuery(sql, bindings);

  return {
    todos: result,
    count: result.length
  };
}

/**
 * Create a new todo
 */
async function createTodo(params) {
  const { title, description = null, priority = 'medium' } = params;

  if (!title) {
    throw new Error('Title is required');
  }

  // Validate priority enum
  if (priority && !['low', 'medium', 'high'].includes(priority)) {
    throw new Error(`Invalid priority: ${priority}`);
  }

  const id = generateId();
  const now = new Date().toISOString();

  const sql = `
    INSERT INTO todos (id, title, description, status, priority, created_at, updated_at)
    VALUES (?, ?, ?, 'pending', ?, ?, ?)
  `;

  await executeSQLiteStatement(sql, [id, title, description, priority, now, now]);

  // Return the created todo
  const [todo] = await executeSQLiteQuery('SELECT * FROM todos WHERE id = ?', [id]);

  return {
    success: true,
    todo
  };
}

/**
 * Update a todo
 */
async function updateTodo(params) {
  const { id, title, description, status, priority } = params;

  if (!id) {
    throw new Error('ID is required');
  }

  // Validate enum values
  if (status && !['pending', 'in_progress', 'completed'].includes(status)) {
    throw new Error(`Invalid status: ${status}`);
  }
  if (priority && !['low', 'medium', 'high'].includes(priority)) {
    throw new Error(`Invalid priority: ${priority}`);
  }

  // Build dynamic update query
  const updates = [];
  const bindings = [];

  if (title !== undefined) {
    updates.push('title = ?');
    bindings.push(title);
  }

  if (description !== undefined) {
    updates.push('description = ?');
    bindings.push(description);
  }

  if (status !== undefined) {
    updates.push('status = ?');
    bindings.push(status);
  }

  if (priority !== undefined) {
    updates.push('priority = ?');
    bindings.push(priority);
  }

  if (updates.length === 0) {
    throw new Error('No updates provided');
  }

  // Add updated_at
  updates.push('updated_at = ?');
  bindings.push(new Date().toISOString());

  // Add id for WHERE clause
  bindings.push(id);

  const sql = `UPDATE todos SET ${updates.join(', ')} WHERE id = ?`;
  await executeSQLiteStatement(sql, bindings);

  // Return updated todo
  const [todo] = await executeSQLiteQuery('SELECT * FROM todos WHERE id = ?', [id]);

  if (!todo) {
    throw new Error(`Todo with ID ${id} not found`);
  }

  return {
    success: true,
    todo
  };
}

/**
 * Delete a todo
 */
async function deleteTodo(params) {
  const { id } = params;

  if (!id) {
    throw new Error('ID is required');
  }

  await executeSQLiteStatement('DELETE FROM todos WHERE id = ?', [id]);

  return {
    success: true,
    message: `Todo ${id} deleted`
  };
}

/**
 * Mark a todo as completed
 */
async function completeTodo(params) {
  const { id } = params;

  if (!id) {
    throw new Error('ID is required');
  }

  const sql = `
    UPDATE todos
    SET status = 'completed', updated_at = ?
    WHERE id = ?
  `;

  await executeSQLiteStatement(sql, [new Date().toISOString(), id]);

  // Return updated todo
  const [todo] = await executeSQLiteQuery('SELECT * FROM todos WHERE id = ?', [id]);

  if (!todo) {
    throw new Error(`Todo with ID ${id} not found`);
  }

  return {
    success: true,
    todo
  };
}

/**
 * Generate a unique ID for new todos
 */
function generateId() {
  // Use crypto.randomUUID() if available (modern browsers)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older environments
  return `todo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Execute SQLite query (returns results)
 * This will be connected to the actual SQLite instance in sw-mcp-sqlite.js
 */
async function executeSQLiteQuery(sql, params = []) {
  // This function will be overridden by sw-mcp-sqlite.js
  // which has access to the actual SQLite database
  throw new Error('SQLite not initialized');
}

/**
 * Execute SQLite statement (no results)
 * This will be connected to the actual SQLite instance in sw-mcp-sqlite.js
 */
async function executeSQLiteStatement(sql, params = []) {
  // This function will be overridden by sw-mcp-sqlite.js
  // which has access to the actual SQLite database
  throw new Error('SQLite not initialized');
}

// Export for use in sw-mcp-sqlite.js
if (typeof self !== 'undefined') {
  self.MCP_TOOLS = MCP_TOOLS;
  self.handleToolCall = handleToolCall;
}