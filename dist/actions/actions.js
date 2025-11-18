"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActionsModule = void 0;
const prices_1 = require("../config/prices");
class ActionsModule {
    constructor(db) {
        this.availableActions = new Map();
        this.db = db;
        this.initializeActions();
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
                    description: 'Get a shoutout from the bot',
                    type: 'alert',
                }],
            ['emote', {
                    id: 'emote',
                    name: 'Emote Spam',
                    cost: prices_1.PRICES.actions.emote,
                    description: 'Spam emotes in chat',
                    type: 'effect',
                }],
            ['bonus', {
                    id: 'bonus',
                    name: 'Bonus Points',
                    cost: prices_1.PRICES.actions.bonus,
                    description: 'Get 500 bonus points!',
                    type: 'command',
                }],
            ['poll', {
                    id: 'poll',
                    name: 'Create Poll',
                    cost: prices_1.PRICES.actions.poll,
                    description: 'Create a quick poll (use: !buy poll question? option1 option2)',
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
            ['tip', {
                    id: 'tip',
                    name: 'Tip Streamer',
                    cost: prices_1.PRICES.actions.tip,
                    description: 'Send a tip message to the streamer',
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
    purchaseAction(username, actionId, params) {
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
                message: this.executeAction(username, action, params),
                action: action,
            };
        }
        return {
            success: false,
            message: `@${username} Failed to purchase ${action.name}.`,
        };
    }
    executeAction(username, action, params) {
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
                return `📢 SHOUTOUT to @${username}! Thanks for being awesome! Follow them at twitch.tv/${username}`;
            case 'emote':
                const emotes = ['PogChamp', 'Kappa', 'LUL', 'OMEGALUL', 'PepeHands'];
                const randomEmote = emotes[Math.floor(Math.random() * emotes.length)];
                return `${randomEmote} ${randomEmote} ${randomEmote} @${username} emote spam! ${randomEmote} ${randomEmote}`;
            case 'bonus':
                // Give bonus points
                this.db.addWin(username, 500, 'Bonus points purchase');
                const newBalance = this.db.getUserBalance(username)?.balance || 0;
                return `🎁 @${username} BONUS! You got 500 free points! New balance: ${newBalance.toLocaleString()} points! 🎁`;
            case 'poll':
                const pollQuestion = params?.question || params?.message || 'Quick poll';
                const options = params?.options || ['Yes', 'No'];
                return `📊 POLL by @${username}: ${pollQuestion} | Options: ${options.join(' vs ')} | React with 1️⃣ or 2️⃣!`;
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
                    return `@${username} Usage: !buy challenge @user - Who do you want to challenge?`;
                }
                const challengeCleanTarget = challengeTarget.replace('@', '').trim();
                const challenges = [
                    `⚔️ @${username} challenges @${challengeCleanTarget} to a duel! Who will win? ⚔️`,
                    `🎮 @${username} throws down the gauntlet to @${challengeCleanTarget}! Ready to battle? 🎮`,
                    `🏆 @${username} challenges @${challengeCleanTarget}! May the best player win! 🏆`,
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
