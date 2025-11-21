import axios from 'axios';

export class TwitchApiClient {
  private clientId: string;
  private broadcasterId: string;
  private oauthToken: string;

  constructor(clientId: string, broadcasterId: string, oauthToken: string) {
    this.clientId = clientId;
    this.broadcasterId = broadcasterId;
    this.oauthToken = oauthToken;
  }

  async createPoll(question: string, options: string[], duration: number = 60): Promise<{ success: boolean; message?: string }> {
    if (options.length < 2) {
      return { success: false, message: 'Need at least two poll options.' };
    }

    try {
      await axios.post(
        'https://api.twitch.tv/helix/polls',
        {
          broadcaster_id: this.broadcasterId,
          title: question.slice(0, 60),
          choices: options.slice(0, 5).map((opt) => ({ title: opt.slice(0, 25) })),
          duration: Math.min(Math.max(duration, 15), 1800),
        },
        {
          headers: {
            Authorization: `Bearer ${this.oauthToken}`,
            'Client-Id': this.clientId,
            'Content-Type': 'application/json',
          },
        }
      );

      return { success: true, message: `📊 Poll started: ${question}` };
    } catch (error: any) {
      const details = error.response?.data?.message || error.message || 'Unknown error';
      console.error('Failed to create Twitch poll:', details);
      return { success: false, message: `⚠️ Unable to create poll: ${details}` };
    }
  }

  async createPrediction(title: string, outcomes: string[], duration: number = 120): Promise<{ success: boolean; message?: string }> {
    if (outcomes.length < 2) {
      return { success: false, message: 'Need at least two prediction outcomes.' };
    }

    try {
      await axios.post(
        'https://api.twitch.tv/helix/predictions',
        {
          broadcaster_id: this.broadcasterId,
          title: title.slice(0, 45),
          outcomes: outcomes.slice(0, 2).map((opt) => ({ title: opt.slice(0, 25) })),
          prediction_window: Math.min(Math.max(duration, 30), 1800),
        },
        {
          headers: {
            Authorization: `Bearer ${this.oauthToken}`,
            'Client-Id': this.clientId,
            'Content-Type': 'application/json',
          },
        }
      );

      return { success: true, message: `🔮 Prediction started: ${title}` };
    } catch (error: any) {
      const details = error.response?.data?.message || error.message || 'Unknown error';
      console.error('Failed to create Twitch prediction:', details);
      return { success: false, message: `⚠️ Unable to create prediction: ${details}` };
    }
  }

  async sendShoutout(targetLogin: string): Promise<{ success: boolean; message?: string }> {
    const targetId = await this.getUserId(targetLogin);
    if (!targetId) {
      return { success: false, message: `⚠️ Couldn't find Twitch user: ${targetLogin}` };
    }

    try {
      await axios.post(
        'https://api.twitch.tv/helix/channels/shoutouts',
        null,
        {
          params: {
            from_broadcaster_id: this.broadcasterId,
            to_broadcaster_id: targetId,
            moderator_id: this.broadcasterId,
          },
          headers: {
            Authorization: `Bearer ${this.oauthToken}`,
            'Client-Id': this.clientId,
          },
        }
      );

      return { success: true, message: `📢 Shoutout sent to @${targetLogin}!` };
    } catch (error: any) {
      const details = error.response?.data?.message || error.message || 'Unknown error';
      console.error('Failed to send Twitch shoutout:', details);
      return { success: false, message: `⚠️ Unable to shoutout ${targetLogin}: ${details}` };
    }
  }

  private async getUserId(login: string): Promise<string | null> {
    try {
      const response = await axios.get('https://api.twitch.tv/helix/users', {
        params: { login },
        headers: {
          Authorization: `Bearer ${this.oauthToken}`,
          'Client-Id': this.clientId,
        },
      });
      return response.data?.data?.[0]?.id || null;
    } catch (error: any) {
      console.error('Failed to fetch Twitch user id:', error.response?.data || error.message);
      return null;
    }
  }
}

