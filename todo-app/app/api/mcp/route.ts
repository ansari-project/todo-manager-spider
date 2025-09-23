import { NextRequest, NextResponse } from 'next/server'

// This endpoint should NEVER be reached - the Service Worker should intercept all /api/mcp/ requests
// If this is called, it means the Service Worker is not controlling the page
export async function POST(request: NextRequest) {
  console.error('[MCP Fallback] ERROR: Request reached server - Service Worker not intercepting!')

  // Return 503 to indicate service unavailable
  return NextResponse.json(
    {
      jsonrpc: '2.0',
      error: {
        code: -32603,
        message: 'Service Worker not active. This application requires the Service Worker to be controlling the page for todo operations. Please refresh the page.',
        data: {
          info: 'The Service Worker MCP handles all todo operations locally using IndexedDB',
          action: 'Please refresh the page to activate the Service Worker'
        }
      }
    },
    { status: 503 }
  )
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'This endpoint should be handled by the Service Worker',
    info: 'If you see this, the Service Worker is not intercepting requests'
  })
}