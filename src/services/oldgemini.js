const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiService {
    // Use the correct model names with full path from your available models
    static AVAILABLE_MODELS = [
        'models/gemini-2.5-flash',  // Fast and efficient
        'models/gemini-2.5-pro',    // More capable
        'models/gemini-2.0-flash',  // Fallback option
    ];

    constructor() {
        if (!process.env.GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY is not set in environment variables. Get a free key from: https://aistudio.google.com/apikey');
        }
        
        console.log('🔧 Initializing Gemini service...');
        
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        this.model = null;
        this.initializeModel();
    }

    async initializeModel() {
        // Try each model until we find one that works
        for (const modelName of GeminiService.AVAILABLE_MODELS) {
            try {
                console.log(`🔍 Testing model: ${modelName}`);
                const testModel = this.genAI.getGenerativeModel({ model: modelName });
                
                // Test with a simple message
                const testResult = await testModel.generateContent('Hello, respond with "OK"');
                const response = await testResult.response;
                const text = response.text();
                
                if (text && text.includes('OK')) {
                    this.model = testModel;
                    console.log(`✅ Successfully initialized with model: ${modelName}`);
                    return;
                }
            } catch (error) {
                console.log(`❌ ${modelName} failed: ${error.message}`);
            }
        }
        
        throw new Error('No working Gemini model found. Please check your API key.');
    }

    async generateResponse(query, context, chatHistory = []) {
        if (!this.model) {
            await this.initializeModel();
        }

        try {
            console.log('🤖 Generating response with Gemini...');
            
            // Format RAG context from news articles
            const contextText = context.map((article, index) => 
                `📰 Source ${index + 1}: ${article.payload.title}\n📖 Content: ${article.payload.text.substring(0, 400)}...`
            ).join('\n\n');

            // Format chat history (last 3 messages to avoid token limits)
            const historyText = chatHistory.slice(-3).map(msg => 
                `${msg.role === 'user' ? '👤 User' : '🤖 Assistant'}: ${msg.content}`
            ).join('\n');

            const prompt = `You are a helpful news assistant. Use the provided news articles to answer the user's question.

RECENT NEWS ARTICLES:
${contextText}

${historyText ? `RECENT CONVERSATION:\n${historyText}\n\n` : ''}
USER QUESTION: ${query}

INSTRUCTIONS:
1. Answer based on the news articles provided above
2. If the articles don't contain relevant information, say "I don't have specific information about this in the recent news, but generally..." and provide helpful information
3. Be concise and factual
4. Reference specific articles when possible (e.g., "According to Source 1...")
5. Keep your response under 250 words

Please provide a helpful answer:`;

            console.log(`📝 Prompt length: ${prompt.length} characters`);
            
            // Generate content
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            
            // Debug: Log the full response structure
            console.log('🔍 Full response structure:', JSON.stringify({
                hasCandidates: !!result.response.candidates,
                candidateCount: result.response.candidates?.length,
                firstCandidate: result.response.candidates?.[0] ? {
                    finishReason: result.response.candidates[0].finishReason,
                    hasContent: !!result.response.candidates[0].content,
                    contentParts: result.response.candidates[0].content?.parts?.length
                } : 'No candidate'
            }, null, 2));
            
            // Check for safety blocking or other issues
            if (result.response.candidates && result.response.candidates[0]) {
                const candidate = result.response.candidates[0];
                const finishReason = candidate.finishReason;
                
                console.log(`🔍 Finish Reason: ${finishReason}`);
                
                if (finishReason === 'SAFETY') {
                    console.warn('❌ Response blocked by safety filters');
                    return this.getFallbackResponse(query, context, 'Response was blocked by safety filters.');
                }
                
                if (finishReason === 'OTHER' || finishReason === 'RECITATION') {
                    console.warn(`⚠️ Response finished with reason: ${finishReason}`);
                }
            }
            
            // Extract text safely - use the correct method
            const responseText = response.text();
            
            console.log(`📝 Raw response text: "${responseText}"`);
            console.log(`📝 Response text length: ${responseText.length}`);
            
            if (!responseText || responseText.trim() === '') {
                console.warn('⚠️ Empty response received from Gemini');
                return this.getFallbackResponse(query, context, 'Received empty response from AI service.');
            }
            
            console.log('✅ Response generated successfully');
            return responseText;
            
        } catch (error) {
            console.error('❌ Gemini error:', error);
            
            // Provide detailed error information
            if (error.message.includes('SAFETY')) {
                return this.getFallbackResponse(query, context, 'The response was blocked for safety reasons.');
            } else if (error.message.includes('quota')) {
                return this.getFallbackResponse(query, context, 'API quota exceeded. Please try again later.');
            } else {
                return this.getFallbackResponse(query, context, `AI service error: ${error.message}`);
            }
        }
    }

    getFallbackResponse(query, context, errorMsg = '') {
        const articleCount = context.length;
        const articleTitles = context.map((article, index) => 
            `${index + 1}. ${article.payload.title}`
        ).join('\n');
        
        return `I found ${articleCount} relevant news articles for your question about "${query}":

${articleTitles}

${errorMsg ? `Note: ${errorMsg}` : 'I am currently experiencing issues with the AI service.'}

In a fully working system, I would provide a detailed summary based on the content of these articles.`;
    }

    // Health check
    async healthCheck() {
        try {
            if (!this.model) {
                await this.initializeModel();
            }
            const result = await this.model.generateContent('Health check - please respond with "OK"');
            const response = await result.response;
            return response.text().includes('OK');
        } catch (error) {
            console.error('Health check failed:', error.message);
            return false;
        }
    }
}

module.exports = new GeminiService();