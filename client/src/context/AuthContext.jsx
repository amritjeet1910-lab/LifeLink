/* eslint-disable react/prop-types */
/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api, setAuthToken } from "../lib/api";
import { connectAuthedSocket, disconnectSocket } from "../lib/socket";

const AuthContext = createContext(null);

const TOKEN_KEY = "lifelink_token";
const USER_KEY = "lifelink_user";

function readStoredAuth() {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const userRaw = localStorage.getItem(USER_KEY);
    const user = userRaw ? JSON.parse(userRaw) : null;
    return { token: token || null, user };
  } catch {
    return { token: null, user: null };
  }
}

export function AuthProvider({ children }) {
  const [{ token, user }, setAuth] = useState(() => readStoredAuth());
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  useEffect(() => {
    setAuthToken(token);
    if (token) connectAuthedSocket(token);
    else disconnectSocket();
  }, [token]);

  useEffect(() => {
    const stored = readStoredAuth();
    setAuth(stored);
    setAuthToken(stored.token);
    setIsBootstrapping(false);
  }, []);

  const value = useMemo(() => {
    const persist = (nextToken, nextUser) => {
      setAuthToken(nextToken);
      setAuth({ token: nextToken, user: nextUser });
      try {
        if (nextToken) localStorage.setItem(TOKEN_KEY, nextToken);
        else localStorage.removeItem(TOKEN_KEY);
        if (nextUser) localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
        else localStorage.removeItem(USER_KEY);
      } catch {
        // ignore storage errors (private mode, etc.)
      }
    };

    const login = async ({ email, password }) => {
      const res = await api.post("/auth/login", { email, password });
      if (!res.data?.success) throw new Error(res.data?.message || "Login failed");
      persist(res.data.token, res.data.user);
      return res.data.user;
    };

    const register = async (payload) => {
      const res = await api.post("/auth/register", payload);
      if (!res.data?.success) throw new Error(res.data?.message || "Registration failed");
      persist(res.data.token, res.data.user);
      return res.data.user;
    };

    const logout = () => persist(null, null);

    const refreshMe = async () => {
      if (!token) return null;
      const res = await api.get("/auth/me");
      if (!res.data?.success) throw new Error(res.data?.message || "Failed to load session");
      const nextUser = res.data.data;
      persist(token, nextUser);
      return nextUser;
    };

    const setUser = (nextUser) => {
      if (!token) return;
      persist(token, nextUser);
    };

    return { token, user, isBootstrapping, isAuthed: Boolean(token), login, register, logout, refreshMe, setUser };
  }, [token, user, isBootstrapping]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider />");
  return ctx;
}
