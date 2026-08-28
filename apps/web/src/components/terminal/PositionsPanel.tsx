"use client";

import React, { useState } from "react";
import { useTradingStore } from "@/lib/tradingStore";
import { useGateway } from "@/lib/useGateway";
import { XCircle, Briefcase, FileText, History } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function PositionsPanel() {
  const symbol = useTradingStore((s) => s.activeSymbol);
  const positions = useTradingStore((s) => s.positions);
  const openOrders = useTradingStore((s) => s.openOrders);
  const trades = useTradingStore((s) => s.trades);
  const { cancelOrder } = useGateway(symbol);

  const [activeTab, setActiveTab] = useState<"positions" | "active" | "history">("positions");

  // Get current market price from latest trade
  const currentPrice = trades[0]?.price ?? 150.00;

  // Retrieve position for active symbol
  const activePosition = positions.get(symbol) ?? {
    symbol,
    qty: 0,
    avgPrice: 0,
    realizedPnL: 0,
  };

  // Compute P&Ls
  const isLong = activePosition.qty > 0;
  const unrealizedPnL = activePosition.qty !== 0
    ? (currentPrice - activePosition.avgPrice) * activePosition.qty
    : 0;
  
  // Filter active and completed/cancelled orders
  const restingOrders = openOrders.filter((o) => o.status === "OPEN" && o.symbol === symbol);
  const historyOrders = openOrders.filter((o) => o.status !== "OPEN" && o.symbol === symbol);

  return (
    <div className="glass-panel rounded-2xl flex flex-col h-[280px] overflow-hidden shadow-xl">
      {/* Tabs Selector */}
      <div className="flex border-b border-white/5 bg-slate-950/20 px-4 py-2 justify-between items-center">
        <div className="flex gap-4">
          {[
            { id: "positions", label: "Positions", icon: Briefcase },
            { id: "active", label: `Active (${restingOrders.length})`, icon: FileText },
            { id: "history", label: "History", icon: History },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as "positions" | "active" | "history")}
                className={`flex items-center gap-1.5 py-1.5 text-xs font-mono tracking-wider transition-all relative ${
                  activeTab === tab.id
                    ? "text-blue-400 font-semibold"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="active-tab-indicator"
                    className="absolute bottom-[-9px] left-0 right-0 h-[2px] bg-blue-500"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>
        <span className="text-[10px] font-mono text-slate-500 hidden sm:inline">Portfolio Audit</span>
      </div>

      {/* Tabs Content */}
      <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-white/10">
        <AnimatePresence mode="wait">
          {activeTab === "positions" && (
            <motion.div
              key="positions"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="h-full flex flex-col justify-center"
            >
              {activePosition.qty === 0 ? (
                <div className="text-center py-6 text-xs font-mono text-slate-500">
                  No active position in {symbol}. Submit an order to trade.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono text-xs">
                  {/* Position Qty */}
                  <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 flex flex-col gap-1">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider">Position Size</span>
                    <span className={`text-base font-bold ${isLong ? "text-emerald-400" : "text-red-400"}`}>
                      {isLong ? "+" : ""}{activePosition.qty.toLocaleString()} shares
                    </span>
                    <span className="text-[9px] text-slate-400">
                      {isLong ? "LONG" : "SHORT"}
                    </span>
                  </div>

                  {/* Avg Entry Price */}
                  <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 flex flex-col gap-1">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider">Avg Cost</span>
                    <span className="text-base font-bold text-slate-200">
                      ${activePosition.avgPrice.toFixed(2)}
                    </span>
                    <span className="text-[9px] text-slate-500">Execution base</span>
                  </div>

                  {/* Unrealized PnL */}
                  <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 flex flex-col gap-1">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider">Unrealized P&L</span>
                    <span className={`text-base font-bold ${
                      unrealizedPnL >= 0 ? "text-emerald-400 glow-text-green" : "text-red-400 glow-text-red"
                    }`}>
                      {unrealizedPnL >= 0 ? "+" : ""}${unrealizedPnL.toFixed(2)}
                    </span>
                    <span className="text-[9px] text-slate-500">Market value float</span>
                  </div>

                  {/* Realized PnL */}
                  <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 flex flex-col gap-1">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider">Realized P&L</span>
                    <span className={`text-base font-bold ${
                      activePosition.realizedPnL >= 0 ? "text-emerald-400" : "text-red-400"
                    }`}>
                      {activePosition.realizedPnL >= 0 ? "+" : ""}${activePosition.realizedPnL.toFixed(2)}
                    </span>
                    <span className="text-[9px] text-slate-500">Booked profits</span>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "active" && (
            <motion.div
              key="active"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="space-y-2 h-full"
            >
              {restingOrders.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs font-mono text-slate-500">
                  No active resting limit orders in the book.
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="grid grid-cols-6 px-3 py-1 text-[9px] font-mono text-slate-600 uppercase tracking-wider">
                    <span>Side</span>
                    <span>Type</span>
                    <span className="text-right">Price</span>
                    <span className="text-right">Size</span>
                    <span className="text-right">Time</span>
                    <span className="text-right">Action</span>
                  </div>
                  {restingOrders.map((order) => {
                    const sideColor = order.side === "BUY" ? "text-emerald-400 bg-emerald-500/10" : "text-red-400 bg-red-500/10";
                    return (
                      <div
                        key={order.clientOrderId}
                        className="grid grid-cols-6 items-center px-3 py-2 bg-white/[0.02] border border-white/5 rounded-xl text-xs font-mono"
                      >
                        <div>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${sideColor}`}>
                            {order.side}
                          </span>
                        </div>
                        <span className="text-slate-400">{order.type}</span>
                        <span className="text-right text-slate-200">${order.price.toFixed(2)}</span>
                        <span className="text-right text-slate-200">{order.quantity}</span>
                        <span className="text-right text-slate-500">
                          {new Date(order.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        <div className="flex justify-end">
                          <button
                            onClick={() => cancelOrder(order.orderId)}
                            disabled={!order.orderId}
                            className="flex items-center gap-1 text-[10px] bg-red-500/10 hover:bg-red-500/20 text-red-400 px-2 py-1 rounded transition-colors disabled:opacity-30"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Cancel</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "history" && (
            <motion.div
              key="history"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="space-y-2 h-full"
            >
              {historyOrders.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs font-mono text-slate-500">
                  Order history empty. Submit orders to view log.
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="grid grid-cols-5 px-3 py-1 text-[9px] font-mono text-slate-600 uppercase tracking-wider">
                    <span>Side</span>
                    <span>Type</span>
                    <span className="text-right">Price</span>
                    <span className="text-right">Size</span>
                    <span className="text-right text-right">Status</span>
                  </div>
                  {historyOrders.map((order) => {
                    const sideColor = order.side === "BUY" ? "text-emerald-400 bg-emerald-500/10" : "text-red-400 bg-red-500/10";
                    const statusColor = order.status === "FILLED"
                      ? "text-emerald-400 bg-emerald-500/5 border border-emerald-500/20"
                      : "text-slate-500 bg-white/5 border border-white/5";
                    return (
                      <div
                        key={order.clientOrderId}
                        className="grid grid-cols-5 items-center px-3 py-1.5 bg-white/[0.01] hover:bg-white/[0.03] rounded-lg text-xs font-mono transition-colors"
                      >
                        <div>
                          <span className={`px-1 py-0.5 rounded text-[9px] font-bold ${sideColor}`}>
                            {order.side}
                          </span>
                        </div>
                        <span className="text-slate-400">{order.type}</span>
                        <span className="text-right text-slate-300">
                          {order.price > 0 ? `$${order.price.toFixed(2)}` : "Market"}
                        </span>
                        <span className="text-right text-slate-300">{order.quantity}</span>
                        <div className="flex justify-end">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${statusColor}`}>
                            {order.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
