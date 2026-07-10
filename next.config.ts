import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
let supabaseHost = "";
try {
  if (supabaseUrl) supabaseHost = new URL(supabaseUrl).hostname;
} catch {
  supabaseHost = "";
}

const isDev = process.env.NODE_ENV !== "production";

// Hosts de embed permitidos (alinhados a SAFE_EMBED_HOSTS em src/lib/constants.ts).
const frameSrc = [
  "'self'",
  "https://www.youtube.com",
  "https://youtube.com",
  // Modo de privacidade avancada: sem cookies de rastreamento antes do play.
  "https://www.youtube-nocookie.com",
  "https://youtube-nocookie.com",
  "https://player.vimeo.com",
  "https://vimeo.com",
  "https://www.loom.com",
  "https://loom.com",
  "https://docs.google.com",
  "https://codepen.io",
  "https://codesandbox.io",
  "https://github.com",
].join(" ");

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "form-action 'self'",
  // Next injeta scripts/estilos inline; sem nonce mantemos 'unsafe-inline'.
  // https://www.youtube.com: SCRIPT da IFrame Player API (detecta o fim do video de
  // boas-vindas). Host especifico, sem wildcard. O PLAYER segue em nocookie.
  `script-src 'self' 'unsafe-inline' https://www.youtube.com${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https: wss:",
  `frame-src ${frameSrc}`,
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: __dirname,
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        source: "/admin/:path*",
        headers: [{ key: "Cache-Control", value: "no-store, max-age=0" }],
      },
    ];
  },
  images: {
    remotePatterns: [
      ...(supabaseHost
        ? [
            {
              protocol: "https" as const,
              hostname: supabaseHost,
              pathname: "/storage/v1/object/**",
            },
          ]
        : []),
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/**",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        pathname: "/storage/v1/object/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        pathname: "/storage/v1/object/**",
      },
    ],
    dangerouslyAllowLocalIP: true,
  },
};

// "standalone" só no build Docker (Hetzner). No Vercel usamos o build padrão.
if (process.env.DOCKER_BUILD === "1") {
  nextConfig.output = "standalone";
}

export default nextConfig;
