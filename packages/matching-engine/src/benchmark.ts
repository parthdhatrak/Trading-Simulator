import { MatchingEngine } from "./index";
import { Order } from "@trading/shared-types";

function runBenchmark() {
  const NUM_ORDERS = 100000;
  const engine = new MatchingEngine("AAPL");

  console.log(`=========================================`);
  console.log(`STARTING MATCHING ENGINE BENCHMARK`);
  console.log(`Generating ${NUM_ORDERS.toLocaleString()} random orders...`);

  // Pre-generate orders to avoid counting generation time in performance stats
  const orders: Order[] = [];
  let currentPrice = 100.0;

  for (let i = 0; i < NUM_ORDERS; i++) {
    const side = Math.random() > 0.5 ? "BUY" : "SELL";
    // 90% Limit orders, 10% Market orders
    const type = Math.random() > 0.1 ? "LIMIT" : "MARKET";
    
    // Walk price randomly
    const change = (Math.random() - 0.5) * 1.0;
    currentPrice = Math.max(1.0, Number((currentPrice + change).toFixed(2)));

    const quantity = Math.floor(Math.random() * 10 + 1) * 10; // 10 to 100

    orders.push({
      id: `order-${i}`,
      userId: `user-${Math.floor(Math.random() * 100)}`,
      symbol: "AAPL",
      side,
      type,
      price: type === "LIMIT" ? currentPrice : 0,
      quantity,
      remainingQuantity: quantity,
      timestamp: Date.now(),
    });
  }

  console.log("Warm-up phase (1,000 orders)...");
  for (let i = 0; i < 1000; i++) {
    engine.processOrder(orders[i]);
  }

  console.log("Measuring execution...");
  const latenciesUs: number[] = [];
  let totalTrades = 0;

  const startTotal = process.hrtime.bigint();

  for (let i = 1000; i < NUM_ORDERS; i++) {
    const startOrder = process.hrtime.bigint();
    const result = engine.processOrder(orders[i]);
    const endOrder = process.hrtime.bigint();

    const latencyUs = Number(endOrder - startOrder) / 1000.0;
    latenciesUs.push(latencyUs);
    totalTrades += result.trades.length;
  }

  const endTotal = process.hrtime.bigint();
  const totalDurationMs = Number(endTotal - startTotal) / 1_000_000.0;

  // Calculate statistics
  latenciesUs.sort((a, b) => a - b);
  const numMeasured = latenciesUs.length;
  const p50 = latenciesUs[Math.floor(numMeasured * 0.50)];
  const p95 = latenciesUs[Math.floor(numMeasured * 0.95)];
  const p99 = latenciesUs[Math.floor(numMeasured * 0.99)];
  const mean = latenciesUs.reduce((a, b) => a + b, 0) / numMeasured;

  const throughput = (numMeasured / totalDurationMs) * 1000.0;

  console.log(`=========================================`);
  console.log(`BENCHMARK RESULTS`);
  console.log(`-----------------------------------------`);
  console.log(`Orders Processed:    ${numMeasured.toLocaleString()}`);
  console.log(`Total Trades:        ${totalTrades.toLocaleString()}`);
  console.log(`Total Duration:      ${totalDurationMs.toFixed(2)} ms`);
  console.log(`Throughput:          ${throughput.toLocaleString(undefined, { maximumFractionDigits: 0 })} orders/sec`);
  console.log(`-----------------------------------------`);
  console.log(`LATENCY STATISTICS:`);
  console.log(`Mean:                ${mean.toFixed(2)} μs`);
  console.log(`p50 (Median):        ${p50.toFixed(2)} μs`);
  console.log(`p95:                 ${p95.toFixed(2)} μs`);
  console.log(`p99:                 ${p99.toFixed(2)} μs`);
  console.log(`=========================================`);
}

runBenchmark();
