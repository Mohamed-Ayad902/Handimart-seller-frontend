import type { NextConfig } from "next";
import { apiOrigin, appEnv, assertProductionConfig, imageHosts } from "./src/lib/env";
import { PUBLIC_MEDIA_FOLDERS } from "./src/lib/media";

assertProductionConfig();

/**
 * Media is uploaded to the API and served from its `/files/**`. Only the folders the backend
 * itself treats as public are proxied through this domain; private uploads (ID documents,
 * support attachments) arrive as short presigned links on their own host instead.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  // A signed-in tool: never indexed, in any environment.
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Firebase Analytics loads Google's tag and reports to Google Analytics; FCM registers push.
      "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com" + (process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""),
      "style-src 'self' 'unsafe-inline'",
      `img-src 'self' data: blob: https://*.google-analytics.com https://*.googletagmanager.com ${imageHosts.map((h) => `https://${h}`).join(" ")}`.trim(),
      "font-src 'self'",
      `media-src 'self' blob: ${imageHosts.map((h) => `https://${h}`).join(" ")}`.trim(),
      "connect-src 'self' https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://firebase.googleapis.com https://firebaseinstallations.googleapis.com https://fcmregistrations.googleapis.com",
      "worker-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  env: { NEXT_PUBLIC_APP_ENV: appEnv },
  agentRules: false,
  images: {
    formats: ["image/avif", "image/webp"],
    localPatterns: [...PUBLIC_MEDIA_FOLDERS.map((folder) => ({ pathname: `/files/${folder}/**` })), { pathname: "/brand/**" }],
    remotePatterns: imageHosts.map((hostname) => ({ protocol: "https" as const, hostname })),
    minimumCacheTTL: 60 * 60 * 24 * 7,
  },
  async rewrites() {
    return PUBLIC_MEDIA_FOLDERS.map((folder) => ({
      source: `/files/${folder}/:path*`,
      destination: `${apiOrigin}/files/${folder}/:path*`,
    }));
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
