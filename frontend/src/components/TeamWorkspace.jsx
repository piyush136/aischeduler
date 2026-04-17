import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Users, Plus, Check, Trash2, Clock, Calendar, Mail, Shield, User, UserPlus, X, Edit2, Pin, FastForward, ChevronRight, LayoutGrid, List, ChevronUp, ChevronDown, Copy, UserMinus, ToggleLeft, ToggleRight, Lock } from 'lucide-react';
import { format, parseISO, isToday, isPast, addDays, nextMonday } from 'date-fns';
import ActionDialog from './ActionDialog';

export default function TeamWorkspace({ token, team, user, onBack, onCreateTask, onEditTask }) {
  const [activeTab, setActiveTab] = useState('tasks');
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');
  const [addMemberLoading, setAddMemberLoading] = useState(false);
  const [addMemberError, setAddMemberError] = useState('');
  const [postponeMenu, setPostponeMenu] = useState(null);
  const [customPostponeDate, setCustomPostponeDate] = useState('');
  const [layoutMode, setLayoutMode] = useState('grid');
  const [expandedTask, setExpandedTask] = useState(null);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [memberFilter, setMemberFilter] = useState(null);
  const [removingMember, setRemovingMember] = useState(null);
  const [permissionUpdating, setPermissionUpdating] = useState(null);
  const [currentTeamInfo, setCurrentTeamInfo] = useState(team);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newTeamName, setNewTeamName] = useState(team.name);
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [isDeletingTeam, setIsDeletingTeam] = useState(false);
  const [dialogState, setDialogState] = useState(null);
  const [dialogLoading, setDialogLoading] = useState(false);
  const postponeRef = useRef(null);

  const closeDialog = () => {
    if (dialogLoading) return;
    setDialogState(null);
  };

  const showNotice = (variant, title, message, options = {}) => {
    setDialogLoading(false);
    setDialogState({
      variant,
      title,
      message,
      confirmLabel: options.confirmLabel || 'OK',
      autoCloseMs: options.autoCloseMs ?? 2200
    });
  };

  const requestConfirmation = ({ title, message, confirmLabel, onConfirm, variant = 'confirm' }) => {
    setDialogLoading(false);
    setDialogState({
      variant,
      title,
      message,
      confirmLabel,
      cancelLabel: 'Cancel',
      onConfirm
    });
  };

  const runDialogAction = async (action) => {
    setDialogLoading(true);
    setDialogState(null);
    try {
      await action();
    } finally {
      setDialogLoading(false);
    }
  };

  // Determine the current user's role and permissions in this team
  const currentMembership = members.find(m => m.user_id === user?._id || m.user_id === user?.id);
  const isAdmin = currentMembership?.role === 'admin';
  const canAddTask = isAdmin || currentMembership?.can_add_task !== false;
  const canEditTask = isAdmin || currentMembership?.can_edit_task !== false;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (postponeRef.current && !postponeRef.current.contains(event.target)) {
        setPostponeMenu(null);
      }
    };
    if (postponeMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [postponeMenu]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tasksRes, membersRes] = await Promise.all([
        fetch(`/api/teams/${team._id}/tasks`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`/api/teams/${team._id}/members`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (tasksRes.ok) setTasks(await tasksRes.json());
      if (membersRes.ok) setMembers(await membersRes.json());
    } catch (err) {
      console.error('Failed to fetch team data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [team._id, token]);

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!memberEmail.trim()) return;

    setAddMemberLoading(true);
    setAddMemberError('');
    try {
      const res = await fetch(`/api/teams/${team._id}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ email: memberEmail.trim() })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add member');

      setMembers(prev => [...prev, data]);
      setMemberEmail('');
      setShowAddMember(false);
    } catch (err) {
      setAddMemberError(err.message);
    } finally {
      setAddMemberLoading(false);
    }
  };

  const handleRemoveMember = async (memberId, memberName) => {
    requestConfirmation({
      title: 'Remove member?',
      message: `Remove ${memberName || 'this member'} from ${currentTeamInfo.name}?`,
      confirmLabel: 'Remove',
      onConfirm: () => runDialogAction(async () => {
        setRemovingMember(memberId);
        try {
          const res = await fetch(`/api/teams/${team._id}/members/${memberId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
          });

          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Failed to remove member');

          setMembers(prev => prev.filter(m => m._id !== memberId));
          showNotice('success', 'Member removed', `${memberName || 'The member'} was removed from the team.`, { autoCloseMs: 2200 });
        } catch (err) {
          showNotice('error', 'Unable to remove member', err.message, { autoCloseMs: 3200 });
        } finally {
          setRemovingMember(null);
        }
      })
    });
  };

  const handleTogglePermission = async (memberId, permName, currentValue) => {
    setPermissionUpdating(`${memberId}-${permName}`);
    try {
      const res = await fetch(`/api/teams/${team._id}/members/${memberId}/permissions`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ [permName]: !currentValue })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update permission');

      // Update local state
      setMembers(prev => prev.map(m => 
        m._id === memberId ? { ...m, [permName]: !currentValue } : m
      ));
    } catch (err) {
      showNotice('error', 'Permission update failed', err.message, { autoCloseMs: 3200 });
    } finally {
      setPermissionUpdating(null);
    }
  };

  const handleUpdateName = async () => {
    if (!newTeamName.trim() || newTeamName === currentTeamInfo.name) {
      setIsEditingName(false);
      return;
    }
    setIsUpdatingName(true);
    try {
      const res = await fetch(`/api/teams/${team._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: newTeamName.trim() })
      });
      if (!res.ok) throw new Error('Failed to update team name');
      const updatedTeam = await res.json();
      setCurrentTeamInfo(updatedTeam);
      setIsEditingName(false);
    } catch (err) {
      showNotice('error', 'Rename failed', err.message, { autoCloseMs: 3200 });
    } finally {
      setIsUpdatingName(false);
    }
  };

  const handleDeleteTeam = async () => {
    requestConfirmation({
      title: 'Delete team?',
      message: `Delete "${currentTeamInfo.name}" and all of its team tasks and memberships? This cannot be undone.`,
      confirmLabel: 'Delete team',
      onConfirm: () => runDialogAction(async () => {
        setIsDeletingTeam(true);
        try {
          const res = await fetch(`/api/teams/${team._id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
          });
          if (!res.ok) throw new Error('Failed to delete team');
          onBack();
        } catch (err) {
          showNotice('error', 'Delete failed', err.message, { autoCloseMs: 3200 });
          setIsDeletingTeam(false);
        }
      })
    });
  };

  const toggleTask = async (taskId, currentStatus) => {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      setTasks(prev => prev.map(t => t._id === taskId ? { ...t, status: newStatus } : t));
    } catch (err) {
      console.error('Failed to toggle task:', err);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-emerald-100 text-emerald-700';
      case 'in_progress': return 'bg-blue-100 text-blue-700';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

    const togglePin = async (task) => {
      try {
        const newStatus = !task.isPinned;
        setTasks(prev => prev.map(t => t._id === task._id ? { ...t, isPinned: newStatus } : t));
        await fetch(`/api/tasks/${task._id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ isPinned: newStatus })
        });
      } catch (err) {
        console.error('Failed to toggle pin', err);
        fetchData();
      }
    };

    const deleteTask = async (taskId) => {
      const task = tasks.find(item => item._id === taskId);
      requestConfirmation({
        title: 'Delete task?',
        message: `Remove "${task?.title || 'this task'}" from the team workspace?`,
        confirmLabel: 'Delete',
        onConfirm: () => runDialogAction(async () => {
          try {
            setTasks(prev => prev.filter(t => t._id !== taskId));
            await fetch(`/api/tasks/${taskId}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${token}` }
            });
            showNotice('success', 'Task deleted', `"${task?.title || 'Task'}" was removed.`, { autoCloseMs: 2200 });
          } catch (err) {
            console.error('Failed to delete task:', err);
            await fetchData();
            showNotice('error', 'Delete failed', 'Unable to delete this task right now.', { autoCloseMs: 3200 });
          }
        })
      });
    };

    const postponeTask = async (taskId, newDate) => {
      try {
        const res = await fetch(`/api/tasks/${taskId}/postpone`, {
          method: 'PATCH',
          headers: { 
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}` 
          },
          body: JSON.stringify({ new_date: newDate })
        });
        if (res.ok) {
           const updatedTask = await res.json();
           setTasks(prev => prev.map(t => t._id === taskId ? updatedTask : t));
        }
        setPostponeMenu(null);
        setCustomPostponeDate('');
      } catch (err) {
        console.error('Failed to postpone task', err);
      }
    };

    const copyToPersonal = async (taskId) => {
      try {
        const res = await fetch(`/api/tasks/${taskId}/copy-personal`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          showNotice('success', 'Task copied', 'The task was copied to your personal workspace.', { autoCloseMs: 2200 });
        } else {
          showNotice('error', 'Copy failed', 'Failed to copy task.', { autoCloseMs: 3200 });
        }
      } catch (err) {
        console.error('Failed to copy task', err);
        showNotice('error', 'Copy failed', 'Failed to copy task.', { autoCloseMs: 3200 });
      }
    };

    const addSubtask = async (taskId) => {
      if (!newSubtaskTitle.trim()) return;
      try {
        const res = await fetch(`/api/tasks/${taskId}/subtasks`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}` 
          },
          body: JSON.stringify({ title: newSubtaskTitle })
        });
        if (res.ok) {
          const updatedTask = await res.json();
          setTasks(prev => prev.map(t => t._id === taskId ? updatedTask : t));
          setNewSubtaskTitle('');
        }
      } catch (err) {
        console.error('Failed to add subtask', err);
      }
    };

    const toggleSubtask = async (taskId, subtaskId, currentStatus) => {
      try {
        const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
        const res = await fetch(`/api/tasks/${taskId}/subtasks/${subtaskId}`, {
          method: 'PATCH',
          headers: { 
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}` 
          },
          body: JSON.stringify({ status: newStatus })
        });
        if (res.ok) {
          const updatedTask = await res.json();
          setTasks(prev => prev.map(t => t._id === taskId ? updatedTask : t));
        }
      } catch (err) {
        console.error('Failed to update subtask', err);
      }
    };

    const deleteSubtask = async (taskId, subtaskId) => {
      requestConfirmation({
        title: 'Delete sub-task?',
        message: 'This sub-task will be removed from the team task.',
        confirmLabel: 'Delete',
        onConfirm: () => runDialogAction(async () => {
          try {
            const res = await fetch(`/api/tasks/${taskId}/subtasks/${subtaskId}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
              const updatedTask = await res.json();
              setTasks(prev => prev.map(t => t._id === taskId ? updatedTask : t));
              showNotice('success', 'Sub-task deleted', 'The sub-task was removed successfully.', { autoCloseMs: 2000 });
            }
          } catch (err) {
            console.error('Failed to delete subtask', err);
            showNotice('error', 'Delete failed', 'Unable to delete this sub-task right now.', { autoCloseMs: 3200 });
          }
        })
      });
    };

    const getQuickDates = () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = addDays(today, 1);
      const next = nextMonday(today);
      return { today, tomorrow, nextWeek: next };
    };

    const sortedTasks = [...tasks]
      .filter(t => {
        if (!memberFilter) return true;
        return t.assigned_to && t.assigned_to.some(a => (a._id || a) === memberFilter);
      })
      .sort((a, b) => {
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        const dateA = a.due_at ? new Date(a.due_at).getTime() : 0;
        const dateB = b.due_at ? new Date(b.due_at).getTime() : 0;
        return dateA - dateB;
      });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-indigo-200/50">
              {currentTeamInfo.name.charAt(0).toUpperCase()}
            </div>
            <div>
              {isEditingName ? (
                <div className="flex items-center gap-2 mb-1">
                  <input
                    type="text"
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    className="px-2 py-1 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 w-48"
                    onKeyPress={(e) => e.key === 'Enter' && handleUpdateName()}
                    autoFocus
                  />
                  <button onClick={handleUpdateName} disabled={isUpdatingName} className="text-emerald-600 hover:bg-emerald-50 p-1.5 rounded-lg transition-colors">
                    <Check size={16} />
                  </button>
                  <button onClick={() => { setIsEditingName(false); setNewTeamName(currentTeamInfo.name); }} className="text-slate-400 hover:bg-slate-100 p-1.5 rounded-lg transition-colors">
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-slate-800">{currentTeamInfo.name}</h2>
                  {isAdmin && (
                    <button onClick={() => setIsEditingName(true)} className="text-slate-400 hover:bg-slate-100 hover:text-indigo-600 p-1.5 rounded-lg transition-colors">
                      <Edit2 size={14} />
                    </button>
                  )}
                </div>
              )}
              <p className="text-xs text-slate-400">{members.length} member{members.length !== 1 ? 's' : ''} · {tasks.length} task{tasks.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
        </div>

        {/* Role badge */}
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${isAdmin ? 'bg-amber-50 text-amber-600 border border-amber-200' : 'bg-slate-50 text-slate-500 border border-slate-200'}`}>
          {isAdmin ? <Shield size={13} /> : <User size={13} />}
          {isAdmin ? 'Admin' : 'Member'}
        </div>

        {isAdmin && (
          <button
            onClick={handleDeleteTeam}
            disabled={isDeletingTeam}
            className="flex items-center gap-2 px-3 py-2.5 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl transition-all transform active:scale-95 disabled:opacity-50 text-sm font-semibold"
            title="Delete Team"
          >
            <Trash2 size={16} />
            <span className="hidden lg:inline">Delete Team</span>
          </button>
        )}

        <button
          onClick={() => { setActiveTab('members'); setShowAddMember(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-semibold text-sm rounded-xl shadow-sm hover:bg-slate-50 hover:text-indigo-600 hover:border-indigo-200 transition-all transform active:scale-95"
        >
          <UserPlus size={16} />
          Add Member
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab('tasks')}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'tasks'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Tasks ({tasks.length})
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'members'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Members ({members.length})
          </button>
        </div>

        {activeTab === 'tasks' && (
          <div className="flex items-center gap-2">
            {canAddTask ? (
              <button
                onClick={() => onCreateTask(team, members)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold text-sm rounded-lg shadow-sm shadow-indigo-200 hover:from-indigo-500 hover:to-violet-500 transition-all transform active:scale-95"
              >
                <Plus size={16} />
                New Task
              </button>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-400 font-medium text-sm rounded-lg cursor-not-allowed" title="You don't have permission to add tasks">
                <Lock size={14} />
                New Task
              </div>
            )}
            <button
              onClick={() => setLayoutMode(prev => prev === 'grid' ? 'list' : 'grid')}
              className="p-1.5 border border-slate-200 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 transition-all shadow-sm bg-white flex items-center justify-center cursor-pointer"
              title={layoutMode === 'grid' ? "Switch to Stacked View" : "Switch to Grid View"}
            >
              {layoutMode === 'grid' ? <List size={20} /> : <LayoutGrid size={20} />}
            </button>
          </div>
        )}
      </div>

      {/* Tasks Tab */}
      {activeTab === 'tasks' && (
        <div className="space-y-3">
          {memberFilter && (
            <div className="mb-2 flex items-center justify-between bg-violet-50 text-violet-700 px-4 py-2.5 rounded-xl border border-violet-100 shadow-sm">
              <div className="flex items-center gap-2">
                <User size={16} />
                <span className="font-medium text-sm">Viewing tasks assigned to: <b>{members.find(m => m.user_id === memberFilter)?.name || 'Member'}</b></span>
              </div>
              <button 
                onClick={() => setMemberFilter(null)}
                className="p-1 hover:bg-violet-200 rounded-lg transition-colors"
                title="Clear filter"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* No permission banner */}
          {!canAddTask && (
            <div className="flex items-center gap-2 bg-amber-50 text-amber-700 px-4 py-3 rounded-xl border border-amber-200 text-sm">
              <Lock size={16} />
              <span>You don't have permission to create tasks in this team. Contact an admin to get access.</span>
            </div>
          )}

          {tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 opacity-60">
              <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
                <Check size={36} className="text-indigo-300" />
              </div>
              <p className="text-slate-500 font-medium">No tasks yet</p>
              <p className="text-slate-400 text-sm mt-1">Create a task to get started!</p>
            </div>
          ) : (
            <div className={`grid gap-4 ${layoutMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
              {sortedTasks.map(task => {
                const isExpanded = expandedTask === task._id;
                const subtaskCount = task.subtasks?.length || 0;
                const completedSubtasks = task.subtasks?.filter(st => st.status === 'completed').length || 0;
                return (
                <div key={task._id} className={`group relative bg-white rounded-xl shadow-sm border border-slate-100/60 hover:shadow-md hover:border-indigo-100/80 transition-all duration-300 flex flex-col hover:-translate-y-1 ${postponeMenu === task._id ? 'z-[150]' : 'z-10'} ${isExpanded ? (layoutMode === 'grid' ? 'col-span-1 md:col-span-2 lg:col-span-2' : '') : ''}`}>
                  
                  {/* Task Content Header Row */}
                  <div className="p-5 pb-3">
                    <div className="flex items-start gap-3 mb-3">
                    <button
                      onClick={() => toggleTask(task._id, task.status)}
                      className={`flex-shrink-0 mt-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                        task.status === 'completed'
                          ? 'bg-indigo-500 border-indigo-500'
                          : 'border-slate-300 hover:border-indigo-500'
                      }`}
                    >
                      {task.status === 'completed' && <Check size={14} className="text-white" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <h3 className={`text-base font-semibold text-slate-800 leading-snug ${task.status === 'completed' ? 'line-through text-slate-400' : ''}`}>
                        {task.isPinned && <Pin size={12} className="inline mr-1 text-indigo-500 fill-current" />}
                        {task.title}
                      </h3>
                    </div>

                    {/* Action buttons pinned to the right edge */}
                    <div className="ml-auto flex items-center flex-shrink-0 gap-0.5 sm:gap-1 mt-0.5">
                      
                      {/* Expand/Collapse Button */}
                      <button
                        onClick={() => setExpandedTask(isExpanded ? null : task._id)}
                        className="p-1 hover:bg-slate-100 rounded-lg transition text-slate-400 hover:text-slate-700"
                        title={isExpanded ? "Collapse task" : "Expand task"}
                      >
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>

                      {task.status !== 'completed' && (
                        <div className="relative" ref={postponeMenu === task._id ? postponeRef : null}>
                          <button 
                              onClick={() => setPostponeMenu(postponeMenu === task._id ? null : task._id)}
                              className={`p-1.5 rounded-lg transition-all ${postponeMenu === task._id ? 'text-indigo-600 bg-indigo-50' : 'text-slate-300 hover:text-indigo-500 hover:bg-indigo-50'}`}
                              title="Postpone task"
                          >
                              <FastForward size={14} />
                          </button>
                          
                          {/* Postpone Popover */}
                          {postponeMenu === task._id && (
                            <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-slate-100 z-[200] p-2 animate-in fade-in slide-in-from-top-2" onClick={e => e.stopPropagation()}>
                              <div className="px-3 py-2 border-b border-slate-100 mb-1">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Postpone to</p>
                              </div>
                              <div className="flex flex-col gap-1">
                                <button onClick={() => postponeTask(task._id, getQuickDates().today.toISOString())} className="w-full text-left px-3 py-2 text-sm text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors flex items-center justify-between group/btn">
                                  <span>Today</span><span className="text-xs text-slate-400 group-hover/btn:text-indigo-400">{format(getQuickDates().today, 'MMM d')}</span>
                                </button>
                                <button onClick={() => postponeTask(task._id, getQuickDates().tomorrow.toISOString())} className="w-full text-left px-3 py-2 text-sm text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors flex items-center justify-between group/btn">
                                  <span>Tomorrow</span><span className="text-xs text-slate-400 group-hover/btn:text-indigo-400">{format(getQuickDates().tomorrow, 'MMM d')}</span>
                                </button>
                                <button onClick={() => postponeTask(task._id, getQuickDates().nextWeek.toISOString())} className="w-full text-left px-3 py-2 text-sm text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors flex items-center justify-between group/btn">
                                  <span>Next Week</span><span className="text-xs text-slate-400 group-hover/btn:text-indigo-400">{format(getQuickDates().nextWeek, 'MMM d')}</span>
                                </button>
                                <div className="h-px bg-slate-100 my-1 relative">
                                  <span className="absolute left-1/2 -translate-x-1/2 -top-2 bg-white px-2 text-[10px] text-slate-300 uppercase font-bold tracking-wider">Or</span>
                                </div>
                                <div className="px-2 pt-1 pb-2 flex items-center gap-2">
                                  <input type="date" value={customPostponeDate} onChange={(e) => setCustomPostponeDate(e.target.value)} className="flex-1 text-sm border-0 bg-slate-50 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-500 text-slate-600 outline-none" />
                                  <button onClick={() => customPostponeDate && postponeTask(task._id, new Date(customPostponeDate).toISOString())} disabled={!customPostponeDate} className={`p-1.5 rounded-lg transition-all ${customPostponeDate ? 'bg-indigo-500 text-white hover:bg-indigo-600 shadow-md shadow-indigo-200' : 'bg-slate-100 text-slate-400'}`}>
                                    <ChevronRight size={16} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      
                      <button 
                          onClick={() => togglePin(task)}
                          className={`p-1.5 rounded-lg transition-all ${task.isPinned ? 'text-indigo-600 bg-indigo-50' : 'text-slate-300 hover:text-indigo-500 hover:bg-indigo-50'}`}
                          title={task.isPinned ? "Unpin task" : "Pin task"}
                      >
                          <Pin size={14} className={task.isPinned ? "fill-current" : ""} />
                      </button>

                      <button
                          onClick={() => copyToPersonal(task._id)}
                          className="p-1.5 rounded-lg transition-all text-slate-300 hover:text-blue-500 hover:bg-blue-50"
                          title="Copy to Personal tasks"
                      >
                          <Copy size={14} />
                      </button>

                      {onEditTask && canEditTask ? (
                        <button
                          onClick={() => onEditTask(task, team, members)}
                          className="p-1.5 rounded-lg transition-all text-slate-300 hover:text-indigo-500 hover:bg-indigo-50"
                          title="Edit task"
                        >
                          <Edit2 size={14} />
                        </button>
                      ) : onEditTask && !canEditTask ? (
                        <button
                          className="p-1.5 rounded-lg transition-all text-slate-200 cursor-not-allowed"
                          title="You don't have permission to edit tasks"
                          disabled
                        >
                          <Edit2 size={14} />
                        </button>
                      ) : null}

                      <button 
                          onClick={() => deleteTask(task._id)}
                          className="p-1.5 rounded-lg transition-all text-slate-300 hover:text-rose-500 hover:bg-rose-50"
                          title="Delete task"
                      >
                          <Trash2 size={14} />
                      </button>
                    </div>
                    </div>
                  </div>

                  {/* Meta */}
                  <div className="flex flex-wrap items-center gap-2 text-xs ml-9 px-5 pb-5">
                    <span className={`px-2 py-0.5 rounded-lg font-medium capitalize ${getStatusColor(task.status)}`}>
                      {task.status.replace('_', ' ')}
                    </span>
                    {task.due_at && (
                      <span className={`flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-50 text-slate-500 ${isToday(parseISO(task.due_at)) ? 'text-green-600 bg-green-50 font-medium' : ''}`}>
                        <Calendar size={11} />
                        {isToday(parseISO(task.due_at)) ? 'Today' : format(parseISO(task.due_at), 'MMM d')}
                      </span>
                    )}
                    {task.assigned_to && task.assigned_to.length > 0 && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-violet-50 text-violet-600 font-medium tracking-wide" title={task.assigned_to.map(a => a.name || a.email).join(', ')}>
                        <User size={11} />
                        {task.assigned_to.length === 1 ? (task.assigned_to[0].name || task.assigned_to[0].email) : `${task.assigned_to.length} Assigned`}
                      </span>
                    )}
                  </div>

                  {/* Expanded Content - Sub-tasks */}
                  {isExpanded && (
                    <div className="px-5 pb-4 border-t pt-4 space-y-3 bg-slate-50/50 mt-auto rounded-b-xl">
                      
                      {/* Sub-tasks List */}
                      {subtaskCount > 0 && (
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <h4 className="text-sm font-semibold text-slate-700">Sub-tasks ({completedSubtasks}/{subtaskCount})</h4>
                            <div className="w-12 h-1 bg-slate-200 rounded-full overflow-hidden">
                              <div className="h-full bg-indigo-500 rounded-full transition-all duration-300" style={{width: `${subtaskCount ? (completedSubtasks/subtaskCount)*100 : 0}%`}}></div>
                            </div>
                          </div>
                          
                          {task.subtasks?.map((subtask) => (
                            <div key={subtask._id} className="flex items-center gap-3 p-2 bg-white border border-slate-100 rounded-lg hover:border-slate-300 transition shadow-sm">
                              <button
                                onClick={() => toggleSubtask(task._id, subtask._id, subtask.status)}
                                className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition ${
                                  subtask.status === 'completed' ? 'bg-green-500 border-green-500' : 'border-slate-300 hover:border-green-500'
                                }`}
                              >
                                {subtask.status === 'completed' && <Check size={12} className="text-white" />}
                              </button>
                              <span className={`flex-1 text-sm ${subtask.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                                {subtask.title}
                              </span>
                              <button
                                onClick={() => deleteSubtask(task._id, subtask._id)}
                                className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition opacity-0 group-hover:opacity-100 block"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add New Sub-task */}
                      <div className="flex gap-2 pt-2 border-t border-slate-100 mt-2">
                        <input
                          type="text"
                          value={expandedTask === task._id ? newSubtaskTitle : ''}
                          onChange={(e) => setNewSubtaskTitle(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && addSubtask(task._id)}
                          placeholder="Add a sub-task..."
                          className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                        />
                        <button
                          onClick={() => addSubtask(task._id)}
                          className="px-3 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition flex items-center justify-center"
                          title="Add sub-task"
                          disabled={!newSubtaskTitle.trim() || expandedTask !== task._id}
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Members Tab */}
      {activeTab === 'members' && (
        <div className="space-y-4">
          {/* We moved the main Add Member button to the header, but keep this one as well just in case they close the form or if form is not showing */}
          {!showAddMember && (
            <button
              onClick={() => setShowAddMember(true)}
              className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-slate-200 hover:border-indigo-400 text-slate-500 hover:text-indigo-600 rounded-xl text-sm font-medium transition-all hover:bg-indigo-50/50"
            >
              <UserPlus size={16} />
              Add Member
            </button>
          )}

          {/* Add Member Form */}
          {showAddMember && (
            <form onSubmit={handleAddMember} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-slate-700">Add member by email</label>
                <button type="button" onClick={() => { setShowAddMember(false); setAddMemberError(''); }} className="text-slate-400 hover:text-slate-600">
                  <X size={16} />
                </button>
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Mail size={16} className="absolute left-3 top-2.5 text-slate-400" />
                  <input
                    autoFocus
                    type="email"
                    value={memberEmail}
                    onChange={e => setMemberEmail(e.target.value)}
                    placeholder="member@example.com"
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={addMemberLoading}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 text-sm font-medium disabled:opacity-50 transition-colors"
                >
                  {addMemberLoading ? 'Adding...' : 'Add'}
                </button>
              </div>
              {addMemberError && (
                <p className="text-rose-500 text-xs font-medium">{addMemberError}</p>
              )}
            </form>
          )}

          {/* Members List */}
          <div className="space-y-2">
            {members.map(member => (
              <div key={member._id} className="bg-white border border-slate-100 rounded-xl p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-400 to-violet-500 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {member.name ? member.name.charAt(0).toUpperCase() : '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-slate-800 text-sm truncate">{member.name || 'Unknown'}</h4>
                    <p className="text-xs text-slate-400 truncate">{member.email}</p>
                  </div>
                  {member.status === 'pending' ? (
                    <span className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-500 rounded-lg text-xs font-semibold whitespace-nowrap opacity-75">
                      <Clock size={12} /> Pending Invite
                    </span>
                  ) : member.role === 'admin' ? (
                    <span className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-600 rounded-lg text-xs font-semibold whitespace-nowrap">
                      <Shield size={12} /> Admin
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 px-2.5 py-1 bg-slate-50 text-slate-500 rounded-lg text-xs font-semibold whitespace-nowrap">
                      <User size={12} /> Member
                    </span>
                  )}
                  
                  <div className="flex items-center gap-2 ml-4">
                    {member.status !== 'pending' && (
                      <>
                        <button
                          onClick={() => {
                            setMemberFilter(member.user_id);
                            setActiveTab('tasks');
                          }}
                          className="px-3 py-1.5 text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
                        >
                          View Tasks
                        </button>
                        {canAddTask && (
                          <button
                            onClick={() => onCreateTask(team, members, member.user_id)}
                            className="px-3 py-1.5 text-xs font-medium bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors whitespace-nowrap"
                          >
                            Assign Task
                          </button>
                        )}
                      </>
                    )}

                    {/* Delete member — admin only, not for self or other admins */}
                    {isAdmin && member.role !== 'admin' && (
                      <button
                        onClick={() => handleRemoveMember(member._id, member.name)}
                        disabled={removingMember === member._id}
                        className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all disabled:opacity-50"
                        title="Remove member from team"
                      >
                        {removingMember === member._id ? (
                          <div className="w-4 h-4 border-2 border-rose-300 border-t-rose-500 rounded-full animate-spin"></div>
                        ) : (
                          <UserMinus size={16} />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Permission toggles - Only show for admin, only for non-admin members, not pending */}
                {isAdmin && member.role !== 'admin' && member.status !== 'pending' && (
                  <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleTogglePermission(member._id, 'can_add_task', member.can_add_task)}
                        disabled={permissionUpdating === `${member._id}-can_add_task`}
                        className={`transition-all ${member.can_add_task !== false ? 'text-emerald-500' : 'text-slate-300'} disabled:opacity-50`}
                        title={member.can_add_task !== false ? 'Click to revoke add task permission' : 'Click to grant add task permission'}
                      >
                        {member.can_add_task !== false ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                      </button>
                      <span className={`text-xs font-medium ${member.can_add_task !== false ? 'text-slate-700' : 'text-slate-400'}`}>
                        Can Add Tasks
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleTogglePermission(member._id, 'can_edit_task', member.can_edit_task)}
                        disabled={permissionUpdating === `${member._id}-can_edit_task`}
                        className={`transition-all ${member.can_edit_task !== false ? 'text-emerald-500' : 'text-slate-300'} disabled:opacity-50`}
                        title={member.can_edit_task !== false ? 'Click to revoke edit task permission' : 'Click to grant edit task permission'}
                      >
                        {member.can_edit_task !== false ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                      </button>
                      <span className={`text-xs font-medium ${member.can_edit_task !== false ? 'text-slate-700' : 'text-slate-400'}`}>
                        Can Edit Tasks
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      <ActionDialog
        isOpen={!!dialogState}
        variant={dialogState?.variant}
        title={dialogState?.title}
        message={dialogState?.message}
        confirmLabel={dialogState?.confirmLabel}
        cancelLabel={dialogState?.cancelLabel}
        onConfirm={dialogState?.onConfirm}
        onClose={closeDialog}
        loading={dialogLoading}
        autoCloseMs={dialogState?.autoCloseMs}
      />
    </div>
  );
}
