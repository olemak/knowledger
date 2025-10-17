import { assertEquals, assertExists, assert } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { KnowledgeAPI, type KnowledgeReference } from "./knowledge-api.ts";
import { ConfigManager } from "./config.ts";

// Test configuration
const TEST_KNOWLEDGE_ID = '1f5b4f5d-47fe-4f63-a4af-9316edced95b'; // AI Safety entry
const LAW_ENFORCEMENT_ID = '353e40d9-dc90-4ea2-b499-7b079f42d2cc'; // Law enforcement entry

Deno.test("KnowledgeAPI - Basic Operations", async (t) => {
  const configManager = new ConfigManager();
  const api = new KnowledgeAPI(configManager);

  await t.step("should list knowledge entries", async () => {
    const results = await api.listKnowledge({ limit: 5 });
    
    assertExists(results.entries);
    assert(results.total >= 0);
    assertEquals(typeof results.has_more, "boolean");
  });

  await t.step("should search knowledge entries", async () => {
    const results = await api.searchKnowledge({ 
      query: "AI", 
      limit: 3 
    });
    
    assertExists(results.entries);
    assert(results.total >= 0);
  });

  await t.step("should get single knowledge entry", async () => {
    const knowledge = await api.getKnowledge(TEST_KNOWLEDGE_ID);
    
    assertExists(knowledge.id);
    assertExists(knowledge.title);
    assertExists(knowledge.content);
    assertEquals(knowledge.id, TEST_KNOWLEDGE_ID);
  });
});

Deno.test("KnowledgeAPI - Granular Operations", async (t) => {
  const configManager = new ConfigManager();
  const api = new KnowledgeAPI(configManager);

  let initialRefsCount = 0;
  let initialTagsCount = 0;
  let initialContentLength = 0;

  await t.step("should get initial state", async () => {
    const knowledge = await api.getKnowledge(TEST_KNOWLEDGE_ID);
    initialRefsCount = knowledge.refs?.length || 0;
    initialTagsCount = knowledge.tags?.length || 0;
    initialContentLength = knowledge.content.length;
    
    console.log(`Initial state: ${initialRefsCount} refs, ${initialTagsCount} tags, ${initialContentLength} chars`);
  });

  await t.step("should add a reference", async () => {
    const newRef: KnowledgeReference = {
      uri: 'https://example.com/test-deno-paper-' + Date.now(),
      title: 'Deno Test Research Paper',
      type: 'citation'
    };
    
    const result = await api.addReference(TEST_KNOWLEDGE_ID, newRef);
    
    assertExists(result.refs);
    assertEquals(result.refs.length, initialRefsCount + 1);
    
    // Check the new reference is there
    const addedRef = result.refs.find(ref => ref.uri === newRef.uri);
    assertExists(addedRef);
    assertEquals(addedRef.title, newRef.title);
    assertEquals(addedRef.type, newRef.type);
  });

  await t.step("should add tags", async () => {
    const timestamp = Date.now();
    const newTags = [`deno-test-${timestamp}`, `auto-test-${timestamp}`];
    
    const result = await api.addTags(TEST_KNOWLEDGE_ID, newTags);
    
    assertExists(result.tags);
    // Note: tags might be deduplicated, so we just check they're present
    
    // Check new tags are there
    newTags.forEach(tag => {
      assert(result.tags!.includes(tag), `Tag "${tag}" should be present`);
    });
  });

  await t.step("should append content", async () => {
    const additionalContent = `\\n\\nDeno test addition at ${new Date().toISOString()}`;
    
    const result = await api.updateContent(TEST_KNOWLEDGE_ID, additionalContent, true);
    
    assert(result.content.length > initialContentLength);
    assert(result.content.includes(additionalContent.trim()));
  });
});

Deno.test("KnowledgeAPI - Reference Types", async (t) => {
  const configManager = new ConfigManager();
  const api = new KnowledgeAPI(configManager);

  await t.step("should add citation reference", async () => {
    const citation: KnowledgeReference = {
      uri: 'https://doi.org/10.1000/test-' + Date.now(),
      title: 'Test Academic Citation',
      type: 'citation'
    };
    
    const result = await api.addReference(LAW_ENFORCEMENT_ID, citation);
    
    const addedRef = result.refs?.find(ref => ref.uri === citation.uri);
    assertExists(addedRef);
    assertEquals(addedRef.type, 'citation');
  });

  await t.step("should add testimony reference", async () => {
    const testimony: KnowledgeReference = {
      uri: 'testimony://test-hearing-' + Date.now(),
      title: 'Test Expert Testimony',
      attributed_to: 'Dr. Test Expert',
      type: 'testimony',
      statement: 'This is a test statement for verification purposes.'
    };
    
    const result = await api.addReference(LAW_ENFORCEMENT_ID, testimony);
    
    const addedRef = result.refs?.find(ref => ref.uri === testimony.uri);
    assertExists(addedRef);
    assertEquals(addedRef.type, 'testimony');
    assertEquals(addedRef.attributed_to, testimony.attributed_to);
    assertEquals(addedRef.statement, testimony.statement);
  });
});

Deno.test("KnowledgeAPI - Configuration", async (t) => {
  await t.step("should load valid configuration", async () => {
    const configManager = new ConfigManager();
    const config = configManager.getConfig();
    
    assertExists(config.api_endpoint);
    assert(config.api_endpoint.startsWith('http'));
    assertExists(config.default_tags);
  });

  await t.step("should create API client with config", async () => {
    const configManager = new ConfigManager();
    const api = new KnowledgeAPI(configManager);
    
    // Test that API client can make requests
    const results = await api.listKnowledge({ limit: 1 });
    assertExists(results);
  });
});