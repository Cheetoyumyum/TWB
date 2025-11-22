import { BotDatabase } from '../database/database';
import { GamesModule } from '../games/games';
import { ActionsModule } from '../actions/actions';
import { SevenTVService } from '../emotes/sevenTV';
import { AdHandler } from '../ads/adHandler';
import { sanitizeNumber } from '../utils/helpers';
import { PRICES, getGameMinBet } from '../config/prices';

interface PendingDuel {
  challenger: string;
  target: string;
  bet: number;
  challengerStake: number;
  targetStake: number;
  sponsoredPot: number;
  createdAt: number;
}

interface CommandContext {
  isBroadcaster?: boolean;
  isMod?: boolean;
}

export class CommandHandler {
  private db: BotDatabase;
  private games: GamesModule;
  private actions: ActionsModule;
  private sevenTV: SevenTVService;
  private adHandler: AdHandler;
  private channel: string;
  private getActiveChattersCallback?: () => string[];
  private pendingDuels: Map<string, PendingDuel> = new Map();

  constructor(
    db: BotDatabase,
    games: GamesModule,
    actions: ActionsModule,
    sevenTV: SevenTVService,
    channel: string,
    adHandler: AdHandler
  ) {
    this.db = db;
    this.games = games;
    this.actions = actions;
    this.sevenTV = sevenTV;
    this.adHandler = adHandler;
    this.channel = channel;
  }

  setActiveChattersCallback(callback: () => string[]): void {
    this.getActiveChattersCallback = callback;
  }

  async handleCommand(username: string, command: string, args: string[], context?: CommandContext): Promise<string | null> {
    const cmd = command.toLowerCase();

    switch (cmd) {
      case 'balance':
      case 'bal':
      case 'points':
        return this.getBalance(username);

      case 'deposit':
        return this.handleDepositCommand(username, args, context);

      case 'manualdeposit':
      case 'mdeposit':
        return this.handleManualDeposit(username, args);

      case 'ecoreset':
      case 'reseteco':
        return this.handleEcoReset(username);
      
      case 'redeem':
        return this.handleRedeemDeposit(username, args);

      case 'gamble':
      case 'bet':
        return this.handleGambleCommand(username, args);

      case 'coinflip':
      case 'cf':
        return this.handleCoinFlip(username, args);

      case 'dice':
        return this.handleDice(username, args);

      case 'slots':
        return this.handleSlots(username, args);

      case 'roulette':
        return this.handleRoulette(username, args);

      case 'blackjack':
      case 'bj':
        return this.handleBlackjack(username, args);
      
      case 'hit':
        return this.handleBlackjackAction(username, 'hit');
      
      case 'stand':
        return this.handleBlackjackAction(username, 'stand');

      case 'wheel':
      case 'wheeloffortune':
        return this.handleWheel(username, args);

      case 'rps':
      case 'rockpaperscissors':
        return this.handleRPS(username, args);

      case 'leaderboard':
      case 'lb':
      case 'top':
        return this.getLeaderboard();

      case 'allin':
      case 'allins':
      case 'allinstats':
        return this.getAllInStats(username);

      case 'buy':
      case 'purchase':
        return await this.handleBuyCommand(username, args);

      case 'duel':
        return this.handleDuelCommand(username, args);

      case 'accept':
      case 'acceptduel':
        return this.acceptDuel(username);

      case 'decline':
      case 'deny':
      case 'denyduel':
        return this.declineDuel(username);

      case 'actions':
        return this.getAvailableActions();

      case 'history':
      case 'transactions':
        return this.getTransactionHistory(username);

      case 'help':
        return this.getHelp();

      case 'commands':
        return this.getAllCommands();

      case 'emote':
      case 'emotes':
        return await this.handleEmoteCommand(username, args);

      case 'emotelist':
      case 'listemotes':
        return await this.handleEmoteList(username, args);

      case 'randemote':
      case 'randomemote':
        return await this.handleRandomEmote(username);

      case 'ad':
      case 'adbreak':
        return await this.handleAdCommand(username, args);

      case 'rain':
        return await this.handleRainCommand(username, args);

      case 'givepts':
      case 'givepoints':
      case 'give':
        return this.handleGivePoints(username, args, context);

      case 'twb':
        return `@${username} Check out the bot on GitHub: https://github.com/Cheetoyumyum/TWB`;

      default:
        return null;
    }
  }

  private async handleEmoteCommand(username: string, args: string[]): Promise<string> {
    if (args.length < 1) {
      return `@${username} Usage: !emote <name> - Use a 7TV emote, or !emotelist to see available emotes`;
    }

    const emoteName = args[0];
    const emote = await this.sevenTV.getEmote(this.channel, emoteName);

    if (!emote) {
      return `@${username} Emote "${emoteName}" not found. Use !emotelist to see available emotes.`;
    }

    return `${emote.name} @${username} used ${emote.name}`;
  }

  private async handleEmoteList(username: string, args: string[]): Promise<string> {
    const query = args.join(' ');
    let emotes;

    if (query) {
      emotes = await this.sevenTV.searchEmotes(this.channel, query);
      if (emotes.length === 0) {
        return `@${username} No emotes found matching "${query}"`;
      }
      const emoteNames = emotes.slice(0, 10).map((e) => e.name).join(', ');
      return `@${username} Found ${emotes.length} emotes: ${emoteNames}${emotes.length > 10 ? '...' : ''}`;
    } else {
      emotes = await this.sevenTV.getPopularEmotes(this.channel, 15);
      if (emotes.length === 0) {
        return `@${username} No 7TV emotes found for this channel.`;
      }
      const emoteNames = emotes.map((e) => e.name).join(', ');
      return `@${username} Available 7TV emotes (${emotes.length}): ${emoteNames}`;
    }
  }

  private async handleRandomEmote(username: string): Promise<string> {
    const emote = await this.sevenTV.getRandomEmote(this.channel);
    if (!emote) {
      return `@${username} No 7TV emotes found for this channel.`;
    }
    return `${emote.name} @${username} random emote: ${emote.name}`;
  }

  private async handleAdCommand(username: string, args: string[]): Promise<string> {
    // Only allow mods/broadcaster to trigger ads (you can add permission checking here)
    // For now, we'll allow anyone but you can restrict it
    
    if (args.length > 0 && args[0].toLowerCase() === 'end') {
      if (this.adHandler.isAdActive()) {
        this.adHandler.endAd();
        return `@${username} Ad break ended manually.`;
      }
      return `@${username} No active ad break to end.`;
    }

    // Default 180 seconds (3 minutes)
    const duration = args.length > 0 ? parseInt(args[0]) : 180;
    
    if (isNaN(duration) || duration <= 0) {
      return `@${username} Usage: !ad [duration in seconds] or !ad end. Example: !ad 180 (for 3 minutes)`;
    }

    if (this.adHandler.isAdActive()) {
      return `@${username} Ad break already running! Use !ad end to stop it.`;
    }

    this.adHandler.startAd(duration);
    return `@${username} Ad break started for ${duration} seconds.`;
  }

  private async handleRainCommand(username: string, args: string[]): Promise<string> {
    if (args.length < 2) {
      return `@${username} Usage: !rain <total_amount> <number_of_people> - Rain points to active chatters! Example: !rain 1000 5 or !rain 1000 max`;
    }

    const totalAmount = parseInt(args[0]);
    const numPeopleArg = args[1].toLowerCase();

    if (isNaN(totalAmount) || totalAmount <= 0) {
      return `@${username} Invalid amount. Use a positive number.`;
    }

    // Check if user has enough points
    const user = this.db.getUserBalance(username);
    if (!user || user.balance < totalAmount) {
      return `@${username} You don't have enough points! Need ${totalAmount.toLocaleString()}, you have ${user?.balance.toLocaleString() || 0}.`;
    }

    // Get active chatters
    if (!this.getActiveChattersCallback) {
      return `@${username} Rain system not available.`;
    }

    const activeChatters = this.getActiveChattersCallback();
    
    // Remove the rain giver from the list
    const eligibleChatters = activeChatters.filter(
      (chatter) => chatter.toLowerCase() !== username.toLowerCase()
    );

    if (eligibleChatters.length === 0) {
      return `@${username} No active chatters to rain on! (Active = chatted in last 5 minutes)`;
    }

    // Determine how many people to rain on
    let numPeople: number;
    if (numPeopleArg === 'max') {
      // Use all available active chatters
      numPeople = eligibleChatters.length;
    } else {
      numPeople = parseInt(numPeopleArg);
      if (isNaN(numPeople) || numPeople <= 0 || numPeople > 50) {
        return `@${username} Invalid number of people. Use a number 1-50 or "max" to rain on all active chatters.`;
      }
      // Cap at available chatters
      numPeople = Math.min(numPeople, eligibleChatters.length);
    }

    // Select random chatters (or all if max)
    const selectedChatters = eligibleChatters
      .sort(() => Math.random() - 0.5)
      .slice(0, numPeople);

    if (selectedChatters.length === 0) {
      return `@${username} No eligible chatters found!`;
    }

    // Always divide evenly - calculate per-person amount
    const perPerson = Math.floor(totalAmount / selectedChatters.length);
    const remainder = totalAmount - (perPerson * selectedChatters.length);

    if (perPerson <= 0) {
      return `@${username} Amount too small! Need at least ${selectedChatters.length} points to rain on ${selectedChatters.length} people.`;
    }

    // Withdraw from user
    if (!this.db.withdraw(username, totalAmount)) {
      return `@${username} Failed to process rain.`;
    }

    // Distribute evenly to all selected chatters
    const recipients: string[] = [];
    for (let i = 0; i < selectedChatters.length; i++) {
      const chatter = selectedChatters[i];
      // Give base amount to everyone
      let amount = perPerson;
      // Give remainder to first person
      if (i === 0 && remainder > 0) {
        amount += remainder;
      }
      this.db.addWin(chatter, amount, `Rain from ${username}`);
      recipients.push(chatter);
    }

    // Build response
    const recipientList = recipients.slice(0, 10).map(r => `@${r}`).join(', ');
    const moreText = recipients.length > 10 ? ` and ${recipients.length - 10} more` : '';
    const perPersonDisplay = remainder > 0 
      ? `${perPerson.toLocaleString()}-${(perPerson + remainder).toLocaleString()}` 
      : perPerson.toLocaleString();
    
    return `🌧️ @${username} rained ${totalAmount.toLocaleString()} points on ${selectedChatters.length} active chatters! ${recipientList}${moreText} - each got ${perPersonDisplay} points! 🌧️`;
  }

  private getBalance(username: string): string {
    const user = this.db.getUserBalance(username);
    if (!user) {
      return `@${username} You don't have an account yet. Redeem channel points with "DEPOSIT: <amount>" to get started!`;
    }
    const allInWins = user.allInWins || 0;
    const allInLosses = user.allInLosses || 0;
    const allInText = allInWins > 0 || allInLosses > 0 
      ? ` | All-Ins: ${allInWins}W/${allInLosses}L`
      : '';
    return `@${username} Balance: ${user.balance.toLocaleString()} pts | Deposited: ${user.totalDeposited.toLocaleString()} | Won: ${user.totalWon.toLocaleString()} | Lost: ${user.totalLost.toLocaleString()}${allInText}`;
  }

  private handleDepositCommand(username: string, args: string[], context?: CommandContext): string {
    const isStreamer = context?.isBroadcaster ?? false;
    if (!isStreamer) {
      return this.getDepositInstructions(username);
    }

    if (args.length < 1) {
      return `@${username} Usage: !deposit <amount> - Add the channel points you just redeemed. Example: !deposit 10000`;
    }

    return this.handleRedeemDeposit(username, args);
  }

  private getDepositInstructions(username: string): string {
    return `@${username} To deposit: 1) Redeem channel points "DEPOSIT: <amount>", then 2) Type !deposit <amount> to confirm. Example: !deposit 10000`;
  }

  private handleRedeemDeposit(username: string, args: string[]): string {
    if (args.length < 1) {
      return this.getDepositInstructions(username);
    }
    const amount = parseInt(args[0]);
    if (isNaN(amount) || amount <= 0) {
      return `@${username} Invalid amount. Usage: !deposit <amount> (example: !deposit 10000)`;
    }
    
    // Deposit the points
    this.db.deposit(username, amount);
    const newBalance = this.db.getUserBalance(username)?.balance || 0;
    return `@${username} ✅ Deposited ${amount.toLocaleString()} points! New balance: ${newBalance.toLocaleString()} points`;
  }

  private handleManualDeposit(username: string, args: string[]): string {
    if (args.length < 1) {
      return `@${username} Usage: !manualdeposit <amount> (Admin/Mod only - for testing)`;
    }
    const amount = parseInt(args[0]);
    if (isNaN(amount) || amount <= 0) {
      return `@${username} Invalid amount. Use a positive number.`;
    }
    // Note: In production, you'd want to check for mod/admin permissions here
    this.db.deposit(username, amount);
    const newBalance = this.db.getUserBalance(username)?.balance || 0;
    return `@${username} Manually deposited ${amount} points! New balance: ${newBalance}`;
  }
  
  private handleEcoReset(username: string): string {
    this.db.resetEconomy();
    return `@${username} Economy reset complete. All balances cleared.`;
  }

  private handleGambleCommand(username: string, args: string[]): string {
    if (args.length < 2) {
      return `@${username} Usage: !gamble <game> <bet|all> [options]. Games: coinflip, dice, slots, roulette, blackjack, wheel, rps. Use "all" to bet your entire balance!`;
    }

    const game = args[0].toLowerCase();
    const betArg = args[1].toLowerCase();
    
    // Check if user wants to go all-in
    let bet: number;
    if (betArg === 'all' || betArg === 'allin' || betArg === 'all-in') {
      const user = this.db.getUserBalance(username);
      if (!user || user.balance <= 0) {
        return `@${username} You don't have any points to go all-in with! Your balance: ${user?.balance || 0}`;
      }
      bet = user.balance;
    } else {
      bet = parseInt(betArg);
    }

    if (isNaN(bet) || bet <= 0) {
      return `@${username} Invalid bet amount. Use a positive number.`;
    }

    switch (game) {
      case 'coinflip':
      case 'cf':
        const choice = args[2]?.toLowerCase() || (Math.random() < 0.5 ? 'heads' : 'tails');
        if (choice !== 'heads' && choice !== 'tails') {
          return `@${username} Choose heads or tails!`;
        }
        return this.games.coinFlip(username, bet, choice).message;

      case 'dice':
        return this.games.diceRoll(username, bet).message;

      case 'slots':
        return this.games.slots(username, bet).message;

      case 'roulette':
        const rouletteChoice = args[2] || 'red';
        return this.games.roulette(username, bet, rouletteChoice).message;

      default:
        return `@${username} Unknown game. Available: coinflip, dice, slots, roulette`;
    }
  }

  private handleCoinFlip(username: string, args: string[]): string {
    if (args.length < 2) {
      return `@${username} Usage: !coinflip <bet|all> <heads|tails> - Use "all" to bet your entire balance!`;
    }

    const betArg = args[0].toLowerCase();
    let bet: number;
    if (betArg === 'all' || betArg === 'allin' || betArg === 'all-in') {
      const user = this.db.getUserBalance(username);
      if (!user || user.balance <= 0) {
        return `@${username} You don't have any points to go all-in with! Your balance: ${user?.balance || 0}`;
      }
      bet = user.balance;
    } else {
      bet = parseInt(args[0]);
    }
    const choice = args[1]?.toLowerCase();

    if (isNaN(bet) || bet <= 0) {
      return `@${username} Invalid bet amount.`;
    }

    if (choice !== 'heads' && choice !== 'tails') {
      return `@${username} Choose heads or tails!`;
    }

    return this.games.coinFlip(username, bet, choice).message;
  }

  private handleDice(username: string, args: string[]): string {
    if (args.length < 1) {
      return `@${username} Usage: !dice <bet|all> - Use "all" to bet your entire balance!`;
    }

    const betArg = args[0].toLowerCase();
    let bet: number;
    if (betArg === 'all' || betArg === 'allin' || betArg === 'all-in') {
      const user = this.db.getUserBalance(username);
      if (!user || user.balance <= 0) {
        return `@${username} You don't have any points to go all-in with! Your balance: ${user?.balance || 0}`;
      }
      bet = user.balance;
    } else {
      bet = parseInt(args[0]);
    }
    if (isNaN(bet) || bet <= 0) {
      return `@${username} Invalid bet amount.`;
    }

    return this.games.diceRoll(username, bet).message;
  }

  private handleSlots(username: string, args: string[]): string {
    if (args.length < 1) {
      return `@${username} Usage: !slots <bet|all> - Use "all" to bet your entire balance!`;
    }

    const betArg = args[0].toLowerCase();
    let bet: number;
    if (betArg === 'all' || betArg === 'allin' || betArg === 'all-in') {
      const user = this.db.getUserBalance(username);
      if (!user || user.balance <= 0) {
        return `@${username} You don't have any points to go all-in with! Your balance: ${user?.balance || 0}`;
      }
      bet = user.balance;
    } else {
      bet = parseInt(args[0]);
    }
    if (isNaN(bet) || bet <= 0) {
      return `@${username} Invalid bet amount.`;
    }

    return this.games.slots(username, bet).message;
  }

  private handleRoulette(username: string, args: string[]): string {
    if (args.length < 2) {
      return `@${username} Usage: !roulette <bet|all> <red|black|even|odd|green|number> - Use "all" to bet your entire balance!`;
    }

    const betArg = args[0].toLowerCase();
    let bet: number;
    if (betArg === 'all' || betArg === 'allin' || betArg === 'all-in') {
      const user = this.db.getUserBalance(username);
      if (!user || user.balance <= 0) {
        return `@${username} You don't have any points to go all-in with! Your balance: ${user?.balance || 0}`;
      }
      bet = user.balance;
    } else {
      bet = parseInt(args[0]);
    }
    const choice = args[1];

    if (isNaN(bet) || bet <= 0) {
      return `@${username} Invalid bet amount.`;
    }

    return this.games.roulette(username, bet, choice).message;
  }

  private async handleBuyCommand(username: string, args: string[]): Promise<string> {
    if (args.length < 1) {
      return `@${username} Usage: !buy <action> [params]. Run !actions to see syntax (e.g., !buy timeout @user, !buy poll Question? | Option 1 | Option 2).`;
    }

    const actionId = args[0].toLowerCase();
    
    // Special handling for different action types
    let params: Record<string, any> = {};
    
    if (actionId === 'timeout' && args.length > 1) {
      params = { target: args[1] };
    } else if (actionId === 'roast' && args.length > 1) {
      params = { target: args[1] };
    } else if (actionId === 'raid' && args.length > 1) {
      params = { target: args[1] };
    } else if (actionId === 'challenge' && args.length > 1) {
      params = { target: args[1], wager: args[2] };
    } else if (actionId === 'poll' || actionId === 'prediction') {
      const parsed = this.parsePipeArgs(args);
      if (!parsed) {
        const usage = actionId === 'poll'
          ? `@${username} Usage: !buy poll Question? | Option 1 | Option 2 [| duration=120] — example: !buy poll Best snack? | Pizza | Wings | duration=90`
          : `@${username} Usage: !buy prediction Title? | Outcome 1 | Outcome 2 [| duration=120] — example: !buy prediction Will boss win? | Yes | No | duration=120`;
        return usage;
      }
      params = parsed;
    } else if (actionId === 'countdown' && args.length > 1) {
      params = { number: args[1] };
    } else if (actionId === 'quote' && args.length > 1) {
      params = { quote: args.slice(1).join(' ') };
    } else if (actionId === 'tip' && args.length > 1) {
      params = { message: args.slice(1).join(' ') };
    } else if (args.length > 1) {
      params = { message: args.slice(1).join(' ') };
    }

    const result = await this.actions.purchaseAction(username, actionId, params);

    if (
      result.success &&
      result.action?.id === 'challenge' &&
      params.target
    ) {
      const duelMessage = this.issueDuelChallenge(username, params.target, params.wager, true);
      return `${result.message}\n${duelMessage}`;
    }

    return result.message;
  }

  private getAvailableActions(): string {
    const actions = this.actions.getAvailableActions();
    const summary = actions
      .map((action) => `${action.name} ${action.cost.toLocaleString()}pts → ${this.getActionUsageHint(action.id)}`)
      .join(' | ');
    return `🛒 ACTIONS: ${summary} | Run !buy <action> … (see syntax above).`;
  }

  private getTransactionHistory(username: string): string {
    const transactions = this.db.getTransactions(username, 5);
    if (transactions.length === 0) {
      return `@${username} No transaction history.`;
    }

    const history = transactions
      .map(t => `${t.type}: ${t.amount > 0 ? '+' : ''}${t.amount} (${t.description})`)
      .join(' | ');

    return `@${username} Recent: ${history}`;
  }

  private handleDuelCommand(username: string, args: string[]): string {
    this.cleanupExpiredDuels();

    if (args.length < 1) {
      return this.getDuelUsage(username);
    }

    const subCommand = args[0].toLowerCase();

    if (subCommand === 'accept') {
      return this.acceptDuel(username, args[1]);
    }

    if (subCommand === 'decline' || subCommand === 'deny') {
      return this.declineDuel(username, args[1]);
    }

    return this.issueDuelChallenge(username, args[0], args[1]);
  }

  private handleBlackjack(username: string, args: string[]): string {
    if (args.length < 1) {
      return `@${username} Usage: !blackjack <bet|all> - Play blackjack! Use "all" to bet your entire balance! Then use !hit or !stand`;
    }

    const betArg = args[0].toLowerCase();
    let bet: number;
    if (betArg === 'all' || betArg === 'allin' || betArg === 'all-in') {
      const user = this.db.getUserBalance(username);
      if (!user || user.balance <= 0) {
        return `@${username} You don't have any points to go all-in with! Your balance: ${user?.balance || 0}`;
      }
      bet = user.balance;
    } else {
      bet = parseInt(args[0]);
    }
    if (isNaN(bet) || bet <= 0) {
      return `@${username} Invalid bet amount.`;
    }

    return this.games.blackjack(username, bet).message;
  }

  private handleBlackjackAction(username: string, action: 'hit' | 'stand'): string {
    return this.games.blackjack(username, 0, action).message;
  }

  private handleWheel(username: string, args: string[]): string {
    if (args.length < 1) {
      return `@${username} Usage: !wheel <bet|all> - Spin the wheel! Use "all" to bet your entire balance!`;
    }

    const betArg = args[0].toLowerCase();
    let bet: number;
    if (betArg === 'all' || betArg === 'allin' || betArg === 'all-in') {
      const user = this.db.getUserBalance(username);
      if (!user || user.balance <= 0) {
        return `@${username} You don't have any points to go all-in with! Your balance: ${user?.balance || 0}`;
      }
      bet = user.balance;
    } else {
      bet = parseInt(args[0]);
    }
    if (isNaN(bet) || bet <= 0) {
      return `@${username} Invalid bet amount.`;
    }

    return this.games.wheelOfFortune(username, bet).message;
  }

  private issueDuelChallenge(challenger: string, targetArg: string, betArg?: string, fromAction: boolean = false): string {
    const target = this.cleanUsername(targetArg);
    if (!target) {
      return `@${challenger} Please specify who you want to challenge. Example: !duel @user 500`;
    }

    if (target.toLowerCase() === challenger.toLowerCase()) {
      return `@${challenger} You can't challenge yourself!`;
    }

    const minBet = getGameMinBet('coinflip');
    let bet = minBet;
    let sponsoredPot = 0;
    let challengerStake = 0;

    if (fromAction) {
      sponsoredPot = PRICES.actions.challenge * 2;
      bet = sponsoredPot / 2;
    } else {
      const challengerData = this.db.getUserBalance(challenger);
      if (!challengerData || challengerData.balance <= 0) {
        return `@${challenger} You don't have any points to wager!`;
      }

      if (betArg) {
        const wagerText = betArg.toLowerCase();
        if (['all', 'allin', 'all-in'].includes(wagerText)) {
          bet = challengerData.balance;
        } else {
          const parsed = parseInt(betArg.replace(/,/g, ''), 10);
          if (isNaN(parsed) || parsed < minBet) {
            return `@${challenger} Minimum duel wager is ${minBet.toLocaleString()} points.`;
          }
          bet = parsed;
        }
      }

      if (bet < minBet) {
        return `@${challenger} Minimum duel wager is ${minBet.toLocaleString()} points.`;
      }

      if (bet > challengerData.balance) {
        bet = challengerData.balance;
      }

      if (!this.db.withdraw(challenger, bet)) {
        return `@${challenger} You need ${bet.toLocaleString()} points to issue this duel.`;
      }
      challengerStake = bet;
    }

    const key = this.getDuelKey(challenger, target);
    this.pendingDuels.set(key, {
      challenger,
      target,
      bet,
      challengerStake,
      targetStake: 0,
      sponsoredPot,
      createdAt: Date.now(),
    });

    const acceptLine = `Accept with !accept${fromAction ? '' : ` @${challenger}`} (or !duel accept @${challenger})`;
    const declineLine = `Decline with !decline${fromAction ? '' : ` @${challenger}`}`;

    if (fromAction) {
      return `⚔️ Challenge purchased! @${target}, @${challenger} wants a sponsored duel worth ${sponsoredPot.toLocaleString()} points! ${acceptLine}; ${declineLine}. (Expires in 2 minutes)`;
    }

    return `⚔️ Challenge issued! @${target}, @${challenger} locked in ${bet.toLocaleString()} points. ${acceptLine}; ${declineLine}. (Expires in 2 minutes)`;
  }

  private acceptDuel(target: string, challengerArg?: string): string {
    let pending: PendingDuel | undefined;
    let challenger: string | undefined;

    if (challengerArg) {
      challenger = this.cleanUsername(challengerArg);
      if (!challenger) {
        return `@${target} Please specify who challenged you. Example: !duel accept @username`;
      }
      pending = this.pendingDuels.get(this.getDuelKey(challenger, target));
    } else {
      pending = this.findLatestDuelForTarget(target);
      challenger = pending?.challenger;
    }

    if (!pending || !challenger) {
      return `@${target} You don't have a pending challenge${challengerArg ? ` from ${challengerArg}` : ''}.`;
    }

    if (Date.now() - pending.createdAt > 2 * 60 * 1000) {
      this.refundChallenger(pending);
      this.pendingDuels.delete(this.getDuelKey(challenger, target));
      return `@${target} The challenge from ${challenger} expired.`;
    }

    if (!pending.sponsoredPot) {
      if (!this.db.withdraw(target, pending.bet)) {
        this.refundChallenger(pending);
        this.pendingDuels.delete(this.getDuelKey(challenger, target));
        return `@${target} You need ${pending.bet.toLocaleString()} points to accept this duel.`;
      }
      pending.targetStake = pending.bet;
    }

    const totalPot = pending.challengerStake + pending.targetStake + pending.sponsoredPot;

    const challengerWins = Math.random() < 0.5;
    const winner = challengerWins ? pending.challenger : pending.target;
    const loser = challengerWins ? pending.target : pending.challenger;

    this.db.addWin(winner, totalPot, `Duel vs ${loser} (won ${totalPot} points)`);
    this.pendingDuels.delete(this.getDuelKey(challenger, target));

    const winnerBalance = this.db.getUserBalance(winner)?.balance || 0;

    return `⚔️ COINFLIP DUEL ⚔️ ${winner} defeats ${loser} and scoops ${totalPot.toLocaleString()} points! ${winner}'s new balance: ${winnerBalance.toLocaleString()} pts`;
  }

  private declineDuel(target: string, challengerArg?: string): string {
    let pending: PendingDuel | undefined;
    let challenger: string | undefined;

    if (challengerArg) {
      challenger = this.cleanUsername(challengerArg);
      if (!challenger) {
        return `@${target} Please specify who challenged you. Example: !duel decline @username`;
      }
      pending = this.pendingDuels.get(this.getDuelKey(challenger, target));
    } else {
      pending = this.findLatestDuelForTarget(target);
      challenger = pending?.challenger;
    }

    if (!pending || !challenger) {
      return `@${target} You don't have a pending challenge${challengerArg ? ` from ${challengerArg}` : ''}.`;
    }

    this.refundChallenger(pending);
    this.pendingDuels.delete(this.getDuelKey(challenger, target));
    return `@${target} declined ${challenger}'s duel. Maybe next time!`;
  }

  private cleanupExpiredDuels(): void {
    const now = Date.now();
    for (const [key, duel] of this.pendingDuels.entries()) {
      if (now - duel.createdAt > 2 * 60 * 1000) {
        this.refundChallenger(duel);
        this.pendingDuels.delete(key);
      }
    }
  }

  private refundChallenger(duel: PendingDuel): void {
    if (duel.challengerStake > 0) {
      this.db.addWin(duel.challenger, duel.challengerStake, 'Duel refund');
      duel.challengerStake = 0;
    }
  }

  private findLatestDuelForTarget(target: string): PendingDuel | undefined {
    const lowerTarget = target.toLowerCase();
    let latest: PendingDuel | undefined;
    for (const duel of this.pendingDuels.values()) {
      if (duel.target.toLowerCase() === lowerTarget) {
        if (!latest || duel.createdAt > latest.createdAt) {
          latest = duel;
        }
      }
    }
    return latest;
  }

  private getDuelUsage(username: string): string {
    return `@${username} Usage: !duel @user <bet|all> to challenge. Target can respond with !accept [@challenger] or !decline [@challenger].`;
  }

  private cleanUsername(raw: string): string {
    return raw?.replace('@', '').trim() || '';
  }

  private getDuelKey(challenger: string, target: string): string {
    return `${challenger.toLowerCase()}::${target.toLowerCase()}`;
  }

  private handleRPS(username: string, args: string[]): string {
    if (args.length < 2) {
      return `@${username} Usage: !rps <bet|all> <rock|paper|scissors> - Use "all" to bet your entire balance!`;
    }

    const betArg = args[0].toLowerCase();
    let bet: number;
    if (betArg === 'all' || betArg === 'allin' || betArg === 'all-in') {
      const user = this.db.getUserBalance(username);
      if (!user || user.balance <= 0) {
        return `@${username} You don't have any points to go all-in with! Your balance: ${user?.balance || 0}`;
      }
      bet = user.balance;
    } else {
      bet = parseInt(args[0]);
    }
    const choice = args[1];

    if (isNaN(bet) || bet <= 0) {
      return `@${username} Invalid bet amount.`;
    }

    return this.games.rockPaperScissors(username, bet, choice).message;
  }

  private getLeaderboard(): string {
    const topUsers = this.db.getLeaderboard(10);
    if (topUsers.length === 0) {
      return `No users on the leaderboard yet! Deposit points to get started!`;
    }

    const leaderboard = topUsers
      .map((user, index) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
        return `${medal} ${user.username}: ${user.balance.toLocaleString()} pts`;
      })
      .join(' | ');

    return `🏆 Top 10 Leaderboard: ${leaderboard}`;
  }

  private getAllInStats(username: string): string {
    const user = this.db.getUserBalance(username);
    if (!user) {
      return `@${username} You don't have an account yet. Redeem channel points with "DEPOSIT: <amount>" to get started!`;
    }

    const allInWins = user.allInWins || 0;
    const allInLosses = user.allInLosses || 0;
    const totalAllIns = allInWins + allInLosses;

    if (totalAllIns === 0) {
      return `@${username} You haven't done any all-in bets yet! Bet your entire balance to go all-in! 💪`;
    }

    const winRate = totalAllIns > 0 ? Math.round((allInWins / totalAllIns) * 100) : 0;
    
    let message = `@${username} All-In Stats: ${allInWins} wins, ${allInLosses} losses (${totalAllIns} total) - ${winRate}% win rate`;
    
    if (allInLosses > allInWins && allInLosses >= 3) {
      message += ` 😂 HAHAHAHA ${allInLosses} times you lost it all!`;
    } else if (allInWins > allInLosses && allInWins >= 3) {
      message += ` 🚀 Legend! ${allInWins} all-in wins!`;
    }

    return message;
  }

  private getHelp(): string {
    return [
      'ℹ️ QUICK GUIDE:',
      '🎮 Games: !coinflip <bet> <h/t> | !dice <bet> | !slots <bet> | !roulette <bet> <choice> | !blackjack <bet> (then !hit/!stand) | !wheel <bet> | !rps <bet> <rock/paper/scissors> | !duel @user <bet>',
      '💰 Economy: !balance | !leaderboard | !history | !rain <amount> <count|max>',
      '🛒 Actions: !actions to view prices, then !buy <action> … (examples: timeout @user, poll Question? | A | B)',
      '📚 Need more? Use !commands for the full list.',
    ].join(' ');
  }

  private handleGivePoints(username: string, args: string[], context?: CommandContext): string {
    if (args.length < 2) {
      return `@${username} Usage: !givepts <@user> <amount> - Give points to a user (Streamer/Mod only)`;
    }

    const targetUser = args[0].replace('@', '').trim();
    const amount = parseInt(args[1]);

    if (isNaN(amount) || amount <= 0) {
      return `@${username} Invalid amount. Use a positive number.`;
    }

    if (targetUser.toLowerCase() === username.toLowerCase()) {
      return `@${username} You can't give points to yourself.`;
    }

    const giver = this.db.getUserBalance(username);
    if (!giver || giver.balance <= 0) {
      return `@${username} You don't have any points to give!`;
    }

    const isStreamer = context?.isBroadcaster ?? false;
    const fee = isStreamer ? 0 : Math.max(Math.ceil(amount * 0.1), 100);
    const totalCost = amount + fee;

    if (giver.balance < totalCost) {
      return `@${username} You need ${totalCost.toLocaleString()} points to give that amount (includes fee of ${fee.toLocaleString()} pts).`;
    }

    this.db.addLoss(username, totalCost, `Gifted ${amount} pts to ${targetUser}${fee > 0 ? ' (incl. fee)' : ''}`);
    this.db.addWin(targetUser, amount, `Gifted by ${username}`);
    const newBalance = this.db.getUserBalance(targetUser)?.balance || 0;
    
    const feeText = fee > 0 ? ` (cost you ${fee.toLocaleString()} pts fee)` : '';
    return `@${username} ✅ Gave ${amount.toLocaleString()} points to @${targetUser}${feeText} — their new balance: ${newBalance.toLocaleString()} pts`;
  }

  private getActionUsageHint(actionId: string): string {
    switch (actionId) {
      case 'alert':
        return '!buy alert <message>';
      case 'highlight':
        return '!buy highlight <message>';
      case 'sound':
        return '!buy sound';
      case 'timeout':
        return '!buy timeout @user';
      case 'shoutout':
        return '!buy shoutout @user';
      case 'emote':
        return '!buy emote';
      case 'poll':
        return '!buy poll Q? | Option 1 | Option 2 [| duration]';
      case 'prediction':
        return '!buy prediction Title? | Outcome 1 | Outcome 2 [| duration]';
      case 'countdown':
        return '!buy countdown <seconds>';
      case 'quote':
        return '!buy quote <message>';
      case 'roast':
        return '!buy roast @user';
      case 'compliment':
        return '!buy compliment';
      case 'raid':
        return '!buy raid @channel';
      case 'challenge':
        return '!buy challenge @user [bet]';
      case 'streak':
        return '!buy streak';
      default:
        return `!buy ${actionId}`;
    }
  }

  private getAllCommands(): string {
    return ['📋 COMMANDS:', '🎮 Games → !coinflip <bet> <h/t>, !dice <bet>, !slots <bet>, !roulette <bet> <choice>, !blackjack <bet> (!hit/!stand), !wheel <bet>, !rps <bet> <r/p/s>, !duel @user <bet|all>', '💰 Economy → !balance | !leaderboard | !history | !rain <amount> <count|max> | (Streamer) !deposit <amount> | !allin', '🛒 Actions → !actions + !buy <action> … (timeout @user, poll Q? | A | B, etc.)', '⚙️ Mods → !givepts @user <amount> | !ecoReset | !help / !commands'].join(' ');
  }
  private parsePipeArgs(args: string[]): { question: string; options: string[]; duration?: number } | null {
    if (args.length < 2) return null;
    const combined = args.slice(1).join(' ');
    const parts = combined.split('|').map((part) => part.trim()).filter(Boolean);
    if (parts.length < 3) {
      return null;
    }

    let duration: number | undefined;
    const last = parts[parts.length - 1];
    const durationMatch = last.match(/^duration\s*=?\s*(\d+)/i);
    if (durationMatch) {
      duration = sanitizeNumber(durationMatch[1], 15, 1800) ?? undefined;
      parts.pop();
    }

    const question = parts[0];
    const options = parts.slice(1);

    if (!question || options.length < 2) {
      return null;
    }

    return { question, options, duration };
  }
}
