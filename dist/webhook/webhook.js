"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookServer = void 0;
const express_1 = __importDefault(require("express"));
const crypto_1 = __importDefault(require("crypto"));
class WebhookServer {
    constructor(bot, port = 3000, webhookSecret) {
        this.bot = bot;
        this.port = port;
        this.webhookSecret = webhookSecret;
        this.app = (0, express_1.default)();
        // We need raw body for signature verification, so we'll handle JSON parsing manually
        this.app.use(express_1.default.raw({ type: 'application/json' }));
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
                // Verify webhook signature if secret is provided
                if (this.webhookSecret) {
                    const signature = req.headers['twitch-eventsub-message-signature'];
                    const messageId = req.headers['twitch-eventsub-message-id'];
                    const timestamp = req.headers['twitch-eventsub-message-timestamp'];
                    if (!signature || !messageId || !timestamp) {
                        console.warn('⚠️  Missing webhook signature headers - request may not be from Twitch');
                        // Continue anyway for development, but log warning
                    }
                    else {
                        const message = messageId + timestamp + req.body.toString();
                        const hmac = crypto_1.default.createHmac('sha256', this.webhookSecret);
                        hmac.update(message);
                        const expectedSignature = 'sha256=' + hmac.digest('hex');
                        if (signature !== expectedSignature) {
                            console.error('❌ Webhook signature verification failed - rejecting request');
                            return res.status(403).json({ error: 'Invalid signature' });
                        }
                    }
                }
                // Parse JSON body (we used raw body for signature verification)
                const event = JSON.parse(req.body.toString());
                // Handle verification challenge (Twitch sends this when creating subscription)
                if (event.challenge) {
                    console.log('✅ Webhook verification challenge received and responded to');
                    return res.status(200).send(event.challenge);
                }
                // Handle different webhook formats
                if (event.subscription?.type === 'channel.channel_points_custom_reward_redemption.add') {
                    const redemption = event.event;
                    const username = redemption.user_name || redemption.user_login;
                    const redemptionTitle = redemption.reward?.title || '';
                    const rewardCost = redemption.reward?.cost || 0;
                    if (username && redemptionTitle) {
                        console.log(`📥 Webhook: ${username} redeemed ${redemptionTitle} (${rewardCost} points)`);
                        this.bot.handleChannelPointsRedemption(username, redemptionTitle, rewardCost);
                        res.status(200).json({ received: true });
                    }
                    else {
                        res.status(400).json({ error: 'Missing required fields' });
                    }
                }
                else {
                    res.status(200).json({ received: true });
                }
            }
            catch (error) {
                console.error('Webhook error:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });
        // Manual trigger endpoint for testing (uses JSON body)
        this.app.post('/trigger/deposit', express_1.default.json(), (req, res) => {
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
