import * as dotenv from 'dotenv';
import { TwitchBot } from './bot/twitchBot';
import { WebhookServer } from './webhook/webhook';

// Load environment variables
dotenv.config();

async function main() {
  // Validate required environment variables
  const requiredVars = ['TWITCH_BOT_USERNAME', 'TWITCH_OAUTH_TOKEN', 'TWITCH_CHANNEL'];
  const missing = requiredVars.filter((v) => !process.env[v]);

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach((v) => console.error(`   - ${v}`));
    console.error('\nPlease check your .env file.');
    process.exit(1);
  }

  // Extract 7TV user ID from URL if provided, or use direct ID
  let seventvUserId: string | undefined = process.env.SEVENTV_USER_ID;
  if (seventvUserId) {
    // If it's a full URL, extract the user ID
    if (seventvUserId.includes('7tv.app/users/')) {
      const match = seventvUserId.match(/7tv\.app\/users\/([^\/\s]+)/);
      if (match) {
        seventvUserId = match[1];
      }
    }
  }

  const config = {
    username: process.env.TWITCH_BOT_USERNAME!,
    oauthToken: process.env.TWITCH_OAUTH_TOKEN!,
    channel: process.env.TWITCH_CHANNEL!,
    openaiApiKey: process.env.OPENAI_API_KEY,
    groqApiKey: process.env.GROQ_API_KEY,
    huggingfaceApiKey: process.env.HUGGINGFACE_API_KEY,
    dbPath: process.env.DATABASE_PATH || './data/bot.json',
    seventvUserId: seventvUserId,
  };

  // Determine AI provider status
  let aiStatus = 'Disabled (using fallback)';
  if (config.openaiApiKey) {
    aiStatus = 'Enabled (OpenAI)';
  } else if (config.groqApiKey) {
    aiStatus = 'Enabled (Groq - Free)';
  } else if (config.huggingfaceApiKey) {
    aiStatus = 'Enabled (Hugging Face - Free)';
  }

  console.log('🤖 Starting Twitch Engagement Bot...');
  console.log(`📺 Channel: ${config.channel}`);
  console.log(`👤 Bot: ${config.username}`);
  console.log(`💾 Database: ${config.dbPath}`);
  console.log(`🤖 AI: ${aiStatus}`);
  if (seventvUserId) {
    console.log(`🎭 7TV User ID: ${seventvUserId}`);
  }
  console.log('');

  // Create and start bot
  const bot = new TwitchBot(config);

  try {
    await bot.connect();
  } catch (error) {
    console.error('Failed to start bot:', error);
    process.exit(1);
  }

  // Start webhook server for channel points
  const port = parseInt(process.env.PORT || '3000', 10);
  const webhookServer = new WebhookServer(bot, port);
  webhookServer.start();

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down...');
    await bot.disconnect();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\n🛑 Shutting down...');
    await bot.disconnect();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

