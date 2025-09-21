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
- Natural language input for all CRUD operations
- Examples:
  - "Add a high priority task to review the quarterly report by Friday"
  - "Show me all pending high priority tasks"
  - "Mark the report review as completed"
  - "Change the priority of task 3 to medium"
  - "Delete all completed tasks from last week"
<!-- I also want to be able to say general things like: add emoji to my todos. -->
- Context-aware responses
- Confirmation for destructive operations

### Non-Functional Requirements

#### Performance
- Page load time < 2 seconds
- API response time < 200ms
- File operations optimized with caching
- Debounced auto-save for edits

<!-- I don't care about any of this this. -->

#### Storage
- JSON flat file: `data/todos.json`
- **Atomic writes**: Write to temp file (`todos.json.tmp`) then atomic rename
- **File locking**: Using `proper-lockfile` to prevent concurrent write conflicts
- **In-memory cache**: Server loads file on startup, serves from cache for <200ms responses
<!-- Overkill for now -->
- Backup file maintained: `data/todos.backup.json`
  
<!-- Overkill for now -->
- Maximum file size: 10MB (~10,000 todos)
  
<!-- Overkill -- 500 is more than enough -->

#### User Experience
- Responsive design (mobile, tablet, desktop)
- Keyboard shortcuts for common actions
- Undo/redo for recent operations

<!-- Overkill for now -->
- Toast notifications for user feedback

<!-- overkill for now -->
- Accessibility (WCAG 2.1 AA compliance)
- **State Management**: Zustand for React state management

<!-- overkill for now -->
- **API Protection**: Rate limiting (100 requests/min per IP)
<!-- overkill for now -->

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

### Conversational Interface Commands

#### Supported Operations
1. **Create**: "add", "create", "new", "make"
2. **Read**: "show", "list", "display", "find"
3. **Update**: "change", "modify", "update", "edit"
4. **Delete**: "remove", "delete", "clear"
5. **Complete**: "complete", "finish", "done", "mark as done"
6. **Priority**: "urgent", "important", "high/medium/low priority"
7. **Due dates**: "by [date]", "due [date]", "deadline [date]"

<!-- I don't want you to be so rigid about it. -->

#### Natural Language Processing
- **Phase 1 (MVP)**: Regex/keyword matching for intent and entity extraction
- **Phase 2**: Integration of `compromise.js` for advanced NLP capabilities
- **Date parsing**: Using `date-fns` library for natural language dates
- Intent recognition for CRUD operations
- Entity extraction (title, priority, due date)
- Fuzzy matching for todo identification (Phase 2)
- Context preservation for follow-up commands (Phase 2)

<!-- I don't want you to do all this stuff or to use compromise. I want a full blown llm interface. I want you to use Claude Sonnet and to make the CRUD operations available as a tool. -->

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
- [ ] Basic natural language command processing
- [ ] Responsive design for all screen sizes
- [ ] Error handling with user-friendly messages

### Should Have
<!-- All of these are overkill. Get rid of them.  -->
- [ ] Sorting by multiple criteria
- [ ] Filtering by status, priority, date range
- [ ] Undo/redo functionality
- [ ] Keyboard shortcuts
- [ ] Export/import functionality
- [ ] Basic analytics (completion rate, overdue items)


### Nice to Have
<!-- all of these are overkill -->
- [ ] Dark mode
- [ ] Recurring todos
- [ ] Tags/categories
- [ ] Search functionality
- [ ] Batch operations
- [ ] Voice input for conversational interface

## Out of Scope
<!-- overkill -->
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
- < 2 second initial page load
- < 200ms API response time
- Zero data loss during operations
- 90% natural language command success rate
- Passes accessibility audit (WCAG 2.1 AA)

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| File corruption | High | Atomic writes, backup file, validation |
| Concurrent writes | Medium | File locking, operation queuing |
| Large file size | Medium | Pagination, data archiving |
| NLP accuracy | Medium | Fallback to manual input, confirmation prompts |
| Performance degradation | Low | Caching, indexing, lazy loading |

## Dependencies
- Next.js 14+
- React 18+
- TypeScript 5+
- Node.js 18+
- File system access (Node.js fs module)
- proper-lockfile (for concurrent write protection)
- date-fns (for date parsing)
- Zustand (for state management)
<!-- Overkill -->
- compromise.js (Phase 2 - advanced NLP)
- express-rate-limit (for API protection)
<!-- What are your planning on using for the UI? Can we talk about it? -->

## Testing Strategy
- **Unit Tests**: Jest/Vitest for business logic, file operations, and API handlers
- **Integration Tests**: API endpoint testing for complete request/response cycles
- **Component Tests**: React Testing Library for UI component verification
- **NLP Accuracy**: Golden test set of 50-100 natural language commands
]
<!-- These last two are overkill -->
- **Performance Tests**: Load testing for concurrent operations and large file handling
- **E2E Tests**: Playwright for critical user workflows

## Timeline Estimate
<!-- No timelines -->
- Specification & Planning: 1 day
- Core Implementation: 3-4 days
- Conversational Interface Phase 1: 2 days
- Conversational Interface Phase 2: 2 days (optional enhancement)
- Testing & Refinement: 2 days
- Documentation: 1 day

**Total: 10-12 days**