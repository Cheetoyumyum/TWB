import * as path from 'path';
import * as fs from 'fs';

export interface UserBalance {
  username: string;
  balance: number;
  totalDeposited: number;
  totalWon: number;
  totalLost: number;
  allInWins: number;
  allInLosses: number;
  lastUpdated: string;
}

export interface Transaction {
  id: number;
  username: string;
  type: 'deposit' | 'withdraw' | 'win' | 'loss' | 'purchase' | 'reset';
  amount: number;
  description: string;
  timestamp: string;
}

interface DatabaseData {
  userBalances: Record<string, UserBalance>;
  transactions: Transaction[];
  chatContext: Array<{
    username: string;
    message: string;
    response: string | null;
    timestamp: string;
  }>;
  redemptionCounts: Record<string, Record<string, number>>; // username -> redemptionType -> count
  nextTransactionId: number;
}

export class BotDatabase {
  private dbPath: string;
  private data!: DatabaseData;

  constructor(dbPath: string) {
    this.dbPath = dbPath;
    
    // Ensure data directory exists
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Load or initialize database
    if (fs.existsSync(dbPath)) {
      try {
        const fileData = fs.readFileSync(dbPath, 'utf-8');
        this.data = JSON.parse(fileData);
        // Ensure all required fields exist
        this.data.userBalances = this.data.userBalances || {};
        this.data.transactions = this.data.transactions || [];
        this.data.chatContext = this.data.chatContext || [];
        this.data.redemptionCounts = this.data.redemptionCounts || {};
        this.data.nextTransactionId = this.data.nextTransactionId || 1;
      } catch (error) {
        console.warn('Failed to load database, initializing new one:', error);
        this.initializeData();
      }
    } else {
      this.initializeData();
    }

    // Auto-save every 30 seconds
    setInterval(() => this.save(), 30000);
  }

  private initializeData(): void {
    this.data = {
      userBalances: {},
      transactions: [],
      chatContext: [],
      redemptionCounts: {},
      nextTransactionId: 1,
    };
    this.save();
  }

  private save(): void {
    try {
      fs.writeFileSync(this.dbPath, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (error) {
      console.error('Failed to save database:', error);
    }
  }

  getUserBalance(username: string): UserBalance | null {
    const key = username.toLowerCase();
    const user = this.data.userBalances[key];
    if (!user) return null;

    return {
      username: user.username,
      balance: user.balance,
      totalDeposited: user.totalDeposited,
      totalWon: user.totalWon,
      totalLost: user.totalLost,
      allInWins: user.allInWins || 0,
      allInLosses: user.allInLosses || 0,
      lastUpdated: user.lastUpdated,
    };
  }

  createOrUpdateBalance(username: string, balance: number): void {
    const key = username.toLowerCase();
    const now = new Date().toISOString();
    
    if (!this.data.userBalances[key]) {
      this.data.userBalances[key] = {
        username: key,
        balance: balance,
        totalDeposited: 0,
        totalWon: 0,
        totalLost: 0,
        allInWins: 0,
        allInLosses: 0,
        lastUpdated: now,
      };
    } else {
      this.data.userBalances[key].balance += balance;
      this.data.userBalances[key].lastUpdated = now;
    }
    
    this.save();
  }

  deposit(username: string, amount: number): void {
    const key = username.toLowerCase();
    const now = new Date().toISOString();

    if (!this.data.userBalances[key]) {
      this.data.userBalances[key] = {
        username: key,
        balance: amount,
        totalDeposited: amount,
        totalWon: 0,
        totalLost: 0,
        allInWins: 0,
        allInLosses: 0,
        lastUpdated: now,
      };
    } else {
      this.data.userBalances[key].balance += amount;
      this.data.userBalances[key].totalDeposited += amount;
      this.data.userBalances[key].lastUpdated = now;
    }

    this.addTransaction(username, 'deposit', amount, `Deposited ${amount} channel points`);
  }

  withdraw(username: string, amount: number): boolean {
    const user = this.getUserBalance(username);
    if (!user || user.balance < amount) {
      return false;
    }

    const key = username.toLowerCase();
    const now = new Date().toISOString();
    this.data.userBalances[key].balance -= amount;
    this.data.userBalances[key].lastUpdated = now;

    this.addTransaction(username, 'withdraw', amount, `Withdrew ${amount} points`);
    return true;
  }

  addWin(username: string, amount: number, description: string, isAllIn: boolean = false): void {
    const key = username.toLowerCase();
    const now = new Date().toISOString();

    if (!this.data.userBalances[key]) {
      this.data.userBalances[key] = {
        username: key,
        balance: amount,
        totalDeposited: 0,
        totalWon: amount,
        totalLost: 0,
        allInWins: isAllIn ? 1 : 0,
        allInLosses: 0,
        lastUpdated: now,
      };
    } else {
      this.data.userBalances[key].balance += amount;
      this.data.userBalances[key].totalWon += amount;
      if (isAllIn) {
        this.data.userBalances[key].allInWins = (this.data.userBalances[key].allInWins || 0) + 1;
      }
      this.data.userBalances[key].lastUpdated = now;
    }

    this.addTransaction(username, 'win', amount, description);
  }

  addLoss(username: string, amount: number, description: string, isAllIn: boolean = false): void {
    const user = this.getUserBalance(username);
    if (!user) return;

    const key = username.toLowerCase();
    const now = new Date().toISOString();
    this.data.userBalances[key].balance = Math.max(0, this.data.userBalances[key].balance - amount);
    this.data.userBalances[key].totalLost += amount;
    if (isAllIn) {
      this.data.userBalances[key].allInLosses = (this.data.userBalances[key].allInLosses || 0) + 1;
    }
    this.data.userBalances[key].lastUpdated = now;

    this.addTransaction(username, 'loss', amount, description);
  }

  resetEconomy(): void {
    const now = new Date().toISOString();
    for (const key of Object.keys(this.data.userBalances)) {
      this.data.userBalances[key].balance = 0;
      this.data.userBalances[key].totalWon = 0;
      this.data.userBalances[key].totalLost = 0;
      this.data.userBalances[key].allInWins = 0;
      this.data.userBalances[key].allInLosses = 0;
      this.data.userBalances[key].lastUpdated = now;
    }
    this.addTransaction('system', 'reset', 0, 'Economy reset');
    this.save();
  }

  purchase(username: string, amount: number, description: string): boolean {
    if (!this.withdraw(username, amount)) {
      return false;
    }
    this.addTransaction(username, 'purchase', amount, description);
    return true;
  }

  addTransaction(
    username: string,
    type: Transaction['type'],
    amount: number,
    description: string
  ): void {
    const transaction: Transaction = {
      id: this.data.nextTransactionId++,
      username: username.toLowerCase(),
      type,
      amount,
      description,
      timestamp: new Date().toISOString(),
    };

    this.data.transactions.push(transaction);
    this.save();
  }

  getTransactions(username: string, limit: number = 10): Transaction[] {
    return this.data.transactions
      .filter(t => t.username === username.toLowerCase())
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  saveChatContext(username: string, message: string, response?: string): void {
    this.data.chatContext.push({
      username: username.toLowerCase(),
      message,
      response: response || null,
      timestamp: new Date().toISOString(),
    });

    // Keep only last 1000 entries
    if (this.data.chatContext.length > 1000) {
      this.data.chatContext = this.data.chatContext.slice(-1000);
    }

    this.save();
  }

  getChatHistory(username: string, limit: number = 5): Array<{ message: string; response: string | null }> {
    return this.data.chatContext
      .filter(c => c.username === username.toLowerCase())
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit)
      .map(c => ({
        message: c.message,
        response: c.response,
      }));
  }

  getLeaderboard(limit: number = 10): UserBalance[] {
    return Object.values(this.data.userBalances)
      .map(user => ({
        ...user,
        allInWins: user.allInWins || 0,
        allInLosses: user.allInLosses || 0,
      }))
      .sort((a, b) => b.balance - a.balance)
      .slice(0, limit);
  }

  incrementRedemptionCount(username: string, redemptionType: string): number {
    const key = username.toLowerCase();
    if (!this.data.redemptionCounts[key]) {
      this.data.redemptionCounts[key] = {};
    }
    if (!this.data.redemptionCounts[key][redemptionType]) {
      this.data.redemptionCounts[key][redemptionType] = 0;
    }
    this.data.redemptionCounts[key][redemptionType]++;
    this.save();
    return this.data.redemptionCounts[key][redemptionType];
  }

  getRedemptionCount(username: string, redemptionType: string): number {
    const key = username.toLowerCase();
    if (!this.data.redemptionCounts[key] || !this.data.redemptionCounts[key][redemptionType]) {
      return 0;
    }
    return this.data.redemptionCounts[key][redemptionType];
  }

  close(): void {
    this.save();
  }
}

