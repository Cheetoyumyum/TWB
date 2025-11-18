# Twitch Engagement Bot 🤖

A comprehensive Twitch bot for chat engagement, channel points management, gambling games, and action purchases.

## Features

### 🗣️ Intelligent Chat Interaction
- AI-powered chat responses using OpenAI (optional)
- Context-aware conversations that learn from chat history
- Natural language understanding
- Fallback responses when AI is unavailable
- **7TV Emote Integration** - Automatically uses channel 7TV emotes in responses

### 💰 Channel Points System
- Automatic detection of channel point redemptions with "DEPOSIT: #" format
- User balance tracking and management
- Transaction history
- Secure balance storage in SQLite database

### 🎲 Gambling Games
- **Coin Flip**: Bet on heads or tails (2x payout)
- **Dice Roll**: Roll against the bot (1.5x payout)
- **Slots**: Classic slot machine (up to 10x jackpot)
- **Roulette**: Bet on colors, numbers, or odds (up to 35x payout)
- **Blackjack**: Play against the dealer (2.5x for natural blackjack!)
- **Wheel of Fortune**: Spin for multipliers (up to 5x!)
- **Rock Paper Scissors**: Classic RPS (2x payout)

### 🎁 Action Purchases
- Buy alerts, effects, and commands with points
- Customizable actions (alerts, highlights, sound effects, etc.)
- Shoutouts and emote spam
- Extensible action system

### 🎭 7TV Emote Integration
- Automatically fetches and uses channel 7TV emotes
- Bot responses can include random 7TV emotes
- Commands to search and use emotes
- Emote caching for performance
- Seamless integration with chat interactions

### 📺 Ad Break Management
- Automatic ad break announcements with friendly messages
- Timer-based ad management (`!ad [seconds]`)
- Customizable ad start/end messages
- Manual ad end command (`!ad end`)
- Engaging, community-friendly ad notifications

### 📊 Commands
**Games:**
- `!coinflip <bet> <heads|tails>` - Coin flip game
- `!dice <bet>` - Dice roll game
- `!slots <bet>` - Slots game
- `!roulette <bet> <choice>` - Roulette game
- `!blackjack <bet>` - Play blackjack
- `!wheel <bet>` - Spin wheel of fortune
- `!rps <bet> <rock|paper|scissors>` - Rock paper scissors

**Economy:**
- `!balance` - Check your point balance
- `!leaderboard` - See top 10 richest chatters
- `!history` - View transaction history
- `!rain <amount> <people|max>` - Rain points to active chatters (last 5 min)

**Actions:**
- `!buy timeout @user` - Timeout someone for 60 seconds
- `!buy alert <message>` - Send custom alert
- `!buy shoutout` - Get a shoutout
- `!buy bonus` - Get 500 bonus points
- `!buy poll <question> <opt1> <opt2>` - Create a poll
- `!buy roast @user` - Friendly roast someone
- `!buy compliment` - Get a nice compliment
- `!buy quote <text>` - Save a memorable quote
- `!buy countdown <seconds>` - Start a countdown
- `!buy raid @channel` - Announce a raid target
- `!buy challenge @user` - Challenge another user
- `!buy tip <message>` - Send a tip message
- `!buy streak` - Protect your gambling streak
- `!rain <qty> <ppl> ` - Evenly rains points to active chatters
- `!actions` - List all available actions with prices

**Emotes:**
- `!emote <name>` - Use a 7TV emote
- `!emotelist [query]` - List/search 7TV emotes
- `!randemote` - Get a random 7TV emote

**Ads:**
- `!ad [seconds]` - Start an ad break (default: 180 seconds / 3 minutes)
- `!ad end` - End ad break early

**Help:**
- `!help` - Quick command guide
- `!commands` - Full command list

## Setup

### Prerequisites
- Node.js 18+ and npm
- Twitch account with bot credentials
- (Optional) OpenAI API key for AI chat features

### Installation

1. **Clone or download this repository**

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Copy `.env.example` to `.env` and fill in your credentials:
   ```bash
   cp .env.example .env
   ```

   Required:
   - `TWITCH_BOT_USERNAME` - Your bot's Twitch username
   - `TWITCH_OAUTH_TOKEN` - OAuth access token (get from https://twitchtokengenerator.com/ - select `chat:read`, `chat:edit`, `channel:moderate` scopes)
   - `TWITCH_CHANNEL` - Channel name to join (without #)

   Optional:
   - `OPENAI_API_KEY` - For AI chat features
   - `PORT` - Webhook server port (default: 3000)
   - `DATABASE_PATH` - Database file path (default: ./data/bot.json)

4. **Build the project**
   ```bash
   npm run build
   ```

5. **Start the bot**
   ```bash
   npm start
   ```

   Or for development with auto-reload:
   ```bash
   npm run dev
   ```

## Channel Points Setup

### Creating the DEPOSIT Redemption

1. Go to your Twitch Creator Dashboard
2. Navigate to **Channel Points** → **Custom Rewards**
3. Create a new reward with:
   - **Title**: `DEPOSIT: 100` (or any amount)
   - **Cost**: Match the amount in the title (e.g., 100 channel points)
   - **Description**: "Deposit channel points into the bot's system"

4. Create multiple rewards for different deposit amounts (e.g., DEPOSIT: 50, DEPOSIT: 100, DEPOSIT: 500)

### Webhook Configuration (Optional)

For automatic channel points redemption handling, set up Twitch EventSub webhooks:

1. The bot includes a webhook server on port 3000
2. Use a service like ngrok to expose it: `ngrok http 3000`
3. Configure EventSub in Twitch Developer Console to send redemptions to your webhook URL

Alternatively, you can manually trigger deposits using the `/trigger/deposit` endpoint.

## Usage Examples

### Depositing Points
Redeem a channel point reward titled "DEPOSIT: 100" to deposit 100 points.

### Playing Games
```
!coinflip 50 heads
!dice 100
!slots 200
!roulette 50 red
```

### Purchasing Actions
```
!buy alert Hello chat!
!buy shoutout
!buy highlight
```

## Project Structure

```
src/
├── index.ts              # Main entry point
├── bot/
│   └── twitchBot.ts     # Main bot class
├── database/
│   └── database.ts       # Database operations
├── ai/
│   └── chatHandler.ts   # AI chat response handler
├── channelPoints/
│   └── channelPoints.ts # Channel points redemption handler
├── games/
│   └── games.ts         # Gambling games module
├── actions/
│   └── actions.ts       # Action purchase system
├── commands/
│   └── commands.ts      # Command handler
└── webhook/
    └── webhook.ts       # Webhook server for EventSub
```

## Database

The bot uses a JSON-based file system to store:
- User balances and statistics
- Transaction history
- Chat context for learning

**No native compilation required!** The database is pure JavaScript, so you don't need Visual Studio or any build tools. Database file is created automatically at the path specified in `DATABASE_PATH` (default: `./data/bot.json`).

## Customization

### Adding New Games
Edit `src/games/games.ts` and add your game logic, then register it in `src/commands/commands.ts`.

### Adding New Actions
Edit `src/actions/actions.ts` and add actions to the `initializeActions()` method.

### Modifying AI Behavior
Edit `src/ai/chatHandler.ts` to adjust the system prompt and response behavior.

## Troubleshooting

### Bot won't connect
- Verify your OAuth token is correct
- Check that the bot account exists and is not banned
- Ensure the channel name is correct (without #)

### Channel points not working
- Verify the redemption title matches "DEPOSIT: #" format exactly
- Check that webhooks are properly configured if using EventSub
- Use the manual trigger endpoint for testing

### AI not responding
- Check that `OPENAI_API_KEY` is set correctly
- Verify you have API credits
- The bot will use fallback responses if AI is unavailable

## License

MIT

## Contributing

Feel free to submit issues and enhancement requests!


