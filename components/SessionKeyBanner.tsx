'use client';

import { useState } from 'react';

interface SessionKeyBannerProps {
  onGrant: () => Promise<void>;
}

export function SessionKeyBanner({ onGrant }: SessionKeyBannerProps) {
  const [loading,   setLoading]   = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const handleGrant = async () => {
    setLoading(true);
    try {
      await onGrant();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-3 mt-3 border border-amber-800/40 bg-amber-900/8 p-3">
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="text-amber-500 text-2xs font-bold tracking-[0.2em]">
          SESSION_KEY_AVAILABLE
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-tertiary text-2xs hover:text-secondary ml-4"
        >
          ✕
        </button>
      </div>

      {/* Description */}
      <p className="text-secondary text-2xs leading-relaxed mb-3">
        Approve once. Copy trades forever — no wallet popup per trade.
        <br />
        <span className="text-tertiary">
          Max: $5 per trade · $50 total · 24h expiry · Uniswap only
        </span>
      </p>

      {/* Permission scoping visual */}
      <div className="grid grid-cols-3 gap-1 mb-3">
        {[
          { label: 'MAX/TRADE', value: '$5' },
          { label: 'TOTAL CAP', value: '$50' },
          { label: 'EXPIRES',   value: '24H' },
        ].map(({ label, value }) => (
          <div key={label} className="border border-border bg-panel px-2 py-1.5 text-center">
            <div className="text-amber-500 text-xs font-bold tabular">{value}</div>
            <div className="text-tertiary text-2xs mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setDismissed(true)}
          className="py-2 border border-border text-tertiary text-2xs tracking-wider hover:text-secondary transition-colors"
        >
          NOT_NOW
        </button>
        <button
          onClick={handleGrant}
          disabled={loading}
          className="py-2 bg-amber-500 text-void font-bold text-2xs tracking-[0.15em] hover:bg-amber-400 transition-colors disabled:opacity-50"
        >
          {loading ? 'APPROVING...' : 'APPROVE_SESSION'}
        </button>
      </div>
    </div>
  );
}
