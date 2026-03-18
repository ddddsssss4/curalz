export class Timer {
  private readonly origin: number;
  private readonly label: string;

  constructor(label: string) {
    this.label = label;
    this.origin = performance.now();
    console.log(`\n⏱  [${this.label}] request started`);
  }

  async measure<T>(step: string, fn: () => Promise<T> | T): Promise<T> {
    const stepStart = performance.now();
    try {
      return await fn();
    } finally {
      const durationMs = (performance.now() - stepStart).toFixed(2);
      console.log(`  ✔ [${this.label}] ${step} → ${durationMs}ms`);
    }
  }

  end(): void {
    const totalMs = (performance.now() - this.origin).toFixed(2);
    console.log(`⏱  [${this.label}] total → ${totalMs}ms\n`);
  }
}
