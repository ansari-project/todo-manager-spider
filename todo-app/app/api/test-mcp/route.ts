import { NextRequest, NextResponse } from 'next/server';

/**
 * Test endpoint to verify Service Worker MCP functionality
 * This simulates making MCP protocol calls that should be intercepted by the Service Worker
 */
export async function POST(request: NextRequest) {
  try {
    // Test initialize method
    // Use relative URL that will be intercepted by Service Worker in the browser
    const baseUrl = request.headers.get('origin') || 'http://localhost:3001';
    const initResponse = await fetch(`${baseUrl}/api/mcp/`, {
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

    if (!initResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to initialize MCP' },
        { status: 500 }
      );
    }

    const initResult = await initResponse.json();

    // Test tools/list method
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

    if (!listResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to list tools' },
        { status: 500 }
      );
    }

    const listResult = await listResponse.json();

    // Test tools/call method with a simple todo_list call
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

    if (!callResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to call tool' },
        { status: 500 }
      );
    }

    const callResult = await callResponse.json();

    return NextResponse.json({
      success: true,
      results: {
        initialize: initResult,
        toolsList: listResult,
        toolCall: callResult
      },
      message: 'Service Worker MCP is working!'
    });

  } catch (error) {
    console.error('[Test-MCP] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}