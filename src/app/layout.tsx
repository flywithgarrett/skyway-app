import type { Metadata } from "next";
import ErrorBoundary from "@/components/ErrorBoundary";
import "./globals.css";

export const metadata: Metadata = {
  title: "SkyWay - Live Flight Tracker",
  description: "Real-time global flight tracking",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" style={{ height: "100%", background: "#0A0A0F" }}>
      <head>
        <style dangerouslySetInnerHTML={{ __html: `
          html, body {
            background: #0A0A0F !important;
            color: #FFFFFF !important;
            font-family: -apple-system, "SF Pro Display", "SF Pro Text", system-ui, sans-serif !important;
            -webkit-font-smoothing: antialiased !important;
            -moz-osx-font-smoothing: grayscale !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          * { -webkit-font-smoothing: antialiased; box-sizing: border-box; }
          body { min-height: 100vh; display: flex; flex-direction: column; }
        `}} />
      </head>
      <body style={{
        background: "#0A0A0F",
        color: "#FFFFFF",
        fontFamily: "-apple-system, 'SF Pro Display', 'SF Pro Text', system-ui, sans-serif",
        margin: 0,
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}>
        <ErrorBoundary>{children}</ErrorBoundary>
      </body>
    </html>
  );
}
