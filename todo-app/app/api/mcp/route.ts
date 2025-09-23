import { NextRequest, NextResponse } from 'next/server'

// Fallback MCP handler for when Service Worker isn't active
// The Service Worker should intercept these requests, but this handles edge cases
export async function POST(request: NextRequest) {
  return NextResponse.json(
    {
      error: 'Service Worker not active. Please refresh the page to enable local MCP tools.',
      info: 'The Service Worker MCP should handle these requests locally'
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