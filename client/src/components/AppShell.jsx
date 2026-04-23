/* eslint-disable react/prop-types */
import { Link, NavLink, useLocation } from "react-router-dom";
import { Activity, Home, LogIn, LogOut, Search, Shield, UserPlus, X, Menu } from "lucide-react";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "../context/AuthContext.jsx";

function NavItem({ to, icon: Icon, label, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        [
          "flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-black transition-all border",
          isActive ? "bg-red-50/95 border-red-100 text-red-700" : "bg-transparent border-transparent hover:bg-white/80 text-slate-700",
        ].join(" ")
      }
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </NavLink>
  );
}

export default function AppShell({ children }) {
  const { isAuthed, user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const isAuthRoute = location.pathname === "/login" || location.pathname === "/register";
  const isHomeRoute = location.pathname === "/";

  const nav = useMemo(() => {
    const items = [
      { to: "/", label: "Home", icon: Home },
      { to: "/search", label: "Find donors", icon: Search },
    ];
    if (isAuthed) items.push({ to: "/dashboard", label: "Dashboard", icon: Activity });
    if (user?.role === "admin") items.push({ to: "/admin", label: "Admin", icon: Shield });
    return items;
  }, [isAuthed, user?.role]);

  return (
    <div className="app-shell">
      {isAuthRoute ? (
        <div className="min-h-screen w-full overflow-hidden">{children}</div>
      ) : (
        <>
      {/* Top bar */}
      <div
        className={[
          "sticky top-0 z-50 backdrop-blur-xl transition-all",
          isHomeRoute
            ? "border-b border-white/60 bg-white/68"
            : "border-b border-slate-200/70 bg-white/80",
        ].join(" ")}
      >
        <div className="app-container h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-2 rounded-xl hover:bg-slate-100 text-slate-700"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <Link to="/" className="flex items-center gap-3">
              <img src="/logo.png" alt="LifeLink" className="w-8 h-8 object-contain" />
              <span className="text-lg font-black tracking-tight">
                Life<span className="text-red-600">Link</span>
              </span>
            </Link>
            <div className="hidden md:flex ml-6 items-center gap-2">
              {nav.map((it) => (
                <NavItem key={it.to} to={it.to} icon={it.icon} label={it.label} />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isAuthed ? (
              <>
                <div className="hidden sm:flex items-center gap-3 px-3 py-2 panel-soft rounded-2xl">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-xs font-black text-slate-700">
                    {(user?.name || "U").slice(0, 1).toUpperCase()}
                  </div>
                  <div className="leading-tight">
                    <div className="text-xs font-black text-slate-900 max-w-[160px] truncate">
                      {user?.name || "User"}
                    </div>
                    <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-widest">
                      {user?.role || "member"}
                    </div>
                  </div>
                </div>
                <button onClick={logout} className="btn-ghost text-sm !py-2.5 !px-4 !rounded-2xl">
                  <LogOut className="w-4 h-4" /> Log out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-ghost text-sm !py-2.5 !px-4 !rounded-2xl">
                  <LogIn className="w-4 h-4" /> Log in
                </Link>
                <Link to="/register" className="btn-primary text-sm !py-2.5 !px-4 !rounded-2xl">
                  <UserPlus className="w-4 h-4" /> Get started
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.button
              type="button"
              aria-label="Close menu overlay"
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[80]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.div
              className="fixed left-0 top-0 bottom-0 w-[86%] max-w-sm z-[81] p-5 panel"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 24, stiffness: 220 }}
            >
              <div className="flex items-center justify-between">
                <div className="text-sm font-black text-slate-900">Menu</div>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="p-2 rounded-xl hover:bg-slate-100 text-slate-700"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="mt-5 space-y-2">
                {nav.map((it) => (
                  <NavItem
                    key={it.to}
                    to={it.to}
                    icon={it.icon}
                    label={it.label}
                    onClick={() => setMobileOpen(false)}
                  />
                ))}
              </div>
              <div className="mt-6 text-xs text-slate-500">
                {location.pathname}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Content */}
      {isHomeRoute ? (
        <div className="w-full">{children}</div>
      ) : (
        <div className="app-container py-8">{children}</div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="app-container py-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="text-sm text-slate-600">
            <span className="font-black text-slate-900">LifeLink</span> · GPS-based donor dispatch and tracking (opt-in)
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <Link to="/search" className="text-slate-600 hover:text-slate-900 font-semibold">Find donors</Link>
            <Link to="/dashboard" className="text-slate-600 hover:text-slate-900 font-semibold">Dashboard</Link>
            <Link to="/register" className="text-slate-600 hover:text-slate-900 font-semibold">Create account</Link>
          </div>
        </div>
      </footer>
        </>
      )}
    </div>
  );
}
