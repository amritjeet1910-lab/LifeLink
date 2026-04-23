/* eslint-disable react/prop-types */
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ShieldCheck, MapPin, Activity, ArrowRight } from "lucide-react";

const leftItems = [
  { icon: ShieldCheck, title: "Verified roles", desc: "Requester / Donor / Admin access control." },
  { icon: MapPin, title: "GPS opt-in", desc: "High-accuracy GPS capture with consent." },
  { icon: Activity, title: "Realtime flow", desc: "Dispatch → accept → live tracking." },
];

export default function AuthLayout({
  title,
  subtitle,
  imageSrc = "/lifelink_hero_tech_illustration_1775928376879.png",
  imageAlt = "LifeLink",
  children,
}) {
  const [imgOk, setImgOk] = useState(true);

  const bgStyle = useMemo(() => {
    if (imgOk) return {};
    return {
      background:
        "radial-gradient(ellipse 70% 60% at 20% 10%, rgba(220,38,38,0.25) 0%, transparent 55%), radial-gradient(ellipse 70% 60% at 90% 10%, rgba(220,38,38,0.14) 0%, transparent 55%), #0b1220",
    };
  }, [imgOk]);

  return (
    <div className="auth-shell">
      {/* Left: image/brand */}
      <div className="auth-left" style={bgStyle}>
        {imgOk && (
          <img
            src={imageSrc}
            alt={imageAlt}
            className="auth-hero-img"
            onError={() => setImgOk(false)}
            loading="eager"
          />
        )}
        <div className="auth-left-overlay" />

        <div className="auth-left-content">
          <Link to="/" className="auth-brand">
            <img src="/logo.png" alt="LifeLink" className="h-9 w-9 object-contain" />
            <span className="text-xl font-black tracking-tight text-slate-900">
              Life<span className="text-red-600">Link</span>
            </span>
          </Link>

          <div className="mt-10 max-w-md">
            <div className="text-xs font-black uppercase tracking-[0.28em] text-slate-600">
              Blood network platform
            </div>
            <div className="mt-3 text-4xl font-black leading-[1.05] text-slate-900">
              {title}
            </div>
            <div className="mt-3 text-slate-700 text-sm leading-relaxed">
              {subtitle}
            </div>
          </div>

          <div className="mt-10 grid gap-4 max-w-md">
            {leftItems.map((it) => (
              <div key={it.title} className="auth-left-item">
                <it.icon className="h-5 w-5 text-red-600" />
                <div>
                  <div className="text-sm font-black text-slate-900">{it.title}</div>
                  <div className="text-xs text-slate-600 mt-0.5">{it.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-auto pt-10 text-xs text-slate-600">
            <span className="font-semibold text-slate-700">Tip:</span> Place your image at{" "}
            <code className="text-slate-700">client/public/auth-hero.jpg</code>
            {" "}to replace this panel.
          </div>
        </div>
      </div>

      {/* Right: form */}
      <div className="auth-right">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="auth-card"
        >
          {children}
        </motion.div>
        <div className="auth-right-foot">
          <Link to="/" className="text-xs text-slate-500 hover:text-slate-700 inline-flex items-center gap-2">
            Back to home <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
