import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import type { ReactNode } from "react";
import { Toaster } from "@/components/ui/Toaster";
import { AuthBoot } from "@/features/auth/AuthBoot";
import { PwaProvider } from "@/features/pwa/PwaProvider";
import { MonitoringBoot } from "@/features/shell/MonitoringBoot";
import { themeInitScript } from "@/features/settings/themeScript";
import "./globals.css";

const APP_NAME = "M&K Workout";

// Self-hosted at build time by next/font — no runtime request to Google, works offline.
const barlow = Barlow({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-barlow",
  display: "swap",
});
const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-barlow-condensed",
  display: "swap",
});

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
  description: "Our gym tracker: log workouts fast, progress steadily, works offline.",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: APP_NAME },
  formatDetection: { telephone: false },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#0a1612",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      data-theme="dark"
      className={`${barlow.variable} ${barlowCondensed.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      {/* Browser extensions (password managers, Grammarly…) often inject attributes on <body>. */}
      <body className="min-h-dvh antialiased" suppressHydrationWarning>
        <PwaProvider>
          <AuthBoot />
          <MonitoringBoot />
          {children}
          <Toaster />
        </PwaProvider>
      </body>
    </html>
  );
}
