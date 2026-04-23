import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Crosshair,
  MapPin,
  Navigation,
  Phone,
  Radar,
} from "lucide-react";
import { MapContainer, Marker, Popup, TileLayer, Polyline } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../lib/api";
import { useGeolocation } from "../hooks/useGeolocation";
import { useSocket } from "../hooks/useSocket";
import { capturePreciseLocation } from "../lib/geolocation";

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
      setError("Please capture GPS location for this request.");
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
        coordinates: [coords.lng, coords.lat],
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
              <label className="text-xs font-black uppercase tracking-widest text-slate-500">Pincode</label>
              <input className="input" value={pincode} onChange={(e) => setPincode(e.target.value)} placeholder="e.g., 144001" required inputMode="numeric" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-slate-500">Address (optional)</label>
            <input className="input" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Ward / building / landmark" />
          </div>

          <div className="panel-soft rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
            <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-red-600" />
              {coords ? `GPS locked (±${Math.round(coords.accuracy)}m)` : "GPS required for dispatch"}
            </div>
            <div className="text-xs text-slate-500">{isLocating ? "Locating…" : ""}</div>
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
            <MapContainer center={requestLatLng || [31.326, 75.5762]} zoom={13} style={{ height: 320, width: "100%" }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
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
  const [activeRequestId, setActiveRequestId] = useState(null);
  const [activeRequest, setActiveRequest] = useState(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [isUpdatingRequest, setIsUpdatingRequest] = useState(false);
  const lastPushRef = useRef(0);
  const lastProfilePushRef = useRef(0);

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
            <MapContainer center={requestLatLng || [31.326, 75.5762]} zoom={13} style={{ height: 320, width: "100%" }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
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

  if (user?.role === "donor" || user?.role === "admin") return <DonorDashboard />;
  return <RequesterDashboard />;
}
