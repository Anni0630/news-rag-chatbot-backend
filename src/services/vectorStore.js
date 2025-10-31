const { QdrantClient } = require('@qdrant/js-client-rest');
const axios = require('axios');

class VectorStoreService {
  constructor() {
    this.client = new QdrantClient({
      url: process.env.QDRANT_URL || 'http://localhost:6333'
    });
    this.collectionName = 'news_articles';
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      // console.log('🔍 Checking vector store collection...');
      
      const { collections } = await this.client.getCollections();
      const exists = collections.find(col => col.name === this.collectionName);

      if (!exists) {
        // console.log('📁 Creating new collection:', this.collectionName);
        await this.client.createCollection(this.collectionName, {
          vectors: {
            size: 768, // Jina embeddings v2 base size
            distance: 'Cosine'
          }
        });
        console.log('✅ Collection created successfully');
      } else {
        console.log('✅ Collection already exists');
      }

      this.initialized = true;
    } catch (error) {
      console.error('❌ Error initializing vector store:', error);
      throw error;
    }
  }

  async getEmbedding(text) {
    try {
      // console.log('🔮 Getting embeddings for text...');
      
      if (!process.env.JINA_API_KEY) {
        throw new Error('JINA_API_KEY is not set in environment variables');
      }

      const response = await axios.post(
        'https://api.jina.ai/v1/embeddings',
        {
          input: [text],
          model: 'jina-embeddings-v2-base-en'
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.JINA_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );
      
      // console.log('✅ Embeddings generated successfully');
      return response.data.data[0].embedding;
    } catch (error) {
      console.error('❌ Error getting embeddings:', error.response?.data || error.message);
      throw error;
    }
  }

  async searchSimilar(query, limit = 3) {
    try {
      // console.log('🔍 Searching for similar articles...');
      const queryEmbedding = await this.getEmbedding(query);
      
      const results = await this.client.search(this.collectionName, {
        vector: queryEmbedding,
        limit: limit,
        with_payload: true,
        score_threshold: 0.5
      });

      // console.log(`✅ Found ${results.length} similar articles`);
      return results;
    } catch (error) {
      console.error('❌ Error searching vectors:', error);
      throw error;
    }
  }

  async addDocument(id, text, metadata) {
    try {
      // console.log(`📄 Adding document: ${metadata.title}`);
      const embedding = await this.getEmbedding(text);
      
      await this.client.upsert(this.collectionName, {
        wait: true,
        points: [
          {
            id: id,
            vector: embedding,
            payload: {
              text: text,
              ...metadata
            }
          }
        ]
      });

      // console.log('✅ Document added successfully');
    } catch (error) {
      console.error('❌ Error adding document:', error);
      throw error;
    }
  }

  async getCollectionInfo() {
    try {
      return await this.client.getCollection(this.collectionName);
    } catch (error) {
      console.error('❌ Error getting collection info:', error);
      throw error;
    }
  }
}

module.exports = new VectorStoreService();
module.exports.VectorStoreService = VectorStoreService;