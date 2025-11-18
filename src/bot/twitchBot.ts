import tmi from 'tmi.js';
import { BotDatabase } from '../database/database';
import { ChatHandler, ChatContext } from '../ai/chatHandler';
import { ChannelPointsHandler } from '../channelPoints/channelPoints';
import { CommandHandler } from '../commands/commands';
import { GamesModule } from '../games/games';
import { ActionsModule } from '../actions/actions';
import { SevenTVService } from '../emotes/sevenTV';
import { AdHandler } from '../ads/adHandler';

export interface BotConfig {
  username: string;
  oauthToken: string;
  channel: string;
  openaiApiKey?: string;
  dbPath: string;
}

export class TwitchBot {
  private client: tmi.Client;
  private db: BotDatabase;
  private chatHandler: ChatHandler;
  private channelPointsHandler: ChannelPointsHandler;
  private commandHandler: CommandHandler;
  private games: GamesModule;
  private actions: ActionsModule;
  private sevenTV: SevenTVService;
  private adHandler: AdHandler;
  private channel: string;
  private responseCooldown: Map<string, number> = new Map();
  private activeChatters: Map<string, number> = new Map(); // username -> last chat timestamp
  private readonly COOLDOWN_MS = 3000; // 3 seconds between responses per user
  private readonly ACTIVE_CHATTER_WINDOW = 5 * 60 * 1000; // 5 minutes

  constructor(config: BotConfig) {
    this.channel = config.channel.toLowerCase().replace('#', '');

    // Initialize database
    this.db = new BotDatabase(config.dbPath);

    // Initialize modules
    this.games = new GamesModule(this.db);
    this.actions = new ActionsModule(this.db);
    this.sevenTV = new SevenTVService();
    this.adHandler = new AdHandler();
    this.chatHandler = new ChatHandler(config.openaiApiKey, this.db, this.sevenTV, this.channel);
    this.channelPointsHandler = new ChannelPointsHandler(this.db);
    this.commandHandler = new CommandHandler(this.db, this.games, this.actions, this.sevenTV, this.channel, this.adHandler);
    
    // Set up callbacks
    this.actions.setTimeoutCallback((target: string, duration: number, message: string) => {
      this.timeoutUser(target, duration, message);
    });
    
    this.commandHandler.setActiveChattersCallback(() => {
      return this.getActiveChatters();
    });

    // Set up ad callbacks
    this.adHandler.setAdStartCallback((duration: number) => {
      const messages = this.adHandler.getAdMessages(duration);
      this.say(messages.start);
    });

    this.adHandler.setAdEndCallback(() => {
      const messages = this.adHandler.getAdMessages(0);
      this.say(messages.end);
    });
    
    // Preload channel emotes
    this.loadChannelEmotes();

    // Initialize Twitch client
    this.client = new tmi.Client({
      options: { debug: false },
      connection: {
        reconnect: true,
        secure: true,
      },
      identity: {
        username: config.username,
        password: config.oauthToken.startsWith('oauth:') ? config.oauthToken : `oauth:${config.oauthToken}`,
      },
      channels: [this.channel],
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.client.on('message', async (channel: string, tags: tmi.ChatUserstate, message: string, self: boolean) => {
      if (self) return; // Ignore bot's own messages

      const username = tags.username || 'unknown';
      const displayName = tags['display-name'] || username;
      
      // Track active chatters (for rain command)
      this.activeChatters.set(displayName.toLowerCase(), Date.now());

      // Handle commands
      if (message.startsWith('!')) {
        const [command, ...args] = message.slice(1).split(' ');
        const response = await this.commandHandler.handleCommand(displayName, command, args);
        if (response) {
          this.say(response);
          return;
        }
      }

      // Handle AI chat responses
      if (this.chatHandler.shouldRespond(message)) {
        if (this.canRespond(username)) {
          const context: ChatContext = {
            username: displayName,
            message: message,
            channel: this.channel,
            timestamp: new Date(),
          };

          const response = await this.chatHandler.generateResponse(context);
          if (response) {
            this.say(response);
            this.updateCooldown(username);
          }
        }
      }
    });

    this.client.on('connected', async (addr: string, port: number) => {
      console.log(`✅ Connected to Twitch at ${addr}:${port}`);
      console.log(`📺 Joined channel: #${this.channel}`);
      // Load emotes after connection
      await this.loadChannelEmotes();
    });

    this.client.on('disconnected', (reason: string) => {
      console.log(`❌ Disconnected: ${reason}`);
    });

    this.client.on('reconnect', () => {
      console.log('🔄 Reconnecting...');
    });
  }

  private canRespond(username: string): boolean {
    const lastResponse = this.responseCooldown.get(username.toLowerCase());
    if (!lastResponse) return true;
    return Date.now() - lastResponse > this.COOLDOWN_MS;
  }

  private updateCooldown(username: string): void {
    this.responseCooldown.set(username.toLowerCase(), Date.now());
  }

  public async connect(): Promise<void> {
    try {
      await this.client.connect();
    } catch (error) {
      console.error('Failed to connect to Twitch:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    await this.client.disconnect();
    this.db.close();
  }

  public say(message: string): void {
    this.client.say(this.channel, message).catch((err: Error) => {
      console.error('Error sending message:', err);
    });
  }

  // Handle channel points redemption (called from webhook)
  public handleChannelPointsRedemption(
    username: string,
    redemptionTitle: string,
    rewardCost: number
  ): void {
    const result = this.channelPointsHandler.handleRedemption(username, redemptionTitle, rewardCost);
    if (result.success && result.message) {
      this.say(result.message);
    }
  }

  // Get database instance for external access if needed
  public getDatabase(): BotDatabase {
    return this.db;
  }

  // Get 7TV service instance
  public getSevenTV(): SevenTVService {
    return this.sevenTV;
  }

  // Get channel name
  public getChannel(): string {
    return this.channel;
  }

  // Get active chatters (last 5 minutes)
  public getActiveChatters(): string[] {
    const now = Date.now();
    const active: string[] = [];
    
    for (const [username, timestamp] of this.activeChatters.entries()) {
      if (now - timestamp < this.ACTIVE_CHATTER_WINDOW) {
        active.push(username);
      }
    }
    
    // Clean up old entries
    for (const [username, timestamp] of this.activeChatters.entries()) {
      if (now - timestamp >= this.ACTIVE_CHATTER_WINDOW) {
        this.activeChatters.delete(username);
      }
    }
    
    return active;
  }

  // Load channel emotes from 7TV
  private async loadChannelEmotes(): Promise<void> {
    try {
      const emotes = await this.sevenTV.getChannelEmotes(this.channel);
      console.log(`🎭 Loaded ${emotes.length} 7TV emotes for ${this.channel}`);
    } catch (error) {
      console.warn(`⚠️  Failed to load 7TV emotes:`, error);
    }
  }

  // Timeout a user
  private timeoutUser(target: string, duration: number, message: string): void {
    this.client.timeout(this.channel, target, duration, message)
      .then(() => {
        // Timeout successful, message already sent by actions module
      })
      .catch((err: Error) => {
        console.error(`Failed to timeout ${target}:`, err);
        // Still send the snarky message even if timeout fails
        this.say(message);
      });
  }
}

