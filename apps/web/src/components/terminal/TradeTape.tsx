"use client";

import React from "react";
import { useTradingStore } from "@/lib/tradingStore";
import { motion, AnimatePresence } from "framer-motion";

export default function TradeTape() {
  const trades = useTradingStore((s) => s.trades);

  return (
    <div className="glass-panel rounded-2xl flex flex-col h-[240px] overflow-hidden shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <span className="text-xs font-mono font-semibold text-slate-300 tracking-widest uppercase">
          Trade Tape
        </span>
        <span className="text-[10px] font-mono text-slate-500">Live Executions</span>
      </div>

      {/* Columns Header */}
      <div className="grid grid-cols-4 px-4 py-1.5 text-[9px] font-mono text-slate-600 uppercase tracking-wider border-b border-white/5 bg-white/[0.01]">
        <span>Time</span>
        <span className="text-right">Price</span>
        <span className="text-right">Qty</span>
        <span className="text-right">Total</span>
      </div>

      {/* Scrolling Tape */}
      <div className="flex-1 overflow-y-auto px-2 py-1 space-y-1.5 scrollbar-thin scrollbar-thumb-white/10">
        <AnimatePresence initial={false}>
          {trades.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs font-mono text-slate-600">
              Waiting for trade executions...
            </div>
          ) : (
            trades.map((trade) => {
              const formattedTime = new Date(trade.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              });
              const sideColor = trade.aggressorSide === "BUY" ? "text-emerald-400 font-bold glow-text-green" : "text-red-400 font-bold glow-text-red";
              
              return (
                <motion.div
                  key={trade.id}
                  initial={{ opacity: 0, y: -4, scaleY: 0.9 }}
                  animate={{ opacity: 1, y: 0, scaleY: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="grid grid-cols-4 px-2 py-1 hover:bg-white/[0.03] rounded text-[11px] font-mono transition-colors"
                >
                  <span className="text-slate-500">{formattedTime}</span>
                  <span className={`text-right tabular-nums ${sideColor}`}>
                    ${trade.price.toFixed(2)}
                  </span>
                  <span className="text-right text-slate-300 tabular-nums">
                    {trade.quantity.toLocaleString()}
                  </span>
                  <span className="text-right text-slate-500 tabular-nums">
                    {(trade.price * trade.quantity).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
