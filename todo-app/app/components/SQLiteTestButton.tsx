'use client';

import { useState } from 'react';
import { initializeDatabase, clearDatabase, exportDatabase } from '../lib/sqlite-client';
import { createTodo, getAllTodos, addSampleTodos } from '../lib/client-todo-service';

export function SQLiteTestButton() {
  const [testResult, setTestResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const testSQLite = async () => {
    setLoading(true);
    setTestResult(null);

    try {
      // Initialize database
      await initializeDatabase();
      console.log('[SQLite Test] Database initialized');

      // Clear any existing data
      await clearDatabase();
      console.log('[SQLite Test] Database cleared');

      // Add sample todos
      await addSampleTodos();
      console.log('[SQLite Test] Sample todos added');

      // Retrieve todos
      const todos = await getAllTodos();
      console.log('[SQLite Test] Retrieved todos:', todos);

      setTestResult(`✅ Client-side SQLite is working!\n\nCreated ${todos.length} sample todos:\n${todos.map(t => `- ${t.title}`).join('\n')}`);

    } catch (error) {
      console.error('[SQLite Test] Error:', error);
      setTestResult(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const exportDb = async () => {
    try {
      const blob = await exportDatabase();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'todos.db';
      a.click();
      URL.revokeObjectURL(url);
      setTestResult('✅ Database exported!');
    } catch (error) {
      setTestResult(`❌ Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="fixed bottom-40 right-4 z-50">
      <div className="space-y-2">
        <button
          onClick={testSQLite}
          disabled={loading}
          className="block w-full bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test Client SQLite'}
        </button>

        <button
          onClick={exportDb}
          className="block w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg"
        >
          Export Database
        </button>
      </div>

      {testResult && (
        <div className="mt-2 p-3 bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-sm">
          <pre className="text-xs whitespace-pre-wrap">{testResult}</pre>
        </div>
      )}
    </div>
  );
}