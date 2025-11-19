"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TwitchBot = void 0;
const tmi_js_1 = __importDefault(require("tmi.js"));
const database_1 = require("../database/database");
const chatHandler_1 = require("../ai/chatHandler");
const channelPoints_1 = require("../channelPoints/channelPoints");
const commands_1 = require("../commands/commands");
const games_1 = require("../games/games");
const actions_1 = require("../actions/actions");
const sevenTV_1 = require("../emotes/sevenTV");
const adHandler_1 = require("../ads/adHandler");
class TwitchBot {
    constructor(config) {
        this.responseCooldown = new Map();
        this.activeChatters = new Map(); // username -> last chat timestamp
        this.COOLDOWN_MS = 3000; // 3 seconds between responses per user
        this.ACTIVE_CHATTER_WINDOW = 5 * 60 * 1000; // 5 minutes
        this.channel = config.channel.toLowerCase().replace('#', '');
        this.channelName = config.channel.toLowerCase().replace('#', '');
        // Initialize database
        this.db = new database_1.BotDatabase(config.dbPath);
        // Initialize modules
        this.games = new games_1.GamesModule(this.db);
        this.actions = new actions_1.ActionsModule(this.db);
        this.sevenTV = new sevenTV_1.SevenTVService(config.seventvUserId);
        this.adHandler = new adHandler_1.AdHandler();
        this.chatHandler = new chatHandler_1.ChatHandler(config.openaiApiKey, this.db, this.sevenTV, this.channel, config.groqApiKey, config.huggingfaceApiKey);
        this.channelPointsHandler = new channelPoints_1.ChannelPointsHandler(this.db);
        this.commandHandler = new commands_1.CommandHandler(this.db, this.games, this.actions, this.sevenTV, this.channel, this.adHandler);
        // Set up callbacks
        this.actions.setTimeoutCallback((target, duration, message) => {
            this.timeoutUser(target, duration, message);
        });
        this.commandHandler.setActiveChattersCallback(() => {
            return this.getActiveChatters();
        });
        // Set up ad callbacks
        this.adHandler.setAdStartCallback((duration) => {
            const messages = this.adHandler.getAdMessages(duration);
            this.say(messages.start);
        });
        this.adHandler.setAdEndCallback(() => {
            const messages = this.adHandler.getAdMessages(0);
            this.say(messages.end);
        });
        // Preload channel emotes
        this.loadChannelEmotes();
        // Initialize Twitch client
        this.client = new tmi_js_1.default.Client({
            options: { debug: false },
            connection: {
                reconnect: true,
                secure: true,
            },
            identity: {
                username: config.username,
                password: config.oauthToken.startsWith('oauth:') ? config.oauthToken : `oauth:${config.oauthToken}`,
            },
            channels: [this.channel],
        });
        this.setupEventHandlers();
    }
    setupEventHandlers() {
        // Listen to ALL messages including system messages
        this.client.on('message', async (channel, tags, message, self) => {
            if (self)
                return; // Ignore bot's own messages
            const username = tags.username || 'unknown';
            const displayName = tags['display-name'] || username;
            // Log ALL messages that contain "redeemed" or "DEPOSIT" for debugging
            const lowerMessage = message.toLowerCase();
            const upperMessage = message.toUpperCase();
            if (lowerMessage.includes('redeemed') || upperMessage.includes('DEPOSIT:')) {
                console.log(`🔍 [DEBUG] Message received: "${message}"`);
                console.log(`   From: ${displayName} (${username})`);
                console.log(`   Tags:`, JSON.stringify({
                    mod: tags.mod,
                    subscriber: tags.subscriber,
                    badges: tags.badges,
                    'message-type': tags['message-type'],
                    'user-type': tags['user-type']
                }));
            }
            // Track active chatters (for rain command)
            this.activeChatters.set(displayName.toLowerCase(), Date.now());
            // Check for channel point redemption messages in chat (fallback detection)
            // Twitch shows redemption messages like "Username redeemed DEPOSIT: 10000"
            // This is a fallback - webhooks are the proper way, but this catches chat messages
            // Very flexible pattern matching - check if message contains both "redeemed" and "DEPOSIT:"
            const hasRedeemed = lowerMessage.includes('redeemed');
            const hasDeposit = upperMessage.includes('DEPOSIT:');
            if (hasRedeemed && hasDeposit) {
                // Extract the deposit amount from anywhere in the message
                const depositMatch = message.match(/DEPOSIT:\s*(\d+)/i);
                if (depositMatch) {
                    const depositAmount = parseInt(depositMatch[1]);
                    const rewardTitle = `DEPOSIT: ${depositAmount}`;
                    // Try to extract username - could be at start of message or anywhere
                    let redeemerName = displayName; // Default to message sender
                    // Pattern 1: "Username redeemed DEPOSIT: X" at start
                    const startPattern = /^(\w+)\s+redeemed/i;
                    const startMatch = message.match(startPattern);
                    if (startMatch) {
                        redeemerName = startMatch[1];
                    }
                    else {
                        // Pattern 2: "Username redeemed" anywhere
                        const anywherePattern = /(\w+)\s+redeemed/i;
                        const anywhereMatch = message.match(anywherePattern);
                        if (anywhereMatch) {
                            redeemerName = anywhereMatch[1];
                        }
                    }
                    console.log(`💡 Auto-detected redemption in chat: ${redeemerName} redeemed ${rewardTitle}`);
                    console.log(`   Full message: "${message}"`);
                    this.handleChannelPointsRedemption(redeemerName, rewardTitle, depositAmount);
                    return; // Don't process as regular command
                }
            }
            // Handle commands
            if (message.startsWith('!')) {
                const [command, ...args] = message.slice(1).split(' ');
                // Check for mod-only commands
                const isMod = tags.mod || false;
                const isBroadcaster = tags.badges?.broadcaster === '1' || username.toLowerCase() === this.channelName.toLowerCase();
                const hasModPermissions = isMod || isBroadcaster;
                // Restrict certain commands to mods/streamer
                const modOnlyCommands = ['givepts', 'givepoints', 'give', 'manualdeposit', 'mdeposit'];
                if (modOnlyCommands.includes(command.toLowerCase()) && !hasModPermissions) {
                    this.say(`@${displayName} That command is only available to moderators and the streamer.`);
                    return;
                }
                const response = await this.commandHandler.handleCommand(displayName, command, args);
                if (response) {
                    this.say(response);
                    return;
                }
            }
            // Handle AI chat responses
            if (this.chatHandler.shouldRespond(message)) {
                if (this.canRespond(username)) {
                    const context = {
                        username: displayName,
                        message: message,
                        channel: this.channel,
                        timestamp: new Date(),
                    };
                    const response = await this.chatHandler.generateResponse(context);
                    if (response) {
                        this.say(response);
                        this.updateCooldown(username);
                    }
                }
            }
        });
        // Listen for all raw messages (for debugging)
        this.client.on('raw_message', (messageCloned) => {
            // Log redemption-related raw messages
            if (messageCloned.message && (messageCloned.message.toLowerCase().includes('redeemed') ||
                messageCloned.message.toUpperCase().includes('DEPOSIT:'))) {
                console.log(`🔍 [RAW] Command: ${messageCloned.command}, Message: "${messageCloned.message}"`);
            }
        });
        this.client.on('connected', async (addr, port) => {
            console.log(`✅ Connected to Twitch at ${addr}:${port}`);
            console.log(`📺 Joined channel: #${this.channel}`);
            // Load emotes after connection
            await this.loadChannelEmotes();
        });
        this.client.on('disconnected', (reason) => {
            console.log(`❌ Disconnected: ${reason}`);
        });
        this.client.on('reconnect', () => {
            console.log('🔄 Reconnecting...');
        });
    }
    canRespond(username) {
        const lastResponse = this.responseCooldown.get(username.toLowerCase());
        if (!lastResponse)
            return true;
        return Date.now() - lastResponse > this.COOLDOWN_MS;
    }
    updateCooldown(username) {
        this.responseCooldown.set(username.toLowerCase(), Date.now());
    }
    async connect() {
        try {
            await this.client.connect();
        }
        catch (error) {
            console.error('Failed to connect to Twitch:', error);
            throw error;
        }
    }
    async disconnect() {
        await this.client.disconnect();
        this.db.close();
    }
    say(message) {
        this.client.say(this.channel, message).catch((err) => {
            console.error('Error sending message:', err);
        });
    }
    // Handle channel points redemption (called from webhook)
    handleChannelPointsRedemption(username, redemptionTitle, rewardCost) {
        const result = this.channelPointsHandler.handleRedemption(username, redemptionTitle, rewardCost);
        if (result.success && result.message) {
            this.say(result.message);
        }
    }
    // Get database instance for external access if needed
    getDatabase() {
        return this.db;
    }
    // Get 7TV service instance
    getSevenTV() {
        return this.sevenTV;
    }
    // Get channel name
    getChannel() {
        return this.channel;
    }
    // Get active chatters (last 5 minutes)
    getActiveChatters() {
        const now = Date.now();
        const active = [];
        for (const [username, timestamp] of this.activeChatters.entries()) {
            if (now - timestamp < this.ACTIVE_CHATTER_WINDOW) {
                active.push(username);
            }
        }
        // Clean up old entries
        for (const [username, timestamp] of this.activeChatters.entries()) {
            if (now - timestamp >= this.ACTIVE_CHATTER_WINDOW) {
                this.activeChatters.delete(username);
            }
        }
        return active;
    }
    // Load channel emotes from 7TV
    async loadChannelEmotes() {
        try {
            const emotes = await this.sevenTV.getChannelEmotes(this.channel);
            console.log(`🎭 Loaded ${emotes.length} 7TV emotes for ${this.channel}`);
        }
        catch (error) {
            console.warn(`⚠️  Failed to load 7TV emotes:`, error);
        }
    }
    // Timeout a user
    timeoutUser(target, duration, message) {
        this.client.timeout(this.channel, target, duration, message)
            .then(() => {
            // Timeout successful, message already sent by actions module
        })
            .catch((err) => {
            console.error(`Failed to timeout ${target}:`, err);
            // Still send the snarky message even if timeout fails
            this.say(message);
        });
    }
}
exports.TwitchBot = TwitchBot;
