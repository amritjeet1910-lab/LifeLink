import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import AuthLayout from '../components/AuthLayout.jsx';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const user = await login({ email, password });
      navigate(user?.role === 'admin' ? '/admin' : '/dashboard');
    } catch (err) {
      setError(err?.message || 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to create requests, accept emergencies, and track live GPS — only when you opt in."
      imageSrc="/lifelink_hero_tech_illustration_1775928376879.png"
      imageAlt="LifeLink login"
    >
      <div className="space-y-1">
        <div className="text-3xl font-black text-slate-900">Welcome Back</div>
        <div className="text-sm text-slate-600">Sign in to continue.</div>
      </div>

      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
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

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="auth-label">Password</div>
            <button type="button" className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition-colors">
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="password"
              placeholder="Password"
              className="auth-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <button disabled={isSubmitting} className="auth-btn-primary disabled:opacity-60 disabled:cursor-not-allowed">
          {isSubmitting ? "Logging in…" : "Log In"}
        </button>

        <div className="auth-sep">OR</div>

        <button type="button" className="auth-btn-outline">
          Continue with Google
        </button>
      </form>

      <div className="mt-6 text-sm text-white/60">
        Don&apos;t have an account?{" "}
        <Link to="/register" className="text-emerald-700 font-semibold hover:text-emerald-800">
          Sign Up
        </Link>
      </div>
    </AuthLayout>
  );
};

export default Login;
