# Complete Setup Guide - Step by Step 🚀

This guide will walk you through every single step needed to get your Twitch bot running.

## Step 1: Install Node.js

1. Go to https://nodejs.org/
2. Download the **LTS version** (recommended)
3. Run the installer and follow the prompts
4. Verify installation by opening a terminal/command prompt and running:
   ```bash
   node --version
   npm --version
   ```
   You should see version numbers. If not, restart your terminal.

## Step 2: Download/Clone the Bot

1. If you downloaded a ZIP file, extract it to a folder (e.g., `C:\Users\YourName\TWB`)
2. Open a terminal/command prompt in that folder
3. Run:
   ```bash
   npm install
   ```
   This will install all required packages. Wait for it to finish (may take 1-2 minutes).

## Step 3: Get Your Twitch OAuth Token

**This is the most important step!**

### Using TwitchTokenGenerator.com (Recommended)

1. **Go to**: https://twitchtokengenerator.com/
2. **Select "Bot Chat Token"** at the top
3. **Select the required scopes** (check these boxes):
   - ✅ `chat:read` - View live Stream Chat and Rooms messages
   - ✅ `chat:edit` - Send live Stream Chat and Rooms messages
   - ✅ `channel:moderate` - Perform moderation actions in a channel
   - ✅ `channel:read:redemptions` - View your channel points custom reward redemptions (optional, for channel points)
   - ✅ `moderator:manage:chat_messages` - Delete chat messages (optional, for moderation)
4. **Click "Generate Token!"**
5. **Authorize the application** - You'll be redirected to Twitch to log in and approve
6. **Copy your tokens**:
   - **ACCESS TOKEN**: This is what you need! Copy the entire token
   - **CLIENT ID**: Also copy this (you might need it later)
7. **IMPORTANT**: The access token does NOT start with `oauth:` - just copy the token as-is
8. **Save both tokens** - You'll need them in a moment

**Note**: If you want to use your own Client ID and Client Secret, you can paste them in the "Use My Client Secret and Client ID" section on the page. Make sure to set your redirect URL to `https://twitchtokengenerator.com` in your Twitch Dev Console.

## Step 4: Get AI API Key (Optional but Recommended)

**Skip this if you don't want AI features** - the bot works fine without it!

### Option A: Groq (FREE - Recommended!)

1. Go to https://console.groq.com/
2. Sign up or log in (it's free!)
3. Go to API Keys section
4. Click "Create API Key"
5. **Copy the key immediately** - Save it somewhere safe
6. **No credit card required!** Groq offers a generous free tier.

### Option B: Hugging Face (FREE)

1. Go to https://huggingface.co/
2. Sign up or log in
3. Go to https://huggingface.co/settings/tokens
4. Click "New token"
5. Name it "Twitch Bot" and select "Read" permissions
6. **Copy the key immediately** - Save it somewhere safe
7. **No credit card required!** Hugging Face offers a free tier.

### Option C: OpenAI (Paid)

1. Go to https://platform.openai.com/
2. Sign up or log in
3. Go to https://platform.openai.com/api-keys
4. Click "Create new secret key"
5. Name it "Twitch Bot" (or anything)
6. **Copy the key immediately** - You won't see it again!
7. Save it somewhere safe

**Note**: OpenAI requires a paid account. You can start with $5-10 credit. The bot uses very little API calls.

**Priority**: The bot will use OpenAI if provided, otherwise Groq, then Hugging Face, then fallback responses.

## Step 5: Create Your .env File

1. In your bot folder, create a new file named `.env` (yes, just `.env` with no extension)
2. Open it in a text editor (Notepad, VS Code, etc.)
3. Copy and paste this template:

```env
# ============================================
# REQUIRED - Fill these in!
# ============================================

# Your bot's Twitch username (the account that will chat)
# Example: if your bot account is "MyCoolBot", put: MyCoolBot
TWITCH_BOT_USERNAME=your_bot_username_here

# The OAuth ACCESS TOKEN from Step 3 (from TwitchTokenGenerator.com)
# Should look like: abcdefghijklmnopqrstuvwxyz123456
# NOTE: Do NOT add "oauth:" prefix - just paste the token as-is!
TWITCH_OAUTH_TOKEN=paste_your_access_token_here

# The channel name where the bot will join (YOUR channel)
# Example: if your channel is twitch.tv/MyChannel, put: MyChannel
# DO NOT include the # symbol or twitch.tv/
TWITCH_CHANNEL=your_channel_name_here

# ============================================
# OPTIONAL - AI Features
# ============================================

# AI API Keys (choose one or more - priority: OpenAI > Groq > Hugging Face)
# Option 1: OpenAI (paid) - https://platform.openai.com/api-keys
OPENAI_API_KEY=your_openai_key_here

# Option 2: Groq (FREE!) - https://console.groq.com/
GROQ_API_KEY=your_groq_key_here

# Option 3: Hugging Face (FREE!) - https://huggingface.co/settings/tokens
HUGGINGFACE_API_KEY=your_huggingface_key_here

# 7TV User ID (optional - if your Twitch username doesn't match 7TV)
# You can provide just the ID: 01GFW04N9G00007A0Y2C1CSMQR
# Or the full URL: https://7tv.app/users/01GFW04N9G00007A0Y2C1CSMQR
SEVENTV_USER_ID=your_7tv_user_id_or_url_here

# ============================================
# OPTIONAL - Advanced Settings
# ============================================

# Port for webhook server (default: 3000)
PORT=3000

# Database file location (default: ./data/bot.db)
DATABASE_PATH=./data/bot.db
```

4. **Replace the placeholder values**:
   - `your_bot_username_here` → Your bot's Twitch username
   - `paste_your_access_token_here` → Your OAuth token from Step 3 (no "oauth:" prefix needed)
   - `your_channel_name_here` → Your channel name
   - `your_openai_key_here` → Your OpenAI key (or leave empty)
   - `your_groq_key_here` → Your Groq key (FREE - recommended!) or leave empty
   - `your_huggingface_key_here` → Your Hugging Face key (FREE!) or leave empty
   - `your_7tv_user_id_or_url_here` → Your 7TV user ID or URL (optional)

5. **Save the file**

## Step 6: Build the Bot

In your terminal (still in the bot folder), run:

```bash
npm run build
```

You should see output like:
```
> twitch-engagement-bot@1.0.0 build
> tsc
```

If you see errors, check:
- Did you run `npm install` first?
- Are you in the correct folder?
- Do you have Node.js installed?

## Step 7: Set Up Channel Points Custom Rewards (Important!)

Your bot uses channel points for deposits. Here's how to set them up:

### Creating DEPOSIT Rewards

1. **Go to your Twitch Creator Dashboard**: https://dashboard.twitch.tv/
2. **Navigate to**: Settings → Channel Points → Custom Rewards
3. **Click "Create Custom Reward"** (or "New Custom Reward")
4. **For each deposit amount, create a separate reward:**

   **Example Reward 1 (Small Deposit):**
   - **Title**: `DEPOSIT: 100`
   - **Cost**: `100` channel points
   - **Description**: "Deposit 100 points into the bot's gambling system"
   - **Require Viewer to Enter Text**: ❌ Unchecked
   - **Cooldown**: Optional (recommended: 0 seconds)
   - **Enabled**: ✅ Checked
   - **Click "Create"**

   **Example Reward 2 (Medium Deposit):**
   - **Title**: `DEPOSIT: 500`
   - **Cost**: `500` channel points
   - **Description**: "Deposit 500 points into the bot's gambling system"
   - **Click "Create"**

   **Example Reward 3 (Large Deposit):**
   - **Title**: `DEPOSIT: 1000`
   - **Cost**: `1000` channel points
   - **Description**: "Deposit 1000 points into the bot's gambling system"
   - **Click "Create"**

   **Example Reward 4 (Very Large Deposit):**
   - **Title**: `DEPOSIT: 10000`
   - **Cost**: `10000` channel points
   - **Description**: "Deposit 10000 points into the bot's gambling system"
   - **Click "Create"**

5. **Create as many deposit amounts as you want** (50, 100, 250, 500, 1000, 2500, 5000, 10000, etc.)

### ⚠️ CRITICAL FORMATTING RULES:

- **Title MUST be exactly**: `DEPOSIT: [number]` (with a space after the colon)
- **Capitalization matters**: `DEPOSIT` must be all caps
- **No extra spaces**: Don't add spaces before the colon
- **The number in the title should match the cost** (recommended, but not required)

### How It Works (Step by Step):

1. **Viewer goes to channel points** in your Twitch chat
2. **Viewer redeems** channel points for "DEPOSIT: 10000" (or any amount)
3. **Bot auto-detects** and deposits instantly (no chat command needed). If it doesn’t, the **streamer** can type `!deposit 10000` to force it.
4. **Bot deposits** the points into their account
5. **Viewer can now** gamble, buy actions, rain points, etc.!

**Important Notes:**
- The viewer just redeems the channel points reward — no chat command required
- The bot watches chat for the “Redeemed DEPOSIT: XXXX” system message (or uses webhooks/PubSub) and auto-deposits that amount
- If something fails, the streamer can type `!deposit <amount>` (the amount must match the redeemed reward) to manually credit the user

### Alternative: Automatic Detection with Webhooks (Advanced - Optional)

**Note**: This is OPTIONAL! The bot already listens for the “Redeemed DEPOSIT” chat messages. Webhooks/PubSub just make it even more reliable (and remove the need for the streamer to ever type `!deposit` manually).

If you want users to automatically get points when they redeem channel points (without typing `!deposit`), you can set up Twitch EventSub webhooks. See the detailed webhook setup guide in README.md under "Webhook Configuration".
If you can't set up EventSub yet, make sure `TWITCH_CHANNEL_USER_ID` is set in `.env` — and provide `TWITCH_BROADCASTER_OAUTH_TOKEN` (or reuse `TWITCH_OAUTH_TOKEN` if you're running as the broadcaster) — the bot will automatically use Twitch PubSub as a fallback for local testing. The same webhook endpoint can also be used for `channel.follow`, `channel.subscribe`, `channel.subscription.message`, and `channel.subscription.gift` so the bot can thank viewers automatically.

**Quick Summary:**
1. Bot runs webhook server on port 3000
2. Use ngrok to expose it: `ngrok http 3000`
3. Create EventSub subscription in Twitch Developer Console
4. Point it to your ngrok URL + `/webhook/channel-points`
5. Done! Redemptions will be automatic.

But again, this is optional - the manual method works great!

## Step 8: Set Up Webhooks (Optional - Advanced)

**SKIP THIS STEP if you're fine with the bot reading chat redemption messages (or the streamer typing `!deposit` manually when needed)!**

Webhooks allow automatic detection of channel point redemptions. This is more complex but provides a seamless experience.

### Quick Webhook Setup

1. **Start your bot** (it will start the webhook server automatically)

2. **Install and run ngrok**:
   - Download from: https://ngrok.com/download
   - Run: `ngrok http 3000`
   - Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)

3. **Get your Twitch User ID**: (WIP)
   - Your User ID is shown there, OR https://www.streamweasels.com/tools/convert-twitch-username-%20to-user-id/
   - Use this API call: `curl -H "Authorization: OAuth YOUR_OAUTH_TOKEN" https://api.twitch.tv/helix/users`
   - Look for the "id" field in the response

4. **Get your Client ID** (if you don't have one): 
   **WIP**
   - Go to: https://dev.twitch.tv/console/apps
   - Create a new application (name it anything, redirect URL can be `http://localhost`)
   - Copy your Client ID

5. **Create EventSub Subscription using API** (Recommended method):

   Generate a webhook secret:
   ```bash
   # On Windows PowerShell:
   -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | % {[char]$_})
   
   # On Linux/Mac:
   openssl rand -hex 16
   ```

   Then run this curl command (replace the values):
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
         "callback": "https://abc123.ngrok.io/webhook/channel-points",
         "secret": "YOUR_GENERATED_SECRET"
       }
     }'
   ```

   Replace:
   - `YOUR_OAUTH_TOKEN` - Your bot's OAuth token from .env
   - `YOUR_CLIENT_ID` - From step 4
   - `YOUR_CHANNEL_USER_ID` - From step 3
   - `https://abc123.ngrok.io` - Your ngrok URL
   - `YOUR_GENERATED_SECRET` - The secret from above

6. **Add webhook secret to .env** (Optional but recommended for security):
   - Open your `.env` file
   - Add: `WEBHOOK_SECRET=YOUR_GENERATED_SECRET` (use the same secret from step 5)
   - This enables signature verification to ensure requests are from Twitch

7. **Verify**: The API should return a success response. Check subscription status:
   ```bash
   curl -H "Authorization: Bearer YOUR_OAUTH_TOKEN" \
        -H "Client-Id: YOUR_CLIENT_ID" \
        https://api.twitch.tv/helix/eventsub/subscriptions
   ```

8. **Test**: Redeem a "DEPOSIT: 100" reward - it should work automatically!

**Note about the webhook secret & ad monitor:**
- The secret is used by your bot to verify that webhook requests are actually from Twitch
- ngrok doesn't use the secret - it just forwards requests to your bot
- Your bot verifies the signature using the secret to prevent fake/spoofed webhooks
- If you don't set `WEBHOOK_SECRET` in `.env`, verification is disabled (works but less secure)
- Set both `TWITCH_CLIENT_ID` and `TWITCH_CHANNEL_USER_ID` to enable the ad monitor + PubSub fallback (the bot will warn chat when Twitch is about to run an ad)

**For detailed webhook instructions, see README.md**

---

## Step 9: Start the Bot!

In your terminal, run:

```bash
npm start
```

You should see:
```
🤖 Starting Twitch Engagement Bot...
📺 Channel: yourchannel
👤 Bot: yourbot
💾 Database: ./data/bot.db
🤖 AI: Enabled (or Disabled)

✅ Connected to Twitch at irc.chat.twitch.tv:6697
📺 Joined channel: #yourchannel
🤖 AI: Enabled (Groq - Free)  (or Enabled (OpenAI) or Disabled (using fallback))
🎭 7TV User ID: 01GFW04N9G00007A0Y2C1CSMQR  (if SEVENTV_USER_ID is set)
🎭 Loaded X 7TV emotes for yourchannel
```

**If you see errors**, check the troubleshooting section below.

## Step 10: Test It!

1. **Go to your Twitch channel chat** (make sure the bot is connected)
2. **Type**: `!help` - You should see a quick command guide
3. **Type**: `!commands` - You should see the full command list
4. **Type**: `!balance` - Check your balance (should be 0 or show "You don't have an account yet")
5. **Deposit points**:
   - Go to your channel points rewards
   - Redeem a "DEPOSIT: 100" channel point reward (or any amount)
   - In chat, type: `!deposit 100` (streamer only, and only if it didn’t deposit automatically)
   - Type: `!balance` again - Should now show 100 points!
6. **Try a game**: `!coinflip 50 heads` - Play a coinflip game!
7. **Check leaderboard**: `!leaderboard` - See top chatters
8. **Try actions**: `!actions` - See what you can buy with points
9. **Test 7TV emotes**: `!emotelist` - See available emotes (if configured)

**Common First Commands to Try:**
- `!help` - Quick guide
- `!balance` - Check your points
- `!leaderboard` - See top players
- `!coinflip 50 heads` - Play a game
- `!actions` - See purchasable actions
- `!emotelist` - See 7TV emotes
- `!twb` - Get the GitHub repository link
- `!trivia start` - Start a trivia question (mod/streamer only)

## Troubleshooting

### ❌ "Cannot find module" errors
**Solution**: Run `npm install` again

### ❌ "Missing required environment variables"
**Solution**: Check your `.env` file:
- Is it named exactly `.env` (not `.env.txt`)?
- Are all required fields filled in?
- No extra spaces or quotes around values?

### ❌ "Login authentication failed"
**Solution**: 
- Your OAuth token might be expired. Get a new one from https://twitchtokengenerator.com/
- **IMPORTANT**: The token should NOT include `oauth:` at the start - just paste it as-is
- Make sure your bot account isn't banned
- Verify you selected the correct scopes when generating the token

### ❌ Bot connects but doesn't respond
**Solution**:
- Make sure the bot account has permission to chat in your channel
- Check that you're typing commands in the correct channel
- Try `!help` to see if commands work

### ❌ Channel points not depositing
**Solution**:
- Check the redemption title is EXACTLY `DEPOSIT: 100` (case-sensitive)
- Make sure there's a space after the colon
- The number in the title should match the cost
- Try the manual deposit: `!manualdeposit 100` (for testing)

### ❌ AI not working
**Solution**:
- Check your API key is correct (`OPENAI_API_KEY`, `GROQ_API_KEY`, or `HUGGINGFACE_API_KEY`)
- For free options, get a Groq key at https://console.groq.com/ (recommended!) or Hugging Face at https://huggingface.co/settings/tokens
- Make sure you have credits (OpenAI) or haven't exceeded free tier limits
- The bot works fine without AI - it uses smart context-aware fallback responses

## Step 11: Custom Redemption Messages (Optional)

The bot automatically tracks and announces special redemptions:

1. **"Daily [x]" redemptions** - When someone redeems "Daily monster", "Daily burger", etc.
   - Bot will say: `@username has redeemed their daily monster (#1) times!`
   - Counts increment automatically per user per item

2. **"First" redemptions** - When someone redeems "first" or "first to the stream"
   - Bot will say: `@username was first in the stream (#1) times!`
   - Counts increment automatically per user

3. **Customize messages** - Edit `redemptionMessages.json` in the project root:
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
   - `{user}` - Username
   - `{item}` - Item name (for daily redemptions)
   - `{count}` or `#{count}` - Redemption count

The bot creates this file automatically on first run with default messages.

## Step 12: Trivia System

The bot includes an AI-powered trivia system:

1. **Random trivia events** - Automatically triggers every 10-20 minutes for active chatters
   - Questions are AI-generated (20% chance of being related to current stream category)
   - First correct answer wins 400 points
   - Questions timeout after 60 seconds if unanswered

2. **Manual trivia control** (Mod/Streamer only):
   - `!trivia start` - Manually trigger a trivia question
   - `!trivia enable` - Enable random trivia events
   - `!trivia disable` - Disable random trivia (manual start still works)
   - `!trivia status` - Check trivia system status

3. **Requirements**:
   - AI API key (Groq recommended - free at https://console.groq.com/)
   - Trivia uses the same AI provider as chat responses

## Next Steps

Once everything is working:

1. **Customize the bot** - Edit responses in the code
2. **Add more games** - Check `src/games/games.ts`
3. **Create custom actions** - Check `src/actions/actions.ts`
4. **Set up webhooks** - For automatic channel point detection (advanced)
5. **Customize redemption messages** - Edit `redemptionMessages.json`
6. **Configure trivia** - Use `!trivia` commands to manage the trivia system

## Getting Help

If you're stuck:
1. Check the error message carefully
2. Read the troubleshooting section above
3. Make sure all steps were followed exactly
4. Check that your `.env` file is correct

## Common Mistakes

❌ **Wrong .env file name** - Must be `.env` (no extension), not `.env.txt` or `env.txt`
❌ **Adding oauth: prefix** - Token should NOT start with `oauth:` - paste it as-is from TwitchTokenGenerator
❌ **Wrong channel name** - Don't include `#` or `twitch.tv/` - just the channel name (e.g., `MyChannel` not `#MyChannel`)
❌ **Channel points title wrong** - Must be exactly `DEPOSIT: 100` format (capital DEPOSIT, space after colon, number)
❌ **Not running npm install** - Always run `npm install` first before building!
❌ **Forgetting to build** - Run `npm run build` after installing dependencies
❌ **Manual !deposit before redeeming** - If the streamer needs to run `!deposit`, redeem the channel points reward FIRST, then run `!deposit <amount>`
❌ **7TV not working** - If your Twitch username doesn't match your 7TV account, add `SEVENTV_USER_ID` to `.env`

---

**You're all set!** 🎉 The bot should now be running and ready to engage with your chat!
