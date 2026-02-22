'use client';

import { type AppView } from '@/app/page';
import clsx from 'clsx';

interface HeaderProps {
  fid?:          number;
  pfpUrl?:       string;
  username?:     string;
  address?:      string | null;
  sessionActive: boolean;
  view:          AppView;
  onViewChange:  (v: AppView) => void;
}

export function Header({
  fid, pfpUrl, username, address, sessionActive, view, onViewChange,
}: HeaderProps) {
  const shortAddr = address
    ? `${address.slice(0, 6)}…${address.slice(-4)}`
    : null;

  return (
    <header className="sticky top-0 z-50 bg-void border-b border-border">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 h-11">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <span className="text-amber-500 font-bold text-sm tracking-[0.2em] amber-glow">
            MIRROR
          </span>
          <span className="text-tertiary text-2xs">v0.1</span>
        </div>

        {/* User + session status */}
        <div className="flex items-center gap-3">
          {sessionActive && (
            <div className="flex items-center gap-1">
              <span className="status-live text-2xs text-amber-600 tracking-widest">
                SESSION
              </span>
            </div>
          )}
          {username ? (
            <div className="flex items-center gap-2">
              {pfpUrl && (
                <img
                  src={pfpUrl}
                  alt={username}
                  className="w-5 h-5 rounded-full border border-border"
                />
              )}
              <span className="text-secondary text-2xs">@{username}</span>
            </div>
          ) : shortAddr ? (
            <span className="text-secondary text-2xs tabular">{shortAddr}</span>
          ) : (
            <span className="text-tertiary text-2xs">NOT_CONNECTED</span>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex border-t border-border">
        {(['feed', 'track'] as AppView[]).map(v => (
          <button
            key={v}
            onClick={() => onViewChange(v)}
            className={clsx(
              'flex-1 py-2 text-2xs tracking-[0.15em] uppercase transition-colors',
              view === v
                ? 'text-amber-500 border-b-2 border-amber-500 bg-amber-900/5'
                : 'text-tertiary hover:text-secondary',
            )}
          >
            {v === 'feed' ? '// FEED' : '// TRACK'}
          </button>
        ))}
      </nav>
    </header>
  );
}
