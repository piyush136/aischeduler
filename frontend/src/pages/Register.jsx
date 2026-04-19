import { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle, Lock, Mail, Sparkles } from 'lucide-react';
import ActionDialog from '../components/ActionDialog';
import { apiUrl } from '../config/api';

export default function Register({ setAuth }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [dialogState, setDialogState] = useState(null);

  const showNotice = (variant, title, message, options = {}) => {
    setDialogState({
      variant,
      title,
      message,
      confirmLabel: options.confirmLabel || 'OK',
      autoCloseMs: options.autoCloseMs ?? 2400
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await axios.post(apiUrl('/auth/register'), { name, email, password });
      setAuth(res.data.token, res.data.user);
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    try {
      const res = await axios.get(apiUrl('/calendar/auth'));
      window.location.href = res.data.url;
    } catch (e) {
      showNotice('error', 'Google sign-up unavailable', 'Google authentication is not fully configured right now.', { autoCloseMs: 3200 });
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-3 py-4 sm:px-4">
      <div className="absolute left-0 top-6 h-72 w-72 rounded-full bg-primary-300/28 blur-3xl" />
      <div className="absolute bottom-0 right-10 h-80 w-80 rounded-full bg-aurora-300/26 blur-3xl" />

      <div className="grid w-full max-w-6xl gap-6 lg:grid-cols-[1.02fr_0.98fr]">
        <div className="surface-card relative overflow-hidden p-5 sm:p-7 md:p-8">
          <div className="absolute right-6 top-6 hidden rounded-full border border-white/70 bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-400 md:block">
            New account
          </div>

          <div className="mx-auto max-w-md">
            <div className="mb-6 text-center lg:text-left">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-aurora-gradient text-xl font-black text-white lg:mx-0">
                A
              </div>
              <h2 className="mt-4 text-2xl font-semibold text-slate-950 sm:text-3xl">Create your workspace</h2>
              <p className="mt-2 text-sm text-slate-500 md:text-base">Start with a premium planning environment from day one.</p>
            </div>

            {error && (
              <div className="mb-5 rounded-2xl border border-rosefire-100 bg-rosefire-100/60 px-4 py-3 text-sm font-medium text-rosefire-700">
                {error}
              </div>
            )}

            <button
              onClick={handleGoogleSignup}
              className="mb-5 flex w-full items-center justify-center gap-3 rounded-[22px] border border-white/70 bg-white/78 px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-white"
            >
              <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="h-5 w-5" />
              Continue with Google
            </button>

            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200/80" />
              </div>
              <div className="relative flex justify-center text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 sm:text-xs sm:tracking-[0.24em]">
                <span className="bg-white/70 px-3 backdrop-blur-xl sm:px-4">Or sign up with email</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="premium-input"
                  placeholder="John Doe"
                  required
                />
              </div>
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
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Password</label>
                <div className="relative">
                  <Lock size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="premium-input"
                    style={{ paddingLeft: '3.25rem' }}
                    placeholder="Create a strong password"
                    minLength={6}
                    required
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-white/60 bg-white/65 p-3.5 text-sm text-slate-500">
                <div className="flex items-start gap-3">
                  <CheckCircle size={18} className="mt-0.5 text-aurora-500" />
                  <p className="leading-6">
                    By creating an account, you agree to the Terms of Service and Privacy Policy.
                  </p>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-[22px] bg-aurora-gradient px-6 py-3.5 text-base font-semibold text-white transition hover-glow disabled:opacity-70"
              >
                {loading ? 'Creating account...' : 'Create account'}
                {!loading && <ArrowRight size={18} />}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500 lg:text-left">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-slate-900 transition hover:text-aurora-600">
                Log in
              </Link>
            </p>
          </div>
        </div>

        <div className="hidden rounded-[34px] border border-white/50 bg-slate-950 p-8 text-white shadow-[0_35px_90px_rgba(4,8,24,0.5)] lg:flex lg:flex-col lg:justify-between">
          <div>
            <div className="premium-chip border-white/15 bg-white/8 text-white/80">Designed for modern teams</div>
            <h1 className="mt-5 text-4xl font-semibold leading-tight xl:text-5xl">
              Build a planning system that looks
              <span className="bg-gradient-to-r from-white to-aurora-200 bg-clip-text text-transparent"> as sharp as it works.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-white/65 xl:text-lg xl:leading-8">
              From personal planning to team execution, the interface is crafted to feel high-end, focused, and easy to trust.
            </p>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/6 p-5 backdrop-blur-xl">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-rosefire-500">
                <Sparkles size={22} />
              </div>
              <div>
                <p className="text-lg font-semibold">Premium by default</p>
                <p className="mt-2 text-sm leading-6 text-white/65">
                  Better contrast, calmer gradients, glass layering, and motion that supports the workflow instead of distracting from it.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ActionDialog
        isOpen={!!dialogState}
        variant={dialogState?.variant}
        title={dialogState?.title}
        message={dialogState?.message}
        confirmLabel={dialogState?.confirmLabel}
        onClose={() => setDialogState(null)}
        autoCloseMs={dialogState?.autoCloseMs}
      />
    </div>
  );
}
