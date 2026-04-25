/* eslint-disable react/prop-types */
import { Link, NavLink, useLocation } from "react-router-dom";
import {
  Activity,
  Home,
  LogIn,
  Menu,
  MoonStar,
  Search,
  Shield,
  SunMedium,
  UserPlus,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "../context/AuthContext.jsx";
import { applyAccessibilitySettings, PREFS_EVENT, readStoredTheme, writeTheme } from "../lib/preferences.js";

function NavItem({ to, icon: Icon, label, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        [
          "flex items-center gap-3 rounded-full px-4 py-2.5 text-sm font-black transition-all border",
          isActive
            ? "theme-surface text-[rgb(var(--accent-dark))]"
            : "border-transparent bg-transparent text-[rgb(var(--text))] hover:bg-[rgba(var(--surface)/0.46)] hover:text-[rgb(var(--text))]",
        ].join(" ")
      }
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </NavLink>
  );
}

export default function AppShell({ children }) {
  const { isAuthed, user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState(() => readStoredTheme());
  const location = useLocation();
  const isAuthRoute = location.pathname === "/login" || location.pathname === "/register" || location.pathname === "/auth/callback";
  const isHomeRoute = location.pathname === "/";

  useEffect(() => {
    writeTheme(theme);
  }, [theme]);

  useEffect(() => {
    applyAccessibilitySettings(user?.settings?.accessibility || {});
  }, [user?.settings?.accessibility]);

  useEffect(() => {
    const handlePrefs = (event) => {
      const nextTheme = event?.detail?.theme || readStoredTheme();
      setTheme(nextTheme);
    };

    window.addEventListener(PREFS_EVENT, handlePrefs);
    return () => {
      window.removeEventListener(PREFS_EVENT, handlePrefs);
    };
  }, []);

  const nav = useMemo(() => {
    const items = [
      { to: "/", label: "Home", icon: Home },
      { to: "/search", label: "Find donors", icon: Search },
    ];
    if (isAuthed) items.push({ to: "/dashboard", label: "Dashboard", icon: Activity });
    if (user?.role === "admin") items.push({ to: "/admin", label: "Admin", icon: Shield });
    return items;
  }, [isAuthed, user?.role]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  const topBarClass = isHomeRoute
    ? "absolute inset-x-0 top-0 z-50 bg-transparent"
    : "sticky top-0 z-50 border-b border-[rgba(var(--ring)/0.72)] bg-[rgba(var(--surface)/0.62)] shadow-[0_12px_36px_rgba(var(--shadow)/0.12)] backdrop-blur-2xl";

  const ghostOnHero = isHomeRoute ? "home-nav-ghost" : "";

  return (
    <div className="app-shell">
      {isAuthRoute ? (
        <div className="min-h-screen w-full overflow-hidden">{children}</div>
      ) : (
        <>
          <div className={topBarClass}>
            <div className="app-container grid h-20 grid-cols-[auto_1fr] items-center gap-4 md:grid-cols-[1fr_auto_1fr]">
              <div className="flex items-center gap-3 justify-self-start">
                <button
                  type="button"
                  onClick={() => setMobileOpen(true)}
                  className={`rounded-full p-2 md:hidden ${isHomeRoute ? "home-nav-mobile" : "theme-surface text-[rgb(var(--text))]"}`}
                  aria-label="Open menu"
                >
                  <Menu className="h-5 w-5" />
                </button>
                <Link to="/" className="flex items-center gap-3">
                  <img src="/logo.png" alt="LifeLink" className="h-8 w-8 object-contain" />
                  <span className={`text-lg font-black tracking-tight ${isHomeRoute ? "home-brand-text" : "text-[rgb(var(--text))]"}`}>
                    <span>Life</span>
                    <span className="text-[rgb(var(--accent))]">Link</span>
                  </span>
                </Link>
              </div>

              <div className="hidden items-center justify-center gap-2 md:flex">
                {nav.map((item) => (
                  <NavItem key={item.to} to={item.to} icon={item.icon} label={item.label} />
                ))}
              </div>

              <div className="flex items-center gap-3 justify-self-end">
                {isAuthed ? (
                  <Link
                    to="/profile"
                    className={`inline-flex items-center rounded-full transition-all ${
                      isHomeRoute ? "home-user-pill" : "theme-surface"
                    }`}
                    aria-label="Open profile"
                  >
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-black ${
                        isHomeRoute ? "home-user-avatar" : "bg-[rgba(var(--accent)/0.14)] text-[rgb(var(--accent-dark))]"
                      }`}
                    >
                      {(user?.name || "U").slice(0, 1).toUpperCase()}
                    </div>
                  </Link>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={toggleTheme}
                      className={`btn-ghost text-sm !py-2.5 !px-4 ${ghostOnHero}`}
                      aria-label="Toggle theme"
                    >
                      {theme === "light" ? <MoonStar className="h-4 w-4" /> : <SunMedium className="h-4 w-4" />}
                    </button>
                    <Link to="/login" className={`btn-ghost text-sm !py-2.5 !px-4 ${ghostOnHero}`}>
                      <LogIn className="h-4 w-4" /> Log in
                    </Link>
                    <Link to="/register" className="btn-primary text-sm !py-2.5 !px-4">
                      <UserPlus className="h-4 w-4" /> Get started
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>

          <AnimatePresence>
            {mobileOpen && (
              <>
                <motion.button
                  type="button"
                  aria-label="Close menu overlay"
                  onClick={() => setMobileOpen(false)}
                  className="fixed inset-0 z-[80] bg-black/30 backdrop-blur-sm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                />
                <motion.div
                  className="fixed left-0 top-0 bottom-0 z-[81] w-[86%] max-w-sm border-r border-[rgba(var(--ring)/0.72)] bg-[rgba(var(--surface)/0.88)] p-5 backdrop-blur-2xl"
                  initial={{ x: "-100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "-100%" }}
                  transition={{ type: "spring", damping: 24, stiffness: 220 }}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-black text-[rgb(var(--text))]">Menu</div>
                    <button
                      type="button"
                      onClick={() => setMobileOpen(false)}
                      className="rounded-full p-2 text-[rgb(var(--text))] hover:bg-[rgba(var(--surface)/0.52)]"
                      aria-label="Close menu"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="mt-5 space-y-2">
                    {nav.map((item) => (
                      <NavItem
                        key={item.to}
                        to={item.to}
                        icon={item.icon}
                        label={item.label}
                        onClick={() => setMobileOpen(false)}
                      />
                    ))}
                  </div>

                  {isAuthed ? null : (
                    <button type="button" onClick={toggleTheme} className="btn-ghost mt-6 w-full justify-center text-sm">
                      {theme === "light" ? <MoonStar className="h-4 w-4" /> : <SunMedium className="h-4 w-4" />}
                      Switch to {theme === "light" ? "dark" : "light"} theme
                    </button>
                  )}

                  <div className="mt-6 text-xs text-[rgb(var(--muted))]">{location.pathname}</div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {isHomeRoute ? <div className="w-full">{children}</div> : <div className="app-container py-8">{children}</div>}

          <footer className="border-t border-[rgba(var(--ring)/0.72)] bg-[rgba(var(--surface)/0.56)] backdrop-blur-xl">
            <div className="app-container flex flex-col gap-4 py-8 md:flex-row md:items-center md:justify-between">
              <div className="text-sm text-[rgb(var(--muted))]">
                <span className="font-black text-[rgb(var(--text))]">LifeLink</span> · GPS-based donor dispatch and tracking
                <div className="mt-1 text-xs text-[rgb(var(--muted))]">
                  © 2026 Amritjeet Singh. Licensed under the MIT License.
                </div>
              </div>
              <div className="flex flex-wrap gap-4 text-sm">
                <Link to="/search" className="font-semibold text-[rgb(var(--muted))] hover:text-[rgb(var(--text))]">Find donors</Link>
                {isAuthed ? <Link to="/dashboard" className="font-semibold text-[rgb(var(--muted))] hover:text-[rgb(var(--text))]">Dashboard</Link> : null}
                {!isAuthed ? <Link to="/register" className="font-semibold text-[rgb(var(--muted))] hover:text-[rgb(var(--text))]">Create account</Link> : null}
              </div>
            </div>
          </footer>
        </>
      )}
    </div>
  );
}
