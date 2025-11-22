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
- Secure balance storage in JSON database (no native compilation needed!)
- **Custom redemption messages** for "Daily [x]" and "First" redemptions with automatic counting

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

### 💜 Community Signals
- Automatic “thank you” messages for new followers, subs, resubs, and gifted subs
- Works via EventSub (same webhook endpoint) so there’s no polling or missed events

### 🎭 7TV Emote Integration
- Automatically fetches and uses channel 7TV emotes
- Bot responses can include random 7TV emotes
- Commands to search and use emotes
- Emote caching for performance
- Seamless integration with chat interactions

### 📺 Ad Break Management
- Automatic warnings **before Twitch's scheduled ads** hit, using the Ads API (`channel:read:ads`)
- Friendly messages during live ad breaks (without forcing the ad to run)
- Timer-based ad management (`!ad [seconds]`) when you choose to trigger a break
- Customizable ad start/end messages and auto "welcome back" once the break is over
- Manual ad end command (`!ad end`)
- Engaging, community-friendly ad notifications

### 🎯 Trivia System
- AI-generated trivia questions (20% chance of being related to current stream category)
- Random trivia events every 10-20 minutes for active chatters
- Manual trivia triggers via `!trivia start` (mod/streamer only)
- First correct answer wins 400 points
- 60-second timeout if no one answers
- Canon validation for game lore questions (Zelda, DBD, etc.)
- Questions timeout after 60 seconds if unanswered

### 🎁 Custom Redemption Messages
- Automatic counting messages for "Daily [x]" redemptions (e.g., "Daily monster", "Daily burger")
- Automatic counting messages for "First" redemptions
- Customizable messages via `redemptionMessages.json` config file
- Tracks redemption counts per user per redemption type
- Example: `@username has redeemed their daily Cheeto (#5) times!`

### 📊 Complete Command List

#### 💰 Economy & Deposits
- `!balance` (or `!bal`, `!points`) - Check your current point balance, total deposited, won, and lost
- `!deposit <amount>` (Streamer only) - Manual fallback to deposit redeemed channel points if automatic detection fails
  - Example: Streamer can run `!deposit 10000` to force a deposit that didn’t auto-complete
- `!history` (or `!transactions`) - View your last 5 transactions
- `!leaderboard` (or `!lb`, `!top`) - See the top 10 richest chatters
- `!allin` (or `!allins`, `!allinstats`) - Check your all-in statistics (wins/losses when betting your entire balance)
- `!rain <total_amount> <number_of_people|max>` - Rain points evenly to active chatters (last 5 minutes)
  - Example: `!rain 1000 5` - Rain 1000 points to 5 random active chatters
  - Example: `!rain 5000 max` - Rain 5000 points to ALL active chatters

#### 👑 Moderator/Streamer Commands
- `!givepts <@user> <amount>` (or `!givepoints`, `!give`) - Give points to a user (Streamer/Mod only)
  - Example: `!givepts @SomeUser 5000`
  - **Non-streamer givers pay a 10% fee (min 100 pts) that is burned**, so mods need enough balance to cover the gift + fee. Streamer gifts are fee-free.
- `!accept [@user]` / `!decline [@user]` - Quickly respond to the most recent duel challenge without retyping `!duel accept @...`
- `!ecoReset` (or `!reseteco`) - Streamer-only emergency nuke that clears all balances and stats
- `!trivia [start|enable|disable|status]` - Manage trivia system (Mod/Streamer only)
  - `!trivia start` - Manually trigger a trivia question
  - `!trivia enable` - Enable random trivia events
  - `!trivia disable` - Disable random trivia events (manual start still works)
  - `!trivia status` - Check trivia system status

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
- `!duel @user <bet|all>` - Challenge another chatter to a coinflip duel (winner takes BOTH wagers; target can reply with `!accept` / `!decline` or `!duel accept/decline @you`)
- `!gamble <game> <bet|all> [options]` (or `!bet`) - Generic gambling command
  - Example: `!gamble coinflip 100 heads` or `!gamble slots all`

#### 🛒 Action Purchases
Use `!actions` to see all available actions and their exact syntax!

- `!buy timeout @user` - Timeout someone for 60 seconds (costs points!)
- `!buy alert <message>` - Send a custom alert message to chat
- `!buy shoutout @user` - Trigger a Twitch shoutout via the API (requires `channel:manage:moderators`)
- `!buy emote` - Spam emotes in chat (real multi-line spam using your 7TV emotes)
- `!buy poll Question? | Option 1 | Option 2 [| duration=120]` - Create a real Twitch poll (`channel:manage:polls` scope)
- `!buy prediction Title? | Outcome 1 | Outcome 2 [| duration=120]` - Start a Twitch prediction (`channel:manage:predictions`, costs 10k pts)
- `!buy roast @user` / `!buy compliment` / `!buy quote <text>` - Fun social actions
- `!buy countdown <seconds>` - Start a countdown (1-60 seconds)
- `!buy raid @channel` - Announce a raid target
- `!buy challenge @user [bet]` - Challenge someone and auto-create a coinflip duel invite (they confirm with `!accept`). Prize pot is fully sponsored (2× the action price).
- `!buy streak` - Protect your gambling streak (prevents one loss)
- `!buy highlight` - Highlight your message in chat
- `!buy sound` - Play a sound alert
- `!actions` - List all available actions with syntax hints

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
- `!twb` - Get the GitHub repository link

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
   - `TWITCH_BROADCASTER_OAUTH_TOKEN` - (Optional) A broadcaster token with `channel:read:redemptions`, `channel:read:ads`, `channel:manage:polls`, `channel:manage:predictions`, etc. Use this if you want the bot to stay logged in as a separate account but still access PubSub/ad data and create polls/predictions. If omitted, the bot reuses `TWITCH_OAUTH_TOKEN`.
   - `TWITCH_CLIENT_ID` - Required for ad warnings (Ads API) and recommended for EventSub setup. (WIP) https://www.streamweasels.com/tools/convert-twitch-username-%20to-user-id/
   - `TWITCH_CHANNEL_USER_ID` - Your Twitch user ID (needed for PubSub + ad monitor). Get via:
     ```
     curl -H "Authorization: Bearer YOUR_OAUTH_TOKEN" \
          -H "Client-Id: YOUR_CLIENT_ID" \
          https://api.twitch.tv/helix/users?login=YOUR_USERNAME
     ```
     or use https://twitchid.net/
   - `WEBHOOK_SECRET` - Secret used to verify EventSub webhooks (use `openssl rand -hex 16`)
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

### Webhook Configuration (Optional - Advanced)

**Note**: Webhooks are optional! Without them, the streamer can still use `!deposit` manually after viewers redeem channel points. Webhooks/PubSub simply automate the deposit so viewers never need to type anything.
If you can't use EventSub yet, the bot will automatically fall back to Twitch **PubSub** (requires `TWITCH_CHANNEL_USER_ID` and a broadcaster OAuth token with `channel:read:redemptions` — set `TWITCH_BROADCASTER_OAUTH_TOKEN`, or reuse `TWITCH_OAUTH_TOKEN` if you're running everything under the streamer account). PubSub works great for local/dev testing, while EventSub is still the recommended production setup.

While you’re here, you can also add the **follow/subscription** EventSub types to the exact same webhook endpoint so the bot can thank viewers automatically:
- `channel.follow`
- `channel.subscribe`
- `channel.subscription.message`
- `channel.subscription.gift`

#### What Webhooks Do
- Automatically detect when users redeem "DEPOSIT: X" channel points
- No need for users (or mods) to type `!deposit` after redeeming
- Seamless experience for your viewers

#### Prerequisites
- Your bot must be running and accessible from the internet
- You'll need a public URL (use ngrok or similar service)
- Twitch Developer Console access

#### Step-by-Step Setup

1. **Start your bot** (it will start the webhook server on port 3000)

2. **Expose your local server** using ngrok:
   ```bash
   # Install ngrok: https://ngrok.com/download
   ngrok http 3000
   ```
   - Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)
   - Your webhook URL will be: `https://abc123.ngrok.io/webhook/channel-points`

3. **Get your Twitch User ID** (needed for the API call):
   - You can get this from: https://www.twitch.tv/settings/profile
   - Or use an API tool: https://dev.twitch.tv/docs/api/reference#get-users
   - Or the bot can help you find it (see alternative method below)

4. **Create EventSub Subscription using Twitch API**:

   **Option A: Using curl (Recommended)**
   
   Replace these values:
   - `YOUR_OAUTH_TOKEN` - Your bot's OAuth token (the one in your .env file)
   - `YOUR_CLIENT_ID` - Get from https://dev.twitch.tv/console/apps (create an app if needed)
   - `YOUR_CHANNEL_USER_ID` - Your Twitch user ID (see step 3)
   - `YOUR_NGROK_URL` - Your ngrok HTTPS URL (e.g., `https://abc123.ngrok.io`)
   - `YOUR_WEBHOOK_SECRET` - Generate a random secret (e.g., use: `openssl rand -hex 16`)

   ```bash
   curl -X POST 'https://api.twitch.tv/helix/eventsub/subscriptions' \
     -H 'Authorization: Bearer YOUR_OAUTH_TOKEN' \
     -H 'Client-Id: YOUR_CLIENT_ID' \
     -H 'Content-Type: application/json' \
     -d '{
       "type": "channel.channel_points_custom_reward_redemption.add",
       "version": "1",
       "condition": {
         "broadcaster_user_id": "YOUR_CHANNEL_USER_ID"
       },
       "transport": {
         "method": "webhook",
         "callback": "YOUR_NGROK_URL/webhook/channel-points",
         "secret": "YOUR_WEBHOOK_SECRET"
       }
     }'
   ```

   **Option B: Using Twitch Developer Console (if available)**
   - Go to https://dev.twitch.tv/console/eventsub/subscriptions
   - Click "Create Subscription"
   - Fill in the form with the same values as above

5. **Verify the subscription**:
   - The API call should return a JSON response with subscription details
   - Twitch will send a verification request to your webhook
   - The bot should automatically respond (check bot logs)
   - Check subscription status: `curl -H "Authorization: Bearer YOUR_OAUTH_TOKEN" -H "Client-Id: YOUR_CLIENT_ID" https://api.twitch.tv/helix/eventsub/subscriptions`

6. **Test it**:
   - Redeem a "DEPOSIT: 100" channel point reward
   - The bot should automatically deposit without needing `!deposit` command!

#### How the Webhook Secret Works

**Important**: ngrok doesn't use the webhook secret - your bot's webhook server verifies it!

1. **When you create the subscription**: You provide the secret to Twitch in the API call
2. **When Twitch sends events**: Twitch signs each webhook request with an HMAC-SHA256 signature using your secret
3. **Your bot verifies**: The bot receives the request, recalculates the signature using the same secret, and compares it
4. **Security**: If signatures don't match, the request is rejected (prevents fake/spoofed webhooks)

**The secret is used by:**
- ✅ Your bot's webhook server (to verify incoming requests are from Twitch)
- ✅ Twitch (to sign the webhook requests it sends)
- ❌ NOT by ngrok (ngrok just forwards the requests)

**To enable verification:**
- Add `WEBHOOK_SECRET=your_secret_here` to your `.env` file
- Use the same secret you used when creating the EventSub subscription
- The bot will automatically verify all incoming webhook requests

**For development/testing**: You can skip the secret (verification will be disabled), but it's recommended for production!

#### Troubleshooting Webhooks
- **Subscription not working**: Make sure ngrok is running and your bot is accessible
- **Verification failed**: Check that your webhook server is running and responding
- **Signature verification failed**: Make sure `WEBHOOK_SECRET` in `.env` matches the secret you used in the subscription
- **Still need !deposit**: Check bot logs for webhook errors, verify subscription is "Enabled"
- **ngrok URL changed**: Update the EventSub subscription with the new URL (delete old subscription and create new one)

#### Alternative: Manual Testing
You can test deposits manually using the endpoint:
```bash
curl -X POST http://localhost:3000/trigger/deposit \
  -H "Content-Type: application/json" \
  -d '{"username": "YourUsername", "amount": 100}'
```

## Usage Examples

### Getting Started
1. **Check your balance**: `!balance`
2. **Deposit points**: 
   - Redeem channel points "DEPOSIT: 10000" in Twitch
  - Type: `!deposit 10000` (streamer only, for manual overrides)
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

### Moderator Commands
```
!givepts @SomeUser 5000      # Give 5000 points to a user (Streamer/Mod only)
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

### Custom Redemption Messages
Edit `redemptionMessages.json` in the project root to customize messages for "Daily [x]" and "First" redemptions:
- `{user}` - Replaced with username
- `{item}` - Replaced with item name (for daily redemptions)
- `{count}` or `#{count}` - Replaced with redemption count

Example:
```json
{
  "daily": {
    "message": "{user} has redeemed their daily {item} (#{count}) times!"
  },
  "first": {
    "message": "{user} was first in the stream (#{count}) times!"
  }
}
```

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
- Users redeem channel points FIRST, and the bot auto-deposits via webhook/PubSub
- If something fails, the **streamer** can type `!deposit <amount>` in chat to force the deposit (amount must match the redeemed reward)
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



