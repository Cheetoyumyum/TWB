"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookServer = void 0;
const express_1 = __importDefault(require("express"));
class WebhookServer {
    constructor(bot, port = 3000) {
        this.bot = bot;
        this.port = port;
        this.app = (0, express_1.default)();
        this.app.use(express_1.default.json());
        this.setupRoutes();
    }
    setupRoutes() {
        // Health check
        this.app.get('/health', (req, res) => {
            res.json({ status: 'ok', timestamp: new Date().toISOString() });
        });
        // Channel points redemption webhook
        // This endpoint should be configured in Twitch EventSub
        this.app.post('/webhook/channel-points', (req, res) => {
            try {
                const event = req.body;
                // Handle different webhook formats
                if (event.subscription?.type === 'channel.channel_points_custom_reward_redemption.add') {
                    const redemption = event.event;
                    const username = redemption.user_name || redemption.user_login;
                    const redemptionTitle = redemption.reward?.title || '';
                    const rewardCost = redemption.reward?.cost || 0;
                    if (username && redemptionTitle) {
                        this.bot.handleChannelPointsRedemption(username, redemptionTitle, rewardCost);
                        res.status(200).json({ received: true });
                    }
                    else {
                        res.status(400).json({ error: 'Missing required fields' });
                    }
                }
                else {
                    // Handle verification challenge
                    if (event.challenge) {
                        res.status(200).send(event.challenge);
                    }
                    else {
                        res.status(200).json({ received: true });
                    }
                }
            }
            catch (error) {
                console.error('Webhook error:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });
        // Manual trigger endpoint for testing
        this.app.post('/trigger/deposit', (req, res) => {
            const { username, amount } = req.body;
            if (!username || !amount) {
                return res.status(400).json({ error: 'Missing username or amount' });
            }
            this.bot.handleChannelPointsRedemption(username, `DEPOSIT: ${amount}`, amount);
            res.json({ success: true });
        });
    }
    start() {
        this.app.listen(this.port, () => {
            console.log(`🌐 Webhook server running on port ${this.port}`);
            console.log(`📡 Channel points webhook: http://localhost:${this.port}/webhook/channel-points`);
        });
    }
}
exports.WebhookServer = WebhookServer;
