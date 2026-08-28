"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import {
  createChart,
  CrosshairMode,
  CandlestickSeries,
  HistogramSeries,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type HistogramData,
  type UTCTimestamp,
} from "lightweight-charts";
import { useTradingStore } from "@/lib/tradingStore";
import { TrendingUp, RefreshCw } from "lucide-react";

/* ─── Types ──────────────────────────────────────────────────────────────── */

interface Candle {
  time: number; // Unix ms (our internal format)
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

/* ─── Helpers ────────────────────────────────────────────────────────────── */

/** Convert ms → seconds expected by lightweight-charts */
const toSec = (ms: number): UTCTimestamp =>
  Math.floor(ms / 1000) as UTCTimestamp;

/** Deduplicate + sort candles by time ascending (required by the library) */
const dedupeSort = (candles: Candle[]): Candle[] => {
  const map = new Map<number, Candle>();
  for (const c of candles) map.set(toSec(c.time), c); // later entry wins
  return [...map.values()].sort((a, b) => toSec(a.time) - toSec(b.time));
};

/* ─── TradingView-identical chart colours ────────────────────────────────── */

const TV_UP = "#26a69a";
const TV_DOWN = "#ef5350";
const TV_UP_ALPHA = "rgba(38,166,154,0.35)";
const TV_DOWN_ALPHA = "rgba(239,83,80,0.35)";

/* ─── Component ──────────────────────────────────────────────────────────── */

export default function Chart() {
  const trades = useTradingStore((s) => s.trades);
  const activeSymbol = useTradingStore((s) => s.activeSymbol);

  /* DOM ref for the chart canvas container */
  const containerRef = useRef<HTMLDivElement>(null);

  /* lightweight-charts API handles */
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);

  /* React state — only used for the header overlay, not for rendering candles */
  const [candles, setCandles] = useState<Candle[]>([]);
  const [meta, setMeta] = useState<MarketMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredCandle, setHoveredCandle] = useState<Candle | null>(null);

  const lastTradeId = useRef<string | null>(null);

  /* ── 1. Create chart once on mount ──────────────────────────────────────── */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const chart = createChart(el, {
      autoSize: true,
      layout: {
        background: { color: "transparent" },
        textColor: "#94a3b8",
        fontFamily:
          "'JetBrains Mono', 'Cascadia Code', 'Fira Mono', monospace",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "rgba(51,65,85,0.45)" },
        horzLines: { color: "rgba(51,65,85,0.45)" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: "rgba(148,163,184,0.4)",
          style: 2,
          labelBackgroundColor: "#1e293b",
        },
        horzLine: {
          color: "rgba(148,163,184,0.4)",
          style: 2,
          labelBackgroundColor: "#1e293b",
        },
      },
      rightPriceScale: {
        borderColor: "rgba(51,65,85,0.6)",
        textColor: "#64748b",
        scaleMargins: { top: 0.08, bottom: 0.25 },
      },
      timeScale: {
        borderColor: "rgba(51,65,85,0.6)",
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 6,
        barSpacing: 8,
        minBarSpacing: 2,
        fixLeftEdge: false,
        fixRightEdge: false,
      },
    });

    /* Candlestick series */
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: TV_UP,
      downColor: TV_DOWN,
      borderVisible: false,
      wickUpColor: TV_UP,
      wickDownColor: TV_DOWN,
    });

    /* Volume histogram — overlaid on same pane, bottom 20% */
    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: TV_UP_ALPHA,
      priceFormat: { type: "volume" },
      priceScaleId: "vol",
    });
    chart.priceScale("vol").applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    /* Crosshair move → update header OHLCV */
    chart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.point) {
        setHoveredCandle(null);
        return;
      }
      const bar = param.seriesData.get(candleSeries) as
        | CandlestickData
        | undefined;
      if (bar) {
        setHoveredCandle({
          time: (bar.time as number) * 1000,
          open: bar.open,
          high: bar.high,
          low: bar.low,
          close: bar.close,
          volume: 0,
        });
      }
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    return () => {
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
    };
  }, []);

  /* ── 2. Push candle state into the series whenever it changes ───────────── */
  useEffect(() => {
    const cSeries = candleSeriesRef.current;
    const vSeries = volumeSeriesRef.current;
    if (!cSeries || !vSeries || candles.length === 0) return;

    const sorted = dedupeSort(candles);

    const tvCandles: CandlestickData[] = sorted.map((c) => ({
      time: toSec(c.time),
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    const tvVolume: HistogramData[] = sorted.map((c) => ({
      time: toSec(c.time),
      value: c.volume,
      color: c.close >= c.open ? TV_UP_ALPHA : TV_DOWN_ALPHA,
    }));

    cSeries.setData(tvCandles);
    vSeries.setData(tvVolume);
    chartRef.current?.timeScale().fitContent();
  }, [candles]);

  /* ── 3. Fetch Yahoo Finance candles on symbol change ────────────────────── */
  const fetchCandles = useCallback(async (symbol: string) => {
    setLoading(true);
    setError(null);
    setHoveredCandle(null);
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
      setError("Network error — could not reach Yahoo Finance proxy.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCandles(activeSymbol);
    lastTradeId.current = null;
  }, [activeSymbol, fetchCandles]);

  /* ── 4. Aggregate live Socket.io trades on top of history ───────────────── */
  useEffect(() => {
    if (trades.length === 0) return;
    const latest = trades[0];
    if (latest.id === lastTradeId.current) return;
    lastTradeId.current = latest.id;

    setCandles((prev) => {
      if (prev.length === 0) return prev;
      const updated = [...prev];
      const last = updated[updated.length - 1];
      const { price, quantity, timestamp } = latest;

      if (timestamp - last.time < 60_000) {
        // Same 1-min bucket → update last candle
        last.high = Math.max(last.high, price);
        last.low = Math.min(last.low, price);
        last.close = price;
        last.volume += quantity;

        // Push incremental update directly into the series (no full re-render)
        candleSeriesRef.current?.update({
          time: toSec(last.time),
          open: last.open,
          high: last.high,
          low: last.low,
          close: last.close,
        });
        volumeSeriesRef.current?.update({
          time: toSec(last.time),
          value: last.volume,
          color: last.close >= last.open ? TV_UP_ALPHA : TV_DOWN_ALPHA,
        });
      } else {
        // New bucket → add new candle
        const roundedTime = Math.floor(timestamp / 60_000) * 60_000;
        const newCandle: Candle = {
          time: roundedTime,
          open: price,
          high: price,
          low: price,
          close: price,
          volume: quantity,
        };
        updated.push(newCandle);

        candleSeriesRef.current?.update({
          time: toSec(roundedTime),
          open: price,
          high: price,
          low: price,
          close: price,
        });
        volumeSeriesRef.current?.update({
          time: toSec(roundedTime),
          value: quantity,
          color: TV_UP_ALPHA,
        });
      }

      return updated.slice(-300);
    });
  }, [trades]);

  /* ── Derived header values ──────────────────────────────────────────────── */
  const displayCandle = hoveredCandle ?? candles[candles.length - 1];
  const prevClose = meta?.previousClose;
  const lastClose = candles[candles.length - 1]?.close;
  const pctChange =
    prevClose && lastClose
      ? (((lastClose - prevClose) / prevClose) * 100).toFixed(2)
      : null;
  const isPositive = pctChange !== null ? parseFloat(pctChange) >= 0 : true;

  /* ─────────────────────────────────────────────────────────────────────── */
  return (
    <div className="glass-panel rounded-2xl flex flex-col h-full overflow-hidden shadow-xl">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-5 py-3 border-b border-white/5 bg-slate-950/20 gap-2 flex-shrink-0">
        {/* Left: symbol + price badge */}
        <div className="flex items-center gap-3 min-w-0">
          <TrendingUp className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <div className="flex flex-col min-w-0 leading-tight">
            <span className="text-xs font-mono font-semibold text-slate-200 tracking-wider uppercase">
              {activeSymbol} / {meta?.currency ?? "USD"}
            </span>
            <span className="text-[9px] font-mono text-slate-500">
              {meta?.exchangeName ?? "—"} · {meta?.marketState ?? "Loading"}
            </span>
          </div>

          {lastClose && (
            <div className="flex items-center gap-2 ml-2">
              <span
                className={`text-sm font-bold font-mono tabular-nums ${
                  isPositive ? "text-emerald-400" : "text-red-400"
                }`}
              >
                ${lastClose.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              {pctChange && (
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold ${
                    isPositive
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : "bg-red-500/10 text-red-400 border border-red-500/20"
                  }`}
                >
                  {isPositive ? "+" : ""}
                  {pctChange}%
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right: OHLCV tooltip + refresh */}
        <div className="flex flex-wrap items-center gap-3 font-mono text-[10px] text-slate-400">
          {displayCandle && !loading && (
            <>
              <span>
                O:{" "}
                <span
                  className={
                    displayCandle.close >= displayCandle.open
                      ? "text-emerald-400"
                      : "text-red-400"
                  }
                >
                  ${displayCandle.open.toFixed(2)}
                </span>
              </span>
              <span>
                H: <span className="text-slate-200">${displayCandle.high.toFixed(2)}</span>
              </span>
              <span>
                L: <span className="text-slate-200">${displayCandle.low.toFixed(2)}</span>
              </span>
              <span>
                C:{" "}
                <span
                  className={
                    displayCandle.close >= displayCandle.open
                      ? "text-emerald-400"
                      : "text-red-400"
                  }
                >
                  ${displayCandle.close.toFixed(2)}
                </span>
              </span>
            </>
          )}
          <button
            id="chart-refresh-btn"
            onClick={() => fetchCandles(activeSymbol)}
            title="Refresh chart"
            className="ml-1 text-slate-500 hover:text-slate-300 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* ── Chart body ──────────────────────────────────────────────────── */}
      <div className="flex-1 relative min-h-0">
        {/* lightweight-charts mount point */}
        <div ref={containerRef} className="absolute inset-0" />

        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950/60 backdrop-blur-sm z-10">
            <div className="w-5 h-5 border-2 border-slate-600 border-t-blue-400 rounded-full animate-spin" />
            <span className="text-[11px] font-mono text-slate-400">
              Loading {activeSymbol} · Yahoo Finance
            </span>
          </div>
        )}

        {/* Error overlay */}
        {!loading && error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/70 backdrop-blur-sm z-10 px-6 text-center">
            <span className="text-xs font-mono text-red-400">{error}</span>
            <button
              onClick={() => fetchCandles(activeSymbol)}
              className="text-[10px] font-mono px-3 py-1.5 bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && candles.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <span className="text-xs font-mono text-slate-500">
              No data for {activeSymbol} — market may be closed.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
