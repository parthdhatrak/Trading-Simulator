import type { NextApiRequest, NextApiResponse } from "next";

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface YahooChartMeta {
  regularMarketPrice?: number;
  previousClose?: number;
  currency?: string;
  exchangeName?: string;
  instrumentType?: string;
  regularMarketTime?: number;
  marketState?: string;
}

interface ApiResponse {
  candles?: Candle[];
  meta?: YahooChartMeta;
  error?: string;
}

// Symbol mapping: BTC → BTC-USD for Yahoo Finance
const toYahooSymbol = (sym: string): string => {
  const map: Record<string, string> = {
    BTC: "BTC-USD",
  };
  return map[sym.toUpperCase()] ?? sym.toUpperCase();
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  // Allow CORS for local dev
  res.setHeader("Access-Control-Allow-Origin", "*");

  const rawSymbol = (Array.isArray(req.query.symbol)
    ? req.query.symbol[0]
    : req.query.symbol) ?? "AAPL";

  const yahooSymbol = toYahooSymbol(rawSymbol);

  // Use 1-minute candles for the current trading day (range=1d)
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1m&range=1d&includePrePost=false`;

  try {
    const response = await fetch(url, {
      headers: {
        // Mimic a browser request to avoid 429/403
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
        Accept: "application/json",
      },
      // 8 second timeout
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      console.error(`[yahoo-finance] Upstream error ${response.status} for ${yahooSymbol}`);
      res.status(502).json({ error: `Yahoo Finance returned HTTP ${response.status}` });
      return;
    }

    const json = await response.json();
    const result = json?.chart?.result?.[0];

    if (!result) {
      console.error("[yahoo-finance] No result data in response:", JSON.stringify(json).slice(0, 200));
      res.status(404).json({ error: "No chart data available for this symbol" });
      return;
    }

    const timestamps: number[] = result.timestamp ?? [];
    const ohlcv = result.indicators?.quote?.[0];

    if (!ohlcv || timestamps.length === 0) {
      res.status(404).json({ error: "OHLCV data missing in Yahoo Finance response" });
      return;
    }

    const { open, high, low, close, volume } = ohlcv as {
      open: (number | null)[];
      high: (number | null)[];
      low: (number | null)[];
      close: (number | null)[];
      volume: (number | null)[];
    };

    // Filter out null-padded bars (pre/post market gaps)
    const candles: Candle[] = timestamps
      .map((ts, i) => ({
        time: ts * 1000, // Convert Yahoo's unix seconds → JS ms
        open: Number((open[i] ?? close[i] ?? 0).toFixed(2)),
        high: Number((high[i] ?? close[i] ?? 0).toFixed(2)),
        low: Number((low[i] ?? close[i] ?? 0).toFixed(2)),
        close: Number((close[i] ?? 0).toFixed(2)),
        volume: volume[i] ?? 0,
      }))
      .filter((c) => c.close > 0); // Drop bars with no price

    const meta: YahooChartMeta = {
      regularMarketPrice: result.meta?.regularMarketPrice,
      previousClose: result.meta?.previousClose,
      currency: result.meta?.currency,
      exchangeName: result.meta?.exchangeName,
      instrumentType: result.meta?.instrumentType,
      regularMarketTime: result.meta?.regularMarketTime,
      marketState: result.meta?.marketState,
    };

    res.status(200).json({ candles, meta });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown fetch error";
    console.error("[yahoo-finance] Fetch error:", message);
    res.status(500).json({ error: `Failed to fetch market data: ${message}` });
  }
}
