import { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Mail, Lock, ArrowRight, CheckCircle } from 'lucide-react';

export default function Register({ setAuth }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await axios.post('/api/auth/register', { email, password });
      setAuth(res.data.token);
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
        setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
       try {
           const res = await axios.get('/api/calendar/auth');
           window.location.href = res.data.url; 
       } catch (e) {
           alert("Google Auth not fully configured.");
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
            <h2 className="text-3xl font-extrabold text-slate-900">Get Started</h2>
            <p className="text-slate-500 mt-2">Create your free account today.</p>
        </div>

        {error && <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg text-center font-medium">{error}</div>}

        {/* Social Auth */}
         <button 
           onClick={handleGoogleSignup}
           className="w-full flex items-center justify-center gap-3 px-4 py-3 border-2 border-slate-100 rounded-xl hover:bg-slate-50 hover:border-slate-200 transition-all font-semibold text-slate-700"
        >
            <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
            Sign up with Google
        </button>

        <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
            <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-slate-400">Or register with email</span></div>
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
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
            <div className="relative">
                <Lock size={18} className="absolute left-3 top-3 text-slate-400" />
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                    placeholder="Create a strong password"
                    minLength={6}
                    required
                />
            </div>
          </div>

          <div className="flex items-start gap-2">
              <div className="mt-0.5">
                  <CheckCircle size={16} className="text-indigo-600" />
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                  By clicking "Create Account", you agree to our Terms of Service and Privacy Policy.
              </p>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-600/30 transition-all active:scale-[0.98] disabled:opacity-70"
          >
            {loading ? 'Creating Account...' : 'Create Account'}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500">
          Already have an account? <Link to="/login" className="font-bold text-indigo-600 hover:text-indigo-700 hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  );
}
