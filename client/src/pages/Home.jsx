import { Link } from 'react-router-dom';
import { Search, Bell, Droplets, MapPin, ArrowRight, Navigation } from 'lucide-react';
import { motion } from 'framer-motion';

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }
});

const Home = () => {
  return (
    <div className="w-full">
      {/* HERO */}
      <section className="relative w-full min-h-[calc(100dvh-8rem)] overflow-hidden bg-[linear-gradient(180deg,rgba(255,255,255,0.78)_0%,rgba(248,250,252,1)_72%)] px-4 pt-24 sm:px-6 lg:px-10">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_16%_18%,rgba(220,38,38,0.16),transparent_26%),radial-gradient(circle_at_82%_22%,rgba(248,113,113,0.18),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.35)_0%,rgba(248,250,252,0)_50%)]" />
        <div className="mx-auto grid min-h-[calc(100dvh-8rem)] w-full max-w-[1440px] items-center gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:px-4">
        <div className="space-y-6">
          <motion.div {...fadeUp(0)}>
            <span className="chip">
              <Droplets className="w-3 h-3" /> Real-time Blood Network
            </span>
          </motion.div>
          <motion.h1 {...fadeUp(0.06)} className="max-w-xl text-[clamp(2.5rem,4vw,4.2rem)] font-black tracking-[-0.04em] leading-[0.98] text-slate-950">
            Faster blood
            <br />
            requests with
            <br />
            <span className="text-gradient">live coordination.</span>
          </motion.h1>
          <motion.p {...fadeUp(0.12)} className="max-w-lg text-base leading-relaxed text-slate-600 sm:text-lg">
            Create urgent requests, notify nearby donors, and follow the response in real time with GPS-based matching and clear communication.
          </motion.p>
          <motion.div {...fadeUp(0.15)} className="flex flex-wrap gap-3">
            <Link to="/dashboard" className="btn-primary text-base !rounded-2xl">
              <Navigation className="w-4 h-4" /> Open dashboard
            </Link>
            <Link to="/search" className="btn-ghost text-base !rounded-2xl">
              <Search className="w-4 h-4" /> Browse donors
            </Link>
            <Link to="/register" className="btn-ghost text-base !rounded-2xl">
              Create account <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="relative flex items-center justify-center"
        >
          <div className="absolute -top-6 -left-2 h-40 w-40 rounded-full bg-red-100 blur-3xl" />
          <div className="absolute -bottom-10 -right-8 h-44 w-44 rounded-full bg-rose-100 blur-3xl" />
          <div className="relative w-full max-w-[760px] overflow-hidden rounded-[2rem] border border-white/70 bg-white/60 p-3 shadow-[0_28px_80px_rgba(15,23,42,0.10)] backdrop-blur-sm">
            <div className="overflow-hidden rounded-[1.6rem] bg-slate-100">
              <img
                src="/hero.png"
                alt="LifeLink donor coordination"
                className="h-[26rem] w-full object-cover sm:h-[30rem] lg:h-[34rem]"
              />
            </div>
          </div>
        </motion.div>
        </div>
      </section>

      <div className="app-container space-y-16 py-16">
      {/* QUICK STATS */}
      <section className="panel rounded-2xl p-6 md:p-8">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { k: "Dispatch", v: "< 10s", d: "Create a request and notify nearby donors." },
            { k: "Scope", v: "2–30km", d: "Adjust radius for better donor coverage." },
            { k: "Tracking", v: "Live", d: "See donor movement after acceptance." },
          ].map((s) => (
            <div key={s.k} className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-red-700 font-black">
                {s.k.slice(0, 1)}
              </div>
              <div>
                <div className="text-xs font-black uppercase tracking-widest text-slate-500">{s.k}</div>
                <div className="text-2xl font-black mt-1">{s.v}</div>
                <div className="text-sm text-slate-600 mt-1">{s.d}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ───────────────────────────── */}
      <section className="space-y-8">
        <div className="space-y-2">
          <h2 className="text-3xl md:text-4xl font-black tracking-tight">How it works</h2>
          <p className="text-slate-600 max-w-2xl">A complete end-to-end flow: create → dispatch → accept → track.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: Search, title: 'Smart Search', desc: 'Search donors by blood group & pincode. Filter by distance.', color: 'bg-red-50 text-red-700', num: '01' },
            { icon: Bell, title: 'Emergency Alerts', desc: 'One click dispatches real-time alerts to all nearby donors.', color: 'bg-slate-50 text-slate-700', num: '02' },
            { icon: MapPin, title: 'Map Tracking', desc: 'Visualize donor availability on an interactive map.', color: 'bg-slate-50 text-slate-700', num: '03' },
          ].map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12 }}
              className="panel rounded-2xl p-8 space-y-5 group"
            >
              <div className="flex items-start justify-between">
                <div className={`w-12 h-12 ${f.color} rounded-2xl flex items-center justify-center`}>
                  <f.icon className="w-6 h-6" />
                </div>
                <span className="text-5xl font-black text-slate-200 group-hover:text-slate-300 transition-colors">{f.num}</span>
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2">{f.title}</h3>
                <p className="text-slate-600 leading-relaxed text-sm">{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ROLE GUIDES */}
      <section className="grid lg:grid-cols-2 gap-6 items-start">
        <div className="panel rounded-2xl p-6 md:p-8">
          <div className="chip">For requesters</div>
          <h3 className="mt-3 text-2xl font-black">Create a GPS request</h3>
          <p className="text-slate-600 mt-2">A short checklist to minimize delays during emergencies.</p>
          <ol className="mt-5 space-y-3">
            {[
              "Capture GPS with high accuracy (try outdoors if accuracy is poor).",
              "Add hospital name, blood group, urgency and pincode.",
              "Dispatch: nearby donors are alerted instantly.",
              "After acceptance, track the donor live and coordinate pickup.",
              "Mark completed (or cancel if no longer needed).",
            ].map((t, idx) => (
              <li key={t} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-xs font-black text-slate-700">
                  {String(idx + 1).padStart(2, "0")}
                </div>
                <div className="text-sm text-slate-700 leading-relaxed">{t}</div>
              </li>
            ))}
          </ol>
        </div>
        <div className="panel rounded-2xl p-6 md:p-8">
          <div className="chip">For donors</div>
          <h3 className="mt-3 text-2xl font-black">Accept and share live GPS</h3>
          <p className="text-slate-600 mt-2">Only share location when you’re actively helping.</p>
          <ol className="mt-5 space-y-3">
            {[
              "Turn availability on so requests reach you.",
              "Accept a request from the dispatch inbox.",
              "Enable Live GPS to share your route to the requester.",
              "Arrive and complete the donation.",
              "Mark completed when done.",
            ].map((t, idx) => (
              <li key={t} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-xs font-black text-slate-700">
                  {String(idx + 1).padStart(2, "0")}
                </div>
                <div className="text-sm text-slate-700 leading-relaxed">{t}</div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* PRIVACY */}
      <section className="panel rounded-2xl p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-sm font-black text-red-700 uppercase tracking-widest">Privacy & consent</div>
            <div className="mt-2 text-xl font-black">GPS is opt-in. Tracking happens only when you allow it.</div>
            <div className="mt-2 text-sm text-slate-600 max-w-3xl">
              Requesters must capture location before dispatch. Donors can turn Live GPS on/off at any time. We recommend
              sharing live location only for active emergencies.
            </div>
          </div>
          <div className="flex gap-3">
            <Link to="/dashboard" className="btn-primary !rounded-2xl">Open dashboard</Link>
            <Link to="/search" className="btn-ghost !rounded-2xl">Find donors</Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="panel rounded-2xl p-6 md:p-8">
        <h3 className="text-2xl font-black">FAQ</h3>
        <div className="mt-5 grid md:grid-cols-2 gap-6">
          {[
            { q: "Why does GPS need permission?", a: "So we can locate nearby donors and enable live tracking only after acceptance." },
            { q: "What if GPS accuracy is poor?", a: "Try outdoors, enable high accuracy, and wait a few seconds for a better fix." },
            { q: "Who receives my request?", a: "Only donors within the configured radius and matching blood group (and pincode filter, if set)." },
            { q: "Can I cancel?", a: "Yes—while pending. After acceptance you can mark completed; donors can also complete once done." },
          ].map((f) => (
            <div key={f.q} className="border-l-2 border-slate-200 pl-4">
              <div className="text-sm font-black">{f.q}</div>
              <div className="text-sm text-slate-600 mt-1 leading-relaxed">{f.a}</div>
            </div>
          ))}
        </div>
      </section>
      </div>
    </div>
  );
};

export default Home;
