/**
 * Trade feed utilities
 *
 * Fetches real swap history for a wallet via Alchemy Asset Transfers API.
 * Strategy: query BOTH outgoing (fromAddress) and incoming (toAddress) ERC-20
 * transfers, then match pairs by txHash — any tx where the wallet both sent
 * one token and received another is a swap.
 */

export interface TradeRecord {
  id:          string;
  wallet:      string;
  tokenIn:     Token;   // token the wallet sold
  tokenOut:    Token;   // token the wallet bought
  amountIn:    string;
  amountOut:   string;
  usdValue:    number;
  timestamp:   number;
  txHash:      string;
  protocol:    'uniswap_v3' | 'uniswap_v2' | 'aerodrome' | 'unknown';
  blockNumber: number;
}

export interface Token {
  address:  string;
  symbol:   string;
  name:     string;
  decimals: number;
  logoUrl:  string;
}

const ALCHEMY_BASE_URL = `https://base-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY ?? ''}`;

// Known DEX router addresses on Base — used for protocol detection
const ROUTER_PROTOCOLS: Record<string, TradeRecord['protocol']> = {
  '0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad': 'uniswap_v3', // Universal Router v1.2
  '0x198ef79f1f515f02dfe9e3115ed9fc07183f02fc': 'uniswap_v3', // Universal Router v1.1
  '0x4752ba5dbc23f44d87826276bf6fd6b1c372ad24': 'uniswap_v2', // Uniswap V2 Router
  '0xcf77a3ba9a5ca399b7c97c74d54e5b1beb874e43': 'aerodrome',  // Aerodrome Router
  '0x6cb442acf35158d68425b350ec803b92a4a9a4cc': 'aerodrome',  // Aerodrome Slipstream
};

// Stablecoin addresses on Base for USD value estimation
const STABLECOINS = new Set([
  '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913', // USDC
  '0xd9aaec86b65d86f6a7b5b1b0c42ffa531710b6ca', // USDbC
  '0x50c5725949a6f0c72e6c4a641f24049a917db0cb', // DAI
  '0x4200000000000000000000000000000000000006', // WETH (approximation)
]);

/**
 * Fetch recent token swaps for a wallet.
 * Queries both directions in parallel, matches by txHash.
 */
export async function fetchRecentTrades(
  walletAddress: string,
  limit: number = 10,
): Promise<TradeRecord[]> {
  if (!process.env.ALCHEMY_API_KEY) {
    console.warn('[trades] ALCHEMY_API_KEY not set — returning empty');
    return [];
  }

  try {
    // Fetch outgoing AND incoming ERC-20 transfers in parallel
    const [outRes, inRes] = await Promise.all([
      alchemyTransfers({ fromAddress: walletAddress }),
      alchemyTransfers({ toAddress:   walletAddress }),
    ]);

    const outTransfers: any[] = outRes?.result?.transfers ?? [];
    const inTransfers:  any[] = inRes?.result?.transfers  ?? [];

    // Build a map of txHash -> { out, in } pairs
    const byTx = new Map<string, { out?: any; in?: any; ts: number }>();

    for (const t of outTransfers) {
      const entry = byTx.get(t.hash) ?? { ts: blockTimestamp(t) };
      entry.out = t;
      byTx.set(t.hash, entry);
    }

    for (const t of inTransfers) {
      const entry = byTx.get(t.hash) ?? { ts: blockTimestamp(t) };
      entry.in = t;
      byTx.set(t.hash, entry);
    }

    // Keep only txs where wallet both sent and received a token (= swap)
    const swaps = Array.from(byTx.entries())
      .filter(([, v]) => v.out && v.in)
      .sort(([, a], [, b]) => b.ts - a.ts)
      .slice(0, limit);

    return swaps.map(([txHash, { out, in: inT, ts }]) =>
      buildTrade(walletAddress, txHash, out, inT, ts),
    );
  } catch (err) {
    console.error('[trades] fetchRecentTrades error:', err);
    return [];
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function alchemyTransfers(filter: { fromAddress?: string; toAddress?: string }) {
  const res = await fetch(ALCHEMY_BASE_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id:      1,
      method:  'alchemy_getAssetTransfers',
      params:  [{
        fromBlock:        '0x0',
        toBlock:          'latest',
        category:         ['erc20'],
        withMetadata:     true,
        excludeZeroValue: true,
        maxCount:         '0x64', // 100 transfers per direction
        order:            'desc',
        ...filter,
      }],
    }),
  });
  if (!res.ok) return null;
  return res.json();
}

function blockTimestamp(transfer: any): number {
  return new Date(transfer.metadata?.blockTimestamp ?? 0).getTime();
}

function buildTrade(
  wallet:  string,
  txHash:  string,
  out:     any,
  inT:     any,
  ts:      number,
): TradeRecord {
  return {
    id:          txHash,
    wallet,
    tokenIn: {
      address:  (out.rawContract?.address ?? '').toLowerCase(),
      symbol:   out.asset ?? '?',
      name:     out.asset ?? 'Unknown',
      decimals: 18,
      logoUrl:  tokenLogo(out.rawContract?.address),
    },
    tokenOut: {
      address:  (inT.rawContract?.address ?? '').toLowerCase(),
      symbol:   inT.asset ?? '?',
      name:     inT.asset ?? 'Unknown',
      decimals: 18,
      logoUrl:  tokenLogo(inT.rawContract?.address),
    },
    amountIn:    formatAmount(out.value),
    amountOut:   formatAmount(inT.value),
    usdValue:    estimateUsd(inT),
    timestamp:   ts,
    txHash,
    protocol:    detectProtocol(out),
    blockNumber: parseInt(out.blockNum ?? '0', 16),
  };
}

function tokenLogo(address?: string): string {
  if (!address) return '';
  return `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/base/assets/${address}/logo.png`;
}

function formatAmount(value: number | null | undefined): string {
  if (!value) return '0';
  if (value >= 1000) return value.toLocaleString('en-US', { maximumFractionDigits: 2 });
  return value.toPrecision(4);
}

function estimateUsd(inTransfer: any): number {
  const addr = (inTransfer.rawContract?.address ?? '').toLowerCase();
  // If received token is a stablecoin, value is directly USD
  if (STABLECOINS.has(addr)) return parseFloat(inTransfer.value ?? 0);
  // Otherwise return raw token amount as approximation (will show as token units)
  return parseFloat(inTransfer.value ?? 0);
}

function detectProtocol(out: any): TradeRecord['protocol'] {
  const to = (out.to ?? '').toLowerCase();
  return ROUTER_PROTOCOLS[to] ?? 'unknown';
}
