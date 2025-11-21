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
const twitchApi_1 = require("../twitch/twitchApi");
const DEFAULT_EMOTE_NAMES = [
    'Kappa',
    'PogChamp',
    'PogU',
    'KEKW',
    'OMEGALUL',
    'LUL',
    'FeelsStrongMan',
    'FeelsBadMan',
    'FeelsGoodMan',
    'PepeHands',
    'PepeLaugh',
    'BibleThump',
    'NotLikeThis',
    'ResidentSleeper',
    '4Head',
    'HeyGuys',
    'Kreygasm',
];
class TwitchBot {
    constructor(config) {
        this.responseCooldown = new Map();
        this.activeChatters = new Map();
        this.COOLDOWN_MS = 3000;
        this.ACTIVE_CHATTER_WINDOW = 5 * 60 * 1000;
        this.AUTO_RESPONSE_COOLDOWN = 2 * 60 * 1000;
        this.lastAutoResponse = 0;
        this.botKeywords = [];
        this.emoteNames = new Set(DEFAULT_EMOTE_NAMES.map((name) => name.toLowerCase()));
        this.channel = config.channel.toLowerCase().replace('#', '');
        this.channelName = config.channel.toLowerCase().replace('#', '');
        this.broadcasterOAuthToken = config.broadcasterOAuthToken;
        this.botKeywords = this.buildBotKeywords(config.username);
        this.db = new database_1.BotDatabase(config.dbPath);
        this.sevenTV = new sevenTV_1.SevenTVService(config.seventvUserId);
        this.games = new games_1.GamesModule(this.db);
        if (config.clientId && config.broadcasterId && (config.broadcasterOAuthToken || config.oauthToken)) {
            this.twitchApi = new twitchApi_1.TwitchApiClient(config.clientId, config.broadcasterId, config.broadcasterOAuthToken || config.oauthToken);
        }
        this.actions = new actions_1.ActionsModule(this.db, this.sevenTV, this.channel, {
            createPoll: this.twitchApi
                ? (question, options, duration) => this.twitchApi.createPoll(question, options, duration)
                : undefined,
            createPrediction: this.twitchApi
                ? (title, outcomes, duration) => this.twitchApi.createPrediction(title, outcomes, duration)
                : undefined,
            sendShoutout: this.twitchApi
                ? (target) => this.twitchApi.sendShoutout(target)
                : undefined,
        });
        this.adHandler = new adHandler_1.AdHandler();
        this.chatHandler = new chatHandler_1.ChatHandler(config.openaiApiKey, this.db, this.sevenTV, this.channel, this.botKeywords, config.groqApiKey, config.huggingfaceApiKey);
        this.channelPointsHandler = new channelPoints_1.ChannelPointsHandler(this.db);
        this.commandHandler = new commands_1.CommandHandler(this.db, this.games, this.actions, this.sevenTV, this.channel, this.adHandler);
        this.actions.setTimeoutCallback((target, duration, message) => {
            this.timeoutUser(target, duration, message);
        });
        this.commandHandler.setActiveChattersCallback(() => {
            return this.getActiveChatters();
        });
        this.adHandler.setAdStartCallback((duration) => {
            const messages = this.adHandler.getAdMessages(duration);
            this.say(messages.start);
        });
        this.adHandler.setAdEndCallback(() => {
            const messages = this.adHandler.getAdMessages(0);
            this.say(messages.end);
        });
        this.loadChannelEmotes();
        this.client = new tmi_js_1.default.Client({
            options: { debug: false },
            connection: {
                reconnect: true,
                secure: true,
            },
            identity: {
                username: config.username,
                password: config.oauthToken.startsWith('oauth:')
                    ? config.oauthToken
                    : `oauth:${config.oauthToken}`,
            },
            channels: [this.channel],
        });
        this.setupEventHandlers();
    }
    setupEventHandlers() {
        this.client.on('message', async (channel, tags, message, self) => {
            if (self)
                return;
            const username = tags.username || 'unknown';
            const displayName = tags['display-name'] || username;
            const lowerMessage = message.toLowerCase();
            const upperMessage = message.toUpperCase();
            if (lowerMessage.includes('redeemed') || upperMessage.includes('DEPOSIT:')) {
                console.log(`🔍 [DEBUG] Message received: "${message}"`);
                console.log(`   From: ${displayName} (${username})`);
                console.log('   Tags:', JSON.stringify({
                    mod: tags.mod,
                    subscriber: tags.subscriber,
                    badges: tags.badges,
                    'message-type': tags['message-type'],
                    'user-type': tags['user-type'],
                }));
            }
            this.activeChatters.set(displayName.toLowerCase(), Date.now());
            const hasRedeemed = lowerMessage.includes('redeemed');
            const hasDeposit = upperMessage.includes('DEPOSIT:');
            if (hasRedeemed && hasDeposit) {
                const depositMatch = message.match(/DEPOSIT:\s*(\d+)/i);
                if (depositMatch) {
                    const depositAmount = parseInt(depositMatch[1], 10);
                    const rewardTitle = `DEPOSIT: ${depositAmount}`;
                    let redeemerName = displayName;
                    const startPattern = /^(\w+)\s+redeemed/i;
                    const startMatch = message.match(startPattern);
                    if (startMatch) {
                        redeemerName = startMatch[1];
                    }
                    else {
                        const anywherePattern = /(\w+)\s+redeemed/i;
                        const anywhereMatch = message.match(anywherePattern);
                        if (anywhereMatch) {
                            redeemerName = anywhereMatch[1];
                        }
                    }
                    console.log(`💡 Auto-detected redemption in chat: ${redeemerName} redeemed ${rewardTitle}`);
                    console.log(`   Full message: "${message}"`);
                    this.handleChannelPointsRedemption(redeemerName, rewardTitle, depositAmount);
                    return;
                }
            }
            if (message.startsWith('!')) {
                const [command, ...args] = message.slice(1).split(' ');
                const isMod = tags.mod || false;
                const isBroadcaster = tags.badges?.broadcaster === '1' || username.toLowerCase() === this.channelName.toLowerCase();
                const hasModPermissions = isMod || isBroadcaster;
                const modOnlyCommands = ['givepts', 'givepoints', 'give', 'manualdeposit', 'mdeposit'];
                const broadcasterOnlyCommands = ['deposit', 'redeem', 'ecoreset', 'reseteco'];
                if (modOnlyCommands.includes(command.toLowerCase()) && !hasModPermissions) {
                    this.say(`@${displayName} That command is only available to moderators and the streamer.`);
                    return;
                }
                if (broadcasterOnlyCommands.includes(command.toLowerCase()) && !isBroadcaster) {
                    this.say(`@${displayName} Only the streamer can use !${command.toLowerCase()} (automatic deposits handle viewers).`);
                    return;
                }
                const response = await this.commandHandler.handleCommand(displayName, command, args, {
                    isBroadcaster,
                    isMod,
                });
                if (response) {
                    await this.sendResponseLines(response);
                    return;
                }
            }
            const intent = this.chatHandler.getResponseIntent(message);
            this.learnAliasFromMessage(message, intent);
            if (intent !== 'none') {
                const isRandom = intent === 'random';
                if (!isRandom || this.canAutoRespond()) {
                    if (this.canRespond(username)) {
                        const context = {
                            username: displayName,
                            message,
                            channel: this.channel,
                            timestamp: new Date(),
                        };
                        const response = await this.chatHandler.generateResponse(context);
                        if (response) {
                            await this.sendResponseLines(response, isRandom);
                            this.updateCooldown(username);
                        }
                    }
                }
            }
        });
        this.client.on('raw_message', (messageCloned) => {
            if (messageCloned.message &&
                (messageCloned.message.toLowerCase().includes('redeemed') ||
                    messageCloned.message.toUpperCase().includes('DEPOSIT:'))) {
                console.log(`🔍 [RAW] Command: ${messageCloned.command}, Message: "${messageCloned.message}"`);
            }
        });
        this.client.on('connected', async (addr, port) => {
            console.log(`✅ Connected to Twitch at ${addr}:${port}`);
            console.log(`📺 Joined channel: #${this.channel}`);
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
    async sendResponseLines(text, isAuto = false) {
        const parts = text.split(/\n+/).map((line) => line.trim()).filter(Boolean);
        if (parts.length === 0) {
            return;
        }
        for (const line of parts) {
            const cleanedLine = this.sanitizeEmoteLine(line);
            this.say(cleanedLine);
            if (parts.length > 1) {
                await new Promise((resolve) => setTimeout(resolve, 100));
            }
        }
        if (isAuto) {
            this.lastAutoResponse = Date.now();
        }
    }
    canAutoRespond() {
        return Date.now() - this.lastAutoResponse >= this.AUTO_RESPONSE_COOLDOWN;
    }
    buildBotKeywords(username) {
        const lower = username.toLowerCase();
        const keywords = new Set([
            lower,
            `@${lower}`,
            'bot',
            'hey bot',
            'hi bot',
            'hello bot',
        ]);
        for (let len = 3; len <= Math.min(lower.length, 6); len++) {
            keywords.add(lower.slice(0, len));
        }
        return Array.from(keywords);
    }
    handleChannelPointsRedemption(username, redemptionTitle, rewardCost) {
        const result = this.channelPointsHandler.handleRedemption(username, redemptionTitle, rewardCost);
        if (result.success && result.message) {
            this.say(result.message);
        }
    }
    getDatabase() {
        return this.db;
    }
    getSevenTV() {
        return this.sevenTV;
    }
    getChannel() {
        return this.channel;
    }
    getActiveChatters() {
        const now = Date.now();
        const active = [];
        for (const [name, timestamp] of this.activeChatters.entries()) {
            if (now - timestamp < this.ACTIVE_CHATTER_WINDOW) {
                active.push(name);
            }
        }
        for (const [name, timestamp] of this.activeChatters.entries()) {
            if (now - timestamp >= this.ACTIVE_CHATTER_WINDOW) {
                this.activeChatters.delete(name);
            }
        }
        return active;
    }
    async loadChannelEmotes() {
        try {
            const emotes = await this.sevenTV.getChannelEmotes(this.channel);
            console.log(`🎭 Loaded ${emotes.length} 7TV emotes for ${this.channel}`);
            this.registerEmoteNames(emotes.map((emote) => emote.name));
        }
        catch (error) {
            console.warn('⚠️ Failed to load 7TV emotes:', error);
        }
    }
    registerEmoteNames(names) {
        names.forEach((name) => {
            const normalized = name?.trim().toLowerCase();
            if (normalized) {
                this.emoteNames.add(normalized);
            }
        });
    }
    sanitizeEmoteLine(line) {
        if (!line || this.emoteNames.size === 0) {
            return line;
        }
        return line.replace(/([A-Za-z0-9_]+)([.!?,]+)(?=\s|$)/g, (match, word, punct) => {
            if (this.isKnownEmote(word)) {
                return `${word} ${punct}`;
            }
            return match;
        });
    }
    isKnownEmote(token) {
        const normalized = token.trim().toLowerCase();
        return this.emoteNames.has(normalized);
    }
    learnAliasFromMessage(message, intent) {
        if (intent === 'none') {
            return;
        }
        const candidates = new Set();
        const leadingMatch = message.match(/^\s*([A-Za-z0-9_]{3,20})(?=[,:!?])/);
        if (leadingMatch) {
            candidates.add(leadingMatch[1]);
        }
        const words = message.split(/\s+/);
        for (const raw of words) {
            const cleaned = raw.replace(/[^A-Za-z0-9_]/g, '');
            if (!cleaned)
                continue;
            const lower = cleaned.toLowerCase();
            if (lower === this.channelName || this.chatHandler.hasAlias(lower)) {
                continue;
            }
            if (lower.startsWith('bot') || lower.endsWith('bot')) {
                candidates.add(cleaned);
            }
        }
        candidates.forEach((alias) => this.chatHandler.learnAlias(alias));
    }
    timeoutUser(target, duration, message) {
        this.client
            .timeout(this.channel, target, duration, message)
            .catch((err) => {
            console.error(`Failed to timeout ${target}:`, err);
            this.say(message);
        });
    }
    announceAdWarning(timeInSeconds) {
        const formatted = this.formatDuration(Math.max(timeInSeconds, 10));
        const warnings = [
            `🚨 Heads up! Twitch will run an ad in ${formatted}. Stretch, hydrate, don't leave!`,
            `⏰ Ad break in ${formatted}! Subscribers stay cozy, everyone else we'll see right after.`,
            `📺 Ads arriving in ${formatted}. Perfect moment to grab a snack and be back!`,
        ];
        this.say(warnings[Math.floor(Math.random() * warnings.length)]);
    }
    announceAdStarted(duration) {
        console.log(`📺 Detected scheduled ad for ~${duration}s`);
        this.adHandler.startAd(duration);
    }
    handleNewFollower(username) {
        const messages = [
            `💜 Thanks for the follow, ${username}! Welcome in!`,
            `🎉 ${username} just joined the crew! Appreciate the follow!`,
            `🙌 ${username}, you're amazing! Thanks for hitting that follow button!`,
        ];
        this.say(messages[Math.floor(Math.random() * messages.length)]);
    }
    handleNewSubscriber(username, tier, isResub, message) {
        const tierLabel = tier ? ` (Tier ${this.mapTier(tier)})` : '';
        const verb = isResub ? 'resubbed' : 'subscribed';
        const responses = [
            `🔥 ${username} just ${verb}${tierLabel}! Thank you for the love!`,
            `💜 Massive thanks to ${username} for the ${verb}${tierLabel}! Enjoy the emotes!`,
            `🎁 ${username} ${verb}! Welcome to the comfy club!`,
        ];
        this.say(responses[Math.floor(Math.random() * responses.length)]);
        if (message) {
            this.say(`💬 ${username}'s sub message: "${message}"`);
        }
    }
    handleGiftSubscription(gifter, recipientCount, isAnonymous) {
        const name = isAnonymous ? 'Someone generous' : gifter;
        const messages = [
            `🎁 ${name} just gifted ${recipientCount} sub(s)! Thank you for sharing the love!`,
            `💜 Huge thanks to ${name} for the ${recipientCount} gifted sub(s)!`,
            `🔥 ${name} dropping ${recipientCount} gifts! Chat, show them some hype!`,
        ];
        this.say(messages[Math.floor(Math.random() * messages.length)]);
    }
    formatDuration(totalSeconds) {
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = Math.max(totalSeconds % 60, 0);
        if (minutes > 0) {
            return `${minutes}m ${seconds}s`;
        }
        return `${seconds}s`;
    }
    mapTier(tier) {
        switch (tier) {
            case '1000':
                return '1';
            case '2000':
                return '2';
            case '3000':
                return '3';
            default:
                return tier;
        }
    }
}
exports.TwitchBot = TwitchBot;
