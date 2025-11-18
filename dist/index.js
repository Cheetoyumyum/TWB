"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv = __importStar(require("dotenv"));
const twitchBot_1 = require("./bot/twitchBot");
const webhook_1 = require("./webhook/webhook");
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
    const config = {
        username: process.env.TWITCH_BOT_USERNAME,
        oauthToken: process.env.TWITCH_OAUTH_TOKEN,
        channel: process.env.TWITCH_CHANNEL,
        openaiApiKey: process.env.OPENAI_API_KEY,
        dbPath: process.env.DATABASE_PATH || './data/bot.json',
    };
    console.log('🤖 Starting Twitch Engagement Bot...');
    console.log(`📺 Channel: ${config.channel}`);
    console.log(`👤 Bot: ${config.username}`);
    console.log(`💾 Database: ${config.dbPath}`);
    console.log(`🤖 AI: ${config.openaiApiKey ? 'Enabled' : 'Disabled (using fallback)'}\n`);
    // Create and start bot
    const bot = new twitchBot_1.TwitchBot(config);
    try {
        await bot.connect();
    }
    catch (error) {
        console.error('Failed to start bot:', error);
        process.exit(1);
    }
    // Start webhook server for channel points
    const port = parseInt(process.env.PORT || '3000', 10);
    const webhookServer = new webhook_1.WebhookServer(bot, port);
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
