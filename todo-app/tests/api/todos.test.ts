import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/todos/route'
import { PUT, DELETE } from '@/app/api/todos/[id]/route'

// Mock the database
vi.mock('@/db/client', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => Promise.resolve([
            {
              id: 'test-1',
              title: 'Test Todo',
              description: 'Test description',
              priority: 'medium',
              status: 'pending',
              dueDate: null,
              createdAt: new Date(),
              updatedAt: new Date(),
              completedAt: null,
            },
          ])),
        })),
        orderBy: vi.fn(() => Promise.resolve([
          {
            id: 'test-1',
            title: 'Test Todo',
            description: 'Test description',
            priority: 'medium',
            status: 'pending',
            dueDate: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            completedAt: null,
          },
        ])),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([
          {
            id: 'new-todo',
            title: 'New Todo',
            description: 'New description',
            priority: 'high',
            status: 'pending',
            dueDate: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            completedAt: null,
          },
        ])),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(() => Promise.resolve([
            {
              id: 'test-1',
              title: 'Updated Todo',
              description: 'Updated description',
              priority: 'high',
              status: 'completed',
              dueDate: null,
              createdAt: new Date(),
              updatedAt: new Date(),
              completedAt: new Date(),
            },
          ])),
        })),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([
          {
            id: 'test-1',
            title: 'Deleted Todo',
          },
        ])),
      })),
    })),
  },
}))

describe('Todo API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/todos', () => {
    it('should return todos list', async () => {
      const request = new NextRequest('http://localhost:3000/api/todos')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toBeInstanceOf(Array)
      expect(data[0]).toHaveProperty('id')
      expect(data[0]).toHaveProperty('title')
    })

    it('should handle filter parameters', async () => {
      const request = new NextRequest('http://localhost:3000/api/todos?status=completed&priority=high')
      const response = await GET(request)

      expect(response.status).toBe(200)
    })
  })

  describe('POST /api/todos', () => {
    it('should create a new todo', async () => {
      const request = new NextRequest('http://localhost:3000/api/todos', {
        method: 'POST',
        body: JSON.stringify({
          title: 'New Todo',
          description: 'New description',
          priority: 'high',
          status: 'pending',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data).toHaveProperty('id')
      expect(data.title).toBe('New Todo')
    })

    it('should validate required fields', async () => {
      const request = new NextRequest('http://localhost:3000/api/todos', {
        method: 'POST',
        body: JSON.stringify({
          description: 'Missing title',
        }),
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
    })
  })

  describe('PUT /api/todos/[id]', () => {
    it('should update a todo', async () => {
      const request = new NextRequest('http://localhost:3000/api/todos/test-1', {
        method: 'PUT',
        body: JSON.stringify({
          title: 'Updated Todo',
          status: 'completed',
        }),
      })

      const response = await PUT(request, { params: { id: 'test-1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.title).toBe('Updated Todo')
      expect(data.status).toBe('completed')
    })
  })

  describe('DELETE /api/todos/[id]', () => {
    it('should delete a todo', async () => {
      const request = new NextRequest('http://localhost:3000/api/todos/test-1', {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: { id: 'test-1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('success', true)
    })
  })
})