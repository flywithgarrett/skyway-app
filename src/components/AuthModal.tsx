"use client";

/*
 * ═══ Supabase OAuth Setup Required ═══
 * To enable Google/Apple sign-in:
 * 1. Supabase Dashboard → Authentication → Providers → Google → Enable
 *    Add Google OAuth credentials from Google Cloud Console
 *    (https://console.cloud.google.com/apis/credentials)
 * 2. Supabase Dashboard → Authentication → Providers → Apple → Enable
 *    Add Apple Sign In credentials from Apple Developer Portal
 * 3. Set redirect URL in both providers to: {your-domain}/api/auth/callback
 */

import { useState, useEffect } from "react";

interface AuthModalProps {
  onClose: () => void;
  onSignIn: (email: string, password: string) => Promise<{ error: string | null }>;
  onSignUp: (email: string, password: string) => Promise<{ error: string | null }>;
  onOAuth?: (provider: "google" | "apple") => Promise<{ error: string | null }>;
  onResetPassword?: (email: string) => Promise<{ error: string | null }>;
}

type Mode = "signin" | "signup" | "forgot";

const S = {
  font: "-apple-system, 'SF Pro Display', system-ui, sans-serif",
  blue: "#0A84FF",
  blueHover: "#0070E0",
  red: "#FF3B30",
  border: "rgba(255,255,255,0.12)",
  muted: "rgba(255,255,255,0.45)",
  faint: "rgba(255,255,255,0.30)",
  inputBg: "rgba(255,255,255,0.06)",
};

export default function AuthModal({ onClose, onSignIn, onSignUp, onOAuth, onResetPassword }: AuthModalProps) {
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);

  const close = () => { setVisible(false); setTimeout(onClose, 250); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldError(null);

    if (!email || !email.includes("@")) {
      setFieldError("email");
      setError("Please enter a valid email");
      return;
    }

    if (mode === "forgot") {
      setLoading(true);
      const result = onResetPassword ? await onResetPassword(email) : { error: "Not configured" };
      setLoading(false);
      if (result.error) { setError(result.error); return; }
      setSuccess("Check your email for a reset link");
      return;
    }

    if (!password || password.length < 6) {
      setFieldError("password");
      setError("Password must be at least 6 characters");
      return;
    }

    if (mode === "signup" && password !== confirmPassword) {
      setFieldError("confirm");
      setError("Passwords don't match");
      return;
    }

    setLoading(true);
    const result = mode === "signin"
      ? await onSignIn(email, password)
      : await onSignUp(email, password);
    setLoading(false);

    if (result.error) {
      setError(result.error);
      if (result.error.toLowerCase().includes("password")) setFieldError("password");
      else setFieldError("email");
      return;
    }

    if (mode === "signup") {
      setSuccess("Check your email for a confirmation link");
    } else {
      setSuccess("Welcome back!");
      setTimeout(close, 1500);
    }
  };

  const handleOAuth = async (provider: "google" | "apple") => {
    if (!onOAuth) return;
    setLoading(true);
    const result = await onOAuth(provider);
    setLoading(false);
    if (result.error) setError(result.error);
  };

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        fontFamily: S.font,
        opacity: visible ? 1 : 0,
        transition: "opacity 0.25s ease-out",
      }}
    >
      <div style={{
        width: 420, maxWidth: "calc(100vw - 32px)",
        background: "rgba(20,20,30,0.95)",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 24,
        padding: 40,
        boxShadow: "0 0 0 1px rgba(255,255,255,0.05), 0 32px 64px rgba(0,0,0,0.6)",
        position: "relative",
        transform: visible ? "translateY(0)" : "translateY(20px)",
        transition: "transform 0.25s ease-out",
      }}>
        {/* Close */}
        <button onClick={close} style={{
          position: "absolute", top: 16, right: 16,
          width: 32, height: 32, borderRadius: "50%",
          background: "rgba(255,255,255,0.08)", border: "none",
          cursor: "pointer", color: "rgba(255,255,255,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "background 0.15s",
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Success state */}
        {success ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            {success.includes("Welcome") ? (
              <div style={{ fontSize: 48, marginBottom: 16, animation: "scaleIn 0.3s ease-out" }}>✓</div>
            ) : (
              <div style={{ fontSize: 48, marginBottom: 16 }}>✉️</div>
            )}
            <div style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>{success}</div>
            {success.includes("email") && (
              <div style={{ fontSize: 13, color: S.muted, marginTop: 8 }}>We sent a link to {email}</div>
            )}
            <style>{`@keyframes scaleIn { from { transform: scale(0); } to { transform: scale(1); } }`}</style>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <div style={{ fontSize: 32, color: S.blue, marginBottom: 8 }}>✈</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em" }}>
                {mode === "forgot" ? "Reset password" : mode === "signup" ? "Create account" : "Welcome to SkyWay"}
              </div>
              <div style={{ fontSize: 14, color: S.muted, marginTop: 8, maxWidth: 280, margin: "8px auto 0", lineHeight: 1.5 }}>
                {mode === "forgot"
                  ? "Enter your email and we'll send a reset link"
                  : "Track flights, get instant alerts, never miss a gate change."}
              </div>
            </div>

            {/* OAuth buttons (not in forgot mode) */}
            {mode !== "forgot" && onOAuth && (
              <>
                {/* Apple */}
                <button onClick={() => handleOAuth("apple")} disabled={loading} style={{
                  width: "100%", height: 52, borderRadius: 14, border: "none",
                  background: "#FFFFFF", color: "#000000",
                  fontSize: 15, fontWeight: 600, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                  marginBottom: 10, transition: "background 0.15s",
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                  </svg>
                  Continue with Apple
                </button>

                {/* Google */}
                <button onClick={() => handleOAuth("google")} disabled={loading} style={{
                  width: "100%", height: 52, borderRadius: 14,
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: "#FFFFFF", fontSize: 15, fontWeight: 500,
                  cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                  marginBottom: 20, transition: "background 0.15s",
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.97 10.97 0 001 12c0 1.77.42 3.44 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Continue with Google
                </button>

                {/* Divider */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                  <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.10)" }} />
                  <span style={{ fontSize: 12, color: S.faint }}>or</span>
                  <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.10)" }} />
                </div>
              </>
            )}

            {/* Email form */}
            <form onSubmit={handleSubmit}>
              {mode === "signup" && (
                <input
                  type="text" value={name} onChange={e => setName(e.target.value)}
                  placeholder="Full name"
                  style={{ ...inputStyle, marginBottom: 10 }}
                />
              )}

              <input
                type="email" value={email} onChange={e => { setEmail(e.target.value); setFieldError(null); setError(null); }}
                placeholder="Email address"
                style={{ ...inputStyle, marginBottom: 10, borderColor: fieldError === "email" ? S.red : S.border }}
              />

              {mode !== "forgot" && (
                <input
                  type="password" value={password} onChange={e => { setPassword(e.target.value); setFieldError(null); setError(null); }}
                  placeholder="Password"
                  style={{ ...inputStyle, marginBottom: mode === "signin" ? 6 : 10, borderColor: fieldError === "password" ? S.red : S.border }}
                />
              )}

              {mode === "signin" && (
                <div style={{ textAlign: "right", marginBottom: 16 }}>
                  <button type="button" onClick={() => { setMode("forgot"); setError(null); }} style={{
                    background: "none", border: "none", cursor: "pointer",
                    fontSize: 12, color: S.faint,
                  }}>
                    Forgot password?
                  </button>
                </div>
              )}

              {mode === "signup" && (
                <input
                  type="password" value={confirmPassword} onChange={e => { setConfirmPassword(e.target.value); setFieldError(null); setError(null); }}
                  placeholder="Confirm password"
                  style={{ ...inputStyle, marginBottom: 16, borderColor: fieldError === "confirm" ? S.red : S.border }}
                />
              )}

              {mode === "forgot" && <div style={{ height: 6 }} />}

              {/* Error message */}
              {error && (
                <div style={{ fontSize: 12, color: S.red, marginBottom: 12, animation: "shake 0.3s ease-out" }}>
                  {error}
                </div>
              )}
              <style>{`@keyframes shake { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-6px); } 75% { transform: translateX(6px); } }`}</style>

              {/* Submit */}
              <button type="submit" disabled={loading} style={{
                width: "100%", height: 52, borderRadius: 14, border: "none",
                background: S.blue, color: "#fff", fontSize: 15, fontWeight: 600,
                cursor: loading ? "wait" : "pointer",
                opacity: loading ? 0.7 : 1,
                transition: "all 0.15s",
              }}>
                {loading ? "..." : mode === "forgot" ? "Send reset link" : mode === "signup" ? "Create account" : "Sign In"}
              </button>

              {/* Terms (signup only) */}
              {mode === "signup" && (
                <div style={{ fontSize: 11, color: S.faint, textAlign: "center", marginTop: 12, lineHeight: 1.5 }}>
                  By continuing you agree to our Terms of Service and Privacy Policy
                </div>
              )}

              {/* Toggle mode */}
              <div style={{ textAlign: "center", marginTop: 20 }}>
                {mode === "forgot" ? (
                  <button type="button" onClick={() => { setMode("signin"); setError(null); setSuccess(null); }} style={{
                    background: "none", border: "none", cursor: "pointer",
                    fontSize: 13, color: S.muted,
                  }}>
                    Back to <span style={{ color: S.blue }}>sign in</span>
                  </button>
                ) : (
                  <button type="button" onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(null); }} style={{
                    background: "none", border: "none", cursor: "pointer",
                    fontSize: 13, color: S.muted,
                  }}>
                    {mode === "signin" ? "Don't have an account? " : "Already have an account? "}
                    <span style={{ color: S.blue }}>{mode === "signin" ? "Sign up" : "Sign in"}</span>
                  </button>
                )}
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", height: 52, borderRadius: 12,
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.12)",
  color: "#fff", fontSize: 15,
  padding: "0 16px", outline: "none",
  transition: "border-color 0.2s, box-shadow 0.2s",
  fontFamily: "-apple-system, 'SF Pro Display', system-ui, sans-serif",
};
