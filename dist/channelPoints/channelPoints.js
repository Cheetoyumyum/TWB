"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChannelPointsHandler = void 0;
class ChannelPointsHandler {
    constructor(db) {
        this.db = db;
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
                message: `@${username} Deposited ${depositAmount} channel points! New balance: ${newBalance}`,
                deposited: depositAmount,
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
