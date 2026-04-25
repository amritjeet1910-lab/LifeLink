/* eslint-disable react/prop-types */
import { useEffect, useRef, useState } from "react";

const GOOGLE_SCRIPT_SRC = "https://accounts.google.com/gsi/client";
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const API_BASE_URL = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");
const REDIRECT_URI =
  import.meta.env.VITE_GOOGLE_REDIRECT_URI || `${API_BASE_URL}/auth/google/callback`;

function ensureGoogleScript() {
  const existing = document.querySelector(`script[src="${GOOGLE_SCRIPT_SRC}"]`);
  if (existing) {
    if (window.google?.accounts?.oauth2) return Promise.resolve();
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Failed to load Google script")), { once: true });
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = GOOGLE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google script"));
    document.head.appendChild(script);
  });
}

export default function GoogleAuthButton({ disabled = false, label = "Continue with Google" }) {
  const codeClientRef = useRef(null);
  const [loadError, setLoadError] = useState("");
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function setup() {
      if (!GOOGLE_CLIENT_ID) return;

      try {
        await ensureGoogleScript();
        if (cancelled || !window.google?.accounts?.oauth2) return;

        codeClientRef.current = window.google.accounts.oauth2.initCodeClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: "openid email profile",
          ux_mode: "redirect",
          redirect_uri: REDIRECT_URI,
        });
        setIsReady(true);
      } catch (err) {
        if (!cancelled) {
          setLoadError(err?.message || "Google sign-in is unavailable right now.");
        }
      }
    }

    setup();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleClick = () => {
    setLoadError("");
    codeClientRef.current?.requestCode();
  };

  if (!GOOGLE_CLIENT_ID) {
    return (
      <button type="button" disabled className="auth-btn-outline opacity-60 cursor-not-allowed">
        {label}
      </button>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || !isReady}
        className="auth-btn-google disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <span className="auth-google-mark" aria-hidden="true">G</span> {label}
      </button>
      {loadError ? <div className="mt-2 text-xs text-red-600">{loadError}</div> : null}
    </div>
  );
}
