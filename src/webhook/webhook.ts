import express, { Request, Response } from 'express';
import crypto from 'crypto';
import { TwitchBot } from '../bot/twitchBot';

export class WebhookServer {
  private app: express.Application;
  private bot: TwitchBot;
  private port: number;
  private webhookSecret?: string;

  constructor(bot: TwitchBot, port: number = 3000, webhookSecret?: string) {
    this.bot = bot;
    this.port = port;
    this.webhookSecret = webhookSecret;
    this.app = express();
    // We need raw body for signature verification, so we'll handle JSON parsing manually
    this.app.use(express.raw({ type: 'application/json' }));
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // Channel points redemption webhook
    // This endpoint should be configured in Twitch EventSub
    this.app.post('/webhook/channel-points', (req: Request, res: Response) => {
      try {
        // Verify webhook signature if secret is provided
        if (this.webhookSecret) {
          const signature = req.headers['twitch-eventsub-message-signature'] as string;
          const messageId = req.headers['twitch-eventsub-message-id'] as string;
          const timestamp = req.headers['twitch-eventsub-message-timestamp'] as string;
          
          if (!signature || !messageId || !timestamp) {
            console.warn('⚠️  Missing webhook signature headers - request may not be from Twitch');
            // Continue anyway for development, but log warning
          } else {
            const message = messageId + timestamp + req.body.toString();
            const hmac = crypto.createHmac('sha256', this.webhookSecret);
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
          } else {
            res.status(400).json({ error: 'Missing required fields' });
          }
        } else {
          res.status(200).json({ received: true });
        }
      } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // Manual trigger endpoint for testing (uses JSON body)
    this.app.post('/trigger/deposit', express.json(), (req: Request, res: Response) => {
      const { username, amount } = req.body;
      if (!username || !amount) {
        return res.status(400).json({ error: 'Missing username or amount' });
      }

      this.bot.handleChannelPointsRedemption(username, `DEPOSIT: ${amount}`, amount);
      res.json({ success: true });
    });
  }

  public start(): void {
    this.app.listen(this.port, () => {
      console.log(`🌐 Webhook server running on port ${this.port}`);
      console.log(`📡 Channel points webhook: http://localhost:${this.port}/webhook/channel-points`);
    });
  }
}

