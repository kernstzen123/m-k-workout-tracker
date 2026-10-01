import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Toaster } from "@/components/ui/Toaster";
import { AuthBoot } from "@/features/auth/AuthBoot";
import { PwaProvider } from "@/features/pwa/PwaProvider";
import { themeInitScript } from "@/features/settings/themeScript";
import "./globals.css";

const APP_NAME = "M&K Workout";

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
  description: "Our gym tracker: log workouts fast, progress steadily, works offline.",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: APP_NAME },
  formatDetection: { telephone: false },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#0b0d10",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-dvh antialiased">
        <PwaProvider>
          <AuthBoot />
          {children}
          <Toaster />
        </PwaProvider>
      </body>
    </html>
  );
}
