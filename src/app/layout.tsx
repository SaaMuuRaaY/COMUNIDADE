import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { CookieConsent } from "@/components/shared/cookie-consent";
import { BOOT_SCRIPT } from "@/components/nexus/theme-constants";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Portal Nexus",
    template: "%s · Portal Nexus",
  },
  description:
    "Comunidade · Cursos · Recursos · Apps · Eventos · Gamificação. Plataforma própria para sua audiência.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      data-theme="dark"
      data-style="refined"
      data-density="comfortable"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: BOOT_SCRIPT }} />
      </head>
      <body className="min-h-full bg-background text-foreground">
        {children}
        <CookieConsent />
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
