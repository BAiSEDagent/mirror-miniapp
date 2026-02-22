/**
 * POST /api/webhook
 * Farcaster Mini App webhook — receives host lifecycle events:
 *
 * Events:
 * - miniapp_added:             user pinned MIRROR to their launcher
 * - miniapp_removed:           user removed MIRROR
 * - notifications_enabled:     user opted into push alerts
 * - notifications_disabled:    user opted out
 *
 * Payload is signed by the Farcaster hub using a JFS signature.
 * SECURITY: Verify the signature before acting on any event.
 */

import { type NextRequest, NextResponse } from 'next/server';

interface WebhookEvent {
  event:    'miniapp_added' | 'miniapp_removed' | 'notifications_enabled' | 'notifications_disabled';
  fid:      number;
  token?:   string; // notification token (for push)
  url?:     string; // notification endpoint
}

export async function POST(req: NextRequest) {
  let body: WebhookEvent;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { event, fid, token, url } = body;

  // TODO: Verify JFS signature from Farcaster hub before trusting FID
  // const sig = req.headers.get('X-Farcaster-Signature');
  // const valid = await verifyWebhookSignature(sig, body);
  // if (!valid) return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });

  switch (event) {
    case 'miniapp_added':
      console.log(`MIRROR: user fid=${fid} added the mini app`);
      // Store token for notifications if provided
      break;

    case 'miniapp_removed':
      console.log(`MIRROR: user fid=${fid} removed the mini app`);
      // Clean up notification subscriptions
      break;

    case 'notifications_enabled':
      console.log(`MIRROR: fid=${fid} enabled notifications, token=${token}, url=${url}`);
      // Store { fid, token, url } for push delivery
      break;

    case 'notifications_disabled':
      console.log(`MIRROR: fid=${fid} disabled notifications`);
      // Remove stored notification tokens
      break;

    default:
      // Unknown event — log and ignore (forward compat)
      console.log(`MIRROR: unknown webhook event:`, event);
  }

  return NextResponse.json({ ok: true });
}
