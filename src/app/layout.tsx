import type { Metadata, Viewport } from "next";
import ErrorBoundary from "@/components/ErrorBoundary";
import "./globals.css";

export const metadata: Metadata = {
  title: "SkyWay - Live Flight Tracker",
  description: "Real-time global flight tracking",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SkyWay",
  },
  manifest: "/manifest.json",
  other: {
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0A0A0F",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" style={{ height: "100%", background: "#0A0A0F" }}>
      <head>
        <link rel="apple-touch-icon" href="/icon-180.png" />
        <style dangerouslySetInnerHTML={{ __html: `
          html, body {
            background: #0A0A0F !important;
            color: #FFFFFF !important;
            font-family: -apple-system, "SF Pro Display", "SF Pro Text", system-ui, sans-serif !important;
            -webkit-font-smoothing: antialiased !important;
            margin: 0 !important; padding: 0 !important;
            overflow: hidden; height: 100%; width: 100%;
          }
          * { -webkit-font-smoothing: antialiased; box-sizing: border-box;
              -webkit-tap-highlight-color: transparent; }
        `}} />
      </head>
      <body style={{
        background: "#0A0A0F", color: "#FFFFFF",
        fontFamily: "-apple-system, 'SF Pro Display', 'SF Pro Text', system-ui, sans-serif",
        margin: 0, height: "100%", width: "100%", overflow: "hidden",
      }}>
        <ErrorBoundary>{children}</ErrorBoundary>
      </body>
    </html>
  );
}
