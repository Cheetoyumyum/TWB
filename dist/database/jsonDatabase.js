"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.BotDatabase = void 0;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
class BotDatabase {
    constructor(dbPath) {
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
            }
            catch (error) {
                console.warn('Failed to load database, initializing new one:', error);
                this.initializeData();
            }
        }
        else {
            this.initializeData();
        }
        // Auto-save every 30 seconds
        setInterval(() => this.save(), 30000);
    }
    initializeData() {
        this.data = {
            userBalances: {},
            transactions: [],
            chatContext: [],
            redemptionCounts: {},
            nextTransactionId: 1,
        };
        this.save();
    }
    save() {
        try {
            fs.writeFileSync(this.dbPath, JSON.stringify(this.data, null, 2), 'utf-8');
        }
        catch (error) {
            console.error('Failed to save database:', error);
        }
    }
    getUserBalance(username) {
        const key = username.toLowerCase();
        const user = this.data.userBalances[key];
        if (!user)
            return null;
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
    createOrUpdateBalance(username, balance) {
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
        }
        else {
            this.data.userBalances[key].balance += balance;
            this.data.userBalances[key].lastUpdated = now;
        }
        this.save();
    }
    deposit(username, amount) {
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
        }
        else {
            this.data.userBalances[key].balance += amount;
            this.data.userBalances[key].totalDeposited += amount;
            this.data.userBalances[key].lastUpdated = now;
        }
        this.addTransaction(username, 'deposit', amount, `Deposited ${amount} channel points`);
    }
    withdraw(username, amount) {
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
    addWin(username, amount, description, isAllIn = false) {
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
        }
        else {
            this.data.userBalances[key].balance += amount;
            this.data.userBalances[key].totalWon += amount;
            if (isAllIn) {
                this.data.userBalances[key].allInWins = (this.data.userBalances[key].allInWins || 0) + 1;
            }
            this.data.userBalances[key].lastUpdated = now;
        }
        this.addTransaction(username, 'win', amount, description);
    }
    addLoss(username, amount, description, isAllIn = false) {
        const user = this.getUserBalance(username);
        if (!user)
            return;
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
    resetEconomy() {
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
    purchase(username, amount, description) {
        if (!this.withdraw(username, amount)) {
            return false;
        }
        this.addTransaction(username, 'purchase', amount, description);
        return true;
    }
    addTransaction(username, type, amount, description) {
        const transaction = {
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
    getTransactions(username, limit = 10) {
        return this.data.transactions
            .filter(t => t.username === username.toLowerCase())
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, limit);
    }
    saveChatContext(username, message, response) {
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
    getChatHistory(username, limit = 5) {
        return this.data.chatContext
            .filter(c => c.username === username.toLowerCase())
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, limit)
            .map(c => ({
            message: c.message,
            response: c.response,
        }));
    }
    getLeaderboard(limit = 10) {
        return Object.values(this.data.userBalances)
            .map(user => ({
            ...user,
            allInWins: user.allInWins || 0,
            allInLosses: user.allInLosses || 0,
        }))
            .sort((a, b) => b.balance - a.balance)
            .slice(0, limit);
    }
    incrementRedemptionCount(username, redemptionType) {
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
    getRedemptionCount(username, redemptionType) {
        const key = username.toLowerCase();
        if (!this.data.redemptionCounts[key] || !this.data.redemptionCounts[key][redemptionType]) {
            return 0;
        }
        return this.data.redemptionCounts[key][redemptionType];
    }
    close() {
        this.save();
    }
}
exports.BotDatabase = BotDatabase;
