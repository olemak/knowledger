#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  CallToolResult,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { KnowledgeAPI } from './knowledge-api.js';
import { ConfigManager } from './config.js';

/**
 * Knowledger MCP Server
 * 
 * Provides AI chat integration for knowledge management:
 * - save_knowledge: Save knowledge entries from conversations
 * - search_knowledge: Search existing knowledge entries
 * - list_knowledge: List recent knowledge entries
 */
class KnowledgerServer {
  private server: Server;
  private knowledgeAPI: KnowledgeAPI;
  private configManager: ConfigManager;

  constructor() {
    this.server = new Server(
      {
        name: 'knowledger',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.configManager = new ConfigManager();
    this.knowledgeAPI = new KnowledgeAPI(this.configManager);

    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  private setupToolHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'save_knowledge',
            description: 'Save a knowledge entry from the current conversation',
            inputSchema: {
              type: 'object',
              properties: {
                title: {
                  type: 'string',
                  description: 'Title for the knowledge entry'
                },
                content: {
                  type: 'string', 
                  description: 'Main content of the knowledge entry'
                },
                tags: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Optional tags for categorization'
                },
                project: {
                  type: 'string',
                  description: 'Optional project to associate with (uses current directory if not specified)'
                },
                metadata: {
                  type: 'object',
                  description: 'Optional metadata (conversation context, source, etc.)'
                }
              },
              required: ['title', 'content']
            }
          },
          {
            name: 'search_knowledge',
            description: 'Search existing knowledge entries',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Search query (full-text search)'
                },
                tags: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Filter by specific tags'
                },
                project: {
                  type: 'string',
                  description: 'Filter by project name'
                },
                limit: {
                  type: 'number',
                  description: 'Maximum number of results (default: 10)'
                }
              },
              required: ['query']
            }
          },
          {
            name: 'list_knowledge',
            description: 'List recent knowledge entries',
            inputSchema: {
              type: 'object',
              properties: {
                limit: {
                  type: 'number',
                  description: 'Maximum number of entries to return (default: 10)'
                },
                project: {
                  type: 'string',
                  description: 'Filter by project name'
                }
              }
            }
          }
        ] as Tool[]
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'save_knowledge':
            return await this.handleSaveKnowledge(args);
          
          case 'search_knowledge':
            return await this.handleSearchKnowledge(args);
            
          case 'list_knowledge':
            return await this.handleListKnowledge(args);
            
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${message}`
            }
          ],
          isError: true
        };
      }
    });
  }

  private async handleSaveKnowledge(args: any): Promise<CallToolResult> {
    const { title, content, tags, project, metadata } = args;

    const result = await this.knowledgeAPI.saveKnowledge({
      title,
      content,
      tags: tags || [],
      project,
      metadata: {
        ...metadata,
        saved_via: 'mcp',
        timestamp: new Date().toISOString()
      }
    });

    return {
      content: [
        {
          type: 'text',
          text: `✅ Knowledge saved successfully!
          
**ID**: ${result.id}
**Title**: ${result.title}
**Tags**: ${result.tags?.join(', ') || 'none'}
**Project**: ${result.project || 'personal'}

The knowledge entry has been saved and can be searched later.`
        }
      ]
    };
  }

  private async handleSearchKnowledge(args: any): Promise<CallToolResult> {
    const { query, tags, project, limit = 10 } = args;

    const results = await this.knowledgeAPI.searchKnowledge({
      query,
      tags,
      project,
      limit
    });

    if (results.entries.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `🔍 No knowledge entries found for query: "${query}"`
          }
        ]
      };
    }

    const formattedResults = results.entries.map((entry, index) => 
      `**${index + 1}. ${entry.title}**
📅 ${new Date(entry.created_at).toLocaleDateString()}
🏷️ ${entry.tags?.join(', ') || 'no tags'}
📝 ${entry.content.substring(0, 200)}${entry.content.length > 200 ? '...' : ''}
`
    ).join('\n');

    return {
      content: [
        {
          type: 'text',
          text: `🔍 Found ${results.entries.length} knowledge entries:

${formattedResults}

${results.has_more ? `\n(Showing ${limit} of ${results.total} results)` : ''}`
        }
      ]
    };
  }

  private async handleListKnowledge(args: any): Promise<CallToolResult> {
    const { limit = 10, project } = args;

    const results = await this.knowledgeAPI.listKnowledge({
      limit,
      project
    });

    if (results.entries.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: '📋 No knowledge entries found.'
          }
        ]
      };
    }

    const formattedEntries = results.entries.map((entry, index) => 
      `**${index + 1}. ${entry.title}**
📅 ${new Date(entry.created_at).toLocaleDateString()}
🏷️ ${entry.tags?.join(', ') || 'no tags'}
`
    ).join('\n');

    return {
      content: [
        {
          type: 'text',
          text: `📋 Recent knowledge entries:

${formattedEntries}

Total entries: ${results.total}`
        }
      ]
    };
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      console.error('[MCP Error]', error);
    };

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Knowledger MCP server started');
  }
}

// Start server if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new KnowledgerServer();
  server.start().catch(console.error);
}

export { KnowledgerServer };