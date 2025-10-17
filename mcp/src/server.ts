/**
 * Knowledger MCP Server
 * 
 * Full-featured MCP server for knowledge management with 11 tools:
 * - list_knowledge: List recent entries
 * - search_knowledge: Search entries by query
 * - save_knowledge: Create new entries (with traits support)
 * - get_knowledge: Get specific entry by ID
 * - add_reference_to_knowledge: Add URL references to entries
 * - add_tags_to_knowledge: Add tags to existing entries
 * - update_knowledge_title: Update entry titles
 * - update_knowledge_content: Update/append to entry content
 * - add_traits_to_knowledge: Add key-value traits to entries
 * - search_knowledge_by_traits: Search entries by trait keys/values
 * - link_trait_to_entity: Promote traits to link to full entities
 * 
 * Traits system enables organic knowledge organization with embedding-based discovery.
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
        description: 'Save a new knowledge entry with optional traits',
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
            traits: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  key: {
                    type: 'string',
                    description: 'Trait key (e.g., "Occupation", "Style")'
                  },
                  value: {
                    type: 'string',
                    description: 'Trait value (e.g., "Playwright", "Renaissance")'
                  },
                  confidence: {
                    type: 'number',
                    description: 'Optional confidence score (0-1)'
                  }
                },
                required: ['key', 'value'],
                additionalProperties: false
              },
              description: 'Optional traits (key-value descriptors) for the entry'
            }
          },
          required: ['title', 'content'],
          additionalProperties: false
        }
      },
      {
        name: 'get_knowledge',
        description: 'Get a specific knowledge entry by ID or search query',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Knowledge entry ID (UUID)'
            },
            query: {
              type: 'string',
              description: 'Search query to find entry by title/content (alternative to ID)'
            }
          },
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
      },
      {
        name: 'add_traits_to_knowledge',
        description: 'Add traits (key-value descriptors) to an existing knowledge entry',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Knowledge entry ID'
            },
            traits: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  key: {
                    type: 'string',
                    description: 'Trait key (e.g., "Fencer", "Occupation")'
                  },
                  value: {
                    type: 'string',
                    description: 'Trait value (e.g., "Florentine School", "Playwright")'
                  },
                  confidence: {
                    type: 'number',
                    description: 'Optional confidence score (0-1)'
                  }
                },
                required: ['key', 'value'],
                additionalProperties: false
              },
              description: 'Array of traits to add'
            }
          },
          required: ['id', 'traits'],
          additionalProperties: false
        }
      },
      {
        name: 'search_knowledge_by_traits',
        description: 'Search knowledge entries by trait keys or values',
        inputSchema: {
          type: 'object',
          properties: {
            trait_key: {
              type: 'string',
              description: 'Search by trait key (e.g., "Occupation")'
            },
            trait_value: {
              type: 'string',
              description: 'Search by trait value (e.g., "Playwright")'
            },
            limit: {
              type: 'number',
              description: 'Maximum results (default: 10)'
            }
          },
          additionalProperties: false
        }
      },
      {
        name: 'set_knowledge_traits',
        description: 'Set traits for a knowledge entry (replaces all existing traits)',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Knowledge entry ID'
            },
            traits: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  key: {
                    type: 'string',
                    description: 'Trait key (e.g., "Author", "Style")'
                  },
                  value: {
                    type: 'string',
                    description: 'Trait value (e.g., "The Massacre at Paris")'
                  },
                  confidence: {
                    type: 'number',
                    description: 'Optional confidence score (0-1)'
                  }
                },
                required: ['key', 'value'],
                additionalProperties: false
              },
              description: 'Traits to set (replaces all existing traits)'
            }
          },
          required: ['id', 'traits'],
          additionalProperties: false
        }
      },
      {
        name: 'link_trait_to_entity',
        description: 'Promote a trait to link to a full knowledge entity (e.g., "Florentine School" trait links to "Florentine School" entity)',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Knowledge entry ID containing the trait'
            },
            trait_key: {
              type: 'string',
              description: 'Key of the trait to link'
            },
            trait_value: {
              type: 'string',
              description: 'Value of the trait to link'
            },
            parent_id: {
              type: 'string',
              description: 'ID of the knowledge entity this trait should link to'
            }
          },
          required: ['id', 'trait_key', 'trait_value', 'parent_id'],
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
      const { title, content, tags, traits } = args;
      
      const result = await knowledgeAPI.saveKnowledge({
        title,
        content,
        tags: tags || [],
        traits: traits || [],
        metadata: {
          saved_via: 'mcp',
          timestamp: new Date().toISOString()
        }
      });
      
      const traitsText = traits && traits.length > 0 ? 
        `\n**Traits**: ${traits.map((t: any) => `${t.key}: ${t.value}`).join(', ')}` : '';
      
      return {
        content: [{
          type: 'text',
          text: `✅ **Knowledge saved successfully!**\n\n**ID**: ${result.id}\n**Title**: ${result.title}\n**Tags**: ${result.tags?.join(', ') || 'none'}${traitsText}\n\nThe knowledge entry has been saved and can be searched later.`
        }]
      };
      
    } else if (name === 'get_knowledge') {
      const { id, query } = args;
      
      let entry;
      
      if (id) {
        // Get by ID
        entry = await knowledgeAPI.getKnowledge(id);
      } else if (query) {
        // Search and get first result
        const results = await knowledgeAPI.searchKnowledge({ query, limit: 1 });
        if (results.entries.length === 0) {
          return {
            content: [{
              type: 'text',
              text: `❌ No knowledge entry found matching query: "${query}"`
            }]
          };
        }
        entry = results.entries[0];
      } else {
        return {
          content: [{
            type: 'text',
            text: `❌ Either 'id' or 'query' parameter is required`
          }]
        };
      }
      
      const traitsText = entry.traits && entry.traits.length > 0 ? 
        `\n**Traits**: ${entry.traits.map((t: any) => `${t.key}: ${t.value}${t.parent_id ? ' (linked)' : ''}`).join(', ')}` : '';
      
      const refsText = entry.refs && entry.refs.length > 0 ? 
        `\n**References**: ${entry.refs.length} reference(s)` : '';
      
      return {
        content: [{
          type: 'text',
          text: `📄 **${entry.title}**\n\n${entry.content}\n\n**ID**: ${entry.id}\n**Tags**: ${entry.tags?.join(', ') || 'none'}${traitsText}${refsText}\n**Created**: ${new Date(entry.created_at).toLocaleString()}`
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
      
    } else if (name === 'add_traits_to_knowledge') {
      const { id, traits } = args;
      
      const result = await knowledgeAPI.addTraits(id, traits);
      
      const traitsList = traits.map((t: any) => `${t.key}: ${t.value}`).join(', ');
      
      return {
        content: [{
          type: 'text',
          text: `🏷️ **Traits added successfully!**\n\n**Entry**: ${result.title}\n**New traits**: ${traitsList}\n**Total traits**: ${result.traits?.length || 0}`
        }]
      };
      
    } else if (name === 'set_knowledge_traits') {
      const { id, traits } = args;
      
      const result = await knowledgeAPI.setTraits(id, traits);
      
      const traitsList = traits.map((t: any) => `${t.key}: ${t.value}`).join(', ');
      
      return {
        content: [{
          type: 'text',
          text: `🏷️ **Traits set successfully!**\n\n**Entry**: ${result.title}\n**Traits**: ${traitsList}\n**Total traits**: ${result.traits?.length || 0}`
        }]
      };
      
    } else if (name === 'search_knowledge_by_traits') {
      const { trait_key, trait_value, limit = 10 } = args;
      
      const results = await knowledgeAPI.searchByTraits(trait_key, trait_value, limit);
      
      if (results.entries.length === 0) {
        const searchDesc = trait_key && trait_value ? `"${trait_key}: ${trait_value}"` : 
                          trait_key ? `key "${trait_key}"` : 
                          trait_value ? `value "${trait_value}"` : 'traits';
        return {
          content: [{ 
            type: 'text', 
            text: `🔍 No knowledge entries found with trait ${searchDesc}` 
          }]
        };
      }
      
      const formatted = results.entries.map((entry: any, i: number) => {
        const matchingTraits = entry.traits?.filter((t: any) => 
          (!trait_key || t.key === trait_key) && (!trait_value || t.value === trait_value)
        ) || [];
        const traitsList = matchingTraits.map((t: any) => `${t.key}: ${t.value}`).join(', ');
        
        return `**${i + 1}. ${entry.title}**\n📅 ${new Date(entry.created_at).toLocaleDateString()}\n🏷️ Matching traits: ${traitsList}\n📝 ${entry.content.substring(0, 150)}${entry.content.length > 150 ? '...' : ''}\n`;
      }).join('\n');
      
      const searchDesc = trait_key && trait_value ? `"${trait_key}: ${trait_value}"` : 
                        trait_key ? `key "${trait_key}"` : 
                        trait_value ? `value "${trait_value}"` : 'traits';
      
      return {
        content: [{ 
          type: 'text', 
          text: `🔍 **Found ${results.entries.length} entries with trait ${searchDesc}:**\n\n${formatted}` 
        }]
      };
      
    } else if (name === 'link_trait_to_entity') {
      const { id, trait_key, trait_value, parent_id } = args;
      
      const result = await knowledgeAPI.linkTraitToEntity(id, trait_key, trait_value, parent_id);
      
      return {
        content: [{
          type: 'text',
          text: `🔗 **Trait linked to entity successfully!**\n\n**Entry**: ${result.title}\n**Trait**: ${trait_key}: ${trait_value}\n**Linked to entity**: ${parent_id}\n\nThis trait is now promoted to reference a full knowledge entity.`
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