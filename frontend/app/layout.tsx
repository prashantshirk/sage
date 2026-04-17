import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
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
  title: "Sage - Your Intelligent Life Operating System",
  description: "Sage is a comprehensive productivity dashboard that brings together your daily briefing, command center, finance tracker, and smart reminders in one elegant interface.",
  keywords: ["productivity", "dashboard", "AI assistant", "task management", "finance tracker"],
};

export const viewport: Viewport = {
  themeColor: "#d4a855",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark bg-background">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        {children}
        <Toaster 
          theme="dark" 
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'oklch(0.18 0.015 75)',
              border: '1px solid oklch(0.28 0.02 75)',
              color: 'oklch(0.95 0.02 85)',
            },
          }}
        />
      </body>
    </html>
  );
}
