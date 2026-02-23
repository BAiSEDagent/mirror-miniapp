const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;
const NEYNAR_BASE = 'https://api.neynar.com/v2';

export async function getUserFollowing(fid: number) {
  const res = await fetch(`${NEYNAR_BASE}/farcaster/following?fid=${fid}&limit=100`, {
    headers: { 'api-key': NEYNAR_API_KEY! }
  });
  
  if (!res.ok) throw new Error(`Neynar error: ${res.status}`);
  
  const data = await res.json();
  return data.users.map((u: any) => ({
    fid: u.user.fid,
    username: u.user.username,
    displayName: u.user.display_name,
    pfp: u.user.pfp_url,
    // Try to get custody address or verified address
    address: u.user.custody_address || u.user.verifications?.[0],
  })).filter((u: any) => u.address);
}

export async function getUserByUsername(username: string) {
  const res = await fetch(`${NEYNAR_BASE}/farcaster/user/search?q=${username}&limit=1`, {
    headers: { 'api-key': NEYNAR_API_KEY! }
  });
  
  if (!res.ok) return null;
  
  const data = await res.json();
  return data.result?.users?.[0];
}