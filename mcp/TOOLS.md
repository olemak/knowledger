# Knowledger MCP Tools

The Knowledger MCP server provides the following tools for AI assistants to manage knowledge:

## Core Tools

### `save_knowledge`
Create a new knowledge entry with content, tags, project association, metadata, and references.

**Parameters:**
- `title` (required): Title for the knowledge entry
- `content` (required): Main content of the knowledge entry  
- `tags` (optional): Array of tags for categorization
- `project` (optional): Project to associate with
- `metadata` (optional): Additional metadata
- `refs` (optional): Array of references (citations/testimonies)

### `search_knowledge`
Search existing knowledge entries using full-text search.

**Parameters:**
- `query` (required): Search query text
- `tags` (optional): Filter by specific tags
- `project` (optional): Filter by project name
- `limit` (optional): Maximum number of results (default: 10)

### `list_knowledge`
List recent knowledge entries.

**Parameters:**
- `limit` (optional): Maximum number of entries (default: 10)
- `project` (optional): Filter by project name

## Granular Update Tools

### `add_reference`
Add a reference (citation or testimony) to an existing knowledge entry without updating the entire object.

**Parameters:**
- `knowledge_id` (required): ID of the knowledge entry to update
- `reference` (required): Reference object with:
  - `uri` (required): URI/URL of the reference
  - `title` (required): Title of the reference
  - `type` (required): "citation" or "testimony"
  - `attributed_to` (optional): Person/entity attributed to (for testimonies)
  - `statement` (optional): Quote or finding from the reference

### `add_tags`
Add tags to an existing knowledge entry (duplicates are automatically ignored).

**Parameters:**
- `knowledge_id` (required): ID of the knowledge entry to update
- `tags` (required): Array of tags to add

### `update_content`
Update the content of an existing knowledge entry.

**Parameters:**
- `knowledge_id` (required): ID of the knowledge entry to update
- `content` (required): New content for the knowledge entry
- `append` (optional): Whether to append to existing content (default: false - replace)

## Focus Management Tools

### `set_current_topic`
Set a knowledge entry as the current active topic for focused discussion.

**Parameters:**
- `knowledge_id` (required): ID of the knowledge entry to set as current topic

**Effect:** The AI assistant will prefix relevant responses with "💡CURRENT TOPIC: [Title]" to maintain context.

### `get_current_topic`
Get the current active topic information with full details.

**Parameters:** None

### `clear_current_topic`
Clear the current active topic and stop prefixing responses.

**Parameters:** None

## Discovery Tools

### `list_knowledge_summary`
Get a summary overview of knowledge entries with titles, tag counts, and reference counts.

**Parameters:**
- `limit` (optional): Maximum number of entries to show (default: 10)

### `knowledge_stats`
Get comprehensive statistics about the knowledge base.

**Parameters:** None

**Returns:** Total entries, unique tags, references, averages, and top tags

### `search_by_tags`
Find knowledge entries containing specific tags.

**Parameters:**
- `tags` (required): Array of tags to search for
- `match_all` (optional): Whether to match ALL tags (AND) or ANY tags (OR). Default: false (OR)

## Integration Tools

### `create_github_issue`
Create a GitHub issue and optionally link it as a reference to a knowledge entry.

**Parameters:**
- `title` (required): Title of the GitHub issue
- `body` (required): Body content of the GitHub issue
- `knowledge_id` (optional): Knowledge entry ID to add the issue as a reference
- `labels` (optional): Array of labels to add to the issue

**Benefits:** Eliminates shell command issues, provides automatic reference linking, and standardized error handling.

## Reference Types

### Citation
Academic or authoritative sources:
```json
{
  "uri": "https://arxiv.org/abs/2023.12345",
  "title": "A Survey of AI Alignment Techniques",
  "type": "citation"
}
```

### Testimony
Statements attributed to someone:
```json
{
  "uri": "testimony://ai-hearing-2024",
  "title": "AI poses significant alignment challenges",
  "attributed_to": "Dr. Emily Johnson",
  "type": "testimony",
  "statement": "Without proper alignment research, advanced AI systems could pursue goals misaligned with human values."
}
```

## Usage Examples

### Iterative Knowledge Building
1. Start with `save_knowledge` to create a basic entry
2. Use `add_reference` to add supporting citations as you find them
3. Use `add_tags` to refine categorization over time
4. Use `update_content` with `append: true` to add new insights

This granular approach enables natural, iterative knowledge building where you don't need to reconstruct the entire knowledge object just to add a reference or tag.

### Focused Work Sessions
1. Use `set_current_topic` to focus on a specific knowledge area
2. AI responses will include "💡CURRENT TOPIC: [Title]" context
3. Add references, update content, or ask questions related to the current topic
4. Use `get_current_topic` to view full details anytime
5. Use `clear_current_topic` when switching focus

This enables deep, contextual work sessions where the AI maintains awareness of your current focus area.
