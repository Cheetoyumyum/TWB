import axios from 'axios';
import { TwitchBot } from '../bot/twitchBot';

interface RedemptionPollConfig {
  clientId: string;
  oauthToken: string;
  broadcasterId: string;
  pollInterval?: number; // in milliseconds, default 30 seconds
}

export class RedemptionPoller {
  private bot: TwitchBot;
  private config: RedemptionPollConfig;
  private pollInterval: NodeJS.Timeout | null = null;
  private processedRedemptions: Set<string> = new Set(); // Track processed redemption IDs
  private rewardIdCache: Map<string, string> = new Map(); // reward title -> reward id

  constructor(bot: TwitchBot, config: RedemptionPollConfig) {
    this.bot = bot;
    this.config = {
      ...config,
      pollInterval: config.pollInterval || 30000, // Default 30 seconds
    };
  }

  async start(): Promise<void> {
    console.log('🔄 Starting redemption poller...');
    
    // First, get the reward ID for "DEPOSIT: X" rewards
    await this.cacheRewardIds();
    
    // Start polling
    this.pollInterval = setInterval(() => {
      this.pollRedemptions().catch(err => {
        console.error('Error polling redemptions:', err);
      });
    }, this.config.pollInterval);
    
    // Do an initial poll
    await this.pollRedemptions();
  }

  stop(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
      console.log('🛑 Redemption poller stopped');
    }
  }

  private async cacheRewardIds(): Promise<void> {
    try {
      const response = await axios.get(
        'https://api.twitch.tv/helix/channel_points/custom_rewards',
        {
          headers: {
            'Authorization': `Bearer ${this.config.oauthToken}`,
            'Client-Id': this.config.clientId,
          },
          params: {
            broadcaster_id: this.config.broadcasterId,
            only_manageable_rewards: true,
          },
        }
      );

      if (response.data?.data) {
        for (const reward of response.data.data) {
          if (reward.title && reward.title.toUpperCase().includes('DEPOSIT:')) {
            this.rewardIdCache.set(reward.title.toLowerCase(), reward.id);
            console.log(`📋 Cached reward: "${reward.title}" (ID: ${reward.id})`);
          }
        }
      }
    } catch (error: any) {
      console.warn('⚠️  Could not cache reward IDs:', error.response?.status || error.message);
      console.warn('   Redemption polling may not work correctly. Make sure TWITCH_CLIENT_ID and broadcaster ID are set.');
    }
  }

  private async pollRedemptions(): Promise<void> {
    try {
      // Get all reward IDs we're interested in
      const rewardIds = Array.from(this.rewardIdCache.values());
      
      if (rewardIds.length === 0) {
        // Try to refresh cache if empty
        await this.cacheRewardIds();
        return;
      }

      // Poll each reward for pending redemptions
      for (const rewardId of rewardIds) {
        try {
          const response = await axios.get(
            'https://api.twitch.tv/helix/channel_points/custom_rewards/redemptions',
            {
              headers: {
                'Authorization': `Bearer ${this.config.oauthToken}`,
                'Client-Id': this.config.clientId,
              },
              params: {
                broadcaster_id: this.config.broadcasterId,
                reward_id: rewardId,
                status: 'UNFULFILLED', // Only get pending redemptions
                first: 10, // Get up to 10 pending redemptions
              },
            }
          );

          if (response.data?.data) {
            for (const redemption of response.data.data) {
              const redemptionId = redemption.id;
              
              // Skip if we've already processed this redemption
              if (this.processedRedemptions.has(redemptionId)) {
                continue;
              }

              // Mark as processed
              this.processedRedemptions.add(redemptionId);
              
              const username = redemption.user_name || redemption.user_login;
              const rewardTitle = redemption.reward?.title || '';
              const rewardCost = redemption.reward?.cost || 0;

              if (username && rewardTitle) {
                console.log(`📥 Poller: Detected redemption - ${username} redeemed ${rewardTitle} (${rewardCost} points)`);
                
                // Process the redemption
                this.bot.handleChannelPointsRedemption(username, rewardTitle, rewardCost);
              }
            }
          }
        } catch (error: any) {
          if (error.response?.status === 401 || error.response?.status === 403) {
            console.warn('⚠️  Redemption polling failed - check OAuth token and Client ID permissions');
            console.warn('   Required scope: channel:read:redemptions');
          } else {
            console.warn(`⚠️  Error polling reward ${rewardId}:`, error.response?.status || error.message);
          }
        }
      }
    } catch (error: any) {
      console.error('Error in redemption poller:', error.response?.status || error.message);
    }
  }
}

