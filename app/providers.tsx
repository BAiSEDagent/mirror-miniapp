'use client';

import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { base } from 'wagmi/chains';
import { OnchainKitProvider } from '@coinbase/onchainkit';
import miniAppConnector from '@farcaster/miniapp-wagmi-connector';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000 } },
});

const wagmiConfig = createConfig({
  chains: [base],
  connectors: [
    // Primary: Farcaster miniapp connector (resolves host wallet automatically)
    miniAppConnector(),
  ],
  transports: {
    [base.id]: http(process.env.NEXT_PUBLIC_BASE_RPC ?? 'https://mainnet.base.org'),
  },
  ssr: true,
});

export function Providers({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {/*
          OnchainKitProvider with miniKit.enabled = true
          Per Feb 2026 docs: this is the correct integration pattern.
          MiniKitProvider is NOT used separately — miniKit is a config option here.
        */}
        <OnchainKitProvider
          apiKey={process.env.NEXT_PUBLIC_CDP_CLIENT_KEY ?? ''}
          chain={base}
          config={{
            appearance: {
              mode:  'dark',
              theme: 'default',
              name:  'MIRROR',
              logo:  '/icon.png',
            },
          }}
          miniKit={{ enabled: true }}
        >
          {children}
        </OnchainKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
