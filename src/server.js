const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// CORS configuration
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Basic health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'News RAG Backend is running' });
});

// Socket.io setup
const { setupSocketHandlers } = require('./sockets/chatSocket');
setupSocketHandlers(io);

// ✅ Correct imports
const redisService = require('./services/redis');
const vectorStoreService = require('./services/vectorStore');

// Initialize services
async function initializeServices() {
  try {
    // ✅ Call their initialize() methods
    await redisService.initialize();
    await vectorStoreService.initialize();

    console.log('✅ All services initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize services:', error);
    process.exit(1);
  }
}

const PORT = process.env.PORT || 5000;

// Start the server
initializeServices().then(() => {
  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  });
});
