import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { Check, Trash2, Calendar, Clock, ChevronDown, ChevronUp, Plus, Edit2, X, FastForward, LayoutGrid, List, Pin, Copy } from 'lucide-react';
import { format, isToday, isPast, isTomorrow, isWithinInterval, addDays, parseISO, nextMonday } from 'date-fns';
import CopyToTeamModal from './CopyToTeamModal';
import ActionDialog from './ActionDialog';

export default function TaskList({ token, view, searchQuery, onTaskUpdate, onAddTask, onEditTask }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedTask, setExpandedTask] = useState(null);
  const [editingSubtask, setEditingSubtask] = useState(null);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [editingTask, setEditingTask] = useState(null);
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [timeSort, setTimeSort] = useState('asc');
  const [postponeMenu, setPostponeMenu] = useState(null);
  const [customPostponeDate, setCustomPostponeDate] = useState('');
  const postponeRef = useRef(null);
  const [showPastDue, setShowPastDue] = useState(false);
  const [layoutMode, setLayoutMode] = useState('grid');
  const [taskToCopy, setTaskToCopy] = useState(null);
  const [dialogState, setDialogState] = useState(null);
  const [dialogLoading, setDialogLoading] = useState(false);

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

  const fetchTasks = async () => {
    try {
      const res = await axios.get('/api/tasks', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTasks(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [token]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (postponeRef.current && !postponeRef.current.contains(event.target)) {
        setPostponeMenu(null);
      }
    };
    if (postponeMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [postponeMenu]);

  const toggleTask = async (task) => {
    const isCompletingGoogleEvent = task.isGoogleEvent && task.status !== 'completed';
    const confirmMsg = task.status === 'completed'
      ? 'Mark this task as pending again?'
      : (isCompletingGoogleEvent
        ? 'Complete this Google Calendar event? It will be removed from your mirrored calendar view.'
        : `Mark "${task.title}" as completed?`);

    requestConfirmation({
      title: task.status === 'completed' ? 'Move back to pending?' : 'Confirm update',
      message: confirmMsg,
      confirmLabel: task.status === 'completed' ? 'Mark Pending' : 'Confirm',
      onConfirm: () => runDialogAction(async () => {
        try {
          if (task.isGoogleEvent) {
            await axios.delete(`/api/calendar/events/${task._id}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            setTasks(prev => prev.filter(t => t._id !== task._id));
            showNotice('success', 'Event removed', `"${task.title}" was removed from Google Calendar.`, { autoCloseMs: 2400 });
            return;
          }

          const newStatus = task.status === 'completed' ? 'pending' : 'completed';
          setTasks(prev => prev.map(t => t._id === task._id ? { ...t, status: newStatus } : t));

          await axios.patch(`/api/tasks/${task._id}`, { status: newStatus }, {
            headers: { Authorization: `Bearer ${token}` }
          });

          showNotice(
            'success',
            newStatus === 'completed' ? 'Task completed' : 'Task moved back',
            newStatus === 'completed'
              ? `"${task.title}" is marked as completed.`
              : `"${task.title}" is now pending again.`,
            { autoCloseMs: 2200 }
          );
        } catch (err) {
          console.error(err);
          await fetchTasks();
          showNotice('error', 'Update failed', err.response?.data?.error || 'Unable to update this task right now.', { autoCloseMs: 3000 });
        }
      })
    });
  };

  const deleteTask = async (task) => {
    const confirmMsg = task.isGoogleEvent 
        ? "Are you sure you want to delete this event from Google Calendar?"
        : "Are you sure you want to delete this task?";

    requestConfirmation({
      title: task.isGoogleEvent ? 'Delete event?' : 'Delete task?',
      message: confirmMsg,
      confirmLabel: 'Delete',
      onConfirm: () => runDialogAction(async () => {
        try {
          setTasks(prev => prev.filter(t => t._id !== task._id));

          if (task.isGoogleEvent) {
            await axios.delete(`/api/calendar/events/${task._id}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
          } else {
            await axios.delete(`/api/tasks/${task._id}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
          }

          showNotice('success', task.isGoogleEvent ? 'Event deleted' : 'Task deleted', `"${task.title}" was removed.`, { autoCloseMs: 2200 });
        } catch (err) {
          console.error(err);
          await fetchTasks();
          showNotice('error', 'Delete failed', err.response?.data?.error || 'Unable to delete this item right now.', { autoCloseMs: 3000 });
        }
      })
    });
  };

  const addSubtask = async (taskId) => {
    if (!newSubtaskTitle.trim()) return;
    try {
      const res = await axios.post(`/api/tasks/${taskId}/subtasks`, 
        { title: newSubtaskTitle },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTasks(prev => prev.map(t => t._id === taskId ? res.data : t));
      setNewSubtaskTitle('');
    } catch (err) {
      console.error('Failed to add subtask', err);
    }
  };

  const toggleSubtask = async (taskId, subtaskId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
      const res = await axios.patch(
        `/api/tasks/${taskId}/subtasks/${subtaskId}`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTasks(prev => prev.map(t => t._id === taskId ? res.data : t));
    } catch (err) {
      console.error('Failed to update subtask', err);
    }
  };

  const deleteSubtask = async (taskId, subtaskId) => {
    requestConfirmation({
      title: 'Delete sub-task?',
      message: 'This sub-task will be removed from the task.',
      confirmLabel: 'Delete',
      onConfirm: () => runDialogAction(async () => {
        try {
          const res = await axios.delete(
            `/api/tasks/${taskId}/subtasks/${subtaskId}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          setTasks(prev => prev.map(t => t._id === taskId ? res.data : t));
          showNotice('success', 'Sub-task deleted', 'The sub-task was removed successfully.', { autoCloseMs: 2000 });
        } catch (err) {
          console.error('Failed to delete subtask', err);
          showNotice('error', 'Delete failed', err.response?.data?.error || 'Unable to delete this sub-task.', { autoCloseMs: 3000 });
        }
      })
    });
  };

  const postponeTask = async (taskId, newDate) => {
    try {
      const res = await axios.patch(`/api/tasks/${taskId}/postpone`, { new_date: newDate }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTasks(prev => prev.map(t => t._id === taskId ? res.data : t));
      setPostponeMenu(null);
      setCustomPostponeDate('');
    } catch (err) {
      console.error('Failed to postpone task', err);
      showNotice('error', 'Could not postpone task', err.response?.data?.error || 'Failed to postpone task.', { autoCloseMs: 3200 });
    }
  };

  const togglePin = async (task) => {
    try {
      const newStatus = !task.isPinned;
      setTasks(prev => prev.map(t => t._id === task._id ? { ...t, isPinned: newStatus } : t));
      await axios.patch(`/api/tasks/${task._id}`, { isPinned: newStatus }, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {
      console.error('Failed to toggle pin', err);
      fetchTasks();
    }
  };

  const getQuickDates = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = addDays(today, 1);
    const next = nextMonday(today);
    return { today, tomorrow, nextWeek: next };
  };

  const getRepeatIcon = (repeat) => {
    if (!repeat || repeat === 'never') return null;
    const icons = {
      'daily': { icon: '🔄', text: 'Daily' },
      'weekly': { icon: '📅', text: 'Weekly' },
      'monthly': { icon: '📆', text: 'Monthly' },
      'yearly': { icon: '🎯', text: 'Yearly' }
    };
    return icons[repeat] || null;
  };

  if (loading) return <div className="rounded-[26px] border border-white/70 bg-white/70 p-6 text-sm font-medium text-slate-400 shadow-sm">Loading tasks...</div>;

  // 1. Filter by Search Query (if any)
  let filteredTasks = tasks;
  if (searchQuery) {
      filteredTasks = tasks.filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase()));
  } else {
    // 2. Filter by View
    if (view === 'today') {
        filteredTasks = tasks.filter(task => {
            if (!task.due_at) return false;
            const date = parseISO(task.due_at);
            return isToday(date) || (isPast(date) && task.status !== 'completed');
        });
        filteredTasks = filteredTasks.filter(t => t.status !== 'completed');
    } else if (view === 'upcoming') {
        filteredTasks = tasks.filter(task => {
            if (!task.due_at) return false;
            const date = parseISO(task.due_at);
        // Exclude today's tasks from upcoming: only dates strictly after today
        const endOfToday = new Date();
        endOfToday.setHours(23, 59, 59, 999);
        return date > endOfToday && task.status !== 'completed';
        });
    } else if (view === 'completed') {
        filteredTasks = tasks.filter(t => t.status === 'completed');
    } else {
        // Inbox
        filteredTasks = tasks.filter(t => t.status !== 'completed');
    }
  }

  // 3. User Filters & Sorts
  filteredTasks = filteredTasks.filter(t => {
      if (priorityFilter === 'high') return t.priority >= 4;
      if (priorityFilter === 'low') return t.priority < 4;
      return true;
  });

  filteredTasks.sort((a, b) => {
     if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
     const dateA = a.due_at ? new Date(a.due_at).getTime() : 0;
     const dateB = b.due_at ? new Date(b.due_at).getTime() : 0;
     return timeSort === 'asc' ? dateA - dateB : dateB - dateA;
  });

  // 4. Handle Today Split into Today and Past Due
  let pastDueTasks = [];
  if (view === 'today' && !searchQuery) {
      const allTodayAndPast = filteredTasks;
      filteredTasks = allTodayAndPast.filter(t => {
          if (!t.due_at) return false;
          return isToday(parseISO(t.due_at));
      });
      pastDueTasks = allTodayAndPast.filter(t => {
          if (!t.due_at) return false;
          return isPast(parseISO(t.due_at)) && !isToday(parseISO(t.due_at));
      });
  }

  const renderTaskCard = (task) => {
    const isExpanded = expandedTask === task._id;
    const repeatIcon = getRepeatIcon(task.repeat);
    const subtaskCount = task.subtasks?.length || 0;
    const completedSubtasks = task.subtasks?.filter(st => st.status === 'completed').length || 0;

    return (
        <div key={task._id} className={`group relative overflow-hidden rounded-[28px] border bg-white/78 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-xl ${task.isGoogleEvent ? 'border-sky-100/80' : 'border-white/70'} transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_30px_80px_rgba(146,87,255,0.14)] flex flex-col ${isExpanded ? 'col-span-1 md:col-span-2 lg:col-span-2' : ''} ${postponeMenu === task._id ? 'z-[150]' : 'z-10'}`}>
          
          {/* Header */}
          <div className="p-5 pb-3">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-r from-aurora-100/35 via-transparent to-primary-100/30 opacity-0 transition group-hover:opacity-100" />
            <div className="flex items-start gap-4 flex-1">
              {/* Checkbox */}
              <button 
                  onClick={() => toggleTask(task)}
                  className={`flex-shrink-0 mt-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                      task.status === 'completed' 
                          ? 'bg-indigo-500 border-indigo-500 scale-95' 
                          : (task.isGoogleEvent ? 'border-blue-300 hover:border-blue-500 hover:bg-blue-50' : 'border-slate-300 hover:border-indigo-500')
                  }`}
              >
                  {task.status === 'completed' && <Check size={14} className="text-white" />}
                  {task.isGoogleEvent && task.status !== 'completed' && <Check size={14} className="text-blue-400" />}
              </button>

              {/* Content */}
              <div className={`flex-1 min-w-0 ${task.status === 'completed' ? 'opacity-50' : ''}`}>
                  {((!task.isGoogleEvent && task.priority >= 4) || task.isGoogleEvent || task.postponed_count > 0 || repeatIcon || task.isPinned) && (
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 flex flex-wrap gap-1">
                          {task.isPinned && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-aurora-100 text-aurora-700 uppercase tracking-wide flex items-center gap-1 w-fit">
                              <Pin size={10} className="fill-current" />
                              Pinned
                            </span>
                          )}
                          {!task.isGoogleEvent && task.priority >= 4 && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rosefire-100 text-rosefire-700 uppercase tracking-wide">High</span>
                          )}
                          {task.isGoogleEvent && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-600 uppercase tracking-wide flex items-center gap-1 w-fit">
                            <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="G" className="w-3 h-3" />
                            Google Event
                          </span>}
                          {task.postponed_count > 0 && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 uppercase tracking-wide flex items-center gap-1 w-fit" title={`Originally due: ${task.original_due_at ? format(parseISO(task.original_due_at), 'MMM d, yyyy') : 'N/A'}`}>
                              <FastForward size={10} />
                              Postponed ×{task.postponed_count}
                            </span>
                          )}
                        </div>
                        
                        {/* Repeat Icon */}
                        {repeatIcon && (
                          <span title={repeatIcon.text} className="text-lg">{repeatIcon.icon}</span>
                        )}
                      </div>
                  )}
                  
                  <h3 className={`text-base font-semibold text-slate-900 leading-snug ${task.status === 'completed' ? 'line-through text-slate-400' : ''}`}>
                      {task.title}
                  </h3>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0 mt-0.5">

              {/* Expand/Collapse Button */}
              <button
                onClick={() => setExpandedTask(isExpanded ? null : task._id)}
                className="rounded-2xl p-1.5 text-slate-400 transition hover:bg-white hover:text-slate-700"
              >
                {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>

              {/* Postpone Button */}
              {task.status !== 'completed' && !task.isGoogleEvent && (
                <div className="relative" ref={postponeMenu === task._id ? postponeRef : null}>
                  <button 
                      onClick={(e) => { e.stopPropagation(); setPostponeMenu(postponeMenu === task._id ? null : task._id); setCustomPostponeDate(''); }}
                      className={`p-1.5 rounded-lg transition-all ${postponeMenu === task._id ? 'text-amber-600 bg-amber-50' : 'text-slate-300 hover:text-amber-500 hover:bg-amber-50'}`}
                      title="Postpone task"
                  >
                      <FastForward size={16} />
                  </button>

                  {/* Postpone Popover */}
                  {postponeMenu === task._id && (
                    <>
                      <div className="absolute right-0 top-full mt-2 w-60 rounded-[24px] border border-white/70 bg-white/92 p-2 shadow-[0_24px_70px_rgba(15,23,42,0.18)] backdrop-blur-2xl z-[200] animate-in fade-in slide-in-from-top-2" onClick={e => e.stopPropagation()}>
                        <div className="px-3 py-2 border-b border-slate-100 mb-1">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Postpone to</p>
                        </div>
                        <button
                          onClick={() => postponeTask(task._id, getQuickDates().today.toISOString())}
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-green-50 hover:text-green-700 rounded-xl transition-colors"
                        >
                          <span className="w-7 h-7 flex items-center justify-center bg-green-100 text-green-600 rounded-lg text-xs font-bold">T</span>
                          Today
                        </button>
                        <button
                          onClick={() => postponeTask(task._id, getQuickDates().tomorrow.toISOString())}
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700 rounded-xl transition-colors"
                        >
                          <span className="w-7 h-7 flex items-center justify-center bg-blue-100 text-blue-600 rounded-lg text-xs font-bold">+1</span>
                          Tomorrow
                        </button>
                        <button
                          onClick={() => postponeTask(task._id, getQuickDates().nextWeek.toISOString())}
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-violet-50 hover:text-violet-700 rounded-xl transition-colors"
                        >
                          <span className="w-7 h-7 flex items-center justify-center bg-violet-100 text-violet-600 rounded-lg text-xs font-bold">M</span>
                          Next Monday
                        </button>
                        <div className="border-t border-slate-100 mt-1 pt-1">
                          <div className="px-2">
                            <input
                              type="date"
                              value={customPostponeDate}
                              min={format(new Date(), 'yyyy-MM-dd')}
                              onChange={(e) => setCustomPostponeDate(e.target.value)}
                              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                            {customPostponeDate && (
                              <button
                                onClick={() => postponeTask(task._id, new Date(customPostponeDate).toISOString())}
                              className="w-full mt-2 mb-1 rounded-2xl bg-aurora-gradient py-2.5 text-sm font-semibold text-white transition hover-glow"
                              >
                                Postpone to {format(new Date(customPostponeDate), 'MMM d, yyyy')}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Pin Button */}
              <button 
                  onClick={() => togglePin(task)}
                  className={`rounded-2xl p-1.5 transition-all ${task.isPinned ? 'bg-aurora-50 text-aurora-600' : 'text-slate-300 hover:bg-aurora-50 hover:text-aurora-500'}`}
                  title={task.isPinned ? "Unpin task" : "Pin task"}
              >
                  <Pin size={16} className={task.isPinned ? "fill-current" : ""} />
              </button>

              {/* Copy Button */}
              <button
                  onClick={() => setTaskToCopy(task)}
                  className="rounded-2xl p-1.5 text-slate-300 transition-all hover:bg-aurora-50 hover:text-aurora-500"
                  title="Copy to Team"
              >
                  <Copy size={16} />
              </button>

              {/* Edit Button */}
              <button 
                  onClick={() => onEditTask && onEditTask(task)}
                  className="rounded-2xl p-1.5 text-slate-300 transition-all hover:bg-aurora-50 hover:text-aurora-500"
                  title="Edit task"
              >
                  <Edit2 size={16} />
              </button>

              {/* Delete Button */}
              <button 
                  onClick={() => deleteTask(task)}
                  className="rounded-2xl p-1.5 text-slate-300 transition-all hover:bg-rose-50 hover:text-rose-500"
                  title="Delete task"
              >
                  <Trash2 size={16} />
              </button>
              </div>
            </div>

            {/* Date/Time Info */}
            {task.due_at && (
                <div className="mt-3 flex flex-wrap items-center gap-3 pl-10 text-xs text-slate-500">
                    <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 bg-slate-50 ${isToday(parseISO(task.due_at)) ? 'bg-emerald-50 text-emerald-600 font-medium' : ''}`}>
                        <Calendar size={13} />
                        {isToday(parseISO(task.due_at)) ? 'Today' : format(parseISO(task.due_at), 'MMM d')}
                    </span>
                    {task.has_time !== false && (
                        <span className="flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1">
                            <Clock size={13} />
                            {format(parseISO(task.due_at), 'p')}
                        </span>
                    )}
                </div>
            )}
          </div>

          {/* Expanded Content - Sub-tasks */}
          {isExpanded && (
            <div className="space-y-3 border-t border-white/70 px-5 pb-4 pt-4 bg-white/36">
              
              {/* Sub-tasks List */}
              {subtaskCount > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-semibold text-slate-700">Sub-tasks ({completedSubtasks}/{subtaskCount})</h4>
                    <div className="h-1 w-12 overflow-hidden rounded-full bg-slate-200">
                      <div className="h-full rounded-full bg-gradient-to-r from-aurora-500 to-primary-500" style={{width: `${subtaskCount ? (completedSubtasks/subtaskCount)*100 : 0}%`}}></div>
                    </div>
                  </div>
                  
                  {task.subtasks?.map((subtask) => (
                    <div key={subtask._id} className="flex items-center gap-3 rounded-2xl border border-white/70 bg-white/70 p-2.5 shadow-sm transition hover:bg-white">
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
                        className="rounded-xl p-1 text-slate-300 transition hover:bg-rose-50 hover:text-rose-500"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add New Sub-task */}
              <div className="flex gap-2 border-t border-white/60 pt-2">
                <input
                  type="text"
                  value={expandedTask === task._id ? newSubtaskTitle : ''}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addSubtask(task._id)}
                  placeholder="Add new sub-task..."
                  className="flex-1 rounded-2xl border border-white/70 bg-white/75 px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-aurora-300 focus:ring-4 focus:ring-aurora-100"
                />
                <button
                  onClick={() => addSubtask(task._id)}
                  className="rounded-2xl bg-aurora-gradient p-2.5 text-white transition hover-glow"
                  title="Add sub-task"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
    );
  };

  return (
    <div className="flex flex-col">
      {/* View Filters */}
      <div className="mb-5 flex w-full flex-wrap items-center justify-between gap-3 rounded-[26px] border border-white/70 bg-white/70 p-3 shadow-sm backdrop-blur-xl">
         <div className="flex items-center gap-2">
             <div className="relative">
                 <select 
                    value={priorityFilter} 
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="appearance-none rounded-2xl border border-white/70 bg-white/80 px-3 py-2 pr-8 text-sm text-slate-600 shadow-sm outline-none focus:border-aurora-300"
                 >
                     <option value="all">All Priorities</option>
                     <option value="high">High Priority</option>
                     <option value="low">Normal/Low</option>
                 </select>
                 <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
             </div>
             <div className="relative">
                 <select 
                    value={timeSort} 
                    onChange={(e) => setTimeSort(e.target.value)}
                    className="appearance-none rounded-2xl border border-white/70 bg-white/80 px-3 py-2 pr-8 text-sm text-slate-600 shadow-sm outline-none focus:border-aurora-300"
                 >
                     <option value="asc">Earliest First</option>
                     <option value="desc">Latest First</option>
                 </select>
                 <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
             </div>
         </div>
         <button
           onClick={() => setLayoutMode(prev => prev === 'grid' ? 'list' : 'grid')}
           className="flex cursor-pointer items-center justify-center rounded-2xl border border-white/70 bg-white/80 p-2 text-slate-500 shadow-sm transition-all hover:bg-white hover:text-aurora-600"
           title={layoutMode === 'grid' ? "Switch to Stacked View" : "Switch to Grid View"}
         >
           {layoutMode === 'grid' ? <List size={20} /> : <LayoutGrid size={20} />}
         </button>
      </div>

     {/* Past Due Folded Section */}
     {view === 'today' && !searchQuery && pastDueTasks.length > 0 && (
         <div className="mb-6 overflow-hidden rounded-[28px] border border-rose-100 bg-rose-50/60 shadow-sm backdrop-blur-xl">
            <button 
                onClick={() => setShowPastDue(!showPastDue)}
                className={`flex w-full items-center justify-between bg-rose-50/70 p-4 text-rose-700 transition-colors hover:bg-rose-100 ${showPastDue ? 'rounded-t-[28px]' : 'rounded-[28px]'}`}
            >
                <div className="flex items-center gap-2 font-semibold text-sm">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                    Uncompleted Past Tasks ({pastDueTasks.length})
                </div>
                {showPastDue ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
            {showPastDue && (
                <div className={`p-4 grid gap-4 border-t border-rose-100/50 ${layoutMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
                     {pastDueTasks.map(task => renderTaskCard(task))}
                </div>
            )}
         </div>
     )}

      {/* Main Task Grid */}
      <div className={`relative grid w-full gap-5 ${layoutMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
        {filteredTasks.length === 0 && pastDueTasks.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center rounded-[30px] border border-white/70 bg-white/68 py-20 opacity-80 shadow-sm backdrop-blur-xl">
                <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-aurora-100 to-primary-100">
                   <Check size={40} className="text-aurora-400" />
                </div>
                <p className="text-slate-500 font-medium text-lg">
                    {searchQuery ? "No matching tasks found." : 
                     view === 'completed' ? "No completed tasks yet." : 
                     "All caught up! Time to relax."}
                </p>
            </div>
        )}
        
        {filteredTasks.map(task => renderTaskCard(task))}

        {view === 'today' && !searchQuery && (
            <button 
                onClick={() => onAddTask && onAddTask(new Date())}
                className="group flex min-h-[140px] flex-col items-center justify-center rounded-[28px] border-2 border-dashed border-white/70 bg-white/62 p-6 transition hover:border-aurora-300 hover:bg-white/82"
            >
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400 transition-colors group-hover:bg-aurora-100 group-hover:text-aurora-600">
                    <Plus size={20} />
                </div>
                <span className="text-sm font-medium text-slate-500 transition-colors group-hover:text-aurora-600">Add Task for Today</span>
            </button>
        )}
      </div>
      <CopyToTeamModal
        isOpen={!!taskToCopy}
        onClose={() => setTaskToCopy(null)}
        task={taskToCopy}
        token={token}
        onCopied={() => {
          showNotice('success', 'Task copied', `"${taskToCopy?.title || 'Task'}" was copied to the team workspace.`, { autoCloseMs: 2200 });
          setTaskToCopy(null);
        }}
        onError={(message) => {
          showNotice('error', 'Copy failed', message, { autoCloseMs: 3200 });
        }}
      />
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
