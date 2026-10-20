import type { Metadata, Viewport } from "next";
import "@fontsource-variable/cairo/wght.css";
import "@fontsource/aref-ruqaa/arabic-400.css";
import "./globals.css";
import { AppProviders } from "@/components/providers/AppProviders";
import { MotionProvider } from "@/components/motion/MotionProvider";
import { themeScript } from "@/components/layout/ThemeToggle";
import { siteUrl } from "@/lib/env";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "ورشتي | هانديمارت للبائعين", template: "%s | ورشتي على هانديمارت" },
  description: "لوحة البائع على هانديمارت: الطلبات والقطع والمحفظة في مكان واحد.",
  applicationName: "هانديمارت للبائعين",
  formatDetection: { telephone: false },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f1e5" },
    { media: "(prefers-color-scheme: dark)", color: "#150a18" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <MotionProvider>
          <AppProviders>{children}</AppProviders>
        </MotionProvider>
      </body>
    </html>
  );
}
