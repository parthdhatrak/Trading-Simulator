"use client";

import React, { useState } from "react";
import { useTradingStore } from "@/lib/tradingStore";
import { useGateway } from "@/lib/useGateway";
import { Send, Wallet } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function OrderForm() {
  const symbol = useTradingStore((s) => s.activeSymbol);
  const connected = useTradingStore((s) => s.connected);
  const { submitOrder } = useGateway(symbol);

  // Form state
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [type, setType] = useState<"LIMIT" | "MARKET" | "IOC" | "FOK">("LIMIT");
  const [priceInput, setPriceInput] = useState("150.00");
  const [qtyInput, setQtyInput] = useState("10");

  // Telemetry or local UI state
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Hardcoded mockup account balances for high fidelity
  const mockUSD = 100000;
  const mockPositionQty = 150; // Mock current portfolio stock holding

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!connected) {
      setFeedback({ type: "error", text: "Offline: Cannot submit order to matching engine." });
      return;
    }

    const qty = parseInt(qtyInput);
    const price = type === "MARKET" ? 0 : parseFloat(priceInput);

    if (isNaN(qty) || qty <= 0) {
      setFeedback({ type: "error", text: "Invalid quantity: must be greater than 0." });
      return;
    }

    if (type !== "MARKET" && (isNaN(price) || price <= 0)) {
      setFeedback({ type: "error", text: "Invalid limit price: must be greater than 0." });
      return;
    }

    try {
      const clientOrderId = submitOrder(side, type, price, qty);
      setFeedback({
        type: "success",
        text: `Submitted ${side} ${type} order (${qty} shares${type !== "MARKET" ? ` @ $${price.toFixed(2)}` : ""}). Client ID: ${clientOrderId.slice(-6)}`,
      });
      // Clear inputs
      if (type === "MARKET") {
        setQtyInput("");
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Failed to submit order.";
      setFeedback({ type: "error", text: errMsg });
    }
  };

  // Calculate total order value (notional)
  const qty = parseFloat(qtyInput) || 0;
  const price = type === "MARKET" ? 150 : parseFloat(priceInput) || 0; // fallback to mock price for market notional estimate
  const estimatedNotional = qty * price;

  const handlePercentageClick = (pct: number) => {
    // If Buying, percentage of mock USD balance
    // If Selling, percentage of mock stock position
    if (side === "BUY") {
      const targetSpend = mockUSD * pct;
      const targetQty = Math.floor(targetSpend / price);
      setQtyInput(targetQty > 0 ? targetQty.toString() : "1");
    } else {
      const targetQty = Math.floor(mockPositionQty * pct);
      setQtyInput(targetQty > 0 ? targetQty.toString() : "1");
    }
  };

  return (
    <div className="w-full bg-slate-950/45 backdrop-blur-xl border border-white/5 rounded-2xl p-5 relative overflow-hidden flex flex-col gap-4 shadow-xl">
      <div className={`absolute inset-0 bg-gradient-to-br transition-opacity duration-500 pointer-events-none ${
        side === "BUY" ? "from-emerald-500/5" : "from-red-500/5"
      } to-transparent`} />
      
      {/* Title */}
      <div className="relative flex items-center justify-between border-b border-white/5 pb-3">
        <h3 className="text-sm font-semibold tracking-wider font-mono text-slate-200 uppercase">
          Submit Order
        </h3>
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
          <Wallet className="w-3.5 h-3.5 text-blue-400" />
          <span>${mockUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="relative flex flex-col gap-4">
        {/* BUY/SELL Selector */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950/70 border border-white/5 rounded-xl">
          <button
            type="button"
            onClick={() => setSide("BUY")}
            className={`py-2 text-xs font-mono font-bold rounded-lg transition-all ${
              side === "BUY"
                ? "bg-emerald-500 text-slate-950 font-extrabold shadow-lg shadow-emerald-500/20"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            BUY
          </button>
          <button
            type="button"
            onClick={() => setSide("SELL")}
            className={`py-2 text-xs font-mono font-bold rounded-lg transition-all ${
              side === "SELL"
                ? "bg-red-500 text-white font-extrabold shadow-lg shadow-red-500/20"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            SELL
          </button>
        </div>

        {/* Order Type Tabs */}
        <div>
          <label className="block text-[10px] uppercase font-mono tracking-wider text-slate-500 mb-1.5">
            Execution Rules
          </label>
          <div className="grid grid-cols-4 gap-1 p-1 bg-slate-950/70 border border-white/5 rounded-xl">
            {(["LIMIT", "MARKET", "IOC", "FOK"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`py-1 text-[10px] font-mono rounded transition-all ${
                  type === t
                    ? "bg-slate-800 text-slate-200 border border-white/5 font-semibold"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-2 gap-3">
          {/* Quantity Input */}
          <div>
            <label className="block text-[10px] uppercase font-mono tracking-wider text-slate-500 mb-1">
              Quantity
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={qtyInput}
              onChange={(e) => setQtyInput(e.target.value)}
              placeholder="Size"
              className="w-full px-3 py-2.5 bg-slate-950/60 border border-white/5 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Limit Price Input */}
          <div>
            <label className="block text-[10px] uppercase font-mono tracking-wider text-slate-500 mb-1">
              {type === "MARKET" ? "Price (Market)" : "Limit Price"}
            </label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              disabled={type === "MARKET"}
              value={type === "MARKET" ? "" : priceInput}
              onChange={(e) => setPriceInput(e.target.value)}
              placeholder="Market Order"
              className="w-full px-3 py-2.5 bg-slate-950/60 border border-white/5 disabled:opacity-30 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        </div>

        {/* Quick Percent Buttons */}
        <div className="flex justify-between items-center gap-1.5">
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Quick Fill:</span>
          <div className="flex gap-1">
            {[0.1, 0.25, 0.5, 1.0].map((pct) => (
              <button
                key={pct}
                type="button"
                onClick={() => handlePercentageClick(pct)}
                className="px-2 py-1 text-[9px] font-mono bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 border border-white/5 rounded transition-all"
              >
                {pct === 1.0 ? "MAX" : `${pct * 100}%`}
              </button>
            ))}
          </div>
        </div>

        {/* Estimated Value */}
        <div className="bg-white/[0.02] border border-white/5 rounded-xl px-4 py-2.5 flex items-center justify-between text-[11px] font-mono">
          <span className="text-slate-500">Est. Total Notional</span>
          <span className="text-slate-300 font-bold">
            ${estimatedNotional.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
          </span>
        </div>

        {/* Action Button */}
        <button
          type="submit"
          className={`w-full py-3 rounded-xl text-xs font-bold font-mono transition-all flex items-center justify-center gap-2 border ${
            side === "BUY"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
              : "bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20"
          }`}
        >
          <Send className="w-3.5 h-3.5" /> Submit {side} {type}
        </button>
      </form>

      {/* Local notification messages */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`p-3 border rounded-xl flex items-start gap-2 text-[10px] font-mono leading-relaxed ${
              feedback.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                : "bg-red-500/10 border-red-500/20 text-red-400"
            }`}
          >
            <span className="flex-shrink-0 mt-0.5">{feedback.type === "success" ? "✓" : "⚠"}</span>
            <span>{feedback.text}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
