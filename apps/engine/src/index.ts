import { createServer } from "http";
import { Server, Socket } from "socket.io";
import { randomUUID } from "crypto";
import {
  SubmitOrderPayload,
  CancelOrderPayload,
  SubscribePayload,
  Order,
  OrderAck,
  OrderReject,
  TradeExecuted,
  BookSnapshot,
  BookDelta,
  OrderCancelled,
} from "@trading/shared-types";
import { registry } from "./engineRegistry";

// ─── Bootstrap ────────────────────────────────────────────────────────────────

const httpServer = createServer((req, res) => {
  // Health-check endpoint for Railway / Fly.io
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", symbols: registry.symbols() }));
    return;
  }
  res.writeHead(404).end();
});

const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  transports: ["websocket", "polling"],
});

// ─── Per-symbol global sequence counter ───────────────────────────────────────

const symbolSeq: Map<string, number> = new Map();
function nextSeq(symbol: string): number {
  const n = (symbolSeq.get(symbol) ?? 0) + 1;
  symbolSeq.set(symbol, n);
  return n;
}

// ─── Connection handler ───────────────────────────────────────────────────────

io.on("connection", (socket: Socket) => {
  console.log(`[gateway] client connected: ${socket.id}`);

  // ── subscribe ──────────────────────────────────────────────────────────────
  // Client joins a per-symbol room and immediately receives a full book snapshot.
  // On reconnect this same flow re-establishes consistent state.
  socket.on("subscribe", (payload: SubscribePayload) => {
    const symbol = payload?.symbol?.toUpperCase();
    if (!symbol) return;

    socket.join(symbol);
    console.log(`[gateway] ${socket.id} subscribed to ${symbol}`);

    const engine = registry.get(symbol);
    const snapshot = engine.getOrderBookSnapshot();
    const seq = nextSeq(symbol);

    const event: BookSnapshot = {
      type: "BOOK_SNAPSHOT",
      snapshot: { ...snapshot, sequenceNumber: seq },
    };
    socket.emit("BOOK_SNAPSHOT", event);
  });

  // ── unsubscribe ────────────────────────────────────────────────────────────
  socket.on("unsubscribe", (payload: SubscribePayload) => {
    const symbol = payload?.symbol?.toUpperCase();
    if (symbol) socket.leave(symbol);
  });

  // ── order:submit ───────────────────────────────────────────────────────────
  socket.on("order:submit", (payload: SubmitOrderPayload) => {
    const symbol = payload?.symbol?.toUpperCase();

    // Validate
    if (!symbol || !payload.side || !payload.type || payload.quantity <= 0) {
      const reject: OrderReject = {
        type: "ORDER_REJECT",
        clientOrderId: payload?.clientOrderId ?? "",
        symbol: symbol ?? "",
        reason: "Invalid order payload — missing required fields or quantity ≤ 0.",
        sequenceNumber: nextSeq(symbol ?? "UNKNOWN"),
        timestamp: Date.now(),
      };
      socket.emit("ORDER_REJECT", reject);
      return;
    }

    if (payload.type === "LIMIT" && payload.price <= 0) {
      const reject: OrderReject = {
        type: "ORDER_REJECT",
        clientOrderId: payload.clientOrderId,
        symbol,
        reason: "Limit order requires price > 0.",
        sequenceNumber: nextSeq(symbol),
        timestamp: Date.now(),
      };
      socket.emit("ORDER_REJECT", reject);
      return;
    }

    // Build domain order object
    const orderId = randomUUID();
    const order: Order = {
      id: orderId,
      userId: payload.userId,
      symbol,
      side: payload.side,
      type: payload.type,
      price: payload.price,
      quantity: payload.quantity,
      remainingQuantity: payload.quantity,
      timestamp: Date.now(),
    };

    const engine = registry.get(symbol);
    const { trades, remainingOrder, error } = engine.processOrder(order);

    if (error) {
      // Engine-level rejection (e.g. FOK not fillable)
      const reject: OrderReject = {
        type: "ORDER_REJECT",
        clientOrderId: payload.clientOrderId,
        symbol,
        reason: error,
        sequenceNumber: nextSeq(symbol),
        timestamp: Date.now(),
      };
      socket.emit("ORDER_REJECT", reject);
      return;
    }

    // ACK the submitting client
    const ackSeq = nextSeq(symbol);
    const ack: OrderAck = {
      type: "ORDER_ACK",
      orderId,
      clientOrderId: payload.clientOrderId,
      symbol,
      sequenceNumber: ackSeq,
      timestamp: Date.now(),
    };
    socket.emit("ORDER_ACK", ack);

    // Broadcast every trade to the symbol room
    for (const trade of trades) {
      const tradeSeq = nextSeq(symbol);
      const tradeEvent: TradeExecuted = {
        type: "TRADE_EXECUTED",
        trade,
        sequenceNumber: tradeSeq,
      };
      io.to(symbol).emit("TRADE_EXECUTED", tradeEvent);
    }

    // Broadcast book delta / snapshot after order processing
    if (trades.length > 0 || remainingOrder) {
      broadcastBookDelta(symbol);
    }
  });

  // ── order:cancel ───────────────────────────────────────────────────────────
  socket.on("order:cancel", (payload: CancelOrderPayload) => {
    const symbol = payload?.symbol?.toUpperCase();
    if (!symbol || !payload.orderId) return;

    const engine = registry.get(symbol);
    const cancelled = engine.cancelOrder(payload.orderId);

    if (cancelled) {
      const seq = nextSeq(symbol);
      const event: OrderCancelled = {
        type: "ORDER_CANCELLED",
        orderId: payload.orderId,
        symbol,
        sequenceNumber: seq,
        timestamp: Date.now(),
      };
      // Notify the room
      io.to(symbol).emit("ORDER_CANCELLED", event);

      // Push updated book state
      broadcastBookDelta(symbol);
    }
  });

  socket.on("disconnect", (reason) => {
    console.log(`[gateway] client disconnected: ${socket.id} (${reason})`);
  });
});

// ─── Book delta broadcast helper ──────────────────────────────────────────────
// For Phase 2 we broadcast a full snapshot after every match event.
// Phase 2+ will upgrade this to true incremental deltas via Redis pub/sub.

function broadcastBookDelta(symbol: string): void {
  const engine = registry.get(symbol);
  const snapshot = engine.getOrderBookSnapshot();
  const seq = nextSeq(symbol);

  const event: BookSnapshot = {
    type: "BOOK_SNAPSHOT",
    snapshot: { ...snapshot, sequenceNumber: seq },
  };
  io.to(symbol).emit("BOOK_SNAPSHOT", event);
}

// ─── Start server ─────────────────────────────────────────────────────────────

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4000;
httpServer.listen(PORT, () => {
  console.log(`[gateway] Socket.io engine listening on port ${PORT}`);
  console.log(`[gateway] Health check: http://localhost:${PORT}/health`);
});
