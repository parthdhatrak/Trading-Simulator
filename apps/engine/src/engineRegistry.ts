import { MatchingEngine } from "@trading/matching-engine";

/**
 * EngineRegistry maintains one MatchingEngine per symbol.
 * Sharding by symbol keeps matching single-threaded per book,
 * giving price-time priority correctness without any locks.
 */
export class EngineRegistry {
  private engines: Map<string, MatchingEngine> = new Map();

  public get(symbol: string): MatchingEngine {
    const normalised = symbol.toUpperCase();
    if (!this.engines.has(normalised)) {
      this.engines.set(normalised, new MatchingEngine(normalised));
    }
    return this.engines.get(normalised)!;
  }

  public has(symbol: string): boolean {
    return this.engines.has(symbol.toUpperCase());
  }

  public symbols(): string[] {
    return Array.from(this.engines.keys());
  }
}

export const registry = new EngineRegistry();
