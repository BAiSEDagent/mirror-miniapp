'use client';

import { useEffect, useState, useCallback } from 'react';
import { useMiniKit } from '@coinbase/onchainkit/minikit';
import { sdk } from '@farcaster/miniapp-sdk';
import { Header } from '@/components/Header';
import { TradeFeed } from '@/components/TradeFeed';
import { SessionKeyBanner } from '@/components/SessionKeyBanner';
import { WalletTracker } from '@/components/WalletTracker';
import { getProvider } from '@/lib/minikit';
import { requestSessionKey, validateSessionKey } from '@/lib/session-keys';

export type AppView = 'feed' | 'track';

export default function MirrorApp() {
  const { setFrameReady, isFrameReady, context } = useMiniKit();

  const [view,           setView]           = useState<AppView>('feed');
  const [provider,       setProvider]       = useState<any>(null);
  const [userAddress,    setUserAddress]    = useState<string | null>(null);
  const [sessionActive,  setSessionActive]  = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [loading,        setLoading]        = useState(true);
  const [capError,       setCapError]       = useState<string | null>(null);

  // Signal host that app is ready to receive interactions
  useEffect(() => {
    if (isFrameReady) setFrameReady();
  }, [isFrameReady, setFrameReady]);

  // Connect to host wallet via miniapp-sdk → EIP-1193 provider
  useEffect(() => {
    (async () => {
      try {
        const p = await getProvider();
        setProvider(p);

        /**
         * ANTI-SPOOFING NOTE:
         * sdk.context.user.fid is untrusted here (client-controlled).
         * We do NOT gate any privileged action on fid alone.
         * Sensitive operations use eth_requestAccounts → verified wallet address.
         * Server-side FID verification happens via /api/auth (verifySIWF).
         */
        const accounts: string[] = await p.request({ method: 'eth_requestAccounts' });
        if (accounts[0]) setUserAddress(accounts[0]);
      } catch (err: any) {
        // Graceful degradation — read-only mode if wallet unavailable
        setCapError('wallet.getEthereumProvider not supported by host');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Validate cached session key on mount
  useEffect(() => {
    if (!userAddress) return;
    (async () => {
      const cached = localStorage.getItem(`mirror:sk:${userAddress}`);
      if (cached) {
        const { sessionKey } = JSON.parse(cached);
        const { valid } = await validateSessionKey(sessionKey, userAddress);
        setSessionActive(valid);
      }
      setSessionChecked(true);
    })();
  }, [userAddress]);

  const handleGrantSession = useCallback(async () => {
    if (!provider || !userAddress) return;
    const expiry = Math.floor(Date.now() / 1000) + 86_400; // 24h

    const result = await requestSessionKey(provider, userAddress, {
      allowancePerTx: '5000000',  // $5 USDC max
      totalAllowance: '50000000', // $50 USDC total cap
      expiry,
    });

    if (result.granted && result.sessionKey) {
      localStorage.setItem(`mirror:sk:${userAddress}`, JSON.stringify({
        sessionKey: result.sessionKey,
        expiry,
        grantedAt:  Date.now(),
      }));
      setSessionActive(true);
    }
  }, [provider, userAddress]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-void">
        <div className="text-center space-y-2">
          <div className="text-amber-500 text-sm font-bold tracking-[0.4em] amber-glow animate-pulse">
            MIRROR
          </div>
          <div className="text-tertiary text-2xs tracking-[0.3em]">CONNECTING_HOST_WALLET</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[695px] max-w-[424px] mx-auto bg-void text-primary font-mono">
      <Header
        fid={context?.user?.fid}
        pfpUrl={context?.user?.pfpUrl}
        username={context?.user?.username}
        address={userAddress}
        sessionActive={sessionActive}
        view={view}
        onViewChange={setView}
      />

      {/* Capability degradation warning */}
      {capError && (
        <div className="mx-3 mt-2 px-3 py-2 border border-amber-900/30 bg-amber-900/8 text-amber-700 text-2xs leading-relaxed">
          ⚠ {capError}
          <br />
          <span className="text-tertiary">Read-only mode. Wallet connection required for trading.</span>
        </div>
      )}

      {/* Session key CTA — one-time approval */}
      {sessionChecked && !sessionActive && userAddress && view === 'feed' && (
        <SessionKeyBanner onGrant={handleGrantSession} />
      )}

      <main className="flex-1 overflow-y-auto">
        {view === 'feed'  && (
          <TradeFeed
            userAddress={userAddress}
            provider={provider}
            sessionActive={sessionActive}
          />
        )}
        {view === 'track' && (
          <WalletTracker
            userAddress={userAddress}
            provider={provider}
          />
        )}
      </main>
    </div>
  );
}
