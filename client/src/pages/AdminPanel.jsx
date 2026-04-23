import { AreaChart, Area, BarChart, Bar, XAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, AlertTriangle, Users, Droplet, Activity, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

const fluxData = [
  { time: '08:00', requests: 4 }, { time: '10:00', requests: 12 },
  { time: '12:00', requests: 8 }, { time: '14:00', requests: 18 },
  { time: '16:00', requests: 22 }, { time: '18:00', requests: 14 },
  { time: '20:00', requests: 9 },
];

const demandData = [
  { name: 'A+', count: 45 }, { name: 'O+', count: 72 }, { name: 'B+', count: 30 },
  { name: 'AB+', count: 15 }, { name: 'A-', count: 12 }, { name: 'O-', count: 25 },
];

const feed = [
  { type: 'alert', text: 'Critical O- Stock Low', sub: 'Eastside Hospital', time: '2m ago' },
  { type: 'success', text: 'Aman Deep (O+) donation complete', sub: 'Civil Hospital', time: '11m ago' },
  { type: 'info', text: 'Priya Sharma registered (A-)', sub: 'Westside Center', time: '38m ago' },
  { type: 'alert', text: 'Emergency B+ request', sub: 'Model Town Clinic', time: '1h ago' },
];

const feedColor = {
  alert: { dot: 'bg-red-600', text: 'text-red-700', bg: 'bg-red-50 border-red-200' },
  success: { dot: 'bg-emerald-600', text: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  info: { dot: 'bg-slate-600', text: 'text-slate-700', bg: 'bg-slate-50 border-slate-200' },
};

const AdminPanel = () => {
  const kpis = [
    { label: 'Total Requests', value: '1,284', icon: Activity, color: 'text-red-700', bg: 'bg-red-50', change: '+12%' },
    { label: 'Active Donors', value: '8,432', icon: Users, color: 'text-slate-700', bg: 'bg-slate-50', change: '+5%' },
    { label: 'Alerts Active', value: '3', icon: AlertTriangle, color: 'text-amber-700', bg: 'bg-amber-50', change: '-2' },
    { label: 'Units Fulfilled', value: '942', icon: Droplet, color: 'text-emerald-700', bg: 'bg-emerald-50', change: '98%' },
  ];

  return (
    <div className="space-y-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black text-red-600 uppercase tracking-[0.3em] mb-1">Control Center</p>
            <h1 className="text-4xl font-black tracking-tight">System <span className="text-gradient">Overview</span></h1>
          </div>
          <div className="flex items-center gap-3 panel-soft rounded-2xl px-5 py-3 border border-slate-200">
            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-xs font-black text-emerald-700 uppercase tracking-widest">Network Live · 42ms</span>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {kpis.map((k, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className="panel rounded-2xl p-6 space-y-4 card-hover"
            >
              <div className="flex items-start justify-between">
                <div className={`w-10 h-10 ${k.bg} rounded-xl flex items-center justify-center`}>
                  <k.icon className={`w-5 h-5 ${k.color}`} />
                </div>
                <span className="text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-lg">{k.change}</span>
              </div>
              <div>
                <div className="text-3xl font-black tracking-tight">{k.value}</div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">{k.label}</div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Area Chart */}
          <div className="lg:col-span-2 panel rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-red-600" /> Request Flux Today
              </h3>
              <span className="badge-rose"><Zap className="w-2.5 h-2.5" /> Live</span>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={fluxData}>
                <defs>
                  <linearGradient id="gr" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#dc2626" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(15,23,42,0.06)" />
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#475569', fontFamily: 'Outfit' }} />
                <Tooltip
                  contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 16, fontFamily: 'Outfit', fontSize: 13 }}
                  labelStyle={{ color: '#475569' }} itemStyle={{ color: '#0f172a', fontWeight: 700 }}
                />
                <Area type="monotone" dataKey="requests" stroke="#dc2626" strokeWidth={3} fill="url(#gr)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Live Feed */}
          <div className="panel rounded-2xl p-6 space-y-4">
            <h3 className="font-black flex items-center gap-2">
              <Activity className="w-5 h-5 text-red-600" /> Live Feed
            </h3>
            <div className="space-y-3">
              {feed.map((item, i) => {
                const c = feedColor[item.type];
                return (
                  <div key={i} className={`panel-soft rounded-xl p-3 border ${c.bg} space-y-1`}>
                    <div className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 ${c.dot} rounded-full flex-shrink-0`} />
                      <span className="text-xs font-bold text-slate-900">{item.text}</span>
                    </div>
                    <div className="flex items-center justify-between pl-3.5">
                      <span className="text-[10px] text-slate-500">{item.sub}</span>
                      <span className="text-[10px] text-slate-600">{item.time}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Blood demand chart */}
        <div className="panel rounded-2xl p-6 space-y-4">
          <h3 className="font-black flex items-center gap-2">
            <Droplet className="w-5 h-5 text-red-600" /> Blood Group Demand
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={demandData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(15,23,42,0.06)" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#475569', fontFamily: 'Outfit', fontWeight: 700 }} />
              <Tooltip
                contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 16, fontFamily: 'Outfit' }}
                labelStyle={{ color: '#475569' }} itemStyle={{ color: '#0f172a', fontWeight: 700 }}
              />
              <Bar dataKey="count" fill="#dc2626" fillOpacity={0.75} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

    </div>
  );
};

export default AdminPanel;
