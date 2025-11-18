import express, { Request, Response } from 'express';
import { TwitchBot } from '../bot/twitchBot';

export class WebhookServer {
  private app: express.Application;
  private bot: TwitchBot;
  private port: number;

  constructor(bot: TwitchBot, port: number = 3000) {
    this.bot = bot;
    this.port = port;
    this.app = express();
    this.app.use(express.json());
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
          } else {
            res.status(400).json({ error: 'Missing required fields' });
          }
        } else {
          // Handle verification challenge
          if (event.challenge) {
            res.status(200).send(event.challenge);
          } else {
            res.status(200).json({ received: true });
          }
        }
      } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // Manual trigger endpoint for testing
    this.app.post('/trigger/deposit', (req: Request, res: Response) => {
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

