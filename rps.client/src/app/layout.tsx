import type { Metadata } from "next";
import localFont from "next/font/local";
import { Press_Start_2P } from "next/font/google";
import "./globals.css";
import { SocketProvider } from "@/components/providers/SocketProvider";
import { AuthProvider } from "@/components/providers/AuthProvider";
import I18nProvider from "@/components/providers/I18nProvider";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import AppShell from "@/components/layout/AppShell";

// Galmuri (SIL OFL 1.1, see fonts/Galmuri-LICENSE.txt) - pixel font with Hangul support
const pixelSans = localFont({
  variable: "--font-galmuri",
  src: [
    { path: "./fonts/Galmuri11.woff2", weight: "400" },
    { path: "./fonts/Galmuri11-Bold.woff2", weight: "700" },
  ],
});

const pixelMono = localFont({
  variable: "--font-galmuri-mono",
  src: "./fonts/GalmuriMono11.woff2",
});

// Latin-only pixel font for the battle screen (.font-pixel)
const pixelFont = Press_Start_2P({
  variable: "--font-pixel",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RPS Battle",
  description: "Real-time Rock-Paper-Scissors Game",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#030712", // gray-950
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${pixelSans.variable} ${pixelMono.variable} ${pixelFont.variable}`}
      >
        <I18nProvider>
          <SocketProvider>
            <AuthProvider>

              <AppShell>
                {children}
              </AppShell>
            </AuthProvider>
          </SocketProvider>
        </I18nProvider>
      </body>
    </html>
  );
}

