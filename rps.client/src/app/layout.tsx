import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SocketProvider } from "@/components/providers/SocketProvider";
import { AuthProvider } from "@/components/providers/AuthProvider";
import I18nProvider from "@/components/providers/I18nProvider";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RPS Battle",
  description: "Real-time Rock-Paper-Scissors Game",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <I18nProvider>
          <SocketProvider>
            <AuthProvider>
              <div className="fixed top-4 right-4 z-50">
                <LanguageSwitcher />
              </div>
              {children}
            </AuthProvider>
          </SocketProvider>
        </I18nProvider>
      </body>
    </html>
  );
}

