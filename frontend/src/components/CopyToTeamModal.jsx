import { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Check } from 'lucide-react';
import { apiUrl } from '../config/api';

export default function CopyToTeamModal({ isOpen, onClose, task, token, onCopied, onError }) {
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [teamMembers, setTeamMembers] = useState([]);
  const [assignedTo, setAssignedTo] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchTeams();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedTeam) {
      fetchMembers(selectedTeam);
    } else {
      setTeamMembers([]);
      setAssignedTo([]);
    }
  }, [selectedTeam]);

  const fetchTeams = async () => {
    try {
      const res = await axios.get(apiUrl('/teams'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTeams(res.data);
    } catch (err) {
      console.error('Failed to fetch teams', err);
    }
  };

  const fetchMembers = async (teamId) => {
    try {
      const res = await axios.get(apiUrl(`/teams/${teamId}/members`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTeamMembers(res.data);
      setAssignedTo([]); // default empty = all
    } catch (err) {
      console.error('Failed to fetch team members', err);
    }
  };

  const toggleAssign = (userId) => {
    setAssignedTo(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
  };

  const handleCopy = async () => {
    if (!selectedTeam) return;
    setLoading(true);
    try {
      await axios.post(
        apiUrl(`/tasks/${task._id}/copy-team`),
        {
          team_id: selectedTeam,
          assigned_to: assignedTo
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      onCopied();
      onClose();
    } catch (err) {
      console.error('Failed to copy to team', err);
      onError?.(err.response?.data?.error || 'Failed to copy task to the team.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !task) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-950/45 p-3 backdrop-blur-sm">
      <div className="relative max-h-[calc(100dvh-1.5rem)] w-full max-w-sm overflow-y-auto rounded-[24px] border border-white/60 bg-white/72 p-4 shadow-[0_35px_120px_rgba(15,23,42,0.28)] backdrop-blur-2xl sm:p-6">
        <button onClick={onClose} className="absolute top-4 right-4 rounded-xl p-1.5 text-slate-400 hover:bg-white hover:text-slate-700">
          <X size={18} />
        </button>
        
        <h2 className="text-xl font-semibold text-slate-950 mb-4">Copy to Team</h2>
        <p className="mb-6 break-words border-l-4 border-aurora-500 bg-white/50 py-2.5 pl-3 pr-2 text-sm italic text-slate-600 rounded-r-xl">
          "{task.title}"
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Select Team</label>
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="premium-input"
            >
              <option value="">-- Choose a Team --</option>
              {teams.map(t => (
                <option key={t._id} value={t._id}>{t.name}</option>
              ))}
            </select>
          </div>

          {selectedTeam && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Assign To (Optional)</label>
              <div className="text-xs text-slate-400 mb-2">Leave blank to assign to all members</div>
              <div className="max-h-40 overflow-y-auto border border-white/70 bg-white/75 rounded-2xl">
                {teamMembers.map(member => (
                  <label key={member.user_id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 border-b border-white/50 last:border-b-0 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={assignedTo.includes(member.user_id)}
                      onChange={() => toggleAssign(member.user_id)}
                      className="w-4 h-4 text-aurora-600 rounded border-slate-300 focus:ring-aurora-300 cursor-pointer"
                    />
                    <span className="text-sm text-slate-700 font-medium">{member.name || member.email}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleCopy}
            disabled={!selectedTeam || loading}
            className={`w-full py-3 rounded-2xl font-semibold text-white transition-all ${!selectedTeam || loading ? 'bg-slate-300 cursor-not-allowed opacity-55' : 'bg-aurora-gradient hover-glow'}`}
          >
            {loading ? 'Copying...' : 'Copy Task'}
          </button>
        </div>
      </div>
    </div>
  );
}
