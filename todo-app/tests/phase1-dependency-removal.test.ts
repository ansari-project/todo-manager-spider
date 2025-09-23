/**
 * Phase 1 Tests: Verify SQL dependency removal
 * SPIDER Protocol - Defend phase for dependency removal
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

describe('Phase 1: SQL Dependency Removal', () => {
  it('should not have Drizzle ORM in package.json', () => {
    const packageJson = JSON.parse(
      readFileSync(join(process.cwd(), 'package.json'), 'utf-8')
    )

    // Check dependencies
    expect(packageJson.dependencies).toBeDefined()
    expect(packageJson.dependencies['drizzle-orm']).toBeUndefined()

    // Check devDependencies
    expect(packageJson.devDependencies).toBeDefined()
    expect(packageJson.devDependencies['drizzle-kit']).toBeUndefined()
  })

  it('should not have SQLite dependencies in package.json', () => {
    const packageJson = JSON.parse(
      readFileSync(join(process.cwd(), 'package.json'), 'utf-8')
    )

    expect(packageJson.dependencies['better-sqlite3']).toBeUndefined()
    expect(packageJson.devDependencies['@types/better-sqlite3']).toBeUndefined()
  })

  it('should not have sql.js dependency', () => {
    const packageJson = JSON.parse(
      readFileSync(join(process.cwd(), 'package.json'), 'utf-8')
    )

    // sql.js has been removed completely
    expect(packageJson.dependencies['sql.js']).toBeUndefined()
  })

  it('should not have database scripts in package.json', () => {
    const packageJson = JSON.parse(
      readFileSync(join(process.cwd(), 'package.json'), 'utf-8')
    )

    const scripts = packageJson.scripts
    expect(scripts['db:generate']).toBeUndefined()
    expect(scripts['db:migrate']).toBeUndefined()
    expect(scripts['db:studio']).toBeUndefined()
  })

  it('should have reduced total dependency count', () => {
    const packageJson = JSON.parse(
      readFileSync(join(process.cwd(), 'package.json'), 'utf-8')
    )

    const depCount = Object.keys(packageJson.dependencies || {}).length
    const devDepCount = Object.keys(packageJson.devDependencies || {}).length
    const totalDeps = depCount + devDepCount

    // Should have fewer than 50 total dependencies after cleanup (Next.js has many deps)
    expect(totalDeps).toBeLessThan(50)
  })
})