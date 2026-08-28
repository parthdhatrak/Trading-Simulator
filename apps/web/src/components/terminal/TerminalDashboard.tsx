"use client";

import React from "react";
import { useTradingStore } from "@/lib/tradingStore";
import { useGateway } from "@/lib/useGateway";
import Chart from "./Chart";
import OrderForm from "./OrderForm";
import OrderBook from "./OrderBook";
import TradeTape from "./TradeTape";
import PositionsPanel from "./PositionsPanel";
import { Radio } from "lucide-react";

export default function TerminalDashboard() {
  const symbol = useTradingStore((s) => s.activeSymbol);
  const setActiveSymbol = useTradingStore((s) => s.setActiveSymbol);
  const connected = useTradingStore((s) => s.connected);
  const trades = useTradingStore((s) => s.trades);

  // Initialize the Socket.io gateway subscriptions for this symbol
  useGateway(symbol);

  // Get current market price info from trades
  const lastTradePrice = trades[0]?.price;
  const prevTradePrice = trades[1]?.price;
  const isUp = lastTradePrice && prevTradePrice ? lastTradePrice >= prevTradePrice : true;

  const handleSymbolChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setActiveSymbol(e.target.value);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Top Telemetry Header Bar */}
      <div className="glass-panel rounded-2xl px-6 py-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 shadow-lg border border-white/5">
        {/* Left Section: Logo & Selector */}
        <div className="flex flex-wrap items-center gap-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center font-bold font-mono text-white text-base shadow-lg shadow-indigo-500/25">
              Ω
            </div>
            <div>
              <h2 className="text-sm font-bold font-sans tracking-wide text-slate-100 uppercase">
                ApeX Terminal
              </h2>
              <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">
                Exchange Sandbox
              </span>
            </div>
          </div>

          <div className="h-6 w-[1px] bg-white/5 hidden md:block" />

          {/* Symbol Select Input */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
              Asset
            </span>
            <select
              value={symbol}
              onChange={handleSymbolChange}
              className="bg-slate-900 border border-white/10 hover:border-slate-500 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
            >
              {["AAPL", "MSFT", "TSLA", "BTC"].map((sym) => (
                <option key={sym} value={sym} className="bg-slate-950 font-mono">
                  {sym} / USD
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Right Section: Pricing Metrics & Node Server Connection status */}
        <div className="flex flex-wrap items-center justify-between md:justify-end gap-6 border-t md:border-t-0 border-white/5 pt-3 md:pt-0">
          {/* Last Price telemetry */}
          <div className="flex items-center gap-2 font-mono">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">Last Trade</span>
            <span className={`text-base font-bold transition-all duration-300 ${
              lastTradePrice
                ? isUp
                  ? "text-emerald-400 glow-text-green"
                  : "text-red-400 glow-text-red"
                : "text-slate-500"
            }`}>
              {lastTradePrice ? `$${lastTradePrice.toFixed(2)}` : "—"}
            </span>
            {lastTradePrice && (
              <span className={`text-[10px] ${isUp ? "text-emerald-400" : "text-red-400"}`}>
                {isUp ? "▲" : "▼"}
              </span>
            )}
          </div>

          <div className="h-6 w-[1px] bg-white/5 hidden sm:block" />

          {/* WebSocket state display */}
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-mono font-semibold transition-all ${
              connected
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : "bg-red-500/10 border-red-500/30 text-red-400 animate-pulse"
            }`}>
              <Radio className={`w-3.5 h-3.5 ${connected ? "animate-pulse" : ""}`} />
              <span>{connected ? "NODE GATEWAY ONLINE" : "DISCONNECTED"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Terminal Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Panel: Chart & Positions (Col Span 8) */}
        <div className="lg:col-span-8 flex flex-col gap-6 w-full">
          <div className="h-[310px] w-full">
            <Chart />
          </div>
          <div className="w-full">
            <PositionsPanel />
          </div>
        </div>

        {/* Right Panel: Order Ticket, Order Book, Trade Tape (Col Span 4) */}
        <div className="lg:col-span-4 flex flex-col gap-6 w-full">
          <div className="w-full">
            <OrderForm />
          </div>
          <div className="h-[340px] w-full">
            <OrderBook />
          </div>
          <div className="w-full">
            <TradeTape />
          </div>
        </div>
      </div>
    </div>
  );
}
