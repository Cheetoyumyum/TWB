export class AdHandler {
  private adStartCallback?: (duration: number) => void;
  private adEndCallback?: () => void;
  private isAdRunning: boolean = false;
  private adTimer?: NodeJS.Timeout;

  setAdStartCallback(callback: (duration: number) => void): void {
    this.adStartCallback = callback;
  }

  setAdEndCallback(callback: () => void): void {
    this.adEndCallback = callback;
  }

  startAd(duration: number = 180): void {
    if (this.isAdRunning) {
      return; // Ad already running
    }

    this.isAdRunning = true;

    // Announce ad start
    if (this.adStartCallback) {
      this.adStartCallback(duration);
    }

    // Set timer for ad end
    const seconds = duration;
    this.adTimer = setTimeout(() => {
      this.endAd();
    }, seconds * 1000);
  }

  endAd(): void {
    if (!this.isAdRunning) {
      return;
    }

    this.isAdRunning = false;

    if (this.adTimer) {
      clearTimeout(this.adTimer);
      this.adTimer = undefined;
    }

    // Announce ad end
    if (this.adEndCallback) {
      this.adEndCallback();
    }
  }

  isAdActive(): boolean {
    return this.isAdRunning;
  }

  getAdMessages(duration: number): { start: string; end: string } {
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    const timeStr = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

    const startMessages = [
      `📺 Ad break starting! We'll be back in ${timeStr}. Grab a snack! 🍿`,
      `⏸️ Ad time! Back in ${timeStr}. Perfect time to grab a drink! 🥤`,
      `📢 Quick ad break - ${timeStr} and we're back! Don't go anywhere! ⏰`,
      `🎬 Ad break! We'll return in ${timeStr}. See you soon! 👋`,
      `⏱️ Ad starting! Back in ${timeStr}. Thanks for your patience! 💜`,
    ];

    const endMessages = [
      `🎉 We're back! Thanks for sticking around! Let's continue! 🚀`,
      `✨ Ad break over! Welcome back, chat! Ready to continue? 💪`,
      `🎊 We're live again! Thanks for waiting! What did I miss? 👀`,
      `🔥 Back from ads! Let's get back to it! How's everyone doing? 😊`,
      `💜 We're back! Thanks for your patience during the ad break! 🎮`,
    ];

    return {
      start: startMessages[Math.floor(Math.random() * startMessages.length)],
      end: endMessages[Math.floor(Math.random() * endMessages.length)],
    };
  }
}

