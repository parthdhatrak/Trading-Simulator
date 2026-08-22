import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { symbol = 'AAPL' } = req.query;
  const apiKey = process.env.TWELVEDATA_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'Missing TwelveData API key' });
    return;
  }
  const url = `https://api.twelvedata.com/time_series?symbol=${symbol}&interval=1s&apikey=${apiKey}`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error('TwelveData fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
}
