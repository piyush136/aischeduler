import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Calendar, ChevronDown, ChevronUp, Clock, Plus, Sparkles, X } from 'lucide-react';
import { format } from 'date-fns';
import ActionDialog from './ActionDialog';
import { apiUrl } from '../config/api';

export default function AddTaskModal({ isOpen, onClose, onTaskAdded, token, initialDate, teamId, teamMembers, editingTask, preAssigned }) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(initialDate ? format(new Date(initialDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
  const [time, setTime] = useState('');
  const [priority, setPriority] = useState(3);
  const [repeat, setRepeat] = useState('never');
  const [subtasks, setSubtasks] = useState([]);
  const [newSubtask, setNewSubtask] = useState('');
  const [loading, setLoading] = useState(false);
  const [assignedTo, setAssignedTo] = useState([]);
  const [showAssignDropdown, setShowAssignDropdown] = useState(false);
  const [dialogState, setDialogState] = useState(null);
  const assignRef = useRef(null);

  const showNotice = (variant, titleText, message, options = {}) => {
    setDialogState({
      variant,
      title: titleText,
      message,
      confirmLabel: options.confirmLabel || 'OK',
      autoCloseMs: options.autoCloseMs ?? 2200
    });
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (assignRef.current && !assignRef.current.contains(event.target)) {
        setShowAssignDropdown(false);
      }
    };
    if (showAssignDropdown) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAssignDropdown]);

  useEffect(() => {
    if (!isOpen) return;

    if (editingTask) {
      setTitle(editingTask.title || '');
      if (editingTask.due_at) {
        setDate(format(new Date(editingTask.due_at), 'yyyy-MM-dd'));
        setTime(editingTask.has_time === false ? '' : format(new Date(editingTask.due_at), 'HH:mm'));
      }
      setPriority(editingTask.priority || 3);
      setRepeat(editingTask.repeat || 'never');
      setSubtasks(editingTask.subtasks || []);

      let initialAssigned = [];
      if (editingTask.assigned_to) {
        if (Array.isArray(editingTask.assigned_to)) {
          initialAssigned = editingTask.assigned_to.map((member) => typeof member === 'object' ? member._id : member);
        } else {
          initialAssigned = [typeof editingTask.assigned_to === 'object' ? editingTask.assigned_to._id : editingTask.assigned_to];
        }
      }
      setAssignedTo(initialAssigned);
    } else {
      setTitle('');
      setDate(initialDate ? format(new Date(initialDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
      setTime('');
      setPriority(3);
      setRepeat('never');
      setSubtasks([]);
      setAssignedTo(preAssigned ? [preAssigned] : []);
    }

    setNewSubtask('');
    setShowAssignDropdown(false);
  }, [editingTask, initialDate, isOpen, preAssigned]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    try {
      const dateTime = new Date(`${date}T${time || '00:00'}:00`);
      const taskPayload = {
        title,
        due_at: dateTime.toISOString(),
        has_time: !!time,
        priority,
        repeat,
        subtasks: subtasks.map((st) => typeof st === 'string' ? { title: st, status: 'pending' } : st)
      };

      if (teamId) {
        taskPayload.team_id = teamId;
        taskPayload.assigned_to = assignedTo;
      }

      if (editingTask) {
        await axios.patch(apiUrl(`/tasks/${editingTask._id}`), taskPayload, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post(apiUrl('/tasks'), taskPayload, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      setTitle('');
      setPriority(3);
      setRepeat('never');
      setSubtasks([]);
      setNewSubtask('');
      setAssignedTo([]);
      setShowAssignDropdown(false);
      onTaskAdded();
      onClose();
    } catch (err) {
      console.error('Failed to add task', err);
      showNotice('error', 'Task save failed', err.response?.data?.error || 'Error creating task. Please try again.', { autoCloseMs: 3200 });
    } finally {
      setLoading(false);
    }
  };

  const addSubtask = () => {
    if (newSubtask.trim()) {
      setSubtasks([...subtasks, newSubtask]);
      setNewSubtask('');
    }
  };

  const removeSubtask = (index) => {
    setSubtasks(subtasks.filter((_, i) => i !== index));
  };

  const toggleAssign = (userId) => {
    setAssignedTo((prev) => prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]);
  };

  return (
    <div className="fixed inset-0 z-[4000] flex items-stretch justify-center bg-slate-950/45 p-2 backdrop-blur-md sm:items-center sm:p-4">
      <div className="relative flex h-full max-h-[100dvh] w-full max-w-3xl flex-col overflow-hidden rounded-[24px] border border-white/60 bg-white/72 shadow-[0_35px_120px_rgba(15,23,42,0.28)] backdrop-blur-2xl sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:rounded-[34px]">
        <div className="absolute -right-12 top-0 h-36 w-36 rounded-full bg-primary-300/28 blur-3xl" />
        <div className="absolute left-0 top-0 h-28 w-28 rounded-full bg-aurora-300/28 blur-3xl" />

        <div className="relative flex shrink-0 items-center justify-between gap-3 border-b border-white/60 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <div className="premium-chip mb-1">
              <Sparkles size={14} className="text-primary-500" />
              {editingTask ? 'Edit task' : 'Create task'}
            </div>
            <h2 className="truncate text-lg font-semibold text-slate-950 sm:text-xl">{editingTask ? 'Edit Task' : 'New Task'}</h2>
          </div>
          <button type="button" onClick={onClose} className="shrink-0 rounded-2xl border border-white/60 bg-white/70 p-2.5 text-slate-500 transition hover:bg-white hover:text-slate-800">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="relative flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3 sm:px-5 sm:py-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Task Title</label>
              <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Prepare physics revision plan"
                className="premium-input"
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Due Date</label>
                <div className="relative">
                  <Calendar className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="premium-input"
                    style={{ paddingLeft: '3.25rem' }}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Time</label>
                <div className="relative">
                  <Clock className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="premium-input"
                    style={{ paddingLeft: '3.25rem' }}
                    placeholder="All day"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Priority</label>
              <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
                {[1, 2, 3, 4, 5].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`min-h-11 rounded-2xl border px-2 py-2 text-sm font-semibold transition sm:px-3 ${
                      priority === p
                        ? 'border-transparent bg-aurora-gradient text-white shadow-[0_18px_45px_rgba(95,120,246,0.22)]'
                        : 'border-white/70 bg-white/75 text-slate-600 hover:bg-white'
                    }`}
                  >
                    {p === 1 ? 'Low' : p === 5 ? 'High' : p}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-[24px] border border-white/65 bg-white/62 p-3 shadow-sm sm:rounded-[28px]">
              <div className={`${teamId && teamMembers && teamMembers.length > 0 ? 'grid gap-3 md:grid-cols-2' : ''}`}>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Repeat</label>
                  <select value={repeat} onChange={(e) => setRepeat(e.target.value)} className="premium-input">
                    <option value="never">Never</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>

                {teamId && teamMembers && teamMembers.length > 0 && (
                  <div ref={assignRef} className="relative">
                    <label className="mb-1 block text-sm font-medium text-slate-700">Assign to</label>
                    <button
                      type="button"
                      onClick={() => setShowAssignDropdown((prev) => !prev)}
                      className="premium-input flex items-center justify-between text-left"
                    >
                      <span className="truncate">
                        {assignedTo.length === 0 || assignedTo.length === teamMembers.length ? 'All Team Members' : `${assignedTo.length} assigned`}
                      </span>
                      {showAssignDropdown ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>

                    {showAssignDropdown && (
                      <div className="absolute left-0 right-0 z-[4100] mt-2 max-h-[45dvh] overflow-hidden rounded-[24px] border border-white/70 bg-white/95 p-2 shadow-[0_18px_60px_rgba(15,23,42,0.18)] backdrop-blur-xl">
                        <div className="max-h-48 space-y-1 overflow-y-auto">
                          {teamMembers.map((member) => (
                            <label key={member.user_id} className="flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2.5 transition hover:bg-slate-50">
                              <input
                                type="checkbox"
                                checked={assignedTo.includes(member.user_id)}
                                onChange={() => toggleAssign(member.user_id)}
                                className="h-4 w-4 rounded border-slate-300 text-aurora-600 focus:ring-aurora-300"
                              />
                              <span className="text-sm font-medium text-slate-700">{member.name || member.email}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-[24px] border border-white/65 bg-white/62 p-3 shadow-sm sm:rounded-[28px]">
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700">Sub-tasks</label>
                <span className="text-xs uppercase tracking-[0.2em] text-slate-400">{subtasks.length} items</span>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  value={newSubtask}
                  onChange={(e) => setNewSubtask(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addSubtask();
                    }
                  }}
                  placeholder="Add a smaller step..."
                  className="premium-input"
                />
                <button type="button" onClick={addSubtask} className="flex min-h-11 items-center justify-center rounded-2xl bg-aurora-gradient px-4 py-2 text-white transition hover-glow sm:w-14">
                  <Plus size={16} />
                </button>
              </div>

              {subtasks.length > 0 && (
                <div className="mt-2 grid gap-2">
                  {subtasks.map((subtask, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-3 rounded-[20px] border border-white/70 bg-white/75 px-3 py-2 sm:px-4">
                      <span className="truncate pr-3 text-sm font-medium text-slate-700">{typeof subtask === 'string' ? subtask : subtask.title}</span>
                      <button type="button" onClick={() => removeSubtask(idx)} className="shrink-0 text-xs font-semibold uppercase tracking-[0.18em] text-rosefire-600 transition hover:text-rosefire-700">
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="shrink-0 border-t border-white/60 bg-white/50 px-4 py-3 sm:px-5">
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
            <button type="button" onClick={onClose} className="min-h-11 rounded-[20px] border border-white/70 bg-white/70 px-5 py-2 text-sm font-semibold text-slate-600 transition hover:bg-white sm:min-w-28">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="min-h-11 rounded-[20px] bg-aurora-gradient px-6 py-2 text-sm font-semibold text-white transition hover-glow disabled:opacity-60 sm:min-w-36">
              {loading ? 'Saving...' : editingTask ? 'Update Task' : 'Create Task'}
            </button>
            </div>
          </div>
        </form>
      </div>

      <ActionDialog
        isOpen={!!dialogState}
        variant={dialogState?.variant}
        title={dialogState?.title}
        message={dialogState?.message}
        confirmLabel={dialogState?.confirmLabel}
        onClose={() => setDialogState(null)}
        autoCloseMs={dialogState?.autoCloseMs}
      />
    </div>
  );
}
