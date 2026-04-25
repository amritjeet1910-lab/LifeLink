import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Crosshair, Droplet } from "lucide-react";
import AuthLayout from "../components/AuthLayout.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { capturePreciseLocation, resolveEstimatedLocation } from "../lib/geolocation";
import { api } from "../lib/api";
import AuthLocationPicker from "../components/AuthLocationPicker.jsx";

const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export default function GoogleAuthCallback() {
  const navigate = useNavigate();
  const { authenticateWithToken, setUser } = useAuth();
  const [searchParams] = useSearchParams();
  const [message, setMessage] = useState("Finishing Google sign-in...");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLocating, setIsLocating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [role, setRole] = useState("requester");
  const [bloodGroup, setBloodGroup] = useState("A+");
  const [pincode, setPincode] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [coordinates, setCoordinates] = useState(null);
  const [accuracy, setAccuracy] = useState(null);

  const hasValidLocation = (user) =>
    Array.isArray(user?.location?.coordinates) &&
    user.location.coordinates.length >= 2 &&
    Number.isFinite(Number(user.location.coordinates[0])) &&
    Number.isFinite(Number(user.location.coordinates[1]));

  useEffect(() => {
    let cancelled = false;

    async function finishAuth() {
      const error = searchParams.get("error");
      const token = searchParams.get("token");

      if (error) {
        navigate(`/login?google_error=${encodeURIComponent(error)}`, { replace: true });
        return;
      }

      if (!token) {
        navigate("/login?google_error=Missing%20Google%20token", { replace: true });
        return;
      }

      try {
        const user = await authenticateWithToken(token);
        if (cancelled) return;

        if (user?.role === "admin" || (!user?.needsOnboarding && hasValidLocation(user))) {
          navigate(user?.role === "admin" ? "/admin" : "/dashboard", { replace: true });
          return;
        }

        setRole(user?.role === "donor" ? "donor" : "requester");
        setBloodGroup(user?.bloodGroup || "A+");
        setPincode(user?.location?.pincode || "");
        setCity(user?.location?.city || "");
        setAddress(user?.location?.address || "");
        setCoordinates(user?.location?.coordinates || null);
        setAccuracy(user?.location?.accuracy || null);
        setNeedsOnboarding(true);
        setMessage("Complete your account setup.");
      } catch (err) {
        if (cancelled) return;
        navigate(`/login?google_error=${encodeURIComponent(err?.message || "Google sign-in failed")}`, { replace: true });
      }
    }

    finishAuth();
    return () => {
      cancelled = true;
    };
  }, [authenticateWithToken, navigate, searchParams]);

  const captureLocation = async () => {
    setErrorMessage("");
    setIsLocating(true);
    try {
      const fix = await capturePreciseLocation({
        goodAccuracyM: 25,
        acceptableAccuracyM: 120,
      });

      const location = await resolveEstimatedLocation({
        coordinates: [fix.lng, fix.lat],
        accuracy: fix.accuracy,
      });

      setCoordinates(location.coordinates || [fix.lng, fix.lat]);
      setAccuracy(location.accuracy || fix.accuracy);
      setAddress(location.address || "");
      setCity(location.city || "");
      setPincode(location.pincode || "");
    } catch (err) {
      setErrorMessage(err?.response?.data?.message || err?.message || "Failed to capture location");
    } finally {
      setIsLocating(false);
    }
  };

  const handleMapPick = async (nextCoordinates) => {
    setErrorMessage("");
    setMessage("Resolving pinned location...");
    setIsLocating(true);
    try {
      const location = await resolveEstimatedLocation({
        coordinates: nextCoordinates,
        accuracy: 30,
      });

      setCoordinates(location.coordinates || nextCoordinates);
      setAccuracy(location.accuracy || 30);
      setAddress(location.address || "");
      setCity(location.city || "");
      setPincode(location.pincode || "");
      setMessage("Pinned location ready.");
    } catch {
      setCoordinates(nextCoordinates);
      setAccuracy(30);
      setAddress("");
      setCity("");
      setPincode("");
      setMessage("Pinned location saved. Address details could not be resolved automatically.");
    } finally {
      setIsLocating(false);
    }
  };

  const completeOnboarding = async (event) => {
    event.preventDefault();
    setErrorMessage("");

    if (role === "donor" && !bloodGroup) {
      setErrorMessage("Select your blood group to continue as a donor.");
      return;
    }

    if (!coordinates) {
      setErrorMessage("Capture your precise location or drop a pin on the map to continue.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.patch("/users/me/onboarding", {
        role,
        bloodGroup: role === "donor" ? bloodGroup : undefined,
        coordinates: coordinates || undefined,
        pincode: pincode || undefined,
        city: city || undefined,
        address: address || undefined,
        accuracy: accuracy || undefined,
      });

      if (!res.data?.success) {
        throw new Error(res.data?.message || "Failed to complete onboarding");
      }

      setUser(res.data.data);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setErrorMessage(err?.response?.data?.message || err?.message || "Failed to complete onboarding");
    } finally {
      setIsSubmitting(false);
    }
  };

  const roleDescription = useMemo(() => {
    if (role === "donor") {
      return "Donate blood when you're available and be matched with nearby requests.";
    }
    return "Create urgent blood requests and coordinate responses near you.";
  }, [role]);

  return (
    <AuthLayout
      title="Complete your setup"
      subtitle="Choose how you want to use LifeLink, then confirm your location so nearby matching works correctly."
      imageSrc="/auth-bg.png"
      imageAlt="LifeLink onboarding"
    >
      <div className="space-y-1">
        <div className="text-3xl font-black text-[rgb(var(--text))]">Complete your setup</div>
        <div className="text-sm text-[rgb(var(--muted))]">{message}</div>
      </div>

      {needsOnboarding ? (
        <form className="mt-6 space-y-5" onSubmit={completeOnboarding}>
          <div className="space-y-2">
            <div className="auth-label">Choose your role</div>
            <div className="grid grid-cols-2 gap-2 rounded-[1.5rem] border border-[rgba(var(--ring)/0.72)] bg-[rgba(var(--surface)/0.62)] p-2">
              {["requester", "donor"].map((nextRole) => (
                <button
                  key={nextRole}
                  type="button"
                  onClick={() => setRole(nextRole)}
                  className={`rounded-xl py-3 text-sm font-black transition-all ${
                    role === nextRole ? "bg-[rgb(var(--accent))] text-white" : "text-[rgb(var(--muted))] hover:bg-[rgba(var(--surface)/0.54)]"
                  }`}
                >
                  {nextRole === "donor" ? "Donor" : "Requester"}
                </button>
              ))}
            </div>
            <div className="text-sm text-[rgb(var(--muted))]">{roleDescription}</div>
          </div>

          {role === "donor" ? (
            <div className="space-y-2">
              <div className="auth-label">Blood group</div>
              <div className="relative">
                <Droplet className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgb(var(--muted))]" />
                <select className="auth-input" value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)}>
                  {bloodGroups.map((group) => (
                    <option key={group} value={group}>{group}</option>
                  ))}
                </select>
              </div>
            </div>
          ) : null}

          <div className="space-y-3 rounded-[1.5rem] border border-[rgba(var(--ring)/0.72)] bg-[rgba(var(--surface)/0.48)] p-4">
            <div className="space-y-1">
              <div className="auth-label">Location</div>
              <div className="text-sm text-[rgb(var(--muted))]">
                Capture your exact location or drop a pin on the satellite map so we can match the right service area.
              </div>
            </div>

            <button type="button" onClick={captureLocation} disabled={isLocating} className="auth-btn-outline flex gap-3">
              <Crosshair className="h-4 w-4" /> {isLocating ? "Capturing location..." : coordinates ? "Update precise location" : "Capture precise location"}
            </button>

            <div className="space-y-2">
              <div className="auth-label">Pin your address</div>
              <AuthLocationPicker coordinates={coordinates} onPick={handleMapPick} />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="auth-location-meta">
                <div className="auth-label">City</div>
                <div className="auth-location-value">{city || "Will appear after pinning"}</div>
              </div>
              <div className="auth-location-meta">
                <div className="auth-label">Pincode</div>
                <div className="auth-location-value">{pincode || "Will appear after pinning"}</div>
              </div>
            </div>

            <div className="auth-location-meta">
              <div className="auth-label">Address</div>
              <div className="auth-location-value auth-location-value-address">
                {address || "Drop a pin on the satellite map or use GPS to resolve the nearest address."}
              </div>
            </div>
          </div>

          {errorMessage ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          ) : null}

          <button disabled={isSubmitting} className="auth-btn-primary disabled:opacity-60 disabled:cursor-not-allowed">
            {isSubmitting ? "Saving your setup..." : "Continue to dashboard"}
          </button>
        </form>
      ) : (
        <div className="mt-6 rounded-2xl border border-[rgba(var(--ring)/0.72)] bg-[rgba(var(--surface)/0.62)] px-5 py-4 text-sm text-[rgb(var(--muted))]">
          Preparing your account...
        </div>
      )}
    </AuthLayout>
  );
}
