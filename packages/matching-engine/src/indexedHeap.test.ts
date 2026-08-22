import { describe, it, expect } from "vitest";
import { IndexedBinaryHeap } from "./indexedHeap";
import { Order } from "@trading/shared-types";

describe("IndexedBinaryHeap", () => {
  const createMockOrder = (id: string, price: number, sequenceNumber: number): Order => ({
    id,
    userId: "user-1",
    symbol: "AAPL",
    side: "BUY",
    type: "LIMIT",
    price,
    quantity: 100,
    remainingQuantity: 100,
    timestamp: Date.now(),
    sequenceNumber,
  });

  it("should maintain a min-heap structure sorted by price", () => {
    const minHeap = new IndexedBinaryHeap(true); // min-heap for Asks
    minHeap.insert(createMockOrder("o1", 150.0, 1));
    minHeap.insert(createMockOrder("o2", 140.0, 2));
    minHeap.insert(createMockOrder("o3", 160.0, 3));

    expect(minHeap.size()).toBe(3);
    expect(minHeap.peek()?.price).toBe(140.0);

    const polled = minHeap.poll();
    expect(polled?.id).toBe("o2");
    expect(minHeap.peek()?.price).toBe(150.0);
  });

  it("should maintain a max-heap structure sorted by price", () => {
    const maxHeap = new IndexedBinaryHeap(false); // max-heap for Bids
    maxHeap.insert(createMockOrder("o1", 150.0, 1));
    maxHeap.insert(createMockOrder("o2", 140.0, 2));
    maxHeap.insert(createMockOrder("o3", 160.0, 3));

    expect(maxHeap.size()).toBe(3);
    expect(maxHeap.peek()?.price).toBe(160.0);

    const polled = maxHeap.poll();
    expect(polled?.id).toBe("o3");
    expect(maxHeap.peek()?.price).toBe(150.0);
  });

  it("should break price ties using sequence number (FIFO)", () => {
    const minHeap = new IndexedBinaryHeap(true);
    minHeap.insert(createMockOrder("o1", 150.0, 2));
    minHeap.insert(createMockOrder("o2", 150.0, 1)); // Older (lower seq) has higher priority
    minHeap.insert(createMockOrder("o3", 150.0, 3));

    expect(minHeap.poll()?.id).toBe("o2");
    expect(minHeap.poll()?.id).toBe("o1");
    expect(minHeap.poll()?.id).toBe("o3");
  });

  it("should support removal of any element by ID", () => {
    const maxHeap = new IndexedBinaryHeap(false);
    maxHeap.insert(createMockOrder("o1", 100, 1));
    maxHeap.insert(createMockOrder("o2", 200, 2));
    maxHeap.insert(createMockOrder("o3", 150, 3));

    expect(maxHeap.remove("o3")?.id).toBe("o3");
    expect(maxHeap.size()).toBe(2);
    expect(maxHeap.poll()?.id).toBe("o2");
    expect(maxHeap.poll()?.id).toBe("o1");
  });

  it("should update quantity in-place without altering order positions", () => {
    const maxHeap = new IndexedBinaryHeap(false);
    maxHeap.insert(createMockOrder("o1", 100, 1));
    maxHeap.insert(createMockOrder("o2", 200, 2));

    maxHeap.updateQuantity("o2", 50);
    expect(maxHeap.peek()?.id).toBe("o2");
    expect(maxHeap.peek()?.remainingQuantity).toBe(50);
  });
});
