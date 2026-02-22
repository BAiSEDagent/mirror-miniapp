# MIRROR — Social Copy Trade Mini App

> Cinematic Industrial aesthetic. One-tap copy trades. Gasless. No popups.

Built on Base. Powered by Farcaster MiniKit. Integrated with x402 USDC micropayments.

---

## Architecture

```
MIRROR
├── app/                        Next.js 15 App Router
│   ├── page.tsx                Main app — feed + session key flow
│   ├── layout.tsx              fc:miniapp meta tag, OnchainKitProvider
│   ├── providers.tsx           Wagmi + OnchainKit + miniKit:{enabled:true}
│   ├── .well-known/
│   │   └── farcaster.json/     Mini App manifest (miniapp key, eip155:8453)
│   └── api/
│       ├── feed/               GET wallet trade history
│       ├── copy/               POST build approve+swap calldata
│       ├── subscribe/          GET x402-gated wallet feed subscription
│       ├── wallet/             GET wallet → Farcaster profile resolution
│       ├── auth/               POST SIWF verification (anti-spoofing)
│       ├── webhook/            POST Farcaster lifecycle events
│       └── session-key/
│           └── validate/       GET SpendPermissionManager session check
├── components/
│   ├── Header.tsx              Nav + session status + identity
│   ├── TradeFeed.tsx           Live trade feed with copy buttons
│   ├── TradeCard.tsx           Individual trade display + MIRROR button
│   ├── SessionKeyBanner.tsx    One-time session key approval CTA
│   └── WalletTracker.tsx       x402-gated wallet subscription manager
└── lib/
    ├── minikit.ts              getProvider, sendBatchCalls (EIP-5792), composeCast
    ├── x402.ts                 x402Fetch, buildX402Signer (EIP-3009/EIP-6492)
    ├── session-keys.ts         requestSessionKey (SpendPermissionManager)
    ├── farcaster.ts            FID resolution, SIWF verification (anti-spoofing)
    └── trades.ts               Alchemy trade history fetcher
```

---

## Step 3: Deep Security Audit

### ✅ Signature Validation — EIP-6492 Compatibility

**Location:** `lib/x402.ts` → `buildX402Signer()`

```typescript
// eth_signTypedData_v4 with EIP-3009 TypedData
// EIP-6492: smart wallet signatures are wrapped with a counterfactual
// deployment prefix when the wallet hasn't been deployed yet.
// Base Account SDK handles EIP-6492 wrapping transparently.
const sig = await provider.request({
  method: 'eth_signTypedData_v4',
  params: [address, JSON.stringify(typedData)],
});
```

Base Accounts implement EIP-6492 as documented in [Base Account docs](https://docs.base.org/identity/smart-wallet/).
The host wallet (Coinbase Wallet Smart Wallet) unwraps EIP-6492 signatures automatically when
`wallet_sendCalls` is used with an atomicBatch capability.

**FINDING:** x402 payment signature is EIP-3009 `TransferWithAuthorization` with
EIP-712 typed data. Smart wallet hosts must support `eth_signTypedData_v4`.
The fallback x402 facilitator verifies signatures on-chain — no custom validation needed client-side.

---

### ✅ Permission Scoping — Session Key Allowances

**Location:** `lib/session-keys.ts` → `requestSessionKey()`  
**Verification:** `app/api/session-key/validate/route.ts`

```typescript
permissions: [{
  type: 'native-token-recurring-allowance',
  data: {
    token:           USDC_BASE,         // LOCKED: USDC only
    allowance:       config.totalAllowance, // $50 max total
    period:          86400,             // 24h rolling window
    allowedContract: UNISWAP_UNIVERSAL_ROUTER, // LOCKED: Uniswap only
  },
}],
expiry: config.expiry, // 24h from grant
```

**Enforced constraints:**
- `token` = USDC on Base only — no ETH drain risk
- `allowedContract` = Uniswap v3 Universal Router only — no arbitrary contract calls
- `expiry` = 24h hard limit — no infinite sessions
- `totalAllowance` = $50 per session — capped regardless of trading activity
- Per-trade server cap: `MAX_ORDER_USD = 5` in `/api/copy/route.ts`

Server validates these on-chain via `SpendPermissionManager.getPermission()` before honoring any session.

---

### ✅ Anti-Spoofing — FID Verification

**Location:** `lib/farcaster.ts` → `verifySIWF()`  
**Endpoint:** `app/api/auth/route.ts`

**Risk:** `sdk.context.user.fid` is passed from the host client via `postMessage`.
A malicious host or injected script can set any FID in context.

**Mitigation:**
```typescript
// app/page.tsx — we NEVER gate privileged actions on sdk.context.user.fid directly
// All sensitive operations require eth_requestAccounts → verified address
const accounts: string[] = await p.request({ method: 'eth_requestAccounts' });
if (accounts[0]) setUserAddress(accounts[0]);

// app/api/auth/route.ts — FID must match hub-verified signature
if (claimedFid && claimedFid !== fid) {
  return 401 // FID mismatch — spoofing attempt rejected
}
```

For premium features, the app calls `/api/auth` with a SIWF `{ message, signature }` from
`sdk.actions.signIn()`. The server verifies this against the Farcaster Hub
(`/v1/validateMessage`) before issuing a session token. This proves the signer controls
the FID's key — a spoofed FID cannot forge a valid hub-verified signature.

---

### ✅ Error Handling — Graceful Capability Degradation

**Location:** `app/page.tsx`, `lib/minikit.ts`

| Capability | Present | Absent |
|---|---|---|
| `wallet.getEthereumProvider` | Full trading UI | Read-only mode, warning shown |
| `wallet_sendCalls` (EIP-5792) | Single-tap batch | Sequential eth_sendTransaction |
| `wallet.addSessionKey` | Gasless session | Direct SpendPermissionManager tx |
| `actions.composeCast` | Share trade as cast | Silent no-op |
| `actions.addMiniApp` | Pin to launcher | Not shown |

```typescript
// lib/minikit.ts — EIP-5792 graceful fallback
try {
  const caps = await provider.request({ method: 'wallet_getCapabilities' });
  if (baseCaps?.sendCalls?.supported) {
    // Use wallet_sendCalls (one tap, gasless)
  }
} catch { /* fallback */ }

// Fallback: sequential eth_sendTransaction (N wallet popups)
for (const call of calls) { /* ... */ }
```

The app renders in `max-w-[424px] min-h-[695px]` modal-optimized dimensions per spec.
All errors surface as inline amber status messages — no crashes, no blank screens.

---

## Quick Deploy

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env.local
# Fill in CDP key, Neynar key, Alchemy key, Farcaster manifest

# 3. Generate Farcaster manifest association
npx create-onchain --manifest
# Copy FARCASTER_HEADER, FARCASTER_PAYLOAD, FARCASTER_SIGNATURE to .env.local

# 4. Deploy
vercel --prod
# Then set env vars in Vercel dashboard

# 5. Verify manifest
curl https://your-domain/.well-known/farcaster.json
```

## Monetization

| Action | Cost | Split |
|---|---|---|
| Track a wallet (real-time alerts) | 0.05 USDC/month | 70% → wallet owner, 30% → treasury |
| Copy a trade | Free | Session key covers gas |
| Premium AI signal | 0.10 USDC | 100% → treasury |

---

*Built by BAiSED — Principal Engineer, Base ecosystem*  
*Aesthetic: Cinematic Industrial — JetBrains Mono · Amber · Void Black*
