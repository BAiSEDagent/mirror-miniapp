'use client';

import { useEffect, useState, useCallback } from 'react';
import { useMiniKit } from '@coinbase/onchainkit/minikit';
import { useAccount } from 'wagmi';
import { Header } from '@/components/Header';
import { TradeFeed } from '@/components/TradeFeed';
import { SessionKeyBanner } from '@/components/SessionKeyBanner';
import { requestSessionKey, validateSessionKey } from '@/lib/session-keys';

export type AppView = 'feed' | 'track';

export default function MirrorApp() {
  const { setFrameReady, isFrameReady, context } = useMiniKit();
  const { address, isConnected } = useAccount();

  const [view, setView] = useState<AppView>('feed');
  const [provider, setProvider] = useState<any>(null);
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);

  // Signal frame ready
  useEffect(() => {
    if (isFrameReady) setFrameReady();
  }, [isFrameReady, setFrameReady]);

  // Get provider from window.ethereum (wagmi connects automatically)
  useEffect(() => {
    if (isConnected && typeof window !== 'undefined' && (window as any).ethereum) {
      setProvider((window as any).ethereum);
    }
  }, [isConnected]);

  // Validate cached session key
  useEffect(() => {
    if (!address) return;
    (async () => {
      const cached = localStorage.getItem(`mirror:sk:${address}`);
      if (cached) {
        const { sessionKey } = JSON.parse(cached);
        const { valid } = await validateSessionKey(sessionKey, address);
        setSessionActive(valid);
      }
      setSessionChecked(true);
    })();
  }, [address]);

  const handleGrantSession = useCallback(async () => {
    if (!provider || !address) return;
    const expiry = Math.floor(Date.now() / 1000) + 86_400;

    const result = await requestSessionKey(provider, address, {
      allowancePerTx: '5000000',
      totalAllowance: '50000000',
      expiry,
    });

    if (result.granted && result.sessionKey) {
      localStorage.setItem(`mirror:sk:${address}`, JSON.stringify({
        sessionKey: result.sessionKey,
        expiry,
        grantedAt: Date.now(),
      }));
      setSessionActive(true);
    }
  }, [provider, address]);

  return (
    <div className="flex flex-col min-h-[695px] max-w-[424px] mx-auto bg-void text-primary font-mono">
      <Header
        fid={context?.user?.fid}
        pfpUrl={context?.user?.pfpUrl}
        username={context?.user?.username}
        address={address ?? null}
        sessionActive={sessionActive}
        view={view}
        onViewChange={setView}
      />

      {sessionChecked && !sessionActive && address && view === 'feed' && (
        <SessionKeyBanner onGrant={handleGrantSession} />
      )}

      <main className="flex-1 overflow-y-auto">
        {view === 'feed' && (
          <TradeFeed
            userAddress={address ?? null}
            provider={provider}
            sessionActive={sessionActive}
          />
        )}
        {view === 'track' && (
          <div className="p-6 text-center text-tertiary text-xs">
            Track wallet feature coming soon
          </div>
        )}
      </main>
    </div>
  );
}
