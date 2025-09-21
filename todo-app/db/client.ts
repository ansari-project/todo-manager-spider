import { drizzle } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
import * as schema from './schema'

const globalForDb = globalThis as unknown as {
  db: ReturnType<typeof drizzle> | undefined
}

// Remove 'sqlite:' prefix if present
const dbUrl = (process.env.DATABASE_URL || 'todos.db').replace(/^sqlite:/, '')
const sqlite = new Database(dbUrl)

export const db = globalForDb.db ?? drizzle(sqlite, { schema })

if (process.env.NODE_ENV !== 'production') globalForDb.db = db