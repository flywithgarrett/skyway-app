"use client";

import { useState } from "react";

interface AuthModalProps {
  onClose: () => void;
  onSignIn: (email: string, password: string) => Promise<{ error: string | null }>;
  onSignUp: (email: string, password: string) => Promise<{ error: string | null }>;
}

export default function AuthModal({ onClose, onSignIn, onSignUp }: AuthModalProps) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError(null);

    const result = mode === "signin"
      ? await onSignIn(email, password)
      : await onSignUp(email, password);

    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else if (mode === "signup") {
      setSuccess(true);
    } else {
      onClose();
    }
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 60,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        width: "min(400px, calc(100% - 32px))",
        background: "#1C1C28",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 20,
        padding: 32,
        boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
      }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>✈</div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em" }}>
            {mode === "signin" ? "Welcome back" : "Create account"}
          </h2>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.40)", marginTop: 6 }}>
            {mode === "signin" ? "Sign in to save flights and get alerts" : "Track flights and get real-time notifications"}
          </p>
        </div>

        {success ? (
          <div style={{
            background: "rgba(52,199,89,0.10)",
            border: "1px solid rgba(52,199,89,0.25)",
            borderRadius: 12, padding: "16px 20px", textAlign: "center",
          }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#34C759", marginBottom: 4 }}>Check your email</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)" }}>
              We sent a confirmation link to {email}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {/* Email */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.30)", letterSpacing: "0.04em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                style={{
                  width: "100%", padding: "12px 14px", borderRadius: 10,
                  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)",
                  color: "#fff", fontSize: 14, outline: "none",
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = "#0A84FF"}
                onBlur={(e) => e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.30)", letterSpacing: "0.04em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                style={{
                  width: "100%", padding: "12px 14px", borderRadius: 10,
                  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)",
                  color: "#fff", fontSize: 14, outline: "none",
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = "#0A84FF"}
                onBlur={(e) => e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"}
              />
            </div>

            {/* Error */}
            {error && (
              <div style={{
                background: "rgba(255,59,48,0.10)", border: "1px solid rgba(255,59,48,0.20)",
                borderRadius: 10, padding: "10px 14px", marginBottom: 16,
                fontSize: 12, color: "#FF3B30",
              }}>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%", padding: "13px 20px", borderRadius: 12,
                background: "#0A84FF", border: "none", color: "#fff",
                fontSize: 15, fontWeight: 600, cursor: loading ? "wait" : "pointer",
                opacity: loading ? 0.7 : 1,
                transition: "opacity 0.2s",
              }}
            >
              {loading ? "..." : mode === "signin" ? "Sign In" : "Create Account"}
            </button>

            {/* Toggle mode */}
            <div style={{ textAlign: "center", marginTop: 16 }}>
              <button
                type="button"
                onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(null); }}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  fontSize: 13, color: "#0A84FF",
                }}
              >
                {mode === "signin" ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
              </button>
            </div>
          </form>
        )}

        {/* Close */}
        <button
          onClick={onClose}
          style={{
            position: "absolute", top: 16, right: 16,
            background: "rgba(255,255,255,0.06)", border: "none",
            width: 30, height: 30, borderRadius: 10,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: "rgba(255,255,255,0.30)",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
