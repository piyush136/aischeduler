import { useState, useEffect } from 'react';
import { Users, Plus, ChevronRight, Shield, User } from 'lucide-react';
import CreateTeamModal from './CreateTeamModal';
import { apiUrl } from '../config/api';

export default function TeamList({ token, onSelectTeam }) {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchTeams = async () => {
    try {
      const res = await fetch(apiUrl('/teams'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTeams(data);
      }
    } catch (err) {
      console.error('Failed to fetch teams:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, [token]);

  const handleTeamCreated = (newTeam) => {
    setTeams(prev => [...prev, { ...newTeam, role: 'admin' }]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-slate-500 text-sm mt-1">Collaborate with your team on shared tasks</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition-all hover:from-indigo-500 hover:to-violet-500 active:scale-95 sm:w-auto"
        >
          <Plus size={16} />
          Create Team
        </button>
      </div>

      {/* Team List */}
      {teams.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 opacity-60">
          <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
            <Users size={40} className="text-indigo-300" />
          </div>
          <p className="text-slate-500 font-medium text-lg mb-2">No teams yet</p>
          <p className="px-4 text-center text-sm text-slate-400">Create your first team to start collaborating!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {teams.map(team => (
            <button
              key={team._id}
              onClick={() => onSelectTeam(team)}
              className="group relative rounded-xl border border-slate-100/60 bg-white p-5 pr-12 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lg"
            >
              {/* Team Avatar */}
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-indigo-200/50 mb-4">
                {team.name.charAt(0).toUpperCase()}
              </div>

              <h3 className="mb-1 break-words text-base font-semibold text-slate-800 transition-colors group-hover:text-indigo-600">
                {team.name}
              </h3>

              <div className="flex items-center gap-2 text-xs text-slate-400">
                {team.role === 'admin' ? (
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-600 rounded-lg font-medium">
                    <Shield size={10} /> Admin
                  </span>
                ) : (
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-slate-50 text-slate-500 rounded-lg font-medium">
                    <User size={10} /> Member
                  </span>
                )}
              </div>

              {/* Arrow indicator */}
              <ChevronRight
                size={18}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all"
              />
            </button>
          ))}
        </div>
      )}

      <CreateTeamModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onTeamCreated={handleTeamCreated}
        token={token}
      />
    </div>
  );
}
