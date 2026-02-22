# Deploy Instructions (2 minutes)

## Option A: Vercel CLI (fastest)
```bash
cd /tmp/mirror-miniapp
vercel login          # log in with your Vercel account
vercel --prod         # deploy — URL returned immediately
```

## Option B: GitHub → Vercel (automatic)
1. Go to https://vercel.com/new
2. Import: github.com/BAiSEDagent/mirror-miniapp
3. Add env vars (from .env.example)
4. Deploy

## Required env vars (set in Vercel dashboard):
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
NEXT_PUBLIC_CDP_CLIENT_KEY=        # https://portal.cdp.coinbase.com/
NEXT_PUBLIC_PAYMASTER_URL=         # optional (gasless)
FARCASTER_HEADER=                  # run: npx create-onchain --manifest
FARCASTER_PAYLOAD=
FARCASTER_SIGNATURE=
NEYNAR_API_KEY=                    # https://dev.neynar.com/
ALCHEMY_API_KEY=                   # https://dashboard.alchemy.com/
X402_FACILITATOR_URL=https://x402.org/facilitate
MIRROR_TREASURY_ADDRESS=0xYourTreasury

## After deploy:
# 1. Update NEXT_PUBLIC_APP_URL to your real Vercel URL
# 2. Run: npx create-onchain --manifest (generates Farcaster JFS for that domain)
# 3. Add FARCASTER_* vars to Vercel
# 4. Redeploy
# 5. Test manifest: curl https://your-domain/.well-known/farcaster.json
