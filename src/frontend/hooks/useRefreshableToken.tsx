import { useEffect, useRef, useState } from "react";

const STATUS_AUTHENTICATED = { text: "Authenticated", color: "text-green-400" };
const STATUS_EXPIRED = { text: "Session expired", color: "text-red-400" };
const STATUS_REFRESH_FAILED = { text: "Session refresh failed", color: "text-red-400" };

function getRefreshUrl(): string {
  const appData = (globalThis as unknown as Window).APP_DATA;
  const base = appData?.basePath ?? "";
  const normalized = base.endsWith("/") ? base.slice(0, -1) : base;
  return `${normalized}/auth/refresh?forceRefresh=true`;
}

function isTokenExpired(expiresAt: string): boolean {
  const expiry = new Date(expiresAt);
  return !Number.isNaN(expiry.getTime()) && expiry.getTime() <= Date.now();
}

function needsRefresh(expiresAt: string): boolean {
  const expiry = new Date(expiresAt);
  if (Number.isNaN(expiry.getTime())) return false;
  return Date.now() + 30_000 >= expiry.getTime();
}

export function useRefreshableToken() {
  const ud = (globalThis as unknown as Window).USER_DATA;
  const initialExpiry =
    ud?.expiresAt != null && ud.expiresAt !== "" ? ud.expiresAt : "";

  const [token, setToken] = useState<string | null>(ud?.accessToken ?? null);
  const [expiresAt, setExpiresAt] = useState<string>(initialExpiry);
  const [tokenStatus, setTokenStatus] = useState<{ text: string; color: string }>(
    STATUS_AUTHENTICATED
  );
  const keepTokenRefreshedIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const consecutiveFailuresRef = useRef(0);

  useEffect(() => {
    keepTokenRefreshedIntervalRef.current = setInterval(async () => {
      if (!expiresAt) return;
      if (!needsRefresh(expiresAt)) return;

      try {
        const response = await fetch(getRefreshUrl());
        const data = await response.json();
        if (data.message === "RefreshedToken") {
          setToken(data.token.access_token);
          setExpiresAt(data.token.expires_at);
          consecutiveFailuresRef.current = 0;
          setTokenStatus(STATUS_AUTHENTICATED);
        }
      } catch {
        consecutiveFailuresRef.current += 1;
        if (consecutiveFailuresRef.current >= 3) {
          setTokenStatus(
            isTokenExpired(expiresAt) ? STATUS_EXPIRED : STATUS_REFRESH_FAILED
          );
        }
      }
    }, 5_000);

    return () => {
      if (keepTokenRefreshedIntervalRef.current) {
        clearInterval(keepTokenRefreshedIntervalRef.current);
      }
    };
  }, [expiresAt]);

  return { token, tokenStatus };
}