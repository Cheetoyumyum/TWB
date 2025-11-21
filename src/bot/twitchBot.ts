import tmi from 'tmi.js';
import { BotDatabase } from '../database/database';
import { ChatHandler, ChatContext, ResponseIntent } from '../ai/chatHandler';
import { ChannelPointsHandler } from '../channelPoints/channelPoints';
import { CommandHandler } from '../commands/commands';
import { GamesModule } from '../games/games';
import { ActionsModule } from '../actions/actions';
import { SevenTVService } from '../emotes/sevenTV';
import { AdHandler } from '../ads/adHandler';
import { TwitchApiClient } from '../twitch/twitchApi';

const DEFAULT_EMOTE_NAMES = [
  'Kappa',
  'PogChamp',
  'PogU',
  'KEKW',
  'OMEGALUL',
  'LUL',
  'FeelsStrongMan',
  'FeelsBadMan',
  'FeelsGoodMan',
  'PepeHands',
  'PepeLaugh',
  'BibleThump',
  'NotLikeThis',
  'ResidentSleeper',
  '4Head',
  'HeyGuys',
  'Kreygasm',
];

export interface BotConfig {
  username: string;
  oauthToken: string;
  broadcasterOAuthToken?: string;
  clientId?: string;
  broadcasterId?: string;
  channel: string;
  openaiApiKey?: string;
  groqApiKey?: string;
  huggingfaceApiKey?: string;
  dbPath: string;
  seventvUserId?: string;
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
  private broadcasterOAuthToken?: string;
  private twitchApi?: TwitchApiClient;
  private channel: string;
  private responseCooldown: Map<string, number> = new Map();
  private activeChatters: Map<string, number> = new Map();
  private readonly COOLDOWN_MS = 3000;
  private readonly ACTIVE_CHATTER_WINDOW = 5 * 60 * 1000;
  private readonly AUTO_RESPONSE_COOLDOWN = 2 * 60 * 1000;
  private lastAutoResponse = 0;
  private botKeywords: string[] = [];
  private emoteNames: Set<string> = new Set(DEFAULT_EMOTE_NAMES.map((name) => name.toLowerCase()));
  private channelName: string;

  constructor(config: BotConfig) {
    this.channel = config.channel.toLowerCase().replace('#', '');
    this.channelName = config.channel.toLowerCase().replace('#', '');
    this.broadcasterOAuthToken = config.broadcasterOAuthToken;
    this.botKeywords = this.buildBotKeywords(config.username);

    this.db = new BotDatabase(config.dbPath);

    this.sevenTV = new SevenTVService(config.seventvUserId);
    this.games = new GamesModule(this.db);
    if (config.clientId && config.broadcasterId && (config.broadcasterOAuthToken || config.oauthToken)) {
      this.twitchApi = new TwitchApiClient(
        config.clientId,
        config.broadcasterId,
        config.broadcasterOAuthToken || config.oauthToken
      );
    }
    this.actions = new ActionsModule(this.db, this.sevenTV, this.channel, {
      createPoll: this.twitchApi
        ? (question, options, duration) => this.twitchApi!.createPoll(question, options, duration)
        : undefined,
      createPrediction: this.twitchApi
        ? (title, outcomes, duration) => this.twitchApi!.createPrediction(title, outcomes, duration)
        : undefined,
      sendShoutout: this.twitchApi
        ? (target) => this.twitchApi!.sendShoutout(target)
        : undefined,
    });
    this.adHandler = new AdHandler();
    this.chatHandler = new ChatHandler(
      config.openaiApiKey,
      this.db,
      this.sevenTV,
      this.channel,
      this.botKeywords,
      config.groqApiKey,
      config.huggingfaceApiKey
    );
    this.channelPointsHandler = new ChannelPointsHandler(this.db);
    this.commandHandler = new CommandHandler(
      this.db,
      this.games,
      this.actions,
      this.sevenTV,
      this.channel,
      this.adHandler
    );

    this.actions.setTimeoutCallback((target: string, duration: number, message: string) => {
      this.timeoutUser(target, duration, message);
    });

    this.commandHandler.setActiveChattersCallback(() => {
      return this.getActiveChatters();
    });

    this.adHandler.setAdStartCallback((duration: number) => {
      const messages = this.adHandler.getAdMessages(duration);
      this.say(messages.start);
    });

    this.adHandler.setAdEndCallback(() => {
      const messages = this.adHandler.getAdMessages(0);
      this.say(messages.end);
    });

    this.loadChannelEmotes();

    this.client = new tmi.Client({
      options: { debug: false },
      connection: {
        reconnect: true,
        secure: true,
      },
      identity: {
        username: config.username,
        password: config.oauthToken.startsWith('oauth:')
          ? config.oauthToken
          : `oauth:${config.oauthToken}`,
      },
      channels: [this.channel],
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.client.on('message', async (channel: string, tags: tmi.ChatUserstate, message: string, self: boolean) => {
      if (self) return;

      const username = tags.username || 'unknown';
      const displayName = tags['display-name'] || username;

      const lowerMessage = message.toLowerCase();
      const upperMessage = message.toUpperCase();
      if (lowerMessage.includes('redeemed') || upperMessage.includes('DEPOSIT:')) {
        console.log(`🔍 [DEBUG] Message received: "${message}"`);
        console.log(`   From: ${displayName} (${username})`);
        console.log(
          '   Tags:',
          JSON.stringify({
            mod: tags.mod,
            subscriber: tags.subscriber,
            badges: tags.badges,
            'message-type': tags['message-type'],
            'user-type': tags['user-type'],
          })
        );
      }

      this.activeChatters.set(displayName.toLowerCase(), Date.now());

      const hasRedeemed = lowerMessage.includes('redeemed');
      const hasDeposit = upperMessage.includes('DEPOSIT:');

      if (hasRedeemed && hasDeposit) {
        const depositMatch = message.match(/DEPOSIT:\s*(\d+)/i);
        if (depositMatch) {
          const depositAmount = parseInt(depositMatch[1], 10);
          const rewardTitle = `DEPOSIT: ${depositAmount}`;

          let redeemerName = displayName;

          const startPattern = /^(\w+)\s+redeemed/i;
          const startMatch = message.match(startPattern);
          if (startMatch) {
            redeemerName = startMatch[1];
          } else {
            const anywherePattern = /(\w+)\s+redeemed/i;
            const anywhereMatch = message.match(anywherePattern);
            if (anywhereMatch) {
              redeemerName = anywhereMatch[1];
            }
          }

          console.log(`💡 Auto-detected redemption in chat: ${redeemerName} redeemed ${rewardTitle}`);
          console.log(`   Full message: "${message}"`);
          this.handleChannelPointsRedemption(redeemerName, rewardTitle, depositAmount);
          return;
        }
      }

      if (message.startsWith('!')) {
        const [command, ...args] = message.slice(1).split(' ');

        const isMod = tags.mod || false;
        const isBroadcaster = tags.badges?.broadcaster === '1' || username.toLowerCase() === this.channelName.toLowerCase();
        const hasModPermissions = isMod || isBroadcaster;

        const modOnlyCommands = ['givepts', 'givepoints', 'give', 'manualdeposit', 'mdeposit'];
        const broadcasterOnlyCommands = ['deposit', 'redeem', 'ecoreset', 'reseteco'];
        if (modOnlyCommands.includes(command.toLowerCase()) && !hasModPermissions) {
          this.say(`@${displayName} That command is only available to moderators and the streamer.`);
          return;
        }
        if (broadcasterOnlyCommands.includes(command.toLowerCase()) && !isBroadcaster) {
          this.say(`@${displayName} Only the streamer can use !${command.toLowerCase()} (automatic deposits handle viewers).`);
          return;
        }

        const response = await this.commandHandler.handleCommand(displayName, command, args, {
          isBroadcaster,
          isMod,
        });
        if (response) {
          await this.sendResponseLines(response);
          return;
        }
      }

      const intent = this.chatHandler.getResponseIntent(message);
      this.learnAliasFromMessage(message, intent);
      if (intent !== 'none') {
        const isRandom = intent === 'random';
        if (!isRandom || this.canAutoRespond()) {
          if (this.canRespond(username)) {
            const context: ChatContext = {
              username: displayName,
              message,
              channel: this.channel,
              timestamp: new Date(),
            };
            const response = await this.chatHandler.generateResponse(context);
            if (response) {
              await this.sendResponseLines(response, isRandom);
              this.updateCooldown(username);
            }
          }
        }
      }
    });

    this.client.on('raw_message', (messageCloned: { command: string; channel?: string; message?: string }) => {
      if (
        messageCloned.message &&
        (messageCloned.message.toLowerCase().includes('redeemed') ||
          messageCloned.message.toUpperCase().includes('DEPOSIT:'))
      ) {
        console.log(`🔍 [RAW] Command: ${messageCloned.command}, Message: "${messageCloned.message}"`);
      }
    });

    this.client.on('connected', async (addr: string, port: number) => {
      console.log(`✅ Connected to Twitch at ${addr}:${port}`);
      console.log(`📺 Joined channel: #${this.channel}`);
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

  private async sendResponseLines(text: string, isAuto: boolean = false): Promise<void> {
    const parts = text.split(/\n+/).map((line) => line.trim()).filter(Boolean);
    if (parts.length === 0) {
      return;
    }
    for (const line of parts) {
      const cleanedLine = this.sanitizeEmoteLine(line);
      this.say(cleanedLine);
      if (parts.length > 1) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
    if (isAuto) {
      this.lastAutoResponse = Date.now();
    }
  }

  private canAutoRespond(): boolean {
    return Date.now() - this.lastAutoResponse >= this.AUTO_RESPONSE_COOLDOWN;
  }

  private buildBotKeywords(username: string): string[] {
    const lower = username.toLowerCase();
    const keywords = new Set<string>([
      lower,
      `@${lower}`,
      'bot',
      'hey bot',
      'hi bot',
      'hello bot',
    ]);

    for (let len = 3; len <= Math.min(lower.length, 6); len++) {
      keywords.add(lower.slice(0, len));
    }

    return Array.from(keywords);
  }

  public handleChannelPointsRedemption(username: string, redemptionTitle: string, rewardCost: number): void {
    const result = this.channelPointsHandler.handleRedemption(username, redemptionTitle, rewardCost);
    if (result.success && result.message) {
      this.say(result.message);
    }
  }

  public getDatabase(): BotDatabase {
    return this.db;
  }

  public getSevenTV(): SevenTVService {
    return this.sevenTV;
  }

  public getChannel(): string {
    return this.channel;
  }

  public getActiveChatters(): string[] {
    const now = Date.now();
    const active: string[] = [];
    for (const [name, timestamp] of this.activeChatters.entries()) {
      if (now - timestamp < this.ACTIVE_CHATTER_WINDOW) {
        active.push(name);
      }
    }

    for (const [name, timestamp] of this.activeChatters.entries()) {
      if (now - timestamp >= this.ACTIVE_CHATTER_WINDOW) {
        this.activeChatters.delete(name);
      }
    }

    return active;
  }

  private async loadChannelEmotes(): Promise<void> {
    try {
      const emotes = await this.sevenTV.getChannelEmotes(this.channel);
      console.log(`🎭 Loaded ${emotes.length} 7TV emotes for ${this.channel}`);
      this.registerEmoteNames(emotes.map((emote) => emote.name));
    } catch (error) {
      console.warn('⚠️ Failed to load 7TV emotes:', error);
    }
  }

  private registerEmoteNames(names: string[]): void {
    names.forEach((name) => {
      const normalized = name?.trim().toLowerCase();
      if (normalized) {
        this.emoteNames.add(normalized);
      }
    });
  }

  private sanitizeEmoteLine(line: string): string {
    if (!line || this.emoteNames.size === 0) {
      return line;
    }
    return line.replace(/([A-Za-z0-9_]+)([.!?,]+)(?=\s|$)/g, (match, word, punct) => {
      if (this.isKnownEmote(word)) {
        return `${word} ${punct}`;
      }
      return match;
    });
  }

  private isKnownEmote(token: string): boolean {
    const normalized = token.trim().toLowerCase();
    return this.emoteNames.has(normalized);
  }

  private learnAliasFromMessage(message: string, intent: ResponseIntent): void {
    if (intent === 'none') {
      return;
    }
    const candidates = new Set<string>();
    const leadingMatch = message.match(/^\s*([A-Za-z0-9_]{3,20})(?=[,:!?])/);
    if (leadingMatch) {
      candidates.add(leadingMatch[1]);
    }
    const words = message.split(/\s+/);
    for (const raw of words) {
      const cleaned = raw.replace(/[^A-Za-z0-9_]/g, '');
      if (!cleaned) continue;
      const lower = cleaned.toLowerCase();
      if (lower === this.channelName || this.chatHandler.hasAlias(lower)) {
        continue;
      }
      if (lower.startsWith('bot') || lower.endsWith('bot')) {
        candidates.add(cleaned);
      }
    }
    candidates.forEach((alias) => this.chatHandler.learnAlias(alias));
  }

  private timeoutUser(target: string, duration: number, message: string): void {
    this.client
      .timeout(this.channel, target, duration, message)
      .catch((err: Error) => {
        console.error(`Failed to timeout ${target}:`, err);
        this.say(message);
      });
  }

  public announceAdWarning(timeInSeconds: number): void {
    const formatted = this.formatDuration(Math.max(timeInSeconds, 10));
    const warnings = [
      `🚨 Heads up! Twitch will run an ad in ${formatted}. Stretch, hydrate, don't leave!`,
      `⏰ Ad break in ${formatted}! Subscribers stay cozy, everyone else we'll see right after.`,
      `📺 Ads arriving in ${formatted}. Perfect moment to grab a snack and be back!`,
    ];
    this.say(warnings[Math.floor(Math.random() * warnings.length)]);
  }

  public announceAdStarted(duration: number): void {
    console.log(`📺 Detected scheduled ad for ~${duration}s`);
    this.adHandler.startAd(duration);
  }

  public handleNewFollower(username: string): void {
    const messages = [
      `💜 Thanks for the follow, ${username}! Welcome in!`,
      `🎉 ${username} just joined the crew! Appreciate the follow!`,
      `🙌 ${username}, you're amazing! Thanks for hitting that follow button!`,
    ];
    this.say(messages[Math.floor(Math.random() * messages.length)]);
  }

  public handleNewSubscriber(username: string, tier?: string, isResub?: boolean, message?: string): void {
    const tierLabel = tier ? ` (Tier ${this.mapTier(tier)})` : '';
    const verb = isResub ? 'resubbed' : 'subscribed';
    const responses = [
      `🔥 ${username} just ${verb}${tierLabel}! Thank you for the love!`,
      `💜 Massive thanks to ${username} for the ${verb}${tierLabel}! Enjoy the emotes!`,
      `🎁 ${username} ${verb}! Welcome to the comfy club!`,
    ];
    this.say(responses[Math.floor(Math.random() * responses.length)]);
    if (message) {
      this.say(`💬 ${username}'s sub message: "${message}"`);
    }
  }

  public handleGiftSubscription(gifter: string, recipientCount: number, isAnonymous: boolean): void {
    const name = isAnonymous ? 'Someone generous' : gifter;
    const messages = [
      `🎁 ${name} just gifted ${recipientCount} sub(s)! Thank you for sharing the love!`,
      `💜 Huge thanks to ${name} for the ${recipientCount} gifted sub(s)!`,
      `🔥 ${name} dropping ${recipientCount} gifts! Chat, show them some hype!`,
    ];
    this.say(messages[Math.floor(Math.random() * messages.length)]);
  }

  private formatDuration(totalSeconds: number): string {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.max(totalSeconds % 60, 0);
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  }

  private mapTier(tier: string): string {
    switch (tier) {
      case '1000':
        return '1';
      case '2000':
        return '2';
      case '3000':
        return '3';
      default:
        return tier;
    }
  }
}
