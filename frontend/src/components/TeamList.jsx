import { useState, useEffect } from 'react';
import { Users, Plus, ChevronRight, Shield, User } from 'lucide-react';
import CreateTeamModal from './CreateTeamModal';

export default function TeamList({ token, onSelectTeam }) {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchTeams = async () => {
    try {
      const res = await fetch('/api/teams', {
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
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-500 text-sm mt-1">Collaborate with your team on shared tasks</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold text-sm rounded-xl shadow-lg shadow-indigo-200 hover:from-indigo-500 hover:to-violet-500 transition-all transform active:scale-95"
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
          <p className="text-slate-400 text-sm">Create your first team to start collaborating!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map(team => (
            <button
              key={team._id}
              onClick={() => onSelectTeam(team)}
              className="group relative bg-white rounded-xl shadow-sm border border-slate-100/60 hover:shadow-lg hover:border-indigo-200 transition-all duration-300 hover:-translate-y-1 p-5 text-left"
            >
              {/* Team Avatar */}
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-indigo-200/50 mb-4">
                {team.name.charAt(0).toUpperCase()}
              </div>

              <h3 className="font-semibold text-slate-800 text-base mb-1 group-hover:text-indigo-600 transition-colors">
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
