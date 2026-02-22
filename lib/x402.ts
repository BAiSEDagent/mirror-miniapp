/**
 * x402 USDC Micropayment Client
 *
 * Implements the x402 protocol for USDC micropayments gating premium features.
 *
 * Pricing tiers:
 * - Track a wallet:    0.05 USDC/month (subscription)
 * - Premium signal:   0.10 USDC per AI-ranked copy suggestion
 * - Streaming feed:   0.001 USDC/hr for real-time trade alerts (future)
 *
 * x402 flow:
 * 1. Client requests resource → server returns 402 with payment details
 * 2. Client constructs EIP-3009 authorization (transferWithAuthorization)
 * 3. Client sends X-PAYMENT header with signed auth
 * 4. Server verifies + facilitates USDC transfer → returns resource
 *
 * Session key integration:
 * Once a user grants a session key, subsequent payments happen
 * gaslessly without wallet popups — the session key signs on their behalf.
 */

export interface PaymentDetails {
  scheme:    'exact';
  network:   'base-mainnet' | 'base-sepolia';
  maxAmount: string; // USDC with 6 decimal places
  resource:  string;
  recipient: string;
  ttl:       number; // seconds
}

export interface X402Response<T> {
  data:    T | null;
  paid:    boolean;
  error:   string | null;
  txHash?: string;
}

/**
 * Make an x402-authenticated request.
 * Automatically handles the 402 → sign → retry flow.
 */
export async function x402Fetch<T>(
  url:      string,
  options:  RequestInit & { signer?: { signPayment: (details: PaymentDetails) => Promise<string> } },
): Promise<X402Response<T>> {
  // First attempt — try without payment
  const res = await fetch(url, options);

  if (res.status !== 402) {
    if (!res.ok) return { data: null, paid: false, error: `HTTP ${res.status}` };
    const data = await res.json() as T;
    return { data, paid: false, error: null };
  }

  // Parse payment requirement
  const paymentHeader = res.headers.get('X-PAYMENT-REQUIRED');
  if (!paymentHeader || !options.signer) {
    return { data: null, paid: false, error: 'Payment required but no signer provided' };
  }

  let details: PaymentDetails;
  try {
    details = JSON.parse(atob(paymentHeader));
  } catch {
    return { data: null, paid: false, error: 'Invalid payment requirement format' };
  }

  // Sign the payment authorization (EIP-3009 transferWithAuthorization)
  let signedPayment: string;
  try {
    signedPayment = await options.signer.signPayment(details);
  } catch (e: any) {
    return { data: null, paid: false, error: `Payment signing failed: ${e.message}` };
  }

  // Retry with payment header
  const paidRes = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers ?? {}),
      'X-PAYMENT': signedPayment,
      'Content-Type': 'application/json',
    },
  });

  if (!paidRes.ok) {
    return { data: null, paid: true, error: `Payment accepted but resource failed: HTTP ${paidRes.status}` };
  }

  const data = await paidRes.json() as T;
  const txHash = paidRes.headers.get('X-PAYMENT-TX') ?? undefined;
  return { data, paid: true, txHash, error: null };
}

/**
 * Build an x402 signer from a wallet provider (EIP-3009).
 * Uses EIP-6492 signatures for smart wallet compatibility.
 */
export function buildX402Signer(address: string, provider: any) {
  return {
    signPayment: async (details: PaymentDetails): Promise<string> => {
      const nonce = crypto.getRandomValues(new Uint8Array(32));
      const nonceHex = Array.from(nonce).map(b => b.toString(16).padStart(2, '0')).join('');

      const validAfter  = BigInt(Math.floor(Date.now() / 1000) - 30);
      const validBefore = BigInt(Math.floor(Date.now() / 1000) + details.ttl);

      // EIP-712 TypedData for transferWithAuthorization
      const typedData = {
        types: {
          EIP712Domain: [
            { name: 'name',              type: 'string'  },
            { name: 'version',           type: 'string'  },
            { name: 'chainId',           type: 'uint256' },
            { name: 'verifyingContract', type: 'address' },
          ],
          TransferWithAuthorization: [
            { name: 'from',        type: 'address' },
            { name: 'to',         type: 'address' },
            { name: 'value',      type: 'uint256' },
            { name: 'validAfter', type: 'uint256' },
            { name: 'validBefore',type: 'uint256' },
            { name: 'nonce',      type: 'bytes32' },
          ],
        },
        primaryType: 'TransferWithAuthorization',
        domain: {
          name:              'USD Coin',
          version:           '2',
          chainId:           8453, // Base mainnet
          verifyingContract: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC on Base
        },
        message: {
          from:        address,
          to:          details.recipient,
          value:       details.maxAmount,
          validAfter:  validAfter.toString(),
          validBefore: validBefore.toString(),
          nonce:       `0x${nonceHex}`,
        },
      };

      // eth_signTypedData_v4 — EIP-6492 compatible for smart wallets
      const sig = await provider.request({
        method: 'eth_signTypedData_v4',
        params: [address, JSON.stringify(typedData)],
      });

      return btoa(JSON.stringify({
        authorization: typedData.message,
        signature:     sig,
        chainId:       8453,
      }));
    },
  };
}
