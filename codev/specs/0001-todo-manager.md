# Specification: Todo Manager Application

## Overview
A modern web-based Todo Manager application with both traditional UI and conversational interface, built using Next.js 14+ with flat file storage.

## Core Requirements

### Technical Stack
- **Frontend Framework**: Next.js 14+ (App Router)
- **UI Components**: React with TypeScript
- **Storage**: Flat file (JSON) for todo persistence
- **API**: Next.js API routes for backend operations
- **Conversational Interface**: Natural language processing for CRUD operations

### Data Model
```typescript
interface Todo {
  id: string;                    // UUID
  title: string;                  // Required, max 200 chars
  description?: string;           // Optional, max 1000 chars
  priority: 'low' | 'medium' | 'high';
  dueDate?: string;              // ISO 8601 format
  status: 'pending' | 'completed';
  createdAt: string;             // ISO 8601 format
  updatedAt: string;             // ISO 8601 format
  completedAt?: string;          // ISO 8601 format
}
```

### Functional Requirements

#### 1. Todo CRUD Operations
- **Create**: Add new todos with title, optional description, priority, and due date
- **Read**: List all todos with filtering and sorting capabilities
- **Update**: Modify any todo field
- **Delete**: Remove todos with confirmation
- **Complete/Uncomplete**: Toggle todo status

#### 2. User Interfaces

##### Traditional UI
- Checkbox list view with inline editing
- Priority indicators (visual color coding)
- Due date display with overdue highlighting
- Quick actions (complete, edit, delete)
- Sorting by priority, due date, status, creation date
- Filtering by status, priority, date range

##### Conversational Interface
- **LLM-powered** natural language interface using Claude Sonnet
- CRUD operations exposed as tools to the LLM
- Flexible command interpretation (not rigid patterns)
- Examples:
  - "Add a high priority task to review the quarterly report by Friday"
  - "Show me all pending high priority tasks"
  - "Mark the report review as completed"
  - "Add emoji to my todos"
  - "Make all my tasks sound more fun"
- Context-aware responses
- Confirmation for destructive operations

### Non-Functional Requirements

#### Performance
- Reasonable response times
- Simple caching where needed

#### Storage
- JSON flat file: `data/todos.json`
- Simple file read/write operations
- Maximum ~500 todos

#### User Experience
- Responsive design (mobile, tablet, desktop)
- Clean, simple UI
- **State Management**: Zustand for React state management

### API Endpoints
```
POST   /api/todos          - Create new todo
GET    /api/todos          - List todos (with query filters)
GET    /api/todos/:id      - Get single todo
PUT    /api/todos/:id      - Update todo
DELETE /api/todos/:id      - Delete todo
POST   /api/todos/:id/toggle - Toggle completion status

POST   /api/conversation   - Process natural language command
```

### Conversational Interface

#### LLM Integration
- **Claude Sonnet** for natural language understanding
- CRUD operations exposed as tools/functions
- Flexible interpretation - no rigid command patterns
- Natural conversation flow with context awareness
- The LLM can:
  - Understand varied phrasings and intentions
  - Handle bulk operations
  - Provide helpful suggestions
  - Add creative elements (like emojis) when requested

## User Stories

1. **As a user**, I want to quickly add todos using natural language so I don't have to fill out forms
2. **As a user**, I want to see all my todos in a traditional list view for quick overview
3. **As a user**, I want to prioritize my todos to focus on what's important
4. **As a user**, I want to set due dates to manage deadlines
5. **As a user**, I want to use conversational commands to manage todos hands-free
6. **As a user**, I want my todos to persist between sessions
7. **As a user**, I want to filter and sort todos to find what I need quickly

## Acceptance Criteria

### Must Have
- [ ] All CRUD operations work via both UI and conversational interface
- [ ] Todos persist to flat file storage
- [ ] Priority levels with visual indicators
- [ ] Due date support with overdue highlighting
- [ ] Status toggling (pending/completed)
- [ ] LLM-powered conversational interface using Claude
- [ ] Responsive design for all screen sizes
- [ ] Error handling with user-friendly messages


## Out of Scope
- User authentication/multi-user support
- Cloud synchronization
- Mobile native apps
- Email/calendar integration
- Attachments/file uploads
- Collaboration features
- Database storage (only flat file)

## Technical Constraints
- Must use Next.js 14+ with App Router
- Must use TypeScript for type safety
- Must store data in JSON flat file
- No external database dependencies
- Minimal external API dependencies

## Success Metrics
- All CRUD operations functional in both interfaces
- Natural language interface works smoothly with Claude
- Data persists correctly to flat file
- Clean, usable UI

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| File corruption | Low | Simple validation on read/write |
| LLM API failures | Medium | Fallback to manual input |

## Dependencies
- Next.js 14+
- React 18+
- TypeScript 5+
- Node.js 18+
- File system access (Node.js fs module)
- date-fns (for date parsing)
- Zustand (for state management)
- Anthropic SDK (for Claude Sonnet integration)

## UI Framework Options
**Need to discuss:** What would you prefer for the UI?
- **Option 1: Tailwind CSS** - Utility-first, highly customizable
- **Option 2: shadcn/ui** - Beautiful components built on Radix + Tailwind
- **Option 3: Material-UI (MUI)** - Full component library
- **Option 4: Plain CSS/modules** - Simple, no dependencies

## Testing Strategy
- **Unit Tests**: Basic tests for core functionality
- **Integration Tests**: API endpoint testing
- **Manual Testing**: UI and conversational interface testing

