// ─── Core Domain Types ────────────────────────────────────────────────────────

export type OrderSide = "BUY" | "SELL";
export type OrderType = "LIMIT" | "MARKET" | "IOC" | "FOK";
export type OrderStatus = "PENDING" | "ACK" | "PARTIAL" | "FILLED" | "CANCELLED" | "REJECTED";

export interface Order {
  id: string;
  userId: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  price: number; // 0 for MARKET orders
  quantity: number;
  remainingQuantity: number;
  status?: OrderStatus;
  timestamp: number;
  sequenceNumber?: number;
}

export interface Trade {
  id: string;
  symbol: string;
  buyerOrderId: string;
  sellerOrderId: string;
  price: number;
  quantity: number;
  timestamp: number;
  aggressorSide: OrderSide;
}

export interface OrderBookLevel {
  price: number;
  quantity: number;
  orderCount: number;
}

export interface OrderBookSnapshot {
  symbol: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  timestamp: number;
  sequenceNumber: number;
}

export interface OrderBookDelta {
  symbol: string;
  side: OrderSide;
  price: number;
  quantity: number; // 0 means level removed
  sequenceNumber: number;
  timestamp: number;
}

// ─── Client → Gateway Events ──────────────────────────────────────────────────

export interface SubmitOrderPayload {
  clientOrderId: string; // Client-assigned idempotency key
  userId: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  price: number;
  quantity: number;
}

export interface CancelOrderPayload {
  orderId: string;
  userId: string;
  symbol: string;
}

export interface SubscribePayload {
  symbol: string;
}

// ─── Gateway → Client Events ──────────────────────────────────────────────────

export type GatewayEventType =
  | "ORDER_ACK"
  | "ORDER_REJECT"
  | "TRADE_EXECUTED"
  | "BOOK_SNAPSHOT"
  | "BOOK_DELTA"
  | "ORDER_CANCELLED";

export interface OrderAck {
  type: "ORDER_ACK";
  orderId: string;
  clientOrderId: string;
  symbol: string;
  sequenceNumber: number;
  timestamp: number;
}

export interface OrderReject {
  type: "ORDER_REJECT";
  clientOrderId: string;
  symbol: string;
  reason: string;
  sequenceNumber: number;
  timestamp: number;
}

export interface TradeExecuted {
  type: "TRADE_EXECUTED";
  trade: Trade;
  sequenceNumber: number;
}

export interface BookSnapshot {
  type: "BOOK_SNAPSHOT";
  snapshot: OrderBookSnapshot;
}

export interface BookDelta {
  type: "BOOK_DELTA";
  delta: OrderBookDelta;
}

export interface OrderCancelled {
  type: "ORDER_CANCELLED";
  orderId: string;
  symbol: string;
  sequenceNumber: number;
  timestamp: number;
}

export type GatewayEvent =
  | OrderAck
  | OrderReject
  | TradeExecuted
  | BookSnapshot
  | BookDelta
  | OrderCancelled;
