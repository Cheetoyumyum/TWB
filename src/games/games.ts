import { BotDatabase } from '../database/database';
import { getGameMinBet } from '../config/prices';

export interface GameResult {
  success: boolean;
  message: string;
  winnings?: number;
  newBalance?: number;
  isAllIn?: boolean;
}

export class GamesModule {
  private db: BotDatabase;

  constructor(db: BotDatabase) {
    this.db = db;
  }

  private validateMinBet(gameId: string, bet: number): { valid: boolean; message?: string } {
    const minBet = getGameMinBet(gameId);
    if (bet < minBet) {
      return {
        valid: false,
        message: `Minimum bet for ${gameId} is ${minBet.toLocaleString()} points.`,
      };
    }
    return { valid: true };
  }

  coinFlip(username: string, bet: number, choice: 'heads' | 'tails'): GameResult {
    const minBetCheck = this.validateMinBet('coinflip', bet);
    if (!minBetCheck.valid) {
      return {
        success: false,
        message: `@${username} ${minBetCheck.message}`,
      };
    }

    const user = this.db.getUserBalance(username);
    if (!user || user.balance < bet) {
      return {
        success: false,
        message: `@${username} You don't have enough points! Your balance: ${user?.balance || 0}`,
      };
    }

    const isAllIn = user.balance === bet;
    const result = Math.random() < 0.5 ? 'heads' : 'tails';
    const won = result === choice.toLowerCase();

    if (won) {
      const winnings = bet * 2;
      this.db.addWin(username, bet, `Coin flip: ${choice} (won ${winnings})`, isAllIn);
      const newBalance = (this.db.getUserBalance(username)?.balance || 0);
      const allInMsg = isAllIn ? ' ALL-IN WIN! 🚀' : '';
      return {
        success: true,
        message: `@${username} 🎉 You won! It was ${result}!${allInMsg} You won ${winnings} points! New balance: ${newBalance}`,
        winnings: winnings,
        newBalance: newBalance,
        isAllIn: isAllIn,
      };
    } else {
      this.db.addLoss(username, bet, `Coin flip: ${choice} (lost ${bet})`, isAllIn);
      const newBalance = (this.db.getUserBalance(username)?.balance || 0);
      const allInMsg = isAllIn ? ' HAHAHAHA YOU LOST IT ALL! 😂💀' : '';
      return {
        success: true,
        message: `@${username} 😢 It was ${result}, you lost ${bet} points.${allInMsg} New balance: ${newBalance}`,
        newBalance: newBalance,
        isAllIn: isAllIn,
      };
    }
  }

  diceRoll(username: string, bet: number): GameResult {
    const minBetCheck = this.validateMinBet('dice', bet);
    if (!minBetCheck.valid) {
      return {
        success: false,
        message: `@${username} ${minBetCheck.message}`,
      };
    }

    const user = this.db.getUserBalance(username);
    if (!user || user.balance < bet) {
      return {
        success: false,
        message: `@${username} You don't have enough points! Your balance: ${user?.balance || 0}`,
      };
    }

    const isAllIn = user.balance === bet;
    const userRoll = Math.floor(Math.random() * 6) + 1;
    const botRoll = Math.floor(Math.random() * 6) + 1;

    if (userRoll > botRoll) {
      const winnings = Math.floor(bet * 1.5);
      this.db.addWin(username, winnings - bet, `Dice roll: ${userRoll} vs ${botRoll} (won ${winnings})`, isAllIn);
      const newBalance = (this.db.getUserBalance(username)?.balance || 0);
      const allInMsg = isAllIn ? ' ALL-IN WIN! 🚀' : '';
      return {
        success: true,
        message: `@${username} 🎲 You rolled ${userRoll}, bot rolled ${botRoll}.${allInMsg} You win ${winnings} points! New balance: ${newBalance}`,
        winnings: winnings,
        newBalance: newBalance,
        isAllIn: isAllIn,
      };
    } else if (userRoll < botRoll) {
      this.db.addLoss(username, bet, `Dice roll: ${userRoll} vs ${botRoll} (lost ${bet})`, isAllIn);
      const newBalance = (this.db.getUserBalance(username)?.balance || 0);
      const allInMsg = isAllIn ? ' HAHAHAHA YOU LOST IT ALL! 😂💀' : '';
      return {
        success: true,
        message: `@${username} 🎲 You rolled ${userRoll}, bot rolled ${botRoll}.${allInMsg} You lose ${bet} points. New balance: ${newBalance}`,
        newBalance: newBalance,
        isAllIn: isAllIn,
      };
    } else {
      // Tie - return bet
      return {
        success: true,
        message: `@${username} 🎲 Tie! You both rolled ${userRoll}. Your bet is returned.`,
        newBalance: user.balance,
      };
    }
  }

  slots(username: string, bet: number): GameResult {
    const minBetCheck = this.validateMinBet('slots', bet);
    if (!minBetCheck.valid) {
      return {
        success: false,
        message: `@${username} ${minBetCheck.message}`,
      };
    }

    const user = this.db.getUserBalance(username);
    if (!user || user.balance < bet) {
      return {
        success: false,
        message: `@${username} You don't have enough points! Your balance: ${user?.balance || 0}`,
      };
    }

    const isAllIn = user.balance === bet;
    const symbols = ['🍒', '🍋', '🍊', '🍇', '🍉', '⭐', '💎'];
    const reel1 = symbols[Math.floor(Math.random() * symbols.length)];
    const reel2 = symbols[Math.floor(Math.random() * symbols.length)];
    const reel3 = symbols[Math.floor(Math.random() * symbols.length)];

    const display = `${reel1} ${reel2} ${reel3}`;

    if (reel1 === reel2 && reel2 === reel3) {
      // Three of a kind - jackpot
      const winnings = bet * 10;
      this.db.addWin(username, winnings - bet, `Slots: ${display} (JACKPOT! won ${winnings})`, isAllIn);
      const newBalance = (this.db.getUserBalance(username)?.balance || 0);
      const allInMsg = isAllIn ? ' ALL-IN JACKPOT! 🚀💰' : '';
      return {
        success: true,
        message: `@${username} 🎰 JACKPOT!${allInMsg} ${display} You won ${winnings} points! New balance: ${newBalance}`,
        winnings: winnings,
        newBalance: newBalance,
        isAllIn: isAllIn,
      };
    } else if (reel1 === reel2 || reel2 === reel3 || reel1 === reel3) {
      // Two of a kind
      const winnings = Math.floor(bet * 2);
      this.db.addWin(username, winnings - bet, `Slots: ${display} (won ${winnings})`, isAllIn);
      const newBalance = (this.db.getUserBalance(username)?.balance || 0);
      const allInMsg = isAllIn ? ' ALL-IN WIN! 🚀' : '';
      return {
        success: true,
        message: `@${username} 🎰 ${display} Two of a kind!${allInMsg} You win ${winnings} points! New balance: ${newBalance}`,
        winnings: winnings,
        newBalance: newBalance,
        isAllIn: isAllIn,
      };
    } else {
      // Loss
      this.db.addLoss(username, bet, `Slots: ${display} (lost ${bet})`, isAllIn);
      const newBalance = (this.db.getUserBalance(username)?.balance || 0);
      const allInMsg = isAllIn ? ' HAHAHAHA YOU LOST IT ALL! 😂💀' : '';
      return {
        success: true,
        message: `@${username} 🎰 ${display} No match.${allInMsg} You lose ${bet} points. New balance: ${newBalance}`,
        newBalance: newBalance,
        isAllIn: isAllIn,
      };
    }
  }

  roulette(username: string, bet: number, choice: string): GameResult {
    const minBetCheck = this.validateMinBet('roulette', bet);
    if (!minBetCheck.valid) {
      return {
        success: false,
        message: `@${username} ${minBetCheck.message}`,
      };
    }

    const user = this.db.getUserBalance(username);
    if (!user || user.balance < bet) {
      return {
        success: false,
        message: `@${username} You don't have enough points! Your balance: ${user?.balance || 0}`,
      };
    }

    const isAllIn = user.balance === bet;
    const number = Math.floor(Math.random() * 37); // 0-36
    const isRed = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36].includes(number);
    const isBlack = number !== 0 && !isRed;
    const isEven = number !== 0 && number % 2 === 0;
    const isOdd = number !== 0 && number % 2 === 1;

    const choiceLower = choice.toLowerCase();
    let won = false;

    if (choiceLower === 'red' && isRed) won = true;
    else if (choiceLower === 'black' && isBlack) won = true;
    else if (choiceLower === 'even' && isEven) won = true;
    else if (choiceLower === 'odd' && isOdd) won = true;
    else if (choiceLower === 'green' && number === 0) won = true;
    else if (!isNaN(parseInt(choiceLower)) && parseInt(choiceLower) === number) won = true;

    if (won) {
      let multiplier = 2;
      if (choiceLower === 'green' || (!isNaN(parseInt(choiceLower)) && parseInt(choiceLower) === number)) {
        multiplier = 35; // Single number or green
      }

      const winnings = bet * multiplier;
      this.db.addWin(username, winnings - bet, `Roulette: ${choice} on ${number} (won ${winnings})`, isAllIn);
      const newBalance = (this.db.getUserBalance(username)?.balance || 0);
      const allInMsg = isAllIn ? ' ALL-IN WIN! 🚀' : '';
      return {
        success: true,
        message: `@${username} 🎡 The ball landed on ${number}${isRed ? ' (RED)' : isBlack ? ' (BLACK)' : ' (GREEN)'}!${allInMsg} You win ${winnings} points! New balance: ${newBalance}`,
        winnings: winnings,
        newBalance: newBalance,
        isAllIn: isAllIn,
      };
    } else {
      this.db.addLoss(username, bet, `Roulette: ${choice} on ${number} (lost ${bet})`, isAllIn);
      const newBalance = (this.db.getUserBalance(username)?.balance || 0);
      const allInMsg = isAllIn ? ' HAHAHAHA YOU LOST IT ALL! 😂💀' : '';
      return {
        success: true,
        message: `@${username} 🎡 The ball landed on ${number}${isRed ? ' (RED)' : isBlack ? ' (BLACK)' : ' (GREEN)'}.${allInMsg} You lose ${bet} points. New balance: ${newBalance}`,
        newBalance: newBalance,
        isAllIn: isAllIn,
      };
    }
  }

  blackjack(username: string, bet: number): GameResult {
    const minBetCheck = this.validateMinBet('blackjack', bet);
    if (!minBetCheck.valid) {
      return {
        success: false,
        message: `@${username} ${minBetCheck.message}`,
      };
    }

    const user = this.db.getUserBalance(username);
    if (!user || user.balance < bet) {
      return {
        success: false,
        message: `@${username} You don't have enough points! Your balance: ${user?.balance || 0}`,
      };
    }

    const isAllIn = user.balance === bet;

    // Deal initial cards
    const userCards: number[] = [this.drawCard(), this.drawCard()];
    const dealerCards: number[] = [this.drawCard(), this.drawCard()];

    const userTotal = this.calculateHand(userCards);
    const dealerTotal = this.calculateHand(dealerCards);

    // Check for natural blackjack
    if (userTotal === 21 && dealerTotal === 21) {
      return {
        success: true,
        message: `@${username} 🃏 Both got blackjack! Push! Your bet is returned.`,
        newBalance: user.balance,
      };
    } else if (userTotal === 21) {
      const winnings = Math.floor(bet * 2.5); // Blackjack pays 3:2
      this.db.addWin(username, winnings - bet, `Blackjack: Natural 21 (won ${winnings})`, isAllIn);
      const newBalance = (this.db.getUserBalance(username)?.balance || 0);
      const allInMsg = isAllIn ? ' ALL-IN BLACKJACK! 🚀💰' : '';
      return {
        success: true,
        message: `@${username} 🃏 BLACKJACK!${allInMsg} ${this.formatCards(userCards)} vs ${this.formatCards([dealerCards[0]])}? You win ${winnings} points! New balance: ${newBalance}`,
        winnings: winnings,
        newBalance: newBalance,
        isAllIn: isAllIn,
      };
    } else if (dealerTotal === 21) {
      this.db.addLoss(username, bet, `Blackjack: Dealer blackjack (lost ${bet})`, isAllIn);
      const newBalance = (this.db.getUserBalance(username)?.balance || 0);
      const allInMsg = isAllIn ? ' HAHAHAHA YOU LOST IT ALL! 😂💀' : '';
      return {
        success: true,
        message: `@${username} 🃏 Dealer blackjack!${allInMsg} ${this.formatCards(userCards)} vs ${this.formatCards(dealerCards)}. You lose ${bet} points. New balance: ${newBalance}`,
        newBalance: newBalance,
        isAllIn: isAllIn,
      };
    }

    // Simple auto-play: user hits until 17+, dealer hits until 17+
    let userHand = [...userCards];
    while (this.calculateHand(userHand) < 17) {
      userHand.push(this.drawCard());
      if (this.calculateHand(userHand) > 21) break; // Bust
    }

    let dealerHand = [...dealerCards];
    while (this.calculateHand(dealerHand) < 17) {
      dealerHand.push(this.drawCard());
      if (this.calculateHand(dealerHand) > 21) break; // Bust
    }

    const finalUserTotal = this.calculateHand(userHand);
    const finalDealerTotal = this.calculateHand(dealerHand);

    // Determine winner
    if (finalUserTotal > 21) {
      this.db.addLoss(username, bet, `Blackjack: Bust with ${finalUserTotal} (lost ${bet})`);
      const newBalance = (this.db.getUserBalance(username)?.balance || 0);
      return {
        success: true,
        message: `@${username} 🃏 BUST! ${this.formatCards(userHand)} (${finalUserTotal}) vs ${this.formatCards(dealerHand)} (${finalDealerTotal}). You lose ${bet} points. New balance: ${newBalance}`,
        newBalance: newBalance,
      };
    } else if (finalDealerTotal > 21) {
      const winnings = bet * 2;
      this.db.addWin(username, bet, `Blackjack: Dealer bust (won ${winnings})`);
      const newBalance = (this.db.getUserBalance(username)?.balance || 0);
      return {
        success: true,
        message: `@${username} 🃏 Dealer busts! ${this.formatCards(userHand)} (${finalUserTotal}) vs ${this.formatCards(dealerHand)} (${finalDealerTotal}). You win ${winnings} points! New balance: ${newBalance}`,
        winnings: winnings,
        newBalance: newBalance,
      };
    } else if (finalUserTotal > finalDealerTotal) {
      const winnings = bet * 2;
      this.db.addWin(username, bet, `Blackjack: ${finalUserTotal} vs ${finalDealerTotal} (won ${winnings})`);
      const newBalance = (this.db.getUserBalance(username)?.balance || 0);
      return {
        success: true,
        message: `@${username} 🃏 You win! ${this.formatCards(userHand)} (${finalUserTotal}) vs ${this.formatCards(dealerHand)} (${finalDealerTotal}). You win ${winnings} points! New balance: ${newBalance}`,
        winnings: winnings,
        newBalance: newBalance,
      };
    } else if (finalUserTotal < finalDealerTotal) {
      this.db.addLoss(username, bet, `Blackjack: ${finalUserTotal} vs ${finalDealerTotal} (lost ${bet})`);
      const newBalance = (this.db.getUserBalance(username)?.balance || 0);
      return {
        success: true,
        message: `@${username} 🃏 You lose! ${this.formatCards(userHand)} (${finalUserTotal}) vs ${this.formatCards(dealerHand)} (${finalDealerTotal}). You lose ${bet} points. New balance: ${newBalance}`,
        newBalance: newBalance,
      };
    } else {
      return {
        success: true,
        message: `@${username} 🃏 Push! ${this.formatCards(userHand)} (${finalUserTotal}) vs ${this.formatCards(dealerHand)} (${finalDealerTotal}). Your bet is returned.`,
        newBalance: user.balance,
      };
    }
  }

  private drawCard(): number {
    return Math.floor(Math.random() * 13) + 1; // 1-13 (Ace=1, J/Q/K=11/12/13)
  }

  private calculateHand(cards: number[]): number {
    let total = 0;
    let aces = 0;

    for (const card of cards) {
      if (card === 1) {
        aces++;
        total += 11;
      } else if (card >= 11) {
        total += 10; // J, Q, K
      } else {
        total += card;
      }
    }

    // Adjust aces
    while (total > 21 && aces > 0) {
      total -= 10;
      aces--;
    }

    return total;
  }

  private formatCards(cards: number[]): string {
    return cards.map(card => {
      if (card === 1) return 'A';
      if (card === 11) return 'J';
      if (card === 12) return 'Q';
      if (card === 13) return 'K';
      return card.toString();
    }).join('-');
  }

  wheelOfFortune(username: string, bet: number): GameResult {
    const minBetCheck = this.validateMinBet('wheel', bet);
    if (!minBetCheck.valid) {
      return {
        success: false,
        message: `@${username} ${minBetCheck.message}`,
      };
    }

    const user = this.db.getUserBalance(username);
    if (!user || user.balance < bet) {
      return {
        success: false,
        message: `@${username} You don't have enough points! Your balance: ${user?.balance || 0}`,
      };
    }

    const isAllIn = user.balance === bet;
    const segments = [
      { name: '2x', multiplier: 2 },
      { name: '1.5x', multiplier: 1.5 },
      { name: '3x', multiplier: 3 },
      { name: 'BUST', multiplier: 0 },
      { name: '5x', multiplier: 5 },
      { name: '1.5x', multiplier: 1.5 },
      { name: 'BUST', multiplier: 0 },
      { name: '2x', multiplier: 2 },
    ];

    const spin = Math.floor(Math.random() * segments.length);
    const segment = segments[spin];
    const winnings = Math.floor(bet * segment.multiplier);

    if (segment.multiplier === 0) {
      this.db.addLoss(username, bet, `Wheel of Fortune: BUST (lost ${bet})`, isAllIn);
      const newBalance = (this.db.getUserBalance(username)?.balance || 0);
      const allInMsg = isAllIn ? ' HAHAHAHA YOU LOST IT ALL! 😂💀' : '';
      return {
        success: true,
        message: `@${username} 🎡 Wheel landed on BUST!${allInMsg} You lose ${bet} points. New balance: ${newBalance}`,
        newBalance: newBalance,
        isAllIn: isAllIn,
      };
    } else {
      this.db.addWin(username, winnings - bet, `Wheel of Fortune: ${segment.name} (won ${winnings})`, isAllIn);
      const newBalance = (this.db.getUserBalance(username)?.balance || 0);
      const allInMsg = isAllIn ? ' ALL-IN WIN! 🚀' : '';
      return {
        success: true,
        message: `@${username} 🎡 Wheel landed on ${segment.name}!${allInMsg} You win ${winnings} points! New balance: ${newBalance}`,
        winnings: winnings,
        newBalance: newBalance,
        isAllIn: isAllIn,
      };
    }
  }

  rockPaperScissors(username: string, bet: number, choice: string): GameResult {
    const minBetCheck = this.validateMinBet('rps', bet);
    if (!minBetCheck.valid) {
      return {
        success: false,
        message: `@${username} ${minBetCheck.message}`,
      };
    }

    const user = this.db.getUserBalance(username);
    if (!user || user.balance < bet) {
      return {
        success: false,
        message: `@${username} You don't have enough points! Your balance: ${user?.balance || 0}`,
      };
    }

    const isAllIn = user.balance === bet;
    const choices = ['rock', 'paper', 'scissors'];
    const choiceLower = choice.toLowerCase();
    
    if (!choices.includes(choiceLower)) {
      return {
        success: false,
        message: `@${username} Invalid choice! Use: rock, paper, or scissors`,
      };
    }

    const botChoice = choices[Math.floor(Math.random() * choices.length)];
    const userIndex = choices.indexOf(choiceLower);
    const botIndex = choices.indexOf(botChoice);

    let won = false;
    if (userIndex === botIndex) {
      // Tie
      return {
        success: true,
        message: `@${username} ✂️ Tie! Both chose ${choiceLower}. Your bet is returned.`,
        newBalance: user.balance,
      };
    } else if ((userIndex + 1) % 3 === botIndex) {
      // User loses
      this.db.addLoss(username, bet, `RPS: ${choiceLower} vs ${botChoice} (lost ${bet})`, isAllIn);
      const newBalance = (this.db.getUserBalance(username)?.balance || 0);
      const allInMsg = isAllIn ? ' HAHAHAHA YOU LOST IT ALL! 😂💀' : '';
      return {
        success: true,
        message: `@${username} ✂️ You lose! ${botChoice} beats ${choiceLower}.${allInMsg} You lose ${bet} points. New balance: ${newBalance}`,
        newBalance: newBalance,
        isAllIn: isAllIn,
      };
    } else {
      // User wins
      won = true;
      const winnings = bet * 2;
      this.db.addWin(username, bet, `RPS: ${choiceLower} vs ${botChoice} (won ${winnings})`, isAllIn);
      const newBalance = (this.db.getUserBalance(username)?.balance || 0);
      const allInMsg = isAllIn ? ' ALL-IN WIN! 🚀' : '';
      return {
        success: true,
        message: `@${username} ✂️ You win!${allInMsg} ${choiceLower} beats ${botChoice}! You win ${winnings} points! New balance: ${newBalance}`,
        winnings: winnings,
        newBalance: newBalance,
        isAllIn: isAllIn,
      };
    }
  }
}

