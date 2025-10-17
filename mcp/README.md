# Knowledger MCP Server

Model Context Protocol (MCP) server for the Knowledger knowledge management system.

## Features

Full knowledge management toolkit with 8 MCP tools:

### Core Operations
- **`list_knowledge`** - List recent knowledge entries
- **`search_knowledge`** - Search entries by query
- **`save_knowledge`** - Create new knowledge entries

### Management Operations  
- **`get_knowledge`** - Get specific entry by ID
- **`add_reference_to_knowledge`** - Add URL references to entries
- **`add_tags_to_knowledge`** - Add tags to existing entries
- **`update_knowledge_title`** - Update entry titles
- **`update_knowledge_content`** - Update/append to entry content

## Usage

### Start the MCP Server
```bash
# From project root
deno task mcp

# Or from mcp directory
deno task start
```

### Development Mode
```bash
# Watch mode with auto-restart
deno task mcp:dev
```

### Configuration

Configure the Knowledger API endpoint in `src/config.ts` or via Warp MCP configuration.

### Warp Integration

Add to your Warp MCP configuration:
```json
{
  "knowledger": {
    "command": "deno",
    "args": ["task", "mcp"],
    "env": {},
    "working_directory": "/path/to/knowledger"
  }
}
```

## Architecture

- **`server.ts`** - Main MCP server with manual request handlers
- **`knowledge-api.ts`** - API client for Knowledger backend
- **`config.ts`** - Configuration management
- **`cli.ts`** - Command-line interface

Uses manual MCP request handlers instead of `registerTool()` to bypass SDK serialization bugs.

## Testing

```bash
# Run all tests
deno task test

# Run API tests only  
deno task test:api
```

# Knowledger MCP Server (Deno)

A Model Context Protocol server for the Knowledger knowledge management system, built with Deno.

## Features

### Core MCP Tools
- **`save_knowledge`** - Create new knowledge entries
- **`search_knowledge`** - Full-text search across knowledge
- **`list_knowledge`** - List recent knowledge entries

### Granular Operations
- **`add_reference`** - Add citations or testimonies to existing knowledge
- **`add_tags`** - Append tags without duplicates
- **`update_content`** - Replace or append content

### Focus Management
- **`set_current_topic`** - Set active knowledge topic for focused conversations
- **`get_current_topic`** - View current topic details
- **`clear_current_topic`** - Clear active topic

### Discovery Tools
- **`list_knowledge_summary`** - Overview of all entries with counts
- **`knowledge_stats`** - Knowledge base statistics and analytics
- **`search_by_tags`** - Find entries by specific tags (AND/OR logic)

### Reference System
Supports both academic citations and testimonial evidence:
- **Citations**: Academic papers, articles, books (DOIs, URLs, ISBNs)
- **Testimonies**: Statements attributed to specific individuals

## Development

### Prerequisites
- [Deno](https://deno.land/) v1.40+
- Access to Knowledger API server

### Setup
```bash
# Clone and navigate to mcp-deno directory
cd knowledger/mcp-deno

# Initialize configuration
deno task cli init

# Test API connection
deno task cli test
```

### Available Tasks
```bash
# Run all tests
deno task test

# Run only API tests (without type checking)
deno task test:api

# Run tests with type checking
deno task test:check

# Start MCP server
deno task server

# Start with file watching
deno task dev

# CLI interface
deno task cli

# Code formatting
deno task fmt

# Linting
deno task lint

# Type checking
deno task check
```

### Testing

The project uses Deno's built-in testing framework with comprehensive test coverage:

- **API Integration Tests** (`src/knowledge-api.test.ts`)
  - Basic operations (list, search, get)
  - Granular operations (add references, tags, update content)
  - Reference types (citations, testimonies)
  - Configuration validation

#### Test Structure
```typescript
Deno.test("Test Group", async (t) => {
  await t.step("should do something", async () => {
    // Test implementation
  });
});
```

#### Running Tests
```bash
# Quick test run (no type checking)
deno task test:api

# Full test suite with type checking  
deno task test:check

# Watch mode for development
deno test --watch --no-check --allow-net --allow-read src/
```

### Configuration

Configuration is managed via `.knowledgerrc` in the user's home directory:

```json
{
  "api_endpoint": "http://localhost:8000/api",
  "default_tags": []
}
```

### Usage with AI Assistants

Configure your AI assistant to use this MCP server:

```json
{
  "mcpServers": {
    "knowledger": {
      "command": "deno",
      "args": ["run", "--allow-read", "--allow-net", "/path/to/knowledger/mcp-deno/src/cli.ts", "server"]
    }
  }
}
```

## Architecture

- **`src/cli.ts`** - Command-line interface and entry point
- **`src/server.ts`** - MCP server implementation with tool handlers
- **`src/knowledge-api.ts`** - HTTP client for Knowledger API
- **`src/config.ts`** - Configuration management
- **`TOOLS.md`** - Detailed tool documentation

## Cognitive Amplification Features

This MCP server enables powerful workflows for knowledge work:

1. **Iterative Knowledge Building** - Start with basic entries, enhance over time
2. **Focused Work Sessions** - Set current topics for contextual AI assistance
3. **Rich Reference Tracking** - Citations and testimonies with proper attribution
4. **Granular Updates** - Modify specific aspects without full rewrites

Perfect for research, writing, investigation, and any knowledge-intensive work where you need to build understanding incrementally while maintaining context and sources.