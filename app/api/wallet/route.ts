/**
 * GET /api/wallet?address=0x...
 * Resolves wallet → Farcaster profile + trade count preview.
 * Free to call — premium data (live alerts) requires subscription.
 */

import { type NextRequest, NextResponse } from 'next/server';
import { fetchFarcasterUser } from '@/lib/farcaster';
import { fetchRecentTrades } from '@/lib/trades';

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get('address') ?? '';

  if (!address.startsWith('0x') || address.length !== 42) {
    return NextResponse.json({ error: 'Invalid address' }, { status: 400 });
  }

  try {
    // Resolve Farcaster identity from address via Neynar
    const key = process.env.NEYNAR_API_KEY ?? 'NEYNAR_API_DOCS';
    const fidRes = await fetch(
      `https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${address}`,
      { headers: { api_key: key } }
    );

    let user = null;
    if (fidRes.ok) {
      const fidData = await fidRes.json();
      const users = fidData[address.toLowerCase()] ?? [];
      user = users[0] ?? null;
    }

    // Get recent trade count (free preview — last 5 trades only)
    const trades = await fetchRecentTrades(address, 5);
    const lastTrade = trades[0]?.timestamp ?? null;

    return NextResponse.json({
      address,
      label:      user?.username ?? `${address.slice(0, 8)}…`,
      fid:        user?.fid ?? null,
      username:   user?.username ?? null,
      pfpUrl:     user?.pfp_url ?? null,
      tradeCount: trades.length,
      lastTrade,
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export const runtime = 'edge';
