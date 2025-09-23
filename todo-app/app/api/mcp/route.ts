import { NextRequest, NextResponse } from 'next/server'

// Fallback MCP handler for when Service Worker isn't active
// The Service Worker should intercept these requests, but this handles edge cases
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('[MCP Fallback] Request received:', body.method)

    // Return a basic JSON-RPC response
    return NextResponse.json({
      jsonrpc: '2.0',
      id: body.id || null,
      result: {
        error: 'Service Worker MCP is initializing. Please try again.',
        info: 'The Service Worker should handle these requests locally once ready'
      }
    })
  } catch (error) {
    return NextResponse.json({
      jsonrpc: '2.0',
      id: null,
      error: {
        code: -32700,
        message: 'Parse error'
      }
    })
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'This endpoint should be handled by the Service Worker',
    info: 'If you see this, the Service Worker is not intercepting requests'
  })
}