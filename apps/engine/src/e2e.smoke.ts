/**
 * E2E smoke test for the Socket.io gateway.
 * Start the gateway first: npx tsx src/index.ts
 * Then run: npx tsx src/e2e.smoke.ts
 */
import { io, Socket } from "socket.io-client";
import {
  OrderAck,
  OrderReject,
  TradeExecuted,
  BookSnapshot,
  SubmitOrderPayload,
  SubscribePayload,
} from "@trading/shared-types";

const GW_URL = process.env.GATEWAY_URL || "http://localhost:4000";
const SYMBOL = "AAPL";
const TIMEOUT_MS = 5000;

function connect(label: string): Socket {
  const socket = io(GW_URL, { transports: ["websocket"] });
  socket.on("connect", () => console.log(`[${label}] connected (${socket.id})`));
  socket.on("connect_error", (e) => { console.error(`[${label}] connection error:`, e.message); process.exit(1); });
  return socket;
}

async function run() {
  console.log(`\n=== Gateway Smoke Test — ${GW_URL} ===\n`);

  const maker = connect("maker");
  const taker = connect("taker");

  // Wait for both connections
  await Promise.all([
    new Promise<void>(r => maker.once("connect", r)),
    new Promise<void>(r => taker.once("connect", r)),
  ]);

  // Both subscribe
  const sub: SubscribePayload = { symbol: SYMBOL };
  maker.emit("subscribe", sub);
  taker.emit("subscribe", sub);

  // Wait for initial snapshots
  await Promise.all([
    new Promise<void>(r => maker.once("BOOK_SNAPSHOT", (e: BookSnapshot) => {
      console.log(`[maker] initial snapshot seq=${e.snapshot.sequenceNumber} bids=${e.snapshot.bids.length} asks=${e.snapshot.asks.length}`);
      r();
    })),
    new Promise<void>(r => taker.once("BOOK_SNAPSHOT", () => r())),
  ]);

  // ── Maker places a sell limit order ──────────────────────────────────────────
  const sellPayload: SubmitOrderPayload = {
    clientOrderId: "c-sell-001",
    userId: "maker-user",
    symbol: SYMBOL,
    side: "SELL",
    type: "LIMIT",
    price: 100.00,
    quantity: 50,
  };

  const sellAck = await new Promise<OrderAck>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("Timeout waiting for sell ACK")), TIMEOUT_MS);
    maker.once("ORDER_ACK", (e: OrderAck) => { clearTimeout(t); resolve(e); });
    maker.once("ORDER_REJECT", (e: OrderReject) => { clearTimeout(t); reject(new Error(`Sell rejected: ${e.reason}`)); });
    maker.emit("order:submit", sellPayload);
  });
  console.log(`✅ Sell ACK — orderId=${sellAck.orderId} seq=${sellAck.sequenceNumber}`);

  // ── Taker places a matching buy limit order ───────────────────────────────────
  const buyPayload: SubmitOrderPayload = {
    clientOrderId: "c-buy-001",
    userId: "taker-user",
    symbol: SYMBOL,
    side: "BUY",
    type: "LIMIT",
    price: 100.00,
    quantity: 50,
  };

  // Listen for TRADE_EXECUTED on the taker socket (it's in the room)
  const tradePromise = new Promise<TradeExecuted>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("Timeout waiting for TRADE_EXECUTED")), TIMEOUT_MS);
    taker.once("TRADE_EXECUTED", (e: TradeExecuted) => { clearTimeout(t); resolve(e); });
  });

  const buyAck = await new Promise<OrderAck>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("Timeout waiting for buy ACK")), TIMEOUT_MS);
    taker.once("ORDER_ACK", (e: OrderAck) => { clearTimeout(t); resolve(e); });
    taker.once("ORDER_REJECT", (e: OrderReject) => { clearTimeout(t); reject(new Error(`Buy rejected: ${e.reason}`)); });
    taker.emit("order:submit", buyPayload);
  });
  console.log(`✅ Buy ACK  — orderId=${buyAck.orderId} seq=${buyAck.sequenceNumber}`);

  const trade = await tradePromise;
  console.log(`✅ Trade    — price=${trade.trade.price} qty=${trade.trade.quantity} aggressor=${trade.trade.aggressorSide} seq=${trade.sequenceNumber}`);

  // Assert correctness
  if (trade.trade.price !== 100.00) throw new Error(`Expected trade price 100 but got ${trade.trade.price}`);
  if (trade.trade.quantity !== 50) throw new Error(`Expected trade qty 50 but got ${trade.trade.quantity}`);
  if (trade.trade.sellerOrderId !== sellAck.orderId) throw new Error("Seller order ID mismatch");
  if (trade.trade.buyerOrderId !== buyAck.orderId) throw new Error("Buyer order ID mismatch");

  console.log(`\n🎉 All assertions passed — gateway event flow is correct.\n`);

  maker.disconnect();
  taker.disconnect();
  process.exit(0);
}

run().catch(e => { console.error("\n❌ Smoke test FAILED:", e.message); process.exit(1); });
