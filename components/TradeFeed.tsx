'use client';

import { useEffect, useState, useCallback } from 'react';
import { TradeCard } from './TradeCard';
import type { TradeRecord } from '@/lib/trades';

interface TradeFeedProps {
  userAddress:   string | null;
  provider:      any;
  sessionActive: boolean;
}

// Demo wallets to track — in production, fetched from user's Farcaster following list
const DEMO_TRACKED_WALLETS = [
  { fid: 3,      address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', username: 'vitalik.eth', label: 'VITALIK' },
  { fid: 2,      address: '0x8Fc5d6AFe572feFC4EC153587B63cE543f6fa2EA', username: 'v',          label: 'JESSE' },
  { fid: 12142,  address: '0x3a843fB6e7bBF20aacB20F3Fd4f7EbE5F455867',  username: 'punk6529',   label: 'PUNK6529' },
];

export function TradeFeed({ userAddress, provider, sessionActive }: TradeFeedProps) {
  const [trades,   setTrades]   = useState<TradeRecord[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [lastPoll, setLastPoll] = useState(0);
  const [copying,  setCopying]  = useState<string | null>(null);
  const [copyResult, setCopyResult] = useState<{ id: string; success: boolean; msg: string } | null>(null);

  const fetchTrades = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/feed?wallets=' + DEMO_TRACKED_WALLETS.map(w => w.address).join(','));
      if (res.ok) {
        const data = await res.json();
        setTrades(data.trades ?? []);
      }
    } catch {
      // fail silently — stale data is fine
    } finally {
      setLoading(false);
      setLastPoll(Date.now());
    }
  }, []);

  useEffect(() => {
    fetchTrades();
    const interval = setInterval(fetchTrades, 30_000); // refresh every 30s
    return () => clearInterval(interval);
  }, [fetchTrades]);

  const handleCopy = useCallback(async (trade: TradeRecord) => {
    if (!provider || !userAddress) {
      setCopyResult({ id: trade.id, success: false, msg: 'CONNECT_WALLET_FIRST' });
      return;
    }
    setCopying(trade.id);
    setCopyResult(null);

    try {
      const res = await fetch('/api/copy', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          tradeId:     trade.id,
          tokenIn:     trade.tokenOut.address, // reversed for copy
          tokenOut:    trade.tokenIn.address,
          amountUSD:   Math.min(trade.usdValue, 5), // cap at $5
          userAddress,
          sessionActive,
        }),
      });

      if (res.status === 402) {
        // x402: premium required — shouldn't happen for basic copy, but handle gracefully
        setCopyResult({ id: trade.id, success: false, msg: 'PREMIUM_REQUIRED' });
        return;
      }

      const data = await res.json();

      if (!data.calldata) {
        setCopyResult({ id: trade.id, success: false, msg: 'BUILD_FAILED' });
        return;
      }

      // Execute via wallet_sendCalls (batched: approve + swap in one tap)
      const { sendBatchCalls } = await import('@/lib/minikit');
      const txId = await sendBatchCalls(data.calldata, provider);

      setCopyResult({
        id: trade.id,
        success: true,
        msg: `TX_SUBMITTED: ${txId.slice(0, 10)}...`,
      });
    } catch (err: any) {
      setCopyResult({
        id: trade.id,
        success: false,
        msg: err.message?.slice(0, 60) ?? 'UNKNOWN_ERROR',
      });
    } finally {
      setCopying(null);
    }
  }, [provider, userAddress, sessionActive]);

  const ageLabel = (ts: number) => {
    const sec = Math.floor((Date.now() - ts) / 1000);
    if (sec < 60)   return `${sec}s ago`;
    if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
    return `${Math.floor(sec / 3600)}h ago`;
  };

  return (
    <div className="p-3 space-y-3">
      {/* Feed header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="status-live text-2xs text-secondary tracking-widest">LIVE_FEED</span>
          <span className="text-tertiary text-2xs">{DEMO_TRACKED_WALLETS.length} wallets</span>
        </div>
        <button
          onClick={fetchTrades}
          className="text-tertiary text-2xs hover:text-amber-500 transition-colors"
        >
          ↻ REFRESH
        </button>
      </div>

      {/* Tracked wallets */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {DEMO_TRACKED_WALLETS.map(w => (
          <div
            key={w.fid}
            className="flex-none px-3 py-1.5 border border-border bg-panel text-2xs text-secondary hover:border-amber-900/40 transition-colors cursor-pointer"
          >
            <span className="text-amber-500">@</span>{w.label}
          </div>
        ))}
        <div className="flex-none px-3 py-1.5 border border-dashed border-border text-2xs text-tertiary cursor-pointer hover:border-amber-900/40 transition-colors">
          + ADD_WALLET
        </div>
      </div>

      {/* Trade list */}
      {loading && trades.length === 0 ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-panel border border-border animate-pulse" />
          ))}
        </div>
      ) : trades.length === 0 ? (
        <div className="py-16 text-center">
          <div className="text-tertiary text-xs tracking-widest mb-2">NO_TRADES_FOUND</div>
          <div className="text-2xs text-muted">Track wallets to see their positions here.</div>
        </div>
      ) : (
        <div className="space-y-2">
          {trades.map(trade => {
            const walletMeta = DEMO_TRACKED_WALLETS.find(
              w => w.address.toLowerCase() === trade.wallet.toLowerCase()
            );
            return (
              <TradeCard
                key={trade.id}
                trade={trade}
                walletLabel={walletMeta?.label ?? trade.wallet.slice(0, 8) + '…'}
                username={walletMeta?.username}
                ageLabel={ageLabel(trade.timestamp)}
                isCopying={copying === trade.id}
                result={copyResult?.id === trade.id ? copyResult : null}
                onCopy={handleCopy}
                canCopy={!!userAddress}
              />
            );
          })}
        </div>
      )}

      {/* Last updated */}
      {lastPoll > 0 && (
        <div className="text-center text-2xs text-tertiary py-2 tracking-widest">
          LAST_POLL: {ageLabel(lastPoll)}
        </div>
      )}
    </div>
  );
}
