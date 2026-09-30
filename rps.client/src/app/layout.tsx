import type { Metadata } from "next";
import { Geist, Geist_Mono, Press_Start_2P } from "next/font/google";
import "./globals.css";
import { SocketProvider } from "@/components/providers/SocketProvider";
import { AuthProvider } from "@/components/providers/AuthProvider";
import I18nProvider from "@/components/providers/I18nProvider";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import AppShell from "@/components/layout/AppShell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
        className={`${geistSans.variable} ${geistMono.variable} ${pixelFont.variable} antialiased`}
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

