"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdMonitor = void 0;
const axios_1 = __importDefault(require("axios"));
class AdMonitor {
    constructor(bot, config) {
        this.sentWarnings = new Set();
        this.inAdWindow = false;
        this.bot = bot;
        this.config = {
            pollInterval: config.pollInterval ?? 60000,
            ...config,
        };
    }
    start() {
        this.stop();
        this.pollAdSchedule();
        this.timer = setInterval(() => this.pollAdSchedule(), this.config.pollInterval);
    }
    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = undefined;
        }
    }
    async pollAdSchedule() {
        try {
            const response = await axios_1.default.get('https://api.twitch.tv/helix/channels/ads', {
                headers: {
                    Authorization: `Bearer ${this.config.oauthToken}`,
                    'Client-Id': this.config.clientId,
                },
                params: {
                    broadcaster_id: this.config.broadcasterId,
                },
            });
            const info = response.data?.data?.[0];
            if (!info) {
                return;
            }
            const secondsUntilNextAd = this.extractSecondsUntilAd(info);
            const adDuration = this.extractAdDuration(info) ?? 90;
            if (secondsUntilNextAd == null || secondsUntilNextAd > 6 * 60 * 60) {
                // No scheduled ads or way too far in the future
                this.sentWarnings.clear();
                this.inAdWindow = false;
                return;
            }
            this.handleWarnings(secondsUntilNextAd);
            if (secondsUntilNextAd <= 0 && !this.inAdWindow) {
                this.inAdWindow = true;
                this.bot.announceAdStarted(adDuration);
            }
            else if (secondsUntilNextAd > adDuration && this.inAdWindow) {
                // New schedule outside current ad window -> reset
                this.inAdWindow = false;
            }
        }
        catch (error) {
            if (error.response?.status === 401 || error.response?.status === 403) {
                console.warn('⚠️  Ad monitor auth error. Check channel:read:ads scope.');
            }
            else {
                console.warn('⚠️  Failed to fetch ad schedule:', error.response?.status || error.message);
            }
        }
    }
    extractSecondsUntilAd(info) {
        if (typeof info.next_ad_in_seconds === 'number') {
            return info.next_ad_in_seconds;
        }
        if (typeof info.seconds_until_next_ad === 'number') {
            return info.seconds_until_next_ad;
        }
        const timestamp = this.parseTimestamp(info.next_ad_time ?? info.scheduled_ad_time);
        if (timestamp) {
            return Math.round((timestamp - Date.now()) / 1000);
        }
        return null;
    }
    extractAdDuration(info) {
        if (typeof info.next_ad_length === 'number') {
            return info.next_ad_length;
        }
        if (typeof info.next_ad_duration === 'number') {
            return info.next_ad_duration;
        }
        return null;
    }
    parseTimestamp(value) {
        if (value == null)
            return null;
        if (typeof value === 'number') {
            // Value might already be epoch ms or seconds - assume seconds if too small
            return value < 10000000000 ? value * 1000 : value;
        }
        const ms = Date.parse(value);
        return Number.isNaN(ms) ? null : ms;
    }
    handleWarnings(secondsUntil) {
        const thresholds = [
            { key: '120', seconds: 120 },
            { key: '60', seconds: 60 },
            { key: '30', seconds: 30 },
            { key: '10', seconds: 10 },
        ];
        for (const threshold of thresholds) {
            if (secondsUntil <= threshold.seconds &&
                secondsUntil > threshold.seconds - 10 &&
                !this.sentWarnings.has(threshold.key)) {
                this.sentWarnings.add(threshold.key);
                this.bot.announceAdWarning(Math.max(secondsUntil, threshold.seconds));
            }
        }
        if (secondsUntil > 180) {
            this.sentWarnings.clear();
        }
    }
}
exports.AdMonitor = AdMonitor;
