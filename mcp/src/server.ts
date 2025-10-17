/**
 * Knowledger MCP Server
 * 
 * Full-featured MCP server for knowledge management with 8 tools:
 * - list_knowledge: List recent entries
 * - search_knowledge: Search entries by query
 * - save_knowledge: Create new entries  
 * - get_knowledge: Get specific entry by ID
 * - add_reference_to_knowledge: Add URL references to entries
 * - add_tags_to_knowledge: Add tags to existing entries
 * - update_knowledge_title: Update entry titles
 * - update_knowledge_content: Update/append to entry content
 * 
 * Uses manual request handlers to bypass registerTool() SDK bug.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { ConfigManager } from './config.ts';
import { KnowledgeAPI } from './knowledge-api.ts';

const server = new Server(
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

const configManager = new ConfigManager();
const knowledgeAPI = new KnowledgeAPI(configManager);

// Manual tools list - bypassing registerTool() completely
server.setRequestHandler(ListToolsRequestSchema, async () => {
  console.error('Tools list requested - returning manual list');
  return {
    tools: [
      {
        name: 'list_knowledge',
        description: 'List recent knowledge entries',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum entries (default: 10)'
            }
          },
          additionalProperties: false
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
            limit: {
              type: 'number',
              description: 'Maximum number of results (default: 5)'
            }
          },
          required: ['query'],
          additionalProperties: false
        }
      },
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
            }
          },
          required: ['title', 'content'],
          additionalProperties: false
        }
      },
      {
        name: 'get_knowledge',
        description: 'Get a specific knowledge entry by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Knowledge entry ID'
            }
          },
          required: ['id'],
          additionalProperties: false
        }
      },
      {
        name: 'add_reference_to_knowledge',
        description: 'Add a URL reference to an existing knowledge entry',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Knowledge entry ID'
            },
            uri: {
              type: 'string',
              description: 'URL to reference'
            },
            title: {
              type: 'string',
              description: 'Title/description of the reference'
            },
            type: {
              type: 'string',
              enum: ['citation', 'testimony'],
              description: 'Type of reference (default: citation)'
            },
            attributed_to: {
              type: 'string',
              description: 'Optional attribution'
            },
            statement: {
              type: 'string',
              description: 'Optional statement about the reference'
            }
          },
          required: ['id', 'uri', 'title'],
          additionalProperties: false
        }
      },
      {
        name: 'add_tags_to_knowledge',
        description: 'Add tags to an existing knowledge entry',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Knowledge entry ID'
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Tags to add'
            }
          },
          required: ['id', 'tags'],
          additionalProperties: false
        }
      },
      {
        name: 'update_knowledge_title',
        description: 'Update the title of an existing knowledge entry',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Knowledge entry ID'
            },
            title: {
              type: 'string',
              description: 'New title'
            }
          },
          required: ['id', 'title'],
          additionalProperties: false
        }
      },
      {
        name: 'update_knowledge_content',
        description: 'Update or append to the content of an existing knowledge entry',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Knowledge entry ID'
            },
            content: {
              type: 'string',
              description: 'New content'
            },
            append: {
              type: 'boolean',
              description: 'Whether to append to existing content (default: false - replaces)'
            }
          },
          required: ['id', 'content'],
          additionalProperties: false
        }
      }
    ]
  };
});

// Manual tool call handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  console.error(`Tool called: ${name} with args:`, args);

  try {
    if (name === 'list_knowledge') {
      const { limit = 10 } = args;
      
      const results = await knowledgeAPI.listKnowledge({ limit });
      
      if (results.entries.length === 0) {
        return {
          content: [{ type: 'text', text: '📋 No knowledge entries found.' }]
        };
      }
      
      const formatted = results.entries.map((entry: any, i: number) => 
        `${i + 1}. ${entry.title} (${new Date(entry.created_at).toLocaleDateString()})`
      ).join('\n');
      
      return {
        content: [{ 
          type: 'text', 
          text: `📋 Knowledge entries:\n\n${formatted}\n\nTotal: ${results.total}` 
        }]
      };
      
    } else if (name === 'search_knowledge') {
      const { query, limit = 5 } = args;
      
      const results = await knowledgeAPI.searchKnowledge({ query, limit });
      
      if (results.entries.length === 0) {
        return {
          content: [{ 
            type: 'text', 
            text: `🔍 No knowledge entries found for query: "${query}"` 
          }]
        };
      }
      
      const formatted = results.entries.map((entry: any, i: number) => 
        `**${i + 1}. ${entry.title}**\n📅 ${new Date(entry.created_at).toLocaleDateString()}\n🏷️ ${entry.tags?.join(', ') || 'no tags'}\n📝 ${entry.content.substring(0, 200)}${entry.content.length > 200 ? '...' : ''}\n`
      ).join('\n');
      
      return {
        content: [{ 
          type: 'text', 
          text: `🔍 **Found ${results.entries.length} knowledge entries:**\n\n${formatted}` 
        }]
      };
      
    } else if (name === 'save_knowledge') {
      const { title, content, tags } = args;
      
      const result = await knowledgeAPI.saveKnowledge({
        title,
        content,
        tags: tags || [],
        metadata: {
          saved_via: 'mcp',
          timestamp: new Date().toISOString()
        }
      });
      
      return {
        content: [{
          type: 'text',
          text: `✅ **Knowledge saved successfully!**\n\n**ID**: ${result.id}\n**Title**: ${result.title}\n**Tags**: ${result.tags?.join(', ') || 'none'}\n\nThe knowledge entry has been saved and can be searched later.`
        }]
      };
      
    } else if (name === 'get_knowledge') {
      const { id } = args;
      
      const entry = await knowledgeAPI.getKnowledge(id);
      
      return {
        content: [{
          type: 'text',
          text: `📄 **${entry.title}**\n\n${entry.content}\n\n**Tags**: ${entry.tags?.join(', ') || 'none'}\n**Created**: ${new Date(entry.created_at).toLocaleString()}\n**References**: ${entry.refs?.length || 0}`
        }]
      };
      
    } else if (name === 'add_reference_to_knowledge') {
      const { id, uri, title, type = 'citation', attributed_to, statement } = args;
      
      const reference = {
        uri,
        title,
        type,
        ...(attributed_to && { attributed_to }),
        ...(statement && { statement })
      };
      
      const result = await knowledgeAPI.addReference(id, reference);
      
      return {
        content: [{
          type: 'text',
          text: `🔗 **Reference added successfully!**\n\n**Entry**: ${result.title}\n**Reference**: ${title}\n**URL**: ${uri}\n**Type**: ${type}\n\nTotal references: ${result.refs?.length || 0}`
        }]
      };
      
    } else if (name === 'add_tags_to_knowledge') {
      const { id, tags } = args;
      
      const result = await knowledgeAPI.addTags(id, tags);
      
      return {
        content: [{
          type: 'text',
          text: `🏷️ **Tags added successfully!**\n\n**Entry**: ${result.title}\n**New tags**: ${tags.join(', ')}\n**All tags**: ${result.tags?.join(', ') || 'none'}`
        }]
      };
      
    } else if (name === 'update_knowledge_title') {
      const { id, title } = args;
      
      const result = await knowledgeAPI.updateTitle(id, title);
      
      return {
        content: [{
          type: 'text',
          text: `📝 **Title updated successfully!**\n\n**New title**: ${result.title}\n**Entry ID**: ${result.id}`
        }]
      };
      
    } else if (name === 'update_knowledge_content') {
      const { id, content, append = false } = args;
      
      const result = await knowledgeAPI.updateContent(id, content, append);
      
      return {
        content: [{
          type: 'text',
          text: `📝 **Content ${append ? 'appended to' : 'updated in'} entry successfully!**\n\n**Entry**: ${result.title}\n**Action**: ${append ? 'Appended' : 'Replaced'} content`
        }]
      };
    }
    
    throw new Error(`Unknown tool: ${name}`);
    
  } catch (error) {
    console.error(`Error in tool ${name}:`, error);
    return {
      content: [{ 
        type: 'text', 
        text: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}` 
      }]
    };
  }
});

async function start() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('🚀 Knowledger MCP server started');
}

if (import.meta.main) {
  start().catch(console.error);
}