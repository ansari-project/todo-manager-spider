'use client';

import { useState } from 'react';

export function MCPTestButton() {
  const [testResult, setTestResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const testMCP = async () => {
    setLoading(true);
    setTestResult(null);

    try {
      // Test 1: Initialize
      const initResponse = await fetch('/api/mcp/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {}
          }
        })
      });

      const initResult = await initResponse.json();
      console.log('[MCP Test] Initialize result:', initResult);

      // Test 2: List tools
      const listResponse = await fetch('/api/mcp/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/list',
          params: {}
        })
      });

      const listResult = await listResponse.json();
      console.log('[MCP Test] Tools list result:', listResult);

      // Test 3: Call a tool
      const callResponse = await fetch('/api/mcp/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 3,
          method: 'tools/call',
          params: {
            name: 'todo_list',
            arguments: { status: 'all' }
          }
        })
      });

      const callResult = await callResponse.json();
      console.log('[MCP Test] Tool call result:', callResult);

      setTestResult(`✅ Service Worker MCP is working!\n\nTools available: ${listResult.result?.tools?.length || 0}`);

    } catch (error) {
      console.error('[MCP Test] Error:', error);
      setTestResult(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-20 right-4 z-50">
      <button
        onClick={testMCP}
        disabled={loading}
        className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg shadow-lg disabled:opacity-50"
      >
        {loading ? 'Testing...' : 'Test Service Worker MCP'}
      </button>

      {testResult && (
        <div className="mt-2 p-3 bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-sm">
          <pre className="text-xs whitespace-pre-wrap">{testResult}</pre>
        </div>
      )}
    </div>
  );
}