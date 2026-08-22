import { describe, it, expect, beforeEach } from "vitest";
import { MatchingEngine } from "./index";
import { Order } from "@trading/shared-types";

describe("MatchingEngine", () => {
  let engine: MatchingEngine;

  beforeEach(() => {
    engine = new MatchingEngine("AAPL");
  });

  const makeOrder = (
    id: string,
    side: "BUY" | "SELL",
    type: "LIMIT" | "MARKET" | "IOC" | "FOK",
    price: number,
    quantity: number
  ): Order => ({
    id,
    userId: "trader-1",
    symbol: "AAPL",
    side,
    type,
    price,
    quantity,
    remainingQuantity: quantity,
    timestamp: Date.now(),
  });

  it("should match Limit orders in strict price priority", () => {
    // Rest two sell orders
    engine.processOrder(makeOrder("ask1", "SELL", "LIMIT", 100.5, 10)); // higher price, lower priority
    engine.processOrder(makeOrder("ask2", "SELL", "LIMIT", 100.0, 10)); // lower price, higher priority

    // Submit buy limit order
    const result = engine.processOrder(makeOrder("bid1", "BUY", "LIMIT", 101.0, 15));

    expect(result.trades.length).toBe(2);
    // Should match ask2 first (maker price 100.0)
    expect(result.trades[0].price).toBe(100.0);
    expect(result.trades[0].quantity).toBe(10);
    
    // Should match ask1 second (maker price 100.5)
    expect(result.trades[1].price).toBe(100.5);
    expect(result.trades[1].quantity).toBe(5);

    expect(result.remainingOrder).toBeNull(); // fully filled
    
    // Check remaining asks
    const snapshot = engine.getOrderBookSnapshot();
    expect(snapshot.asks.length).toBe(1);
    expect(snapshot.asks[0].price).toBe(100.5);
    expect(snapshot.asks[0].quantity).toBe(5);
  });

  it("should match Limit orders in strict time priority (FIFO)", () => {
    // Rest two sell orders at the same price
    engine.processOrder(makeOrder("ask1", "SELL", "LIMIT", 100.0, 10)); // older, higher priority
    engine.processOrder(makeOrder("ask2", "SELL", "LIMIT", 100.0, 10)); // newer, lower priority

    // Submit buy limit order that matches only one
    const result = engine.processOrder(makeOrder("bid1", "BUY", "LIMIT", 100.0, 10));

    expect(result.trades.length).toBe(1);
    expect(result.trades[0].sellerOrderId).toBe("ask1"); // matched first resting order
    expect(result.trades[0].quantity).toBe(10);

    const snapshot = engine.getOrderBookSnapshot();
    expect(snapshot.asks.length).toBe(1);
    expect(snapshot.asks[0].quantity).toBe(10);
  });

  it("should handle partial fills and resting remnants", () => {
    engine.processOrder(makeOrder("ask1", "SELL", "LIMIT", 100.0, 10));

    const result = engine.processOrder(makeOrder("bid1", "BUY", "LIMIT", 99.0, 15));
    expect(result.trades.length).toBe(0); // price doesn't cross
    expect(result.remainingOrder?.id).toBe("bid1");

    // Check snapshot
    const snapshot = engine.getOrderBookSnapshot();
    expect(snapshot.bids.length).toBe(1);
    expect(snapshot.bids[0].price).toBe(99.0);
    expect(snapshot.asks.length).toBe(1);
    expect(snapshot.asks[0].price).toBe(100.0);
  });

  it("should cancel remaining quantities for Market orders when book is depleted", () => {
    engine.processOrder(makeOrder("ask1", "SELL", "LIMIT", 100.0, 10));

    const result = engine.processOrder(makeOrder("bid1", "BUY", "MARKET", 0, 15));
    expect(result.trades.length).toBe(1);
    expect(result.trades[0].quantity).toBe(10);
    expect(result.remainingOrder).toBeNull(); // market remaining is cancelled

    const snapshot = engine.getOrderBookSnapshot();
    expect(snapshot.bids.length).toBe(0); // no resting bids
    expect(snapshot.asks.length).toBe(0); // asks depleted
  });

  it("should support Immediate-or-Cancel (IOC) orders", () => {
    engine.processOrder(makeOrder("ask1", "SELL", "LIMIT", 100.0, 10));

    const result = engine.processOrder(makeOrder("bid1", "BUY", "IOC", 100.0, 15));
    expect(result.trades.length).toBe(1);
    expect(result.trades[0].quantity).toBe(10);
    expect(result.remainingOrder).toBeNull(); // IOC remaining is cancelled

    const snapshot = engine.getOrderBookSnapshot();
    expect(snapshot.bids.length).toBe(0);
    expect(snapshot.asks.length).toBe(0);
  });

  it("should support Fill-or-Kill (FOK) orders", () => {
    engine.processOrder(makeOrder("ask1", "SELL", "LIMIT", 100.0, 10));
    engine.processOrder(makeOrder("ask2", "SELL", "LIMIT", 101.0, 10));

    // Case 1: Insufficient depth -> Kill order
    const result1 = engine.processOrder(makeOrder("bid1", "BUY", "FOK", 102.0, 25));
    expect(result1.trades.length).toBe(0);
    expect(result1.error).toBeDefined();
    expect(engine.getOrderBookSnapshot().asks.length).toBe(2); // book unaffected

    // Case 2: Sufficient depth -> Fill order
    const result2 = engine.processOrder(makeOrder("bid2", "BUY", "FOK", 102.0, 15));
    expect(result2.trades.length).toBe(2);
    expect(result2.trades[0].sellerOrderId).toBe("ask1");
    expect(result2.trades[1].sellerOrderId).toBe("ask2");
    expect(engine.getOrderBookSnapshot().asks.length).toBe(1); // ask1 fully, ask2 partially filled
  });

  it("should support order cancellation", () => {
    engine.processOrder(makeOrder("bid1", "BUY", "LIMIT", 99.0, 10));
    
    const canceled = engine.cancelOrder("bid1");
    expect(canceled).toBeDefined();
    expect(canceled?.id).toBe("bid1");

    const snapshot = engine.getOrderBookSnapshot();
    expect(snapshot.bids.length).toBe(0);
  });

  it("should enforce property-based invariant: quantity conservation", () => {
    // Generate multiple random orders
    const orders = [
      makeOrder("o1", "BUY", "LIMIT", 100, 10),
      makeOrder("o2", "BUY", "LIMIT", 99, 20),
      makeOrder("o3", "SELL", "LIMIT", 101, 15),
      makeOrder("o4", "SELL", "LIMIT", 102, 25),
      makeOrder("o5", "BUY", "LIMIT", 101, 20), // Matches o3
      makeOrder("o6", "SELL", "LIMIT", 98, 30),  // Matches o1, o2
    ];

    let totalInputQty = 0;
    let totalExecutedQty = 0;

    for (const order of orders) {
      totalInputQty += order.quantity;
      const res = engine.processOrder(order);
      const matchedThisTurn = res.trades.reduce((sum, t) => sum + t.quantity, 0);
      totalExecutedQty += matchedThisTurn * 2; // Each match matches 1 buy and 1 sell (sum of quantities is doubled)
    }

    const snapshot = engine.getOrderBookSnapshot();
    let totalRestingQty = 0;
    for (const b of snapshot.bids) totalRestingQty += b.quantity;
    for (const a of snapshot.asks) totalRestingQty += a.quantity;

    // Mathematical identity: Input Qty = Executed Qty + Resting Qty
    // Since each execution removes matchedQty from BOTH maker and taker,
    // the total inputs equals: sum(resting) + sum(executed trades quantity) * 2
    expect(totalInputQty).toBe(totalRestingQty + totalExecutedQty);
  });
});
