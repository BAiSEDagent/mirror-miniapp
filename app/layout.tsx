import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import { minikitConfig } from '@/minikit.config';

const { miniapp } = minikitConfig;

export const metadata: Metadata = {
  title:       'MIRROR — Social Copy Trade',
  description: miniapp.description,
  openGraph: {
    title:       miniapp.ogTitle,
    description: miniapp.ogDescription,
    images:      [{ url: miniapp.ogImageUrl, width: 1200, height: 630 }],
  },
  other: {
    /**
     * fc:miniapp — Feb 2026 spec
     * Controls how MIRROR appears as an embed in Warpcast / Base App feeds.
     */
    'fc:miniapp': JSON.stringify({
      version:  miniapp.version,
      imageUrl: miniapp.ogImageUrl,
      button: {
        title:  'Open MIRROR',
        action: {
          type:                 'launch_frame',
          name:                 miniapp.name,
          url:                  miniapp.homeUrl,
          splashImageUrl:       miniapp.splashImageUrl,
          splashBackgroundColor: miniapp.splashBackgroundColor,
        },
      },
    }),
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
        <meta name="base:app_id" content="699b75aceb8da8c3b3d7b174" />
      </head>
      <body className="bg-void text-primary font-mono min-h-screen overflow-x-hidden">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
