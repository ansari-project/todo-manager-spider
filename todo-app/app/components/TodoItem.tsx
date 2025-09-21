'use client'

import { useState } from 'react'
import { Todo } from '@/db/schema'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'

interface TodoItemProps {
  todo: Todo
  onUpdate: (id: string, updates: Partial<Todo>) => void
  onDelete: (id: string) => void
}

export function TodoItem({ todo, onUpdate, onDelete }: TodoItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState(todo.title)

  const handleStatusToggle = () => {
    onUpdate(todo.id, {
      status: todo.status === 'completed' ? 'pending' : 'completed',
    })
  }

  const handleSave = () => {
    onUpdate(todo.id, { title })
    setIsEditing(false)
  }

  const priorityColors = {
    low: 'bg-blue-100 text-blue-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-red-100 text-red-800',
  }

  const isOverdue = todo.dueDate && new Date(todo.dueDate) < new Date() && todo.status !== 'completed'

  return (
    <div className={`flex items-center gap-4 p-4 border rounded-lg ${todo.status === 'completed' ? 'opacity-60' : ''}`}>
      <Checkbox
        checked={todo.status === 'completed'}
        onCheckedChange={handleStatusToggle}
      />

      <div className="flex-1">
        {isEditing ? (
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleSave}
            onKeyPress={(e) => e.key === 'Enter' && handleSave()}
            className="w-full px-2 py-1 border rounded"
            autoFocus
          />
        ) : (
          <h3
            className={`font-medium cursor-pointer ${todo.status === 'completed' ? 'line-through' : ''}`}
            onClick={() => setIsEditing(true)}
          >
            {todo.title}
          </h3>
        )}

        {todo.description && (
          <p className="text-sm text-gray-600 mt-1">{todo.description}</p>
        )}

        <div className="flex gap-2 mt-2">
          <Badge className={priorityColors[todo.priority]}>
            {todo.priority}
          </Badge>

          {todo.dueDate && (
            <span className={`text-sm ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
              Due: {format(new Date(todo.dueDate), 'MMM d, yyyy')}
            </span>
          )}
        </div>
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => onDelete(todo.id)}
      >
        Delete
      </Button>
    </div>
  )
}