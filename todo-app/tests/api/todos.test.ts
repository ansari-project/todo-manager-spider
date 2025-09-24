import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/todos/route'
import { PUT, DELETE } from '@/app/api/todos/[id]/route'

describe('Todo API Routes', () => {
  describe('GET /api/todos', () => {
    it('should return client-side handling message', async () => {
      const request = new NextRequest('http://localhost:3000/api/todos')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Todo operations should be handled client-side')
      expect(data.info).toBe('Use the storage-client directly or through Service Worker')
    })

    it('should handle filter parameters', async () => {
      const request = new NextRequest('http://localhost:3000/api/todos?status=pending&priority=high')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Todo operations should be handled client-side')
    })
  })

  describe('POST /api/todos', () => {
    it('should validate and return client-side message', async () => {
      const request = new NextRequest('http://localhost:3000/api/todos', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test Todo',
          priority: 'high'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Todo operations should be handled client-side')
      expect(data.data).toEqual({
        title: 'Test Todo',
        priority: 'high',
        status: 'pending'
      })
    })

    it('should validate required fields', async () => {
      const request = new NextRequest('http://localhost:3000/api/todos', {
        method: 'POST',
        body: JSON.stringify({
          // Missing required title
          priority: 'high'
        })
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
    })
  })

  describe('PUT /api/todos/[id]', () => {
    it('should return client-side handling message', async () => {
      const request = new NextRequest('http://localhost:3000/api/todos/test-id', {
        method: 'PUT',
        body: JSON.stringify({
          title: 'Updated Todo'
        })
      })

      const response = await PUT(request, { params: Promise.resolve({ id: 'test-id' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Todo operations should be handled client-side')
    })
  })

  describe('DELETE /api/todos/[id]', () => {
    it('should return client-side handling message', async () => {
      const request = new NextRequest('http://localhost:3000/api/todos/test-id', {
        method: 'DELETE'
      })

      const response = await DELETE(request, { params: Promise.resolve({ id: 'test-id' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Todo operations should be handled client-side')
    })
  })
})