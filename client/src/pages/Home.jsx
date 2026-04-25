import { Link } from "react-router-dom";
import {
  ArrowRight,
  BellRing,
  ClipboardPlus,
  Droplets,
  HeartHandshake,
  MapPinned,
  Navigation,
  Search,
  ShieldCheck,
  TimerReset,
  Users,
} from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext.jsx";

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 22 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.82, delay, ease: [0.16, 1, 0.3, 1] },
});

export default function Home() {
  const { isAuthed } = useAuth();

  return (
    <div className="w-full">
      <section className="relative min-h-[100dvh] overflow-hidden">
        <div className="absolute inset-0 -z-20">
          <div className="absolute inset-0 bg-[url('/hero-bg-mobile.png')] bg-cover bg-center md:hidden" />
          <div className="absolute inset-0 hidden bg-[url('/hero-bg.png')] bg-cover bg-center md:block" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(var(--hero-scrim-start)/0.42)_0%,rgba(var(--hero-scrim-mid)/0.18)_34%,rgba(var(--hero-scrim-end)/0.06)_58%,rgba(var(--hero-scrim-end)/0.02)_100%)] md:bg-[linear-gradient(90deg,rgba(var(--hero-scrim-start)/0.34)_0%,rgba(var(--hero-scrim-mid)/0.12)_30%,rgba(var(--hero-scrim-end)/0.04)_54%,rgba(var(--hero-scrim-end)/0.01)_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_14%,rgba(var(--glow)/0.20),transparent_24%),linear-gradient(180deg,rgba(var(--bg)/0.10)_0%,rgba(var(--bg)/0.24)_100%)]" />
        </div>

        <div className="app-container flex min-h-[100dvh] items-end pb-12 pt-24 sm:pb-16 lg:pb-20">
          <div className="max-w-[760px] rounded-[2rem] p-6 sm:p-8 lg:p-10">
            <motion.div {...fadeUp(0)}>
              <span className="chip">
                <Droplets className="h-3 w-3" /> Real-time blood network
              </span>
            </motion.div>

            <motion.h1
              {...fadeUp(0.06)}
              className="home-hero-title mt-6 max-w-[680px] text-[clamp(2.85rem,5vw,4rem)] font-black leading-[0.9] tracking-[-0.065em]"
            >
              Find the right donor,
              <br />
              dispatch instantly,
              <br />
              <span className="text-[rgb(var(--accent-2))]">track with confidence.</span>
            </motion.h1>

            <motion.p
              {...fadeUp(0.12)}
              className="home-hero-copy mt-5 max-w-[600px] text-base leading-[1.75] sm:text-lg"
            >
              LifeLink helps requesters, donors, and admins coordinate blood emergencies with precise GPS, self-pinned map locations,
              live dispatch, and a calmer interface built for urgent moments.
            </motion.p>

            <motion.div {...fadeUp(0.18)} className="mt-8 flex flex-wrap gap-3">
              {isAuthed ? (
                <Link to="/dashboard" className="btn-primary text-base !px-6 !py-3.5">
                  <Navigation className="h-4 w-4" /> Open dashboard
                </Link>
              ) : (
                <Link to="/register" className="btn-primary text-base !px-6 !py-3.5">
                  Create account <ArrowRight className="h-4 w-4" />
                </Link>
              )}
              <Link to="/search" className="home-hero-secondary btn-ghost text-base !px-6 !py-3.5">
                <Search className="h-4 w-4" /> Browse donors
              </Link>
            </motion.div>

          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-[linear-gradient(180deg,rgba(var(--bg)/0)_0%,rgba(var(--bg)/0.92)_100%)]" />
      </section>

      <div className="app-container space-y-20 py-18 sm:py-20">
        <section className="grid gap-4 md:grid-cols-3">
          {[
            { key: "Dispatch", value: "<10s", text: "Broadcast a request to nearby donors the moment it is created.", icon: TimerReset },
            { key: "Radius", value: "2-30km", text: "Search wider or tighter depending on urgency and coverage.", icon: MapPinned },
            { key: "Tracking", value: "Live", text: "See the donor route after acceptance with consent-based location sharing.", icon: BellRing },
          ].map((item, index) => (
            <motion.div
              key={item.key}
              {...fadeUp(0.05 + index * 0.06)}
              whileHover={{ y: -6 }}
              className="home-metric-card panel rounded-[1.75rem] p-6 md:p-7"
            >
              <div className="home-metric-icon">
                <item.icon className="h-4 w-4" />
              </div>
              <div className="home-metric-label">{item.key}</div>
              <div className="mt-4 text-4xl font-black tracking-tight text-[rgb(var(--text))]">{item.value}</div>
              <div className="mt-3 max-w-[24ch] text-sm leading-relaxed text-[rgb(var(--muted))]">{item.text}</div>
            </motion.div>
          ))}
        </section>

        <section className="space-y-6">
          <motion.div {...fadeUp(0.08)} className="home-flow-panel panel rounded-[2rem] p-7 md:p-8">
            <div className="chip">
              <ClipboardPlus className="h-3 w-3" /> Flow
            </div>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-[rgb(var(--text))] md:text-4xl">
              Designed around the real emergency sequence.
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-[1.8] text-[rgb(var(--muted))] sm:text-base">
              Each step is placed logically so the platform feels calm under pressure: request creation, donor matching,
              acceptance, route visibility, and completion.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <div className="home-flow-detail glass-subtle rounded-[1.4rem] px-4 py-4">
                <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-[rgb(var(--muted))]">
                  <MapPinned className="h-3.5 w-3.5 text-[rgb(var(--accent))]" /> Location intelligence
                </div>
                <div className="mt-2 text-sm font-black leading-relaxed text-[rgb(var(--text))]">Precise GPS first, with manual map pinning when needed.</div>
              </div>
              <div className="home-flow-detail glass-subtle rounded-[1.4rem] px-4 py-4">
                <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-[rgb(var(--muted))]">
                  <Users className="h-3.5 w-3.5 text-[rgb(var(--accent))]" /> Shared visibility
                </div>
                <div className="mt-2 text-sm font-black leading-relaxed text-[rgb(var(--text))]">Requesters, donors, and admins stay aligned in real time.</div>
              </div>
            </div>
          </motion.div>

          <div className="grid gap-4 md:grid-cols-3">
            {[
              { title: "Create request", desc: "Capture precise GPS when available or drop a pin on the map yourself for accurate dispatch.", num: "01", icon: ClipboardPlus },
              { title: "Notify donors", desc: "Matching donors receive the request in real time, filtered by distance and blood group.", num: "02", icon: BellRing },
              { title: "Track response", desc: "After acceptance, route visibility and status history keep everyone aligned.", num: "03", icon: Navigation },
            ].map((item, index) => (
              <motion.div
                key={item.title}
                {...fadeUp(0.12 + index * 0.06)}
                whileHover={{ y: -6 }}
                className="home-step-card panel rounded-[1.9rem] p-6 md:p-7"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="home-step-icon">
                      <item.icon className="h-4 w-4" />
                    </div>
                    <div className="chip">{item.title}</div>
                  </div>
                  <div className="home-step-number">{item.num}</div>
                </div>
                <p className="mt-6 text-sm leading-[1.8] text-[rgb(var(--muted))]">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <motion.div {...fadeUp(0.08)} className="panel rounded-[2rem] p-7 md:p-8">
            <div className="chip">
              <HeartHandshake className="h-3 w-3" /> Experience
            </div>
            <h3 className="mt-4 text-3xl font-black tracking-tight text-[rgb(var(--text))]">
              Better for requesters, donors, and admins — not just one role.
            </h3>
            <p className="mt-4 max-w-2xl text-sm leading-[1.8] text-[rgb(var(--muted))] sm:text-base">
              The platform is structured so every role sees what matters first: requesters focus on speed, donors focus on clear decisions,
              and admins focus on platform-wide visibility and control.
            </p>
            <motion.div
              {...fadeUp(0.14)}
              className="home-inline-image mt-8 overflow-hidden rounded-[1.6rem]"
              whileHover={{ scale: 1.01 }}
            >
              <img src="/lifelink_community_donation_scene_1775928563152.png" alt="Community donation scene" className="h-[240px] w-full object-cover" />
              <div className="home-inline-image-overlay">
                <span className="badge-rose">Human-centered flow</span>
                <div className="mt-3 max-w-sm text-lg font-black text-white">Supportive coordination for both urgent requests and willing donors.</div>
              </div>
            </motion.div>
          </motion.div>

          <div className="grid gap-4">
            <motion.div {...fadeUp(0.16)} whileHover={{ y: -5 }} className="panel rounded-[1.75rem] p-6">
              <div className="chip">
                <MapPinned className="h-3 w-3" /> Requester
              </div>
              <h4 className="mt-4 text-xl font-black text-[rgb(var(--text))]">Ask faster, with better location data</h4>
              <p className="mt-3 text-sm leading-[1.75] text-[rgb(var(--muted))]">
                Start with precise GPS and fall back to placing your own map pin when permissions fail or a device cannot lock accurately.
              </p>
            </motion.div>
            <motion.div {...fadeUp(0.22)} whileHover={{ y: -5 }} className="panel rounded-[1.75rem] p-6">
              <div className="chip">
                <HeartHandshake className="h-3 w-3" /> Donor
              </div>
              <h4 className="mt-4 text-xl font-black text-[rgb(var(--text))]">Respond with clear, opt-in sharing</h4>
              <p className="mt-3 text-sm leading-[1.75] text-[rgb(var(--muted))]">
                Donors stay in control of availability and live route sharing, so tracking only happens during active help.
              </p>
            </motion.div>
          </div>
        </section>

        <motion.section {...fadeUp(0.08)} className="panel rounded-[2rem] p-7 md:p-9">
          <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <div>
              <div className="chip">
                <ShieldCheck className="h-3 w-3" /> Trust
              </div>
              <h3 className="mt-4 text-3xl font-black tracking-tight text-[rgb(var(--text))]">
                Built for urgent moments, with calmer decisions.
              </h3>
              <p className="mt-4 max-w-xl text-sm leading-[1.8] text-[rgb(var(--muted))] sm:text-base">
                LifeLink keeps the interface focused on what people need most during blood emergencies: speed, confidence, and clarity.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                [BellRing, "Realtime matching", "Nearby donors receive alerts instantly."],
                [ShieldCheck, "Privacy-first tracking", "Location sharing is active only with consent."],
                [Users, "Role-based control", "Each role sees actions relevant to them."],
              ].map(([Icon, title, text], index) => (
                <motion.div
                  key={title}
                  {...fadeUp(0.12 + index * 0.05)}
                  whileHover={{ y: -4 }}
                  className="glass-subtle rounded-[1.5rem] px-4 py-5"
                >
                  <div className="home-trust-icon">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="text-sm font-black text-[rgb(var(--text))]">{title}</div>
                  <div className="mt-2 text-sm leading-[1.7] text-[rgb(var(--muted))]">{text}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>
      </div>
    </div>
  );
}
