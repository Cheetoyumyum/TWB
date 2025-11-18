"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandHandler = void 0;
class CommandHandler {
    constructor(db, games, actions, sevenTV, channel, adHandler) {
        this.db = db;
        this.games = games;
        this.actions = actions;
        this.sevenTV = sevenTV;
        this.adHandler = adHandler;
        this.channel = channel;
    }
    setActiveChattersCallback(callback) {
        this.getActiveChattersCallback = callback;
    }
    async handleCommand(username, command, args) {
        const cmd = command.toLowerCase();
        switch (cmd) {
            case 'balance':
            case 'bal':
            case 'points':
                return this.getBalance(username);
            case 'deposit':
                return this.handleDepositCommand(username, args);
            case 'manualdeposit':
            case 'mdeposit':
                return this.handleManualDeposit(username, args);
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
                return this.handleBuyCommand(username, args);
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
            default:
                return null;
        }
    }
    async handleEmoteCommand(username, args) {
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
    async handleEmoteList(username, args) {
        const query = args.join(' ');
        let emotes;
        if (query) {
            emotes = await this.sevenTV.searchEmotes(this.channel, query);
            if (emotes.length === 0) {
                return `@${username} No emotes found matching "${query}"`;
            }
            const emoteNames = emotes.slice(0, 10).map((e) => e.name).join(', ');
            return `@${username} Found ${emotes.length} emotes: ${emoteNames}${emotes.length > 10 ? '...' : ''}`;
        }
        else {
            emotes = await this.sevenTV.getPopularEmotes(this.channel, 15);
            if (emotes.length === 0) {
                return `@${username} No 7TV emotes found for this channel.`;
            }
            const emoteNames = emotes.map((e) => e.name).join(', ');
            return `@${username} Available 7TV emotes (${emotes.length}): ${emoteNames}`;
        }
    }
    async handleRandomEmote(username) {
        const emote = await this.sevenTV.getRandomEmote(this.channel);
        if (!emote) {
            return `@${username} No 7TV emotes found for this channel.`;
        }
        return `${emote.name} @${username} random emote: ${emote.name}`;
    }
    async handleAdCommand(username, args) {
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
    async handleRainCommand(username, args) {
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
        const eligibleChatters = activeChatters.filter((chatter) => chatter.toLowerCase() !== username.toLowerCase());
        if (eligibleChatters.length === 0) {
            return `@${username} No active chatters to rain on! (Active = chatted in last 5 minutes)`;
        }
        // Determine how many people to rain on
        let numPeople;
        if (numPeopleArg === 'max') {
            // Use all available active chatters
            numPeople = eligibleChatters.length;
        }
        else {
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
        const recipients = [];
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
    getBalance(username) {
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
    handleDepositCommand(username, args) {
        if (args.length > 0) {
            // If amount provided, treat as deposit command
            return this.handleRedeemDeposit(username, args);
        }
        return `@${username} To deposit: 1) Redeem channel points "DEPOSIT: <amount>", then 2) Type !deposit <amount> to confirm. Example: !deposit 10000`;
    }
    handleRedeemDeposit(username, args) {
        if (args.length < 1) {
            return `@${username} Usage: !deposit <amount> - After redeeming channel points "DEPOSIT: <amount>", type this to deposit. Example: !deposit 10000`;
        }
        const amount = parseInt(args[0]);
        if (isNaN(amount) || amount <= 0) {
            return `@${username} Invalid amount. Use a positive number. Example: !deposit 10000`;
        }
        // Deposit the points
        this.db.deposit(username, amount);
        const newBalance = this.db.getUserBalance(username)?.balance || 0;
        return `@${username} ✅ Deposited ${amount.toLocaleString()} points! New balance: ${newBalance.toLocaleString()} points`;
    }
    handleManualDeposit(username, args) {
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
    handleGambleCommand(username, args) {
        if (args.length < 2) {
            return `@${username} Usage: !gamble <game> <bet|all> [options]. Games: coinflip, dice, slots, roulette, blackjack, wheel, rps. Use "all" to bet your entire balance!`;
        }
        const game = args[0].toLowerCase();
        const betArg = args[1].toLowerCase();
        // Check if user wants to go all-in
        let bet;
        if (betArg === 'all' || betArg === 'allin' || betArg === 'all-in') {
            const user = this.db.getUserBalance(username);
            if (!user || user.balance <= 0) {
                return `@${username} You don't have any points to go all-in with! Your balance: ${user?.balance || 0}`;
            }
            bet = user.balance;
        }
        else {
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
    handleCoinFlip(username, args) {
        if (args.length < 2) {
            return `@${username} Usage: !coinflip <bet|all> <heads|tails> - Use "all" to bet your entire balance!`;
        }
        const betArg = args[0].toLowerCase();
        let bet;
        if (betArg === 'all' || betArg === 'allin' || betArg === 'all-in') {
            const user = this.db.getUserBalance(username);
            if (!user || user.balance <= 0) {
                return `@${username} You don't have any points to go all-in with! Your balance: ${user?.balance || 0}`;
            }
            bet = user.balance;
        }
        else {
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
    handleDice(username, args) {
        if (args.length < 1) {
            return `@${username} Usage: !dice <bet|all> - Use "all" to bet your entire balance!`;
        }
        const betArg = args[0].toLowerCase();
        let bet;
        if (betArg === 'all' || betArg === 'allin' || betArg === 'all-in') {
            const user = this.db.getUserBalance(username);
            if (!user || user.balance <= 0) {
                return `@${username} You don't have any points to go all-in with! Your balance: ${user?.balance || 0}`;
            }
            bet = user.balance;
        }
        else {
            bet = parseInt(args[0]);
        }
        if (isNaN(bet) || bet <= 0) {
            return `@${username} Invalid bet amount.`;
        }
        return this.games.diceRoll(username, bet).message;
    }
    handleSlots(username, args) {
        if (args.length < 1) {
            return `@${username} Usage: !slots <bet|all> - Use "all" to bet your entire balance!`;
        }
        const betArg = args[0].toLowerCase();
        let bet;
        if (betArg === 'all' || betArg === 'allin' || betArg === 'all-in') {
            const user = this.db.getUserBalance(username);
            if (!user || user.balance <= 0) {
                return `@${username} You don't have any points to go all-in with! Your balance: ${user?.balance || 0}`;
            }
            bet = user.balance;
        }
        else {
            bet = parseInt(args[0]);
        }
        if (isNaN(bet) || bet <= 0) {
            return `@${username} Invalid bet amount.`;
        }
        return this.games.slots(username, bet).message;
    }
    handleRoulette(username, args) {
        if (args.length < 2) {
            return `@${username} Usage: !roulette <bet|all> <red|black|even|odd|green|number> - Use "all" to bet your entire balance!`;
        }
        const betArg = args[0].toLowerCase();
        let bet;
        if (betArg === 'all' || betArg === 'allin' || betArg === 'all-in') {
            const user = this.db.getUserBalance(username);
            if (!user || user.balance <= 0) {
                return `@${username} You don't have any points to go all-in with! Your balance: ${user?.balance || 0}`;
            }
            bet = user.balance;
        }
        else {
            bet = parseInt(args[0]);
        }
        const choice = args[1];
        if (isNaN(bet) || bet <= 0) {
            return `@${username} Invalid bet amount.`;
        }
        return this.games.roulette(username, bet, choice).message;
    }
    handleBuyCommand(username, args) {
        if (args.length < 1) {
            return `@${username} Usage: !buy <action> [params]. Use !actions to see available actions. Examples: !buy timeout @user, !buy alert Hello!, !buy poll Question? Yes No`;
        }
        const actionId = args[0].toLowerCase();
        // Special handling for different action types
        let params = {};
        if (actionId === 'timeout' && args.length > 1) {
            params = { target: args[1] };
        }
        else if (actionId === 'roast' && args.length > 1) {
            params = { target: args[1] };
        }
        else if (actionId === 'raid' && args.length > 1) {
            params = { target: args[1] };
        }
        else if (actionId === 'challenge' && args.length > 1) {
            params = { target: args[1] };
        }
        else if (actionId === 'poll' && args.length > 1) {
            // Format: !buy poll Question? option1 option2
            const question = args[1];
            const options = args.slice(2);
            params = { question, options: options.length > 0 ? options : ['Yes', 'No'] };
        }
        else if (actionId === 'countdown' && args.length > 1) {
            params = { number: args[1] };
        }
        else if (actionId === 'quote' && args.length > 1) {
            params = { quote: args.slice(1).join(' ') };
        }
        else if (actionId === 'tip' && args.length > 1) {
            params = { message: args.slice(1).join(' ') };
        }
        else if (args.length > 1) {
            params = { message: args.slice(1).join(' ') };
        }
        const result = this.actions.purchaseAction(username, actionId, params);
        return result.message;
    }
    getAvailableActions() {
        const actions = this.actions.getAvailableActions();
        const actionList = actions.map(a => `${a.name} (${a.cost} pts)`).join(', ');
        return `Available actions: ${actionList}. Use !buy <action> to purchase.`;
    }
    getTransactionHistory(username) {
        const transactions = this.db.getTransactions(username, 5);
        if (transactions.length === 0) {
            return `@${username} No transaction history.`;
        }
        const history = transactions
            .map(t => `${t.type}: ${t.amount > 0 ? '+' : ''}${t.amount} (${t.description})`)
            .join(' | ');
        return `@${username} Recent: ${history}`;
    }
    handleBlackjack(username, args) {
        if (args.length < 1) {
            return `@${username} Usage: !blackjack <bet|all> - Play blackjack! Use "all" to bet your entire balance!`;
        }
        const betArg = args[0].toLowerCase();
        let bet;
        if (betArg === 'all' || betArg === 'allin' || betArg === 'all-in') {
            const user = this.db.getUserBalance(username);
            if (!user || user.balance <= 0) {
                return `@${username} You don't have any points to go all-in with! Your balance: ${user?.balance || 0}`;
            }
            bet = user.balance;
        }
        else {
            bet = parseInt(args[0]);
        }
        if (isNaN(bet) || bet <= 0) {
            return `@${username} Invalid bet amount.`;
        }
        return this.games.blackjack(username, bet).message;
    }
    handleWheel(username, args) {
        if (args.length < 1) {
            return `@${username} Usage: !wheel <bet|all> - Spin the wheel! Use "all" to bet your entire balance!`;
        }
        const betArg = args[0].toLowerCase();
        let bet;
        if (betArg === 'all' || betArg === 'allin' || betArg === 'all-in') {
            const user = this.db.getUserBalance(username);
            if (!user || user.balance <= 0) {
                return `@${username} You don't have any points to go all-in with! Your balance: ${user?.balance || 0}`;
            }
            bet = user.balance;
        }
        else {
            bet = parseInt(args[0]);
        }
        if (isNaN(bet) || bet <= 0) {
            return `@${username} Invalid bet amount.`;
        }
        return this.games.wheelOfFortune(username, bet).message;
    }
    handleRPS(username, args) {
        if (args.length < 2) {
            return `@${username} Usage: !rps <bet|all> <rock|paper|scissors> - Use "all" to bet your entire balance!`;
        }
        const betArg = args[0].toLowerCase();
        let bet;
        if (betArg === 'all' || betArg === 'allin' || betArg === 'all-in') {
            const user = this.db.getUserBalance(username);
            if (!user || user.balance <= 0) {
                return `@${username} You don't have any points to go all-in with! Your balance: ${user?.balance || 0}`;
            }
            bet = user.balance;
        }
        else {
            bet = parseInt(args[0]);
        }
        const choice = args[1];
        if (isNaN(bet) || bet <= 0) {
            return `@${username} Invalid bet amount.`;
        }
        return this.games.rockPaperScissors(username, bet, choice).message;
    }
    getLeaderboard() {
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
    getAllInStats(username) {
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
        }
        else if (allInWins > allInLosses && allInWins >= 3) {
            message += ` 🚀 Legend! ${allInWins} all-in wins!`;
        }
        return message;
    }
    getHelp() {
        return `🎮 Games: !coinflip <bet> <heads|tails>, !dice <bet>, !slots <bet>, !roulette <bet> <choice>, !blackjack <bet>, !wheel <bet>, !rps <bet> <rock|paper|scissors> | 💰 Economy: !balance, !leaderboard, !history | 🌧️ Rain: !rain <amount> <people|max> | 🛒 Actions: !buy <action> <target>, !actions | 🎭 Emotes: !emote <name>, !emotelist, !randemote | 📺 Ads: !ad [seconds] | 📖 Use !commands for full list`;
    }
    getAllCommands() {
        return `📋 ALL COMMANDS: 🎮 Games: !coinflip <bet> <h/t>, !dice <bet>, !slots <bet>, !roulette <bet> <red/black/number>, !blackjack <bet>, !wheel <bet>, !rps <bet> <rock/paper/scissors> | 💰 Economy: !balance, !leaderboard, !history | 🌧️ Rain: !rain <amount> <people|max> | 🛒 Actions: !buy timeout @user, !buy alert <msg>, !buy shoutout, !actions | 🎭 Emotes: !emote <name>, !emotelist [search], !randemote | 📺 Ads: !ad [seconds] or !ad end | 💡 Type !help for quick guide`;
    }
}
exports.CommandHandler = CommandHandler;
