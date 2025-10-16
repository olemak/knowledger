# Knowledger

**Context-aware knowledge management for developers**

Knowledger is an evolving knowledge base that captures insights from your conversations, organizes them by project context, and makes them searchable across your entire development journey.

## The Problem

As developers, we have countless conversations about technical decisions, architecture choices, lessons learned, and brilliant ideas. These insights are scattered across chat histories, lost in old threads, and forgotten when we need them most. We end up rebuilding the same understanding on every new project or team.

## The Solution

Knowledger provides:

- **AI-powered conversation capture** via Model Context Protocol (MCP)
- **Context-aware organization** with project-specific knowledge bases
- **Hierarchical configuration** like git config (`.knowledgerrc` files)
- **Team collaboration** with shared workspaces
- **Cross-project insights** that travel with your career

## Architecture

```
MCP Client ←→ Deno API ←→ Supabase PostgreSQL
```

- **MCP Server**: TypeScript-based client for AI chat integration
- **API**: Deno-powered REST API with edge deployment
- **Database**: Supabase with full-text search and real-time features

## Quick Start

```bash
# Install MCP server
npm install -g knowledger-mcp

# Initialize in your project
knowledger init

# Save knowledge from any AI chat
# (happens automatically via MCP integration)
```

## Repository Structure

- `/mcp/` - MCP server implementation
- `/api/` - Deno API server
- `/shared/` - Shared TypeScript types and schemas
- `/db/` - Database migrations and seeds
- `/docs/` - Documentation and architecture

## Roadmap

See [ROADMAP.md](./ROADMAP.md) for development plans.

## Contributing

We welcome contributions! This project aims to solve a real problem that affects all developers.

## License

MIT - see [LICENSE](./LICENSE)