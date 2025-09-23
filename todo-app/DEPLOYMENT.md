# Deployment Guide for Todo Manager with Service Worker MCP

## Overview

This application demonstrates the SPIDER protocol with an innovative Service Worker-based MCP implementation. It runs entirely client-side with SQLite in the browser.

## Architecture

- **Service Worker MCP**: Intercepts `/api/mcp/*` requests and handles them locally
- **Client-Side SQLite**: Uses sql.js (WebAssembly) for full SQL database in browser
- **IndexedDB Persistence**: Stores SQLite database between sessions
- **No Backend Required**: All functionality runs in the browser

## Deployment to Vercel

### Prerequisites

1. Vercel account (https://vercel.com)
2. Vercel CLI (optional): `npm i -g vercel`

### Deployment Steps

#### Option 1: Via Vercel CLI

```bash
# In the todo-app directory
vercel

# Follow prompts:
# - Set up and deploy
# - Link to existing project or create new
# - Accept default settings
```

#### Option 2: Via GitHub Integration

1. Push code to GitHub repository
2. Import project in Vercel Dashboard
3. Select the `todo-app` directory as root
4. Deploy with default Next.js settings

#### Option 3: Manual Deployment

1. Build the project:
```bash
npm run build
```

2. Deploy the `.next` folder to Vercel

### Environment Variables

No environment variables required for the demo. The app runs entirely client-side.

Optional:
- `ANTHROPIC_API_KEY`: For chat interface (if implementing server-side chat)

## Important Considerations

### Browser Requirements

- Service Workers: 92% browser support
- WebAssembly: 96% browser support
- IndexedDB: 97% browser support

The app will show a warning banner if Service Workers are not supported.

### CORS Headers

The `vercel.json` configuration includes necessary headers:
- `Cross-Origin-Embedder-Policy`: For SharedArrayBuffer support
- `Cross-Origin-Opener-Policy`: For security isolation
- `Service-Worker-Allowed`: To allow Service Worker scope

### Data Persistence

- Data is stored in the user's browser (IndexedDB)
- Each user has their own isolated database
- Data persists across sessions but is cleared if browser data is cleared

### Security

- All data remains client-side
- No server communication for todo operations
- MCP protocol runs entirely in Service Worker
- SQL injection prevented via parameterized queries

## Testing the Deployment

1. Visit the deployed URL
2. Check browser console for:
   - `[SW-MCP] Service Worker registered successfully`
   - `[SW-MCP] Service Worker is ready`
3. Use the MCP Demo component (bottom-left in dev mode) to test:
   - List MCP Tools
   - Create Test Todo
   - List All Todos

## Troubleshooting

### Service Worker Not Registering

- Ensure HTTPS (Vercel provides this automatically)
- Check browser DevTools > Application > Service Workers
- Clear browser cache and reload

### Database Not Persisting

- Check IndexedDB in DevTools > Application > Storage
- Ensure browser allows IndexedDB for the domain
- Check browser privacy settings

### Build Errors

If you encounter `Module not found: fs` errors:
1. Ensure sql.js is only imported client-side (with dynamic imports)
2. Check that webpack fallbacks are configured in `next.config.ts`
3. Verify WASM files are in public directory

## Demo Features

### Available MCP Tools

- `todo.list`: List todos with optional filtering
- `todo.create`: Create a new todo
- `todo.update`: Update an existing todo
- `todo.delete`: Delete a todo
- `todo.complete`: Mark a todo as completed

### Test Components (Development Mode)

- **MCP Demo**: Direct Service Worker communication test
- **SQLite Test**: Database initialization and persistence test
- **MCP Test**: Server-side MCP test (if backend configured)

## Production Considerations

This is a DEMO application showcasing the SPIDER protocol. For production:

1. Add authentication/authorization if needed
2. Implement data sync/backup strategies
3. Add error reporting and analytics
4. Consider Progressive Web App features
5. Implement offline-first strategies
6. Add data migration capabilities

## Innovation Highlights

1. **Service Worker as MCP Server**: First implementation of MCP protocol in Service Worker
2. **Client-Side SQLite**: Full SQL database running in browser
3. **No Backend Required**: Complete todo management without server
4. **Protocol Compliance**: Full JSON-RPC 2.0 and MCP protocol support
5. **SPIDER Protocol Demo**: Showcases structured development methodology