/**
 * Farcaster Identity Utilities
 *
 * SECURITY: sdk.context (fid, username, pfp) is UNTRUSTED user-supplied data.
 * Any FID-gated action (premium feature access, wallet resolution) MUST
 * verify the FID against the Farcaster Hub before proceeding.
 *
 * Anti-spoofing strategy:
 * 1. Request sdk.actions.signIn() → receives a signed SIWF message
 * 2. Server verifies signature against Farcaster Hub /validateMessage
 * 3. Only then trust the FID for privileged operations
 *
 * Ref: https://docs.farcaster.xyz/reference/frames/actions#sign-in
 */

export interface FarcasterUser {
  fid:        number;
  username:   string;
  displayName: string;
  pfpUrl:     string;
  addresses:  string[]; // verified ETH addresses
  custody:    string;   // custody address
}

export interface SIWFResult {
  verified:  boolean;
  fid:       number | null;
  message:   string | null;
  signature: string | null;
}

const NEYNAR_API_BASE = 'https://api.neynar.com/v2';
const HUB_RPC         = process.env.NEYNAR_HUB_URL ?? 'https://hub-api.neynar.com';

/**
 * Resolve a Farcaster FID to verified ETH addresses.
 * Uses Neynar API — no local Hub required.
 */
export async function resolveFidToAddresses(fid: number): Promise<string[]> {
  const key = process.env.NEYNAR_API_KEY;
  if (!key) {
    // Fallback: use free Neynar tier (rate-limited)
    const res = await fetch(`${NEYNAR_API_BASE}/farcaster/user/bulk?fids=${fid}`, {
      headers: { api_key: 'NEYNAR_API_DOCS' }, // public demo key, rate-limited
    });
    if (!res.ok) return [];
    const data = await res.json();
    const user = data.users?.[0];
    return user?.verified_addresses?.eth_addresses ?? [];
  }

  const res = await fetch(`${NEYNAR_API_BASE}/farcaster/user/bulk?fids=${fid}`, {
    headers: { api_key: key },
  });
  if (!res.ok) return [];
  const data = await res.json();
  const user = data.users?.[0];
  return user?.verified_addresses?.eth_addresses ?? [];
}

/**
 * Fetch a Farcaster user's full profile by FID.
 */
export async function fetchFarcasterUser(fid: number): Promise<FarcasterUser | null> {
  const key = process.env.NEYNAR_API_KEY ?? 'NEYNAR_API_DOCS';
  try {
    const res = await fetch(`${NEYNAR_API_BASE}/farcaster/user/bulk?fids=${fid}`, {
      headers: { api_key: key },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const u = data.users?.[0];
    if (!u) return null;
    return {
      fid:         u.fid,
      username:    u.username,
      displayName: u.display_name,
      pfpUrl:      u.pfp_url,
      addresses:   u.verified_addresses?.eth_addresses ?? [],
      custody:     u.custody_address,
    };
  } catch {
    return null;
  }
}

/**
 * Verify a Sign-In With Farcaster (SIWF) message server-side.
 * MUST be called before trusting any FID from sdk.context.
 *
 * Anti-spoofing: The hub validates the signature against the key
 * registered for that FID on-chain. If verification fails, the FID
 * is being spoofed and must be rejected.
 */
export async function verifySIWF(
  message: string,
  signature: string,
): Promise<{ verified: boolean; fid: number | null }> {
  try {
    const res = await fetch(`${HUB_RPC}/v1/validateMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        ...(process.env.NEYNAR_API_KEY ? { api_key: process.env.NEYNAR_API_KEY } : {}),
      },
      body: hexToBytes(signature),
    });

    if (!res.ok) return { verified: false, fid: null };

    const data = await res.json();
    if (!data.valid) return { verified: false, fid: null };

    const fid = data.message?.data?.fid ?? null;
    return { verified: true, fid };
  } catch {
    return { verified: false, fid: null };
  }
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/^0x/, '');
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}
