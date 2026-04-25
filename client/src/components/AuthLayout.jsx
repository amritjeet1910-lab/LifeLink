/* eslint-disable react/prop-types */
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";

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
            <img src="/logo.png" alt="LifeLink" className="h-10 w-10 object-contain" />
            <span className="auth-brand-wordmark text-[2rem] font-black tracking-tight">
              Life<span className="text-[rgb(var(--accent-2))]">Link</span>
            </span>
          </Link>

          <div className="auth-left-copy">
            <div className="auth-left-kicker">Blood network platform</div>
            <h1 className="auth-left-title">{title}</h1>
            <p className="auth-left-description">{subtitle}</p>
          </div>
        </div>
      </div>

      {/* Right: form */}
      <div className="auth-right">
        <Link to="/" className="auth-mobile-brand">
          <img src="/logo.png" alt="LifeLink" className="h-10 w-10 object-contain" />
          <span className="auth-brand-wordmark text-[1.8rem] font-black tracking-tight">
            Life<span className="text-[rgb(var(--accent-2))]">Link</span>
          </span>
        </Link>
        <div className="auth-right-foot auth-top-link">
          <Link to="/" className="auth-home-link">
            <ArrowLeft className="h-4 w-4" /> Return to home
          </Link>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="auth-card"
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
}
