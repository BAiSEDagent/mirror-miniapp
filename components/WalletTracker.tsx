'use client';

import { useState } from 'react';
import { buildX402Signer, x402Fetch } from '@/lib/x402';

interface WalletTrackerProps {
  userAddress: string | null;
  provider:    any;
}

interface TrackedWallet {
  address:  string;
  label:    string;
  fid?:     number;
  username?: string;
  tradeCount: number;
  lastTrade?: number;
  subscribed: boolean;
}

export function WalletTracker({ userAddress, provider }: WalletTrackerProps) {
  const [input,    setInput]    = useState('');
  const [wallets,  setWallets]  = useState<TrackedWallet[]>([]);
  const [loading,  setLoading]  = useState<string | null>(null);
  const [error,    setError]    = useState<string | null>(null);

  const handleAdd = async () => {
    const addr = input.trim();
    if (!addr || !addr.startsWith('0x') || addr.length !== 42) {
      setError('INVALID_ADDRESS: must be 0x... (42 chars)');
      return;
    }
    if (wallets.some(w => w.address.toLowerCase() === addr.toLowerCase())) {
      setError('ALREADY_TRACKED');
      return;
    }
    setError(null);
    setLoading(addr);

    // Free preview: resolve basic info
    try {
      const res = await fetch(`/api/wallet?address=${addr}`);
      const data = await res.json();
      setWallets(prev => [...prev, {
        address:    addr,
        label:      data.label ?? addr.slice(0, 8) + '…',
        fid:        data.fid,
        username:   data.username,
        tradeCount: data.tradeCount ?? 0,
        lastTrade:  data.lastTrade,
        subscribed: false,
      }]);
      setInput('');
    } catch {
      setError('LOOKUP_FAILED: try again');
    } finally {
      setLoading(null);
    }
  };

  const handleSubscribe = async (wallet: TrackedWallet) => {
    if (!userAddress || !provider) {
      setError('CONNECT_WALLET_FIRST');
      return;
    }
    setLoading(wallet.address);
    setError(null);

    // x402: 0.05 USDC to subscribe to this wallet's trade feed
    const signer = buildX402Signer(userAddress, provider);
    const result = await x402Fetch<{ subscribed: boolean; expiry: number }>(
      `/api/subscribe?wallet=${wallet.address}&subscriber=${userAddress}`,
      { signer },
    );

    if (result.error) {
      setError(`PAYMENT_FAILED: ${result.error}`);
    } else if (result.data?.subscribed) {
      setWallets(prev =>
        prev.map(w => w.address === wallet.address ? { ...w, subscribed: true } : w)
      );
    }
    setLoading(null);
  };

  const handleRemove = (address: string) => {
    setWallets(prev => prev.filter(w => w.address !== address));
  };

  const ageLabel = (ts?: number) => {
    if (!ts) return '—';
    const sec = Math.floor((Date.now() - ts) / 1000);
    if (sec < 60)   return `${sec}s`;
    if (sec < 3600) return `${Math.floor(sec / 60)}m`;
    return `${Math.floor(sec / 3600)}h`;
  };

  return (
    <div className="p-3 space-y-4">
      {/* Section header */}
      <div className="border-b border-border pb-2">
        <div className="text-amber-500 text-xs font-bold tracking-[0.15em]">// TRACK_WALLETS</div>
        <div className="text-tertiary text-2xs mt-0.5">
          Add wallets to your feed. Free preview · 0.05 USDC/month per wallet for real-time alerts.
        </div>
      </div>

      {/* Input */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="0x... or ENS name"
            className="flex-1 bg-panel border border-border text-primary text-xs px-3 py-2 font-mono placeholder:text-tertiary focus:outline-none focus:border-amber-800/60"
          />
          <button
            onClick={handleAdd}
            disabled={!!loading}
            className="px-4 py-2 bg-amber-500 text-void text-xs font-bold tracking-wider hover:bg-amber-400 transition-colors disabled:opacity-50"
          >
            ADD
          </button>
        </div>
        {error && (
          <div className="text-red-500 text-2xs tracking-wider">✗ {error}</div>
        )}
      </div>

      {/* Wallet list */}
      {wallets.length === 0 ? (
        <div className="py-10 text-center">
          <div className="text-tertiary text-xs tracking-widest mb-1">NO_WALLETS_TRACKED</div>
          <div className="text-2xs text-muted">Add a wallet address or ENS name above.</div>
        </div>
      ) : (
        <div className="space-y-2">
          {wallets.map(wallet => (
            <div key={wallet.address} className="border border-border bg-panel p-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-primary text-xs font-bold">{wallet.label}</div>
                  {wallet.username && (
                    <div className="text-tertiary text-2xs">@{wallet.username}</div>
                  )}
                  <div className="text-tertiary text-2xs tabular">
                    {wallet.address.slice(0, 10)}…{wallet.address.slice(-6)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <div className="text-secondary text-2xs">{wallet.tradeCount} trades</div>
                    <div className="text-tertiary text-2xs">{ageLabel(wallet.lastTrade)} ago</div>
                  </div>
                  <button
                    onClick={() => handleRemove(wallet.address)}
                    className="text-tertiary text-2xs hover:text-red-500 transition-colors ml-1"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Subscribe CTA */}
              {wallet.subscribed ? (
                <div className="flex items-center gap-1 text-amber-500 text-2xs tracking-widest">
                  <span className="status-live" />
                  ALERTS_ACTIVE
                </div>
              ) : (
                <button
                  onClick={() => handleSubscribe(wallet)}
                  disabled={loading === wallet.address}
                  className="w-full py-1.5 border border-amber-800/40 text-amber-600 text-2xs tracking-[0.15em] hover:bg-amber-900/10 transition-colors disabled:opacity-50"
                >
                  {loading === wallet.address
                    ? '// PROCESSING_PAYMENT...'
                    : '// SUBSCRIBE · 0.05 USDC/MO'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
