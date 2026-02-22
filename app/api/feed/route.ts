/**
 * GET /api/feed?wallets=0x...,0x...
 * Returns recent trades for tracked wallets.
 */

import { type NextRequest, NextResponse } from 'next/server';
import { fetchRecentTrades } from '@/lib/trades';

export async function GET(req: NextRequest) {
  const walletsParam = req.nextUrl.searchParams.get('wallets') ?? '';
  const wallets = walletsParam.split(',').filter(w => w.startsWith('0x') && w.length === 42);

  if (wallets.length === 0) {
    return NextResponse.json({ trades: [], error: 'No valid wallet addresses provided' }, { status: 400 });
  }

  if (wallets.length > 20) {
    return NextResponse.json({ trades: [], error: 'Max 20 wallets per request' }, { status: 400 });
  }

  try {
    // Fetch in parallel, cap at 5 trades per wallet
    const results = await Promise.allSettled(
      wallets.map(w => fetchRecentTrades(w, 5))
    );

    const trades = results
      .filter(r => r.status === 'fulfilled')
      .flatMap(r => (r as PromiseFulfilledResult<any>).value)
      .sort((a: any, b: any) => b.timestamp - a.timestamp);

    return NextResponse.json({ trades, count: trades.length });
  } catch (err: any) {
    return NextResponse.json({ trades: [], error: err.message }, { status: 500 });
  }
}

export const runtime = 'edge';
