import WebSocket from 'ws';
import { TwitchBot } from '../bot/twitchBot';

interface PubSubConfig {
  oauthToken: string;
  broadcasterId: string;
  reconnectDelay?: number; // ms
}

export class RedemptionPubSub {
  private bot: TwitchBot;
  private config: PubSubConfig;
  private ws: WebSocket | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private readonly HEARTBEAT = 4 * 60 * 1000; // Twitch recommends <5 min
  private readonly RECONNECT_DELAY_DEFAULT = 10 * 1000;

  constructor(bot: TwitchBot, config: PubSubConfig) {
    this.bot = bot;
    this.config = {
      ...config,
      reconnectDelay: config.reconnectDelay || this.RECONNECT_DELAY_DEFAULT,
    };
  }

  async start(): Promise<void> {
    this.connect();
  }

  stop(): void {
    this.teardown();
  }

  private connect(): void {
    this.teardown();
    console.log('🔌 Connecting to Twitch PubSub...');
    this.ws = new WebSocket('wss://pubsub-edge.twitch.tv');

    this.ws.on('open', () => {
      console.log('✅ Connected to Twitch PubSub');
      this.listenToTopic();
      this.startHeartbeat();
    });

    this.ws.on('message', (data) => {
      this.handleMessage(data.toString());
    });

    this.ws.on('close', (code, reason) => {
      console.warn(`⚠️  PubSub connection closed (${code}): ${reason.toString()}`);
      this.scheduleReconnect();
    });

    this.ws.on('error', (error) => {
      console.error('❌ PubSub error:', error);
      this.scheduleReconnect();
    });
  }

  private teardown(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.ws) {
      this.ws.removeAllListeners();
      this.ws.close();
      this.ws = null;
    }
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimeout) return;
    console.log(`🔁 Reconnecting to PubSub in ${this.config.reconnectDelay} ms...`);
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.connect();
    }, this.config.reconnectDelay);
  }

  private listenToTopic(): void {
    if (!this.ws) return;
    const topic = `channel-points-channel-v1.${this.config.broadcasterId}`;
    const message = {
      type: 'LISTEN',
      nonce: `${Date.now()}`,
      data: {
        topics: [topic],
        auth_token: this.config.oauthToken,
      },
    };
    this.ws.send(JSON.stringify(message));
    console.log(`📡 Listening to PubSub topic: ${topic}`);
  }

  private startHeartbeat(): void {
    if (!this.ws) return;
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'PING' }));
      }
    }, this.HEARTBEAT);
  }

  private handleMessage(raw: string): void {
    try {
      const message = JSON.parse(raw);
      switch (message.type) {
        case 'RESPONSE':
          if (message.error) {
            console.error('❌ PubSub listen error:', message.error);
          }
          break;
        case 'MESSAGE':
          this.handleTopicMessage(message.data?.message);
          break;
        case 'PONG':
          // Heartbeat ack
          break;
        case 'RECONNECT':
          console.warn('⚠️  PubSub requested reconnect');
          this.connect();
          break;
        default:
          break;
      }
    } catch (error) {
      console.error('Error parsing PubSub message:', error, raw);
    }
  }

  private handleTopicMessage(payload: string): void {
    try {
      const message = JSON.parse(payload);
      if (message.type !== 'reward-redeemed') return;

      const redemption = message.data?.redemption;
      if (!redemption) return;

      const username =
        redemption.user?.display_name ||
        redemption.user?.login ||
        redemption.user?.id;
      const rewardTitle = redemption.reward?.title;
      const rewardCost = redemption.reward?.cost ?? 0;

      if (!username || !rewardTitle) return;

      console.log(
        `📥 PubSub: ${username} redeemed ${rewardTitle} (${rewardCost} points)`
      );

      this.bot.handleChannelPointsRedemption(
        username,
        rewardTitle,
        rewardCost
      );
    } catch (error) {
      console.error('Error handling PubSub topic message:', error, payload);
    }
  }
}


