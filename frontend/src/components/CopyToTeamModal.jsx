import { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Check } from 'lucide-react';

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
      const res = await axios.get('/api/teams', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTeams(res.data);
    } catch (err) {
      console.error('Failed to fetch teams', err);
    }
  };

  const fetchMembers = async (teamId) => {
    try {
      const res = await axios.get(`/api/teams/${teamId}/members`, {
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
        `/api/tasks/${task._id}/copy-team`,
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
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <X size={20} />
        </button>
        
        <h2 className="text-xl font-bold text-gray-800 mb-4">Copy to Team</h2>
        <p className="text-sm border-l-4 border-indigo-500 pl-3 py-1 mb-6 text-slate-600 italic bg-slate-50">
          "{task.title}"
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Team</label>
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="">-- Choose a Team --</option>
              {teams.map(t => (
                <option key={t._id} value={t._id}>{t.name}</option>
              ))}
            </select>
          </div>

          {selectedTeam && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Assign To (Optional)</label>
              <div className="text-xs text-slate-500 mb-2">Leave blank to assign to all members</div>
              <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg">
                {teamMembers.map(member => (
                  <label key={member.user_id} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 border-b last:border-b-0 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={assignedTo.includes(member.user_id)}
                      onChange={() => toggleAssign(member.user_id)}
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                    />
                    <span className="text-sm text-gray-700">{member.name || member.email}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleCopy}
            disabled={!selectedTeam || loading}
            className={`w-full py-2.5 rounded-lg font-semibold text-white transition-all ${!selectedTeam || loading ? 'bg-indigo-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-200'}`}
          >
            {loading ? 'Copying...' : 'Copy Task'}
          </button>
        </div>
      </div>
    </div>
  );
}
