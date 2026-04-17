import { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { ArrowRight, Lock, Mail, Sparkles } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';

export default function Login({ setAuth }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await axios.post('/api/auth/login', { email, password });
      setAuth(res.data.token, res.data.user);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      setLoading(true);
      const res = await axios.post('/api/auth/google-login', {
        token: credentialResponse.credential
      });
      setAuth(res.data.token, res.data.user);
    } catch (err) {
      setError(err.response?.data?.error || 'Google login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError('Google login failed. Please try again.');
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-4">
      <div className="absolute left-[-8rem] top-6 h-72 w-72 rounded-full bg-aurora-300/35 blur-3xl" />
      <div className="absolute bottom-0 right-[-5rem] h-80 w-80 rounded-full bg-primary-300/25 blur-3xl" />

      <div className="grid w-full max-w-6xl gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="hidden rounded-[34px] border border-white/50 bg-slate-950 p-8 text-white shadow-[0_35px_90px_rgba(4,8,24,0.5)] lg:flex lg:flex-col lg:justify-between">
          <div>
            <div className="premium-chip border-white/15 bg-white/8 text-white/80">Premium planning workspace</div>
            <h1 className="mt-5 text-4xl font-semibold leading-tight xl:text-5xl">
              Welcome back to your
              <span className="bg-gradient-to-r from-white to-primary-200 bg-clip-text text-transparent"> focused command center.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-white/65 xl:text-lg xl:leading-8">
              Review plans, manage your schedule, coordinate teams, and let the AI assistant keep everything in motion.
            </p>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/6 p-5 backdrop-blur-xl">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-aurora-500 to-primary-500">
                <Sparkles size={22} />
              </div>
              <div>
                <p className="text-lg font-semibold">Today’s flow is ready</p>
                <p className="mt-2 text-sm leading-6 text-white/65">
                  AI scheduling, reminders, and calendar sync are designed to feel effortless from the moment you sign in.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="surface-card relative overflow-hidden p-7 md:p-8">
          <div className="absolute right-6 top-6 hidden rounded-full border border-aurora-100 bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-400 md:block">
            Secure Access
          </div>

          <div className="mx-auto max-w-md">
            <div className="mb-6 text-center lg:text-left">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-aurora-gradient text-xl font-black text-white shadow-[0_20px_45px_rgba(146,87,255,0.28)] lg:mx-0">
                A
              </div>
              <h2 className="mt-4 text-3xl font-semibold text-slate-950">Sign in</h2>
              <p className="mt-2 text-sm text-slate-500 md:text-base">Access your premium AI workflow workspace.</p>
            </div>

            {error && (
              <div className="mb-5 rounded-2xl border border-rosefire-100 bg-rosefire-100/60 px-4 py-3 text-sm font-medium text-rosefire-700">
                {error}
              </div>
            )}

            <div className="mb-5 overflow-hidden rounded-2xl border border-white/70 bg-white/75 p-2 shadow-sm">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                theme="outline"
                size="large"
                width="100%"
              />
            </div>

            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200/80" />
              </div>
              <div className="relative flex justify-center text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                <span className="bg-white/70 px-4 backdrop-blur-xl">Or continue with email</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Email Address</label>
                <div className="relative">
                  <Mail size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="premium-input"
                    style={{ paddingLeft: '3.25rem' }}
                    placeholder="name@example.com"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-700">Password</label>
                  <a href="#" className="text-sm font-medium text-aurora-600 transition hover:text-primary-600">
                    Forgot password?
                  </a>
                </div>
                <div className="relative">
                  <Lock size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="premium-input"
                    style={{ paddingLeft: '3.25rem' }}
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-[22px] bg-aurora-gradient px-6 py-3.5 text-base font-semibold text-white transition hover-glow disabled:opacity-70"
              >
                {loading ? 'Signing in...' : 'Enter workspace'}
                {!loading && <ArrowRight size={18} />}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500 lg:text-left">
              Don&apos;t have an account?{' '}
              <Link to="/register" className="font-semibold text-slate-900 transition hover:text-aurora-600">
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
