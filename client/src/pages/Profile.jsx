/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { Bell, Check, Clock, Contrast, Crosshair, KeyRound, LogOut, Mail, MapPin, MoonStar, Phone, Save, Search, Settings, ShieldCheck, SunMedium, User } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../lib/api";
import { capturePreciseLocation, resolveEstimatedLocation } from "../lib/geolocation";
import AuthLocationPicker from "../components/AuthLocationPicker.jsx";
import { applyAccessibilitySettings, readStoredTheme, writeTheme } from "../lib/preferences.js";

const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const tabs = [
  { id: "profile", label: "Profile", icon: User },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "settings", label: "Settings", icon: Settings },
];

function ToggleRow({ title, description, checked, onChange }) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-[1.4rem] border border-[rgba(var(--ring)/0.74)] bg-[rgba(var(--surface)/0.58)] px-4 py-4">
      <div>
        <div className="text-sm font-black text-[rgb(var(--text))]">{title}</div>
        <div className="mt-1 text-xs leading-relaxed text-[rgb(var(--muted))]">{description}</div>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 rounded-full transition ${checked ? "bg-[rgb(var(--accent))]" : "bg-[rgba(var(--border)/1)]"}`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${checked ? "left-6" : "left-1"}`}
        />
      </button>
    </label>
  );
}

function formatWhen(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return "";
  }
}

export default function Profile() {
  const { user, isAuthed, isBootstrapping, setUser, logout } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [theme, setTheme] = useState(() => readStoredTheme());
  const [form, setForm] = useState(() => ({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    bloodGroup: user?.bloodGroup || "A+",
    pincode: user?.location?.pincode || "",
    city: user?.location?.city || "",
    address: user?.location?.address || "",
    availability: Boolean(user?.availability),
    coordinates: user?.location?.coordinates || null,
    accuracy: user?.location?.accuracy || null,
    source: user?.location?.source || "manual",
  }));
  const [settingsForm, setSettingsForm] = useState(() => ({
    notifications: {
      requestAlerts: user?.settings?.notifications?.requestAlerts ?? true,
      donorMatches: user?.settings?.notifications?.donorMatches ?? true,
      statusUpdates: user?.settings?.notifications?.statusUpdates ?? true,
      nearbyCampaigns: user?.settings?.notifications?.nearbyCampaigns ?? false,
      emailDigest: user?.settings?.notifications?.emailDigest ?? false,
    },
    accessibility: {
      reducedMotion: user?.settings?.accessibility?.reducedMotion ?? false,
      highContrast: user?.settings?.accessibility?.highContrast ?? false,
      largerText: user?.settings?.accessibility?.largerText ?? false,
      keyboardShortcuts: user?.settings?.accessibility?.keyboardShortcuts ?? true,
    },
    donorSearch: {
      defaultRadiusKm: user?.settings?.donorSearch?.defaultRadiusKm ?? 10,
      availableOnly: user?.settings?.donorSearch?.availableOnly ?? true,
      prioritizeNearest: user?.settings?.donorSearch?.prioritizeNearest ?? true,
      autoRefresh: user?.settings?.donorSearch?.autoRefresh ?? true,
    },
  }));
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [notificationFeed, setNotificationFeed] = useState([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);

  const currentTab = tabs.some((tab) => tab.id === searchParams.get("tab")) ? searchParams.get("tab") : "profile";
  const isRequester = user?.role === "requester" || user?.role === "admin";
  const isDonor = user?.role === "donor";

  useEffect(() => {
    if (!user) return;
    setForm({
      name: user?.name || "",
      email: user?.email || "",
      phone: user?.phone || "",
      bloodGroup: user?.bloodGroup || "A+",
      pincode: user?.location?.pincode || "",
      city: user?.location?.city || "",
      address: user?.location?.address || "",
      availability: Boolean(user?.availability),
      coordinates: user?.location?.coordinates || null,
      accuracy: user?.location?.accuracy || null,
      source: user?.location?.source || "manual",
    });
    setSettingsForm({
      notifications: {
        requestAlerts: user?.settings?.notifications?.requestAlerts ?? true,
        donorMatches: user?.settings?.notifications?.donorMatches ?? true,
        statusUpdates: user?.settings?.notifications?.statusUpdates ?? true,
        nearbyCampaigns: user?.settings?.notifications?.nearbyCampaigns ?? false,
        emailDigest: user?.settings?.notifications?.emailDigest ?? false,
      },
      accessibility: {
        reducedMotion: user?.settings?.accessibility?.reducedMotion ?? false,
        highContrast: user?.settings?.accessibility?.highContrast ?? false,
        largerText: user?.settings?.accessibility?.largerText ?? false,
        keyboardShortcuts: user?.settings?.accessibility?.keyboardShortcuts ?? true,
      },
      donorSearch: {
        defaultRadiusKm: user?.settings?.donorSearch?.defaultRadiusKm ?? 10,
        availableOnly: user?.settings?.donorSearch?.availableOnly ?? true,
        prioritizeNearest: user?.settings?.donorSearch?.prioritizeNearest ?? true,
        autoRefresh: user?.settings?.donorSearch?.autoRefresh ?? true,
      },
    });
  }, [user]);

  useEffect(() => {
    writeTheme(theme);
  }, [theme]);

  useEffect(() => {
    applyAccessibilitySettings(settingsForm.accessibility);
    return () => {
      applyAccessibilitySettings(user?.settings?.accessibility || {});
    };
  }, [settingsForm.accessibility, user?.settings?.accessibility]);

  useEffect(() => {
    if (currentTab !== "notifications" || !user) return;

    const loadNotifications = async () => {
      setIsLoadingNotifications(true);
      try {
        const endpoint = isDonor ? "/requests/assigned" : "/requests/me";
        const res = await api.get(endpoint);
        const requests = res.data?.data || [];
        const feed = requests
          .flatMap((request) =>
            (request.statusHistory || []).map((entry, idx) => ({
              id: `${request._id}-${idx}-${entry.at}`,
              title:
                entry.status === "Accepted"
                  ? isDonor
                    ? `You accepted ${request.hospitalName || "a request"}`
                    : `${request.donor?.name || "A donor"} accepted ${request.hospitalName || "your request"}`
                  : `${request.hospitalName || "Request"} marked ${entry.status}`,
              body: entry.note || request.location?.address || request.location?.pincode || "Blood request update",
              when: entry.at,
              status: entry.status,
              bloodGroup: request.bloodGroup,
            }))
          )
          .sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime())
          .slice(0, 20);
        setNotificationFeed(feed);
      } catch {
        setNotificationFeed([]);
      } finally {
        setIsLoadingNotifications(false);
      }
    };

    loadNotifications().catch(() => {});
  }, [currentTab, isDonor, user]);

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateSettings = (section, key, value) => {
    setSettingsForm((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value,
      },
    }));
  };

  const locationBadge = useMemo(() => {
    if (form.source === "gps") return "Precise GPS";
    if (form.source === "estimated") return "Pinned on map";
    return "Manual";
  }, [form.source]);

  if (isBootstrapping) return null;
  if (!isAuthed) return <Navigate to="/login" replace />;

  const setTab = (tab) => {
    const next = new URLSearchParams(searchParams);
    if (tab === "profile") next.delete("tab");
    else next.set("tab", tab);
    setSearchParams(next, { replace: true });
  };

  const captureGps = async () => {
    setError("");
    setStatus("");
    setIsLocating(true);
    try {
      const fix = await capturePreciseLocation();
      const res = await api.patch("/users/me/location", {
        coordinates: [fix.lng, fix.lat],
        pincode: form.pincode,
        city: form.city,
        address: form.address,
        accuracy: fix.accuracy,
      });
      if (res.data?.success) {
        setUser(res.data.data);
        setStatus(`GPS updated (±${Math.round(fix.accuracy)}m).`);
      }
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to capture GPS");
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
      setForm((prev) => ({
        ...prev,
        coordinates: location.coordinates || nextCoordinates,
        pincode: location.pincode || prev.pincode,
        city: location.city || prev.city,
        address: location.address || prev.address,
        accuracy: location.accuracy || 30,
        source: location.source || "estimated",
      }));
      setStatus("Pinned location ready. Save changes to persist it.");
    } catch {
      setForm((prev) => ({
        ...prev,
        coordinates: nextCoordinates,
        accuracy: 30,
        source: "estimated",
      }));
      setStatus("Pinned location saved. Save changes to persist it.");
    } finally {
      setIsLocating(false);
    }
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    setError("");
    setStatus("");
    setIsSavingProfile(true);
    try {
      const res = await api.patch("/users/me/profile", {
        name: form.name,
        email: form.email,
        phone: form.phone,
        bloodGroup: user?.role === "donor" ? form.bloodGroup : undefined,
        pincode: form.pincode,
        city: form.city,
        address: form.address,
        availability: user?.role === "donor" ? form.availability : undefined,
        coordinates: form.coordinates || undefined,
        accuracy: form.accuracy || undefined,
      });
      if (res.data?.success) {
        setUser(res.data.data);
        setStatus("Profile updated.");
      }
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to save profile");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const saveSettings = async () => {
    setError("");
    setStatus("");
    setIsSavingSettings(true);
    try {
      const res = await api.patch("/users/me/settings", {
        settings: settingsForm,
      });
      if (res.data?.success) {
        setUser(res.data.data);
        setStatus("Settings updated.");
      }
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to save settings");
    } finally {
      setIsSavingSettings(false);
    }
  };

  const savePassword = async (event) => {
    event.preventDefault();
    setError("");
    setStatus("");

    if (passwordForm.newPassword.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    setIsSavingPassword(true);
    try {
      const res = await api.patch("/auth/change-password", {
        currentPassword: passwordForm.currentPassword || undefined,
        newPassword: passwordForm.newPassword,
      });
      if (res.data?.success) {
        setUser({
          ...user,
          hasPassword: true,
        });
        setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
        setStatus(res.data?.message || "Password updated.");
      }
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to update password");
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-6">
        <section className="glass-card rounded-[2rem] p-4 md:p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3 rounded-[1.5rem] bg-[rgba(var(--surface)/0.56)] px-4 py-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[rgba(var(--accent)/0.16)] text-base font-black text-[rgb(var(--accent-dark))]">
                {(form.name || user?.name || "U").slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-black text-[rgb(var(--text))]">{form.name || user?.name || "Account"}</div>
                <div className="truncate text-xs uppercase tracking-[0.18em] text-[rgb(var(--muted))]">{user?.role || "member"}</div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setTab(tab.id)}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-black transition ${
                    currentTab === tab.id
                      ? "bg-[rgba(var(--accent)/0.12)] text-[rgb(var(--accent-dark))]"
                      : "bg-[rgba(var(--surface)/0.52)] text-[rgb(var(--muted))] hover:text-[rgb(var(--text))]"
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-6">
          {currentTab === "profile" ? (
            <>
              <form onSubmit={saveProfile} className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="glass-card rounded-[2rem] p-6 md:p-8 space-y-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-xl font-black text-[rgb(var(--text))]">Personal details</div>
                      <div className="mt-2 text-sm text-[rgb(var(--muted))]">Everything your recipients, admins, and donor matching flows rely on.</div>
                    </div>
                    <div className="rounded-full border border-[rgba(var(--ring)/0.8)] bg-[rgba(var(--surface)/0.62)] px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-[rgb(var(--muted))]">
                      {user?.authProvider === "google" ? "Google account" : "Email account"}
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-xs font-black uppercase tracking-[0.18em] text-[rgb(var(--muted))]">Full name</span>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[rgb(var(--muted))]" />
                        <input className="input pl-11" value={form.name} onChange={(e) => updateField("name", e.target.value)} required />
                      </div>
                    </label>
                    <label className="space-y-2">
                      <span className="text-xs font-black uppercase tracking-[0.18em] text-[rgb(var(--muted))]">Email</span>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[rgb(var(--muted))]" />
                        <input className="input pl-11" type="email" value={form.email} onChange={(e) => updateField("email", e.target.value)} required />
                      </div>
                    </label>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-xs font-black uppercase tracking-[0.18em] text-[rgb(var(--muted))]">Phone</span>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[rgb(var(--muted))]" />
                        <input className="input pl-11" value={form.phone} onChange={(e) => updateField("phone", e.target.value)} placeholder="Optional phone number" />
                      </div>
                    </label>
                    {user?.role === "donor" ? (
                      <label className="space-y-2">
                        <span className="text-xs font-black uppercase tracking-[0.18em] text-[rgb(var(--muted))]">Blood group</span>
                        <select className="input" value={form.bloodGroup} onChange={(e) => updateField("bloodGroup", e.target.value)}>
                          {bloodGroups.map((group) => (
                            <option key={group} value={group}>{group}</option>
                          ))}
                        </select>
                      </label>
                    ) : null}
                  </div>

                  {user?.role === "donor" ? (
                    <ToggleRow
                      title="Donor availability"
                      description="Allow nearby requesters to reach you in live dispatch when you are ready to donate."
                      checked={form.availability}
                      onChange={(value) => updateField("availability", value)}
                    />
                  ) : null}

                  <div className="flex flex-wrap items-center gap-3">
                    <button type="submit" disabled={isSavingProfile} className="btn-primary text-sm !rounded-2xl disabled:opacity-60">
                      <Save className="h-4 w-4" /> {isSavingProfile ? "Saving…" : "Save profile"}
                    </button>
                  </div>
                </div>

                <div className="glass-card rounded-[2rem] p-6 md:p-8 space-y-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-xl font-black text-[rgb(var(--text))]">Location</div>
                      <div className="mt-2 text-sm text-[rgb(var(--muted))]">Use precise GPS when possible, or place the pin yourself for exact dispatch.</div>
                    </div>
                    <span className="rounded-full border border-[rgba(var(--accent)/0.22)] bg-[rgba(var(--accent)/0.10)] px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-[rgb(var(--accent-dark))]">
                      {locationBadge}
                    </span>
                  </div>

                  <label className="space-y-2">
                    <span className="text-xs font-black uppercase tracking-[0.18em] text-[rgb(var(--muted))]">Address</span>
                    <textarea className="input min-h-[120px] resize-y" value={form.address} onChange={(e) => updateField("address", e.target.value)} placeholder="Landmark, hospital, street, or locality" />
                  </label>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-xs font-black uppercase tracking-[0.18em] text-[rgb(var(--muted))]">City</span>
                      <input className="input" value={form.city} onChange={(e) => updateField("city", e.target.value)} />
                    </label>
                    <label className="space-y-2">
                      <span className="text-xs font-black uppercase tracking-[0.18em] text-[rgb(var(--muted))]">Resolved pincode</span>
                      <div className="relative">
                        <MapPin className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[rgb(var(--muted))]" />
                        <input className="input pl-11" value={form.pincode} onChange={(e) => updateField("pincode", e.target.value)} placeholder="Appears after GPS or map pin" />
                      </div>
                    </label>
                  </div>

                  <div className="space-y-3">
                    <div className="text-xs font-black uppercase tracking-[0.18em] text-[rgb(var(--muted))]">Pin your location</div>
                    <AuthLocationPicker coordinates={form.coordinates} onPick={handleMapPick} />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <button type="button" onClick={captureGps} disabled={isLocating} className="btn-primary justify-center text-sm !rounded-2xl disabled:opacity-60">
                      <Crosshair className="h-4 w-4" /> {isLocating ? "Locating…" : "Capture precise GPS"}
                    </button>
                    <div className="rounded-2xl border border-[rgba(var(--ring)/0.74)] bg-[rgba(var(--surface)/0.58)] px-4 py-3 text-sm text-[rgb(var(--muted))]">
                      Tap the map to place the pin yourself.
                    </div>
                  </div>

                  <div className="rounded-[1.5rem] border border-[rgba(var(--ring)/0.74)] bg-[rgba(var(--surface)/0.58)] px-4 py-4 text-sm text-[rgb(var(--muted))]">
                    {form.coordinates ? (
                      <div className="space-y-1">
                        <div className="font-black text-[rgb(var(--text))]">
                          {form.coordinates[1].toFixed(5)}, {form.coordinates[0].toFixed(5)}
                        </div>
                        <div className="text-xs text-[rgb(var(--muted))]">
                          {form.accuracy ? `Accuracy ±${Math.round(form.accuracy)}m` : "Estimated location"} · Source: {locationBadge}
                        </div>
                      </div>
                    ) : (
                      <div>No location saved yet.</div>
                    )}
                  </div>
                </div>
              </form>
            </>
          ) : null}

          {currentTab === "notifications" ? (
            <div className="glass-card rounded-[2rem] p-6 md:p-8 space-y-6">
              <div>
                <div className="text-xl font-black text-[rgb(var(--text))]">Notifications</div>
                <div className="mt-2 text-sm text-[rgb(var(--muted))]">Recent activity now appears here, along with the delivery preferences that shape it.</div>
              </div>

              <div className="space-y-3">
                <div className="text-sm font-black text-[rgb(var(--text))]">Recent activity</div>
                {isLoadingNotifications ? (
                  <div className="rounded-[1.4rem] border border-[rgba(var(--ring)/0.74)] bg-[rgba(var(--surface)/0.58)] px-4 py-4 text-sm text-[rgb(var(--muted))]">
                    Loading notifications…
                  </div>
                ) : notificationFeed.length > 0 ? (
                  <div className="space-y-3">
                    {notificationFeed.map((item) => (
                      <div key={item.id} className="rounded-[1.4rem] border border-[rgba(var(--ring)/0.74)] bg-[rgba(var(--surface)/0.58)] px-4 py-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-black text-[rgb(var(--text))]">{item.title}</div>
                            <div className="mt-1 text-xs leading-relaxed text-[rgb(var(--muted))]">{item.body}</div>
                          </div>
                          <div className="rounded-full bg-[rgba(var(--accent)/0.12)] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[rgb(var(--accent-dark))]">
                            {item.bloodGroup}
                          </div>
                        </div>
                        <div className="mt-3 flex items-center gap-2 text-xs text-[rgb(var(--muted))]">
                          <Clock className="h-3.5 w-3.5" /> {formatWhen(item.when)} · {item.status}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-[1.4rem] border border-[rgba(var(--ring)/0.74)] bg-[rgba(var(--surface)/0.58)] px-4 py-4 text-sm text-[rgb(var(--muted))]">
                    No notifications yet. Live donor alerts still appear first in the dashboard during active dispatch.
                  </div>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <ToggleRow
                  title="Request alerts"
                  description="Immediate alerts when a matching blood request is created nearby."
                  checked={settingsForm.notifications.requestAlerts}
                  onChange={(value) => updateSettings("notifications", "requestAlerts", value)}
                />
                <ToggleRow
                  title="Donor matches"
                  description="Updates when nearby donors are matched or become reachable for a request."
                  checked={settingsForm.notifications.donorMatches}
                  onChange={(value) => updateSettings("notifications", "donorMatches", value)}
                />
                <ToggleRow
                  title="Status updates"
                  description="Accepted, completed, cancelled, and live coordination updates for active requests."
                  checked={settingsForm.notifications.statusUpdates}
                  onChange={(value) => updateSettings("notifications", "statusUpdates", value)}
                />
                <ToggleRow
                  title="Nearby campaigns"
                  description="Occasional awareness drives, donation camps, and local community announcements."
                  checked={settingsForm.notifications.nearbyCampaigns}
                  onChange={(value) => updateSettings("notifications", "nearbyCampaigns", value)}
                />
              </div>

              <ToggleRow
                title="Email digest"
                description="A lighter summary of account activity instead of only real-time interruptions."
                checked={settingsForm.notifications.emailDigest}
                onChange={(value) => updateSettings("notifications", "emailDigest", value)}
              />

              <button type="button" onClick={saveSettings} disabled={isSavingSettings} className="btn-primary text-sm !rounded-2xl disabled:opacity-60">
                <Save className="h-4 w-4" /> {isSavingSettings ? "Saving…" : "Save notification preferences"}
              </button>
            </div>
          ) : null}

          {currentTab === "settings" ? (
            <div className="space-y-6">
              <div className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
                <div className="glass-card rounded-[2rem] p-6 md:p-8 space-y-6">
                  <div>
                    <div className="text-xl font-black text-[rgb(var(--text))]">Appearance and accessibility</div>
                    <div className="mt-2 text-sm text-[rgb(var(--muted))]">Adjust the interface for comfort, visibility, and lower cognitive load during urgent tasks.</div>
                  </div>

                  <div className="rounded-[1.5rem] border border-[rgba(var(--ring)/0.74)] bg-[rgba(var(--surface)/0.58)] px-4 py-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="text-sm font-black text-[rgb(var(--text))]">Theme</div>
                        <div className="mt-1 text-xs text-[rgb(var(--muted))]">Move theme control out of the navbar and manage it here.</div>
                      </div>
                      <div className="inline-flex rounded-full border border-[rgba(var(--ring)/0.72)] bg-[rgba(var(--surface)/0.82)] p-1">
                        <button
                          type="button"
                          onClick={() => setTheme("light")}
                          className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-black ${theme === "light" ? "bg-[rgba(var(--accent)/0.14)] text-[rgb(var(--accent-dark))]" : "text-[rgb(var(--muted))]"}`}
                        >
                          <SunMedium className="h-3.5 w-3.5" /> Light
                        </button>
                        <button
                          type="button"
                          onClick={() => setTheme("dark")}
                          className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-black ${theme === "dark" ? "bg-[rgba(var(--accent)/0.14)] text-[rgb(var(--accent-dark))]" : "text-[rgb(var(--muted))]"}`}
                        >
                          <MoonStar className="h-3.5 w-3.5" /> Dark
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <ToggleRow
                      title="Reduced motion"
                      description="Soften animation and movement for calmer transitions."
                      checked={settingsForm.accessibility.reducedMotion}
                      onChange={(value) => updateSettings("accessibility", "reducedMotion", value)}
                    />
                    <ToggleRow
                      title="High contrast"
                      description="Increase separation between text, cards, and controls."
                      checked={settingsForm.accessibility.highContrast}
                      onChange={(value) => updateSettings("accessibility", "highContrast", value)}
                    />
                    <ToggleRow
                      title="Larger text"
                      description="Increase reading comfort across navigation, forms, and panels."
                      checked={settingsForm.accessibility.largerText}
                      onChange={(value) => updateSettings("accessibility", "largerText", value)}
                    />
                    <ToggleRow
                      title="Keyboard shortcuts"
                      description="Keep keyboard-first navigation patterns enabled for faster workflows."
                      checked={settingsForm.accessibility.keyboardShortcuts}
                      onChange={(value) => updateSettings("accessibility", "keyboardShortcuts", value)}
                    />
                  </div>
                </div>

                <div className="glass-card rounded-[2rem] p-6 md:p-8 space-y-6">
                  {isRequester ? (
                    <>
                      <div>
                        <div className="text-xl font-black text-[rgb(var(--text))]">Donor search defaults</div>
                        <div className="mt-2 text-sm text-[rgb(var(--muted))]">Set the way donor discovery should behave when you open search.</div>
                      </div>

                      <div className="rounded-[1.5rem] border border-[rgba(var(--ring)/0.74)] bg-[rgba(var(--surface)/0.58)] px-4 py-4">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <div className="text-sm font-black text-[rgb(var(--text))]">Default search radius</div>
                            <div className="mt-1 text-xs text-[rgb(var(--muted))]">Choose how wide donor search should begin.</div>
                          </div>
                          <div className="text-sm font-black text-[rgb(var(--accent-dark))]">{settingsForm.donorSearch.defaultRadiusKm} km</div>
                        </div>
                        <input
                          type="range"
                          min={2}
                          max={30}
                          value={settingsForm.donorSearch.defaultRadiusKm}
                          onChange={(e) => updateSettings("donorSearch", "defaultRadiusKm", Number(e.target.value))}
                          className="mt-4 w-full"
                        />
                      </div>

                      <div className="space-y-4">
                        <ToggleRow
                          title="Available donors only"
                          description="Default to showing donors who are currently available to respond."
                          checked={settingsForm.donorSearch.availableOnly}
                          onChange={(value) => updateSettings("donorSearch", "availableOnly", value)}
                        />
                        <ToggleRow
                          title="Prioritize nearest donors"
                          description="Sort and present closest candidates first when multiple donors match."
                          checked={settingsForm.donorSearch.prioritizeNearest}
                          onChange={(value) => updateSettings("donorSearch", "prioritizeNearest", value)}
                        />
                        <ToggleRow
                          title="Auto-refresh nearby results"
                          description="Refresh donor search as your location changes during active use."
                          checked={settingsForm.donorSearch.autoRefresh}
                          onChange={(value) => updateSettings("donorSearch", "autoRefresh", value)}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <div className="text-xl font-black text-[rgb(var(--text))]">Dispatch preferences</div>
                        <div className="mt-2 text-sm text-[rgb(var(--muted))]">These controls are donor-specific, so you only see the settings relevant to helping in live emergencies.</div>
                      </div>
                      <div className="grid gap-4">
                        <div className="rounded-[1.5rem] border border-[rgba(var(--ring)/0.74)] bg-[rgba(var(--surface)/0.58)] px-4 py-4">
                          <div className="text-sm font-black text-[rgb(var(--text))]">Live dispatch role</div>
                          <div className="mt-2 text-xs leading-relaxed text-[rgb(var(--muted))]">
                            As a donor, your dashboard focuses on incoming alerts, route sharing, and completion history instead of donor search defaults.
                          </div>
                        </div>
                        <ToggleRow
                          title="Request alerts"
                          description="Keep urgent nearby donor alerts enabled when requesters need a match."
                          checked={settingsForm.notifications.requestAlerts}
                          onChange={(value) => updateSettings("notifications", "requestAlerts", value)}
                        />
                        <ToggleRow
                          title="Status updates"
                          description="Continue receiving acceptance, completion, and dispatch-state changes."
                          checked={settingsForm.notifications.statusUpdates}
                          onChange={(value) => updateSettings("notifications", "statusUpdates", value)}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
                <form onSubmit={savePassword} className="glass-card rounded-[2rem] p-6 md:p-8 space-y-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-xl font-black text-[rgb(var(--text))]">Security</div>
                      <div className="mt-2 text-sm text-[rgb(var(--muted))]">
                        {user?.authProvider === "google" && !user?.hasPassword
                          ? "Add an email password so you can also sign in without Google when needed."
                          : "Change your existing password to keep the account secure."}
                      </div>
                    </div>
                    <div className="rounded-full border border-[rgba(var(--ring)/0.74)] bg-[rgba(var(--surface)/0.58)] px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-[rgb(var(--muted))]">
                      {user?.hasPassword ? "Password active" : "Password not set"}
                    </div>
                  </div>

                  {(user?.authProvider === "local" || user?.hasPassword) ? (
                    <label className="space-y-2">
                      <span className="text-xs font-black uppercase tracking-[0.18em] text-[rgb(var(--muted))]">Current password</span>
                      <input
                        type="password"
                        className="input"
                        value={passwordForm.currentPassword}
                        onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
                        autoComplete="current-password"
                      />
                    </label>
                  ) : null}

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-xs font-black uppercase tracking-[0.18em] text-[rgb(var(--muted))]">{user?.hasPassword ? "New password" : "Create password"}</span>
                      <input
                        type="password"
                        className="input"
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                        autoComplete="new-password"
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-xs font-black uppercase tracking-[0.18em] text-[rgb(var(--muted))]">Confirm password</span>
                      <input
                        type="password"
                        className="input"
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                        autoComplete="new-password"
                      />
                    </label>
                  </div>

                  <button type="submit" disabled={isSavingPassword} className="btn-primary text-sm !rounded-2xl disabled:opacity-60">
                    <KeyRound className="h-4 w-4" /> {isSavingPassword ? "Saving…" : user?.hasPassword ? "Change password" : "Add password"}
                  </button>
                </form>

                <div className="glass-card rounded-[2rem] p-6 md:p-8 space-y-5">
                  <div>
                    <div className="text-xl font-black text-[rgb(var(--text))]">Account actions</div>
                    <div className="mt-2 text-sm text-[rgb(var(--muted))]">The high-impact switches live here instead of cluttering the navbar.</div>
                  </div>

                  <div className="grid gap-4">
                    <div className="rounded-[1.5rem] border border-[rgba(var(--ring)/0.74)] bg-[rgba(var(--surface)/0.58)] px-4 py-4">
                      <div className="flex items-center gap-3">
                        <ShieldCheck className="h-4 w-4 text-[rgb(var(--accent))]" />
                        <div>
                          <div className="text-sm font-black text-[rgb(var(--text))]">Privacy and control</div>
                          <div className="mt-1 text-xs text-[rgb(var(--muted))]">Your location sharing remains opt-in and contextual to active workflows.</div>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-[1.5rem] border border-[rgba(var(--ring)/0.74)] bg-[rgba(var(--surface)/0.58)] px-4 py-4">
                      <div className="flex items-center gap-3">
                        <Search className="h-4 w-4 text-[rgb(var(--accent))]" />
                        <div>
                          <div className="text-sm font-black text-[rgb(var(--text))]">Search defaults</div>
                          <div className="mt-1 text-xs text-[rgb(var(--muted))]">{isRequester ? "Your donor search preferences will shape the default discovery experience." : "Requester-only search defaults are hidden on donor accounts to keep settings relevant."}</div>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-[1.5rem] border border-[rgba(var(--ring)/0.74)] bg-[rgba(var(--surface)/0.58)] px-4 py-4">
                      <div className="flex items-center gap-3">
                        <Contrast className="h-4 w-4 text-[rgb(var(--accent))]" />
                        <div>
                          <div className="text-sm font-black text-[rgb(var(--text))]">Accessible by design</div>
                          <div className="mt-1 text-xs text-[rgb(var(--muted))]">Preview larger text, stronger contrast, and reduced motion instantly.</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button type="button" onClick={saveSettings} disabled={isSavingSettings} className="btn-primary text-sm !rounded-2xl disabled:opacity-60">
                      <Save className="h-4 w-4" /> {isSavingSettings ? "Saving…" : "Save settings"}
                    </button>
                    <button type="button" onClick={logout} className="btn-ghost text-sm !rounded-2xl text-red-700">
                      <LogOut className="h-4 w-4" /> Log out
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {status ? (
            <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4" />
                {status}
              </div>
            </div>
          ) : null}
          {error ? (
            <div className="rounded-[1.5rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
