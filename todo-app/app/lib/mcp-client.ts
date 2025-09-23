/**
 * Client-side MCP client that communicates with the Service Worker
 * This replaces the server-side proxy and enables direct client-to-SW communication
 */

export interface MCPToolResult {
  success?: boolean;
  todo?: any;
  todos?: any[];
  count?: number;
  message?: string;
  error?: string;
}

/**
 * Call an MCP tool via the Service Worker
 */
export async function callMCPTool(
  toolName: string,
  toolArguments: Record<string, any> = {}
): Promise<MCPToolResult> {
  try {
    // This fetch will be intercepted by the Service Worker
    const response = await fetch('/api/mcp/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: toolName,
          arguments: toolArguments
        },
        id: Date.now()
      })
    });

    if (!response.ok) {
      throw new Error(`MCP request failed: ${response.statusText}`);
    }

    const result = await response.json();

    // Handle JSON-RPC errors
    if (result.error) {
      throw new Error(result.error.message || 'MCP error');
    }

    return result.result;
  } catch (error) {
    console.error('[MCP Client] Error:', error);
    throw error;
  }
}

/**
 * List available MCP tools
 */
export async function listMCPTools(): Promise<any[]> {
  try {
    const response = await fetch('/api/mcp/tools', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/list',
        id: Date.now()
      })
    });

    if (!response.ok) {
      throw new Error(`MCP request failed: ${response.statusText}`);
    }

    const result = await response.json();

    if (result.error) {
      throw new Error(result.error.message || 'MCP error');
    }

    return result.result;
  } catch (error) {
    console.error('[MCP Client] Error listing tools:', error);
    throw error;
  }
}

/**
 * Convenience methods for common todo operations
 */
export const MCPTodos = {
  async list(filters?: { status?: string; priority?: string }) {
    return callMCPTool('todo.list', filters || {});
  },

  async create(todo: { title: string; description?: string; priority?: string }) {
    return callMCPTool('todo.create', todo);
  },

  async update(id: string, updates: Partial<{ title: string; description: string; status: string; priority: string }>) {
    return callMCPTool('todo.update', { id, ...updates });
  },

  async complete(id: string) {
    return callMCPTool('todo.complete', { id });
  },

  async delete(id: string) {
    return callMCPTool('todo.delete', { id });
  }
};