/**
 * Sliding-window limiter: at most `maxCalls` calls to `run()` are allowed
 * to start within any `windowMs` window. Anything over the limit waits
 * until the oldest call in the window ages out, instead of failing.
 *
 * This is what lets the directory page fetch every page of 137 records
 * without tripping the API's "5 requests/minute" limit — see Conflict 1
 * in DECISIONS.md.
 */
export class SlidingWindowRateLimiter {
  private callTimestamps: number[] = [];

  constructor(private maxCalls: number, private windowMs: number) {}

  async run<T>(fn: () => Promise<T>): Promise<T> {
    await this.waitForSlot();
    this.callTimestamps.push(Date.now());
    return fn();
  }

  private async waitForSlot(): Promise<void> {
    for (;;) {
      const now = Date.now();
      this.callTimestamps = this.callTimestamps.filter((t) => now - t < this.windowMs);
      if (this.callTimestamps.length < this.maxCalls) return;
      const oldest = this.callTimestamps[0];
      const waitMs = this.windowMs - (now - oldest) + 5;
      await new Promise((resolve) => setTimeout(resolve, Math.max(waitMs, 0)));
    }
  }
}
