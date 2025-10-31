const redis = require('redis');

class RedisService {
  constructor() {
    this.client = null;
  }

  async initialize() {
    try {
      this.client = redis.createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
      });

      this.client.on('error', (err) => console.error('❌ Redis Client Error', err));
      this.client.on('connect', () => console.log('🔌 Connecting to Redis...'));
      this.client.on('ready', () => console.log('✅ Redis client ready'));
      
      await this.client.connect();
      console.log('✅ Redis client connected successfully');
    } catch (error) {
      console.error('❌ Failed to connect to Redis:', error);
      throw error;
    }
  }

  async storeChatHistory(sessionId, messages) {
    try {
      await this.client.setEx(
        `session:${sessionId}:history`,
        3600, // 1 hour TTL
        JSON.stringify(messages)
      );
      console.log(`💾 Stored chat history for session: ${sessionId}`);
    } catch (error) {
      console.error('❌ Error storing chat history:', error);
      throw error;
    }
  }

  async getChatHistory(sessionId) {
    try {
      const history = await this.client.get(`session:${sessionId}:history`);
      const messages = history ? JSON.parse(history) : [];
      console.log(`📖 Retrieved ${messages.length} messages for session: ${sessionId}`);
      return messages;
    } catch (error) {
      console.error('❌ Error getting chat history:', error);
      throw error;
    }
  }

  async clearChatHistory(sessionId) {
    try {
      await this.client.del(`session:${sessionId}:history`);
      console.log(`🧹 Cleared chat history for session: ${sessionId}`);
    } catch (error) {
      console.error('❌ Error clearing chat history:', error);
      throw error;
    }
  }
}

module.exports = new RedisService();
module.exports.RedisService = RedisService;