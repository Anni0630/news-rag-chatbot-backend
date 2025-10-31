const Parser = require('rss-parser');
const axios = require('axios');
const cheerio = require('cheerio');
const vectorStore = require('../src/services/vectorStore');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const parser = new Parser();

// Multiple news RSS feeds for diversity
const NEWS_SOURCES = [
  'https://rss.cnn.com/rss/edition.rss',
  'https://feeds.reuters.com/reuters/topNews',
  'https://feeds.bbci.co.uk/news/rss.xml',
  'https://feeds.npr.org/1001/rss.xml',
  'https://rss.ap.org/rss/topnews.xml'
];

async function fetchAndParseArticle(url) {
  try {
    console.log(`🌐 Fetching article: ${url}`);
    
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    
    // Remove unwanted elements
    $('script, style, nav, header, footer, iframe, .ad, .advertisement').remove();
    
    // Extract title and content
    const title = $('title').first().text() || $('h1').first().text() || '';
    let content = '';
    
    // Try to find main content areas
    const contentSelectors = [
      'article',
      '.article-content',
      '.story-content',
      '.post-content',
      'main',
      '[role="main"]'
    ];
    
    for (const selector of contentSelectors) {
      const element = $(selector).first();
      if (element.length) {
        content = element.text();
        break;
      }
    }
    
    // Fallback to body if no specific content found
    if (!content) {
      content = $('body').text();
    }
    
    // Clean and truncate content
    content = content.replace(/\s+/g, ' ').trim().substring(0, 1500);
    
    if (!title || !content) {
      console.log('❌ No title or content found');
      return null;
    }
    
    return { 
      title: title.substring(0, 200), 
      content, 
      url,
      ingestedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error(`❌ Error fetching article ${url}:`, error.message);
    return null;
  }
}

async function ingestNews() {
  try {
    console.log('🚀 Starting news ingestion...');
    
    // Initialize vector store
    await vectorStore.initialize();
    
    let articleCount = 0;
    const failedArticles = [];
    
    for (const source of NEWS_SOURCES) {
      try {
        console.log(`\n📰 Processing source: ${source}`);
        
        const feed = await parser.parseURL(source);
        console.log(`📋 Found ${feed.items.length} items in feed`);
        
        for (const item of feed.items.slice(0, 15)) { // Limit to 15 per source
          if (articleCount >= 50) {
            console.log('🎯 Reached target of 50 articles');
            break;
          }
          
          if (!item.link) continue;
          
          console.log(`\n📄 Processing: ${item.title}`);
          
          const articleData = await fetchAndParseArticle(item.link);
          
          if (articleData && articleData.content && articleData.content.length > 100) {
            try {
              await vectorStore.addDocument(
                uuidv4(),
                `${articleData.title}. ${articleData.content}`,
                {
                  title: articleData.title,
                  url: articleData.url,
                  source: source,
                  published: item.pubDate || new Date().toISOString(),
                  ingestedAt: articleData.ingestedAt
                }
              );
              
              articleCount++;
              console.log(`✅ Ingested article ${articleCount}: ${articleData.title}`);
              
              // Add delay to be respectful to servers
              await new Promise(resolve => setTimeout(resolve, 2000));
              
            } catch (error) {
              console.error(`❌ Failed to add document to vector store:`, error.message);
              failedArticles.push({ title: item.title, error: error.message });
            }
          } else {
            console.log('❌ Article skipped - insufficient content');
          }
        }
        
        if (articleCount >= 50) break;
        
      } catch (error) {
        console.error(`❌ Error processing source ${source}:`, error.message);
        failedArticles.push({ source, error: error.message });
      }
    }
    
    console.log(`\n🎉 Ingestion complete!`);
    console.log(`✅ Successfully processed: ${articleCount} articles`);
    console.log(`❌ Failed: ${failedArticles.length} articles`);
    
    if (failedArticles.length > 0) {
      console.log('\nFailed articles:');
      failedArticles.forEach(failed => {
        console.log(`  - ${failed.title || failed.source}: ${failed.error}`);
      });
    }
    
    // Show collection info
    try {
      const collectionInfo = await vectorStore.getCollectionInfo();
      console.log(`\n📊 Vector store info:`);
      console.log(`   Points count: ${collectionInfo.points_count}`);
    } catch (error) {
      console.log('❌ Could not get collection info:', error.message);
    }
    
  } catch (error) {
    console.error('💥 Fatal error during ingestion:', error);
    process.exit(1);
  }
}

// Run ingestion if this script is executed directly
if (require.main === module) {
  ingestNews().then(() => {
    console.log('✨ News ingestion script finished');
    process.exit(0);
  }).catch(error => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
}

module.exports = { ingestNews };