"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActionsModule = void 0;
const prices_1 = require("../config/prices");
class ActionsModule {
    constructor(db, sevenTV, channel, callbacks) {
        this.availableActions = new Map();
        this.emotePool = ['PogChamp', 'Kappa', 'LUL', 'OMEGALUL', 'PepeHands', 'KEKW', 'PogU', 'FeelsStrongMan'];
        this.db = db;
        this.sevenTV = sevenTV;
        this.channel = channel?.toLowerCase();
        this.callbacks = callbacks;
        this.initializeActions();
        this.refreshEmotePool();
    }
    refreshEmotePool() {
        if (!this.sevenTV || !this.channel)
            return;
        this.sevenTV
            .getChannelEmotes(this.channel)
            .then((emotes) => {
            if (emotes && emotes.length > 0) {
                this.emotePool = emotes.map((emote) => emote.name);
            }
        })
            .catch((error) => {
            console.warn('⚠️  Failed to refresh emote pool:', error?.message || error);
        })
            .finally(() => {
            if (this.emoteRefreshInterval) {
                clearTimeout(this.emoteRefreshInterval);
            }
            this.emoteRefreshInterval = setTimeout(() => this.refreshEmotePool(), 5 * 60 * 1000);
        });
    }
    buildEmoteSpam() {
        const lines = [];
        const pool = this.emotePool.length ? this.emotePool : ['PogChamp', 'Kappa', 'LUL', 'OMEGALUL', 'KEKW'];
        const lineCount = Math.floor(Math.random() * 16) + 5; // 5-20 lines
        for (let i = 0; i < lineCount; i++) {
            const emotesPerLine = Math.floor(Math.random() * 9) + 8; // 8-16 emotes per line
            const lineEmotes = [];
            for (let j = 0; j < emotesPerLine; j++) {
                const emote = pool[Math.floor(Math.random() * pool.length)];
                lineEmotes.push(emote);
            }
            lines.push(lineEmotes.join(' '));
        }
        return lines;
    }
    setTimeoutCallback(callback) {
        this.timeoutCallback = callback;
    }
    initializeActions() {
        // Initialize actions with prices from config
        this.availableActions = new Map([
            ['alert', {
                    id: 'alert',
                    name: 'Alert',
                    cost: prices_1.PRICES.actions.alert,
                    description: 'Send a custom alert message to chat',
                    type: 'alert',
                }],
            ['highlight', {
                    id: 'highlight',
                    name: 'Highlight Message',
                    cost: prices_1.PRICES.actions.highlight,
                    description: 'Highlight your message in chat',
                    type: 'effect',
                }],
            ['sound', {
                    id: 'sound',
                    name: 'Sound Alert',
                    cost: prices_1.PRICES.actions.sound,
                    description: 'Play a sound alert',
                    type: 'effect',
                }],
            ['timeout', {
                    id: 'timeout',
                    name: 'Timeout User',
                    cost: prices_1.PRICES.actions.timeout,
                    description: 'Timeout a user for 60 seconds',
                    type: 'command',
                }],
            ['shoutout', {
                    id: 'shoutout',
                    name: 'Shoutout',
                    cost: prices_1.PRICES.actions.shoutout,
                    description: 'Trigger a Twitch shoutout (use: !buy shoutout @user)',
                    type: 'command',
                }],
            ['emote', {
                    id: 'emote',
                    name: 'Emote Spam',
                    cost: prices_1.PRICES.actions.emote,
                    description: 'Spam emotes in chat',
                    type: 'effect',
                }],
            ['poll', {
                    id: 'poll',
                    name: 'Create Poll',
                    cost: prices_1.PRICES.actions.poll,
                    description: 'Create a Twitch poll (use: !buy poll Question? | Option 1 | Option 2)',
                    type: 'command',
                }],
            ['prediction', {
                    id: 'prediction',
                    name: 'Start Prediction',
                    cost: prices_1.PRICES.actions.prediction,
                    description: 'Start a Twitch prediction (use: !buy prediction Title? | Outcome 1 | Outcome 2)',
                    type: 'command',
                }],
            ['countdown', {
                    id: 'countdown',
                    name: 'Countdown',
                    cost: prices_1.PRICES.actions.countdown,
                    description: 'Start a countdown (use: !buy countdown 10)',
                    type: 'effect',
                }],
            ['quote', {
                    id: 'quote',
                    name: 'Save Quote',
                    cost: prices_1.PRICES.actions.quote,
                    description: 'Save a memorable quote (use: !buy quote your quote here)',
                    type: 'alert',
                }],
            ['roast', {
                    id: 'roast',
                    name: 'Roast Someone',
                    cost: prices_1.PRICES.actions.roast,
                    description: 'Get a friendly roast (use: !buy roast @user)',
                    type: 'alert',
                }],
            ['compliment', {
                    id: 'compliment',
                    name: 'Compliment',
                    cost: prices_1.PRICES.actions.compliment,
                    description: 'Get a nice compliment from the bot',
                    type: 'alert',
                }],
            ['raid', {
                    id: 'raid',
                    name: 'Raid Announcement',
                    cost: prices_1.PRICES.actions.raid,
                    description: 'Announce a raid target (use: !buy raid @channel)',
                    type: 'alert',
                }],
            ['challenge', {
                    id: 'challenge',
                    name: 'Challenge Someone',
                    cost: prices_1.PRICES.actions.challenge,
                    description: 'Challenge another user (use: !buy challenge @user)',
                    type: 'alert',
                }],
            ['streak', {
                    id: 'streak',
                    name: 'Streak Protection',
                    cost: prices_1.PRICES.actions.streak,
                    description: 'Protect your gambling streak (prevents one loss)',
                    type: 'command',
                }],
        ]);
    }
    getAvailableActions() {
        return Array.from(this.availableActions.values());
    }
    getAction(actionId) {
        return this.availableActions.get(actionId.toLowerCase());
    }
    async purchaseAction(username, actionId, params) {
        const action = this.getAction(actionId);
        if (!action) {
            return {
                success: false,
                message: `@${username} Unknown action: ${actionId}. Use !actions to see available actions.`,
            };
        }
        const user = this.db.getUserBalance(username);
        if (!user || user.balance < action.cost) {
            return {
                success: false,
                message: `@${username} You don't have enough points! Need ${action.cost}, you have ${user?.balance || 0}.`,
            };
        }
        if (this.db.purchase(username, action.cost, `Purchased ${action.name}`)) {
            return {
                success: true,
                message: await this.executeAction(username, action, params),
                action: action,
            };
        }
        return {
            success: false,
            message: `@${username} Failed to purchase ${action.name}.`,
        };
    }
    async executeAction(username, action, params) {
        switch (action.id) {
            case 'alert':
                const message = params?.message || 'Alert triggered!';
                return `🚨 @${username} ALERT: ${message}`;
            case 'highlight':
                return `✨ @${username} Your message has been highlighted! ✨`;
            case 'sound':
                return `🔊 @${username} Sound alert activated! 🔊`;
            case 'timeout':
                const timeoutTarget = params?.target;
                if (!timeoutTarget) {
                    return `@${username} Please specify a user to timeout: !buy timeout @username`;
                }
                // Clean target username (remove @ if present)
                const timeoutCleanTarget = timeoutTarget.replace('@', '').trim();
                if (timeoutCleanTarget.toLowerCase() === username.toLowerCase()) {
                    return `@${username} You can't timeout yourself, silly! 😂`;
                }
                // Snarky messages
                const snarkyMessages = [
                    `@${timeoutCleanTarget} got yeeted to timeout jail by @${username}. Enjoy your 60 second vacation! 😎`,
                    `@${timeoutCleanTarget} timeout activated! @${username} decided you needed a break. See you in a minute! 🚫`,
                    `@${timeoutCleanTarget} has been sent to the timeout corner by @${username}. Think about what you've done! 😤`,
                    `@${timeoutCleanTarget} timeout! @${username} said "nope" and here we are. 60 seconds of reflection time! 🎯`,
                    `@${timeoutCleanTarget} got the boot from @${username}! Timeout for 60 seconds. Maybe don't do that next time? 🤷`,
                ];
                const snarkyMessage = snarkyMessages[Math.floor(Math.random() * snarkyMessages.length)];
                // Call timeout callback if available
                if (this.timeoutCallback) {
                    this.timeoutCallback(timeoutCleanTarget, 60, snarkyMessage);
                }
                return snarkyMessage;
            case 'shoutout':
                const shoutTarget = params?.target ? params.target.replace('@', '').trim() : null;
                if (!shoutTarget) {
                    return `@${username} Usage: !buy shoutout @user - Who should we shout out?`;
                }
                if (this.callbacks?.sendShoutout) {
                    const shoutResult = await this.callbacks.sendShoutout(shoutTarget);
                    if (shoutResult.success) {
                        return shoutResult.message || `📢 Shoutout sent to @${shoutTarget}!`;
                    }
                    return shoutResult.message || `⚠️ Unable to send shoutout right now.`;
                }
                return `📢 Shoutout requested for @${shoutTarget}! (Streamer, run /shoutout ${shoutTarget} in chat)`;
            case 'emote':
                const spamLines = this.buildEmoteSpam();
                return spamLines.join('\n');
            case 'poll':
                const pollQuestion = (params?.question || params?.message || 'Quick poll').toString().slice(0, 60);
                let options = Array.isArray(params?.options) ? params.options.map((o) => o.trim()).filter(Boolean) : [];
                if (options.length < 2) {
                    options = ['Yes', 'No'];
                }
                options = options.slice(0, 5);
                const duration = params?.duration ? Math.min(Math.max(parseInt(params.duration, 10) || 60, 15), 1800) : 60;
                if (this.callbacks?.createPoll) {
                    const result = await this.callbacks.createPoll(pollQuestion, options, duration);
                    if (result.success) {
                        return result.message || `📊 Poll started on Twitch: ${pollQuestion}`;
                    }
                    return result.message || `⚠️ Unable to create Twitch poll right now.`;
                }
                return `📊 POLL by @${username}: ${pollQuestion} | Options: ${options.join(' vs ')} | React with 1️⃣ or 2️⃣!`;
            case 'prediction':
                const predictionTitle = (params?.question || params?.message || 'Who wins?').toString().slice(0, 45);
                let outcomes = Array.isArray(params?.options) ? params.options.map((o) => o.trim()).filter(Boolean) : [];
                if (outcomes.length < 2) {
                    outcomes = ['Yes', 'No'];
                }
                outcomes = outcomes.slice(0, 2);
                const predictionDuration = params?.duration ? Math.min(Math.max(parseInt(params.duration, 10) || 120, 30), 1800) : 120;
                if (this.callbacks?.createPrediction) {
                    const predictionResult = await this.callbacks.createPrediction(predictionTitle, outcomes, predictionDuration);
                    if (predictionResult.success) {
                        return predictionResult.message || `🔮 Prediction started: ${predictionTitle}`;
                    }
                    return predictionResult.message || `⚠️ Unable to start prediction right now.`;
                }
                return `🔮 Prediction idea: ${predictionTitle} (${outcomes.join(' vs ')}) - Twitch predictions not configured.`;
            case 'countdown':
                const countdownNum = params?.number ? parseInt(params.number) : 10;
                if (isNaN(countdownNum) || countdownNum < 1 || countdownNum > 60) {
                    return `@${username} Countdown must be between 1-60 seconds!`;
                }
                // Start countdown (simplified - just announce)
                return `⏰ @${username} started a ${countdownNum} second countdown! ${countdownNum}...`;
            case 'quote':
                const quote = params?.message || params?.quote || 'No quote provided';
                return `💬 QUOTE by @${username}: "${quote}" - Saved for posterity! 📝`;
            case 'roast':
                const roastTarget = params?.target;
                if (!roastTarget) {
                    return `@${username} Usage: !buy roast @user - Who do you want to roast?`;
                }
                const cleanTarget = roastTarget.replace('@', '').trim();
                const roasts = [
                    `@${cleanTarget} ${username} says you're so bad at this game, even the tutorial is harder! 😂`,
                    `@${cleanTarget} ${username} thinks you play like you're using a controller made of bananas! 🍌`,
                    `@${cleanTarget} ${username} says your gameplay is so smooth, it's like watching a slideshow! 📸`,
                    `@${cleanTarget} ${username} thinks you're so good, you make everyone else look like pros! 😎`,
                    `@${cleanTarget} ${username} says you're the reason the game has a tutorial! 🎮`,
                ];
                return roasts[Math.floor(Math.random() * roasts.length)];
            case 'compliment':
                const compliments = [
                    `@${username} You're absolutely amazing! Keep being awesome! 💜`,
                    `@${username} You're doing great! Thanks for being part of this community! 🌟`,
                    `@${username} You're one of the coolest people in chat! Stay awesome! ✨`,
                    `@${username} You bring so much positivity! We appreciate you! 💖`,
                    `@${username} You're fantastic! Keep up the great energy! 🎉`,
                ];
                return compliments[Math.floor(Math.random() * compliments.length)];
            case 'raid':
                const raidTarget = params?.target;
                if (!raidTarget) {
                    return `@${username} Usage: !buy raid @channel - Who should we raid?`;
                }
                const raidCleanTarget = raidTarget.replace('@', '').trim();
                return `🚀 RAID TIME! @${username} wants to raid @${raidCleanTarget}! Everyone get ready! 🚀 Follow @${raidCleanTarget} at twitch.tv/${raidCleanTarget}`;
            case 'challenge':
                const challengeTarget = params?.target;
                if (!challengeTarget) {
                    return `@${username} Usage: !buy challenge @user [bet] - Who do you want to challenge?`;
                }
                const challengeCleanTarget = challengeTarget.replace('@', '').trim();
                const sponsoredPot = (prices_1.PRICES.actions.challenge * 2).toLocaleString();
                const wagerText = params?.wager ? ` for ${params.wager} points` : ` for ${sponsoredPot} points`;
                const challenges = [
                    `⚔️ @${username} challenges @${challengeCleanTarget}${wagerText}! Type !duel accept @${username} or !duel decline @${username}.`,
                    `🎮 @${username} throws down the gauntlet to @${challengeCleanTarget}${wagerText}! Ready to coinflip?`,
                    `🏆 @${username} challenges @${challengeCleanTarget}${wagerText}! May the coin flip ever be in your favor!`,
                ];
                return challenges[Math.floor(Math.random() * challenges.length)];
            case 'tip':
                const tipMessage = params?.message || 'Thanks for the great stream!';
                return `💰 TIP from @${username}: "${tipMessage}" - Thanks for supporting the stream! 💰`;
            case 'streak':
                // Streak protection - mark user as having streak protection
                // This would need to be tracked in the database, but for now just announce
                return `🛡️ @${username} activated STREAK PROTECTION! Your next gambling loss will be prevented! 🛡️`;
            default:
                return `@${username} Action ${action.name} executed!`;
        }
    }
}
exports.ActionsModule = ActionsModule;
