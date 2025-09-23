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
        h.source === '/sw-mcp-indexeddb.js'
      );

      expect(swHeader).toBeDefined();
      expect(swHeader.headers).toContainEqual({
        key: 'Service-Worker-Allowed',
        value: '/'
      });
    });

    // Removed - no longer using sql-wasm with IndexedDB implementation
  });

  describe('Environment Variables', () => {
    it('should have example environment file', () => {
      const envExamplePath = path.join(process.cwd(), '.env.example');
      expect(fs.existsSync(envExamplePath)).toBe(true);

      const content = fs.readFileSync(envExamplePath, 'utf-8');
      expect(content).toContain('ANTHROPIC_API_KEY');
      // DATABASE_URL is optional - not required for IndexedDB
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

      // No longer need webpack fallbacks for IndexedDB implementation
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

    // Removed - no longer using sql.js with IndexedDB implementation
  });

  describe('Static Assets', () => {
    it('should have Service Worker file in public', () => {
      const swPath = path.join(process.cwd(), 'public/sw-mcp-indexeddb.js');
      expect(fs.existsSync(swPath)).toBe(true);

      const content = fs.readFileSync(swPath, 'utf-8');
      expect(content).toContain('tools/list');
      expect(content).toContain('handleMCPRequest');
      expect(content).toContain('IndexedDB');
    });

    // Removed - no longer using sql-wasm with IndexedDB implementation
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
    // Removed WebAssembly config test - no longer needed with IndexedDB

    it('should handle streaming API correctly', () => {
      const streamRoute = path.join(process.cwd(), 'app/api/chat/stream/route.ts');
      expect(fs.existsSync(streamRoute)).toBe(true);

      const content = fs.readFileSync(streamRoute, 'utf-8');
      expect(content).toContain('ReadableStream');
      expect(content).toContain('text/event-stream');
      expect(content).toContain('TextEncoder');
    });
  });

  describe('IndexedDB Configuration', () => {
    it('should use IndexedDB for client-side storage', () => {
      const swPath = path.join(process.cwd(), 'public/sw-mcp-indexeddb.js');
      const content = fs.readFileSync(swPath, 'utf-8');

      // Check for IndexedDB usage
      expect(content).toContain('indexedDB.open');
      expect(content).toContain('todo-manager');
      expect(content).toContain('objectStore');
    });

    it('should have storage client for IndexedDB', () => {
      const storagePath = path.join(process.cwd(), 'app/lib/storage-client.ts');
      expect(fs.existsSync(storagePath)).toBe(true);

      const content = fs.readFileSync(storagePath, 'utf-8');
      expect(content).toContain('IndexedDB');
      expect(content).toContain('todo-manager');
    });
  });
});