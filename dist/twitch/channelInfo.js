"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChannelInfoService = void 0;
const axios_1 = __importDefault(require("axios"));
class ChannelInfoService {
    constructor(options) {
        this.cacheTime = 0;
        this.clientId = options.clientId;
        this.oauthToken = options.oauthToken;
        this.broadcasterId = options.broadcasterId;
        this.cacheMs = options.cacheMs ?? 5 * 60 * 1000; // default 5 minutes
    }
    async getChannelInfo(forceRefresh = false) {
        if (!forceRefresh && this.cachedInfo && Date.now() - this.cacheTime < this.cacheMs) {
            return this.cachedInfo;
        }
        try {
            const response = await axios_1.default.get('https://api.twitch.tv/helix/channels', {
                headers: {
                    'Client-Id': this.clientId,
                    Authorization: `Bearer ${this.oauthToken}`,
                },
                params: {
                    broadcaster_id: this.broadcasterId,
                },
            });
            const data = response.data?.data?.[0];
            if (!data) {
                return null;
            }
            this.cachedInfo = {
                id: data.broadcaster_id,
                broadcasterLogin: data.broadcaster_login,
                broadcasterName: data.broadcaster_name,
                gameId: data.game_id,
                gameName: data.game_name,
                title: data.title,
            };
            this.cacheTime = Date.now();
            return this.cachedInfo;
        }
        catch (error) {
            console.warn('⚠️ Failed to fetch channel info:', error.response?.status || error.message);
            return null;
        }
    }
}
exports.ChannelInfoService = ChannelInfoService;
