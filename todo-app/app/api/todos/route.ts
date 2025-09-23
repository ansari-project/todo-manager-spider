import { NextRequest, NextResponse } from 'next/server'
import { createTodoSchema } from '@/app/lib/validators'

// Note: These API routes are designed to proxy to client-side storage
// The actual implementation happens in the browser via Service Worker or direct client calls

// GET /api/todos - List todos with filtering
export async function GET(request: NextRequest) {
  try {
    // In production, this would proxy to the Service Worker
    // For now, return a message indicating client-side handling
    return NextResponse.json({
      message: 'Todo operations should be handled client-side',
      info: 'Use the storage-client directly or through Service Worker'
    })
  } catch (error) {
    console.error('Error fetching todos:', error)
    return NextResponse.json(
      { error: 'Failed to fetch todos' },
      { status: 500 }
    )
  }
}

// POST /api/todos - Create new todo
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = createTodoSchema.parse(body)

    // In production, this would proxy to the Service Worker
    return NextResponse.json({
      message: 'Todo operations should be handled client-side',
      info: 'Use the storage-client directly or through Service Worker',
      data: validated
    })
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid request data', details: error },
        { status: 400 }
      )
    }

    console.error('Error creating todo:', error)
    return NextResponse.json(
      { error: 'Failed to create todo' },
      { status: 500 }
    )
  }
}