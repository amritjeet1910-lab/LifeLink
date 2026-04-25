/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { Activity, Droplets, Shield, Users, UserCheck, MapPin, Clock3 } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../lib/api";

function formatWhen(value) {
  if (!value) return "";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function StatCard({ icon: Icon, label, value, tone = "red" }) {
  const tones = {
    red: "bg-red-50 text-red-700 border-red-100",
    slate: "bg-slate-50 text-slate-700 border-slate-200",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
  };

  return (
    <div className="glass-card rounded-[1.8rem] p-5">
      <div className="flex items-start justify-between gap-3">
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${tones[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="text-right">
          <div className="text-3xl font-black tracking-tight text-slate-950">{value}</div>
          <div className="mt-1 text-xs font-black uppercase tracking-[0.18em] text-slate-500">{label}</div>
        </div>
      </div>
    </div>
  );
}

export default function AdminPanel() {
  const { user, isAuthed, isBootstrapping } = useAuth();
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const [overviewRes, usersRes, requestsRes] = await Promise.all([
          api.get("/users/admin/overview"),
          api.get("/users/admin/users"),
          api.get("/requests"),
        ]);
        setOverview(overviewRes.data?.data || null);
        setUsers(usersRes.data?.data || []);
        setRequests(requestsRes.data?.data || []);
      } catch (err) {
        setError(err?.response?.data?.message || err?.message || "Failed to load admin data");
      }
    };

    if (user?.role === "admin") load();
  }, [user?.role]);

  const topGroups = useMemo(() => overview?.groupBreakdown?.slice(0, 6) || [], [overview]);
  const recentRequests = useMemo(() => overview?.recentRequests || [], [overview]);
  const recentUsers = useMemo(() => overview?.recentUsers || [], [overview]);

  if (isBootstrapping) return null;
  if (!isAuthed) return <Navigate to="/login" replace />;
  if (user?.role !== "admin") return <Navigate to="/dashboard" replace />;

  return (
    <div className="space-y-6">
      <div className="glass-card rounded-[2rem] p-6 md:p-8">
        <div className="chip">Admin</div>
        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-950 md:text-4xl">LifeLink control center</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
              Manage donors, requesters, live blood requests, and platform health from one real dashboard.
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
            Live admin session
          </div>
        </div>
      </div>

      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Users} label="Total users" value={overview?.totals?.users || 0} tone="slate" />
        <StatCard icon={UserCheck} label="Available donors" value={overview?.totals?.availableDonors || 0} tone="emerald" />
        <StatCard icon={Activity} label="Open requests" value={(overview?.totals?.pendingRequests || 0) + (overview?.totals?.acceptedRequests || 0)} tone="amber" />
        <StatCard icon={Droplets} label="Completed requests" value={overview?.totals?.completedRequests || 0} tone="red" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="glass-card rounded-[2rem] p-6">
          <div className="flex items-center gap-2 text-lg font-black text-slate-950">
            <Shield className="h-5 w-5 text-red-600" /> User roles
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {[
              { label: "Donors", value: overview?.totals?.donors || 0 },
              { label: "Requesters", value: overview?.totals?.requesters || 0 },
              { label: "Admins", value: overview?.totals?.admins || 0 },
            ].map((item) => (
              <div key={item.label} className="glass-subtle rounded-2xl px-4 py-4">
                <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">{item.label}</div>
                <div className="mt-2 text-2xl font-black text-slate-950">{item.value}</div>
              </div>
            ))}
          </div>

          <div className="mt-6">
            <div className="text-sm font-black text-slate-950">Demand by blood group</div>
            <div className="mt-4 space-y-3">
              {topGroups.map((group) => (
                <div key={group._id} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-black text-slate-900">{group._id}</span>
                    <span className="text-slate-500">{group.count}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-red-100">
                    <div className="h-full rounded-full bg-red-600" style={{ width: `${Math.min(group.count * 12, 100)}%` }} />
                  </div>
                </div>
              ))}
              {topGroups.length === 0 ? <div className="text-sm text-slate-500">No request data yet.</div> : null}
            </div>
          </div>
        </div>

        <div className="glass-card rounded-[2rem] p-6">
          <div className="flex items-center gap-2 text-lg font-black text-slate-950">
            <Activity className="h-5 w-5 text-red-600" /> Recent live requests
          </div>
          <div className="mt-5 space-y-3">
            {recentRequests.map((request) => (
              <div key={request._id} className="glass-subtle rounded-2xl px-4 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-black text-slate-950">{request.hospitalName}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {request.requester?.name || "Requester"} · {request.location?.pincode || "No pincode"}
                    </div>
                  </div>
                  <span className="rounded-full border border-red-100 bg-red-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-red-700">
                    {request.status}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-600">
                  <span className="font-black text-slate-950">{request.bloodGroup}</span>
                  <span>{request.urgency}</span>
                  <span>{formatWhen(request.createdAt)}</span>
                </div>
              </div>
            ))}
            {recentRequests.length === 0 ? <div className="text-sm text-slate-500">No requests found.</div> : null}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="glass-card rounded-[2rem] p-6">
          <div className="flex items-center gap-2 text-lg font-black text-slate-950">
            <Users className="h-5 w-5 text-red-600" /> Recently joined users
          </div>
          <div className="mt-5 space-y-3">
            {recentUsers.map((entry) => (
              <div key={`${entry._id}-${entry.createdAt}`} className="glass-subtle rounded-2xl px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-black text-slate-950">{entry.name}</div>
                    <div className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">{entry.role}</div>
                  </div>
                  <div className="text-right text-xs text-slate-500">
                    <div>{entry.bloodGroup || "—"}</div>
                    <div className="mt-1">{formatWhen(entry.createdAt)}</div>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs text-slate-600">
                  <MapPin className="h-3.5 w-3.5 text-red-600" />
                  <span>{entry.location?.city || "Unknown city"} · {entry.location?.pincode || "No pincode"}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card rounded-[2rem] p-6">
          <div className="flex items-center gap-2 text-lg font-black text-slate-950">
            <Clock3 className="h-5 w-5 text-red-600" /> Full system roster
          </div>
          <div className="mt-5 max-h-[560px] space-y-3 overflow-y-auto pr-1">
            {users.map((entry) => (
              <div key={entry._id} className="glass-subtle rounded-2xl px-4 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-black text-slate-950">{entry.name}</div>
                    <div className="mt-1 text-xs text-slate-500">{entry.email}</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-slate-200 bg-white/75 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-slate-700">
                      {entry.role}
                    </span>
                    {entry.bloodGroup ? (
                      <span className="rounded-full border border-red-100 bg-red-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-red-700">
                        {entry.bloodGroup}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-600">
                  <span>{entry.phone || "No phone"}</span>
                  <span>{entry.location?.city || "Unknown city"}</span>
                  <span>{entry.location?.pincode || "No pincode"}</span>
                  {entry.role === "donor" ? <span>{entry.availability ? "Available" : "Unavailable"}</span> : null}
                </div>
              </div>
            ))}
            {users.length === 0 ? <div className="text-sm text-slate-500">No users available.</div> : null}
          </div>
        </div>
      </div>

      <div className="glass-card rounded-[2rem] p-6">
        <div className="text-lg font-black text-slate-950">All requests</div>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/50 text-xs uppercase tracking-[0.18em] text-slate-500">
                <th className="pb-3">Hospital</th>
                <th className="pb-3">Blood</th>
                <th className="pb-3">Urgency</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Pincode</th>
                <th className="pb-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr key={request._id} className="border-b border-white/35 text-slate-700">
                  <td className="py-3 font-black text-slate-950">{request.hospitalName}</td>
                  <td className="py-3">{request.bloodGroup}</td>
                  <td className="py-3">{request.urgency}</td>
                  <td className="py-3">{request.status}</td>
                  <td className="py-3">{request.location?.pincode || "—"}</td>
                  <td className="py-3">{formatWhen(request.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
