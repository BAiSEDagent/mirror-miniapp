/**
 * MiniKit / miniapp-sdk utilities
 *
 * SDK: @farcaster/miniapp-sdk (Feb 2026 — replaces @farcaster/frame-sdk)
 *
 * EIP-5792 wallet_sendCalls: batch approve + swap into one user tap.
 * EIP-6492: smart wallet signature wrapper (handled by Base Account SDK).
 *
 * SECURITY NOTES:
 * ─────────────────────────────────────────────────────────────────────
 * • sdk.context.user is UNTRUSTED. Never gate privileged actions on FID alone.
 *   Always verify via signed message (eth_requestAccounts → on-chain address).
 * • wallet_sendCalls calldata must be server-built and never accept raw
 *   calldata from user input.
 * • If host doesn't support wallet_sendCalls, degrade to sequential
 *   eth_sendTransaction — never silently fail.
 */

import { sdk } from '@farcaster/miniapp-sdk';

/**
 * Resolve EIP-1193 provider from host wallet.
 * Uses sdk.wallet.getEthereumProvider() per miniapp-sdk docs.
 * Falls back to window.ethereum if available (browser extension wallets).
 */
export async function getProvider(): Promise<any> {
  try {
    const provider = await sdk.wallet.getEthereumProvider();
    if (provider) return provider;
  } catch { /* fall through */ }

  if (typeof window !== 'undefined' && (window as any).ethereum) {
    return (window as any).ethereum;
  }

  throw new Error(
    'wallet.getEthereumProvider not supported by this host client — ' +
    'ensure requiredCapabilities includes wallet.getEthereumProvider in manifest'
  );
}

export interface BatchCall {
  to:    string;
  data:  string;
  value?: bigint;
}

/**
 * Send batch of calls via wallet_sendCalls (EIP-5792).
 *
 * Includes paymaster capability for gasless execution.
 * Degrades to sequential eth_sendTransaction if host doesn't support EIP-5792.
 *
 * SECURITY: calldata must be constructed server-side (/api/copy).
 * Do NOT pass arbitrary user-controlled bytes here.
 */
export async function sendBatchCalls(
  calls:    BatchCall[],
  provider: any,
): Promise<string> {
  // Check EIP-5792 support
  try {
    const caps = await provider.request({ method: 'wallet_getCapabilities' });
    const baseCaps = caps?.['0x2105'] ?? caps?.[`0x${(8453).toString(16)}`]; // Base mainnet = 0x2105

    if (baseCaps?.sendCalls?.supported || baseCaps?.atomicBatch?.supported) {
      const result = await provider.request({
        method: 'wallet_sendCalls',
        params: [{
          version:        '2.0',
          atomicRequired: true,
          calls: calls.map(c => ({
            to:    c.to,
            data:  c.data,
            value: c.value ? `0x${c.value.toString(16)}` : '0x0',
          })),
          capabilities: {
            // Paymaster for gasless execution
            ...(process.env.NEXT_PUBLIC_PAYMASTER_URL
              ? { paymasterService: { url: process.env.NEXT_PUBLIC_PAYMASTER_URL } }
              : {}
            ),
          },
        }],
      });
      // EIP-5792 returns { id } for the bundle
      return typeof result === 'string' ? result : result?.id ?? 'submitted';
    }
  } catch { /* fallback */ }

  // Fallback: sequential transactions (less ideal — user gets N popups)
  const accounts: string[] = await provider.request({ method: 'eth_requestAccounts' });
  let lastHash = '';
  for (const call of calls) {
    lastHash = await provider.request({
      method: 'eth_sendTransaction',
      params: [{
        from:  accounts[0],
        to:    call.to,
        data:  call.data,
        value: call.value ? `0x${call.value.toString(16)}` : '0x0',
      }],
    });
  }
  return lastHash;
}

/**
 * Compose a cast sharing a completed copy trade.
 * Uses sdk.actions.composeCast from miniapp-sdk.
 * Fails silently if host doesn't support composeCast.
 */
export async function shareTradeAsCast(
  tokenIn:  string,
  tokenOut: string,
  usdValue: number,
  txHash:   string,
): Promise<void> {
  try {
    const text = `Just mirrored a trade via @baised\n\n${tokenIn} → ${tokenOut} ($${usdValue.toFixed(0)})\n\nPowered by MIRROR on Base ⚡`;
    await sdk.actions.composeCast({
      text,
      embeds: [`https://mirror.baised.xyz/tx/${txHash}`],
    });
  } catch { /* non-critical — composeCast is optional capability */ }
}
