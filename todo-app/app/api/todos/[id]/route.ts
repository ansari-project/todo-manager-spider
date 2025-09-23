import { NextRequest, NextResponse } from 'next/server'
import { updateTodoSchema } from '@/app/lib/validators'

// Note: These API routes are designed to proxy to client-side storage
// The actual implementation happens in the browser via Service Worker or direct client calls

// GET /api/todos/[id] - Get single todo
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    return NextResponse.json({
      message: 'Todo operations should be handled client-side',
      info: 'Use the storage-client directly or through Service Worker',
      id
    })
  } catch (error) {
    console.error('Error fetching todo:', error)
    return NextResponse.json(
      { error: 'Failed to fetch todo' },
      { status: 500 }
    )
  }
}

// PUT /api/todos/[id] - Update todo
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const validated = updateTodoSchema.parse(body)

    return NextResponse.json({
      message: 'Todo operations should be handled client-side',
      info: 'Use the storage-client directly or through Service Worker',
      id,
      data: validated
    })
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid request data', details: error },
        { status: 400 }
      )
    }

    console.error('Error updating todo:', error)
    return NextResponse.json(
      { error: 'Failed to update todo' },
      { status: 500 }
    )
  }
}

// DELETE /api/todos/[id] - Delete todo
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    return NextResponse.json({
      message: 'Todo operations should be handled client-side',
      info: 'Use the storage-client directly or through Service Worker',
      id,
      deleted: true
    })
  } catch (error) {
    console.error('Error deleting todo:', error)
    return NextResponse.json(
      { error: 'Failed to delete todo' },
      { status: 500 }
    )
  }
}