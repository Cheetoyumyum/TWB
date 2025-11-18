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

## Step 4: Get OpenAI API Key (Optional but Recommended)

**Skip this if you don't want AI features** - the bot works fine without it!

1. Go to https://platform.openai.com/
2. Sign up or log in
3. Go to https://platform.openai.com/api-keys
4. Click "Create new secret key"
5. Name it "Twitch Bot" (or anything)
6. **Copy the key immediately** - You won't see it again!
7. Save it somewhere safe

**Note**: OpenAI requires a paid account. You can start with $5-10 credit. The bot uses very little API calls.

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

# OpenAI API key from Step 4 (leave empty if not using AI)
# Example: sk-abcdefghijklmnopqrstuvwxyz1234567890
OPENAI_API_KEY=your_openai_key_here

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
   - `oauth:paste_your_token_here` → Your OAuth token from Step 3
   - `your_channel_name_here` → Your channel name
   - `your_openai_key_here` → Your OpenAI key (or leave empty)

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

### How It Works:

1. **Viewer redeems** channel points for "DEPOSIT: 10000"
2. **Viewer types** `!deposit 10000` in chat
3. **Bot deposits** the points into their account
4. **Viewer can now** gamble, buy actions, etc.!

### Alternative: Automatic Detection (Advanced)

If you set up webhooks (see Step 8), the bot can automatically detect redemptions without the manual `!deposit` command. But the manual method works fine for now!

## Step 8: Start the Bot!

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
🎭 Loaded X 7TV emotes for yourchannel
```

**If you see errors**, check the troubleshooting section below.

## Step 9: Test It!

1. Go to your Twitch channel chat
2. Type: `!help` - You should see a list of commands
3. Type: `!balance` - Check your balance (should be 0)
4. Redeem a "DEPOSIT: 100" channel point reward
5. Type: `!balance` again - Should show 100 points!
6. Try: `!coinflip 50 heads` - Play a game!

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
- Your OAuth token might be expired. Get a new one from https://twitchapps.com/tmi/
- Make sure the token includes `oauth:` at the start
- Make sure your bot account isn't banned

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
- Check your OpenAI API key is correct
- Make sure you have credits in your OpenAI account
- The bot works fine without AI - it just uses simpler responses

## Next Steps

Once everything is working:

1. **Customize the bot** - Edit responses in the code
2. **Add more games** - Check `src/games/games.ts`
3. **Create custom actions** - Check `src/actions/actions.ts`
4. **Set up webhooks** - For automatic channel point detection (advanced)

## Getting Help

If you're stuck:
1. Check the error message carefully
2. Read the troubleshooting section above
3. Make sure all steps were followed exactly
4. Check that your `.env` file is correct

## Common Mistakes

❌ **Wrong .env file name** - Must be `.env` not `.env.txt` or `env.txt`
❌ **Missing oauth: prefix** - Token must start with `oauth:`
❌ **Wrong channel name** - Don't include `#` or `twitch.tv/`
❌ **Channel points title wrong** - Must be exactly `DEPOSIT: 100` format
❌ **Not running npm install** - Always run this first!

---

**You're all set!** 🎉 The bot should now be running and ready to engage with your chat!
