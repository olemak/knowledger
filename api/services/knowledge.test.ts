import { assertEquals, assertRejects } from 'jsr:@std/assert';
import { KnowledgeService } from './knowledge.ts';
import type { CreateKnowledgeRequest } from '../../shared/types.ts';

// Mock Supabase client for testing
function createMockSupabase(mockData: any = {}) {
  return {
    from: (table: string) => ({
      insert: (data: any) => ({
        select: () => ({
          single: () => Promise.resolve({ data: mockData.insertResult, error: mockData.insertError })
        })
      }),
      select: (columns: string, options?: any) => ({
        eq: (column: string, value: any) => ({
          eq: (column2: string, value2: any) => ({
            single: () => Promise.resolve({ data: mockData.getResult, error: mockData.getError })
          }),
          order: (column: string, options: any) => ({
            range: (start: number, end: number) => Promise.resolve({ 
              data: mockData.listResult, 
              count: mockData.count, 
              error: mockData.listError 
            })
          })
        })
      }),
      update: (data: any) => ({
        eq: (column: string, value: any) => ({
          eq: (column2: string, value2: any) => ({
            select: () => ({
              single: () => Promise.resolve({ data: mockData.updateResult, error: mockData.updateError })
            })
          })
        })
      }),
      delete: () => ({
        eq: (column: string, value: any) => ({
          eq: (column2: string, value2: any) => Promise.resolve({ error: mockData.deleteError })
        })
      })
    })
  } as any;
}

Deno.test('KnowledgeService - create knowledge entry', async () => {
  const mockKnowledge = {
    id: '123',
    title: 'Test Knowledge',
    content: 'Test content',
    tags: ['test'],
    user_id: 'user123',
    created_at: new Date().toISOString()
  };

  const mockSupabase = createMockSupabase({ insertResult: mockKnowledge });
  const service = new KnowledgeService(mockSupabase);

  const createData: CreateKnowledgeRequest = {
    title: 'Test Knowledge',
    content: 'Test content',
    tags: ['test']
  };

  const result = await service.create(createData, 'user123');
  
  assertEquals(result.id, '123');
  assertEquals(result.title, 'Test Knowledge');
  assertEquals(result.content, 'Test content');
});

Deno.test('KnowledgeService - get knowledge by id', async () => {
  const mockKnowledge = {
    id: '123',
    title: 'Test Knowledge',
    content: 'Test content',
    user_id: 'user123'
  };

  const mockSupabase = createMockSupabase({ getResult: mockKnowledge });
  const service = new KnowledgeService(mockSupabase);

  const result = await service.getById('123', 'user123');
  
  assertEquals(result?.id, '123');
  assertEquals(result?.title, 'Test Knowledge');
});
