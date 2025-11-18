"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SevenTVService = void 0;
const axios_1 = __importDefault(require("axios"));
class SevenTVService {
    constructor() {
        this.baseURL = 'https://7tv.io/v3';
        this.channelEmotes = new Map();
        this.emoteCache = new Map();
        this.cacheExpiry = new Map();
        this.CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
    }
    /**
     * Get user ID from username
     */
    async getUserId(username) {
        try {
            const response = await axios_1.default.get(`${this.baseURL}/users/twitch/${username.toLowerCase()}`);
            return response.data?.id || null;
        }
        catch (error) {
            if (error.response?.status === 404) {
                return null;
            }
            console.error(`Error fetching 7TV user ID for ${username}:`, error.message);
            return null;
        }
    }
    /**
     * Get all emotes for a channel
     */
    async getChannelEmotes(channelName) {
        // Check cache
        const cacheKey = channelName.toLowerCase();
        const cached = this.channelEmotes.get(cacheKey);
        const expiry = this.cacheExpiry.get(cacheKey) || 0;
        if (cached && Date.now() < expiry) {
            return cached;
        }
        try {
            // Get user ID first
            const userId = await this.getUserId(channelName);
            if (!userId) {
                console.warn(`7TV: User ${channelName} not found or has no 7TV account`);
                return [];
            }
            // Get user's emote sets
            const userResponse = await axios_1.default.get(`${this.baseURL}/users/${userId}`);
            const emoteSets = userResponse.data?.emote_sets || [];
            const allEmotes = [];
            // Fetch emotes from each set
            for (const setId of emoteSets) {
                try {
                    const setResponse = await axios_1.default.get(`${this.baseURL}/emote-sets/${setId}`);
                    const emotes = setResponse.data?.emotes || [];
                    allEmotes.push(...emotes);
                }
                catch (error) {
                    console.warn(`Error fetching 7TV emote set ${setId}:`, error.message);
                }
            }
            // Cache the results
            this.channelEmotes.set(cacheKey, allEmotes);
            this.cacheExpiry.set(cacheKey, Date.now() + this.CACHE_DURATION);
            // Also cache individual emotes
            allEmotes.forEach((emote) => {
                this.emoteCache.set(emote.name.toLowerCase(), emote);
            });
            return allEmotes;
        }
        catch (error) {
            console.error(`Error fetching 7TV emotes for ${channelName}:`, error.message);
            return [];
        }
    }
    /**
     * Get a specific emote by name
     */
    async getEmote(channelName, emoteName) {
        const emotes = await this.getChannelEmotes(channelName);
        const emote = emotes.find((e) => e.name.toLowerCase() === emoteName.toLowerCase());
        return emote || null;
    }
    /**
     * Search emotes by name (fuzzy search)
     */
    async searchEmotes(channelName, query) {
        const emotes = await this.getChannelEmotes(channelName);
        const lowerQuery = query.toLowerCase();
        return emotes.filter((emote) => emote.name.toLowerCase().includes(lowerQuery));
    }
    /**
     * Get random emote from channel
     */
    async getRandomEmote(channelName) {
        const emotes = await this.getChannelEmotes(channelName);
        if (emotes.length === 0)
            return null;
        return emotes[Math.floor(Math.random() * emotes.length)];
    }
    /**
     * Get popular/commonly used emotes
     */
    async getPopularEmotes(channelName, limit = 10) {
        const emotes = await this.getChannelEmotes(channelName);
        // Return first N emotes (7TV doesn't provide usage stats, so we'll use order)
        return emotes.slice(0, limit);
    }
    /**
     * Format emote for chat (returns emote name that Twitch will render)
     */
    formatEmote(emote) {
        return emote.name;
    }
    /**
     * Clear cache for a channel
     */
    clearCache(channelName) {
        if (channelName) {
            const key = channelName.toLowerCase();
            this.channelEmotes.delete(key);
            this.cacheExpiry.delete(key);
        }
        else {
            this.channelEmotes.clear();
            this.cacheExpiry.clear();
            this.emoteCache.clear();
        }
    }
    /**
     * Check if a string is an emote name
     */
    isEmoteName(channelName, text) {
        const emotes = this.channelEmotes.get(channelName.toLowerCase());
        if (!emotes)
            return false;
        return emotes.some((e) => e.name.toLowerCase() === text.toLowerCase());
    }
}
exports.SevenTVService = SevenTVService;
