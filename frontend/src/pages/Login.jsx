import { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Mail, Lock, ArrowRight } from 'lucide-react';

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
      setAuth(res.data.token);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
        setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
       // Ideally this would trigger a backend OAuth flow
       // For this UI demo, we'll try the calendar route or just alert
       try {
           const res = await axios.get('/api/calendar/auth'); // Reusing calendar auth for now as a redirect proxy if it works, otherwise just alert
           window.location.href = res.data.url; 
       } catch (e) {
           alert("Google Sign In configuration needed on backend.");
       }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-100 p-8 space-y-8">
        {/* Header */}
        <div className="text-center">
            <div className="w-12 h-12 bg-indigo-600 rounded-xl mx-auto flex items-center justify-center text-white font-bold text-xl mb-4 shadow-lg shadow-indigo-600/30">
                A
            </div>
            <h2 className="text-3xl font-extrabold text-slate-900">Welcome Back</h2>
            <p className="text-slate-500 mt-2">Sign in to organize your day.</p>
        </div>

        {error && <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg text-center font-medium">{error}</div>}

        {/* Social Auth */}
        <button 
           onClick={handleGoogleLogin}
           className="w-full flex items-center justify-center gap-3 px-4 py-3 border-2 border-slate-100 rounded-xl hover:bg-slate-50 hover:border-slate-200 transition-all font-semibold text-slate-700"
        >
            <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
            Continue with Google
        </button>

        <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
            <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-slate-400">Or continue with email</span></div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Email Address</label>
            <div className="relative">
                <Mail size={18} className="absolute left-3 top-3 text-slate-400" />
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                    placeholder="name@example.com"
                    required
                />
            </div>
          </div>
          <div>
             <div className="flex justify-between mb-1.5">
                <label className="block text-sm font-medium text-slate-700">Password</label>
                <a href="#" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">Forgot password?</a>
             </div>
            <div className="relative">
                <Lock size={18} className="absolute left-3 top-3 text-slate-400" />
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                    placeholder="••••••••"
                    required
                />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-600/30 transition-all active:scale-[0.98] disabled:opacity-70"
          >
            {loading ? 'Signing in...' : 'Sign In'}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500">
          Don't have an account? <Link to="/register" className="font-bold text-indigo-600 hover:text-indigo-700 hover:underline">Sign up for free</Link>
        </p>
      </div>
    </div>
  );
}
