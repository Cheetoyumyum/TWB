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
exports.ChannelPointsHandler = void 0;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
class ChannelPointsHandler {
    constructor(db, configPath) {
        this.db = db;
        this.configPath = configPath || path.join(process.cwd(), 'redemptionMessages.json');
        this.messageConfig = this.loadConfig();
    }
    setSayCallback(callback) {
        this.sayCallback = callback;
    }
    loadConfig() {
        const defaultConfig = {
            daily: {
                pattern: 'daily',
                message: '{user} has redeemed their daily {item} (#{count}) times!',
                description: 'Message for daily redemptions. Use {user} for username, {item} for the item name, {count} for the count.',
            },
            first: {
                pattern: 'first',
                message: '{user} was first in the stream (#{count}) times!',
                description: 'Message for first redemptions. Use {user} for username, {count} for the count.',
            },
        };
        if (!fs.existsSync(this.configPath)) {
            // Create default config file
            try {
                fs.writeFileSync(this.configPath, JSON.stringify(defaultConfig, null, 2), 'utf-8');
                console.log(`📝 Created default redemption messages config at ${this.configPath}`);
            }
            catch (error) {
                console.warn('⚠️ Failed to create redemption messages config file:', error);
            }
            return defaultConfig;
        }
        try {
            const fileData = fs.readFileSync(this.configPath, 'utf-8');
            const loaded = JSON.parse(fileData);
            return {
                daily: loaded.daily || defaultConfig.daily,
                first: loaded.first || defaultConfig.first,
            };
        }
        catch (error) {
            console.warn('⚠️ Failed to load redemption messages config, using defaults:', error);
            return defaultConfig;
        }
    }
    formatMessage(template, username, item, count) {
        let formatted = template.replace(/{user}/g, username);
        if (item !== undefined) {
            formatted = formatted.replace(/{item}/g, item);
        }
        if (count !== undefined) {
            formatted = formatted.replace(/#{count}/g, count.toString());
            formatted = formatted.replace(/{count}/g, count.toString());
        }
        return formatted;
    }
    handleRedemption(username, redemptionTitle, rewardCost) {
        // Check if redemption matches DEPOSIT pattern
        const depositMatch = redemptionTitle.match(/DEPOSIT:\s*(\d+)/i);
        if (depositMatch) {
            const depositAmount = parseInt(depositMatch[1]);
            if (isNaN(depositAmount) || depositAmount <= 0) {
                return {
                    success: false,
                    message: `@${username} Invalid deposit amount. Use format: DEPOSIT: <number>`,
                };
            }
            // Verify the redemption cost matches (optional check)
            if (depositAmount !== rewardCost) {
                // Still process, but warn
                console.warn(`Deposit amount ${depositAmount} doesn't match reward cost ${rewardCost}`);
            }
            this.db.deposit(username, depositAmount);
            const newBalance = this.db.getUserBalance(username)?.balance || 0;
            return {
                success: true,
                message: `@${username} ✅ Deposited ${depositAmount.toLocaleString()} points! New balance: ${newBalance.toLocaleString()} points`,
                deposited: depositAmount,
            };
        }
        // Check for "daily [x]" pattern (case-insensitive)
        const lowerTitle = redemptionTitle.toLowerCase();
        const dailyMatch = lowerTitle.match(/^daily\s+(.+)$/);
        if (dailyMatch) {
            const item = dailyMatch[1].trim();
            const count = this.db.incrementRedemptionCount(username, `daily_${item}`);
            const customMessage = this.formatMessage(this.messageConfig.daily.message, `@${username}`, item, count);
            if (this.sayCallback) {
                this.sayCallback(customMessage);
            }
            return {
                success: true,
                message: customMessage,
            };
        }
        // Check for "first" pattern (case-insensitive, exact match or "first to the stream")
        if (lowerTitle === 'first' || lowerTitle === 'first to the stream' || lowerTitle.startsWith('first ')) {
            const count = this.db.incrementRedemptionCount(username, 'first');
            const customMessage = this.formatMessage(this.messageConfig.first.message, `@${username}`, undefined, count);
            if (this.sayCallback) {
                this.sayCallback(customMessage);
            }
            return {
                success: true,
                message: customMessage,
            };
        }
        // Handle other redemption types if needed
        return {
            success: false,
            message: '',
        };
    }
}
exports.ChannelPointsHandler = ChannelPointsHandler;
