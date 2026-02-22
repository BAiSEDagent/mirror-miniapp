/**
 * Dynamic OG Image — Cinematic Industrial aesthetic
 * Served at /api/og (and can be used for og.png, icon.png, etc.)
 *
 * Uses Next.js ImageResponse (@vercel/og) for edge-rendered images.
 * Reference in minikit.config.ts:
 *   ogImageUrl: `${ROOT_URL}/api/og`
 *   iconUrl:    `${ROOT_URL}/api/og?type=icon`
 *   splashImageUrl: `${ROOT_URL}/api/og?type=splash`
 */

import { ImageResponse } from 'next/og';
import { type NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get('type') ?? 'og';

  if (type === 'icon') {
    // 512x512 icon
    return new ImageResponse(
      (
        <div
          style={{
            width: '512px', height: '512px',
            background: '#000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'monospace',
            position: 'relative',
          }}
        >
          {/* Corner marks */}
          <div style={{ position: 'absolute', top: 20, left: 20, width: 24, height: 3, background: '#f59e0b', opacity: 0.5, display: 'flex' }} />
          <div style={{ position: 'absolute', top: 20, left: 20, width: 3, height: 24, background: '#f59e0b', opacity: 0.5, display: 'flex' }} />
          <div style={{ position: 'absolute', top: 20, right: 20, width: 24, height: 3, background: '#f59e0b', opacity: 0.5, display: 'flex' }} />
          <div style={{ position: 'absolute', top: 20, right: 20, width: 3, height: 24, background: '#f59e0b', opacity: 0.5, display: 'flex' }} />
          <div style={{ position: 'absolute', bottom: 20, left: 20, width: 24, height: 3, background: '#f59e0b', opacity: 0.5, display: 'flex' }} />
          <div style={{ position: 'absolute', bottom: 20, left: 20, width: 3, height: 24, background: '#f59e0b', opacity: 0.5, display: 'flex' }} />
          <div style={{ position: 'absolute', bottom: 20, right: 20, width: 24, height: 3, background: '#f59e0b', opacity: 0.5, display: 'flex' }} />
          <div style={{ position: 'absolute', bottom: 20, right: 20, width: 3, height: 24, background: '#f59e0b', opacity: 0.5, display: 'flex' }} />
          {/* Logo */}
          <div style={{ fontSize: 280, fontWeight: 800, color: '#f59e0b', letterSpacing: '-12px', display: 'flex' }}>
            M
          </div>
        </div>
      ),
      { width: 512, height: 512 }
    );
  }

  if (type === 'splash') {
    // 200x200 splash
    return new ImageResponse(
      (
        <div
          style={{
            width: '200px', height: '200px',
            background: '#000',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          <div style={{ fontSize: 80, fontWeight: 800, color: '#f59e0b', display: 'flex' }}>M</div>
          <div style={{ fontSize: 12, fontWeight: 400, color: '#f59e0b', opacity: 0.6, letterSpacing: '6px', display: 'flex' }}>
            MIRROR
          </div>
        </div>
      ),
      { width: 200, height: 200 }
    );
  }

  // Default: OG image 1200x630
  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px', height: '630px',
          background: '#000',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '60px',
          fontFamily: 'monospace',
          position: 'relative',
        }}
      >
        {/* Amber scan line */}
        <div style={{
          position: 'absolute', top: 0, left: 0,
          width: '100%', height: '2px',
          background: 'linear-gradient(90deg, transparent, #f59e0b, transparent)',
          display: 'flex',
        }} />

        {/* Top row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ fontSize: 14, color: '#f59e0b', letterSpacing: '4px', display: 'flex' }}>
            MIRROR
          </div>
          <div style={{ width: 1, height: 14, background: '#222', display: 'flex' }} />
          <div style={{ fontSize: 12, color: '#444', letterSpacing: '2px', display: 'flex' }}>
            SOCIAL COPY TRADE
          </div>
        </div>

        {/* Center */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ fontSize: 72, fontWeight: 700, color: '#f5f5f5', lineHeight: 1, display: 'flex' }}>
            One tap.
          </div>
          <div style={{ fontSize: 72, fontWeight: 700, color: '#f59e0b', lineHeight: 1, display: 'flex' }}>
            One trade.
          </div>
          <div style={{ fontSize: 24, color: '#666', letterSpacing: '1px', display: 'flex' }}>
            Copy trades from wallets you follow — gasless, instant.
          </div>
        </div>

        {/* Bottom row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', gap: '24px' }}>
            {['Base', 'Farcaster', 'x402'].map(tag => (
              <div key={tag} style={{
                padding: '6px 16px',
                border: '1px solid #1a1a1a',
                color: '#444',
                fontSize: 13,
                letterSpacing: '2px',
                display: 'flex',
              }}>
                {tag}
              </div>
            ))}
          </div>
          <div style={{ fontSize: 12, color: '#222', letterSpacing: '2px', display: 'flex' }}>
            BY BAISED
          </div>
        </div>

        {/* Bottom amber line */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0,
          width: '100%', height: '2px',
          background: 'linear-gradient(90deg, transparent, #f59e0b, transparent)',
          display: 'flex',
        }} />
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
