"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useTradingStore } from "@/lib/tradingStore";
import { TrendingUp } from "lucide-react";

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Generate starting mock history to populate chart instantly
const generateInitialCandles = (basePrice: number = 150): Candle[] => {
  const candles: Candle[] = [];
  let price = basePrice;
  let time = Date.now() - 40 * 5000; // 40 periods back, 5s each
  
  for (let i = 0; i < 40; i++) {
    const open = price;
    const change = (Math.random() - 0.48) * 1.8; // slight upward drift
    const close = Number((price + change).toFixed(2));
    const high = Number((Math.max(open, close) + Math.random() * 0.4).toFixed(2));
    const low = Number((Math.min(open, close) - Math.random() * 0.4).toFixed(2));
    const volume = Math.floor(Math.random() * 80 + 10) * 10;
    
    candles.push({ time, open, high, low, close, volume });
    price = close;
    time += 5000;
  }
  return candles;
};

export default function Chart() {
  const trades = useTradingStore((s) => s.trades);
  const activeSymbol = useTradingStore((s) => s.activeSymbol);
  
  const [candles, setCandles] = useState<Candle[]>([]);
  const lastProcessedTradeId = useRef<string | null>(null);

  // Initialize candles on mount or symbol change
  useEffect(() => {
    const base = activeSymbol === "BTC" ? 62000 : activeSymbol === "TSLA" ? 220 : 150;
    setCandles(generateInitialCandles(base));
  }, [activeSymbol]);

  // Aggregate incoming live trades into the 5s candles
  useEffect(() => {
    if (trades.length === 0) return;
    const latestTrade = trades[0];
    
    // Avoid double processing the same trade
    if (latestTrade.id === lastProcessedTradeId.current) return;
    lastProcessedTradeId.current = latestTrade.id;

    setCandles((prevCandles) => {
      if (prevCandles.length === 0) return prevCandles;
      
      const updated = [...prevCandles];
      const lastCandle = updated[updated.length - 1];
      const tradeTime = latestTrade.timestamp;
      const tradePrice = latestTrade.price;
      const tradeQty = latestTrade.quantity;

      // Group trades in 5000ms (5s) buckets
      const isSameBucket = tradeTime - lastCandle.time < 5000;

      if (isSameBucket) {
        lastCandle.high = Number(Math.max(lastCandle.high, tradePrice).toFixed(2));
        lastCandle.low = Number(Math.min(lastCandle.low, tradePrice).toFixed(2));
        lastCandle.close = Number(tradePrice.toFixed(2));
        lastCandle.volume += tradeQty;
      } else {
        // Create new candle bucket
        const roundedTime = Math.floor(tradeTime / 5000) * 5000;
        updated.push({
          time: roundedTime,
          open: Number(tradePrice.toFixed(2)),
          high: Number(tradePrice.toFixed(2)),
          low: Number(tradePrice.toFixed(2)),
          close: Number(tradePrice.toFixed(2)),
          volume: tradeQty,
        });
      }

      // Cap at 45 visible candles
      return updated.slice(-45);
    });
  }, [trades]);

  // Coordinate dimensions
  const svgWidth = 650;
  const svgHeight = 240;
  const chartHeight = svgHeight * 0.75; // 75% for candles
  const volumeHeight = svgHeight * 0.20; // 20% for volume

  // Compute pricing scales
  const prices = useMemo(() => candles.flatMap(c => [c.high, c.low]), [candles]);
  const minPrice = useMemo(() => Math.min(...prices) * 0.999, [prices]);
  const maxPrice = useMemo(() => Math.max(...prices) * 1.001, [prices]);
  const priceRange = maxPrice - minPrice || 1;

  // Compute volume scales
  const maxVolume = useMemo(() => Math.max(...candles.map(c => c.volume), 1), [candles]);

  // Hover state (crosshair & tooltip)
  const [hoveredCandle, setHoveredCandle] = useState<Candle | null>(null);
  const [hoverX, setHoverX] = useState<number | null>(null);
  const [hoverY, setHoverY] = useState<number | null>(null);
  const chartRef = useRef<SVGSVGElement | null>(null);

  // Map coordinates to indexes
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    if (!chartRef.current || candles.length === 0) return;
    const rect = chartRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Translate x client position to candle index
    const scaleX = svgWidth / candles.length;
    const index = Math.floor(x / scaleX);
    
    if (index >= 0 && index < candles.length) {
      setHoveredCandle(candles[index]);
      setHoverX((index + 0.5) * scaleX);
      setHoverY(y);
    }
  };

  const handleMouseLeave = () => {
    setHoveredCandle(null);
    setHoverX(null);
    setHoverY(null);
  };

  // Pre-calculate visual coordinates for lines & rects
  const renderedCandles = useMemo(() => {
    const candleWidthFactor = 0.65;
    const stepX = svgWidth / (candles.length || 1);
    
    return candles.map((c, idx) => {
      const isGreen = c.close >= c.open;
      const x = idx * stepX + (stepX / 2);
      
      // Calculate drawing heights mapping values linearly
      const topY = chartHeight - ((Math.max(c.open, c.close) - minPrice) / priceRange) * chartHeight;
      const bottomY = chartHeight - ((Math.min(c.open, c.close) - minPrice) / priceRange) * chartHeight;
      const highY = chartHeight - ((c.high - minPrice) / priceRange) * chartHeight;
      const lowY = chartHeight - ((c.low - minPrice) / priceRange) * chartHeight;
      
      const rectHeight = Math.max(bottomY - topY, 1.5); // ensure thin lines still draw
      const rectWidth = stepX * candleWidthFactor;
      
      // Volume calculation
      const volBarHeight = (c.volume / maxVolume) * volumeHeight;
      const volY = svgHeight - volBarHeight;

      return {
        x,
        topY,
        rectHeight,
        rectWidth,
        highY,
        lowY,
        isGreen,
        volY,
        volBarHeight,
        raw: c,
      };
    });
  }, [candles, minPrice, priceRange, maxVolume, chartHeight, svgHeight, volumeHeight]);

  // Display details of either the hovered candle or the current latest one
  const displayCandle = hoveredCandle ?? candles[candles.length - 1];

  return (
    <div className="glass-panel rounded-2xl flex flex-col h-full overflow-hidden shadow-xl">
      {/* Chart Telemetry Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-5 py-3.5 border-b border-white/5 bg-slate-950/20 gap-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-mono font-semibold text-slate-200 tracking-wider uppercase">
            Live Feed: {activeSymbol}/USD
          </span>
          <span className="text-[9px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded">
            5s aggregation
          </span>
        </div>
        
        {/* Dynamic pricing stats */}
        {displayCandle && (
          <div className="flex flex-wrap gap-3 font-mono text-[10px] text-slate-400">
            <span>O: <span className={displayCandle.close >= displayCandle.open ? "text-emerald-400" : "text-red-400"}>${displayCandle.open.toFixed(2)}</span></span>
            <span>H: <span className="text-slate-200">${displayCandle.high.toFixed(2)}</span></span>
            <span>L: <span className="text-slate-200">${displayCandle.low.toFixed(2)}</span></span>
            <span>C: <span className={displayCandle.close >= displayCandle.open ? "text-emerald-400" : "text-red-400"}>${displayCandle.close.toFixed(2)}</span></span>
            <span className="hidden sm:inline">V: <span className="text-blue-400">{displayCandle.volume.toLocaleString()}</span></span>
          </div>
        )}
      </div>

      {/* SVG Canvas Area */}
      <div className="flex-1 w-full bg-slate-950/25 relative select-none">
        {candles.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs font-mono text-slate-500">
            Initializing chart engine...
          </div>
        ) : (
          <svg
            ref={chartRef}
            className="w-full h-full p-2 overflow-visible cursor-crosshair"
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            {/* Grid Line Marks */}
            <line x1={0} y1={chartHeight / 2} x2={svgWidth} y2={chartHeight / 2} stroke="rgba(255,255,255,0.03)" strokeWidth="0.8" strokeDasharray="3,3" />
            <line x1={0} y1={chartHeight} x2={svgWidth} y2={chartHeight} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
            
            {/* Volume Title line indicator */}
            <line x1={0} y1={svgHeight - volumeHeight} x2={svgWidth} y2={svgHeight - volumeHeight} stroke="rgba(255,255,255,0.02)" strokeWidth="0.8" />

            {/* Render Candlesticks and Volume Bars */}
            {renderedCandles.map((c, i) => (
              <g key={i}>
                {/* High-Low Wick */}
                <line
                  x1={c.x}
                  y1={c.highY}
                  x2={c.x}
                  y2={c.lowY}
                  stroke={c.isGreen ? "#34d399" : "#f87171"}
                  strokeWidth="1.2"
                />
                {/* Open-Close Body */}
                <rect
                  x={c.x - (c.rectWidth / 2)}
                  y={c.topY}
                  width={c.rectWidth}
                  height={c.rectHeight}
                  fill={c.isGreen ? "#10b981" : "#ef4444"}
                  rx="1"
                  className="transition-all duration-300"
                />
                {/* Volume Bar */}
                <rect
                  x={c.x - (c.rectWidth / 2)}
                  y={c.volY}
                  width={c.rectWidth}
                  height={c.volBarHeight}
                  fill={c.isGreen ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)"}
                  rx="0.5"
                />
              </g>
            ))}

            {/* Interactive Hover Crosshairs */}
            {hoverX !== null && hoverY !== null && (
              <g>
                {/* Vertical Cursor Guide */}
                <line
                  x1={hoverX}
                  y1={0}
                  x2={hoverX}
                  y2={svgHeight}
                  stroke="rgba(59, 130, 246, 0.35)"
                  strokeWidth="0.8"
                  strokeDasharray="4,4"
                />
                {/* Horizontal Cursor Guide */}
                <line
                  x1={0}
                  y1={hoverY}
                  x2={svgWidth}
                  y2={hoverY}
                  stroke="rgba(59, 130, 246, 0.35)"
                  strokeWidth="0.8"
                  strokeDasharray="4,4"
                />
                {/* Price marker dot */}
                <circle cx={hoverX} cy={hoverY} r="3" fill="#60a5fa" />
              </g>
            )}
          </svg>
        )}
      </div>
    </div>
  );
}
