# ADR 0001: Matching Engine Data Structures

## Status
Proposed

## Context
A key component of a high-performance matching engine is the order book representation. The matching engine must process operations with low latency and high correctness.
The core operations performed on the order book are:
1. **Insert order:** Place a limit order on either the Buy (Bids) or Sell (Asks) side.
2. **Match order (Peek & Poll):** Match orders in price-time priority (highest bid first, lowest ask first).
3. **Cancel order:** Remove a resting order from the book given its unique ID.
4. **Retrieve L1/L2 Market Data:** Fetch top of book prices and aggregate quantity levels.

We evaluated three data structure patterns for representing the bid and ask lists in TypeScript:

### Option A: Sorted Array (Linear Scan)
- **Insert:** $O(N)$ because inserting requires shifting items to keep it sorted.
- **Match:** $O(1)$ peek, $O(1)$ poll.
- **Cancel:** $O(N)$ to scan and delete.
- **Pros:** Extremely simple to implement. Fits memory sequentially.
- **Cons:** Performance degrades quadratically as depth grows. Not suitable for production load.

### Option B: Self-Balancing Binary Search Tree (BST) / Red-Black Tree
- **Insert:** $O(\log N)$ to find position and rebalance.
- **Match:** $O(\log N)$ to extract the min/max node.
- **Cancel:** $O(\log N)$ if mapping from order ID to tree node is kept.
- **Pros:** Standard approach for full order books.
- **Cons:** High garbage collection overhead in JS/TS due to creation of multiple node pointers. Implementation is complex and prone to edge-case bugs without external libraries.

### Option C: Heap-based Order Book with Location Map (Indexed Binary Heap)
- **Structure:**
  - Bids side: Max-Heap sorted by Price desc, then Timestamp asc.
  - Asks side: Min-Heap sorted by Price asc, then Timestamp asc.
  - An auxiliary Hash Map mapping `orderId` to index in the heap array.
- **Insert:** $O(\log N)$ to push and bubble up.
- **Match:** $O(1)$ peek at best price, $O(\log N)$ poll to extract and bubble down.
- **Cancel:** $O(\log N)$ to swap target element with tail, shrink array, and bubble up/down. Finding the element is $O(1)$ via the position map.
- **Pros:** Minimal memory footprint (packed arrays), no node-pointer chasing, optimal $O(\log N)$ operations.
- **Cons:** Array re-sizing (handled by V8 dynamically), requires custom implementation for the mapping.

---

## Decision
We select **Option C: Indexed Binary Heap**.
This structure guarantees price-time priority dynamically without needing a full-blown balanced tree. It keeps memory contiguous (V8 arrays) and enables $O(\log N)$ insertions, pollings, and cancellations.

## Consequences
- We must implement a custom heap in TypeScript that maintains an internal `idToPosition` index map.
- Every swap operation during heapify-up and heapify-down must update the index map.
- Testing must include properties verifying that the heap structure remains valid and sorted according to matching priority at all times.
