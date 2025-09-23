'use client';

import { useEffect, useState } from 'react';

export function ServiceWorkerProvider({ children }: { children: React.ReactNode }) {
  const [swStatus, setSwStatus] = useState<'unsupported' | 'registering' | 'ready' | 'error'>('registering');
  const [swError, setSwError] = useState<string | null>(null);

  useEffect(() => {
    // Check if Service Workers are supported
    if (!('serviceWorker' in navigator)) {
      setSwStatus('unsupported');
      console.warn('[SW-MCP] Service Workers not supported in this browser');
      return;
    }

    // Register the Service Worker
    async function registerServiceWorker() {
      try {
        console.log('[SW-MCP] Registering Service Worker...');

        const registration = await navigator.serviceWorker.register('/sw-mcp-sqlite.js', {
          scope: '/'
        });

        console.log('[SW-MCP] Service Worker registered successfully:', registration);

        // Handle updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('[SW-MCP] New Service Worker available, reload to update');
                // In production, we might show a notification to the user
              }
            });
          }
        });

        // Wait for the Service Worker to be ready
        await navigator.serviceWorker.ready;
        console.log('[SW-MCP] Service Worker is ready');
        setSwStatus('ready');

      } catch (error) {
        console.error('[SW-MCP] Service Worker registration failed:', error);
        setSwError(error instanceof Error ? error.message : 'Unknown error');
        setSwStatus('error');
      }
    }

    registerServiceWorker();

    // Handle Service Worker controller change
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('[SW-MCP] Service Worker controller changed');
    });

    // Cleanup
    return () => {
      // Service Worker registrations persist, no cleanup needed
    };
  }, []);

  // Optionally show status in development
  if (process.env.NODE_ENV === 'development') {
    if (swStatus === 'unsupported') {
      console.warn('Service Worker MCP not available: Browser does not support Service Workers');
    } else if (swStatus === 'error') {
      console.error('Service Worker MCP error:', swError);
    }
  }

  return (
    <>
      {children}
      {/* Optional: Show Service Worker status banner in demo mode */}
      {swStatus === 'unsupported' && (
        <div className="fixed bottom-4 right-4 bg-yellow-500 text-white px-4 py-2 rounded-lg shadow-lg text-sm">
          ⚠️ Browser doesn't support Service Workers. Some features may be limited.
        </div>
      )}
    </>
  );
}