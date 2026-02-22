/**
 * Farcaster Mini App Manifest — /.well-known/farcaster.json
 *
 * Per Feb 2026 Mini App spec:
 * - Root key is "miniapp" (not "frame")
 * - requiredChains uses CAIP-2 format: "eip155:8453" for Base mainnet
 * - requiredCapabilities: "wallet.getEthereumProvider", "actions.composeCast"
 * - accountAssociation must be a JSON-Farcaster Signature (JFS) tying this
 *   domain to a Farcaster account. Generate via Farcaster developer portal.
 *
 * To generate accountAssociation:
 *   npx create-onchain --manifest
 *   OR: https://warpcast.com/~/developers/mini-apps/manifest
 */

export async function GET() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://mirror.baised.xyz';

  return Response.json({
    // Domain → FID association (JSON-Farcaster Signature)
    // Generate with: npx create-onchain --manifest
    accountAssociation: {
      header:    process.env.FARCASTER_HEADER    ?? 'eyJhbGciOiJFUzI1NksiLCJ0eXAiOiJKV1QiLCJraWQiOiJKRlMifQ',
      payload:   process.env.FARCASTER_PAYLOAD   ?? 'REPLACE_WITH_DOMAIN_PAYLOAD',
      signature: process.env.FARCASTER_SIGNATURE ?? 'REPLACE_WITH_JFS_SIGNATURE',
    },

    // Mini App descriptor — "miniapp" key per Feb 2026 spec
    miniapp: {
      version:     '1',
      name:        'MIRROR',
      subtitle:    'Social Copy Trade',
      description: 'One-tap copy trades from wallets you follow on Farcaster. Gasless. No popups.',

      // Asset URLs — all must resolve to real images (PNG/JPG, not SVG for manifest)
      iconUrl:         `${appUrl}/icon.png`,
      homeUrl:         appUrl,
      splashImageUrl:  `${appUrl}/splash.png`,
      splashBackgroundColor: '#000000',

      // CAIP-2 chain identifiers
      requiredChains: ['eip155:8453'], // Base mainnet

      // Host capabilities this app requires
      requiredCapabilities: [
        'wallet.getEthereumProvider', // for swaps + approvals
      ],
      // Degrade gracefully if unavailable
      optionalCapabilities: [
        'actions.composeCast',   // share copied trade as cast
        'actions.addMiniApp',    // let users pin MIRROR
        'wallet.addSessionKey',  // gasless session keys
      ],

      // Tags for discovery indexing
      tags:            ['trading', 'defi', 'copy-trade', 'base', 'farcaster'],
      primaryCategory: 'finance',

      // Notification webhook — receives miniapp_added, notifications_enabled events
      webhookUrl: `${appUrl}/api/webhook`,
    },
  });
}
