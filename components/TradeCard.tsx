'use client';

import clsx from 'clsx';
import type { TradeRecord } from '@/lib/trades';

interface TradeCardProps {
  trade:       TradeRecord;
  walletLabel: string;
  username?:   string;
  ageLabel:    string;
  isCopying:   boolean;
  canCopy:     boolean;
  result:      { success: boolean; msg: string } | null;
  onCopy:      (trade: TradeRecord) => void;
}

export function TradeCard({
  trade, walletLabel, username, ageLabel,
  isCopying, canCopy, result, onCopy,
}: TradeCardProps) {
  const isProfit = trade.usdValue > 500;
  const usdFormatted = new Intl.NumberFormat('en-US', {
    style:    'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(trade.usdValue);

  return (
    <div
      className={clsx(
        'trade-card border bg-panel p-3 transition-all',
        result?.success  ? 'border-amber-500/50 bg-amber-900/5' : 'border-border',
        result && !result.success ? 'border-red-900/40' : '',
      )}
    >
      {/* Top row: wallet + age + protocol */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-amber-500 text-2xs font-bold tracking-wider">{walletLabel}</span>
          {username && (
            <span className="text-tertiary text-2xs">@{username}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={clsx(
            'text-2xs px-1 py-0.5 border',
            trade.protocol === 'uniswap_v3'
              ? 'text-amber-700 border-amber-900/30 bg-amber-900/10'
              : 'text-tertiary border-border',
          )}>
            {trade.protocol.replace('_', ' ').toUpperCase()}
          </span>
          <span className="text-tertiary text-2xs tabular">{ageLabel}</span>
        </div>
      </div>

      {/* Trade route */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex flex-col">
          <span className="text-secondary text-xs font-semibold">{trade.tokenIn.symbol}</span>
          <span className="text-tertiary text-2xs tabular">{parseFloat(trade.amountIn).toFixed(4)}</span>
        </div>

        <div className="flex-1 flex items-center">
          <div className="flex-1 h-px bg-border" />
          <span className="mx-2 text-amber-600 text-xs">→</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <div className="flex flex-col items-end">
          <span className="text-primary text-xs font-semibold">{trade.tokenOut.symbol}</span>
          <span className="text-tertiary text-2xs tabular">{parseFloat(trade.amountOut).toFixed(4)}</span>
        </div>

        <div className={clsx(
          'ml-2 text-xs font-bold tabular',
          isProfit ? 'text-amber-400' : 'text-secondary',
        )}>
          {usdFormatted}
        </div>
      </div>

      {/* Result message */}
      {result && (
        <div className={clsx(
          'mb-2 px-2 py-1 text-2xs font-mono tracking-wider',
          result.success ? 'text-amber-500 bg-amber-900/10' : 'text-red-500 bg-red-900/10',
        )}>
          {result.success ? '✓ ' : '✗ '}{result.msg}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <a
          href={`https://basescan.org/tx/${trade.txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-2xs text-tertiary hover:text-secondary transition-colors"
        >
          {trade.txHash.slice(0, 12)}…
        </a>

        <button
          onClick={() => onCopy(trade)}
          disabled={!canCopy || isCopying}
          className={clsx(
            'btn-amber px-4 py-1.5 text-xs font-bold tracking-[0.15em] border transition-all',
            !canCopy
              ? 'text-tertiary border-muted cursor-not-allowed'
              : isCopying
                ? 'text-amber-600 border-amber-800 bg-amber-900/10 cursor-wait'
                : result?.success
                  ? 'text-amber-500 border-amber-700 bg-amber-900/10'
                  : 'text-void bg-amber-500 border-amber-500 hover:bg-amber-400 hover:border-amber-400',
          )}
        >
          {isCopying
            ? '// EXEC...'
            : result?.success
              ? '// DONE'
              : !canCopy
                ? '// CONNECT'
                : '// MIRROR'}
        </button>
      </div>
    </div>
  );
}
