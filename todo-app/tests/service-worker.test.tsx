/**
 * Tests for Service Worker infrastructure (Phase 1)
 */

import { render, waitFor } from '@testing-library/react';
import { ServiceWorkerProvider } from '../app/components/ServiceWorkerProvider';

// Mock navigator.serviceWorker
const mockServiceWorker = {
  register: jest.fn(),
  ready: Promise.resolve({
    active: { state: 'activated' }
  }),
  addEventListener: jest.fn(),
  controller: null
};

describe('ServiceWorkerProvider', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup navigator.serviceWorker
    Object.defineProperty(navigator, 'serviceWorker', {
      value: mockServiceWorker,
      writable: true
    });
  });

  test('registers service worker on mount', async () => {
    mockServiceWorker.register.mockResolvedValue({
      installing: null,
      waiting: null,
      active: { state: 'activated' },
      addEventListener: jest.fn()
    });

    render(
      <ServiceWorkerProvider>
        <div>Test App</div>
      </ServiceWorkerProvider>
    );

    await waitFor(() => {
      expect(mockServiceWorker.register).toHaveBeenCalledWith(
        '/sw-mcp-sqlite.js',
        { scope: '/' }
      );
    });
  });

  test('handles service worker registration failure', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation();
    mockServiceWorker.register.mockRejectedValue(new Error('Registration failed'));

    render(
      <ServiceWorkerProvider>
        <div>Test App</div>
      </ServiceWorkerProvider>
    );

    await waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith(
        '[SW-MCP] Service Worker registration failed:',
        expect.any(Error)
      );
    });

    consoleError.mockRestore();
  });

  test('shows warning when service workers not supported', () => {
    const consoleWarn = jest.spyOn(console, 'warn').mockImplementation();

    // Remove serviceWorker from navigator
    Object.defineProperty(navigator, 'serviceWorker', {
      value: undefined,
      writable: true
    });

    const { getByText } = render(
      <ServiceWorkerProvider>
        <div>Test App</div>
      </ServiceWorkerProvider>
    );

    expect(consoleWarn).toHaveBeenCalledWith(
      '[SW-MCP] Service Workers not supported in this browser'
    );

    // Should show warning banner
    expect(getByText(/Browser doesn't support Service Workers/)).toBeInTheDocument();

    consoleWarn.mockRestore();
  });

  test('handles service worker updates', async () => {
    const mockRegistration = {
      installing: null,
      waiting: null,
      active: { state: 'activated' },
      addEventListener: jest.fn(),
      updatefound: null
    };

    mockServiceWorker.register.mockResolvedValue(mockRegistration);

    render(
      <ServiceWorkerProvider>
        <div>Test App</div>
      </ServiceWorkerProvider>
    );

    await waitFor(() => {
      expect(mockRegistration.addEventListener).toHaveBeenCalledWith(
        'updatefound',
        expect.any(Function)
      );
    });
  });

  test('listens for controller changes', async () => {
    mockServiceWorker.register.mockResolvedValue({
      installing: null,
      waiting: null,
      active: { state: 'activated' },
      addEventListener: jest.fn()
    });

    render(
      <ServiceWorkerProvider>
        <div>Test App</div>
      </ServiceWorkerProvider>
    );

    await waitFor(() => {
      expect(mockServiceWorker.addEventListener).toHaveBeenCalledWith(
        'controllerchange',
        expect.any(Function)
      );
    });
  });
});