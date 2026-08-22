export type OrderSide = "BUY" | "SELL";
export type OrderType = "LIMIT" | "MARKET" | "IOC" | "FOK";

export interface Order {
  id: string;
  userId: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  price: number; // Ignored for MARKET orders
  quantity: number;
  remainingQuantity: number;
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

// WS Network Message Schemas
export type EngineEventType =
  | "ORDER_ACK"
  | "ORDER_REJECT"
  | "TRADE_EXECUTED"
  | "BOOK_DELTA"
  | "BOOK_SNAPSHOT";

export interface EngineEvent {
  type: EngineEventType;
  symbol: string;
  sequenceNumber: number;
  timestamp: number;
  data: any;
}
