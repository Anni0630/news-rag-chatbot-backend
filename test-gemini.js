const axios = require('axios');
require('dotenv').config();

async function testGeminiDirect() {
  const API_KEY = process.env.GEMINI_API_KEY;
  
  if (!API_KEY) {
    console.log('❌ GEMINI_API_KEY is not set in .env file');
    console.log('🔑 Get it from: https://aistudio.google.com/apikey');
    return;
  }

  console.log('🔑 Testing Gemini API Key...');
  console.log('Key starts with:', API_KEY.substring(0, 10) + '...');
  console.log('');

  const baseURL = 'https://generativelanguage.googleapis.com/v1';

  // Test 1: List available models
  console.log('1. 🔍 Testing model listing...');
  try {
    const modelsResponse = await axios.get(`${baseURL}/models?key=${API_KEY}`, {
      timeout: 10000
    });
    console.log('✅ Model listing SUCCESS');
    console.log('   Available models:');
    modelsResponse.data.models.forEach(model => {
      console.log(`   - ${model.name} (${model.displayName})`);
      console.log(`     Supported methods: ${model.supportedGenerationMethods?.join(', ')}`);
    });
  } catch (error) {
    console.log('❌ Model listing FAILED');
    console.log(`   Error: ${error.response?.status} - ${error.response?.statusText}`);
    if (error.response?.data) {
      console.log(`   Details: ${JSON.stringify(error.response.data.error)}`);
    }
  }

  console.log('\n2. 🧪 Testing model generation...');

  // Test different models
  const testModels = ['gemini-2.5-flash', 'gemini-2.5-pro']; // Use the listed models
  
  for (const model of testModels) {
    try {
      console.log(`   Testing ${model}...`);
      const response = await axios.post(
        `${baseURL}/models/${model}:generateContent?key=${API_KEY}`,
        {
          contents: [{
            parts: [{
              text: "Hello! Please respond with 'API is working' if you can read this."
            }]
          }]
        },
        {
          timeout: 15000,
          headers: { 'Content-Type': 'application/json' }
        }
      );

      if (response.data.candidates && response.data.candidates[0]) {
        console.log(`   ✅ ${model}: SUCCESS`);
        console.log(`      Response: "${response.data.candidates[0].content.parts[0].text}"`);
      } else {
        console.log(`   ❌ ${model}: No response candidate found`);
      }
    } catch (error) {
      console.log(`   ❌ ${model}: FAILED`);
      console.log(`      Error: ${error.response?.status} - ${error.response?.statusText}`);
      if (error.response?.data?.error) {
        console.log(`      Message: ${error.response.data.error.message}`);
      }
    }
  }
}

testGeminiDirect();