import axios from 'axios';

export interface ChannelInfo {
  id: string;
  broadcasterLogin: string;
  broadcasterName: string;
  gameId: string;
  gameName: string;
  title: string;
}

export interface ChannelInfoOptions {
  clientId: string;
  oauthToken: string;
  broadcasterId: string;
  cacheMs?: number;
}

export class ChannelInfoService {
  private clientId: string;
  private oauthToken: string;
  private broadcasterId: string;
  private cacheMs: number;
  private cachedInfo?: ChannelInfo;
  private cacheTime = 0;

  constructor(options: ChannelInfoOptions) {
    this.clientId = options.clientId;
    this.oauthToken = options.oauthToken;
    this.broadcasterId = options.broadcasterId;
    this.cacheMs = options.cacheMs ?? 5 * 60 * 1000; // default 5 minutes
  }

  async getChannelInfo(forceRefresh = false): Promise<ChannelInfo | null> {
    if (!forceRefresh && this.cachedInfo && Date.now() - this.cacheTime < this.cacheMs) {
      return this.cachedInfo;
    }

    try {
      const response = await axios.get('https://api.twitch.tv/helix/channels', {
        headers: {
          'Client-Id': this.clientId,
          Authorization: `Bearer ${this.oauthToken}`,
        },
        params: {
          broadcaster_id: this.broadcasterId,
        },
      });

      const data = response.data?.data?.[0];
      if (!data) {
        return null;
      }

      this.cachedInfo = {
        id: data.broadcaster_id,
        broadcasterLogin: data.broadcaster_login,
        broadcasterName: data.broadcaster_name,
        gameId: data.game_id,
        gameName: data.game_name,
        title: data.title,
      };
      this.cacheTime = Date.now();
      return this.cachedInfo;
    } catch (error: any) {
      console.warn('⚠️ Failed to fetch channel info:', error.response?.status || error.message);
      return null;
    }
  }
}

