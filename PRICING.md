# Pricing Configuration Guide

All prices are configured in `src/config/prices.ts` for easy editing.

## Why These Prices?

Channel points are **easily farmed** through passive watching, so prices are set higher to:
- Encourage active participation and engagement
- Prevent spam and abuse
- Make gambling meaningful (users need to earn points)
- Balance the economy

## Current Pricing

### Actions

| Action | Price | Reason |
|--------|-------|--------|
| **Alert** | 500 pts | Prevents spam alerts |
| **Highlight** | 300 pts | Basic effect, affordable |
| **Sound** | 1,000 pts | Disruptive, higher cost |
| **Timeout** | 2,000 pts | Prevents abuse, expensive |
| **Shoutout** | 1,500 pts | High value, moderate cost |
| **Emote Spam** | 800 pts | Prevents spam |
| **Bonus Points** | 5,000 pts | Gives 500 points (net: -4,500) |
| **Poll** | 2,000 pts | Can be disruptive |
| **Countdown** | 1,000 pts | Prevents spam |
| **Quote** | 400 pts | Affordable, low impact |
| **Roast** | 1,500 pts | High engagement value |
| **Compliment** | 800 pts | Prevents spam |
| **Raid** | 3,000 pts | High value community action |
| **Challenge** | 2,000 pts | Engaging interaction |
| **Tip** | 1,000 pts | Should be meaningful |
| **Streak Protection** | 3,000 pts | Valuable protection |

### Game Minimum Bets

| Game | Min Bet | Reason |
|------|---------|--------|
| **Coin Flip** | 100 pts | Simple, low minimum |
| **Dice** | 100 pts | Simple, low minimum |
| **Slots** | 200 pts | Higher variance, jackpot potential |
| **Roulette** | 150 pts | Moderate complexity |
| **Blackjack** | 200 pts | Complex game |
| **Wheel** | 200 pts | High variance |
| **Rock Paper Scissors** | 100 pts | Simple, low minimum |

## How to Edit Prices

1. Open `src/config/prices.ts`
2. Edit the `PRICES` object values
3. Run `npm run build` to compile
4. Restart the bot

### Example: Changing Alert Price

```typescript
// In src/config/prices.ts
export const PRICES: PriceConfig = {
  actions: {
    alert: 750,  // Changed from 500 to 750
    // ... rest of prices
  },
  // ... rest of config
};
```

## Pricing Philosophy

### Low-Cost Actions (100-500 pts)
- Basic effects that don't disrupt chat
- Examples: Quote, Highlight

### Mid-Cost Actions (500-1,500 pts)
- Moderate impact on chat
- Examples: Alert, Shoutout, Roast

### High-Cost Actions (1,500-3,000 pts)
- Significant impact or high value
- Examples: Timeout, Raid, Challenge

### Premium Actions (3,000+ pts)
- Very valuable or economy-affecting
- Examples: Streak Protection, Bonus Points

## Adjusting for Your Channel

Consider:
- **Average viewer channel points**: If viewers have 10k+ points, prices can be higher
- **Stream frequency**: More frequent streams = more points earned
- **Engagement level**: Higher engagement = can support higher prices
- **Spam concerns**: Increase prices for actions that could be spammed

## Testing Prices

After changing prices:
1. Test with a test account
2. Monitor chat for spam/abuse
3. Check if prices feel balanced
4. Adjust as needed

Remember: You can always adjust prices in `src/config/prices.ts` and rebuild!

