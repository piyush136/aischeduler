import { useState, useEffect } from 'react';
import { Bell, Check, Clock, Users, ArrowRight, MessageSquare } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import ActionDialog from './ActionDialog';
import { apiUrl } from '../config/api';

export default function InboxView({ token, onOpenNotification }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogState, setDialogState] = useState(null);

  const showNotice = (variant, title, message, options = {}) => {
    setDialogState({
      variant,
      title,
      message,
      confirmLabel: options.confirmLabel || 'OK',
      autoCloseMs: options.autoCloseMs ?? 2200
    });
  };

  const fetchNotifications = async () => {
    try {
      const res = await fetch(apiUrl('/notifications'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [token]);

  const markAsRead = async (id) => {
    try {
      await fetch(apiUrl(`/notifications/${id}/read`), {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev =>
        prev.map(n => n._id === id ? { ...n, is_read: true } : n)
      );
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleInvite = async (e, notif, action) => {
    e.stopPropagation();
    try {
      const endpoint = action === 'accept' ? 'accept-invite' : 'reject-invite';
      const res = await fetch(apiUrl(`/teams/${notif.team_id._id || notif.team_id}/${endpoint}`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        markAsRead(notif._id);
        showNotice(
          'success',
          action === 'accept' ? 'Invite accepted' : 'Invite declined',
          action === 'accept' ? 'You joined the team successfully.' : 'The team invite was declined.',
          { autoCloseMs: 2200 }
        );
      } else {
        showNotice('error', 'Invite failed', 'Failed to process invite.', { autoCloseMs: 3200 });
      }
    } catch (err) {
      console.error('Failed to process invite', err);
      showNotice('error', 'Invite failed', 'Failed to process invite.', { autoCloseMs: 3200 });
    }
  };

  const handleNotificationClick = async (notif) => {
    if (!notif.is_read) {
      await markAsRead(notif._id);
    }
    if (notif.type === 'team_message' && onOpenNotification) {
      onOpenNotification(notif);
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'task_assigned':
        return <div className="w-10 h-10 bg-aurora-100 rounded-full flex items-center justify-center flex-shrink-0"><ArrowRight size={18} className="text-aurora-600" /></div>;
      case 'comment':
        return <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0"><Bell size={18} className="text-blue-600" /></div>;
      case 'mention':
        return <div className="w-10 h-10 bg-violet-100 rounded-full flex items-center justify-center flex-shrink-0"><Users size={18} className="text-violet-600" /></div>;
      case 'team_invite':
        return <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center flex-shrink-0"><Users size={18} className="text-teal-600" /></div>;
      case 'team_message':
        return <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0"><MessageSquare size={18} className="text-emerald-600" /></div>;
      default:
        return <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0"><Bell size={18} className="text-slate-500" /></div>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-3 border-aurora-200 border-t-aurora-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Info */}
      <div className="flex items-center justify-between">
        <p className="text-slate-500 text-sm">
          {notifications.filter(n => !n.is_read).length} unread notification{notifications.filter(n => !n.is_read).length !== 1 ? 's' : ''}
        </p>
      </div>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 opacity-60">
          <div className="w-24 h-24 bg-aurora-50 rounded-full flex items-center justify-center mb-4">
            <Bell size={40} className="text-aurora-300" />
          </div>
          <p className="text-slate-500 font-medium text-lg mb-1">All caught up!</p>
          <p className="text-slate-400 text-sm">No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(notif => (
            <div
              key={notif._id}
              onClick={() => handleNotificationClick(notif)}
              className={`flex w-full flex-col gap-3 rounded-xl border p-4 text-left transition-all duration-200 sm:flex-row sm:items-center sm:gap-4 ${
                notif.is_read
                  ? 'bg-white border-slate-100 opacity-60'
                  : 'cursor-pointer bg-white border-aurora-100 shadow-sm hover:shadow-md hover:border-aurora-200 hover:-translate-y-0.5'
              }`}
            >
              {/* Unread dot */}
              {!notif.is_read && (
                <span className="w-2.5 h-2.5 bg-aurora-500 rounded-full flex-shrink-0 animate-pulse"></span>
              )}

              {/* Type Icon */}
              {getTypeIcon(notif.type)}

              {/* Content */}
              <div className="min-w-0 flex-1">
                <p className={`break-words text-sm ${notif.is_read ? 'text-slate-500' : 'text-slate-800 font-medium'}`}>
                  {notif.message}
                </p>
                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                  <span className="flex items-center gap-1 text-xs text-slate-400">
                    <Clock size={11} />
                    {notif.created_at
                      ? formatDistanceToNow(parseISO(notif.created_at), { addSuffix: true })
                      : 'Just now'}
                  </span>
                  {notif.team_id && (
                    <span className="flex items-center gap-1 text-xs text-violet-500 bg-violet-50 px-2 py-0.5 rounded-lg font-medium">
                      <Users size={10} />
                      {notif.team_id.name || 'Team'}
                    </span>
                  )}
                  {notif.task_id && (
                    <span className="text-xs text-aurora-500 bg-aurora-50 px-2 py-0.5 rounded-lg font-medium truncate max-w-[150px]">
                      {notif.task_id.title || 'Task'}
                    </span>
                  )}
                  
                  {notif.type === 'team_invite' && !notif.is_read && (
                    <div className="mt-2 flex w-full gap-2 md:ml-auto md:mt-0 md:w-auto">
                      <button 
                        onClick={(e) => handleInvite(e, notif, 'accept')}
                        className="flex-1 rounded-lg bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-600 transition hover:bg-teal-100 md:flex-none"
                      >
                        Accept
                      </button>
                      <button 
                        onClick={(e) => handleInvite(e, notif, 'reject')}
                        className="flex-1 rounded-lg bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-100 md:flex-none"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Read check */}
              {notif.is_read && (
                <Check size={16} className="text-emerald-400 flex-shrink-0" />
              )}
            </div>
          ))}
        </div>
      )}
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
