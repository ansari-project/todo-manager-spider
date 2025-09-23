import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db/client'
import { todos } from '@/db/schema'
import { updateTodoSchema } from '@/app/lib/validators'
import { eq } from 'drizzle-orm'

// GET /api/todos/[id] - Get single todo
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const result = await db
      .select()
      .from(todos)
      .where(eq(todos.id, id))
      .limit(1)

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Todo not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(result[0])
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
  const { id } = await params;
  try {
    const body = await request.json()
    const validated = updateTodoSchema.parse(body)

    const updates: any = { ...validated }
    if (validated.dueDate !== undefined) {
      updates.dueDate = validated.dueDate ? new Date(validated.dueDate) : null
    }

    // Set completedAt when status changes to completed
    if (validated.status === 'completed') {
      updates.completedAt = new Date()
    } else if (validated.status) {
      updates.completedAt = null
    }

    const result = await db
      .update(todos)
      .set(updates)
      .where(eq(todos.id, id))
      .returning()

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Todo not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(result[0])
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
  const { id } = await params;
  try {
    const result = await db
      .delete(todos)
      .where(eq(todos.id, id))
      .returning()

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Todo not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting todo:', error)
    return NextResponse.json(
      { error: 'Failed to delete todo' },
      { status: 500 }
    )
  }
}