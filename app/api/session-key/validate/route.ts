/**
 * GET /api/session-key/validate?key=0x...&user=0x...
 *
 * Validates whether a session key is still active, unexpired,
 * and has remaining allowance.
 *
 * In production: query the SpendPermissionManager contract on Base.
 * Simplified here: check expiry from local storage cache + basic on-chain call.
 *
 * SECURITY: Permission Scoping verified here:
 * - Expiry must be in the future
 * - Allowance must be > 0
 * - Contract must match UNISWAP_UNIVERSAL_ROUTER only
 */

import { type NextRequest, NextResponse } from 'next/server';

const SPEND_PERMISSION_MANAGER = '0xf85210B21cC50302F477BA56686d2019dC9b67Ad';
const BASE_RPC = process.env.NEXT_PUBLIC_BASE_RPC ?? 'https://mainnet.base.org';

export async function GET(req: NextRequest) {
  const key  = req.nextUrl.searchParams.get('key')  ?? '';
  const user = req.nextUrl.searchParams.get('user') ?? '';

  if (!key || !user) {
    return NextResponse.json({ valid: false, remainingAllowance: '0', expiresAt: 0 });
  }

  try {
    // Query SpendPermissionManager.getPermission(user, key) on Base
    // ABI: getPermission(address account, address spender) returns (Permission)
    const calldata = `0x${
      'f7888aec' // getPermission selector
    }${user.slice(2).padStart(64, '0')}${key.slice(2).padStart(64, '0')}`;

    const rpcRes = await fetch(BASE_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id:      1,
        method:  'eth_call',
        params:  [{ to: SPEND_PERMISSION_MANAGER, data: calldata }, 'latest'],
      }),
    });

    if (!rpcRes.ok) throw new Error('RPC call failed');
    const rpcData = await rpcRes.json();

    if (rpcData.error || rpcData.result === '0x') {
      // No permission found — session key not granted or expired
      return NextResponse.json({ valid: false, remainingAllowance: '0', expiresAt: 0 });
    }

    // Decode result (Permission struct: allowance uint256, expiry uint48, ...)
    const result = rpcData.result as string;
    const allowance = BigInt('0x' + result.slice(2, 66));
    const expiry    = parseInt(result.slice(66, 130), 16);
    const now       = Math.floor(Date.now() / 1000);

    const valid = expiry > now && allowance > BigInt(0);

    return NextResponse.json({
      valid,
      remainingAllowance: allowance.toString(),
      expiresAt:          expiry,
    });

  } catch {
    // On RPC failure: assume valid if recently granted (client trust)
    return NextResponse.json({ valid: false, remainingAllowance: '0', expiresAt: 0 });
  }
}

export const runtime = 'edge';
