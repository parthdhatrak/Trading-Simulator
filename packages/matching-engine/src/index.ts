import { Order, Trade } from "@trading/shared-types";

export class MatchingEngine {
  private symbol: string;

  constructor(symbol: string) {
    this.symbol = symbol;
  }

  public processOrder(order: Order): { trades: Trade[]; remainingOrder: Order | null } {
    // Stub implementation to be filled in Phase 1
    return { trades: [], remainingOrder: order };
  }
}
