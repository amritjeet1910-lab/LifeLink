import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, MapPin, Droplet } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { capturePreciseLocation } from '../lib/geolocation';
import AuthLayout from '../components/AuthLayout.jsx';

const Register = () => {
  const [role, setRole] = useState('donor');
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [bloodGroup, setBloodGroup] = useState('A+');
  const [pincode, setPincode] = useState('');
  const [coordinates, setCoordinates] = useState(null); // [lng, lat]
  const [locStatus, setLocStatus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const captureGps = async () => {
    setLocStatus('');
    setError('');
    setLocStatus('Capturing precise GPS fix…');
    try {
      const fix = await capturePreciseLocation();
      setCoordinates([fix.lng, fix.lat]);
      setLocStatus(`Location captured (±${Math.round(fix.accuracy)}m)`);
    } catch (err) {
      setLocStatus('');
      setError(err?.message || 'Failed to get location');
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const payload = {
        name,
        email,
        password,
        role,
        bloodGroup: role === 'donor' ? bloodGroup : undefined,
        pincode,
        coordinates: coordinates || undefined,
      };
      const user = await register(payload);
      navigate(user?.role === 'admin' ? '/admin' : '/dashboard');
    } catch (err) {
      setError(err?.message || 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Register as a requester or donor. GPS is opt-in and captured with high accuracy."
      imageSrc="/lifelink_community_donation_scene_1775928563152.png"
      imageAlt="LifeLink register"
    >
      <div className="space-y-1">
        <div className="text-3xl font-black text-slate-900">Create Account</div>
        <div className="text-sm text-slate-600">Join the LifeLink network.</div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2">
        {['donor', 'requester'].map((r) => (
          <button
            type="button"
            key={r}
            onClick={() => setRole(r)}
            className={`rounded-xl py-3 text-sm font-black transition-all ${
              role === r ? 'bg-red-600 text-white' : 'text-slate-700 hover:bg-slate-50'
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
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
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
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
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
              <Droplet className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
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

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="auth-label">Pincode</div>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Pincode"
                className="auth-input"
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                required
                inputMode="numeric"
              />
            </div>
          </div>
          <div className="space-y-2">
            <div className="auth-label">GPS (optional)</div>
            <button type="button" onClick={captureGps} className="auth-btn-outline">
              {coordinates ? "Update precise GPS" : "Capture precise GPS"}
            </button>
            {locStatus && <div className="text-xs text-slate-600">{locStatus}</div>}
          </div>
        </div>

        <div className="space-y-2">
          <div className="auth-label">Password</div>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
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

        <button type="button" className="auth-btn-outline">
          Continue with Google
        </button>
      </form>

      <div className="mt-6 text-sm text-white/60">
        Already have an account?{" "}
        <Link to="/login" className="text-emerald-700 font-semibold hover:text-emerald-800">
          Log In
        </Link>
      </div>
    </AuthLayout>
  );
};

export default Register;
