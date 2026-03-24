"use client";

import React from "react";

interface Props { children: React.ReactNode; }
interface State { hasError: boolean; error: Error | null; }

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[SkyWay] Component error:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          position: "fixed", inset: 0, display: "flex", alignItems: "center",
          justifyContent: "center", background: "#030610", color: "#fff",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
        }}>
          <div style={{ textAlign: "center", maxWidth: 420 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>SkyWay</div>
            <div style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", marginBottom: 24 }}>
              Something went wrong. Please refresh.
            </div>
            <div style={{
              fontSize: 11, color: "rgba(255,60,60,0.6)", fontFamily: "monospace",
              background: "rgba(255,60,60,0.05)", padding: 12, borderRadius: 8, textAlign: "left",
            }}>
              {this.state.error?.message}
            </div>
            <button
              onClick={() => window.location.reload()}
              style={{
                marginTop: 24, padding: "10px 24px", borderRadius: 10,
                background: "rgba(0,229,255,0.1)", border: "1px solid rgba(0,229,255,0.3)",
                color: "#00e5ff", cursor: "pointer", fontSize: 13, fontWeight: 600,
              }}
            >
              Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
