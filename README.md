News RAG Chatbot - Backend
A powerful Node.js backend for a RAG-powered news chatbot that answers questions about recent news articles using AI and semantic search.

Tech Stack
Component	Technology	Purpose
Backend Framework	Node.js + Express	Server infrastructure
Real-time Communication	Socket.io	Live chat functionality
Vector Database	Qdrant	Store and search article embeddings
AI Embeddings	Jina AI	Convert text to vectors
LLM API	Google Gemini	Generate intelligent responses
Cache & Sessions	Redis	Store chat history and sessions
Environment Management	dotenv	Configuration management

Prerequisites
Before running this application, make sure you have:

Node.js (v18 or higher)

Redis (for session storage)

Qdrant (vector database)

API Keys for Jina AI and Google Gemini

Installation
1. Clone the Repository
cd news-rag-chatbot/backend
2. Install Dependencies


npm install

3. Environment Configuration
Create a .env file in the backend directory:

env
# Server Configuration
PORT=5000
NODE_ENV=development
# Redis Configuration
REDIS_URL=redis://localhost:6379
# Vector Database
QDRANT_URL=http://localhost:6333
# API Keys (Get these from the respective services)
JINA_API_KEY=your_jina_ai_api_key
GEMINI_API_KEY=your_google_gemini_api_key

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000
4. Start Required Services
Terminal 1 - Start Redis:


# Using Docker
docker run -d -p 6379:6379 redis:alpine
Terminal 2 - Start Qdrant:

bash
# Using Docker (recommended)
docker run -d -p 6333:6333 -p 6334:6334 qdrant/qdrant

# Or download binary from https://github.com/qdrant/qdrant/releases
5. Get API Keys
Jina AI Embeddings:

Visit Jina AI
Sign up for free account
Get your API key from dashboard

Google Gemini:

Go to Google AI Studio
Create a new API key
Copy and paste in .env file

Running the Application
1. Ingest News Articles
First, populate the vector database with news articles:

npm run ingest

This will:
Fetch articles from multiple RSS feeds
Generate embeddings using Jina AI
Store articles in Qdrant vector database
Process ~50-80 articles (takes 5-10 minutes)

2. Start the Backend Server
# Development mode (with auto-restart)
npm run dev


curl http://localhost:5000/health
Should return: {"status":"OK","message":"News RAG Backend is running"}

API Endpoints
REST API
GET /health - Health check
GET /api/sessions/:id/history - Get chat history
DELETE /api/sessions/:id/history - Clear chat history

WebSocket Events
send_message - Send user message
receive_message - Receive bot response
get_chat_history - Request chat history
clear_history - Clear chat history
session_initialized - New session created
bot_typing - Typing indicator

Development Scripts
npm run dev          # Start development server with nodemon
npm start           # Start production server
npm run ingest      # Ingest news articles into vector database


Project Structure

backend/
├── src/
│   ├── server.js           # Main server entry point
│   ├── sockets/
│   │   └── chatSocket.js   # WebSocket handlers
│   ├── services/
│   │   ├── gemini.js       # Google Gemini integration
│   │   ├── vectorStore.js  # Qdrant vector operations
│   │   └── redis.js        # Redis session management
│   └── scripts/
│       └── ingest-news.js  # News ingestion script
├── package.json
├── .env.example
└── README.md