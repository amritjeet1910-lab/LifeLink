import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, Droplet, Crosshair } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { capturePreciseLocation, resolveEstimatedLocation } from '../lib/geolocation';
import AuthLayout from '../components/AuthLayout.jsx';
import GoogleAuthButton from '../components/GoogleAuthButton.jsx';
import AuthLocationPicker from '../components/AuthLocationPicker.jsx';

const Register = () => {
  const [role, setRole] = useState('donor');
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [bloodGroup, setBloodGroup] = useState('A+');
  const [pincode, setPincode] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [coordinates, setCoordinates] = useState(null); // [lng, lat]
  const [accuracy, setAccuracy] = useState(null);
  const [locStatus, setLocStatus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState('');

  const captureGps = async () => {
    setLocStatus('');
    setError('');
    setIsLocating(true);
    setLocStatus('Capturing precise GPS fix…');
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
      setAddress(location.address || '');
      setCity(location.city || '');
      setPincode(location.pincode || '');
      setLocStatus(
        location.address
          ? `Location captured and address filled automatically (±${Math.round(fix.accuracy)}m).`
          : `Location captured (±${Math.round(fix.accuracy)}m).`
      );
    } catch (err) {
      setLocStatus('');
      setError(err?.message || 'Failed to get location');
    } finally {
      setIsLocating(false);
    }
  };

  const handleMapPick = async (nextCoordinates) => {
    setError('');
    setLocStatus('Resolving pinned location…');
    setIsLocating(true);
    try {
      const location = await resolveEstimatedLocation({
        coordinates: nextCoordinates,
        accuracy: 30,
      });
      setCoordinates(location.coordinates || nextCoordinates);
      setAccuracy(location.accuracy || 30);
      setAddress(location.address || '');
      setCity(location.city || '');
      setPincode(location.pincode || '');
      setLocStatus(
        location.address ? 'Pinned location resolved from the map.' : 'Pinned location selected.'
      );
    } catch {
      setCoordinates(nextCoordinates);
      setAccuracy(30);
      setAddress('');
      setCity('');
      setPincode('');
      setLocStatus('Pinned location saved. Address details could not be resolved automatically.');
    } finally {
      setIsLocating(false);
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!coordinates) {
      setError('Capture your location or drop a pin on the map to create your account.');
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        name,
        email,
        password,
        role,
        bloodGroup: role === 'donor' ? bloodGroup : undefined,
        pincode: pincode || undefined,
        city: city || undefined,
        address: address || undefined,
        coordinates: coordinates || undefined,
        accuracy: accuracy || undefined,
      };
      const user = await register(payload);
      navigate(user?.role === 'admin' ? '/admin' : '/dashboard');
    } catch (err) {
      setError(err?.response?.data?.message || err?.response?.data?.error || err?.message || 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Register as a requester or donor. Capture GPS or drop a pin on the satellite map so nearby matching works correctly."
      imageSrc="/auth-bg.png"
      imageAlt="LifeLink register"
    >
      <div className="space-y-1">
        <div className="text-3xl font-black text-[rgb(var(--text))]">Create Account</div>
        <div className="text-sm text-[rgb(var(--muted))]">Join the LifeLink network.</div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-2 rounded-[1.5rem] border border-[rgba(var(--ring)/0.72)] bg-[rgba(var(--surface)/0.62)] p-2">
        {['donor', 'requester'].map((r) => (
          <button
            type="button"
            key={r}
            onClick={() => setRole(r)}
            className={`rounded-xl py-3 text-sm font-black transition-all ${
              role === r ? 'bg-[rgb(var(--accent))] text-white' : 'text-[rgb(var(--muted))] hover:bg-[rgba(var(--surface)/0.54)]'
            }`}
          >
            {r === 'donor' ? 'Donor' : 'Requester'}
          </button>
        ))}
      </div>

      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="auth-label">Full name</div>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgb(var(--muted))]" />
              <input
                type="text"
                placeholder="Full Name"
                className="auth-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
              />
            </div>
          </div>
          <div className="space-y-2">
            <div className="auth-label">Email address</div>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgb(var(--muted))]" />
              <input
                type="email"
                placeholder="Email Address"
                className="auth-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
          </div>
        </div>

        {role === 'donor' && (
          <div className="space-y-2">
            <div className="auth-label">Blood group</div>
            <div className="relative">
              <Droplet className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgb(var(--muted))]" />
              <select className="auth-input" value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)}>
                {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <div className="space-y-2">
            <div className="auth-label">Location</div>
            <button type="button" onClick={captureGps} disabled={isLocating} className="flex gap-3 auth-input">
              <Crosshair /> {isLocating ? 'Capturing location…' : coordinates ? 'Update GPS location' : 'Capture location automatically'}
            </button>
          </div>

          <div className="space-y-2">
            <div className="auth-label">Pin your address</div>
            <AuthLocationPicker coordinates={coordinates} onPick={handleMapPick} />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="auth-location-meta">
              <div className="auth-label">City</div>
              <div className="auth-location-value">{city || 'Will appear after pinning'}</div>
            </div>
            <div className="auth-location-meta">
              <div className="auth-label">Pincode</div>
              <div className="auth-location-value">{pincode || 'Will appear after pinning'}</div>
            </div>
          </div>

          <div className="auth-location-meta">
            <div className="auth-label">Address</div>
            <div className="auth-location-value auth-location-value-address">
              {address || 'Drop a pin on the satellite map or use GPS to resolve the nearest address.'}
            </div>
          </div>
        </div>

        {locStatus ? (
          <div className="rounded-2xl border border-[rgba(var(--ring)/0.82)] bg-[rgba(var(--surface)/0.72)] px-4 py-3 text-sm text-[rgb(var(--text))]">
            {locStatus}
          </div>
        ) : null}

        <div className="space-y-2">
          <div className="auth-label">Password</div>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgb(var(--muted))]" />
            <input
              type="password"
              placeholder="Password"
              className="auth-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              minLength={6}
            />
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <button disabled={isSubmitting} className="auth-btn-primary disabled:opacity-60 disabled:cursor-not-allowed">
          {isSubmitting ? "Creating…" : "Create Account"}
        </button>

        <div className="auth-sep">OR</div>

        <GoogleAuthButton disabled={isSubmitting} />
      </form>

      <div className="mt-6 text-sm text-[rgb(var(--muted))]">
        Already have an account?{" "}
        <Link to="/login" className="font-semibold text-[rgb(var(--accent))] hover:opacity-85">
          Log In
        </Link>
      </div>
    </AuthLayout>
  );
};

export default Register;
