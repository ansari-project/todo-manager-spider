"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.todos = void 0;
const sqlite_core_1 = require("drizzle-orm/sqlite-core");
const drizzle_orm_1 = require("drizzle-orm");
exports.todos = (0, sqlite_core_1.sqliteTable)('todos', {
    id: (0, sqlite_core_1.text)('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    title: (0, sqlite_core_1.text)('title', { length: 200 }).notNull(),
    description: (0, sqlite_core_1.text)('description', { length: 1000 }),
    priority: (0, sqlite_core_1.text)('priority', {
        enum: ['low', 'medium', 'high']
    }).notNull().default('medium'),
    dueDate: (0, sqlite_core_1.integer)('due_date', { mode: 'timestamp' }),
    status: (0, sqlite_core_1.text)('status', {
        enum: ['pending', 'in_progress', 'completed', 'cancelled']
    }).notNull().default('pending'),
    createdAt: (0, sqlite_core_1.integer)('created_at', { mode: 'timestamp' })
        .notNull()
        .default((0, drizzle_orm_1.sql) `(unixepoch())`),
    updatedAt: (0, sqlite_core_1.integer)('updated_at', { mode: 'timestamp' })
        .notNull()
        .default((0, drizzle_orm_1.sql) `(unixepoch())`)
        .$onUpdate(() => new Date()),
    completedAt: (0, sqlite_core_1.integer)('completed_at', { mode: 'timestamp' })
}, (table) => ({
    statusIdx: (0, sqlite_core_1.index)('idx_status').on(table.status),
    priorityIdx: (0, sqlite_core_1.index)('idx_priority').on(table.priority),
    dueDateIdx: (0, sqlite_core_1.index)('idx_due_date').on(table.dueDate),
    createdAtIdx: (0, sqlite_core_1.index)('idx_created_at').on(table.createdAt)
}));
