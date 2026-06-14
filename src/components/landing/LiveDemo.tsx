"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Play, Pause, RefreshCw, Send, CheckCircle2, TrendingUp, HelpCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Order {
  id: string;
  side: "BUY" | "SELL";
  type: "LIMIT" | "MARKET";
  price: number;
  quantity: number;
  timestamp: number;
}

interface Trade {
  id: string;
  price: number;
  quantity: number;
  side: "BUY" | "SELL";
  timestamp: number;
}

export default function LiveDemo() {
  // Simulator State
  const [bids, setBids] = useState<Order[]>([
    { id: "b1", side: "BUY", type: "LIMIT", price: 182.5, quantity: 150, timestamp: Date.now() - 5000 },
    { id: "b2", side: "BUY", type: "LIMIT", price: 182.2, quantity: 240, timestamp: Date.now() - 4000 },
    { id: "b3", side: "BUY", type: "LIMIT", price: 181.9, quantity: 310, timestamp: Date.now() - 3000 },
    { id: "b4", side: "BUY", type: "LIMIT", price: 181.5, quantity: 180, timestamp: Date.now() - 2000 },
    { id: "b5", side: "BUY", type: "LIMIT", price: 181.0, quantity: 450, timestamp: Date.now() - 1000 },
  ]);

  const [asks, setAsks] = useState<Order[]>([
    { id: "a1", side: "SELL", type: "LIMIT", price: 183.1, quantity: 120, timestamp: Date.now() - 5100 },
    { id: "a2", side: "SELL", type: "LIMIT", price: 183.4, quantity: 180, timestamp: Date.now() - 4100 },
    { id: "a3", side: "SELL", type: "LIMIT", price: 183.8, quantity: 290, timestamp: Date.now() - 3100 },
    { id: "a4", side: "SELL", type: "LIMIT", price: 184.2, quantity: 150, timestamp: Date.now() - 2100 },
    { id: "a5", side: "SELL", type: "LIMIT", price: 184.5, quantity: 380, timestamp: Date.now() - 1100 },
  ]);

  const [trades, setTrades] = useState<Trade[]>([
    { id: "t1", price: 182.8, quantity: 50, side: "BUY", timestamp: Date.now() - 6000 },
    { id: "t2", price: 182.7, quantity: 100, side: "SELL", timestamp: Date.now() - 8000 },
    { id: "t3", price: 182.9, quantity: 10, side: "BUY", timestamp: Date.now() - 10000 },
  ]);

  const [priceHistory, setPriceHistory] = useState<number[]>([182.5, 182.6, 182.5, 182.7, 182.8]);
  const ticker = "AAPL";
  const [lastPrice, setLastPrice] = useState(182.8);
  const [priceDirection, setPriceDirection] = useState<"UP" | "DOWN" | "STABLE">("STABLE");

  // Form State
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [orderType, setOrderType] = useState<"LIMIT" | "MARKET">("LIMIT");
  const [priceInput, setPriceInput] = useState("182.70");
  const [quantityInput, setQuantityInput] = useState("50");
  const [isAutoSim, setIsAutoSim] = useState(true);
  const [notification, setNotification] = useState<string | null>(null);

  // Flash rows when size updates
  const [flashedBids, setFlashedBids] = useState<Record<string, boolean>>({});
  const [flashedAsks, setFlashedAsks] = useState<Record<string, boolean>>({});

  const notificationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const triggerNotification = (text: string) => {
    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current);
    }
    setNotification(text);
    notificationTimeoutRef.current = setTimeout(() => {
      setNotification(null);
    }, 3000);
  };

  // Mini Client-side Order Matching Logic
  const handlePlaceOrder = useCallback((
    orderSide: "BUY" | "SELL",
    type: "LIMIT" | "MARKET",
    price: number,
    qty: number
  ) => {
    let remaining = qty;
    const fills: { price: number; qty: number }[] = [];
    const executionId = Math.random().toString(36).substring(2, 9);

    if (orderSide === "BUY") {
      // Match against asks
      const sortedAsks = [...asks].sort((a, b) => a.price - b.price); // Ascending asks
      const remainingAsks: Order[] = [];

      for (const ask of sortedAsks) {
        if (remaining <= 0) {
          remainingAsks.push(ask);
          continue;
        }

        const match = type === "MARKET" || ask.price <= price;
        if (match) {
          const fillQty = Math.min(remaining, ask.quantity);
          fills.push({ price: ask.price, qty: fillQty });
          remaining -= fillQty;

          if (ask.quantity > fillQty) {
            remainingAsks.push({
              ...ask,
              quantity: ask.quantity - fillQty,
            });
          }
        } else {
          remainingAsks.push(ask);
        }
      }

      setAsks(remainingAsks);

      // Remaining unfilled limit order goes to Bids heap (sorted desc)
      if (remaining > 0 && type === "LIMIT") {
        const newBid: Order = {
          id: `b-${executionId}`,
          side: "BUY",
          type: "LIMIT",
          price,
          quantity: remaining,
          timestamp: Date.now(),
        };
        setBids((prev) => [...prev, newBid].sort((a, b) => b.price - a.price));
        setFlashedBids((prev) => ({ ...prev, [newBid.id]: true }));
        setTimeout(() => {
          setFlashedBids((prev) => ({ ...prev, [newBid.id]: false }));
        }, 800);
      }
    } else {
      // SELL side: Match against bids
      const sortedBids = [...bids].sort((a, b) => b.price - a.price); // Descending bids
      const remainingBids: Order[] = [];

      for (const bid of sortedBids) {
        if (remaining <= 0) {
          remainingBids.push(bid);
          continue;
        }

        const match = type === "MARKET" || bid.price >= price;
        if (match) {
          const fillQty = Math.min(remaining, bid.quantity);
          fills.push({ price: bid.price, qty: fillQty });
          remaining -= fillQty;

          if (bid.quantity > fillQty) {
            remainingBids.push({
              ...bid,
              quantity: bid.quantity - fillQty,
            });
          }
        } else {
          remainingBids.push(bid);
        }
      }

      setBids(remainingBids);

      // Remaining unfilled limit order goes to Asks heap (sorted asc)
      if (remaining > 0 && type === "LIMIT") {
        const newAsk: Order = {
          id: `a-${executionId}`,
          side: "SELL",
          type: "LIMIT",
          price,
          quantity: remaining,
          timestamp: Date.now(),
        };
        setAsks((prev) => [...prev, newAsk].sort((a, b) => a.price - b.price));
        setFlashedAsks((prev) => ({ ...prev, [newAsk.id]: true }));
        setTimeout(() => {
          setFlashedAsks((prev) => ({ ...prev, [newAsk.id]: false }));
        }, 800);
      }
    }

    // Process any trade fills
    if (fills.length > 0) {
      const lastFillPrice = fills[fills.length - 1].price;
      setPriceDirection((prev) => {
        if (lastFillPrice > lastPrice) return "UP";
        if (lastFillPrice < lastPrice) return "DOWN";
        return prev;
      });
      setLastPrice(lastFillPrice);
      setPriceHistory((prev) => [...prev.slice(-14), lastFillPrice]);

      const newTrades: Trade[] = fills.map((f, i) => ({
        id: `t-${executionId}-${i}`,
        price: f.price,
        quantity: f.qty,
        side: orderSide,
        timestamp: Date.now(),
      }));

      setTrades((prev) => [...newTrades, ...prev].slice(0, 15));

      const totalFillQty = fills.reduce((sum, f) => sum + f.qty, 0);
      const isCompleteFill = totalFillQty === qty;
      triggerNotification(
        `Matched ${totalFillQty}/${qty} shares at avg price $${lastFillPrice.toFixed(2)} (${
          isCompleteFill ? "Fully Filled" : "Partially Filled"
        })`
      );
    } else {
      if (type === "MARKET") {
        triggerNotification(`Market order cancelled: No counter-party liquidity available.`);
      } else {
        triggerNotification(`Order resting in book: ${qty} shares @ $${price.toFixed(2)}`);
      }
    }
  }, [asks, bids, lastPrice]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(priceInput);
    const qty = parseInt(quantityInput);
    if (isNaN(qty) || qty <= 0) return;
    if (orderType === "LIMIT" && (isNaN(price) || price <= 0)) return;

    handlePlaceOrder(side, orderType, price, qty);
  };

  // Background random order generator simulator
  useEffect(() => {
    if (!isAutoSim) return;

    const interval = setInterval(() => {
      const sides: ("BUY" | "SELL")[] = ["BUY", "SELL"];
      const randSide = sides[Math.floor(Math.random() * 2)];
      const types: ("LIMIT" | "MARKET")[] = ["LIMIT", "MARKET", "LIMIT"];
      const randType = types[Math.floor(Math.random() * 3)];
      
      // Calculate a dynamic spread based on top of book
      const bestBid = bids[0]?.price ?? 182.0;
      const bestAsk = asks[0]?.price ?? 183.0;
      const mid = (bestBid + bestAsk) / 2;

      let price = mid;
      if (randType === "LIMIT") {
        // Place order slightly around the mid price
        const dev = (Math.random() - 0.5) * 1.5;
        price = Number((mid + dev).toFixed(2));
      }

      const qty = Math.floor(Math.random() * 8 + 1) * 10;
      handlePlaceOrder(randSide, randType, price, qty);
    }, 2000);

    return () => clearInterval(interval);
  }, [isAutoSim, bids, asks, handlePlaceOrder]);

  const handleReset = () => {
    setBids([
      { id: "b1", side: "BUY", type: "LIMIT", price: 182.5, quantity: 150, timestamp: Date.now() },
      { id: "b2", side: "BUY", type: "LIMIT", price: 182.2, quantity: 240, timestamp: Date.now() },
      { id: "b3", side: "BUY", type: "LIMIT", price: 181.9, quantity: 310, timestamp: Date.now() },
      { id: "b4", side: "BUY", type: "LIMIT", price: 181.5, quantity: 180, timestamp: Date.now() },
      { id: "b5", side: "BUY", type: "LIMIT", price: 181.0, quantity: 450, timestamp: Date.now() },
    ]);
    setAsks([
      { id: "a1", side: "SELL", type: "LIMIT", price: 183.1, quantity: 120, timestamp: Date.now() },
      { id: "a2", side: "SELL", type: "LIMIT", price: 183.4, quantity: 180, timestamp: Date.now() },
      { id: "a3", side: "SELL", type: "LIMIT", price: 183.8, quantity: 290, timestamp: Date.now() },
      { id: "a4", side: "SELL", type: "LIMIT", price: 184.2, quantity: 150, timestamp: Date.now() },
      { id: "a5", side: "SELL", type: "LIMIT", price: 184.5, quantity: 380, timestamp: Date.now() },
    ]);
    setTrades([
      { id: "t1", price: 182.8, quantity: 50, side: "BUY", timestamp: Date.now() },
      { id: "t2", price: 182.7, quantity: 100, side: "SELL", timestamp: Date.now() },
    ]);
    setPriceHistory([182.5, 182.6, 182.5, 182.7, 182.8]);
    setLastPrice(182.8);
    setPriceDirection("STABLE");
    triggerNotification("Simulator reset to baseline liquidity.");
  };

  // Generate SVG Points for mini line chart
  const minVal = Math.min(...priceHistory) - 0.2;
  const maxVal = Math.max(...priceHistory) + 0.2;
  const range = maxVal - minVal || 1;
  const svgWidth = 350;
  const svgHeight = 120;
  
  const points = priceHistory
    .map((val, idx) => {
      const x = (idx / (priceHistory.length - 1)) * svgWidth;
      const y = svgHeight - ((val - minVal) / range) * svgHeight;
      return `${x},${y}`;
    })
    .join(" ");

  const bestBid = bids[0]?.price ?? 0;
  const bestAsk = asks[0]?.price ?? 0;
  const spread = bestAsk - bestBid > 0 ? Number((bestAsk - bestBid).toFixed(2)) : 0;

  return (
    <section id="live-demo" className="max-w-7xl mx-auto px-6 py-16 scroll-mt-24">
      
      {/* Title & Controls */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 pb-4 border-b border-white/5">
        <div>
          <h2 className="text-2xl font-title font-bold text-white flex items-center gap-2">
            Interactive Matching Sandbox
            <span className="text-xs font-mono font-normal px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Live Engine Client
            </span>
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Test price-time matching rules in real-time. Place custom bids or toggle the matching simulation.
          </p>
        </div>
        
        {/* Controls */}
        <div className="flex items-center gap-3 mt-4 md:mt-0">
          <button
            onClick={() => setIsAutoSim(!isAutoSim)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-mono font-semibold transition-all border ${
              isAutoSim
                ? "bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20"
                : "bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200"
            }`}
          >
            {isAutoSim ? (
              <>
                <Pause className="w-3.5 h-3.5" /> Simulation ON
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" /> Simulation OFF
              </>
            )}
          </button>
          <button
            onClick={handleReset}
            className="p-2.5 rounded-full bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-all"
            title="Reset Simulator"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Grid Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Order book & Chart */}
        <div className="lg:col-span-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            
            {/* Column 1: Order Book Table (md:col-span-7) */}
            <div className="md:col-span-7 glass-panel p-5 rounded-2xl flex flex-col h-[420px]">
              
              {/* Header Info */}
              <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-3 text-xs text-slate-400 font-mono">
                <span>ORDER BOOK depth</span>
                <span className="text-slate-300 font-bold">{ticker} / USD</span>
              </div>

              {/* Asks (Sell Orders - Min-Heap - Top values at bottom for view stack) */}
              <div className="flex-1 flex flex-col justify-end space-y-1.5 font-mono text-xs overflow-hidden mb-3">
                {[...asks]
                  .sort((a, b) => b.price - a.price)
                  .slice(-5)
                  .map((ask) => {
                    const relativeSize = Math.min((ask.quantity / 500) * 100, 100);
                    return (
                      <div
                        key={ask.id}
                        className={`relative flex items-center justify-between py-1 px-2.5 rounded transition-all duration-300 ${
                          flashedAsks[ask.id] ? "bg-red-500/20" : "hover:bg-white/5"
                        }`}
                      >
                        {/* Backdrop fill */}
                        <div
                          className="absolute right-0 top-0 bottom-0 bg-red-500/5 transition-all duration-500"
                          style={{ width: `${relativeSize}%` }}
                        ></div>
                        <span className="relative text-red-400 font-bold glow-text-red">
                          ${ask.price.toFixed(2)}
                        </span>
                        <span className="relative text-slate-300">{ask.quantity}</span>
                        <span className="relative text-slate-500 hidden sm:inline">SELL</span>
                      </div>
                    );
                  })}
              </div>

              {/* Spread / Ticker Middle bar */}
              <div className="py-2.5 px-3 bg-white/5 rounded-xl border border-white/5 flex items-center justify-between font-mono my-1">
                <div className="flex items-center space-x-2">
                  <span
                    className={`text-lg font-bold transition-colors duration-300 ${
                      priceDirection === "UP"
                        ? "text-emerald-400 glow-text-green"
                        : priceDirection === "DOWN"
                        ? "text-red-400 glow-text-red"
                        : "text-slate-300"
                    }`}
                  >
                    ${lastPrice.toFixed(2)}
                  </span>
                  {priceDirection === "UP" && <span className="text-xs text-emerald-400">▲</span>}
                  {priceDirection === "DOWN" && <span className="text-xs text-red-400">▼</span>}
                </div>
                <div className="text-right text-[11px] text-slate-400">
                  Spread: <span className="text-blue-400 font-semibold">${spread.toFixed(2)}</span>
                </div>
              </div>

              {/* Bids (Buy Orders - Max-Heap - Top values first) */}
              <div className="flex-1 flex flex-col justify-start space-y-1.5 font-mono text-xs overflow-hidden mt-3">
                {[...bids]
                  .sort((a, b) => b.price - a.price)
                  .slice(0, 5)
                  .map((bid) => {
                    const relativeSize = Math.min((bid.quantity / 500) * 100, 100);
                    return (
                      <div
                        key={bid.id}
                        className={`relative flex items-center justify-between py-1 px-2.5 rounded transition-all duration-300 ${
                          flashedBids[bid.id] ? "bg-emerald-500/20" : "hover:bg-white/5"
                        }`}
                      >
                        {/* Backdrop fill */}
                        <div
                          className="absolute left-0 top-0 bottom-0 bg-emerald-500/5 transition-all duration-500"
                          style={{ width: `${relativeSize}%` }}
                        ></div>
                        <span className="relative text-emerald-400 font-bold glow-text-green">
                          ${bid.price.toFixed(2)}
                        </span>
                        <span className="relative text-slate-300">{bid.quantity}</span>
                        <span className="relative text-slate-500 hidden sm:inline">BUY</span>
                      </div>
                    );
                  })}
              </div>

            </div>

            {/* Column 2: Mini Chart & Statistics (md:col-span-5) */}
            <div className="md:col-span-5 flex flex-col gap-6">
              
              {/* Mini Chart */}
              <div className="glass-panel p-5 rounded-2xl flex-1 flex flex-col h-[200px]">
                <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
                  <span className="flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5 text-blue-400" /> Real-time Price Line
                  </span>
                  <span className="text-slate-500">Ticks</span>
                </div>
                <div className="flex-1 w-full bg-slate-950/40 border border-white/5 rounded-xl overflow-hidden p-2 flex items-center justify-center relative">
                  <svg className="w-full h-full overflow-visible" viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
                    <defs>
                      <linearGradient id="chart-glow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    {/* Grid lines */}
                    <line x1="0" y1={svgHeight/3} x2={svgWidth} y2={svgHeight/3} stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                    <line x1="0" y1={svgHeight*2/3} x2={svgWidth} y2={svgHeight*2/3} stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                    
                    {/* Shadow Area */}
                    <path
                      d={`M 0,${svgHeight} L ${points} L ${svgWidth},${svgHeight} Z`}
                      fill="url(#chart-glow)"
                    />
                    
                    {/* Line */}
                    <motion.polyline
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="2.5"
                      points={points}
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.5 }}
                    />
                    
                    {/* Last dot */}
                    {priceHistory.length > 0 && (
                      <circle
                        cx={svgWidth}
                        cy={svgHeight - ((priceHistory[priceHistory.length - 1] - minVal) / range) * svgHeight}
                        r="4"
                        fill="#60a5fa"
                        className="animate-ping"
                      />
                    )}
                  </svg>
                </div>
              </div>

              {/* Statistics Card */}
              <div className="glass-panel p-5 rounded-2xl flex-1 flex flex-col justify-between h-[194px] font-mono text-xs">
                <div className="pb-2 border-b border-white/5 text-slate-400 flex items-center justify-between">
                  <span>ENGINE TELEMETRY</span>
                  <HelpCircle className="w-4 h-4 text-slate-600 hover:text-slate-400 cursor-pointer" />
                </div>
                <div className="space-y-3 py-2 flex-1 flex flex-col justify-center">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Matching Mode:</span>
                    <span className="text-slate-300 font-semibold">FIFO Price-Time</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Bid Heap depth:</span>
                    <span className="text-emerald-400 font-semibold">{bids.length} orders</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Ask Heap depth:</span>
                    <span className="text-red-400 font-semibold">{asks.length} orders</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-white/5 pt-2">
                    <span className="text-slate-400">Total Fills Count:</span>
                    <span className="text-blue-400 font-bold">{trades.length} matched</span>
                  </div>
                </div>
              </div>

            </div>

          </div>
        </div>

        {/* Right Side: Order input form & Trade Tape (lg:col-span-4) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Order Placement Form */}
          <div className="glass-panel p-5 rounded-2xl">
            <h3 className="text-sm font-title font-bold text-white mb-4 flex items-center justify-between">
              Submit Order
              <span className="text-[10px] font-mono font-normal text-slate-500">Simulated Account</span>
            </h3>
            
            <form onSubmit={handleFormSubmit} className="space-y-4">
              
              {/* Buy/Sell Side Toggle */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950/60 rounded-lg border border-white/5">
                <button
                  type="button"
                  onClick={() => setSide("BUY")}
                  className={`py-2 rounded-md text-xs font-bold font-mono transition-all ${
                    side === "BUY"
                      ? "bg-emerald-500 text-slate-950 font-extrabold shadow-md shadow-emerald-500/10"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  BUY
                </button>
                <button
                  type="button"
                  onClick={() => setSide("SELL")}
                  className={`py-2 rounded-md text-xs font-bold font-mono transition-all ${
                    side === "SELL"
                      ? "bg-red-500 text-white font-extrabold shadow-md shadow-red-500/10"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  SELL
                </button>
              </div>

              {/* Order Type Selector */}
              <div>
                <label className="block text-[10px] uppercase font-mono text-slate-500 mb-1.5">Order Type</label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950/60 rounded-lg border border-white/5">
                  <button
                    type="button"
                    onClick={() => setOrderType("LIMIT")}
                    className={`py-1.5 rounded-md text-xs font-mono transition-all ${
                      orderType === "LIMIT"
                        ? "bg-slate-800 text-slate-100 font-semibold border border-white/5"
                        : "text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    LIMIT
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderType("MARKET")}
                    className={`py-1.5 rounded-md text-xs font-mono transition-all ${
                      orderType === "MARKET"
                        ? "bg-slate-800 text-slate-100 font-semibold border border-white/5"
                        : "text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    MARKET
                  </button>
                </div>
              </div>

              {/* Quantity Input */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="qty-input" className="block text-[10px] uppercase font-mono text-slate-500 mb-1">Quantity</label>
                  <input
                    id="qty-input"
                    type="number"
                    min="1"
                    step="1"
                    value={quantityInput}
                    onChange={(e) => setQuantityInput(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950/60 border border-white/5 rounded-lg text-sm font-mono text-white focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                
                {/* Price Input (Disabled for Market) */}
                <div>
                  <label htmlFor="price-input" className="block text-[10px] uppercase font-mono text-slate-500 mb-1">
                    Price (USD)
                  </label>
                  <input
                    id="price-input"
                    type="number"
                    min="0.01"
                    step="0.01"
                    disabled={orderType === "MARKET"}
                    value={orderType === "MARKET" ? "" : priceInput}
                    onChange={(e) => setPriceInput(e.target.value)}
                    placeholder="Market"
                    className="w-full px-3 py-2 bg-slate-950/60 border border-white/5 disabled:opacity-40 disabled:hover:border-white/5 rounded-lg text-sm font-mono text-white focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              {/* Execute / Send Button */}
              <button
                type="submit"
                className={`w-full py-3 rounded-xl text-xs font-bold font-mono transition-all flex items-center justify-center gap-2 border ${
                  side === "BUY"
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                    : "bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20"
                }`}
              >
                <Send className="w-3.5 h-3.5" /> Submit {side} {orderType} Order
              </button>

            </form>

            {/* Toast/Notification container inside card */}
            <AnimatePresence>
              {notification && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-4 p-3 bg-white/5 border border-blue-500/20 rounded-xl flex items-start gap-2.5"
                >
                  <CheckCircle2 className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                  <span className="text-[11px] font-mono text-slate-300 leading-relaxed">
                    {notification}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

          </div>

          {/* Trade Tape (Scrolling Trades history) */}
          <div className="glass-panel p-5 rounded-2xl flex flex-col h-[230px]">
            <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-3 text-xs text-slate-400 font-mono">
              <span>TRADE TAPE</span>
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-ping"></span>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 font-mono text-[11px] scrollbar-thin scrollbar-thumb-white/10">
              <AnimatePresence initial={false}>
                {trades.map((trade) => (
                  <motion.div
                    key={trade.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center justify-between py-1 border-b border-white/5 last:border-b-0"
                  >
                    <span className="text-slate-500">
                      {new Date(trade.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </span>
                    <span className="text-slate-300 font-semibold">{ticker}</span>
                    <span className={trade.side === "BUY" ? "text-emerald-400" : "text-red-400"}>
                      {trade.side === "BUY" ? "BUY" : "SELL"}
                    </span>
                    <span className="text-slate-300 font-bold">{trade.quantity}</span>
                    <span className="text-slate-200">${trade.price.toFixed(2)}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

        </div>

      </div>

    </section>
  );
}
