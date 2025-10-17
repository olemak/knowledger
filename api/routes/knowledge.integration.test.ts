import { assertEquals, assertExists } from 'jsr:@std/assert';
import { Hono } from 'jsr:@hono/hono';
import { createClient } from 'npm:@supabase/supabase-js@^2.0.0';
import { KnowledgeService } from '../services/knowledge.ts';
import { createKnowledgeRoutes } from './knowledge.ts';

// Test configuration
const SUPABASE_URL = Deno.env.get('SUPABASE_PROJECT_URL');
const SUPABASE_KEY = Deno.env.get('SUPABASE_KEY');

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.log('⚠️  Skipping integration tests: Missing Supabase credentials');
  Deno.exit(0);
}

// Set up test app
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const knowledgeService = new KnowledgeService(supabase);
const knowledgeRoutes = createKnowledgeRoutes(knowledgeService);

const app = new Hono();
app.get('/api/knowledge', knowledgeRoutes.list);
app.post('/api/knowledge', knowledgeRoutes.create);
app.get('/api/knowledge/:id', knowledgeRoutes.get);
app.put('/api/knowledge/:id', knowledgeRoutes.update);
app.delete('/api/knowledge/:id', knowledgeRoutes.delete);
app.get('/api/search', knowledgeRoutes.search);

// Helper function to make requests
async function makeRequest(path: string, options: RequestInit = {}) {
  const request = new Request(`http://localhost${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  
  return await app.fetch(request);
}

// Test data
const testKnowledge = {
  title: 'Integration Test Knowledge',
  content: 'This is a test knowledge entry created during integration testing.',
  tags: ['test', 'integration', 'api'],
  metadata: { source: 'deno-test' }
};

let createdKnowledgeId: string;

Deno.test({
  name: 'Knowledge API Integration Tests',
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async (t) => {
    
    await t.step('should create a knowledge entry', async () => {
      const response = await makeRequest('/api/knowledge', {
        method: 'POST',
        body: JSON.stringify(testKnowledge),
      });

      assertEquals(response.status, 201);
      
      const data = await response.json();
      assertExists(data.id);
      assertEquals(data.title, testKnowledge.title);
      assertEquals(data.content, testKnowledge.content);
      
      createdKnowledgeId = data.id;
      console.log(`✅ Created knowledge entry with ID: ${createdKnowledgeId}`);
    });

    await t.step('should list knowledge entries', async () => {
      const response = await makeRequest('/api/knowledge');
      assertEquals(response.status, 200);
      
      const data = await response.json();
      assertExists(data.entries);
      assertEquals(typeof data.total, 'number');
      
      // Should include our created entry
      const found = data.entries.find((entry: any) => entry.id === createdKnowledgeId);
      assertExists(found);
    });

    await t.step('should get a specific knowledge entry', async () => {
      const response = await makeRequest(`/api/knowledge/${createdKnowledgeId}`);
      assertEquals(response.status, 200);
      
      const data = await response.json();
      assertEquals(data.id, createdKnowledgeId);
      assertEquals(data.title, testKnowledge.title);
    });

    await t.step('should update a knowledge entry', async () => {
      const updateData = {
        title: 'Updated Integration Test Knowledge',
        content: 'This content has been updated during testing.',
        tags: ['test', 'integration', 'api', 'updated']
      };

      const response = await makeRequest(`/api/knowledge/${createdKnowledgeId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
      });

      assertEquals(response.status, 200);
      
      const data = await response.json();
      assertEquals(data.title, updateData.title);
      assertEquals(data.content, updateData.content);
    });

    await t.step('should search knowledge entries', async () => {
      const response = await makeRequest('/api/search?q=updated&tags=test');
      assertEquals(response.status, 200);
      
      const data = await response.json();
      assertExists(data.entries);
      
      // Should find our updated entry
      const found = data.entries.find((entry: any) => entry.id === createdKnowledgeId);
      assertExists(found);
    });

    await t.step('should handle validation errors', async () => {
      const invalidData = {
        // Missing required title and content
        tags: ['invalid']
      };

      const response = await makeRequest('/api/knowledge', {
        method: 'POST',
        body: JSON.stringify(invalidData),
      });

      assertEquals(response.status, 400);
      
      const data = await response.json();
      assertExists(data.error);
    });

    await t.step('should handle not found errors', async () => {
      const response = await makeRequest('/api/knowledge/nonexistent-id');
      assertEquals(response.status, 404);
      
      const data = await response.json();
      assertExists(data.error);
    });

    await t.step('should delete a knowledge entry', async () => {
      const response = await makeRequest(`/api/knowledge/${createdKnowledgeId}`, {
        method: 'DELETE',
      });

      assertEquals(response.status, 200);
      
      const data = await response.json();
      assertExists(data.message);
    });

    await t.step('should verify deletion', async () => {
      const response = await makeRequest(`/api/knowledge/${createdKnowledgeId}`);
      assertEquals(response.status, 404);
    });
  }
});

// Clean up any test data that might be left over
Deno.test({
  name: 'Cleanup test data',
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    // Clean up any test entries that might be left over
    try {
      const { data: testEntries } = await supabase
        .from('knowledge')
        .select('id')
        .eq('user_id', 'temp-user-123')
        .like('title', '%Integration Test%');

      if (testEntries && testEntries.length > 0) {
        const ids = testEntries.map((entry) => entry.id);
        await supabase
          .from('knowledge')
          .delete()
          .in('id', ids);
        
        console.log(`🧹 Cleaned up ${testEntries.length} test entries`);
      }
    } catch (error) {
      console.warn('Cleanup failed:', error);
    }
  }
});