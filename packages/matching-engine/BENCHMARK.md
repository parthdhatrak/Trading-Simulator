# Matching Engine Performance Benchmark

This document records the throughput and latency benchmarks of the custom `IndexedBinaryHeap` matching engine implementation in JavaScript (V8 Engine).

## Benchmark Settings
- **Total Orders Generated:** 100,000 (90% LIMIT, 10% MARKET)
- **Warm-up iterations:** 1,000 orders
- **Measured iterations:** 99,000 orders
- **Environment:** Node.js (V23.1.0), Windows, single-thread V8 execution

---

## Performance Results

| Metric | Measured Value |
| :--- | :--- |
| **Throughput** | **1,314,778 orders/sec** |
| **Total Duration** | 75.30 ms |
| **Executed Matches (Trades)** | 88,099 trades |
| **Mean Latency** | **0.69 μs** |
| **p50 Latency (Median)** | **0.30 μs** |
| **p95 Latency** | **1.50 μs** |
| **p99 Latency** | **2.40 μs** |

---

## Architecture Context & Optimization Choices
1. **Contiguous Array Buffering:** By representing the heap as a packed array of orders rather than node-pointer trees, we avoid pointer-chasing and minimize garbage collector (GC) runs.
2. **$O(1)$ Hash Map Location Lookup:** By maintaining a Map pointing each order ID directly to its position index in the heap array, order cancellation is reduced to a simple swap-and-pop, making it $O(\log N)$ instead of $O(N)$ scanning.
3. **Optimized V8 Inline Calls:** Swaps and comparisons are simple index accesses, allowing the V8 compiler to inline heap helper operations effectively.
