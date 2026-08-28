"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useTradingStore } from "@/lib/tradingStore";
import { TrendingUp, RefreshCw } from "lucide-react";

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface MarketMeta {
  regularMarketPrice?: number;
  previousClose?: number;
  currency?: string;
  exchangeName?: string;
  marketState?: string;
}

export default function Chart() {
  const trades = useTradingStore((s) => s.trades);
  const activeSymbol = useTradingStore((s) => s.activeSymbol);

  const [candles, setCandles] = useState<Candle[]>([]);
  const [meta, setMeta] = useState<MarketMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const lastProcessedTradeId = useRef<string | null>(null);

  // ── Fetch real Yahoo Finance candles ──────────────────────────────────────
  const fetchCandles = useCallback(async (symbol: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/yahoo-finance?symbol=${symbol}`);
      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error ?? `Error fetching data for ${symbol}`);
        setCandles([]);
      } else {
        setCandles(data.candles ?? []);
        setMeta(data.meta ?? null);
      }
    } catch {
      setError("Network error: Could not reach Yahoo Finance proxy.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount and on symbol switch
  useEffect(() => {
    fetchCandles(activeSymbol);
    lastProcessedTradeId.current = null;
  }, [activeSymbol, fetchCandles]);

  // ── Aggregate live Socket.io trades on top of real chart history ──────────
  useEffect(() => {
    if (trades.length === 0) return;
    const latestTrade = trades[0];

    if (latestTrade.id === lastProcessedTradeId.current) return;
    lastProcessedTradeId.current = latestTrade.id;

    setCandles((prev) => {
      if (prev.length === 0) return prev;

      const updated = [...prev];
      const lastCandle = updated[updated.length - 1];
      const tradePrice = latestTrade.price;
      const tradeQty = latestTrade.quantity;
      const tradeTime = latestTrade.timestamp;

      // Aggregate into the same 1-minute bucket as the chart resolution
      const isSameBucket = tradeTime - lastCandle.time < 60_000;

      if (isSameBucket) {
        lastCandle.high = Number(Math.max(lastCandle.high, tradePrice).toFixed(2));
        lastCandle.low = Number(Math.min(lastCandle.low, tradePrice).toFixed(2));
        lastCandle.close = Number(tradePrice.toFixed(2));
        lastCandle.volume += tradeQty;
      } else {
        const roundedTime = Math.floor(tradeTime / 60_000) * 60_000;
        updated.push({
          time: roundedTime,
          open: Number(tradePrice.toFixed(2)),
          high: Number(tradePrice.toFixed(2)),
          low: Number(tradePrice.toFixed(2)),
          close: Number(tradePrice.toFixed(2)),
          volume: tradeQty,
        });
      }

      return updated.slice(-120); // Keep up to 120 candles visible
    });
  }, [trades]);

  // ── SVG layout constants ──────────────────────────────────────────────────
  const svgWidth = 650;
  const svgHeight = 240;
  const chartHeight = svgHeight * 0.75;
  const volumeHeight = svgHeight * 0.20;

  // ── Price & volume scales ─────────────────────────────────────────────────
  const prices = useMemo(() => candles.flatMap((c) => [c.high, c.low]), [candles]);
  const minPrice = useMemo(() => (prices.length ? Math.min(...prices) * 0.999 : 0), [prices]);
  const priceRange = useMemo(() => {
    const maxP = prices.length ? Math.max(...prices) * 1.001 : 1;
    return maxP - minPrice || 1;
  }, [prices, minPrice]);
  const maxVolume = useMemo(() => Math.max(...candles.map((c) => c.volume), 1), [candles]);

  // ── Hover state ───────────────────────────────────────────────────────────
  const [hoveredCandle, setHoveredCandle] = useState<Candle | null>(null);
  const [hoverX, setHoverX] = useState<number | null>(null);
  const [hoverY, setHoverY] = useState<number | null>(null);
  const chartRef = useRef<SVGSVGElement | null>(null);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!chartRef.current || candles.length === 0) return;
    const rect = chartRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const scaleX = svgWidth / candles.length;
    const index = Math.floor((x / rect.width) * candles.length);
    if (index >= 0 && index < candles.length) {
      setHoveredCandle(candles[index]);
      setHoverX((index + 0.5) * scaleX);
      setHoverY((y / rect.height) * svgHeight);
    }
  };

  const handleMouseLeave = () => {
    setHoveredCandle(null);
    setHoverX(null);
    setHoverY(null);
  };

  // ── Rendered candles ──────────────────────────────────────────────────────
  const renderedCandles = useMemo(() => {
    const candleWidthFactor = 0.65;
    const stepX = svgWidth / Math.max(candles.length, 1);

    return candles.map((c, idx) => {
      const isGreen = c.close >= c.open;
      const x = idx * stepX + stepX / 2;

      const topY = chartHeight - ((Math.max(c.open, c.close) - minPrice) / priceRange) * chartHeight;
      const bottomY = chartHeight - ((Math.min(c.open, c.close) - minPrice) / priceRange) * chartHeight;
      const highY = chartHeight - ((c.high - minPrice) / priceRange) * chartHeight;
      const lowY = chartHeight - ((c.low - minPrice) / priceRange) * chartHeight;

      const rectHeight = Math.max(bottomY - topY, 1.5);
      const rectWidth = stepX * candleWidthFactor;

      const volBarHeight = (c.volume / maxVolume) * volumeHeight;
      const volY = svgHeight - volBarHeight;

      return { x, topY, rectHeight, rectWidth, highY, lowY, isGreen, volY, volBarHeight };
    });
  }, [candles, minPrice, priceRange, maxVolume, chartHeight, svgHeight, volumeHeight]);

  const displayCandle = hoveredCandle ?? candles[candles.length - 1];

  // ── Price change indicator vs. previous close ─────────────────────────────
  const prevClose = meta?.previousClose;
  const lastClose = candles[candles.length - 1]?.close;
  const pctChange =
    prevClose && lastClose
      ? (((lastClose - prevClose) / prevClose) * 100).toFixed(2)
      : null;
  const isPositive = pctChange !== null ? parseFloat(pctChange) >= 0 : true;

  return (
    <div className="glass-panel rounded-2xl flex flex-col h-full overflow-hidden shadow-xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-5 py-3.5 border-b border-white/5 bg-slate-950/20 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <TrendingUp className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-mono font-semibold text-slate-200 tracking-wider uppercase truncate">
              {activeSymbol} / {meta?.currency ?? "USD"}
            </span>
            <span className="text-[9px] font-mono text-slate-500 truncate">
              {meta?.exchangeName ?? "Exchange"} · {meta?.marketState ?? "Loading"}
            </span>
          </div>

          {/* Live price badge */}
          {lastClose && (
            <div className="flex items-center gap-2 ml-3">
              <span className={`text-sm font-bold font-mono tabular-nums ${isPositive ? "text-emerald-400 glow-text-green" : "text-red-400 glow-text-red"}`}>
                ${lastClose.toFixed(2)}
              </span>
              {pctChange && (
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold ${
                  isPositive
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-red-500/10 text-red-400 border border-red-500/20"
                }`}>
                  {isPositive ? "+" : ""}{pctChange}%
                </span>
              )}
            </div>
          )}
        </div>

        {/* OHLCV info from hovered or latest candle */}
        <div className="flex flex-wrap items-center gap-3 font-mono text-[10px] text-slate-400">
          {displayCandle && !loading && (
            <>
              <span>O: <span className={displayCandle.close >= displayCandle.open ? "text-emerald-400" : "text-red-400"}>${displayCandle.open.toFixed(2)}</span></span>
              <span>H: <span className="text-slate-200">${displayCandle.high.toFixed(2)}</span></span>
              <span>L: <span className="text-slate-200">${displayCandle.low.toFixed(2)}</span></span>
              <span>C: <span className={displayCandle.close >= displayCandle.open ? "text-emerald-400" : "text-red-400"}>${displayCandle.close.toFixed(2)}</span></span>
              <span className="hidden sm:inline">V: <span className="text-blue-400">{displayCandle.volume.toLocaleString()}</span></span>
            </>
          )}
          <button
            onClick={() => fetchCandles(activeSymbol)}
            title="Refresh"
            className="ml-1 text-slate-500 hover:text-slate-300 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Chart Body */}
      <div className="flex-1 w-full bg-slate-950/25 relative select-none">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-xs font-mono text-slate-500">
            <div className="w-5 h-5 border-2 border-slate-600 border-t-blue-400 rounded-full animate-spin" />
            <span>Loading {activeSymbol} data from Yahoo Finance…</span>
          </div>
        )}

        {!loading && error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
            <span className="text-xs font-mono text-red-400">{error}</span>
            <button
              onClick={() => fetchCandles(activeSymbol)}
              className="text-[10px] font-mono px-3 py-1.5 bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && candles.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-xs font-mono text-slate-500">
            No candle data returned for {activeSymbol}. Market may be closed.
          </div>
        )}

        {!loading && !error && candles.length > 0 && (
          <svg
            ref={chartRef}
            className="w-full h-full p-2 overflow-visible cursor-crosshair"
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            {/* Grid lines */}
            <line x1={0} y1={chartHeight / 4} x2={svgWidth} y2={chartHeight / 4} stroke="rgba(255,255,255,0.025)" strokeWidth="0.8" strokeDasharray="3,3" />
            <line x1={0} y1={chartHeight / 2} x2={svgWidth} y2={chartHeight / 2} stroke="rgba(255,255,255,0.03)" strokeWidth="0.8" strokeDasharray="3,3" />
            <line x1={0} y1={(chartHeight * 3) / 4} x2={svgWidth} y2={(chartHeight * 3) / 4} stroke="rgba(255,255,255,0.025)" strokeWidth="0.8" strokeDasharray="3,3" />
            <line x1={0} y1={chartHeight} x2={svgWidth} y2={chartHeight} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
            <line x1={0} y1={svgHeight - volumeHeight} x2={svgWidth} y2={svgHeight - volumeHeight} stroke="rgba(255,255,255,0.02)" strokeWidth="0.8" />

            {/* Candles + Volume */}
            {renderedCandles.map((c, i) => (
              <g key={i}>
                <line x1={c.x} y1={c.highY} x2={c.x} y2={c.lowY} stroke={c.isGreen ? "#34d399" : "#f87171"} strokeWidth="1.2" />
                <rect x={c.x - c.rectWidth / 2} y={c.topY} width={c.rectWidth} height={c.rectHeight} fill={c.isGreen ? "#10b981" : "#ef4444"} rx="1" />
                <rect x={c.x - c.rectWidth / 2} y={c.volY} width={c.rectWidth} height={c.volBarHeight} fill={c.isGreen ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)"} rx="0.5" />
              </g>
            ))}

            {/* Crosshair */}
            {hoverX !== null && hoverY !== null && (
              <g>
                <line x1={hoverX} y1={0} x2={hoverX} y2={svgHeight} stroke="rgba(59,130,246,0.35)" strokeWidth="0.8" strokeDasharray="4,4" />
                <line x1={0} y1={hoverY} x2={svgWidth} y2={hoverY} stroke="rgba(59,130,246,0.35)" strokeWidth="0.8" strokeDasharray="4,4" />
                <circle cx={hoverX} cy={hoverY} r="3" fill="#60a5fa" />
              </g>
            )}
          </svg>
        )}
      </div>
    </div>
  );
}
