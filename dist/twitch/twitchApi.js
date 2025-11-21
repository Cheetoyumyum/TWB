"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TwitchApiClient = void 0;
const axios_1 = __importDefault(require("axios"));
class TwitchApiClient {
    constructor(clientId, broadcasterId, oauthToken) {
        this.clientId = clientId;
        this.broadcasterId = broadcasterId;
        this.oauthToken = oauthToken;
    }
    async createPoll(question, options, duration = 60) {
        if (options.length < 2) {
            return { success: false, message: 'Need at least two poll options.' };
        }
        try {
            await axios_1.default.post('https://api.twitch.tv/helix/polls', {
                broadcaster_id: this.broadcasterId,
                title: question.slice(0, 60),
                choices: options.slice(0, 5).map((opt) => ({ title: opt.slice(0, 25) })),
                duration: Math.min(Math.max(duration, 15), 1800),
            }, {
                headers: {
                    Authorization: `Bearer ${this.oauthToken}`,
                    'Client-Id': this.clientId,
                    'Content-Type': 'application/json',
                },
            });
            return { success: true, message: `📊 Poll started: ${question}` };
        }
        catch (error) {
            const details = error.response?.data?.message || error.message || 'Unknown error';
            console.error('Failed to create Twitch poll:', details);
            return { success: false, message: `⚠️ Unable to create poll: ${details}` };
        }
    }
    async createPrediction(title, outcomes, duration = 120) {
        if (outcomes.length < 2) {
            return { success: false, message: 'Need at least two prediction outcomes.' };
        }
        try {
            await axios_1.default.post('https://api.twitch.tv/helix/predictions', {
                broadcaster_id: this.broadcasterId,
                title: title.slice(0, 45),
                outcomes: outcomes.slice(0, 2).map((opt) => ({ title: opt.slice(0, 25) })),
                prediction_window: Math.min(Math.max(duration, 30), 1800),
            }, {
                headers: {
                    Authorization: `Bearer ${this.oauthToken}`,
                    'Client-Id': this.clientId,
                    'Content-Type': 'application/json',
                },
            });
            return { success: true, message: `🔮 Prediction started: ${title}` };
        }
        catch (error) {
            const details = error.response?.data?.message || error.message || 'Unknown error';
            console.error('Failed to create Twitch prediction:', details);
            return { success: false, message: `⚠️ Unable to create prediction: ${details}` };
        }
    }
    async sendShoutout(targetLogin) {
        const targetId = await this.getUserId(targetLogin);
        if (!targetId) {
            return { success: false, message: `⚠️ Couldn't find Twitch user: ${targetLogin}` };
        }
        try {
            await axios_1.default.post('https://api.twitch.tv/helix/channels/shoutouts', null, {
                params: {
                    from_broadcaster_id: this.broadcasterId,
                    to_broadcaster_id: targetId,
                    moderator_id: this.broadcasterId,
                },
                headers: {
                    Authorization: `Bearer ${this.oauthToken}`,
                    'Client-Id': this.clientId,
                },
            });
            return { success: true, message: `📢 Shoutout sent to @${targetLogin}!` };
        }
        catch (error) {
            const details = error.response?.data?.message || error.message || 'Unknown error';
            console.error('Failed to send Twitch shoutout:', details);
            return { success: false, message: `⚠️ Unable to shoutout ${targetLogin}: ${details}` };
        }
    }
    async getUserId(login) {
        try {
            const response = await axios_1.default.get('https://api.twitch.tv/helix/users', {
                params: { login },
                headers: {
                    Authorization: `Bearer ${this.oauthToken}`,
                    'Client-Id': this.clientId,
                },
            });
            return response.data?.data?.[0]?.id || null;
        }
        catch (error) {
            console.error('Failed to fetch Twitch user id:', error.response?.data || error.message);
            return null;
        }
    }
}
exports.TwitchApiClient = TwitchApiClient;
