# Knowledger Architecture

## System Overview

Knowledger is designed as a distributed system with clear separation of concerns:

```
┌─────────────┐    ┌──────────────┐    ┌─────────────────┐
│   AI Chat   │◄──►│ MCP Server   │◄──►│   Deno API      │
│   (Claude,  │    │ (TypeScript) │    │   (TypeScript)  │
│    GPT, etc)│    │              │    │                 │
└─────────────┘    └──────────────┘    └─────────────────┘
                                                │
                                                ▼
                                       ┌─────────────────┐
                                       │   Supabase      │
                                       │   PostgreSQL    │
                                       │   + Auth        │
                                       │   + Real-time   │
                                       └─────────────────┘
```

## Components

### MCP Server (`/mcp/`)

**Purpose**: Bridge between AI chats and knowledge storage

**Technologies**: TypeScript, Node.js/Deno

**Responsibilities**:
- Implement Model Context Protocol interface
- Parse conversation context and extract knowledge
- Handle configuration hierarchy (`.knowledgerrc` lookup)
- Authenticate with API server
- Provide MCP functions: `save_knowledge`, `search_knowledge`, etc.

**Key Files**:
- `src/server.ts` - MCP server implementation
- `src/config.ts` - Configuration management
- `src/client.ts` - API client wrapper

### API Server (`/api/`)

**Purpose**: Core business logic and data persistence

**Technologies**: Deno, TypeScript, Supabase Client

**Responsibilities**:
- REST API for knowledge CRUD operations
- User authentication and authorization
- Project and workspace management
- Full-text search implementation
- Real-time subscriptions for team features

**Key Endpoints**:
```
POST   /api/knowledge              # Create knowledge entry
GET    /api/knowledge              # Search/list entries
GET    /api/knowledge/:id          # Get specific entry
PUT    /api/knowledge/:id          # Update entry
DELETE /api/knowledge/:id          # Delete entry
POST   /api/knowledge/:id/link     # Link to other entries

GET    /api/projects               # List user projects
POST   /api/projects               # Create project
GET    /api/projects/:id/knowledge # Project-specific knowledge

GET    /api/search?q=...           # Full-text search
```

**Key Files**:
- `main.ts` - Deno server setup
- `routes/` - API route handlers
- `services/` - Business logic
- `types/` - TypeScript interfaces

### Shared Types (`/shared/`)

**Purpose**: Common interfaces and schemas

**Technologies**: TypeScript

**Contents**:
- Data models (Knowledge, Project, User)
- API request/response types
- Configuration schemas
- Validation helpers

### Database (`/db/`)

**Purpose**: Schema management and migrations

**Technologies**: SQL, Supabase CLI

**Contents**:
- Migration files
- Seed data
- Database functions (full-text search, etc.)

## Data Models

### Core Entities

```typescript
interface Knowledge {
  id: string;
  title: string;
  content: string;
  tags: string[];
  project_id?: string;
  user_id: string;
  workspace_id?: string;
  created_at: Date;
  updated_at: Date;
  metadata?: Record<string, any>;
}

interface Project {
  id: string;
  name: string;
  description?: string;
  user_id: string;
  workspace_id?: string;
  config: ProjectConfig;
  created_at: Date;
}

interface Workspace {
  id: string;
  name: string;
  owner_id: string;
  members: WorkspaceMember[];
  settings: WorkspaceSettings;
  created_at: Date;
}
```

## Configuration System

Knowledger uses hierarchical configuration similar to git:

```
/home/user/.knowledgerrc          # Global config
/projects/myapp/.knowledgerrc     # Project config  
/projects/myapp/api/.knowledgerrc # Subproject config
```

**Configuration precedence** (highest to lowest):
1. Current directory `.knowledgerrc`
2. Parent directory configs (recursive search)
3. Home directory `~/.knowledgerrc`
4. System defaults

**Configuration format**:
```json
{
  "api_endpoint": "https://api.knowledger.net",
  "user_token": "...",
  "default_project": "myapp",
  "default_tags": ["learning", "architecture"],
  "workspace": "team-alpha"
}
```

## Authentication & Authorization

### Personal Use
- User accounts via Supabase Auth
- API tokens for MCP server authentication
- Local config stores encrypted tokens

### Team/Workspace Use
- Workspace-based multi-tenancy
- Role-based access control (owner/admin/member/read-only)
- Shared knowledge with visibility controls

## Search Architecture

### Phase 1: PostgreSQL Full-Text Search
```sql
-- Full-text search index
CREATE INDEX knowledge_fts_idx ON knowledge 
USING gin(to_tsvector('english', title || ' ' || content));

-- Search query
SELECT * FROM knowledge 
WHERE to_tsvector('english', title || ' ' || content) 
      @@ plainto_tsquery('english', ?);
```

### Phase 2: Enhanced Search (Future)
- Semantic search with embeddings
- Vector similarity via pgvector
- Hybrid search (keyword + semantic)

## Real-time Features

Using Supabase real-time subscriptions for:
- Live knowledge updates in shared workspaces
- Collaboration notifications
- Activity feeds

## Deployment Architecture

### Development
- Local Deno development server
- Local Supabase instance (optional)
- MCP server runs locally

### Production
- **API**: Deno Deploy (edge deployment)
- **Database**: Supabase cloud
- **MCP**: Distributed via npm package
- **Static assets**: Deno Deploy or CDN

## Security Considerations

### Data Protection
- All API communication over HTTPS
- API tokens with limited scope and expiration
- Row Level Security (RLS) in Supabase
- Encrypted sensitive data at rest

### Privacy
- User data isolated by workspace
- Configurable data retention policies
- GDPR compliance features (export/delete)

## Performance Considerations

### Database
- Indexes on frequently queried fields
- Connection pooling via Supabase
- Query optimization for search operations

### API
- Response caching for read operations
- Pagination for large result sets
- Rate limiting to prevent abuse

### MCP
- Async operations to avoid blocking AI chats
- Batch operations for multiple knowledge entries
- Local caching of frequently accessed data

## Monitoring & Observability

- Application metrics via Deno Deploy
- Database monitoring via Supabase dashboard
- Error tracking and logging
- Performance monitoring for search operations

## Scalability Plan

### Phase 1: Single-tenant optimization
- Optimize for individual user performance
- Efficient search and retrieval

### Phase 2: Multi-tenant architecture
- Workspace isolation
- Team collaboration features
- Shared infrastructure

### Phase 3: Enterprise scale
- Read replicas for search performance
- Microservice decomposition if needed
- Custom search infrastructure (OpenSearch/etc)