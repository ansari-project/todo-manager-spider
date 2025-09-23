import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db/client'
import { todos } from '@/db/schema'
import { createTodoSchema } from '@/app/lib/validators'
import { desc, eq, and, gte, lte } from 'drizzle-orm'

// GET /api/todos - List todos with filtering
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const conditions = []

    if (status) {
      conditions.push(eq(todos.status, status as any))
    }
    if (priority) {
      conditions.push(eq(todos.priority, priority as any))
    }
    if (startDate) {
      conditions.push(gte(todos.dueDate, new Date(startDate)))
    }
    if (endDate) {
      conditions.push(lte(todos.dueDate, new Date(endDate)))
    }

    const query = conditions.length > 0
      ? db.select().from(todos).where(and(...conditions))
      : db.select().from(todos)

    const result = await query.orderBy(desc(todos.createdAt))

    return NextResponse.json(result)
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

    const todo = {
      ...validated,
      dueDate: validated.dueDate ? new Date(validated.dueDate) : undefined,
    }

    const result = await db.insert(todos).values(todo).returning()

    return NextResponse.json(result[0], { status: 201 })
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