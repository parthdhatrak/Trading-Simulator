import { Order, Trade, OrderBookSnapshot, OrderBookLevel } from "@trading/shared-types";
import { IndexedBinaryHeap } from "./indexedHeap";

export class MatchingEngine {
  private symbol: string;
  private bids: IndexedBinaryHeap; // Max-heap (highest price first)
  private asks: IndexedBinaryHeap; // Min-heap (lowest price first)
  private sequenceCounter: number = 0;

  constructor(symbol: string) {
    this.symbol = symbol;
    this.bids = new IndexedBinaryHeap(false); // Max-heap for Bids
    this.asks = new IndexedBinaryHeap(true);  // Min-heap for Asks
  }

  /**
   * Submits a new order to the engine and attempts matching.
   */
  public processOrder(order: Order): { trades: Trade[]; remainingOrder: Order | null; error?: string } {
    // 1. Basic validation
    if (order.quantity <= 0) {
      return { trades: [], remainingOrder: null, error: "Quantity must be greater than zero." };
    }
    if (order.type === "LIMIT" && order.price <= 0) {
      return { trades: [], remainingOrder: null, error: "Limit price must be greater than zero." };
    }

    // 2. Assign sequence number if not set
    if (!order.sequenceNumber) {
      this.sequenceCounter++;
      order.sequenceNumber = this.sequenceCounter;
    }
    order.remainingQuantity = order.quantity;

    const trades: Trade[] = [];

    // 3. FOK Dry Run check
    if (order.type === "FOK") {
      if (!this.canFillFOK(order)) {
        return { trades: [], remainingOrder: null, error: "FOK cancelled: insufficient depth to fill order in full." };
      }
    }

    // 4. Match loop
    while (order.remainingQuantity > 0) {
      const oppositeSide = order.side === "BUY" ? this.asks : this.bids;
      const bestOpposite = oppositeSide.peek();

      if (!bestOpposite) {
        break; // No counter-party liquidity available
      }

      // Check if price crosses
      const canMatch =
        order.type === "MARKET" ||
        order.type === "IOC" ||
        order.type === "FOK" ||
        (order.side === "BUY" ? order.price >= bestOpposite.price : order.price <= bestOpposite.price);

      if (!canMatch) {
        break; // Price does not cross, no trade possible
      }

      // Execute match
      const matchQty = Math.min(order.remainingQuantity, bestOpposite.remainingQuantity);
      
      const trade: Trade = {
        id: `t-${order.id}-${bestOpposite.id}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        symbol: this.symbol,
        buyerOrderId: order.side === "BUY" ? order.id : bestOpposite.id,
        sellerOrderId: order.side === "SELL" ? order.id : bestOpposite.id,
        price: bestOpposite.price, // Match occurs at maker's resting price
        quantity: matchQty,
        timestamp: Date.now(),
        aggressorSide: order.side,
      };

      trades.push(trade);
      order.remainingQuantity -= matchQty;
      
      const remainingOppositeQty = bestOpposite.remainingQuantity - matchQty;
      if (remainingOppositeQty === 0) {
        oppositeSide.poll(); // resting order fully filled
      } else {
        oppositeSide.updateQuantity(bestOpposite.id, remainingOppositeQty); // partial fill
      }
    }

    // 5. Rest or cancel remaining quantity
    let remainingOrder: Order | null = null;
    if (order.remainingQuantity > 0) {
      if (order.type === "LIMIT") {
        const sideHeap = order.side === "BUY" ? this.bids : this.asks;
        sideHeap.insert(order);
        remainingOrder = order;
      } else {
        // MARKET, IOC, and FOK orders cancel any unfilled balance
        remainingOrder = null;
      }
    }

    return { trades, remainingOrder };
  }

  /**
   * Cancels a resting limit order by ID.
   */
  public cancelOrder(orderId: string): Order | null {
    let canceled = this.bids.remove(orderId);
    if (!canceled) {
      canceled = this.asks.remove(orderId);
    }
    return canceled;
  }

  /**
   * Generates aggregated market depth levels (L2).
   */
  public getOrderBookSnapshot(): OrderBookSnapshot {
    const aggregateLevels = (orders: Order[], ascending: boolean): OrderBookLevel[] => {
      const priceMap: Map<number, { quantity: number; count: number }> = new Map();
      
      for (const order of orders) {
        const level = priceMap.get(order.price) || { quantity: 0, count: 0 };
        level.quantity += order.remainingQuantity;
        level.count += 1;
        priceMap.set(order.price, level);
      }

      const sortedPrices = Array.from(priceMap.keys()).sort((a, b) => ascending ? a - b : b - a);

      return sortedPrices.map((price) => {
        const level = priceMap.get(price)!;
        return {
          price,
          quantity: level.quantity,
          orderCount: level.count,
        };
      });
    };

    return {
      symbol: this.symbol,
      bids: aggregateLevels(this.bids.getSortedValues(), false), // bids descending
      asks: aggregateLevels(this.asks.getSortedValues(), true),  // asks ascending
      timestamp: Date.now(),
      sequenceNumber: this.sequenceCounter,
    };
  }

  /**
   * Performs a dry-run check to verify if a FOK order can be fully satisfied.
   */
  private canFillFOK(order: Order): boolean {
    const oppositeSide = order.side === "BUY" ? this.asks : this.bids;
    const sortedOrders = oppositeSide.getSortedValues();

    let accumulatedQty = 0;
    for (const opp of sortedOrders) {
      // Check price overlap for FOK
      const isCrossed =
        order.side === "BUY" ? order.price >= opp.price : order.price <= opp.price;
      
      if (!isCrossed) {
        break; // Resting order is out of the limit range
      }

      accumulatedQty += opp.remainingQuantity;
      if (accumulatedQty >= order.quantity) {
        return true; // We found sufficient depth
      }
    }

    return false;
  }
}
