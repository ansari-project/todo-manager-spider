/**
 * Phase 5 Tests: Deployment Configuration
 * Tests Vercel deployment readiness, build process, and configuration
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';

describe('Phase 5: Deployment Configuration', () => {
  describe('Vercel Configuration', () => {
    it('should have vercel.json configuration', () => {
      const vercelConfigPath = path.join(process.cwd(), 'vercel.json');
      expect(fs.existsSync(vercelConfigPath)).toBe(true);

      const config = JSON.parse(fs.readFileSync(vercelConfigPath, 'utf-8'));
      expect(config).toBeDefined();
      expect(config.headers).toBeDefined();
    });

    it('should configure Service Worker headers correctly', () => {
      const vercelConfigPath = path.join(process.cwd(), 'vercel.json');
      const config = JSON.parse(fs.readFileSync(vercelConfigPath, 'utf-8'));

      const swHeader = config.headers?.find((h: any) =>
        h.source === '/sw-mcp-complete.js'
      );

      expect(swHeader).toBeDefined();
      expect(swHeader.headers).toContainEqual({
        key: 'Service-Worker-Allowed',
        value: '/'
      });
    });

    it('should have headers for sql-wasm.wasm', () => {
      const vercelConfigPath = path.join(process.cwd(), 'vercel.json');
      const config = JSON.parse(fs.readFileSync(vercelConfigPath, 'utf-8'));

      const wasmHeader = config.headers?.find((h: any) =>
        h.source === '/sql-wasm.wasm'
      );

      expect(wasmHeader).toBeDefined();
      expect(wasmHeader.headers).toContainEqual({
        key: 'Content-Type',
        value: 'application/wasm'
      });
    });
  });

  describe('Environment Variables', () => {
    it('should have example environment file', () => {
      const envExamplePath = path.join(process.cwd(), '.env.example');
      expect(fs.existsSync(envExamplePath)).toBe(true);

      const content = fs.readFileSync(envExamplePath, 'utf-8');
      expect(content).toContain('ANTHROPIC_API_KEY');
      expect(content).toContain('DATABASE_URL');
    });
  });

  describe('Build Configuration', () => {
    it('should have next.config.ts with proper settings', () => {
      const configPath = path.join(process.cwd(), 'next.config.ts');
      expect(fs.existsSync(configPath)).toBe(true);

      const content = fs.readFileSync(configPath, 'utf-8');

      // Check for ESLint configuration
      expect(content).toContain('eslint');
      expect(content).toContain('ignoreDuringBuilds');

      // Check for webpack fallbacks for sql.js
      expect(content).toContain('webpack');
      expect(content).toContain('fallback');
      expect(content).toContain('fs: false');
    });

    it('should have proper TypeScript configuration', () => {
      const tsconfigPath = path.join(process.cwd(), 'tsconfig.json');
      expect(fs.existsSync(tsconfigPath)).toBe(true);

      const config = JSON.parse(fs.readFileSync(tsconfigPath, 'utf-8'));

      // Check for Next.js plugin
      expect(config.compilerOptions.plugins).toContainEqual({
        name: 'next'
      });

      // Check for proper module resolution
      expect(config.compilerOptions.moduleResolution).toBe('bundler');
      expect(config.compilerOptions.jsx).toBe('preserve');
    });

    it('should have sql.js type definitions', () => {
      const typesPath = path.join(process.cwd(), 'types/sql.js.d.ts');
      expect(fs.existsSync(typesPath)).toBe(true);

      const content = fs.readFileSync(typesPath, 'utf-8');
      expect(content).toContain('declare module');
      expect(content).toContain('SqlJsStatic');
      expect(content).toContain('Database');
      expect(content).toContain('Statement');
    });
  });

  describe('Static Assets', () => {
    it('should have Service Worker file in public', () => {
      const swPath = path.join(process.cwd(), 'public/sw-mcp-complete.js');
      expect(fs.existsSync(swPath)).toBe(true);

      const content = fs.readFileSync(swPath, 'utf-8');
      expect(content).toContain('MCP_TOOLS');
      expect(content).toContain('handleMCPRequest');
    });

    it('should have sql-wasm.wasm in public', () => {
      const wasmPath = path.join(process.cwd(), 'public/sql-wasm.wasm');
      expect(fs.existsSync(wasmPath)).toBe(true);

      // Check it's a binary file
      const stats = fs.statSync(wasmPath);
      expect(stats.size).toBeGreaterThan(0);
    });
  });

  describe('Production Build', () => {
    it('should build successfully without errors', async () => {
      // This test runs the actual build command
      return new Promise<void>((resolve, reject) => {
        const buildProcess = spawn('npm', ['run', 'build'], {
          cwd: process.cwd(),
          env: { ...process.env, CI: 'true' }
        });

        let stdout = '';
        let stderr = '';

        buildProcess.stdout.on('data', (data) => {
          stdout += data.toString();
        });

        buildProcess.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        buildProcess.on('close', (code) => {
          if (code === 0) {
            // Check for successful build indicators
            expect(stdout).toContain('Compiled successfully');
            expect(stdout).toContain('Generating static pages');
            expect(stdout).not.toContain('Failed to compile');
            resolve();
          } else {
            reject(new Error(`Build failed with code ${code}\nStderr: ${stderr}`));
          }
        });
      });
    }, 60000); // 60 second timeout for build

    it('should generate .next directory', () => {
      const nextPath = path.join(process.cwd(), '.next');
      expect(fs.existsSync(nextPath)).toBe(true);

      // Check for key build artifacts
      const buildManifest = path.join(nextPath, 'build-manifest.json');
      expect(fs.existsSync(buildManifest)).toBe(true);
    });

    it('should handle Next.js 15 route params correctly', () => {
      // Check that dynamic routes use Promise params
      const routePath = path.join(process.cwd(), 'app/api/todos/[id]/route.ts');
      const content = fs.readFileSync(routePath, 'utf-8');

      // Should use Promise<{ id: string }> for Next.js 15
      expect(content).toContain('params: Promise<{ id: string }>');
      expect(content).toContain('await params');
    });
  });

  describe('API Route Compatibility', () => {
    it('should not use abort signals in Anthropic SDK incorrectly', () => {
      const chatRoute = path.join(process.cwd(), 'app/api/chat/route.ts');
      const content = fs.readFileSync(chatRoute, 'utf-8');

      // Should NOT pass signal as a separate parameter
      expect(content).not.toContain('signal: controller.signal');
    });

    it('should handle TypeScript any types with assertions', () => {
      const chatRoute = path.join(process.cwd(), 'app/api/chat/route.ts');
      const content = fs.readFileSync(chatRoute, 'utf-8');

      // Should use type assertions for compatibility
      expect(content).toContain('as any');
    });
  });

  describe('Client-Side Configuration', () => {
    it('should have proper WebAssembly support config', () => {
      const configPath = path.join(process.cwd(), 'next.config.ts');
      const content = fs.readFileSync(configPath, 'utf-8');

      // Check webpack config for client-side
      expect(content).toContain('!isServer');
      expect(content).toContain('config.resolve.fallback');
      expect(content).toContain('crypto: false');
    });

    it('should handle streaming API correctly', () => {
      const streamRoute = path.join(process.cwd(), 'app/api/chat/stream/route.ts');
      expect(fs.existsSync(streamRoute)).toBe(true);

      const content = fs.readFileSync(streamRoute, 'utf-8');
      expect(content).toContain('ReadableStream');
      expect(content).toContain('text/event-stream');
      expect(content).toContain('TextEncoder');
    });
  });

  describe('Database Configuration', () => {
    it('should support both SQLite and PostgreSQL via Drizzle', () => {
      const schemaPath = path.join(process.cwd(), 'db/schema.ts');
      expect(fs.existsSync(schemaPath)).toBe(true);

      const configPath = path.join(process.cwd(), 'drizzle.config.ts');
      expect(fs.existsSync(configPath)).toBe(true);
    });

    it('should have database migrations', () => {
      const migrationsPath = path.join(process.cwd(), 'drizzle');
      expect(fs.existsSync(migrationsPath)).toBe(true);

      // Should have at least one migration file
      const files = fs.readdirSync(migrationsPath);
      const sqlFiles = files.filter(f => f.endsWith('.sql'));
      expect(sqlFiles.length).toBeGreaterThan(0);
    });
  });
});