/* eslint-disable react/prop-types */
import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  AlertCircle,
  Bell,
  CheckCircle2,
  Clock,
  Crosshair,
  Droplets,
  HeartPulse,
  MapPin,
  Navigation,
  Phone,
  Radar,
  TrendingUp,
} from "lucide-react";
import { MapContainer, Marker, Popup, Polyline } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../lib/api";
import { useGeolocation } from "../hooks/useGeolocation";
import { useSocket } from "../hooks/useSocket";
import { capturePreciseLocation } from "../lib/geolocation";
import { resolveEstimatedLocation } from "../lib/geolocation";
import AuthLocationPicker from "../components/AuthLocationPicker.jsx";
import { BarChart, Bar, CartesianGrid, PieChart, Pie, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { NearbyMedicalPlaces, RecenterMap, SatelliteMapLayers } from "../components/MapLayers.jsx";

L.Marker.prototype.options.icon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

function formatWhen(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return "";
  }
}

function countByStatus(requests = []) {
  return requests.reduce(
    (acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    },
    { Pending: 0, Accepted: 0, Completed: 0, Cancelled: 0 }
  );
}

function buildMonthlyTrend(requests = []) {
  const buckets = new Map();
  requests.forEach((item) => {
    const date = new Date(item.createdAt || item.updatedAt || Date.now());
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    if (!buckets.has(key)) {
      buckets.set(key, {
        key,
        label: date.toLocaleString(undefined, { month: "short" }),
        requests: 0,
        completed: 0,
      });
    }
    const bucket = buckets.get(key);
    bucket.requests += 1;
    if (item.status === "Completed") bucket.completed += 1;
  });
  return [...buckets.values()].slice(-6);
}

function buildNotificationFeed(requests = [], role = "requester") {
  return requests
    .flatMap((request) =>
      (request.statusHistory || []).map((entry, idx) => ({
        id: `${request._id}-${idx}-${entry.at}`,
        title:
          entry.status === "Accepted"
            ? role === "donor"
              ? `You accepted ${request.hospitalName || "a request"}`
              : `${request.donor?.name || "A donor"} accepted ${request.hospitalName || "your request"}`
            : `${request.hospitalName || "Request"} marked ${entry.status}`,
        body: entry.note || request.location?.address || request.location?.pincode || "Blood request update",
        when: entry.at,
        bloodGroup: request.bloodGroup,
      }))
    )
    .sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime())
    .slice(0, 8);
}

function DashboardStat({ icon: Icon, label, value, hint }) {
  return (
    <div className="panel-soft rounded-[1.6rem] px-4 py-4">
      <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
        <Icon className="h-4 w-4 text-red-600" /> {label}
      </div>
      <div className="mt-3 text-3xl font-black text-slate-950">{value}</div>
      <div className="mt-1 text-xs text-slate-500">{hint}</div>
    </div>
  );
}

function RequesterDashboard() {
  const { token, user } = useAuth();
  const { socket, isConnected } = useSocket(token);
  const [isLocating, setIsLocating] = useState(false);

  const [bloodGroup, setBloodGroup] = useState("O+");
  const [urgency, setUrgency] = useState("Urgent");
  const [hospitalName, setHospitalName] = useState("");
  const [address, setAddress] = useState("");
  const [pincode, setPincode] = useState(user?.location?.pincode || "");
  const [coords, setCoords] = useState(null); // {lat,lng,accuracy}
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const [myRequests, setMyRequests] = useState([]);
  const [activeRequestId, setActiveRequestId] = useState(null);
  const [activeRequest, setActiveRequest] = useState(null);
  const [donorLive, setDonorLive] = useState(null); // {lat,lng,accuracy,timestamp}
  const [nearbyDonors, setNearbyDonors] = useState([]);
  const [isUpdatingRequest, setIsUpdatingRequest] = useState(false);

  const loadMyRequests = async () => {
    const res = await api.get("/requests/me");
    const list = res.data?.data || [];
    setMyRequests(list);
  };

  useEffect(() => {
    loadMyRequests().catch(() => {});
  }, []);

  const captureGps = async () => {
    setError("");
    setStatus("");
    setIsLocating(true);
    try {
      const fix = await capturePreciseLocation();
      setCoords({ lat: fix.lat, lng: fix.lng, accuracy: fix.accuracy });
      setStatus(`GPS locked (±${Math.round(fix.accuracy)}m)`);
      setTimeout(() => setStatus(""), 1500);
    } catch (err) {
      setError(err?.message || "Failed to get location");
    } finally {
      setIsLocating(false);
    }
  };

  const handleMapPick = async (nextCoordinates) => {
    setError("");
    setStatus("");
    setIsLocating(true);
    try {
      const location = await resolveEstimatedLocation({
        coordinates: nextCoordinates,
        accuracy: 30,
      });
      setCoords({
        lat: (location.coordinates || nextCoordinates)[1],
        lng: (location.coordinates || nextCoordinates)[0],
        accuracy: location.accuracy || 30,
      });
      if (location.address) setAddress(location.address);
      if (location.pincode) setPincode(location.pincode);
      setStatus(location.address ? "Pinned location resolved from the map." : "Pinned location selected.");
    } catch (err) {
      setCoords({
        lat: nextCoordinates[1],
        lng: nextCoordinates[0],
        accuracy: 30,
      });
      setStatus("Pinned location selected.");
    } finally {
      setIsLocating(false);
    }
  };

  useEffect(() => {
    if (!socket) return;
    const onAccepted = (payload) => {
      if (payload?.requestId) {
        setStatus(`Request accepted by ${payload.donorName}`);
        if (payload.requestId === activeRequestId) loadMyRequests().catch(() => {});
      }
    };
    const onDonorLoc = (payload) => {
      if (payload?.requestId !== activeRequestId) return;
      setDonorLive(payload.location);
    };
    const onStatus = (payload) => {
      if (payload?.requestId !== activeRequestId) return;
      if (payload?.status) {
        setActiveRequest((prev) => (prev ? { ...prev, status: payload.status } : prev));
        setStatus(`Status: ${payload.status}`);
      }
    };

    socket.on("request_accepted", onAccepted);
    socket.on("donor_location", onDonorLoc);
    socket.on("request_status", onStatus);
    return () => {
      socket.off("request_accepted", onAccepted);
      socket.off("donor_location", onDonorLoc);
      socket.off("request_status", onStatus);
    };
  }, [socket, activeRequestId]);

  const selectRequest = async (id) => {
    setActiveRequestId(id);
    setDonorLive(null);
    setStatus("");
    setError("");
    try {
      const res = await api.get(`/requests/${id}`);
      setActiveRequest(res.data?.data || null);
      if (socket?.connected) socket.emit("join_request_room", { requestId: id });
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to load request");
    }
  };

  const refreshActive = async () => {
    if (!activeRequestId) return;
    const res = await api.get(`/requests/${activeRequestId}`);
    setActiveRequest(res.data?.data || null);
  };

  const cancelActive = async () => {
    if (!activeRequestId) return;
    setError("");
    setStatus("");
    setIsUpdatingRequest(true);
    try {
      const res = await api.patch(`/requests/${activeRequestId}/cancel`);
      if (res.data?.success) {
        await refreshActive();
        setStatus("Request cancelled.");
        await loadMyRequests();
      }
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to cancel request");
    } finally {
      setIsUpdatingRequest(false);
    }
  };

  const completeActive = async () => {
    if (!activeRequestId) return;
    setError("");
    setStatus("");
    setIsUpdatingRequest(true);
    try {
      const res = await api.patch(`/requests/${activeRequestId}/complete`);
      if (res.data?.success) {
        await refreshActive();
        setStatus("Request completed.");
        await loadMyRequests();
      }
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to complete request");
    } finally {
      setIsUpdatingRequest(false);
    }
  };

  useEffect(() => {
    if (!activeRequestId) return;
    if (!socket?.connected) return;
    socket.emit("join_request_room", { requestId: activeRequestId });
  }, [activeRequestId, socket, isConnected]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setStatus("");
    if (!coords) {
      setError("Use GPS or pin the patient location on the map before dispatching the request.");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await api.post("/requests", {
        bloodGroup,
        urgency,
        hospitalName,
        address,
        pincode,
        coordinates: coords ? [coords.lng, coords.lat] : undefined,
        accuracy: coords?.accuracy,
      });
      const request = res.data?.data;
      setStatus("Request created and dispatched to nearby donors.");
      await loadMyRequests();
      if (request?._id) await selectRequest(request._id);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to create request");
    } finally {
      setIsSubmitting(false);
    }
  };

  const requestLatLng = useMemo(() => {
    const c = activeRequest?.location?.coordinates;
    if (Array.isArray(c) && c.length >= 2) return [c[1], c[0]];
    if (coords) return [coords.lat, coords.lng];
    return null;
  }, [activeRequest?.location?.coordinates, coords]);

  const donorLatLng = donorLive ? [donorLive.lat, donorLive.lng] : null;
  const draftRequestLatLng = coords ? [coords.lat, coords.lng] : null;
  const savedUserLatLng = useMemo(() => {
    const c = user?.location?.coordinates;
    if (Array.isArray(c) && c.length >= 2) return [c[1], c[0]];
    return [22.5937, 78.9629];
  }, [user?.location?.coordinates]);
  const statusCounts = useMemo(() => countByStatus(myRequests), [myRequests]);
  const monthlyTrend = useMemo(() => buildMonthlyTrend(myRequests), [myRequests]);
  const urgencyBreakdown = useMemo(
    () => [
      { name: "Urgent", value: myRequests.filter((item) => item.urgency === "Urgent").length },
      { name: "Normal", value: myRequests.filter((item) => item.urgency !== "Urgent").length },
    ],
    [myRequests]
  );
  const notifications = useMemo(() => buildNotificationFeed(myRequests, "requester"), [myRequests]);
  const completionRate = myRequests.length ? Math.round((statusCounts.Completed / myRequests.length) * 100) : 0;

  useEffect(() => {
    const lat = activeRequest?.location?.coordinates?.[1] ?? coords?.lat;
    const lng = activeRequest?.location?.coordinates?.[0] ?? coords?.lng;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setNearbyDonors([]);
      return;
    }

    api
      .get("/donors/nearby", {
        params: {
          lat,
          lng,
          maxDistance: 12000,
          bloodGroup,
          availableOnly: true,
        },
      })
      .then((res) => setNearbyDonors(res.data?.data || []))
      .catch(() => setNearbyDonors([]));
  }, [activeRequest?.location?.coordinates, coords?.lat, coords?.lng, bloodGroup]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="chip">Requester</div>
          <h1 className="mt-3 text-3xl md:text-4xl font-black tracking-tight">Create an emergency request</h1>
          <p className="text-slate-600 mt-2 max-w-2xl">
            Use GPS to pin the patient location, dispatch nearby donors instantly, and track the donor in real time after acceptance.
          </p>
        </div>
        <div className="panel-soft rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-600">
          Socket: <span className={isConnected ? "text-emerald-700" : "text-amber-700"}>{isConnected ? "connected" : "offline"}</span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardStat icon={Droplets} label="Total requests" value={myRequests.length} hint="All requests created from this account" />
        <DashboardStat icon={CheckCircle2} label="Completed" value={statusCounts.Completed} hint={`${completionRate}% fulfillment rate`} />
        <DashboardStat icon={HeartPulse} label="Live now" value={statusCounts.Pending + statusCounts.Accepted} hint="Requests still in motion" />
        <DashboardStat icon={Bell} label="Notifications" value={notifications.length} hint="Recent request activity feed" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="panel rounded-[2rem] p-6 md:p-8">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-lg font-black">Request analytics</div>
              <div className="mt-1 text-sm text-slate-600">A live picture of how your emergency requests are trending over time.</div>
            </div>
            <TrendingUp className="h-5 w-5 text-red-600" />
          </div>
          <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Bar dataKey="requests" fill="#dc2626" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="completed" fill="#0f766e" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={urgencyBreakdown} dataKey="value" nameKey="name" innerRadius={52} outerRadius={82} paddingAngle={4}>
                    {urgencyBreakdown.map((entry) => (
                      <Cell key={entry.name} fill={entry.name === "Urgent" ? "#dc2626" : "#f59e0b"} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="panel rounded-[2rem] p-6 md:p-8">
          <div className="flex items-center justify-between">
            <div className="text-lg font-black">Recent notifications</div>
            <div className="text-xs text-slate-500">{notifications.length} items</div>
          </div>
          <div className="mt-4 space-y-3">
            {notifications.length > 0 ? (
              notifications.map((item) => (
                <div key={item.id} className="panel-soft rounded-[1.4rem] px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-black text-slate-950">{item.title}</div>
                      <div className="mt-1 text-xs leading-relaxed text-slate-600">{item.body}</div>
                    </div>
                    <div className="rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-red-700">
                      {item.bloodGroup}
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-slate-500">{formatWhen(item.when)}</div>
                </div>
              ))
            ) : (
              <div className="panel-soft rounded-[1.4rem] px-4 py-4 text-sm text-slate-500">No notifications yet. Status changes on your requests will appear here.</div>
            )}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-6">
        <motion.form
          onSubmit={submit}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="panel rounded-[2rem] p-6 md:p-8 space-y-5"
        >
          <div className="flex items-center justify-between">
            <div className="text-lg font-black">Request details</div>
            <button
              type="button"
              onClick={captureGps}
              className="btn-ghost text-sm !py-2.5 !px-4 !rounded-2xl"
            >
              <Crosshair className="w-4 h-4" /> {coords ? "Update GPS" : "Use GPS"}
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-slate-500">Blood group</label>
              <select className="input" value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)}>
                {bloodGroups.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-slate-500">Urgency</label>
              <select className="input" value={urgency} onChange={(e) => setUrgency(e.target.value)}>
                {["Urgent", "Normal"].map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-slate-500">Hospital name</label>
              <input className="input" value={hospitalName} onChange={(e) => setHospitalName(e.target.value)} placeholder="e.g., City Hospital" required />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-slate-500">Resolved pincode</label>
              <input
                className="input"
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                placeholder="Appears after GPS or map pin"
                inputMode="numeric"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-slate-500">Address / landmark</label>
            <input className="input" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Auto-filled after GPS or map pin, editable if needed" />
          </div>

          <div className="space-y-3">
            <div className="text-xs font-black uppercase tracking-widest text-slate-500">Pin patient location</div>
            <AuthLocationPicker
              coordinates={coords ? [coords.lng, coords.lat] : null}
              onPick={handleMapPick}
            />
          </div>

          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <div className="panel-soft rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
              <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-red-600" />
                {coords ? `Location ready (±${Math.round(coords.accuracy)}m)` : "GPS preferred · map pin fallback supported"}
              </div>
              <div className="text-xs text-slate-500">{isLocating ? "Locating…" : ""}</div>
            </div>
            <div className="panel-soft rounded-2xl px-4 py-3 text-xs text-slate-600">
              Tap the map if GPS is unavailable or not accurate enough.
            </div>
          </div>

          {error && (
            <div className="panel-soft rounded-2xl px-4 py-3 border border-red-200 bg-red-50 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 inline-block mr-2" />
              {error}
            </div>
          )}
          {status && (
            <div className="panel-soft rounded-2xl px-4 py-3 border border-emerald-200 bg-emerald-50 text-emerald-800 text-sm">
              <CheckCircle2 className="w-4 h-4 inline-block mr-2" />
              {status}
            </div>
          )}

          <button disabled={isSubmitting || isLocating} className="btn-primary w-full text-base !rounded-2xl disabled:opacity-60 disabled:cursor-not-allowed">
            <Navigation className="w-4 h-4" />
            {isSubmitting ? "Dispatching…" : "Dispatch request to nearby donors"}
          </button>
        </motion.form>

        <div className="panel rounded-[2rem] p-6 md:p-8 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-lg font-black">My requests</div>
            <button type="button" className="btn-ghost text-sm !py-2.5 !px-4 !rounded-2xl" onClick={() => loadMyRequests().catch(() => {})}>
              <Radar className="w-4 h-4" /> Refresh
            </button>
          </div>

          <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
            {myRequests.map((r) => (
              <button
                key={r._id}
                type="button"
                onClick={() => selectRequest(r._id)}
                className={`w-full text-left rounded-2xl p-4 border transition-all ${
                  r._id === activeRequestId ? "border-red-200 bg-red-50" : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-black">{r.hospitalName}</div>
                    <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {formatWhen(r.createdAt)}
                      </span>
                      <span>·</span>
                      <span className="text-red-700 font-black">{r.bloodGroup}</span>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${
                      r.status === "Pending"
                        ? "border-amber-200 text-amber-800 bg-amber-50"
                        : r.status === "Accepted"
                        ? "border-emerald-200 text-emerald-800 bg-emerald-50"
                        : r.status === "Completed"
                        ? "border-slate-200 text-slate-700 bg-slate-50"
                        : "border-red-200 text-red-800 bg-red-50"
                    }`}
                  >
                    {r.status}
                  </span>
                </div>
              </button>
            ))}
            {myRequests.length === 0 && <div className="text-sm text-slate-500">No requests yet.</div>}
          </div>
        </div>
      </div>

      {activeRequestId && (
        <div className="panel rounded-[2rem] p-6 md:p-8 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="text-lg font-black">Live tracking</div>
              <div className="text-sm text-slate-600 mt-1">After a donor accepts, their live GPS updates appear here.</div>
            </div>
            <div className="text-xs text-slate-500">
              {activeRequest?.status ? `Status: ${activeRequest.status}` : ""}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={refreshActive} className="btn-ghost text-sm !py-2.5 !px-4 !rounded-2xl">
              <Radar className="w-4 h-4" /> Refresh
            </button>
            {activeRequest?.status === "Pending" && (
              <button
                type="button"
                disabled={isUpdatingRequest}
                onClick={cancelActive}
                className="btn-ghost text-sm !py-2.5 !px-4 !rounded-2xl border-red-200 text-red-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Cancel request
              </button>
            )}
            {activeRequest?.status === "Accepted" && (
              <button
                type="button"
                disabled={isUpdatingRequest}
                onClick={completeActive}
                className="btn-primary text-sm !py-2.5 !px-4 !rounded-2xl disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Mark completed
              </button>
            )}
          </div>

          <div className="rounded-2xl overflow-hidden border border-slate-200">
            <MapContainer center={requestLatLng || draftRequestLatLng || savedUserLatLng} zoom={13} style={{ height: 320, width: "100%" }}>
              <RecenterMap center={requestLatLng || draftRequestLatLng || savedUserLatLng} zoom={13} />
              <SatelliteMapLayers />
              <NearbyMedicalPlaces center={requestLatLng || draftRequestLatLng || savedUserLatLng} radiusMeters={3500} />
              {requestLatLng && (
                <Marker position={requestLatLng}>
                  <Popup>
                    <div className="font-semibold">Request location</div>
                    <div className="text-xs text-gray-500">{activeRequest?.hospitalName || ""}</div>
                  </Popup>
                </Marker>
              )}
              {donorLatLng && (
                <Marker position={donorLatLng}>
                  <Popup>
                    <div className="font-semibold">Donor (live)</div>
                    <div className="text-xs text-gray-500">±{Math.round(donorLive?.accuracy || 0)}m</div>
                  </Popup>
                </Marker>
              )}
              {nearbyDonors.map((donor) => {
                const donorCoords = donor?.location?.coordinates;
                if (!Array.isArray(donorCoords) || donorCoords.length < 2) return null;
                return (
                  <Marker key={donor._id} position={[donorCoords[1], donorCoords[0]]}>
                    <Popup>
                      <div className="font-semibold">{donor.name}</div>
                      <div className="text-xs text-gray-500">{donor.bloodGroup} · nearby donor</div>
                    </Popup>
                  </Marker>
                );
              })}
              {requestLatLng && donorLatLng && <Polyline positions={[requestLatLng, donorLatLng]} pathOptions={{ color: "#dc2626", weight: 4, opacity: 0.85 }} />}
            </MapContainer>
          </div>

          <div className="panel-soft rounded-2xl px-4 py-3 flex items-center justify-between flex-wrap gap-3">
            <div className="text-sm text-slate-700">
              {donorLive ? "Receiving live donor GPS…" : "Waiting for donor acceptance / tracking…"}
            </div>
            <div className="text-xs text-slate-500">{status}</div>
          </div>

          {Array.isArray(activeRequest?.statusHistory) && activeRequest.statusHistory.length > 0 && (
            <div className="panel-soft rounded-2xl px-5 py-4">
              <div className="text-sm font-black">Timeline</div>
              <div className="mt-3 space-y-2">
                {[...activeRequest.statusHistory]
                  .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
                  .slice(0, 12)
                  .map((h, idx) => (
                    <div key={idx} className="flex items-start justify-between gap-3 text-sm">
                      <div className="text-slate-800">
                        <span className="font-black">{h.status}</span>
                        {h.note ? <span className="text-slate-600"> · {h.note}</span> : null}
                        {h.by?.name ? <span className="text-slate-500"> · {h.by.name}</span> : null}
                      </div>
                      <div className="text-xs text-slate-500 whitespace-nowrap">{formatWhen(h.at)}</div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DonorDashboard() {
  const { token, user, setUser } = useAuth();
  const { socket, isConnected } = useSocket(token);
  const { position, error: geoError, isRunning, start, stop } = useGeolocation();

  const [inbox, setInbox] = useState([]);
  const [assignedRequests, setAssignedRequests] = useState([]);
  const [activeRequestId, setActiveRequestId] = useState(null);
  const [activeRequest, setActiveRequest] = useState(null);
  const [nearbyRequests, setNearbyRequests] = useState([]);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [isUpdatingRequest, setIsUpdatingRequest] = useState(false);
  const lastPushRef = useRef(0);
  const lastProfilePushRef = useRef(0);

  const loadAssignedRequests = async () => {
    const res = await api.get("/requests/assigned");
    setAssignedRequests(res.data?.data || []);
  };

  useEffect(() => {
    loadAssignedRequests().catch(() => {});
  }, []);

  useEffect(() => {
    if (!socket) return;

    const onNew = (payload) => {
      if (!payload?.requestId) return;
      setInbox((prev) => {
        if (prev.some((p) => p.requestId === payload.requestId)) return prev;
        return [{ ...payload, receivedAt: Date.now() }, ...prev].slice(0, 30);
      });
    };

    socket.on("new_blood_request", onNew);
    return () => socket.off("new_blood_request", onNew);
  }, [socket]);

  useEffect(() => {
    if (!socket) return;
    const onStatusUpdate = (payload) => {
      if (payload?.requestId !== activeRequestId) return;
      if (payload?.status) {
        setActiveRequest((prev) => (prev ? { ...prev, status: payload.status } : prev));
        setStatus(`Status: ${payload.status}`);
        loadAssignedRequests().catch(() => {});
      }
    };
    socket.on("request_status", onStatusUpdate);
    return () => socket.off("request_status", onStatusUpdate);
  }, [socket, activeRequestId]);

  useEffect(() => {
    if (!isRunning || !position || !activeRequestId) return;
    const now = Date.now();
    if (now - lastPushRef.current < 1500) return;
    lastPushRef.current = now;
    socket.emit("donor_location", {
      requestId: activeRequestId,
      location: { lat: position.lat, lng: position.lng, accuracy: position.accuracy, timestamp: position.timestamp },
    });
  }, [isRunning, position, activeRequestId, socket]);

  useEffect(() => {
    if (!isRunning || !position) return;
    const now = Date.now();
    if (now - lastProfilePushRef.current < 8000) return;
    lastProfilePushRef.current = now;
    api
      .patch("/users/me/location", {
        coordinates: [position.lng, position.lat],
        pincode: user?.location?.pincode,
        city: user?.location?.city,
      })
      .then((res) => {
        if (res.data?.success && res.data?.data) setUser(res.data.data);
      })
      .catch(() => {});
  }, [isRunning, position, user?.location?.pincode, user?.location?.city, setUser]);

  const accept = async (requestId) => {
    setError("");
    setStatus("");
    try {
      const res = await api.put(`/requests/${requestId}/accept`);
      if (!res.data?.success) throw new Error("Accept failed");
      setActiveRequestId(requestId);
      if (socket?.connected) socket.emit("join_request_room", { requestId });
      setStatus("Accepted. Turn on Live GPS to share your route.");

      const detail = await api.get(`/requests/${requestId}`);
      setActiveRequest(detail.data?.data || null);
      await loadAssignedRequests();

      setInbox((prev) => prev.filter((x) => x.requestId !== requestId));
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to accept request");
    }
  };

  const refreshActive = async () => {
    if (!activeRequestId) return;
    const detail = await api.get(`/requests/${activeRequestId}`);
    setActiveRequest(detail.data?.data || null);
  };

  const completeActive = async () => {
    if (!activeRequestId) return;
    setError("");
    setStatus("");
    setIsUpdatingRequest(true);
    try {
      const res = await api.patch(`/requests/${activeRequestId}/complete`);
      if (res.data?.success) {
        await refreshActive();
        await loadAssignedRequests();
        setStatus("Request completed.");
      }
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to complete request");
    } finally {
      setIsUpdatingRequest(false);
    }
  };

  useEffect(() => {
    if (!activeRequestId) return;
    if (!socket?.connected) return;
    socket.emit("join_request_room", { requestId: activeRequestId });
  }, [activeRequestId, socket, isConnected]);

  const toggleAvailability = async () => {
    setError("");
    const next = !(user?.availability ?? true);
    setUser({ ...user, availability: next });
    try {
      const res = await api.patch("/users/me/availability", { availability: next });
      if (res.data?.success && res.data?.data) setUser(res.data.data);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to update availability");
      setUser({ ...user, availability: !next });
    }
  };

  const requestLatLng = useMemo(() => {
    const c = activeRequest?.location?.coordinates;
    if (Array.isArray(c) && c.length >= 2) return [c[1], c[0]];
    return null;
  }, [activeRequest?.location?.coordinates]);

  const donorLatLng = position ? [position.lat, position.lng] : null;
  const savedUserLatLng = useMemo(() => {
    const c = user?.location?.coordinates;
    if (Array.isArray(c) && c.length >= 2) return [c[1], c[0]];
    return [22.5937, 78.9629];
  }, [user?.location?.coordinates]);
  const statusCounts = useMemo(() => countByStatus(assignedRequests), [assignedRequests]);
  const monthlyTrend = useMemo(() => buildMonthlyTrend(assignedRequests), [assignedRequests]);
  const notifications = useMemo(() => {
    const assignedFeed = buildNotificationFeed(assignedRequests, "donor");
    const liveFeed = inbox.slice(0, 8).map((item) => ({
      id: `live-${item.requestId}`,
      title: `${item.hospitalName || "Emergency request"} nearby`,
      body: item.address || "New donor alert waiting in your inbox",
      when: item.receivedAt,
      bloodGroup: item.bloodGroup,
    }));
    return [...liveFeed, ...assignedFeed]
      .sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime())
      .slice(0, 8);
  }, [assignedRequests, inbox]);
  const completionRate = assignedRequests.length ? Math.round((statusCounts.Completed / assignedRequests.length) * 100) : 0;

  useEffect(() => {
    if (!Number.isFinite(position?.lat) || !Number.isFinite(position?.lng)) {
      setNearbyRequests([]);
      return;
    }

    api
      .get("/requests/nearby", {
        params: {
          lat: position.lat,
          lng: position.lng,
          maxDistance: 12000,
        },
      })
      .then((res) => setNearbyRequests(res.data?.data || []))
      .catch(() => setNearbyRequests([]));
  }, [position?.lat, position?.lng, activeRequestId]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="chip">Donor</div>
          <h1 className="mt-3 text-3xl md:text-4xl font-black tracking-tight">Emergency dispatch inbox</h1>
          <p className="text-slate-600 mt-2 max-w-2xl">Accept a nearby request, then share live GPS so the requester can track your route.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={toggleAvailability} className="btn-ghost text-sm !py-2.5 !px-4 !rounded-2xl">
            <span className={`w-2 h-2 rounded-full ${user?.availability ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
            {user?.availability ? "Available" : "Unavailable"}
          </button>
          <div className="panel-soft rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-600">
            Socket: <span className={isConnected ? "text-emerald-700" : "text-amber-700"}>{isConnected ? "connected" : "offline"}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardStat icon={Bell} label="Live alerts" value={inbox.length} hint="Requests currently waiting for your response" />
        <DashboardStat icon={CheckCircle2} label="Completed helps" value={statusCounts.Completed} hint={`${completionRate}% completion rate`} />
        <DashboardStat icon={HeartPulse} label="Accepted" value={statusCounts.Accepted} hint="Requests you have taken on" />
        <DashboardStat icon={TrendingUp} label="Assigned total" value={assignedRequests.length} hint="All requests linked to your donor account" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="panel rounded-[2rem] p-6 md:p-8">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-lg font-black">Donor analytics</div>
              <div className="mt-1 text-sm text-slate-600">Track how often you accept and complete emergency dispatches over time.</div>
            </div>
            <Droplets className="h-5 w-5 text-red-600" />
          </div>
          <div className="mt-6 h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="requests" fill="#0f766e" radius={[8, 8, 0, 0]} />
                <Bar dataKey="completed" fill="#dc2626" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel rounded-[2rem] p-6 md:p-8">
          <div className="flex items-center justify-between">
            <div className="text-lg font-black">Notifications</div>
            <div className="text-xs text-slate-500">{notifications.length} items</div>
          </div>
          <div className="mt-4 space-y-3">
            {notifications.length > 0 ? (
              notifications.map((item) => (
                <div key={item.id} className="panel-soft rounded-[1.4rem] px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-black text-slate-950">{item.title}</div>
                      <div className="mt-1 text-xs leading-relaxed text-slate-600">{item.body}</div>
                    </div>
                    <div className="rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-red-700">
                      {item.bloodGroup}
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-slate-500">{formatWhen(item.when)}</div>
                </div>
              ))
            ) : (
              <div className="panel-soft rounded-[1.4rem] px-4 py-4 text-sm text-slate-500">No notifications yet. New donor alerts and assigned-request updates will appear here.</div>
            )}
          </div>
        </div>
      </div>

      {(error || geoError || status) && (
        <div className="grid md:grid-cols-3 gap-4">
          <div className="md:col-span-2 panel-soft rounded-2xl px-5 py-4 border border-slate-200">
            <div className="text-sm font-bold">Live GPS</div>
            <div className="text-xs text-slate-600 mt-1">{status || "Opt-in only. You can stop anytime."}</div>
          </div>
          {(error || geoError) && (
            <div className="panel-soft rounded-2xl px-5 py-4 border border-red-200 bg-red-50 text-red-700 text-sm">
              {error || geoError}
            </div>
          )}
        </div>
      )}

      <div className="grid lg:grid-cols-[0.95fr_1.05fr] gap-6">
        <div className="panel rounded-[2rem] p-6 md:p-8 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-lg font-black">Incoming requests</div>
            <div className="text-xs text-slate-500">{inbox.length} alerts</div>
          </div>

          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {inbox.map((n) => (
              <div key={n.requestId} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-black flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-9 h-9 rounded-2xl bg-red-50 border border-red-100 text-red-700 font-black">
                        {n.bloodGroup}
                      </span>
                      {n.hospitalName || "Emergency request"}
                    </div>
                    <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                      <MapPin className="w-3 h-3" /> {n.address || n.location || "Location"}
                      <span>·</span>
                      <span className={n.urgency === "Urgent" ? "text-red-700 font-black" : "text-slate-600 font-black"}>{n.urgency}</span>
                    </div>
                  </div>
                  <button className="btn-primary text-xs !py-2.5 !px-4 !rounded-2xl" onClick={() => accept(n.requestId)}>
                    <Phone className="w-4 h-4" /> Accept
                  </button>
                </div>
              </div>
            ))}
            {inbox.length === 0 && (
              <div className="text-sm text-slate-500">
                No live requests yet. Keep availability on and ensure your location is set (Dashboard → Live GPS).
              </div>
            )}
          </div>
        </div>

        <div className="panel rounded-[2rem] p-6 md:p-8 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="text-lg font-black">Active route</div>
              <div className="text-sm text-slate-600 mt-1">Accept a request, then enable Live GPS to share your path.</div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={refreshActive}
                disabled={!activeRequestId}
                className="btn-ghost text-sm !py-2.5 !px-4 !rounded-2xl disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Radar className="w-4 h-4" /> Refresh
              </button>
              <button
                type="button"
                onClick={() => (isRunning ? stop() : start())}
                disabled={!activeRequestId}
                className="btn-ghost text-sm !py-2.5 !px-4 !rounded-2xl disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Radar className="w-4 h-4" /> {isRunning ? "Live On" : "Live Off"}
              </button>
              {activeRequest?.status === "Accepted" && (
                <button
                  type="button"
                  onClick={completeActive}
                  disabled={!activeRequestId || isUpdatingRequest}
                  className="btn-primary text-sm !py-2.5 !px-4 !rounded-2xl disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Mark completed
                </button>
              )}
            </div>
          </div>

          <div className="rounded-2xl overflow-hidden border border-slate-200">
            <MapContainer center={donorLatLng || requestLatLng || savedUserLatLng} zoom={13} style={{ height: 320, width: "100%" }}>
              <RecenterMap center={donorLatLng || requestLatLng || savedUserLatLng} zoom={13} />
              <SatelliteMapLayers />
              <NearbyMedicalPlaces center={donorLatLng || requestLatLng || savedUserLatLng} radiusMeters={3500} />
              {requestLatLng && (
                <Marker position={requestLatLng}>
                  <Popup>
                    <div className="font-semibold">Request</div>
                    <div className="text-xs text-gray-500">{activeRequest?.hospitalName || ""}</div>
                  </Popup>
                </Marker>
              )}
              {donorLatLng && (
                <Marker position={donorLatLng}>
                  <Popup>
                    <div className="font-semibold">You</div>
                    <div className="text-xs text-gray-500">±{Math.round(position?.accuracy || 0)}m</div>
                  </Popup>
                </Marker>
              )}
              {nearbyRequests.map((request) => {
                const requestCoords = request?.location?.coordinates;
                if (!Array.isArray(requestCoords) || requestCoords.length < 2) return null;
                if (activeRequestId && request._id === activeRequestId) return null;
                return (
                  <Marker key={request._id} position={[requestCoords[1], requestCoords[0]]}>
                    <Popup>
                      <div className="font-semibold">{request.hospitalName || "Nearby request"}</div>
                      <div className="text-xs text-gray-500">{request.bloodGroup} · {request.status}</div>
                    </Popup>
                  </Marker>
                );
              })}
              {requestLatLng && donorLatLng && <Polyline positions={[requestLatLng, donorLatLng]} pathOptions={{ color: "#dc2626", weight: 4, opacity: 0.85 }} />}
            </MapContainer>
          </div>

          <div className="panel-soft rounded-2xl px-4 py-3 flex items-center justify-between flex-wrap gap-3">
            <div className="text-sm text-slate-700">{activeRequestId ? `Tracking request ${activeRequestId.slice(-6)}` : "No active request"}</div>
            <div className="text-xs text-slate-500">{position ? `±${Math.round(position.accuracy)}m` : ""}</div>
          </div>

          {Array.isArray(activeRequest?.statusHistory) && activeRequest.statusHistory.length > 0 && (
            <div className="panel-soft rounded-2xl px-5 py-4">
              <div className="text-sm font-black">Timeline</div>
              <div className="mt-3 space-y-2">
                {[...activeRequest.statusHistory]
                  .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
                  .slice(0, 10)
                  .map((h, idx) => (
                    <div key={idx} className="flex items-start justify-between gap-3 text-sm">
                      <div className="text-slate-800">
                        <span className="font-black">{h.status}</span>
                        {h.note ? <span className="text-slate-600"> · {h.note}</span> : null}
                        {h.by?.name ? <span className="text-slate-500"> · {h.by.name}</span> : null}
                      </div>
                      <div className="text-xs text-slate-500 whitespace-nowrap">{formatWhen(h.at)}</div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user, isAuthed, isBootstrapping } = useAuth();

  if (isBootstrapping) return null;
  if (!isAuthed) return <Navigate to="/login" replace />;

  if (user?.role === "admin") {
    return (
      <div className="glass-card rounded-[2rem] p-8">
        <div className="chip">Admin</div>
        <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950">Admin tools live in the control center</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
          We keep the donor/requester workflow separate so admin actions stay focused on platform management.
        </p>
        <div className="mt-5">
          <Link to="/admin" className="btn-primary !rounded-2xl">Open admin dashboard</Link>
        </div>
      </div>
    );
  }

  if (user?.role === "donor") return <DonorDashboard />;
  return <RequesterDashboard />;
}
