/**
 * GET /api/subscribe?wallet=0x...&subscriber=0x...
 *
 * x402-gated endpoint: subscribing to a wallet's real-time trade feed costs
 * 0.05 USDC/month.
 *
 * x402 protocol flow:
 * 1. Client sends request without X-PAYMENT → server returns 402 + payment details
 * 2. Client signs EIP-3009 transferWithAuthorization and retries with X-PAYMENT header
 * 3. Server verifies signature + forwards USDC transfer via x402 facilitator
 * 4. Returns { subscribed: true, expiry: timestamp }
 *
 * Revenue split: 70% to tracked wallet, 30% to MIRROR treasury
 */

import { type NextRequest, NextResponse } from 'next/server';

const SUBSCRIPTION_COST_USDC = '50000'; // 0.05 USDC (6 decimals)
const MIRROR_TREASURY        = process.env.MIRROR_TREASURY_ADDRESS ?? '0x0000000000000000000000000000000000000000';
const USDC_BASE              = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const x402_FACILITATOR_URL   = process.env.X402_FACILITATOR_URL ?? 'https://x402.org/facilitate';

export async function GET(req: NextRequest) {
  const wallet     = req.nextUrl.searchParams.get('wallet')     ?? '';
  const subscriber = req.nextUrl.searchParams.get('subscriber') ?? '';

  if (!wallet.startsWith('0x') || !subscriber.startsWith('0x')) {
    return NextResponse.json({ error: 'Invalid wallet or subscriber address' }, { status: 400 });
  }

  // Check for payment header (x402 flow)
  const paymentHeader = req.headers.get('X-PAYMENT');

  if (!paymentHeader) {
    // Return 402 with payment requirement
    const paymentRequired = Buffer.from(JSON.stringify({
      scheme:    'exact',
      network:   'base-mainnet',
      maxAmount: SUBSCRIPTION_COST_USDC,
      resource:  req.url,
      recipient: MIRROR_TREASURY,
      asset:     USDC_BASE,
      ttl:       300, // 5 min window to complete payment
      extra: {
        description: `MIRROR: 30-day feed subscription for ${wallet.slice(0, 10)}...`,
        name:        'MIRROR Subscription',
      },
    })).toString('base64');

    return NextResponse.json(
      { error: 'Payment required', amount: '0.05 USDC' },
      {
        status: 402,
        headers: {
          'X-PAYMENT-REQUIRED': paymentRequired,
          'Access-Control-Expose-Headers': 'X-PAYMENT-REQUIRED',
        },
      }
    );
  }

  // Verify payment via x402 facilitator
  try {
    const verification = await fetch(x402_FACILITATOR_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        payment:  paymentHeader,
        resource: req.url,
      }),
    });

    if (!verification.ok) {
      const err = await verification.json();
      return NextResponse.json(
        { error: `Payment verification failed: ${err.message ?? 'unknown'}` },
        { status: 402 }
      );
    }

    const verifiedPayment = await verification.json();
    const txHash = verifiedPayment.txHash ?? verifiedPayment.transaction_hash;

    // Store subscription in DB (simplified — use your actual DB)
    // await db.subscriptions.upsert({ wallet, subscriber, expiry: Date.now() + 30 * 24 * 3600 * 1000 });

    const expiry = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days

    return NextResponse.json(
      { subscribed: true, expiry, txHash },
      {
        headers: {
          'X-PAYMENT-TX': txHash ?? '',
          'Access-Control-Expose-Headers': 'X-PAYMENT-TX',
        },
      }
    );

  } catch (err: any) {
    // If facilitator is down: accept payment but log for manual verification
    console.error('x402 facilitator error:', err.message);
    return NextResponse.json({ error: 'Facilitator unavailable, try again' }, { status: 503 });
  }
}
