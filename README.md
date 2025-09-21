# Todo Manager with Conversational Interface

A modern todo management application built with Next.js 14 and featuring both traditional UI and LLM-powered conversational interface using Claude.

## Features

### Core Functionality
- ✅ Create, read, update, and delete todos
- ✅ Priority levels (low, medium, high) with color coding
- ✅ Status tracking (pending, in_progress, completed, cancelled)
- ✅ Due date management with overdue highlighting
- ✅ Split-view interface: todos list (top 2/3) and chat (bottom 1/3)

### Conversational Interface
- ✅ Natural language todo management powered by Claude Sonnet
- ✅ MCP (Model Context Protocol) tools for structured LLM interactions
- ✅ Loading states and error handling
- ✅ Automatic UI refresh after chat actions

### Technical Features
- ✅ Type-safe database operations with Drizzle ORM
- ✅ SQLite for local development
- ✅ PostgreSQL schema ready (deployment pending)
- ✅ Comprehensive test coverage (24 tests)
- ✅ Zod validation for API inputs

## Tech Stack

- **Frontend**: Next.js 14+ with App Router, React, TypeScript
- **UI Components**: shadcn/ui (Radix UI + Tailwind CSS)
- **Database**: SQLite (development) / PostgreSQL (production ready)
- **ORM**: Drizzle ORM
- **LLM Integration**: Claude Sonnet 3.5 via Anthropic API
- **Protocol**: MCP (Model Context Protocol) for tool definitions
- **Testing**: Vitest

## Setup Instructions

### Prerequisites
- Node.js 18+
- npm or yarn
- Anthropic API key (for conversational interface)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd todo-manager-spider
```

2. Install dependencies:
```bash
cd todo-app
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
# Edit .env.local and add your ANTHROPIC_API_KEY
```

4. Initialize the database:
```bash
npm run db:push
```

### Running the Application

1. Start the MCP server (required for conversational interface):
```bash
# In one terminal
cd todo-app/mcp
npm run build
node dist/index.js
```

2. Start the Next.js development server:
```bash
# In another terminal
cd todo-app
npm run dev
```

3. Open your browser to `http://localhost:3000`

### Running Tests

```bash
npm run test
```

## Usage

### Traditional UI
- **Add Todo**: Click "Add Todo" button and fill the form
- **Edit**: Click on any todo title to edit inline
- **Complete**: Click the checkmark button
- **Delete**: Click the trash button
- **Filter**: Use the status dropdown to filter todos

### Conversational Interface
Type natural language commands in the chat input:
- "Add a todo to buy groceries tomorrow"
- "Show me my high priority tasks"
- "Mark the grocery shopping as complete"
- "Delete all completed todos"
- "Update the meeting todo to high priority"

## Project Structure

```
todo-app/
├── app/                    # Next.js app router
│   ├── api/               # API routes
│   │   ├── todos/         # CRUD endpoints
│   │   └── chat/          # Claude integration
│   ├── components/        # React components
│   └── page.tsx           # Main page
├── db/                    # Database layer
│   ├── schema.ts          # Drizzle schema
│   └── client.ts          # Database connection
├── mcp/                   # MCP server
│   └── server.ts          # Tool definitions
└── tests/                 # Test suites
```

## Development Notes

### Database Schema

The application uses a simple but comprehensive todo schema:

```typescript
{
  id: string (UUID)
  title: string (required)
  description: string (optional)
  priority: 'low' | 'medium' | 'high'
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  dueDate: Date (optional)
  createdAt: Date
  updatedAt: Date
  completedAt: Date (optional)
}
```

### MCP Tools Available

The MCP server provides these tools for the LLM:
- `list_todos` - List and filter todos
- `create_todo` - Create new todos
- `update_todo` - Update existing todos
- `delete_todo` - Delete todos
- `get_todo` - Get a specific todo by ID

## Known Limitations

1. **No Pagination**: Currently loads all todos at once
2. **No Authentication**: Single-user application
3. **No Rate Limiting**: API endpoints unrestricted
4. **Manual MCP Startup**: Requires separate process
5. **No Confirmation Dialogs**: Destructive operations immediate

## Deployment Considerations

### For Vercel/Serverless
- PostgreSQL required (SQLite not supported)
- Update `db/client.ts` to use PostgreSQL connection
- Set `DATABASE_URL` environment variable

### For Railway/VPS
- Both SQLite and PostgreSQL supported
- Persistent volumes available for SQLite
- MCP server can run as separate process

## Contributing

This project follows the SPIDER protocol methodology. See `/codev/protocols/spider/protocol.md` for development guidelines.

## License

MIT