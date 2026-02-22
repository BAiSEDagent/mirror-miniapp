import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://mirror.baised.xyz';

export const metadata: Metadata = {
  title: 'MIRROR — Social Copy Trade',
  description: 'One-tap copy trades from wallets you follow on Farcaster. Powered by Base.',
  openGraph: {
    title: 'MIRROR',
    description: 'One-tap copy trades. Zero gas. Zero popups.',
    images: [{ url: `${APP_URL}/og.png`, width: 1200, height: 630 }],
  },
  other: {
    /**
     * fc:miniapp — Feb 2026 spec (replaces fc:frame for Mini App embeds)
     * Shows a "Launch" button in feed previews inside Warpcast/Base App.
     * fc:frame kept below for Frames v1 backwards compat.
     */
    'fc:miniapp': JSON.stringify({
      version:  '1',
      imageUrl: `${APP_URL}/og.png`,
      button: {
        title:  'Open MIRROR',
        action: {
          type: 'launch_frame',
          name: 'MIRROR',
          url:  APP_URL,
          splashImageUrl:         `${APP_URL}/splash.png`,
          splashBackgroundColor:  '#000000',
        },
      },
    }),
    // Backwards compat
    'fc:frame':          'vNext',
    'fc:frame:image':    `${APP_URL}/og.png`,
    'fc:frame:button:1': 'Open MIRROR',
    'fc:frame:button:1:action': 'link',
    'fc:frame:button:1:target': APP_URL,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="scanlines">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="theme-color" content="#000000" />
      </head>
      <body className="bg-void text-primary font-mono min-h-screen overflow-x-hidden">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
