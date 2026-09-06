import { Candle, LiveMarketStatus, LiveQuote } from '../types';

export async function fetchLiveQuoteFromApi(ticker: string): Promise<LiveQuote | null> {
  try {
    const res = await fetch(`/api/market/quote/${encodeURIComponent(ticker)}`);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn('Failed to fetch live quote from API:', err);
    return null;
  }
}

export async function fetchBatchQuotesFromApi(tickers: string[]): Promise<Record<string, LiveQuote>> {
  try {
    const res = await fetch('/api/market/quotes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tickers }),
    });
    if (!res.ok) return {};
    const data = await res.json();
    return data.quotes || {};
  } catch (err) {
    console.warn('Failed to fetch batch quotes from API:', err);
    return {};
  }
}

export async function fetchLiveCandlesFromApi(
  ticker: string,
  range: string = '6mo',
  interval: string = '1d'
): Promise<Candle[]> {
  try {
    const res = await fetch(
      `/api/market/candles/${encodeURIComponent(ticker)}?range=${encodeURIComponent(range)}&interval=${encodeURIComponent(interval)}`
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.candles || [];
  } catch (err) {
    console.warn('Failed to fetch live candles from API:', err);
    return [];
  }
}

export async function fetchMarketStatusFromApi(): Promise<LiveMarketStatus | null> {
  try {
    const res = await fetch('/api/market/status');
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn('Failed to fetch market status from API:', err);
    return null;
  }
}

export async function saveUpstoxTokenToApi(token: string): Promise<boolean> {
  try {
    const res = await fetch('/api/market/upstox-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
