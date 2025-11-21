/**
 * Price Configuration for Twitch Bot
 * 
 * Channel points are easily farmed/passive, so prices should be set accordingly.
 * Users need to earn points through active participation, not just passive watching.
 * 
 * All prices are in channel points.
 */

export interface PriceConfig {
  // Action prices
  actions: {
    alert: number;
    highlight: number;
    sound: number;
    timeout: number;
    shoutout: number;
    emote: number;
    poll: number;
    prediction: number;
    countdown: number;
    quote: number;
    roast: number;
    compliment: number;
    raid: number;
    challenge: number;
    streak: number;
  };
  
  // Game minimum bets (to prevent spam and ensure meaningful gambling)
  games: {
    coinflip: {
      minBet: number;
    };
    dice: {
      minBet: number;
    };
    slots: {
      minBet: number;
    };
    roulette: {
      minBet: number;
    };
    blackjack: {
      minBet: number;
    };
    wheel: {
      minBet: number;
    };
    rps: {
      minBet: number;
    };
  };
}

export const PRICES: PriceConfig = {
  actions: {
    // Basic actions - affordable but not free
    alert: 500,           // Was 100 - increased for spam prevention
    highlight: 300,       // Was 50 - increased significantly
    sound: 1000,          // Was 200 - increased for disruption prevention
    
    // Moderation actions - expensive to prevent abuse
    timeout: 2000,        // Was 500 - significantly increased to prevent spam timeouts
    
    // Social actions - moderate pricing
    shoutout: 1500,       // Was 300 - increased for value
    emote: 800,           // Was 150 - increased for spam prevention
    
    // Bonus/reward actions - expensive to maintain economy
    streak: 3000,        // Was 800 - protection is valuable
    
    // Interactive actions - moderate to high
    poll: 2000,          // Was 400 - polls can be disruptive
    prediction: 10000,   // Twitch predictions are high engagement
    countdown: 1000,     // Was 200 - increased for spam prevention
    quote: 400,          // Was 50 - increased but still affordable
    roast: 1500,         // Was 300 - increased for value
    compliment: 800,     // Was 150 - increased for spam prevention
    
    // Community actions - high value, high price
    raid: 3000,          // Was 600 - raids are high value
    challenge: 2000,     // Was 400 - challenges are engaging
  },
  
  games: {
    // Minimum bets to prevent spam and ensure meaningful gambling
    // These are low enough to allow small bets, but high enough to prevent abuse
    coinflip: {
      minBet: 100,       // Minimum 100 points to flip
    },
    dice: {
      minBet: 100,       // Minimum 100 points to roll
    },
    slots: {
      minBet: 200,       // Minimum 200 points (higher due to potential jackpot)
    },
    roulette: {
      minBet: 150,       // Minimum 150 points
    },
    blackjack: {
      minBet: 200,       // Minimum 200 points (complex game)
    },
    wheel: {
      minBet: 200,       // Minimum 200 points (high variance)
    },
    rps: {
      minBet: 100,       // Minimum 100 points
    },
  },
};

/**
 * Helper function to get action price
 */
export function getActionPrice(actionId: string): number {
  const action = actionId.toLowerCase();
  const price = PRICES.actions[action as keyof typeof PRICES.actions];
  return price || 1000; // Default to 1000 if action not found
}

/**
 * Helper function to get game minimum bet
 */
export function getGameMinBet(gameId: string): number {
  const game = gameId.toLowerCase();
  const minBet = PRICES.games[game as keyof typeof PRICES.games]?.minBet;
  return minBet || 100; // Default to 100 if game not found
}

