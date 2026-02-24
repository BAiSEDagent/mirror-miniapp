# MIRROR Fix Plan — Get It Working End-to-End

**Goal:** Ship a working product to Base App

**Current blocker:** App stuck on "CONNECTING_HOST_WALLET" — needs fallback for local dev testing

---

## Step 1: Add Standalone Wallet Connect Fallback (30 min)

When MiniKit isn't available (browser), fall back to ConnectKit/RainbowKit:

```tsx
// app/page.tsx
const initProvider = async () => {
  try {
    // Try MiniKit first (Base App / Warpcast)
    const p = await getProvider();
    setProvider(p);
    setMode('minikit');
  } catch {
    // Fallback: regular Web3 (ConnectKit)
    setMode('standalone');
  }
}
```

This lets us:
- Test the full copy-trade flow in dev (`npm run dev`)
- Debug API endpoints without Base App
- Build confidence before submitting

---

## Step 2: Fix Trade Feed Data Source (15 min)

Current: hardcoded demo wallets (vitalik, jesse, punk6529)

Issue: `fetchRecentTrades()` needs a real Alchemy implementation

**Fix:** Wire `lib/trades.ts` to actually call Alchemy's `alchemy_getAssetTransfers`

---

## Step 3: Test Locally (1 hour)

1. `npm run dev`
2. Connect wallet (via fallback)
3. Verify trade feed loads
4. Click "MIRROR" on a trade
5. Confirm approve + swap calldata is built
6. Sign the tx (testnet)
7. Verify on BaseScan

**Success criteria:** One complete copy-trade flow from feed → calldata → signed tx

---

## Step 4: Test in Base App (30 min)

Once Step 3 passes:

1. Push to Vercel
2. Open Base App on mobile
3. Navigate to mirror-miniapp.vercel.app
4. Verify MiniKit provider connects
5. Execute one copy trade
6. Confirm wallet_sendCalls batches approve + swap

**Success criteria:** One-tap copy trade works inside Base App

---

## Step 5: Publish (15 min)

Post to Base App with URL:

> "MIRROR — one-tap copy trades from wallets you follow. Built on @base with MiniKit. Try it: https://mirror-miniapp.vercel.app"

Monitor for:
- Install count
- Error reports
- Copy trade volume

---

## Time estimate: ~2.5 hours to shipped product

**Priority:** Step 1 (fallback) unlocks everything else. Start there.
