# MIRROR — Deploy Checklist

## Step 1: Deploy to Vercel

```bash
cd /tmp/mirror-miniapp
vercel login          # your Vercel account
vercel --prod         # deploys, returns URL e.g. mirror-miniapp.vercel.app
```

Or via GitHub import: https://vercel.com/new → Import `BAiSEDagent/mirror-miniapp`

Set these env vars in Vercel dashboard (Settings → Environment Variables):

```
NEXT_PUBLIC_APP_URL          = https://mirror-miniapp.vercel.app   ← your actual URL
NEXT_PUBLIC_CDP_CLIENT_KEY   = ...  # https://portal.cdp.coinbase.com/
NEXT_PUBLIC_PAYMASTER_URL    = ...  # optional gasless (CDP Paymaster)
NEYNAR_API_KEY               = ...  # https://dev.neynar.com/
ALCHEMY_API_KEY              = ...  # https://dashboard.alchemy.com/
X402_FACILITATOR_URL         = https://x402.org/facilitate
MIRROR_TREASURY_ADDRESS      = 0x...  # your wallet
NEXT_PUBLIC_BASE_RPC         = https://mainnet.base.org
```

Redeploy after adding env vars.

---

## Step 2: Sign the Manifest

1. Go to → **https://www.base.dev/preview?tab=account**
2. Paste your Vercel URL in the **App URL** field → Submit
3. Sign with your Farcaster account
4. Copy the three values into Vercel env vars:
   ```
   FARCASTER_HEADER    = eyJ...
   FARCASTER_PAYLOAD   = eyJ...
   FARCASTER_SIGNATURE = 0x...
   ```
5. Redeploy: `vercel --prod`

---

## Step 3: Verify

```bash
# Manifest looks correct
curl https://your-domain/.well-known/farcaster.json | python3 -m json.tool

# OG image renders
open https://your-domain/api/og

# Icon renders
open https://your-domain/api/og?type=icon
```

---

## Step 4: Disable Vercel Auth (Required)

Vercel's Deployment Protection blocks the Farcaster hub from reading your manifest.

Vercel Dashboard → Settings → Deployment Protection → toggle **Vercel Authentication** OFF → Save

---

## Step 5: Submit for Discovery

Once live and manifest signed, submit at:
**https://www.base.dev/preview** (or Warpcast developer portal)

The mini app will appear in the Base App catalog once it has usage metrics.
