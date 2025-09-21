'use client'

import { useState, useEffect } from 'react'
import { TodoForm } from './components/TodoForm'
import { TodoList } from './components/TodoList'
import { ConversationalInterface } from './components/ConversationalInterface'
import { Todo } from '@/db/schema'
import { CreateTodoInput } from './lib/validators'

export default function Home() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch todos
  const fetchTodos = async () => {
    try {
      const response = await fetch('/api/todos')
      if (response.ok) {
        const data = await response.json()
        setTodos(data)
      }
    } catch (error) {
      console.error('Error fetching todos:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTodos()
  }, [])

  // Add todo
  const handleAddTodo = async (todo: CreateTodoInput) => {
    try {
      const response = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(todo),
      })

      if (response.ok) {
        const newTodo = await response.json()
        setTodos(prev => [newTodo, ...prev])
      }
    } catch (error) {
      console.error('Error adding todo:', error)
    }
  }

  // Update todo
  const handleUpdateTodo = async (id: string, updates: Partial<Todo>) => {
    // Optimistic update
    setTodos(prev =>
      prev.map(todo =>
        todo.id === id ? { ...todo, ...updates } : todo
      )
    )

    try {
      const response = await fetch(`/api/todos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        // Revert on error
        fetchTodos()
      }
    } catch (error) {
      console.error('Error updating todo:', error)
      fetchTodos()
    }
  }

  // Delete todo
  const handleDeleteTodo = async (id: string) => {
    // Optimistic delete
    setTodos(prev => prev.filter(todo => todo.id !== id))

    try {
      const response = await fetch(`/api/todos/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        // Revert on error
        fetchTodos()
      }
    } catch (error) {
      console.error('Error deleting todo:', error)
      fetchTodos()
    }
  }

  // Handle conversational message
  const handleConversationalMessage = (message: string) => {
    // TODO: Process with MCP/LLM
    console.log('Conversational message:', message)
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="border-b px-6 py-4">
        <h1 className="text-2xl font-bold">Todo Manager</h1>
      </header>

      {/* Main content - split view */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Top 2/3 - Todos */}
        <div className="flex-[2] overflow-y-auto">
          <div className="container mx-auto max-w-4xl p-6">
            <TodoForm onSubmit={handleAddTodo} />

            <div className="mt-6">
              {loading ? (
                <div className="text-center py-8">Loading...</div>
              ) : (
                <TodoList
                  todos={todos}
                  onUpdate={handleUpdateTodo}
                  onDelete={handleDeleteTodo}
                />
              )}
            </div>
          </div>
        </div>

        {/* Bottom 1/3 - Conversational Interface */}
        <div className="flex-1 min-h-[200px] max-h-[400px]">
          <ConversationalInterface onSendMessage={handleConversationalMessage} />
        </div>
      </div>
    </div>
  )
}