/**
 * POST /api/auth
 * Sign-In With Farcaster (SIWF) verification endpoint.
 *
 * ANTI-SPOOFING: sdk.context.user.fid is client-controlled and UNTRUSTED.
 * This endpoint takes a SIWF message + signature and verifies it against
 * the Farcaster Hub to confirm the FID actually controls the claimed address.
 *
 * Flow:
 * 1. Client calls sdk.actions.signIn() → receives { message, signature }
 * 2. Client POSTs { message, signature } here
 * 3. Server verifies via Farcaster Hub /validateMessage
 * 4. Returns { verified: true, fid, address } if valid
 * 5. Client stores a server-issued session token for subsequent requests
 *
 * Only call this before privileged operations (accessing x402-gated content,
 * premium features, etc.). Basic trade feed is public.
 */

import { type NextRequest, NextResponse } from 'next/server';
import { verifySIWF } from '@/lib/farcaster';

export async function POST(req: NextRequest) {
  let body: { message: string; signature: string; fid?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { message, signature, fid: claimedFid } = body;

  if (!message || !signature) {
    return NextResponse.json({ error: 'message and signature required' }, { status: 400 });
  }

  const { verified, fid } = await verifySIWF(message, signature);

  if (!verified || !fid) {
    return NextResponse.json(
      { verified: false, error: 'FID verification failed — signature invalid or hub unreachable' },
      { status: 401 }
    );
  }

  // SECURITY: If client also sent a claimed FID, ensure it matches verified FID
  if (claimedFid && claimedFid !== fid) {
    return NextResponse.json(
      { verified: false, error: 'FID mismatch — spoofing attempt rejected' },
      { status: 401 }
    );
  }

  // Issue a simple session token (JWT in production — use jose or next-auth)
  const sessionToken = Buffer.from(JSON.stringify({
    fid,
    iat: Date.now(),
    exp: Date.now() + 24 * 60 * 60 * 1000, // 24h
  })).toString('base64');

  return NextResponse.json({
    verified: true,
    fid,
    sessionToken,
  });
}

export const runtime = 'edge';
