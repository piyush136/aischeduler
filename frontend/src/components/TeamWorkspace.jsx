import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Users, Plus, Check, Trash2, Clock, Calendar, Mail, Shield, User, UserPlus, X, Edit2, Pin, FastForward, ChevronRight, LayoutGrid, List, ChevronUp, ChevronDown, Copy, UserMinus, ToggleLeft, ToggleRight, Lock, MessageSquare, Send, Search, RefreshCw } from 'lucide-react';
import { format, parseISO, isToday, isPast, addDays, nextMonday } from 'date-fns';
import ActionDialog from './ActionDialog';
import { apiUrl } from '../config/api';

export default function TeamWorkspace({ token, team, user, initialMessageTarget, onBack, onCreateTask, onEditTask }) {
  const [activeTab, setActiveTab] = useState('tasks');
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [selectedMessageMember, setSelectedMessageMember] = useState(null);
  const [messageSearch, setMessageSearch] = useState('');
  const [messageDraft, setMessageDraft] = useState('');
  const [messageSending, setMessageSending] = useState(false);
  const [messagesError, setMessagesError] = useState('');
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
  const [commentDrafts, setCommentDrafts] = useState({});
  const [commentSending, setCommentSending] = useState(null);
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
  const messagesEndRef = useRef(null);
  const handledMessageRequestRef = useRef(null);

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
  const currentUserId = user?._id || user?.id;
  const isAdmin = currentMembership?.role === 'admin';
  const canAddTask = isAdmin || currentMembership?.can_add_task !== false;
  const canEditTask = isAdmin || currentMembership?.can_edit_task !== false;
  const isTeamChatSelected = selectedMessageMember?.type === 'team';

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

  const fetchData = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const [tasksRes, membersRes] = await Promise.all([
        fetch(apiUrl(`/teams/${team._id}/tasks`), {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(apiUrl(`/teams/${team._id}/members`), {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (tasksRes.ok) setTasks(await tasksRes.json());
      if (membersRes.ok) {
        const nextMembers = await membersRes.json();
        setMembers(nextMembers);
        setSelectedMessageMember(prev => {
          if (!prev) return prev;
          if (prev.type === 'team') return prev;
          return nextMembers.find(member => member.user_id === prev.user_id) || prev;
        });
      }
    } catch (err) {
      console.error('Failed to fetch team data:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const fetchMessages = async ({ silent = false } = {}) => {
    const isTeamConversation = selectedMessageMember?.type === 'team';
    const recipientId = selectedMessageMember?.user_id;
    if (!isTeamConversation && !recipientId) {
      setMessages([]);
      return;
    }

    if (!silent) setMessagesLoading(true);
    setMessagesError('');
    try {
      const messagePath = isTeamConversation
        ? `/teams/${team._id}/messages?conversationType=team&limit=1000`
        : `/teams/${team._id}/messages?memberId=${encodeURIComponent(recipientId)}&limit=1000`;
      const res = await fetch(apiUrl(messagePath), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch messages');
      setMessages(data);
    } catch (err) {
      if (!silent) setMessagesError(err.message);
      console.error('Failed to fetch team messages:', err);
    } finally {
      if (!silent) setMessagesLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [team._id, token]);

  useEffect(() => {
    if (activeTab !== 'messages' || selectedMessageMember) return;
    if (initialMessageTarget?.type === 'direct') return;
    setSelectedMessageMember({ type: 'team', name: `${currentTeamInfo.name} Chat` });
  }, [activeTab, members, selectedMessageMember, currentUserId, initialMessageTarget?.type]);

  useEffect(() => {
    if (!initialMessageTarget) return;

    const requestKey = initialMessageTarget.nonce || `${initialMessageTarget.type}-${initialMessageTarget.userId || initialMessageTarget.actorName || 'team'}`;
    if (handledMessageRequestRef.current !== requestKey) {
      handledMessageRequestRef.current = requestKey;
      setActiveTab('messages');
      setMessages([]);
      setMessageDraft('');
      setMessagesError('');
    }

    if (initialMessageTarget.type === 'team') {
      setSelectedMessageMember({ type: 'team', name: `${currentTeamInfo.name} Chat` });
      return;
    }

    if (initialMessageTarget.userId || initialMessageTarget.actorName) {
      const actorQuery = String(initialMessageTarget.actorName || '').trim().toLowerCase();
      const targetMember = members.find(member => {
        if (initialMessageTarget.userId && String(member.user_id) === String(initialMessageTarget.userId)) {
          return true;
        }
        if (!actorQuery) return false;
        const memberName = String(member.name || '').trim().toLowerCase();
        const memberEmail = String(member.email || '').trim().toLowerCase();
        return (
          (memberName && memberName === actorQuery) ||
          (memberEmail && memberEmail === actorQuery) ||
          (memberName && actorQuery.includes(memberName))
        );
      });

      if (targetMember) {
        setSelectedMessageMember(prev => (
          prev?.type !== 'team' && String(prev?.user_id) === String(targetMember.user_id)
            ? prev
            : targetMember
        ));
      }
    }
  }, [initialMessageTarget?.nonce, initialMessageTarget?.type, initialMessageTarget?.userId, initialMessageTarget?.actorName, members, currentTeamInfo.name]);

  useEffect(() => {
    if (activeTab !== 'messages') return undefined;
    fetchData({ silent: true });
    const intervalId = window.setInterval(() => fetchData({ silent: true }), 8000);
    return () => window.clearInterval(intervalId);
  }, [activeTab, team._id, token]);

  useEffect(() => {
    if (activeTab !== 'messages' || !selectedMessageMember) return undefined;
    fetchMessages({ silent: messages.length > 0 });
    const intervalId = window.setInterval(() => fetchMessages({ silent: true }), 8000);
    return () => window.clearInterval(intervalId);
  }, [activeTab, team._id, token, selectedMessageMember?.user_id, selectedMessageMember?.type]);

  useEffect(() => {
    if (activeTab === 'messages') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages, activeTab]);

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!memberEmail.trim()) return;

    setAddMemberLoading(true);
    setAddMemberError('');
    try {
      const res = await fetch(apiUrl(`/teams/${team._id}/members`), {
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

  const handleSendMessage = async (e) => {
    e.preventDefault();
    const body = messageDraft.trim();
    if (!body || messageSending || !selectedMessageMember) return;
    const isTeamConversation = selectedMessageMember.type === 'team';

    setMessageSending(true);
    setMessagesError('');
    try {
      const res = await fetch(apiUrl(`/teams/${team._id}/messages`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          body,
          recipient_id: isTeamConversation ? null : selectedMessageMember.user_id,
          conversation_type: isTeamConversation ? 'team' : 'direct'
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send message');

      setMessages(prev => [...prev, data]);
      setMessageDraft('');
    } catch (err) {
      setMessagesError(err.message);
    } finally {
      setMessageSending(false);
    }
  };

  const handleSelectMessageMember = (member) => {
    if (member.status !== 'active' || String(member.user_id) === String(currentUserId)) return;
    setSelectedMessageMember(member);
    setMessages([]);
    setMessageDraft('');
    setMessagesError('');
  };

  const handleSelectTeamChat = () => {
    setSelectedMessageMember({ type: 'team', name: `${currentTeamInfo.name} Chat` });
    setMessages([]);
    setMessageDraft('');
    setMessagesError('');
  };

  const handleRemoveMember = async (memberId, memberName) => {
    requestConfirmation({
      title: 'Remove member?',
      message: `Remove ${memberName || 'this member'} from ${currentTeamInfo.name}?`,
      confirmLabel: 'Remove',
      onConfirm: () => runDialogAction(async () => {
        setRemovingMember(memberId);
        try {
          const res = await fetch(apiUrl(`/teams/${team._id}/members/${memberId}`), {
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
      const res = await fetch(apiUrl(`/teams/${team._id}/members/${memberId}/permissions`), {
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
      const res = await fetch(apiUrl(`/teams/${team._id}`), {
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
          const res = await fetch(apiUrl(`/teams/${team._id}`), {
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
      await fetch(apiUrl(`/tasks/${taskId}`), {
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
        <div className="w-8 h-8 border-3 border-aurora-200 border-t-aurora-600 rounded-full animate-spin"></div>
      </div>
    );
  }

    const togglePin = async (task) => {
      try {
        const newStatus = !task.isPinned;
        setTasks(prev => prev.map(t => t._id === task._id ? { ...t, isPinned: newStatus } : t));
        await fetch(apiUrl(`/tasks/${task._id}`), {
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
            await fetch(apiUrl(`/tasks/${taskId}`), {
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
        const res = await fetch(apiUrl(`/tasks/${taskId}/postpone`), {
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
        const res = await fetch(apiUrl(`/tasks/${taskId}/copy-personal`), {
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
        const res = await fetch(apiUrl(`/tasks/${taskId}/subtasks`), {
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
        const res = await fetch(apiUrl(`/tasks/${taskId}/subtasks/${subtaskId}`), {
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
            const res = await fetch(apiUrl(`/tasks/${taskId}/subtasks/${subtaskId}`), {
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

    const addComment = async (taskId) => {
      const body = (commentDrafts[taskId] || '').trim();
      if (!body || commentSending === taskId) return;

      setCommentSending(taskId);
      try {
        const res = await fetch(apiUrl(`/tasks/${taskId}/comments`), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ body })
        });

        const updatedTask = await res.json();
        if (!res.ok) throw new Error(updatedTask.error || 'Failed to add comment');

        setTasks(prev => prev.map(t => t._id === taskId ? updatedTask : t));
        setCommentDrafts(prev => ({ ...prev, [taskId]: '' }));
      } catch (err) {
        showNotice('error', 'Comment failed', err.message, { autoCloseMs: 3200 });
      } finally {
        setCommentSending(null);
      }
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
    const messageMembers = members
      .filter(member => String(member.user_id) !== String(currentUserId))
      .sort((a, b) => {
        if (a.status !== b.status) return a.status === 'active' ? -1 : 1;
        return (a.name || a.email || '').localeCompare(b.name || b.email || '');
      });
    const filteredMessageMembers = messageMembers.filter(member => {
      const query = messageSearch.trim().toLowerCase();
      if (!query) return true;
      return `${member.name || ''} ${member.email || ''}`.toLowerCase().includes(query);
    });

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
        <button
          onClick={onBack}
          className="w-fit rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="w-full min-w-0 flex-1 sm:w-auto">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-aurora-gradient text-lg font-bold text-white shadow-lg">
              {currentTeamInfo.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              {isEditingName ? (
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    className="w-full max-w-48 rounded-lg border border-slate-300 px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-aurora-300"
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
                <div className="flex min-w-0 items-center gap-2">
                  <h2 className="truncate text-xl font-bold text-slate-800">{currentTeamInfo.name}</h2>
                  {isAdmin && (
                    <button onClick={() => setIsEditingName(true)} className="text-slate-400 hover:bg-slate-100 hover:text-aurora-600 p-1.5 rounded-lg transition-colors">
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
        <div className={`flex w-fit items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold ${isAdmin ? 'bg-amber-50 text-amber-600 border border-amber-200' : 'bg-slate-50 text-slate-500 border border-slate-200'}`}>
          {isAdmin ? <Shield size={13} /> : <User size={13} />}
          {isAdmin ? 'Admin' : 'Member'}
        </div>

        {isAdmin && (
          <button
            onClick={handleDeleteTeam}
            disabled={isDeletingTeam}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 px-3 py-2.5 text-sm font-semibold text-rose-600 transition-all hover:bg-rose-50 active:scale-95 disabled:opacity-50 sm:w-auto"
            title="Delete Team"
          >
            <Trash2 size={16} />
            <span className="hidden lg:inline">Delete Team</span>
          </button>
        )}

        <button
          onClick={() => { setActiveTab('members'); setShowAddMember(true); }}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:border-aurora-200 hover:bg-white hover:text-aurora-600 active:scale-95 sm:w-auto"
        >
          <UserPlus size={16} />
          Add Member
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid w-full grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 sm:flex sm:w-fit">
          <button
            onClick={() => setActiveTab('tasks')}
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition-all sm:px-5 ${
              activeTab === 'tasks'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Tasks ({tasks.length})
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition-all sm:px-5 ${
              activeTab === 'members'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Members ({members.length})
          </button>
          <button
            onClick={() => setActiveTab('messages')}
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition-all sm:px-5 ${
              activeTab === 'messages'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Messages ({messages.length})
          </button>
        </div>

        {activeTab === 'tasks' && (
          <div className="flex items-center gap-2">
            {canAddTask ? (
              <button
                onClick={() => onCreateTask(team, members)}
                className="flex items-center gap-1.5 rounded-lg bg-aurora-gradient px-3 py-1.5 text-sm font-semibold text-white transition-all hover-glow active:scale-95"
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
              className="p-1.5 border border-slate-200 rounded-lg text-slate-500 hover:text-aurora-600 hover:bg-aurora-50 hover:border-aurora-200 transition-all shadow-sm bg-white flex items-center justify-center cursor-pointer"
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
            <div className="mb-2 flex flex-col gap-2 rounded-xl border border-violet-100 bg-violet-50 px-4 py-2.5 text-violet-700 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-2">
                <User size={16} />
                <span className="min-w-0 break-words text-sm font-medium">Viewing tasks assigned to: <b>{members.find(m => m.user_id === memberFilter)?.name || 'Member'}</b></span>
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
              <div className="w-20 h-20 bg-aurora-50 rounded-full flex items-center justify-center mb-4">
                <Check size={36} className="text-aurora-300" />
              </div>
              <p className="text-slate-500 font-medium">No tasks yet</p>
              <p className="text-slate-400 text-sm mt-1">Create a task to get started!</p>
            </div>
          ) : (
            <div className={`grid gap-4 ${layoutMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1'}`}>
              {sortedTasks.map(task => {
                const isExpanded = expandedTask === task._id;
                const subtaskCount = task.subtasks?.length || 0;
                const completedSubtasks = task.subtasks?.filter(st => st.status === 'completed').length || 0;
                const comments = task.comments || [];
                return (
                <div key={task._id} className={`group relative flex min-w-0 flex-col rounded-[22px] border border-white/70 bg-white/78 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1.5 hover:border-aurora-200 hover:shadow-[0_30px_80px_rgba(146,87,255,0.14)] ${postponeMenu === task._id ? 'z-[150] overflow-visible' : 'z-10 overflow-hidden'} ${isExpanded ? (layoutMode === 'grid' ? 'col-span-1 md:col-span-2 xl:col-span-2' : '') : ''}`}>
                  
                  {/* Task Content Header Row */}
                  <div className="p-4 pb-3 sm:p-5 sm:pb-3">
                    <div className="mb-3 flex flex-wrap items-start gap-3">
                    <button
                      onClick={() => toggleTask(task._id, task.status)}
                      className={`order-1 mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                        task.status === 'completed'
                          ? 'bg-aurora-500 border-aurora-500'
                          : 'border-slate-300 hover:border-aurora-500'
                      }`}
                    >
                      {task.status === 'completed' && <Check size={14} className="text-white" />}
                    </button>
                    <div className="order-3 min-w-0 basis-full">
                      <h3 className={`break-words text-base font-semibold leading-snug text-slate-800 ${task.status === 'completed' ? 'line-through text-slate-400' : ''}`}>
                        {task.isPinned && <Pin size={12} className="inline mr-1 text-aurora-500 fill-current" />}
                        {task.title}
                      </h3>
                    </div>

                    {/* Action buttons pinned to the right edge */}
                    <div className="order-2 ml-auto flex flex-wrap items-center justify-end gap-1 sm:mt-0.5 sm:flex-shrink-0 sm:flex-nowrap">
                      
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
                              className={`p-1.5 rounded-lg transition-all ${postponeMenu === task._id ? 'text-aurora-600 bg-aurora-50' : 'text-slate-300 hover:text-aurora-500 hover:bg-aurora-50'}`}
                              title="Postpone task"
                          >
                              <FastForward size={14} />
                          </button>
                          
                          {/* Postpone Popover */}
                          {postponeMenu === task._id && (
                            <div className="absolute left-0 top-full z-[200] mt-2 w-56 max-w-[calc(100vw-2rem)] rounded-2xl border border-white/70 bg-white p-2 shadow-2xl animate-in fade-in slide-in-from-top-2 sm:left-auto sm:right-0" onClick={e => e.stopPropagation()}>
                              <div className="px-3 py-2 border-b border-slate-100 mb-1">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Postpone to</p>
                              </div>
                              <div className="flex flex-col gap-1">
                                <button onClick={() => postponeTask(task._id, getQuickDates().today.toISOString())} className="w-full text-left px-3 py-2 text-sm text-slate-600 hover:text-aurora-600 hover:bg-aurora-50 rounded-xl transition-colors flex items-center justify-between group/btn">
                                  <span>Today</span><span className="text-xs text-slate-400 group-hover/btn:text-aurora-400">{format(getQuickDates().today, 'MMM d')}</span>
                                </button>
                                <button onClick={() => postponeTask(task._id, getQuickDates().tomorrow.toISOString())} className="w-full text-left px-3 py-2 text-sm text-slate-600 hover:text-aurora-600 hover:bg-aurora-50 rounded-xl transition-colors flex items-center justify-between group/btn">
                                  <span>Tomorrow</span><span className="text-xs text-slate-400 group-hover/btn:text-aurora-400">{format(getQuickDates().tomorrow, 'MMM d')}</span>
                                </button>
                                <button onClick={() => postponeTask(task._id, getQuickDates().nextWeek.toISOString())} className="w-full text-left px-3 py-2 text-sm text-slate-600 hover:text-aurora-600 hover:bg-aurora-50 rounded-xl transition-colors flex items-center justify-between group/btn">
                                  <span>Next Week</span><span className="text-xs text-slate-400 group-hover/btn:text-aurora-400">{format(getQuickDates().nextWeek, 'MMM d')}</span>
                                </button>
                                <div className="h-px bg-slate-100 my-1 relative">
                                  <span className="absolute left-1/2 -translate-x-1/2 -top-2 bg-white px-2 text-[10px] text-slate-300 uppercase font-bold tracking-wider">Or</span>
                                </div>
                                <div className="px-2 pt-1 pb-2 flex items-center gap-2">
                                  <input type="date" value={customPostponeDate} onChange={(e) => setCustomPostponeDate(e.target.value)} className="flex-1 text-sm border-0 bg-slate-50 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-aurora-300 text-slate-600 outline-none" />
                                  <button onClick={() => customPostponeDate && postponeTask(task._id, new Date(customPostponeDate).toISOString())} disabled={!customPostponeDate} className={`p-1.5 rounded-lg transition-all ${customPostponeDate ? 'bg-aurora-gradient text-white hover-glow' : 'bg-slate-100 text-slate-400'}`}>
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
                          className={`p-1.5 rounded-lg transition-all ${task.isPinned ? 'text-aurora-600 bg-aurora-50' : 'text-slate-300 hover:text-aurora-500 hover:bg-aurora-50'}`}
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
                          className="p-1.5 rounded-lg transition-all text-slate-300 hover:text-aurora-500 hover:bg-aurora-50"
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
                  <div className="flex flex-wrap items-center gap-2 px-4 pb-4 text-xs sm:ml-9 sm:px-5 sm:pb-5">
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
                      <span className="flex max-w-full items-center gap-1 rounded-lg bg-violet-50 px-2 py-0.5 font-medium tracking-wide text-violet-600" title={task.assigned_to.map(a => a.name || a.email).join(', ')}>
                        <User size={11} />
                        <span className="truncate">{task.assigned_to.length === 1 ? (task.assigned_to[0].name || task.assigned_to[0].email) : `${task.assigned_to.length} Assigned`}</span>
                      </span>
                    )}
                  </div>

                  {/* Expanded Content - Sub-tasks */}
                  {isExpanded && (
                    <div className="mt-auto space-y-3 rounded-b-[22px] border-t border-white/60 bg-slate-50/50 px-4 pb-4 pt-4 sm:px-5">
                      
                      {/* Sub-tasks List */}
                      {subtaskCount > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-3">
                            <h4 className="text-sm font-semibold text-slate-700">Sub-tasks ({completedSubtasks}/{subtaskCount})</h4>
                            <div className="w-12 h-1 bg-slate-200 rounded-full overflow-hidden">
                              <div className="h-full bg-aurora-500 rounded-full transition-all duration-300" style={{width: `${subtaskCount ? (completedSubtasks/subtaskCount)*100 : 0}%`}}></div>
                            </div>
                          </div>
                          
                          {task.subtasks?.map((subtask) => (
                            <div key={subtask._id} className="flex items-center gap-3 rounded-lg border border-slate-100 bg-white p-2 shadow-sm transition hover:border-slate-300">
                              <button
                                onClick={() => toggleSubtask(task._id, subtask._id, subtask.status)}
                                className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition ${
                                  subtask.status === 'completed' ? 'bg-green-500 border-green-500' : 'border-slate-300 hover:border-green-500'
                                }`}
                              >
                                {subtask.status === 'completed' && <Check size={12} className="text-white" />}
                              </button>
                              <span className={`min-w-0 flex-1 break-words text-sm ${subtask.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                                {subtask.title}
                              </span>
                              <button
                                onClick={() => deleteSubtask(task._id, subtask._id)}
                                className="block rounded-lg p-1.5 text-slate-300 opacity-100 transition hover:bg-rose-50 hover:text-rose-500 sm:opacity-0 sm:group-hover:opacity-100"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add New Sub-task */}
                      <div className="mt-2 flex flex-col gap-2 border-t border-slate-100 pt-2 sm:flex-row">
                        <input
                          type="text"
                          value={expandedTask === task._id ? newSubtaskTitle : ''}
                          onChange={(e) => setNewSubtaskTitle(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && addSubtask(task._id)}
                          placeholder="Add a sub-task..."
                          className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-aurora-300"
                        />
                        <button
                          onClick={() => addSubtask(task._id)}
                          className="px-3 py-2 bg-aurora-gradient text-white rounded-lg transition flex items-center justify-center hover-glow"
                          title="Add sub-task"
                          disabled={!newSubtaskTitle.trim() || expandedTask !== task._id}
                        >
                          <Plus size={16} />
                        </button>
                      </div>

                      {/* Comments */}
                      <div className="space-y-3 border-t border-slate-100 pt-3">
                        <div className="flex items-center justify-between gap-3">
                          <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                            <MessageSquare size={14} className="text-aurora-500" />
                            Comments ({comments.length})
                          </h4>
                        </div>

                        {comments.length > 0 && (
                          <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                            {comments.map(comment => {
                              const commenter = comment.user_id || {};
                              const commenterName = commenter.name || commenter.email || 'Team member';
                              const isMine = String(commenter._id || commenter) === String(currentUserId);

                              return (
                                <div key={comment._id} className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
                                  <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex min-w-0 items-center gap-2">
                                      <div className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-xs font-bold ${isMine ? 'bg-aurora-gradient text-white' : 'bg-slate-100 text-slate-500'}`}>
                                        {commenterName.charAt(0).toUpperCase()}
                                      </div>
                                      <span className="truncate text-xs font-bold text-slate-700">{isMine ? 'You' : commenterName}</span>
                                    </div>
                                    {comment.created_at && (
                                      <span className="text-[11px] font-medium text-slate-400">
                                        {format(parseISO(comment.created_at), 'MMM d, h:mm a')}
                                      </span>
                                    )}
                                  </div>
                                  <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-600">{comment.body}</p>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        <div className="flex flex-col gap-2 sm:flex-row">
                          <input
                            type="text"
                            value={commentDrafts[task._id] || ''}
                            onChange={(e) => setCommentDrafts(prev => ({ ...prev, [task._id]: e.target.value }))}
                            onKeyDown={(e) => e.key === 'Enter' && addComment(task._id)}
                            placeholder="Write a comment for this task..."
                            maxLength={2000}
                            className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-aurora-300 focus:ring-2 focus:ring-aurora-100"
                          />
                          <button
                            onClick={() => addComment(task._id)}
                            disabled={!String(commentDrafts[task._id] || '').trim() || commentSending === task._id}
                            className="flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-aurora-600 disabled:bg-slate-200 disabled:text-slate-400"
                            title="Add comment"
                          >
                            {commentSending === task._id ? (
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-white"></div>
                            ) : (
                              <Send size={15} />
                            )}
                            <span className="sm:hidden">Comment</span>
                          </button>
                        </div>
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

      {/* Messages Tab */}
      {activeTab === 'messages' && (
        <div className="grid overflow-hidden rounded-xl border border-white/70 bg-white/85 shadow-[0_24px_70px_rgba(15,23,42,0.12)] backdrop-blur-xl lg:grid-cols-[320px_minmax(0,1fr)]">
          <div className="min-w-0 border-b border-slate-200/70 bg-slate-50/70 lg:border-b-0 lg:border-r">
            <div className="border-b border-slate-200/70 bg-white/80 px-4 py-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
                    <MessageSquare size={18} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-bold text-slate-900">Messages</h3>
                    <p className="text-xs font-medium text-slate-400">{messageMembers.length} teammate{messageMembers.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-600">
                  {messageMembers.filter(member => member.status === 'active').length} active
                </span>
              </div>
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={messageSearch}
                  onChange={(e) => setMessageSearch(e.target.value)}
                  placeholder="Search members"
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
            </div>
            <div className="max-h-52 space-y-1 overflow-y-auto p-2 lg:h-[calc(100vh-410px)] lg:min-h-[240px] lg:max-h-[330px]">
              <button
                type="button"
                onClick={handleSelectTeamChat}
                className={`group mb-2 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-all ${
                  isTeamChatSelected
                    ? 'bg-white text-slate-900 shadow-sm ring-1 ring-aurora-100'
                    : 'text-slate-700 hover:bg-white hover:shadow-sm'
                }`}
              >
                <div className={`relative flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-sm font-bold transition-all ${
                  isTeamChatSelected
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'bg-white text-slate-500 ring-1 ring-slate-100 group-hover:text-aurora-600'
                }`}>
                  <Users size={18} />
                  <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-400"></span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-bold">Team Chat</p>
                    <span className="rounded-full bg-aurora-50 px-1.5 py-0.5 text-[10px] font-bold text-aurora-600">Group</span>
                  </div>
                  <p className="truncate text-xs font-medium text-slate-400">Everyone in {currentTeamInfo.name}</p>
                </div>
                <ChevronRight size={16} className={isTeamChatSelected ? 'text-aurora-500' : 'text-slate-300 group-hover:text-aurora-400'} />
              </button>

              {messageMembers.length === 0 ? (
                <div className="px-3 py-10 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white text-slate-300 shadow-sm">
                    <Users size={24} />
                  </div>
                  <p className="text-sm font-semibold text-slate-500">No teammates yet</p>
                </div>
              ) : filteredMessageMembers.length === 0 ? (
                <div className="px-3 py-10 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white text-slate-300 shadow-sm">
                    <Search size={22} />
                  </div>
                  <p className="text-sm font-semibold text-slate-500">No matches</p>
                </div>
              ) : (
                filteredMessageMembers.map(member => {
                  const isSelected = selectedMessageMember?.user_id === member.user_id;
                  const isPending = member.status !== 'active';
                  const displayName = member.name || member.email || 'Unknown member';
                  return (
                    <button
                      key={member._id}
                      type="button"
                      onClick={() => handleSelectMessageMember(member)}
                      disabled={isPending}
                      className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-all ${
                        isSelected
                          ? 'bg-white text-slate-900 shadow-sm ring-1 ring-aurora-100'
                          : isPending
                            ? 'cursor-not-allowed opacity-60'
                            : 'text-slate-700 hover:bg-white hover:shadow-sm'
                      }`}
                    >
                      <div className={`relative flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-sm font-bold transition-all ${
                        isSelected
                          ? 'bg-aurora-gradient text-white shadow-md'
                          : 'bg-white text-slate-500 ring-1 ring-slate-100 group-hover:text-aurora-600'
                      }`}>
                        {displayName.charAt(0).toUpperCase()}
                        <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${isPending ? 'bg-slate-300' : 'bg-emerald-400'}`}></span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-bold">{displayName}</p>
                          {member.role === 'admin' && (
                            <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-600">Admin</span>
                          )}
                        </div>
                        <p className="truncate text-xs font-medium text-slate-400">{isPending ? 'Pending invite' : member.email}</p>
                      </div>
                      {!isPending && <ChevronRight size={16} className={isSelected ? 'text-aurora-500' : 'text-slate-300 group-hover:text-aurora-400'} />}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex h-[420px] min-w-0 flex-col bg-white sm:h-[430px] lg:h-[calc(100vh-300px)] lg:min-h-[340px] lg:max-h-[430px]">
            <div className="flex min-h-14 items-center justify-between gap-3 border-b border-slate-100 bg-white/95 px-4 py-2">
              {selectedMessageMember ? (
                <div className="flex min-w-0 items-center gap-3">
                  <div className={`relative flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white shadow-lg ${isTeamChatSelected ? 'bg-slate-900' : 'bg-aurora-gradient'}`}>
                    {isTeamChatSelected ? <Users size={17} /> : (selectedMessageMember.name || selectedMessageMember.email || '?').charAt(0).toUpperCase()}
                    <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-400"></span>
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-bold text-slate-900">{isTeamChatSelected ? 'Team Chat' : (selectedMessageMember.name || 'Unknown member')}</h3>
                    <div className="mt-0.5 flex min-w-0 items-center gap-2">
                      <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-400"></span>
                      <p className="truncate text-xs font-medium text-slate-400">
                        {isTeamChatSelected ? `${members.filter(member => member.status === 'active').length} active members` : selectedMessageMember.email}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex min-w-0 items-center gap-3 text-slate-500">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50">
                    <MessageSquare size={19} />
                  </div>
                  <span className="text-sm font-bold">No conversation selected</span>
                </div>
              )}
              <button
                onClick={() => fetchMessages()}
                disabled={messagesLoading || !selectedMessageMember}
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition-all hover:border-aurora-200 hover:bg-aurora-50 hover:text-aurora-600 disabled:opacity-50"
                title="Refresh messages"
              >
                <RefreshCw size={16} className={messagesLoading ? 'animate-spin' : ''} />
              </button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto bg-[linear-gradient(180deg,#f8fafc_0%,#eef5f2_100%)] px-4 py-3 sm:px-5">
              {!selectedMessageMember ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-300 shadow-sm">
                    <MessageSquare size={28} />
                  </div>
                  <p className="text-sm font-bold text-slate-600">No conversation selected</p>
                </div>
              ) : messagesLoading && messages.length === 0 ? (
                <div className="flex h-full items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-aurora-200 border-t-aurora-600"></div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-300 shadow-sm">
                    <MessageSquare size={28} />
                  </div>
                  <p className="text-sm font-bold text-slate-600">No messages yet</p>
                  <p className="mt-1 max-w-xs text-xs font-medium text-slate-400">
                    {isTeamChatSelected ? 'Start a conversation with the whole team.' : (selectedMessageMember.name || selectedMessageMember.email)}
                  </p>
                </div>
              ) : (
                messages.map(message => {
                  const senderId = message.sender?._id || message.sender_id;
                  const isMine = String(senderId) === String(currentUserId);
                  const senderLabel = isMine ? 'You' : (isTeamChatSelected ? (message.sender?.name || message.sender?.email || 'Member') : (selectedMessageMember?.name || selectedMessageMember?.email || 'Member'));

                  return (
                    <div key={message._id} className={`flex items-end gap-2 ${isMine ? 'justify-end' : 'justify-start'}`}>
                      {!isMine && (
                        <div className="mb-5 hidden h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-white text-xs font-bold text-slate-500 shadow-sm sm:flex">
                          {senderLabel.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className={`flex max-w-[88%] flex-col sm:max-w-[68%] ${isMine ? 'items-end' : 'items-start'}`}>
                        <div className={`mb-1 flex items-center gap-2 text-[11px] font-bold ${isMine ? 'text-aurora-500' : 'text-slate-400'}`}>
                          <span>{senderLabel}</span>
                          <span className="font-medium">{message.created_at ? format(parseISO(message.created_at), 'h:mm a') : ''}</span>
                        </div>
                        <div className={`whitespace-pre-wrap break-words px-4 py-3 text-sm leading-relaxed shadow-sm ${
                          isMine
                            ? 'rounded-2xl rounded-br-md bg-aurora-gradient text-white'
                            : 'rounded-2xl rounded-bl-md border border-white bg-white text-slate-700'
                        }`}>
                          {message.body}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="flex-shrink-0 border-t border-slate-100 bg-white p-2 sm:p-2.5">
              {messagesError && (
                <p className="mb-2 rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600">{messagesError}</p>
              )}
              <div className="flex items-end gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1.5 transition focus-within:border-aurora-200 focus-within:bg-white focus-within:ring-4 focus-within:ring-aurora-50">
                <textarea
                  value={messageDraft}
                  onChange={(e) => setMessageDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(e);
                    }
                  }}
                  rows={1}
                  maxLength={2000}
                  placeholder={selectedMessageMember ? (isTeamChatSelected ? 'Message the whole team' : `Message ${selectedMessageMember.name || selectedMessageMember.email}`) : 'Select a member first'}
                  disabled={!selectedMessageMember}
                  className="max-h-20 min-h-9 flex-1 resize-none border-0 bg-transparent px-2 py-1.5 text-sm text-slate-700 outline-none placeholder:text-slate-400 disabled:text-slate-400"
                />
                <button
                  type="submit"
                  disabled={!messageDraft.trim() || messageSending || !selectedMessageMember}
                  className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm transition-all hover:bg-aurora-600 active:scale-95 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
                  title="Send message"
                >
                  {messageSending ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-white"></div>
                  ) : (
                    <Send size={17} />
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Members Tab */}
      {activeTab === 'members' && (
        <div className="space-y-4">
          {/* We moved the main Add Member button to the header, but keep this one as well just in case they close the form or if form is not showing */}
          {!showAddMember && (
            <button
              onClick={() => setShowAddMember(true)}
              className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-slate-200 hover:border-aurora-400 text-slate-500 hover:text-aurora-600 rounded-xl text-sm font-semibold transition-all hover:bg-aurora-50/50"
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
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                  <Mail size={16} className="absolute left-3 top-2.5 text-slate-400" />
                  <input
                    autoFocus
                    type="email"
                    value={memberEmail}
                    onChange={e => setMemberEmail(e.target.value)}
                    placeholder="member@example.com"
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-aurora-300 focus:border-aurora-300 outline-none text-sm"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={addMemberLoading}
                  className="rounded-xl bg-aurora-gradient px-4 py-2 text-sm font-semibold text-white transition-colors hover-glow disabled:opacity-50"
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
              <div key={member._id} className="rounded-xl border border-slate-100 bg-white p-4 transition-shadow hover:shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-aurora-gradient text-sm font-bold text-white">
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
                  
                  <div className="flex flex-wrap items-center gap-2 sm:ml-4">
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
                            className="px-3 py-1.5 text-xs font-medium bg-aurora-50 text-aurora-600 hover:bg-aurora-100 rounded-lg transition-colors whitespace-nowrap"
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
