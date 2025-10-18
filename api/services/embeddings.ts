/**
 * Google Vertex AI embeddings service
 * 
 * Uses Google's text-embedding-004 model to generate 768-dimensional vectors
 * for knowledge entries to enable semantic search.
 */

export interface EmbeddingResult {
  embedding: number[];
  model: string;
  usage: {
    tokens: number;
  };
}

export class EmbeddingsService {
  private apiKey: string;
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
  private model = 'text-embedding-004';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || Deno.env.get('VERTEX_API_KEY') || '';
    if (!this.apiKey) {
      throw new Error('VERTEX_API_KEY environment variable is required');
    }
  }

  /**
   * Generate embedding for a single text string
   */
  async generateEmbedding(text: string): Promise<EmbeddingResult> {
    if (!text || text.trim().length === 0) {
      throw new Error('Text cannot be empty');
    }

    // Truncate text if too long (Google has token limits)
    const truncatedText = text.length > 10000 ? text.substring(0, 10000) : text;

    try {
      const response = await fetch(
        `${this.baseUrl}/${this.model}:embedContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: `models/${this.model}`,
            content: {
              parts: [{ text: truncatedText }]
            }
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Google AI API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      if (!data.embedding || !data.embedding.values) {
        throw new Error('Invalid response from Google AI API');
      }

      return {
        embedding: data.embedding.values,
        model: this.model,
        usage: {
          tokens: Math.ceil(truncatedText.length / 4) // Rough token estimate
        }
      };
    } catch (error) {
      console.error('Failed to generate embedding:', error);
      throw error;
    }
  }

  /**
   * Generate embeddings for multiple texts in batch
   */
  async generateEmbeddings(texts: string[]): Promise<EmbeddingResult[]> {
    if (texts.length === 0) {
      return [];
    }

    // For now, process sequentially to avoid rate limits
    // Could be optimized with batch API or concurrency limits later
    const results: EmbeddingResult[] = [];
    
    for (const text of texts) {
      try {
        const result = await this.generateEmbedding(text);
        results.push(result);
      } catch (error) {
        console.error(`Failed to generate embedding for text: ${text.substring(0, 100)}...`, error);
        // Continue processing other texts
        results.push({
          embedding: new Array(768).fill(0), // Zero vector as fallback
          model: this.model,
          usage: { tokens: 0 }
        });
      }
    }

    return results;
  }

  /**
   * Generate embedding for knowledge content (title + content combined)
   */
  async generateKnowledgeEmbedding(title: string, content: string): Promise<EmbeddingResult> {
    // Combine title and content with proper weighting
    // Title gets repeated to give it more importance in the embedding
    const combinedText = `${title}\n\n${title}\n\n${content}`;
    return this.generateEmbedding(combinedText);
  }

  /**
   * Generate query embedding for search
   */
  async generateQueryEmbedding(query: string): Promise<number[]> {
    const result = await this.generateEmbedding(query);
    return result.embedding;
  }

  /**
   * Test the service connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.generateEmbedding("Test connection to Google AI");
      return true;
    } catch (error) {
      console.error('Embeddings service connection test failed:', error);
      return false;
    }
  }
}