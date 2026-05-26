import { useState } from 'react';
import { X, Users } from 'lucide-react';
import { apiUrl } from '../config/api';

export default function CreateTeamModal({ isOpen, onClose, onTeamCreated, token }) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError('');
    try {
      const res = await fetch(apiUrl('/teams'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: name.trim() })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create team');
      }

      const team = await res.json();
      setName('');
      onTeamCreated(team);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-950/45 p-3 backdrop-blur-sm">
      <div className="w-full max-w-md transform overflow-hidden rounded-[24px] border border-white/60 bg-white/72 shadow-[0_35px_120px_rgba(15,23,42,0.28)] backdrop-blur-2xl transition-all animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 bg-aurora-gradient px-4 py-4 sm:px-6 sm:py-5 text-white">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Users size={20} />
            Create New Team
          </h2>
          <button onClick={onClose} className="rounded-xl p-1.5 text-white/75 hover:bg-white/10 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5 p-4 sm:p-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Team Name</label>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g., Marketing Team, Dev Squad..."
              className="premium-input"
              required
            />
          </div>

          {error && (
            <div className="px-4 py-3 bg-rosefire-100/60 border border-rosefire-100 text-rosefire-75 text-sm rounded-xl font-medium">
              {error}
            </div>
          )}

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end sm:gap-3">
            <button
              type="button"
              onClick={onClose}
              className="min-h-11 px-5 py-2.5 text-slate-600 hover:bg-white rounded-xl text-sm font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="min-h-11 px-6 py-2.5 bg-aurora-gradient text-white rounded-xl shadow-lg disabled:opacity-50 text-sm font-semibold transition-all transform active:scale-95 hover-glow"
            >
              {loading ? 'Creating...' : 'Create Team'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
