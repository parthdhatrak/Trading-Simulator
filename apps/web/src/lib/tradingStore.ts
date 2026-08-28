"use client";
import { create } from "zustand";
import {
  OrderBookSnapshot,
  Trade,
  OrderAck,
  OrderCancelled,
} from "@trading/shared-types";

export interface Position {
  symbol: string;
  qty: number;       // positive = long, negative = short
  avgPrice: number;
  realizedPnL: number;
}

export interface OpenOrder {
  orderId: string;
  clientOrderId: string;
  symbol: string;
  side: "BUY" | "SELL";
  type: string;
  price: number;
  quantity: number;
  remainingQuantity: number;
  status: "OPEN" | "CANCELLED" | "FILLED";
  timestamp: number;
}

interface TradingState {
  // Connection
  connected: boolean;
  activeSymbol: string;
  setConnected: (v: boolean) => void;
  setActiveSymbol: (s: string) => void;

  // Order Book
  orderBook: OrderBookSnapshot | null;
  setOrderBook: (snap: OrderBookSnapshot) => void;

  // Trades
  trades: Trade[];
  addTrade: (t: Trade) => void;

  // Open Orders
  openOrders: OpenOrder[];
  addOpenOrder: (o: OpenOrder) => void;
  ackOrder: (ack: OrderAck) => void;
  cancelOrder: (e: OrderCancelled) => void;
  markFilled: (orderId: string) => void;

  // Positions
  positions: Map<string, Position>;
  applyTrade: (t: Trade) => void;

  // Price history for sparkline (last 60 ticks)
  priceHistory: { price: number; time: number }[];
  addPriceTick: (price: number) => void;
}

export const useTradingStore = create<TradingState>((set) => ({
  connected: false,
  activeSymbol: "AAPL",
  setConnected: (v) => set({ connected: v }),
  setActiveSymbol: (s) => set({ activeSymbol: s.toUpperCase() }),

  orderBook: null,
  setOrderBook: (snap) => set({ orderBook: snap }),

  trades: [],
  addTrade: (t) =>
    set((s) => ({ trades: [t, ...s.trades].slice(0, 50) })),

  openOrders: [],
  addOpenOrder: (o) =>
    set((s) => ({ openOrders: [o, ...s.openOrders].slice(0, 100) })),
  ackOrder: (ack) =>
    set((s) => ({
      openOrders: s.openOrders.map((o) =>
        o.clientOrderId === ack.clientOrderId
          ? { ...o, orderId: ack.orderId, status: "OPEN" as const }
          : o
      ),
    })),
  cancelOrder: (e) =>
    set((s) => ({
      openOrders: s.openOrders.map((o) =>
        o.orderId === e.orderId ? { ...o, status: "CANCELLED" as const } : o
      ),
    })),
  markFilled: (orderId) =>
    set((s) => ({
      openOrders: s.openOrders.map((o) =>
        o.orderId === orderId ? { ...o, status: "FILLED" as const } : o
      ),
    })),

  positions: new Map(),
  applyTrade: (t) => {
    // We track position changes only for the current user's orders.
    set((s) => {
      const positions = new Map(s.positions);
      const pos = positions.get(t.symbol) ?? {
        symbol: t.symbol,
        qty: 0,
        avgPrice: 0,
        realizedPnL: 0,
      };

      // Determine if user is buyer or seller
      const openOrders = s.openOrders;
      const isBuyer = openOrders.some((o) => o.orderId === t.buyerOrderId);
      const isSeller = openOrders.some((o) => o.orderId === t.sellerOrderId);
      if (!isBuyer && !isSeller) return {}; // Not our trade

      if (isBuyer) {
        const totalCost = pos.avgPrice * Math.abs(pos.qty) + t.price * t.quantity;
        const newQty = pos.qty + t.quantity;
        pos.avgPrice = newQty !== 0 ? totalCost / Math.abs(newQty) : 0;
        pos.qty = newQty;
      } else {
        if (pos.qty > 0) {
          pos.realizedPnL += (t.price - pos.avgPrice) * t.quantity;
          pos.qty -= t.quantity;
          if (pos.qty <= 0) { pos.avgPrice = 0; }
        } else {
          pos.qty -= t.quantity;
        }
      }

      positions.set(t.symbol, pos);
      return { positions };
    });
  },

  priceHistory: [],
  addPriceTick: (price) =>
    set((s) => ({
      priceHistory: [...s.priceHistory, { price, time: Date.now() }].slice(-60),
    })),
}));
