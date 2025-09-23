// Database types for Todo Manager

export type TodoPriority = 'low' | 'medium' | 'high';
export type TodoStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface Todo {
  id: string;
  title: string;
  description: string | null;
  priority: TodoPriority;
  dueDate: Date | null;
  status: TodoStatus;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
}

export interface NewTodo {
  id?: string;
  title: string;
  description?: string | null;
  priority?: TodoPriority;
  dueDate?: Date | null;
  status?: TodoStatus;
  completedAt?: Date | null;
}

export interface UpdateTodo {
  title?: string;
  description?: string | null;
  priority?: TodoPriority;
  dueDate?: Date | null;
  status?: TodoStatus;
  completedAt?: Date | null;
}