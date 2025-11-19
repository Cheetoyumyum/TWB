# Twitch Engagement Bot 🤖

A comprehensive Twitch bot for chat engagement, channel points management, gambling games, and action purchases.

## Features

### 🗣️ Intelligent Chat Interaction
- AI-powered chat responses using OpenAI, Groq (FREE), or Hugging Face (FREE)
- Context-aware conversations that learn from chat history
- Natural language understanding
- Smart fallback responses when AI is unavailable
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

### 📊 Complete Command List

#### 💰 Economy & Deposits
- `!balance` (or `!bal`, `!points`) - Check your current point balance, total deposited, won, and lost
- `!deposit <amount>` (or `!redeem <amount>`) - After redeeming channel points "DEPOSIT: X", type this to deposit them
  - Example: Redeem "DEPOSIT: 10000" channel points, then type `!deposit 10000`
- `!history` (or `!transactions`) - View your last 5 transactions
- `!leaderboard` (or `!lb`, `!top`) - See the top 10 richest chatters
- `!allin` (or `!allins`, `!allinstats`) - Check your all-in statistics (wins/losses when betting your entire balance)
- `!rain <total_amount> <number_of_people|max>` - Rain points evenly to active chatters (last 5 minutes)
  - Example: `!rain 1000 5` - Rain 1000 points to 5 random active chatters
  - Example: `!rain 5000 max` - Rain 5000 points to ALL active chatters

#### 🎮 Gambling Games
All games support `all` or `allin` to bet your entire balance!

- `!coinflip <bet|all> <heads|tails>` (or `!cf`) - Flip a coin! 2x payout if you win
  - Example: `!coinflip 100 heads` or `!coinflip all tails`
- `!dice <bet|all>` - Roll a die against the bot! 1.5x payout if you win
  - Example: `!dice 200` or `!dice all`
- `!slots <bet|all>` - Spin the slot machine! Up to 10x jackpot!
  - Example: `!slots 500` or `!slots all`
- `!roulette <bet|all> <red|black|even|odd|green|number>` - Bet on roulette! Up to 35x payout!
  - Example: `!roulette 100 red` or `!roulette 50 7` (bet on number 7)
- `!blackjack <bet|all>` (or `!bj`) - Play blackjack against the dealer! 2.5x for natural blackjack!
  - Example: `!blackjack 300` or `!blackjack all`
- `!wheel <bet|all>` (or `!wheeloffortune`) - Spin the wheel of fortune! Up to 5x multiplier!
  - Example: `!wheel 250` or `!wheel all`
- `!rps <bet|all> <rock|paper|scissors>` (or `!rockpaperscissors`) - Rock Paper Scissors! 2x payout if you win
  - Example: `!rps 150 rock` or `!rps all paper`
- `!gamble <game> <bet|all> [options]` (or `!bet`) - Generic gambling command
  - Example: `!gamble coinflip 100 heads` or `!gamble slots all`

#### 🛒 Action Purchases
Use `!actions` to see all available actions and their prices!

- `!buy timeout @user` - Timeout someone for 60 seconds (costs points!)
- `!buy alert <message>` - Send a custom alert message to chat
- `!buy shoutout` - Get a shoutout from the bot
- `!buy bonus` - Get 500 bonus points added to your balance
- `!buy poll <question> <option1> <option2>` - Create a quick poll
  - Example: `!buy poll Should we play this game? Yes No`
- `!buy roast @user` - Get a friendly roast of someone
  - Example: `!buy roast @SomeUser`
- `!buy compliment` - Get a nice compliment from the bot
- `!buy quote <text>` - Save a memorable quote
  - Example: `!buy quote This is the best stream ever!`
- `!buy countdown <seconds>` - Start a countdown (1-60 seconds)
  - Example: `!buy countdown 10`
- `!buy raid @channel` - Announce a raid target
  - Example: `!buy raid @AnotherStreamer`
- `!buy challenge @user` - Challenge another user
  - Example: `!buy challenge @SomeUser`
- `!buy tip <message>` - Send a tip message to the streamer
  - Example: `!buy tip Great stream today!`
- `!buy streak` - Protect your gambling streak (prevents one loss)
- `!buy highlight` - Highlight your message in chat
- `!buy sound` - Play a sound alert
- `!buy emote` - Spam emotes in chat
- `!actions` - List all available actions with their prices

#### 🎭 7TV Emotes
- `!emote <name>` (or `!emotes`) - Use a 7TV emote from the channel
  - Example: `!emote poggers`
- `!emotelist [search]` (or `!listemotes`) - List or search available 7TV emotes
  - Example: `!emotelist` - Shows all emotes
  - Example: `!emotelist pog` - Search for emotes with "pog" in the name
- `!randemote` (or `!randomemote`) - Get a random 7TV emote

#### 📺 Ad Break Management
- `!ad [seconds]` (or `!adbreak`) - Start an ad break timer
  - Example: `!ad` - Starts 180 second (3 minute) ad break
  - Example: `!ad 300` - Starts 300 second (5 minute) ad break
- `!ad end` - End the current ad break early

#### 📖 Help Commands
- `!help` - Quick command guide
- `!commands` - Full detailed command list

## Setup

### Prerequisites
- **Node.js 18+** and npm (download from https://nodejs.org/)
- **Twitch account** for your bot (create a separate account for the bot)
- **(Optional) AI API key** - Groq (FREE), Hugging Face (FREE), or OpenAI (paid)
  - **Recommended**: Get a free Groq API key at https://console.groq.com/

### Installation

1. **Clone or download this repository**

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Create a `.env` file in the root directory (see SETUP.md for detailed instructions):
   
   **Required variables:**
   - `TWITCH_BOT_USERNAME` - Your bot's Twitch username (the account that will chat)
   - `TWITCH_OAUTH_TOKEN` - OAuth access token from https://twitchtokengenerator.com/
     - Select scopes: `chat:read`, `chat:edit`, `channel:moderate`
     - **Important**: Paste the token as-is, do NOT add "oauth:" prefix
   - `TWITCH_CHANNEL` - Your channel name (without # or twitch.tv/)
     - Example: If your channel is `twitch.tv/MyChannel`, put: `MyChannel`

   **Optional variables:**
   - `OPENAI_API_KEY` - For AI chat (paid) - https://platform.openai.com/api-keys
   - `GROQ_API_KEY` - For AI chat (FREE!) - https://console.groq.com/ (Recommended!)
   - `HUGGINGFACE_API_KEY` - For AI chat (FREE!) - https://huggingface.co/settings/tokens
   - `SEVENTV_USER_ID` - Your 7TV user ID or full URL (if Twitch username doesn't match)
     - Example: `01GFW04N9G00007A0Y2C1CSMQR` or `https://7tv.app/users/01GFW04N9G00007A0Y2C1CSMQR`
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

**This is required for users to deposit points!**

1. Go to your Twitch Creator Dashboard: https://dashboard.twitch.tv/
2. Navigate to **Settings** → **Channel Points** → **Custom Rewards**
3. Click **"Create Custom Reward"** or **"New Custom Reward"**
4. For each deposit amount, create a separate reward:

   **Example - Small Deposit:**
   - **Title**: `DEPOSIT: 100` (MUST be exactly this format - capital DEPOSIT, space after colon)
   - **Cost**: `100` channel points (should match the number in title)
   - **Description**: "Deposit 100 points into the bot's gambling system"
   - **Require Viewer to Enter Text**: ❌ Unchecked
   - **Cooldown**: 0 seconds (recommended)
   - **Enabled**: ✅ Checked
   - Click **"Create"**

5. **Create multiple rewards** for different amounts:
   - `DEPOSIT: 50` (costs 50 points)
   - `DEPOSIT: 100` (costs 100 points)
   - `DEPOSIT: 500` (costs 500 points)
   - `DEPOSIT: 1000` (costs 1000 points)
   - `DEPOSIT: 10000` (costs 10000 points)
   - Create as many as you want!

**⚠️ CRITICAL FORMATTING:**
- Title MUST be: `DEPOSIT: [number]` (capital DEPOSIT, space after colon)
- Example: `DEPOSIT: 100` ✅ (correct)
- Example: `deposit: 100` ❌ (wrong - must be capital)
- Example: `DEPOSIT:100` ❌ (wrong - missing space)
- Example: `DEPOSIT: 100 ` ❌ (wrong - extra space at end)

### Webhook Configuration (Optional)

For automatic channel points redemption handling, set up Twitch EventSub webhooks:

1. The bot includes a webhook server on port 3000
2. Use a service like ngrok to expose it: `ngrok http 3000`
3. Configure EventSub in Twitch Developer Console to send redemptions to your webhook URL

Alternatively, you can manually trigger deposits using the `/trigger/deposit` endpoint.

## Usage Examples

### Getting Started
1. **Check your balance**: `!balance`
2. **Deposit points**: 
   - Redeem channel points "DEPOSIT: 10000" in Twitch
   - Type: `!deposit 10000`
3. **Check leaderboard**: `!leaderboard`

### Playing Games
```
!coinflip 100 heads          # Bet 100 on heads
!coinflip all tails          # Bet everything on tails
!dice 200                    # Roll dice with 200 bet
!slots 500                   # Spin slots with 500 bet
!roulette 50 red             # Bet 50 on red
!roulette 100 7              # Bet 100 on number 7
!blackjack all               # Play blackjack with all points
!wheel 250                   # Spin wheel with 250 bet
!rps 150 rock                # Rock paper scissors with 150 bet
```

### Purchasing Actions
```
!buy alert Hello chat!       # Send alert message
!buy timeout @SomeUser       # Timeout someone (costs points!)
!buy shoutout                 # Get a shoutout
!buy bonus                   # Get 500 free points
!buy poll Should we play? Yes No  # Create a poll
!buy roast @SomeUser         # Roast someone
!buy quote This is awesome!  # Save a quote
!buy countdown 10            # Start 10 second countdown
!buy raid @AnotherStreamer   # Announce raid
!actions                     # See all actions and prices
```

### Using 7TV Emotes
```
!emote poggers               # Use a specific emote
!emotelist                   # List all emotes
!emotelist pog               # Search for emotes
!randemote                   # Get random emote
```

### Rain Points
```
!rain 1000 5                # Rain 1000 points to 5 random active chatters
!rain 5000 max               # Rain 5000 points to ALL active chatters
```

### Going All-In
```
!coinflip all heads          # Bet everything on coinflip
!dice all                    # Bet everything on dice
!slots all                   # Bet everything on slots
!allin                       # Check your all-in statistics
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
- Verify the redemption title matches "DEPOSIT: #" format exactly (capital DEPOSIT, space after colon)
- Users must redeem channel points FIRST, then type `!deposit <amount>` in chat
- The amount in `!deposit` must match the amount they redeemed
- Check that webhooks are properly configured if using EventSub
- Use `!manualdeposit <amount>` for testing (admin/mod only)

### AI not responding
- Check that your API key is set correctly (`OPENAI_API_KEY`, `GROQ_API_KEY`, or `HUGGINGFACE_API_KEY`)
- For free options, get a Groq API key at https://console.groq.com/ or Hugging Face at https://huggingface.co/settings/tokens
- Verify you have API credits (OpenAI) or haven't exceeded free tier limits
- The bot will use smart fallback responses if AI is unavailable

## License

MIT

## Contributing

Feel free to submit issues and enhancement requests!


