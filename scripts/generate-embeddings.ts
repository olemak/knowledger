#!/usr/bin/env -S deno run --allow-env --allow-net --allow-read

/**
 * Generate embeddings for existing knowledge entries
 * 
 * Usage:
 *   deno run --allow-env --allow-net --allow-read scripts/generate-embeddings.ts
 *   deno run --allow-env --allow-net --allow-read scripts/generate-embeddings.ts --user-id=123
 *   deno run --allow-env --allow-net --allow-read scripts/generate-embeddings.ts --dry-run
 */

import { parseArgs } from 'jsr:@std/cli/parse-args';
import { EmbeddingsService } from '../api/services/embeddings.ts';
import { getSupabaseClient } from '../api/lib/supabase.ts';

interface KnowledgeEntry {
  id: string;
  title: string;
  content: string;
  user_id: string;
  created_at: string;
}

async function generateEmbeddings(options: {
  userId?: string;
  dryRun?: boolean;
  limit?: number;
}) {
  console.log('🧠 Knowledge Embeddings Generator');
  console.log('==================================\\n');

  if (options.dryRun) {
    console.log('🔍 DRY RUN - No embeddings will be generated\\n');
  }

  const supabase = getSupabaseClient();
  const embeddings = new EmbeddingsService();

  // Test connection first
  console.log('Testing Google AI connection...');
  const connected = await embeddings.testConnection();
  if (!connected) {
    console.error('❌ Failed to connect to Google AI API');
    Deno.exit(1);
  }
  console.log('✅ Google AI connection successful\\n');

  // Query all knowledge entries first
  let query = supabase
    .from('knowledge')
    .select('id, title, content, user_id, created_at')
    .order('created_at', { ascending: false });

  if (options.userId) {
    query = query.eq('user_id', options.userId);
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data: entries, error } = await query;

  if (error) {
    console.error('❌ Failed to fetch knowledge entries:', error.message);
    Deno.exit(1);
  }

  if (!entries || entries.length === 0) {
    console.log('📋 No knowledge entries found');
    return;
  }

  // Get existing embeddings to filter out entries that already have them
  const { data: existingEmbeddings, error: embeddingError } = await supabase
    .from('knowledge_embeddings')
    .select('knowledge_id');

  if (embeddingError) {
    console.error('❌ Failed to fetch existing embeddings:', embeddingError.message);
    Deno.exit(1);
  }

  const existingIds = new Set(existingEmbeddings?.map(e => e.knowledge_id) || []);
  const entriesWithoutEmbeddings = entries.filter(entry => !existingIds.has(entry.id));

  if (entriesWithoutEmbeddings.length === 0) {
    console.log('📋 No knowledge entries found without embeddings');
    return;
  }

  console.log(`📁 Found ${entriesWithoutEmbeddings.length} entries without embeddings\\n`);

  if (options.dryRun) {
    console.log('Would process the following entries:');
    entriesWithoutEmbeddings.forEach((entry: KnowledgeEntry, i: number) => {
      console.log(`${i + 1}. ${entry.title} (${entry.content.length} chars)`);
    });
    return;
  }

  // Process entries one by one
  let processed = 0;
  let failed = 0;

  for (const entry of entriesWithoutEmbeddings as KnowledgeEntry[]) {
    try {
      console.log(`Processing: ${entry.title}...`);
      
      // Generate embedding
      const result = await embeddings.generateKnowledgeEmbedding(
        entry.title, 
        entry.content
      );

      // Store embedding
      const { error: insertError } = await supabase
        .from('knowledge_embeddings')
        .insert({
          knowledge_id: entry.id,
          content_embedding: result.embedding,
          model_name: result.model
        });

      if (insertError) {
        console.error(`  ❌ Failed to store embedding: ${insertError.message}`);
        failed++;
      } else {
        console.log(`  ✅ Generated and stored (${result.usage.tokens} tokens)`);
        processed++;
      }

      // Rate limiting - wait a bit between requests
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error) {
      console.error(`  ❌ Failed: ${error.message}`);
      failed++;
    }
  }

  console.log(`\\n🎉 Complete!`);
  console.log(`✅ Processed: ${processed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📁 Total: ${entriesWithoutEmbeddings.length}`);
}

async function main() {
  const args = parseArgs(Deno.args, {
    string: ['user-id', 'limit'],
    boolean: ['dry-run', 'help'],
    alias: {
      h: 'help',
      u: 'user-id',
      l: 'limit',
      d: 'dry-run'
    }
  });

  if (args.help) {
    console.log(`
Knowledge Embeddings Generator

Usage:
  deno run --allow-env --allow-net --allow-read scripts/generate-embeddings.ts [options]

Options:
  -u, --user-id <id>    Generate embeddings for specific user only
  -l, --limit <num>     Limit number of entries to process
  -d, --dry-run         Show what would be processed without generating embeddings
  -h, --help            Show this help message

Examples:
  # Generate embeddings for all entries
  deno run --allow-env --allow-net --allow-read scripts/generate-embeddings.ts

  # Dry run for specific user
  deno run --allow-env --allow-net --allow-read scripts/generate-embeddings.ts -u user123 --dry-run

  # Process only 10 entries
  deno run --allow-env --allow-net --allow-read scripts/generate-embeddings.ts --limit 10
    `);
    Deno.exit(0);
  }

  try {
    await generateEmbeddings({
      userId: args['user-id'],
      dryRun: args['dry-run'],
      limit: args.limit ? parseInt(args.limit) : undefined
    });
  } catch (error) {
    console.error('💥 Script failed:', error.message);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  await main();
}