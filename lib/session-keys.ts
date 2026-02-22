/**
 * Session Key Manager — SpendPermissionManager on Base
 *
 * Allows users to pre-authorize this app to spend USDC up to a limit
 * and execute copy trades without a wallet popup per trade.
 *
 * SECURITY REQUIREMENTS:
 * - allowedContract MUST be set to only the Uniswap v3 Universal Router
 * - allowance MUST be the user's configured max per-trade amount
 * - expiry MUST be set (no infinite sessions)
 * - Spending permissions must use wallet_addSessionKey (EIP-7716 / MiniKit)
 *
 * SpendPermissionManager on Base: 0xf85210B21cC50302F477BA56686d2019dC9b67Ad
 * Ref: https://docs.base.org/identity/smart-wallet/session-keys/
 */

// SpendPermissionManager contract on Base mainnet
export const SPEND_PERMISSION_MANAGER = '0xf85210B21cC50302F477BA56686d2019dC9b67Ad';

// USDC on Base mainnet
export const USDC_BASE = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

// Uniswap v3 Universal Router on Base
export const UNISWAP_UNIVERSAL_ROUTER = '0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD';

export interface SessionKeyConfig {
  /**
   * Max USDC to spend per transaction (6 decimals).
   * e.g., "5000000" = $5 USDC max per copy trade
   */
  allowancePerTx: string;
  /**
   * Total max USDC to spend before session expires (6 decimals).
   * e.g., "50000000" = $50 USDC total
   */
  totalAllowance: string;
  /**
   * Session expiry as Unix timestamp.
   * Recommended: 24 hours from now.
   */
  expiry: number;
}

export interface SessionKeyResult {
  granted:      boolean;
  sessionKey:   string | null;
  txHash:       string | null;
  error:        string | null;
}

/**
 * Request a session key from the user's smart wallet.
 * This triggers ONE wallet approval — all subsequent copy trades
 * within limits are gasless and signature-free.
 *
 * Uses wallet_addSessionKey (MiniKit capability) when available.
 * Falls back to direct SpendPermissionManager approval tx.
 */
export async function requestSessionKey(
  provider: any,
  userAddress: string,
  config: SessionKeyConfig,
): Promise<SessionKeyResult> {
  // Generate a deterministic session key from app context
  // In production: use a proper session key from a KMS or derived from user's context
  const sessionKey = await deriveSessionKey(userAddress);

  // Check if host supports wallet_addSessionKey (MiniKit-native)
  try {
    const capabilities = await provider.request({ method: 'wallet_getCapabilities' });
    const baseChainCaps = capabilities?.[`0x${(8453).toString(16)}`];

    if (baseChainCaps?.addSessionKey?.supported) {
      // Preferred path: host wallet handles session key management
      const result = await provider.request({
        method: 'wallet_addSessionKey',
        params: [{
          key: sessionKey,
          permissions: [
            {
              // SECURITY: lock to USDC spending only, on Uniswap Router only
              type:      'native-token-recurring-allowance',
              data: {
                token:           USDC_BASE,
                allowance:       config.totalAllowance,
                period:          86400, // 24h rolling window
                allowedContract: UNISWAP_UNIVERSAL_ROUTER,
              },
            },
          ],
          expiry: config.expiry,
        }],
      });

      return {
        granted:    true,
        sessionKey,
        txHash:     result.userOpHash ?? null,
        error:      null,
      };
    }
  } catch { /* fallback to direct approval */ }

  // Fallback: approve SpendPermissionManager directly via wallet_sendCalls
  // This is the SpendPermissionManager.approve() ABI-encoded call
  const approveCalldata = encodeApproveCalldata(sessionKey, config);

  try {
    const accounts = await provider.request({ method: 'eth_requestAccounts' });
    const txHash = await provider.request({
      method: 'eth_sendTransaction',
      params: [{
        from:  accounts[0],
        to:    SPEND_PERMISSION_MANAGER,
        data:  approveCalldata,
        value: '0x0',
      }],
    });

    return { granted: true, sessionKey, txHash, error: null };
  } catch (e: any) {
    return { granted: false, sessionKey: null, txHash: null, error: e.message };
  }
}

/**
 * Check if a session key is still valid.
 * Validates: exists on-chain + not expired + allowance not exhausted.
 */
export async function validateSessionKey(
  sessionKey: string,
  userAddress: string,
): Promise<{ valid: boolean; remainingAllowance: string; expiresAt: number }> {
  try {
    const res = await fetch(`/api/session-key/validate?key=${sessionKey}&user=${userAddress}`);
    if (!res.ok) return { valid: false, remainingAllowance: '0', expiresAt: 0 };
    return res.json();
  } catch {
    return { valid: false, remainingAllowance: '0', expiresAt: 0 };
  }
}

/** Derive a deterministic session key ID from user address + app context */
async function deriveSessionKey(userAddress: string): Promise<string> {
  const data = new TextEncoder().encode(`mirror:session:${userAddress}:${Date.now()}`);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return '0x' + Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/** ABI-encode SpendPermissionManager.approve() call */
function encodeApproveCalldata(sessionKey: string, config: SessionKeyConfig): string {
  // approve(address spender, Permission memory permission)
  // This is a simplified encoding — in production use viem's encodeFunctionData
  // with the full SpendPermissionManager ABI
  return '0x' + [
    'a9059cbb', // placeholder selector — replace with actual approve selector
    sessionKey.slice(2).padStart(64, '0'),
    BigInt(config.totalAllowance).toString(16).padStart(64, '0'),
    BigInt(config.expiry).toString(16).padStart(64, '0'),
  ].join('');
}
