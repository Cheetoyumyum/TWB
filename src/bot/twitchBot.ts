import tmi from 'tmi.js';
import { BotDatabase } from '../database/database';
import { ChatHandler, ChatContext, ResponseIntent } from '../ai/chatHandler';
import { TriviaGenerator, TriviaQuestion } from '../ai/triviaGenerator';
import { ChannelPointsHandler } from '../channelPoints/channelPoints';
import { CommandHandler } from '../commands/commands';
import { GamesModule } from '../games/games';
import { ActionsModule } from '../actions/actions';
import { SevenTVService } from '../emotes/sevenTV';
import { AdHandler } from '../ads/adHandler';
import { TwitchApiClient } from '../twitch/twitchApi';

interface ActiveTrivia {
  question: TriviaQuestion;
  expiresAt: number;
}

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

const TRIVIA_QUESTIONS: TriviaQuestion[] = [
  { prompt: '🧠 Trivia! First to answer wins 400 pts: What is the capital of France?', answers: ['paris'], source: 'preset' },
  { prompt: '🧠 Trivia! First to answer wins 400 pts: What gas do plants breathe in that humans breathe out?', answers: ['carbon dioxide', 'co2'], source: 'preset' },
  { prompt: '🧩 Riddle time! I speak without a mouth and hear without ears. What am I?', answers: ['echo'], source: 'preset' },
  { prompt: '🧠 Trivia! First to answer wins 400 pts: Which planet is known as the Red Planet?', answers: ['mars'], source: 'preset' },
  { prompt: '🧠 Trivia! First to answer wins 400 pts: What instrument has keys, pedals, and strings?', answers: ['piano'], source: 'preset' },
  { prompt: '🧠 Trivia! First to answer wins 400 pts: Which animal is known as the King of the Jungle?', answers: ['lion'], source: 'preset' },
  { prompt: '🧠 Trivia! First to answer wins 400 pts: What is the largest ocean on Earth?', answers: ['pacific ocean', 'pacific'], source: 'preset' },
  { prompt: '🧠 Trivia! First to answer wins 400 pts: What is the hardest natural substance?', answers: ['diamond'], source: 'preset' },
  { prompt: '🧠 Trivia! First to answer wins 400 pts: Who painted the Mona Lisa?', answers: ['leonardo da vinci', 'da vinci'], source: 'preset' },
  { prompt: '🧠 Trivia! First to answer wins 400 pts: Which planet has the most moons?', answers: ['saturn'], source: 'preset' },
  { prompt: '🧠 Trivia! First to answer wins 400 pts: What is the tallest mountain in the world?', answers: ['mount everest', 'everest'], source: 'preset' },
  { prompt: '🧠 Trivia! First to answer wins 400 pts: Which metal is liquid at room temperature?', answers: ['mercury'], source: 'preset' },
  { prompt: '🧠 Trivia! First to answer wins 400 pts: What color do you get by mixing blue and yellow?', answers: ['green'], source: 'preset' },
  { prompt: '🧠 Trivia! First to answer wins 400 pts: Which country invented paper?', answers: ['china'], source: 'preset' },
  { prompt: '🧩 Riddle time! What has hands but can’t clap?', answers: ['clock'], source: 'preset' },
  { prompt: '🧠 Trivia! First to answer wins 400 pts: How many sides does a hexagon have?', answers: ['6', 'six'], source: 'preset' },
  { prompt: '🧠 Trivia! First to answer wins 400 pts: Which element has the chemical symbol “O”?', answers: ['oxygen'], source: 'preset' },
  { prompt: '🧠 Trivia! First to answer wins 400 pts: What do bees make?', answers: ['honey'], source: 'preset' },
  { prompt: '🧠 Trivia! First to answer wins 400 pts: What is the largest mammal on Earth?', answers: ['blue whale', 'whale'], source: 'preset' },
  { prompt: '🧠 Trivia! First to answer wins 400 pts: Which continent is the Sahara Desert on?', answers: ['africa'], source: 'preset' },
  { prompt: '🧠 Trivia! First to answer wins 400 pts: In what sport would you perform a slam dunk?', answers: ['basketball'], source: 'preset' },
  { prompt: '🧠 Trivia! First to answer wins 400 pts: What is the smallest prime number?', answers: ['2', 'two'], source: 'preset' },
  { prompt: '🧠 Trivia! First to answer wins 400 pts: What is the chemical formula for water?', answers: ['h2o'], source: 'preset' },
  { prompt: '🧠 Trivia! First to answer wins 400 pts: Who wrote "Romeo and Juliet"?', answers: ['william shakespeare', 'shakespeare'], source: 'preset' },
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
  private botKeywords: Set<string> = new Set();
  private emotePool: string[] = [...DEFAULT_EMOTE_NAMES];
  private emoteNames: Set<string> = new Set(DEFAULT_EMOTE_NAMES.map((name) => name.toLowerCase()));
  private copypastaTracker: Map<string, { count: number; lastSeen: number }> = new Map();
  private copypastaVault: string[] = [];
  private readonly MAX_COPYPasta = 25;
  private lastEmoteBurst = 0;
  private randomTriviaEnabled = true;
  private nextTriviaTime = Date.now() + 5 * 60 * 1000;
  private activeTrivia?: ActiveTrivia;
  private triviaGenerator?: TriviaGenerator;
  private recentTriviaPrompts: string[] = [];
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
      Array.from(this.botKeywords),
      config.groqApiKey,
      config.huggingfaceApiKey
    );
    this.chatHandler.setCopypastaProvider(() => this.getRandomCopypasta());
    this.triviaGenerator = new TriviaGenerator(config.openaiApiKey, config.groqApiKey);
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
      this.trackCopypasta(message);
      await this.maybeTriggerTrivia();
      if (this.handleTriviaAnswer(displayName, message)) {
        return;
      }

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

      const isMod = tags.mod || false;
      const isBroadcaster =
        tags.badges?.broadcaster === '1' || username.toLowerCase() === this.channelName.toLowerCase();

      const messageEmotes = this.extractEmotes(message);

      if (message.startsWith('!')) {
        const [command, ...args] = message.slice(1).split(' ');

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

        if (command.toLowerCase() === 'trivia') {
          const triviaResponse = await this.handleTriviaCommand(displayName, args, isBroadcaster, hasModPermissions);
          if (triviaResponse) {
            this.say(triviaResponse);
          }
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

      if (this.maybeRespondToEmoteMention(displayName, message, messageEmotes, isBroadcaster)) {
        return;
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
              isBroadcaster,
              isMod,
            };
            const response = await this.chatHandler.generateResponse(context);
            if (response) {
              await this.sendResponseLines(response, isRandom);
              this.updateCooldown(username);
            }
          }
        }
      }

      this.maybeSendRandomEmoteBurst();
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

  private buildBotKeywords(username: string): Set<string> {
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

    return keywords;
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
    const sanitized: string[] = [];
    names.forEach((name) => {
      const normalized = name?.trim().toLowerCase();
      if (normalized) {
        this.emoteNames.add(normalized);
        sanitized.push(name);
      }
    });
    if (sanitized.length) {
      this.emotePool = sanitized;
    }
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
    candidates.forEach((alias) => {
      const normalized = alias.toLowerCase();
      if (!this.botKeywords.has(normalized)) {
        this.botKeywords.add(normalized);
        this.botKeywords.add(`@${normalized}`);
      }
      this.chatHandler.learnAlias(alias);
    });
  }

  private extractEmotes(message: string): string[] {
    const parts = message
      .split(/\s+/)
      .map((token) => token.replace(/^[^A-Za-z0-9_:]+|[^A-Za-z0-9_:]+$/g, ''))
      .filter(Boolean);
    return parts.filter((token) => this.isKnownEmote(token));
  }

  private isBotMentioned(message: string): boolean {
    const lower = message.toLowerCase();
    for (const keyword of this.botKeywords) {
      if (keyword && lower.includes(keyword)) {
        return true;
      }
    }
    return false;
  }

  private maybeRespondToEmoteMention(
    username: string,
    originalMessage: string,
    emotes: string[],
    isBroadcaster: boolean
  ): boolean {
    if (!this.isBotMentioned(originalMessage)) {
      return false;
    }
    const lower = originalMessage.toLowerCase();
    const wantsEmote = lower.includes('emote') || lower.includes('favorite') || lower.includes('fave');
    if (emotes.length === 0 && !wantsEmote) {
      return false;
    }
    const main =
      emotes[0] || this.emotePool[Math.floor(Math.random() * Math.max(this.emotePool.length, 1))] || 'Kappa';
    const options = isBroadcaster
      ? [
          `@${username} ${main} ${main} streamer privilege unlocked.`,
          `@${username} ${main} on command? say less.`,
          `@${username} dropping ${main} like you own the place (you kinda do).`,
        ]
      : [
          `@${username} ${main} ${main} we see you.`,
          `@${username} matching the ${main} vibe.`,
          `@${username} approved, keep spamming ${main}.`,
          `@${username} ${main} supremacy.`,
        ];
    const line = options[Math.floor(Math.random() * options.length)];
    this.say(this.sanitizeEmoteLine(line));
    return true;
  }

  private buildEmoteBurstLines(): string[] {
    if (this.emotePool.length === 0) {
      return ['Kappa Kappa', 'PogChamp PogChamp'];
    }
    const lines: string[] = [];
    const totalLines = Math.floor(Math.random() * 4) + 3; // 3-6 lines
    for (let i = 0; i < totalLines; i++) {
      const perLine = Math.floor(Math.random() * 5) + 5; // 5-9 emotes
      const emotes: string[] = [];
      for (let j = 0; j < perLine; j++) {
        const pick = this.emotePool[Math.floor(Math.random() * this.emotePool.length)];
        emotes.push(pick);
      }
      lines.push(emotes.join(' '));
    }
    return lines;
  }

  private maybeSendRandomEmoteBurst(): void {
    if (Date.now() - this.lastEmoteBurst < 3 * 60 * 1000) {
      return;
    }
    if (this.getActiveChatters().length < 5) {
      return;
    }
    if (Math.random() > 0.01) {
      return;
    }
    const lines = this.buildEmoteBurstLines();
    this.lastEmoteBurst = Date.now();
    this.sendResponseLines(lines.join('\n'), true).catch(() => null);
  }

  private shouldTrackCopypasta(message: string): boolean {
    const lower = message.toLowerCase();
    if (message.startsWith('!')) return false;
    if (lower.includes('redeemed') || lower.includes('deposit')) return false;
    if (lower.startsWith('http')) return false;
    const words = message.split(/\s+/).length;
    return message.length >= 60 || words >= 12 || message.includes('\n');
  }

  private trackCopypasta(message: string): void {
    const trimmed = message.trim();
    if (!this.shouldTrackCopypasta(trimmed)) {
      return;
    }
    const key = trimmed.toLowerCase();
    const entry = this.copypastaTracker.get(key) ?? { count: 0, lastSeen: 0 };
    entry.count += 1;
    entry.lastSeen = Date.now();
    this.copypastaTracker.set(key, entry);
    if (entry.count >= 3) {
      this.addCopypastaToVault(trimmed);
    }
  }

  private addCopypastaToVault(text: string): void {
    if (this.copypastaVault.includes(text)) {
      return;
    }
    this.copypastaVault.push(text);
    if (this.copypastaVault.length > this.MAX_COPYPasta) {
      this.copypastaVault.shift();
    }
  }

  private getRandomCopypasta(): string | null {
    if (this.copypastaVault.length === 0) {
      return null;
    }
    return this.copypastaVault[Math.floor(Math.random() * this.copypastaVault.length)];
  }

  private async maybeTriggerTrivia(): Promise<void> {
    if (!this.randomTriviaEnabled) {
      return;
    }
    if (this.activeTrivia || Date.now() < this.nextTriviaTime) {
      return;
    }
    if (this.getActiveChatters().length < 5) {
      return;
    }
    await this.startTrivia();
  }

  private async startTrivia(manual: boolean = false): Promise<boolean> {
    if (this.activeTrivia) {
      if (manual) {
        this.say('⚠️ A trivia question is already active! Answer that one first.');
      }
      return false;
    }
    const question = await this.generateTriviaQuestion();
    if (!question) {
      if (manual) {
        this.say('⚠️ Trivia generator is tired, try again in a bit.');
      }
      this.scheduleNextTrivia();
      return false;
    }
    this.activeTrivia = {
      question,
      expiresAt: Date.now() + 60 * 1000,
    };
    const prefix = question.source === 'ai' ? '🤖 ' : '📚 ';
    const prompt = manual
      ? `${prefix}${question.prompt} (mod triggered)`
      : `${prefix}${question.prompt}`;
    console.log(`[Trivia] Serving ${question.source ?? 'preset'} question: ${question.prompt}`);
    this.say(prompt);
    this.recentTriviaPrompts.push(question.prompt.toLowerCase());
    if (this.recentTriviaPrompts.length > 10) {
      this.recentTriviaPrompts.shift();
    }
    return true;
  }

  private handleTriviaAnswer(username: string, message: string): boolean {
    if (!this.activeTrivia) {
      return false;
    }
    if (Date.now() > this.activeTrivia.expiresAt) {
      this.say('⏱️ Trivia time is up! Nobody snagged the points.');
      this.activeTrivia = undefined;
      this.scheduleNextTrivia();
      return false;
    }
    const normalized = message.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
    if (!normalized) {
      return false;
    }
    const isCorrect = this.activeTrivia.question.answers.some(
      (ans) => normalized === ans || normalized.includes(ans)
    );
    if (!isCorrect) {
      return false;
    }
    const reward = 400;
    this.db.addWin(username, reward, 'Trivia bonus');
    this.say(`🎉 @${username} got it right and wins ${reward.toLocaleString()} points!`);
    this.activeTrivia = undefined;
    this.scheduleNextTrivia();
    return true;
  }

  private scheduleNextTrivia(): void {
    if (!this.randomTriviaEnabled) {
      this.nextTriviaTime = Number.MAX_SAFE_INTEGER;
      return;
    }
    this.nextTriviaTime = Date.now() + this.randomTriviaInterval();
  }

  private randomTriviaInterval(): number {
    const min = 10 * 60 * 1000;
    const max = 20 * 60 * 1000;
    return min + Math.random() * (max - min);
  }

  private isRecentTriviaDuplicate(prompt: string): boolean {
    const normalized = prompt.toLowerCase().trim();
    return this.recentTriviaPrompts.some((existing) => existing === normalized);
  }

  private async generateTriviaQuestion(): Promise<TriviaQuestion | null> {
    try {
      if (this.triviaGenerator) {
        for (let attempt = 0; attempt < 3; attempt++) {
          const aiQuestion = await this.triviaGenerator.generateTrivia(this.recentTriviaPrompts.slice(-10));
          if (!aiQuestion) {
            continue;
          }
          if (this.isRecentTriviaDuplicate(aiQuestion.prompt)) {
            console.warn('[Trivia] AI generated duplicate question, retrying...');
            continue;
          }
          console.log('[Trivia] AI generated new question.');
          return aiQuestion;
        }
        console.warn('[Trivia] AI generator returned duplicates/empty payload; falling back to presets.');
      } else {
        console.warn('[Trivia] No AI trivia generator configured; using presets.');
      }
    } catch (error) {
      console.warn('⚠️ Failed to generate AI trivia question:', error);
    }
    const fallback = TRIVIA_QUESTIONS[Math.floor(Math.random() * TRIVIA_QUESTIONS.length)];
    return fallback.source ? fallback : { ...fallback, source: 'preset' };
  }

  private async handleTriviaCommand(
    username: string,
    args: string[],
    isBroadcaster: boolean,
    hasModPermissions: boolean
  ): Promise<string> {
    if (!hasModPermissions) {
      return `@${username} Only mods or the streamer can use !trivia.`;
    }

    const cleanArgs = args.filter((arg) => arg && arg.trim().length > 0);
    const subcommand = cleanArgs[0]?.toLowerCase() || 'start';
    if (subcommand === 'start') {
      const started = await this.startTrivia(true);
      return started
        ? `@${username} Trivia started! First correct answer wins 400 points.`
        : `@${username} There's already an active trivia question.`;
    }

    if (subcommand === 'enable') {
      if (this.randomTriviaEnabled) {
        return `@${username} Random trivia is already enabled.`;
      }
      this.setRandomTriviaEnabled(true);
      return `@${username} Random trivia events enabled.`;
    }

    if (subcommand === 'disable') {
      if (!this.randomTriviaEnabled) {
        return `@${username} Random trivia is already disabled.`;
      }
      this.setRandomTriviaEnabled(false);
      return `@${username} Random trivia events disabled. Manual !trivia start still works.`;
    }

    if (subcommand === 'status') {
      const status = this.randomTriviaEnabled ? 'enabled' : 'disabled';
      const active = this.activeTrivia ? 'A question is currently active.' : 'No active question.';
      return `@${username} Random trivia is ${status}. ${active}`;
    }

    return `@${username} Usage: !trivia [start|enable|disable|status]`;
  }

  private setRandomTriviaEnabled(enabled: boolean): void {
    this.randomTriviaEnabled = enabled;
    this.scheduleNextTrivia();
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
