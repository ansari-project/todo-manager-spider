'use client';

import { useState } from 'react';
import { MCPTodos, listMCPTools } from '../lib/mcp-client';
import { Button } from '@/components/ui/button';

export function MCPDemo() {
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const testMCP = async (operation: string) => {
    setLoading(true);
    setResult('Loading...');

    try {
      let response;

      switch (operation) {
        case 'list-tools':
          response = await listMCPTools();
          setResult(`Available tools:\n${JSON.stringify(response, null, 2)}`);
          break;

        case 'create':
          response = await MCPTodos.create({
            title: 'Test Todo from MCP',
            description: 'Created via Service Worker MCP',
            priority: 'high'
          });
          setResult(`Created todo:\n${JSON.stringify(response, null, 2)}`);
          break;

        case 'list':
          response = await MCPTodos.list();
          setResult(`Todos:\n${JSON.stringify(response, null, 2)}`);
          break;

        case 'list-pending':
          response = await MCPTodos.list({ status: 'pending' });
          setResult(`Pending todos:\n${JSON.stringify(response, null, 2)}`);
          break;

        default:
          setResult('Unknown operation');
      }
    } catch (error) {
      setResult(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 left-4 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 max-w-md">
      <h3 className="font-bold mb-2">MCP Demo (Direct SW Communication)</h3>

      <div className="space-y-2 mb-3">
        <Button
          onClick={() => testMCP('list-tools')}
          disabled={loading}
          size="sm"
          className="w-full"
        >
          List MCP Tools
        </Button>

        <Button
          onClick={() => testMCP('create')}
          disabled={loading}
          size="sm"
          className="w-full"
        >
          Create Test Todo
        </Button>

        <Button
          onClick={() => testMCP('list')}
          disabled={loading}
          size="sm"
          className="w-full"
        >
          List All Todos
        </Button>

        <Button
          onClick={() => testMCP('list-pending')}
          disabled={loading}
          size="sm"
          className="w-full"
        >
          List Pending Todos
        </Button>
      </div>

      {result && (
        <pre className="text-xs bg-gray-100 dark:bg-gray-900 p-2 rounded overflow-auto max-h-60">
          {result}
        </pre>
      )}
    </div>
  );
}