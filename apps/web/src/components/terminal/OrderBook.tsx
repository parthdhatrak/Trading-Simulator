"use client";
import React, { useMemo } from "react";
import { useTradingStore } from "@/lib/tradingStore";
import { motion, AnimatePresence } from "framer-motion";

const MAX_LEVELS = 8;

export default function OrderBook() {
  const orderBook = useTradingStore((s) => s.orderBook);
  const connected = useTradingStore((s) => s.connected);
  const symbol = useTradingStore((s) => s.activeSymbol);

  const bids = useMemo(() => (orderBook?.bids ?? []).slice(0, MAX_LEVELS), [orderBook]);
  const asks = useMemo(() => (orderBook?.asks ?? []).slice(0, MAX_LEVELS), [orderBook]);

  const bestBid = bids[0]?.price ?? 0;
  const bestAsk = asks[0]?.price ?? 0;
  const spread = bestAsk > 0 && bestBid > 0 ? (bestAsk - bestBid).toFixed(2) : "—";
  const spreadPct = bestBid > 0 ? (((bestAsk - bestBid) / bestBid) * 100).toFixed(3) : "—";
  const midPrice = bestBid > 0 ? ((bestAsk + bestBid) / 2).toFixed(2) : "—";

  const maxBidQty = Math.max(...bids.map((b) => b.quantity), 1);
  const maxAskQty = Math.max(...asks.map((a) => a.quantity), 1);

  return (
    <div className="glass-panel rounded-2xl flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-semibold text-slate-300 tracking-widest uppercase">
            Order Book
          </span>
          <span className="text-[10px] font-mono text-slate-500">{symbol}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-emerald-400 animate-pulse" : "bg-slate-600"}`} />
          <span className="text-[10px] font-mono text-slate-500">{connected ? "LIVE" : "OFFLINE"}</span>
        </div>
      </div>

      {/* Column labels */}
      <div className="grid grid-cols-3 px-4 py-1.5 text-[10px] font-mono text-slate-600 uppercase tracking-wider border-b border-white/5">
        <span>Price</span>
        <span className="text-right">Size</span>
        <span className="text-right">Total</span>
      </div>

      {/* Asks — shown reversed (highest at top, best ask at bottom before spread) */}
      <div className="flex-1 flex flex-col justify-end px-2 py-1 gap-[2px] overflow-hidden">
        <AnimatePresence initial={false}>
          {[...asks].reverse().map((ask) => {
            const pct = Math.min((ask.quantity / maxAskQty) * 100, 100);
            return (
              <motion.div
                key={ask.price}
                layout
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="relative flex items-center justify-between py-[3px] px-2 rounded text-[11px] font-mono group"
              >
                <div
                  className="absolute right-0 top-0 bottom-0 bg-red-500/10 rounded transition-all duration-300"
                  style={{ width: `${pct}%` }}
                />
                <span className="relative text-red-400 font-semibold glow-text-red tabular-nums">
                  {ask.price.toFixed(2)}
                </span>
                <span className="relative text-slate-300 tabular-nums">{ask.quantity.toLocaleString()}</span>
                <span className="relative text-slate-500 tabular-nums text-right">
                  {(ask.price * ask.quantity).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Spread bar */}
      <div className="px-4 py-2 bg-white/[0.03] border-y border-white/5 flex items-center justify-between font-mono text-[11px]">
        <span className="text-slate-500">Spread</span>
        <span className="text-blue-400 font-semibold">${spread}</span>
        <span className="text-slate-600">{spreadPct}%</span>
        <span className="text-slate-400">Mid <span className="text-white font-bold">${midPrice}</span></span>
      </div>

      {/* Bids */}
      <div className="flex-1 flex flex-col px-2 py-1 gap-[2px] overflow-hidden">
        <AnimatePresence initial={false}>
          {bids.map((bid) => {
            const pct = Math.min((bid.quantity / maxBidQty) * 100, 100);
            return (
              <motion.div
                key={bid.price}
                layout
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="relative flex items-center justify-between py-[3px] px-2 rounded text-[11px] font-mono group"
              >
                <div
                  className="absolute left-0 top-0 bottom-0 bg-emerald-500/10 rounded transition-all duration-300"
                  style={{ width: `${pct}%` }}
                />
                <span className="relative text-emerald-400 font-semibold glow-text-green tabular-nums">
                  {bid.price.toFixed(2)}
                </span>
                <span className="relative text-slate-300 tabular-nums">{bid.quantity.toLocaleString()}</span>
                <span className="relative text-slate-500 tabular-nums text-right">
                  {(bid.price * bid.quantity).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
