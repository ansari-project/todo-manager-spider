/**
 * Tests for IndexedDB Storage Client
 * Verifies CRUD operations and data persistence
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { todos, exportDatabase, importDatabase, clearDatabase } from '@/app/lib/storage-client'
import { Todo, NewTodo } from '@/db/types'

// Mock IndexedDB for testing
import 'fake-indexeddb/auto'

describe('IndexedDB Storage Client', () => {
  beforeEach(async () => {
    // Clear database before each test
    await clearDatabase()
  })

  describe('CRUD Operations', () => {
    it('should create a new todo', async () => {
      const newTodo: NewTodo = {
        title: 'Test Todo',
        description: 'Test Description',
        priority: 'high',
        status: 'pending'
      }

      const created = await todos.create(newTodo)

      expect(created).toBeDefined()
      expect(created.id).toBeDefined()
      expect(created.title).toBe('Test Todo')
      expect(created.description).toBe('Test Description')
      expect(created.priority).toBe('high')
      expect(created.status).toBe('pending')
      expect(created.createdAt).toBeInstanceOf(Date)
      expect(created.updatedAt).toBeInstanceOf(Date)
    })

    it('should find todo by ID', async () => {
      const created = await todos.create({ title: 'Find Me' })

      const found = await todos.findById(created.id)

      expect(found).toBeDefined()
      expect(found?.id).toBe(created.id)
      expect(found?.title).toBe('Find Me')
    })

    it('should return null for non-existent ID', async () => {
      const found = await todos.findById('non-existent')

      expect(found).toBeNull()
    })

    it('should update a todo', async () => {
      const created = await todos.create({ title: 'Original Title' })

      // Small delay to ensure updatedAt differs
      await new Promise(resolve => setTimeout(resolve, 10))

      const updated = await todos.update(created.id, {
        title: 'Updated Title',
        status: 'completed'
      })

      expect(updated).toBeDefined()
      expect(updated?.title).toBe('Updated Title')
      expect(updated?.status).toBe('completed')
      expect(updated?.completedAt).toBeInstanceOf(Date)
      expect(updated?.updatedAt.getTime()).toBeGreaterThanOrEqual(created.updatedAt.getTime())
    })

    it('should delete a todo', async () => {
      const created = await todos.create({ title: 'Delete Me' })

      const deleted = await todos.delete(created.id)
      expect(deleted).toBe(true)

      const found = await todos.findById(created.id)
      expect(found).toBeNull()
    })

    it('should find all todos', async () => {
      await todos.create({ title: 'Todo 1' })
      await new Promise(resolve => setTimeout(resolve, 10))
      await todos.create({ title: 'Todo 2' })
      await new Promise(resolve => setTimeout(resolve, 10))
      await todos.create({ title: 'Todo 3' })

      const all = await todos.findAll()

      expect(all).toHaveLength(3)
      // Should be sorted by createdAt descending (newest first)
      expect(all[0].title).toBe('Todo 3')
      expect(all[2].title).toBe('Todo 1')
    })

    it('should delete all todos', async () => {
      await todos.create({ title: 'Todo 1' })
      await todos.create({ title: 'Todo 2' })

      await todos.deleteAll()

      const all = await todos.findAll()
      expect(all).toHaveLength(0)
    })
  })

  describe('Query Operations', () => {
    it('should search todos by text', async () => {
      await todos.create({ title: 'Buy groceries', description: 'Milk and eggs' })
      await todos.create({ title: 'Walk the dog' })
      await todos.create({ title: 'Read book', description: 'About dogs' })

      const results = await todos.search('dog')

      expect(results).toHaveLength(2)
      expect(results.some(t => t.title === 'Walk the dog')).toBe(true)
      expect(results.some(t => t.title === 'Read book')).toBe(true)
    })

    it('should find todos by status', async () => {
      await todos.create({ title: 'Pending 1', status: 'pending' })
      await todos.create({ title: 'Completed 1', status: 'completed' })
      await todos.create({ title: 'Pending 2', status: 'pending' })

      const pending = await todos.findByStatus('pending')

      expect(pending).toHaveLength(2)
      expect(pending.every(t => t.status === 'pending')).toBe(true)
    })

    it('should filter todos with multiple criteria', async () => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)

      await todos.create({
        title: 'High Priority Tomorrow',
        priority: 'high',
        status: 'pending',
        dueDate: tomorrow
      })
      await todos.create({
        title: 'Low Priority Tomorrow',
        priority: 'low',
        status: 'pending',
        dueDate: tomorrow
      })
      await todos.create({
        title: 'High Priority No Date',
        priority: 'high',
        status: 'pending'
      })

      const filtered = await todos.findWithFilters({
        status: 'pending',
        priority: 'high'
      })

      expect(filtered).toHaveLength(2)
      expect(filtered.every(t => t.priority === 'high' && t.status === 'pending')).toBe(true)
    })
  })

  describe('Export/Import', () => {
    it('should export and import database', async () => {
      // Create test data
      await todos.create({ title: 'Todo 1', priority: 'high' })
      await todos.create({ title: 'Todo 2', status: 'completed' })

      // Export
      const exported = await exportDatabase()
      expect(exported).toHaveLength(2)

      // Clear and verify empty
      await clearDatabase()
      const afterClear = await todos.findAll()
      expect(afterClear).toHaveLength(0)

      // Import
      await importDatabase(exported)

      // Verify imported data
      const imported = await todos.findAll()
      expect(imported).toHaveLength(2)
      expect(imported.some(t => t.title === 'Todo 1')).toBe(true)
      expect(imported.some(t => t.title === 'Todo 2')).toBe(true)
    })
  })

  describe('Edge Cases', () => {
    it('should handle null descriptions', async () => {
      const created = await todos.create({ title: 'No Description' })

      expect(created.description).toBeNull()
    })

    it('should set completedAt when status changes to completed', async () => {
      const created = await todos.create({ title: 'Test', status: 'pending' })
      expect(created.completedAt).toBeNull()

      const updated = await todos.update(created.id, { status: 'completed' })
      expect(updated?.completedAt).toBeInstanceOf(Date)

      // Changing back to pending should clear completedAt
      const reverted = await todos.update(created.id, { status: 'pending' })
      expect(reverted?.completedAt).toBeNull()
    })

    it('should preserve createdAt on updates', async () => {
      const created = await todos.create({ title: 'Test' })
      const originalCreatedAt = created.createdAt

      await new Promise(resolve => setTimeout(resolve, 10)) // Small delay

      const updated = await todos.update(created.id, { title: 'Updated' })

      expect(updated?.createdAt.getTime()).toBe(originalCreatedAt.getTime())
    })

    it('should generate UUID if not provided', async () => {
      const todo1 = await todos.create({ title: 'Todo 1' })
      const todo2 = await todos.create({ title: 'Todo 2' })

      expect(todo1.id).toBeDefined()
      expect(todo2.id).toBeDefined()
      expect(todo1.id).not.toBe(todo2.id)
    })
  })
})