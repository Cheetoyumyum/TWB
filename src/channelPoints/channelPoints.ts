import { BotDatabase } from '../database/database';
import * as path from 'path';
import * as fs from 'fs';

interface RedemptionMessageConfig {
  pattern: string;
  message: string;
  description: string;
}

interface RedemptionMessagesConfig {
  daily: RedemptionMessageConfig;
  first: RedemptionMessageConfig;
}

export class ChannelPointsHandler {
  private db: BotDatabase;
  private messageConfig: RedemptionMessagesConfig;
  private configPath: string;
  private sayCallback?: (message: string) => void;

  constructor(db: BotDatabase, configPath?: string) {
    this.db = db;
    this.configPath = configPath || path.join(process.cwd(), 'redemptionMessages.json');
    this.messageConfig = this.loadConfig();
  }

  setSayCallback(callback: (message: string) => void): void {
    this.sayCallback = callback;
  }

  private loadConfig(): RedemptionMessagesConfig {
    const defaultConfig: RedemptionMessagesConfig = {
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
      } catch (error) {
        console.warn('⚠️ Failed to create redemption messages config file:', error);
      }
      return defaultConfig;
    }

    try {
      const fileData = fs.readFileSync(this.configPath, 'utf-8');
      const loaded = JSON.parse(fileData) as Partial<RedemptionMessagesConfig>;
      return {
        daily: loaded.daily || defaultConfig.daily,
        first: loaded.first || defaultConfig.first,
      };
    } catch (error) {
      console.warn('⚠️ Failed to load redemption messages config, using defaults:', error);
      return defaultConfig;
    }
  }

  private formatMessage(template: string, username: string, item?: string, count?: number): string {
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

  handleRedemption(username: string, redemptionTitle: string, rewardCost: number): {
    success: boolean;
    message: string;
    deposited?: number;
  } {
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

