export class RefreshQueue {
  private refreshPromise: Promise<string | null> | null = null;

  run(refreshFn: () => Promise<string | null>): Promise<string | null> {
    if (!this.refreshPromise) {
      this.refreshPromise = refreshFn().finally(() => {
        this.refreshPromise = null;
      });
    }

    return this.refreshPromise;
  }
}
