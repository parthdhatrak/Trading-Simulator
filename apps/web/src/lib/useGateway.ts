"use client";
import { useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useTradingStore } from "./tradingStore";
import {
  OrderAck,
  OrderReject,
  TradeExecuted,
  BookSnapshot,
  OrderCancelled,
  SubmitOrderPayload,
  CancelOrderPayload,
} from "@trading/shared-types";

const GATEWAY_URL =
  process.env.NEXT_PUBLIC_GATEWAY_URL ?? "http://localhost:4000";

// Singleton socket so we don't create multiple connections across re-renders
let socketSingleton: Socket | null = null;

function getSocket(): Socket {
  if (!socketSingleton) {
    socketSingleton = io(GATEWAY_URL, {
      transports: ["websocket"],
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
  }
  return socketSingleton;
}

export function useGateway(symbol: string) {
  const {
    setConnected,
    setOrderBook,
    addTrade,
    addOpenOrder,
    ackOrder,
    cancelOrder: storeCancelOrder,
    markFilled,
    applyTrade,
    addPriceTick,
  } = useTradingStore();

  const socketRef = useRef<Socket | null>(null);
  const symbolRef = useRef(symbol);
  symbolRef.current = symbol;

  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;

    const onConnect = () => {
      setConnected(true);
      socket.emit("subscribe", { symbol });
    };

    const onDisconnect = () => setConnected(false);

    const onSnapshot = (e: BookSnapshot) => {
      setOrderBook(e.snapshot);
    };

    const onTrade = (e: TradeExecuted) => {
      addTrade(e.trade);
      addPriceTick(e.trade.price);
      // Check if any of our orders filled
      useTradingStore.getState().openOrders.forEach((o) => {
        if (o.orderId === e.trade.buyerOrderId || o.orderId === e.trade.sellerOrderId) {
          markFilled(o.orderId);
          applyTrade(e.trade);
        }
      });
    };

    const onAck = (e: OrderAck) => ackOrder(e);
    const onReject = (e: OrderReject) => {
      console.warn("[gateway] ORDER_REJECT:", e.reason);
    };
    const onCancelled = (e: OrderCancelled) => storeCancelOrder(e);

    if (socket.connected) {
      setConnected(true);
      socket.emit("subscribe", { symbol });
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("BOOK_SNAPSHOT", onSnapshot);
    socket.on("TRADE_EXECUTED", onTrade);
    socket.on("ORDER_ACK", onAck);
    socket.on("ORDER_REJECT", onReject);
    socket.on("ORDER_CANCELLED", onCancelled);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("BOOK_SNAPSHOT", onSnapshot);
      socket.off("TRADE_EXECUTED", onTrade);
      socket.off("ORDER_ACK", onAck);
      socket.off("ORDER_REJECT", onReject);
      socket.off("ORDER_CANCELLED", onCancelled);
      socket.emit("unsubscribe", { symbol });
    };
  }, [
    symbol,
    setConnected,
    setOrderBook,
    addTrade,
    addPriceTick,
    ackOrder,
    storeCancelOrder,
    markFilled,
    applyTrade,
  ]);

  const submitOrder = useCallback(
    (
      side: "BUY" | "SELL",
      type: "LIMIT" | "MARKET" | "IOC" | "FOK",
      price: number,
      quantity: number
    ) => {
      const clientOrderId = `c-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const payload: SubmitOrderPayload = {
        clientOrderId,
        userId: "demo-user",
        symbol: symbolRef.current,
        side,
        type,
        price,
        quantity,
      };

      // Optimistically add to open orders
      addOpenOrder({
        orderId: "",
        clientOrderId,
        symbol: symbolRef.current,
        side,
        type,
        price,
        quantity,
        remainingQuantity: quantity,
        status: "OPEN",
        timestamp: Date.now(),
      });

      socketRef.current?.emit("order:submit", payload);
      return clientOrderId;
    },
    [addOpenOrder]
  );

  const cancelOrder = useCallback((orderId: string) => {
    const payload: CancelOrderPayload = {
      orderId,
      userId: "demo-user",
      symbol: symbolRef.current,
    };
    socketRef.current?.emit("order:cancel", payload);
  }, []);

  return { submitOrder, cancelOrder };
}
