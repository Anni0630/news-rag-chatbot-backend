const { v4: uuidv4 } = require('uuid');
const vectorStore = require('../services/vectorStore');
const geminiService = require('../services/gemini');
const redisService = require('../services/redis');

function setupSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log('👤 User connected:', socket.id);

    // Generate session ID for new user
    const sessionId = uuidv4();
    socket.emit('session_initialized', { sessionId });
    console.log(`🆕 Session initialized: ${sessionId}`);

    socket.on('send_message', async (data) => {
      try {
        const { message, sessionId } = data;
        console.log(`💬 Message received from ${sessionId}: ${message}`);
        
        if (!message.trim()) {
          socket.emit('error', { message: 'Message cannot be empty' });
          return;
        }

        // Get chat history
        const chatHistory = await redisService.getChatHistory(sessionId);
        
        // Add user message to history
        const userMessage = { 
          role: 'user', 
          content: message, 
          timestamp: new Date().toISOString() 
        };
        chatHistory.push(userMessage);
        
        // Emit typing indicator
        socket.emit('bot_typing', { typing: true });
        
        // Retrieve relevant news articles
        const relevantArticles = await vectorStore.searchSimilar(message, 3);
        
        // Generate response using Gemini
        const botResponse = await geminiService.generateResponse(
          message, 
          relevantArticles, 
          chatHistory
        );

        console.log('--- DEBUG: GEMINI RESPONSE CHECK ---');
        console.log(`Response length: ${botResponse ? botResponse.length : 0}`);
        console.log(`Response content (first 50 chars): "${botResponse ? botResponse.substring(0, 50) : '[EMPTY/NULL]'}"`);
        
        let finalBotContent = botResponse;
        console.log('------------------------------------');
        
        // Add bot response to history
        const botMessage = { 
          role: 'assistant', 
          content: finalBotContent, 
          timestamp: new Date().toISOString() 
        };
        chatHistory.push(botMessage);
        
        // Store updated history
        await redisService.storeChatHistory(sessionId, chatHistory);
        
        // Send response
        socket.emit('receive_message', botMessage);
        socket.emit('bot_typing', { typing: false });
        
        console.log(`🤖 Response sent to ${sessionId}`);
        
      } catch (error) {
        console.error('❌ Error processing message:', error);
        socket.emit('error', { 
          message: `Failed to process message: ${error.message}` 
        });
        socket.emit('bot_typing', { typing: false });
      }
    });

    socket.on('get_chat_history', async (data) => {
      try {
        const { sessionId } = data;
        console.log(`📖 Fetching history for session: ${sessionId}`);
        
        const history = await redisService.getChatHistory(sessionId);
        socket.emit('chat_history', history);
        
        console.log(`✅ History sent for session: ${sessionId}`);
      } catch (error) {
        console.error('❌ Error getting chat history:', error);
        socket.emit('error', { message: 'Failed to get chat history' });
      }
    });

    socket.on('clear_history', async (data) => {
      try {
        const { sessionId } = data;
        console.log(`🧹 Clearing history for session: ${sessionId}`);
        
        await redisService.clearChatHistory(sessionId);
        socket.emit('history_cleared');
        
        console.log(`✅ History cleared for session: ${sessionId}`);
      } catch (error) {
        console.error('❌ Error clearing history:', error);
        socket.emit('error', { message: 'Failed to clear history' });
      }
    });

    socket.on('disconnect', () => {
      console.log('👤 User disconnected:', socket.id);
    });
  });
}

module.exports = { setupSocketHandlers };