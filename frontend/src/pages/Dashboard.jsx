import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { apiUrl } from '../config/api';
import {
  Calendar,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  CloudRain,
  Filter,
  Inbox,
  LogOut,
  Menu,
  Plus,
  Search,
  Tag,
  User,
  Users,
  X,
} from 'lucide-react';
import TaskList from '../components/TaskList';
import CalendarView from '../components/CalendarView';
import ChatWidget from '../components/ChatWidget';
import AddTaskModal from '../components/AddTaskModal';
import WeatherWidget from '../components/WeatherWidget';
import UserProfile from '../components/UserProfile';
import TeamList from '../components/TeamList';
import TeamWorkspace from '../components/TeamWorkspace';
import InboxView from '../components/InboxView';
import ActionDialog from '../components/ActionDialog';
import NotificationService from '../services/NotificationService';
import TimeNotificationService from '../services/TimeNotificationService';

const primaryNavItems = [
  { id: 'inbox', label: 'Inbox', icon: Inbox },
  { id: 'today', label: 'Today', icon: Calendar },
  { id: 'upcoming', label: 'Upcoming', icon: Calendar },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'completed', label: 'Completed', icon: CheckCircle },
];

const sectionTitle = (activeView, activeTeam) => {
  if (activeView === 'today') return "Today's Plan";
  if (activeView === 'upcoming') return 'Upcoming';
  if (activeView === 'calendar') return 'Calendar View';
  if (activeView === 'completed') return 'Completed';
  if (activeView === 'weather') return 'Weather Forecast';
  if (activeView === 'profile') return 'Profile';
  if (activeView === 'teams') return activeTeam ? activeTeam.name : 'My Teams';
  return 'Inbox';
};

export default function Dashboard({ token, user, logout, updateUser }) {
  const [tasks, setTasks] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [activeView, setActiveView] = useState('today');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandFilters, setExpandFilters] = useState(true);
  const [newTaskDate, setNewTaskDate] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [activeTeam, setActiveTeam] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [teamForTask, setTeamForTask] = useState(null);
  const [teamMembersForTask, setTeamMembersForTask] = useState([]);
  const [preAssignedUser, setPreAssignedUser] = useState(null);
  const [messageOpenRequest, setMessageOpenRequest] = useState(null);
  const [dialogState, setDialogState] = useState(null);
  const profileMenuRef = useRef(null);

  const showNotice = (variant, title, message, options = {}) => {
    setDialogState({
      variant,
      title,
      message,
      confirmLabel: options.confirmLabel || 'OK',
      autoCloseMs: options.autoCloseMs ?? 2200
    });
  };

  useEffect(() => {
    NotificationService.requestPermission();

    axios.get(apiUrl('/calendar/status'), { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => setIsConnected(res.data.connected))
      .catch(console.error);

    const fetchAllTasks = async () => {
      try {
        const res = await axios.get(apiUrl('/tasks'), { headers: { Authorization: `Bearer ${token}` } });
        setTasks(res.data);
        TimeNotificationService.sync(res.data);
      } catch (err) {
        console.error('Failed to fetch tasks for tracking', err);
      }
    };

    const fetchUnreadCount = async () => {
      try {
        const res = await axios.get(apiUrl('/notifications/unread-count'), { headers: { Authorization: `Bearer ${token}` } });
        setUnreadCount(res.data.count || 0);
      } catch (err) {
        console.error('Failed to fetch unread count', err);
      }
    };

    fetchAllTasks();
    fetchUnreadCount();

    const pollInterval = setInterval(fetchUnreadCount, 30000);
    return () => {
      clearInterval(pollInterval);
      TimeNotificationService.clearAll();
    };
  }, [token, refreshKey]);

  useEffect(() => {
    TimeNotificationService.sync(tasks);
  }, [tasks]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isProfileDropdownOpen && profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setIsProfileDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isProfileDropdownOpen]);

  const refreshTasks = () => setRefreshKey((prev) => prev + 1);

  const handleConnect = async () => {
    try {
      const res = await axios.get(apiUrl('/calendar/auth'));
      window.location.href = res.data.url;
    } catch (err) {
      console.error(err);
      showNotice('error', 'Google connection failed', 'Could not start Google authentication right now.', { autoCloseMs: 3200 });
    }
  };

  const handleDisconnect = async () => {
    try {
      await axios.post(apiUrl('/calendar/disconnect'), {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIsConnected(false);
      showNotice('success', 'Calendar disconnected', 'Google Calendar has been disconnected.', { autoCloseMs: 2400 });
    } catch (err) {
      console.error(err);
      showNotice('error', 'Disconnect failed', 'Failed to disconnect Google Calendar.', { autoCloseMs: 3200 });
    }
  };

  const handleDeleteTask = async (id) => {
    try {
      await axios.delete(apiUrl(`/tasks/${id}`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      refreshTasks();
    } catch (err) {
      console.error('Failed to delete task', err);
      showNotice('error', 'Delete failed', 'Failed to delete task.', { autoCloseMs: 3200 });
    }
  };

  const openTaskModal = (date = new Date()) => {
    setNewTaskDate(date);
    setIsModalOpen(true);
    setIsMobileMenuOpen(false);
  };

  const closeTaskModal = () => {
    setIsModalOpen(false);
    setNewTaskDate(null);
    setTeamForTask(null);
    setTeamMembersForTask([]);
    setPreAssignedUser(null);
    setEditingTask(null);
  };

  const renderMainContent = () => {
    if (activeView === 'calendar') {
      return (
        <CalendarView
          token={token}
          onDeleteTask={handleDeleteTask}
          onAddTask={(date) => openTaskModal(date)}
        />
      );
    }

    if (activeView === 'weather') return <WeatherWidget />;
    if (activeView === 'profile') return <UserProfile token={token} onProfileUpdate={updateUser} />;
    if (activeView === 'inbox') {
      return (
        <InboxView
          token={token}
          onOpenNotification={(notification) => {
            if (notification.type !== 'team_message' || !notification.team_id) return;

            const teamRef = notification.team_id;
            const teamId = teamRef._id || teamRef;
            const actorRef = notification.actor_id;
            const actorName = actorRef?.name || actorRef?.email || String(notification.message || '').split(' sent you a message:')[0] || '';
            const isTeamMessage = notification.conversation_type === 'team' || String(notification.message || '').includes('sent a team message');
            setActiveTeam({
              _id: teamId,
              team_id: teamId,
              name: teamRef.name || 'Team'
            });
            setMessageOpenRequest({
              nonce: Date.now(),
              type: isTeamMessage ? 'team' : 'direct',
              userId: actorRef?._id || actorRef || null,
              actorName
            });
            setActiveView('teams');
            setIsMobileMenuOpen(false);
          }}
        />
      );
    }

    if (activeView === 'teams') {
      return activeTeam ? (
        <TeamWorkspace
          key={refreshKey}
          token={token}
          team={activeTeam}
          user={user}
          initialMessageTarget={messageOpenRequest}
          onBack={() => setActiveTeam(null)}
          onCreateTask={(team, members, specificUserId = null) => {
            setTeamForTask(team);
            setTeamMembersForTask(members);
            setPreAssignedUser(specificUserId);
            setIsModalOpen(true);
          }}
          onEditTask={(task, teamData, membersData) => {
            setEditingTask(task);
            if (teamData) setTeamForTask(teamData);
            if (membersData) setTeamMembersForTask(membersData);
            setIsModalOpen(true);
          }}
        />
      ) : (
        <TeamList token={token} onSelectTeam={(team) => setActiveTeam(team)} />
      );
    }

    return (
      <TaskList
        token={token}
        key={refreshKey}
        view={activeView}
        searchQuery={searchQuery}
        onTaskUpdate={refreshTasks}
        onAddTask={(date) => openTaskModal(date || new Date())}
        onEditTask={(task) => {
          setEditingTask(task);
          setIsModalOpen(true);
        }}
      />
    );
  };

  return (
    <div className="relative min-h-screen bg-transparent text-slate-900">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-20 top-10 h-72 w-72 rounded-full bg-aurora-300/20 blur-3xl" />
        <div className="absolute right-0 top-16 h-80 w-80 rounded-full bg-primary-300/18 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-rosefire-300/14 blur-3xl" />
      </div>

      {isMobileMenuOpen && (
        <button
          type="button"
          className="fixed inset-0 z-[3000] bg-slate-950/35 backdrop-blur-sm md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-3 left-3 z-[3100] flex w-[min(292px,calc(100vw-1.5rem))] flex-col rounded-[26px] glass-dark p-3 transition-transform duration-300 sm:inset-y-4 sm:left-4 sm:rounded-[30px] md:translate-x-0 ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-[120%]'
        } md:h-[calc(100vh-2rem)] md:w-[292px]`}
      >
        <div className="flex items-center justify-between px-2 pb-4 pt-2" ref={profileMenuRef}>
          <button
            type="button"
            onClick={() => setIsProfileDropdownOpen((prev) => !prev)}
            className="relative flex flex-1 items-center gap-3 rounded-[22px] border border-white/10 bg-white/5 p-3 text-left transition hover:bg-white/10"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-aurora-500 via-primary-500 to-rosefire-500 text-sm font-bold text-white">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{user?.name || 'User'}</p>
              <p className="truncate text-xs text-white/45">{user?.email || 'Workspace'}</p>
            </div>
            <ChevronDown size={16} className={`text-white/45 transition ${isProfileDropdownOpen ? 'rotate-180' : ''}`} />

            {isProfileDropdownOpen && (
              <div className="absolute left-0 top-[calc(100%+0.75rem)] z-20 w-full rounded-[24px] border border-white/10 bg-ink-850/96 p-2 shadow-[0_25px_70px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
                <button
                  type="button"
                  onClick={() => {
                    setActiveView('profile');
                    setIsProfileDropdownOpen(false);
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-white/80 transition hover:bg-white/8 hover:text-white"
                >
                  <User size={16} />
                  View Profile
                </button>
                <button
                  type="button"
                  onClick={logout}
                  className="mt-1 flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-rose-200 transition hover:bg-rose-500/12 hover:text-white"
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            )}
          </button>

          <button type="button" onClick={() => setIsMobileMenuOpen(false)} className="ml-2 rounded-xl p-2 text-white/50 md:hidden">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-2.5 px-2">
          <button
            type="button"
            onClick={() => {
              setEditingTask(null);
              openTaskModal(new Date());
            }}
            className="flex w-full items-center justify-center gap-2 rounded-[22px] bg-aurora-gradient px-4 py-3 text-sm font-semibold text-white transition hover-glow"
          >
            <Plus size={16} />
            Create New Task
          </button>

          <div className="relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/35" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-[22px] border border-white/10 bg-white/6 py-2.5 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-white/20 focus:bg-white/10"
            />
          </div>
        </div>

        <div className="mt-4 flex-1 overflow-y-auto px-2 dark-scrollbar">
          <div className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/28">Workspace</div>
          <div className="space-y-1.5">
            {primaryNavItems.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setActiveView(id);
                  setSearchQuery('');
                  setIsMobileMenuOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-[18px] px-3 py-2.5 text-sm font-medium transition ${
                  activeView === id
                    ? 'bg-white text-slate-950 shadow-[0_18px_40px_rgba(255,255,255,0.12)]'
                    : 'text-white/60 hover:bg-white/8 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon size={17} />
                  {label}
                </div>
                {id === 'inbox' && unreadCount > 0 ? (
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${activeView === id ? 'bg-slate-100 text-slate-700' : 'bg-white/10 text-white'}`}>
                    {unreadCount}
                  </span>
                ) : null}
              </button>
            ))}
          </div>

          <div className="mt-5">
            <button
              type="button"
              onClick={() => setExpandFilters((prev) => !prev)}
              className="flex w-full items-center justify-between px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/28 transition hover:text-white/50"
            >
              Focus Filters
              {expandFilters ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>

            {expandFilters && (
              <div className="mt-3 space-y-2">
                {[
                  { label: 'High Priority', icon: Filter, tone: 'text-primary-200' },
                  { label: 'Personal', icon: Tag, tone: 'text-aurora-200' },
                  { label: 'Work', icon: Tag, tone: 'text-rose-200' },
                  { label: 'Weather', icon: CloudRain, tone: 'text-sky-200', onClick: () => { setActiveView('weather'); setSearchQuery(''); setIsMobileMenuOpen(false); } },
                ].map(({ label, icon: Icon, tone, onClick }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={onClick}
                    className="flex w-full items-center gap-3 rounded-[18px] border border-white/8 bg-white/5 px-3 py-2.5 text-sm text-white/55 transition hover:bg-white/8 hover:text-white"
                  >
                    <Icon size={15} className={tone} />
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 rounded-[24px] border border-white/10 bg-white/6 p-3 text-sm backdrop-blur-xl">
          {!isConnected ? (
            <button
              type="button"
              onClick={handleConnect}
              className="flex w-full items-center justify-between rounded-[18px] px-3 py-3 text-white/75 transition hover:bg-white/8 hover:text-white"
            >
              <div className="flex items-center gap-3">
                <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="h-4 w-4" />
                <span>Connect Calendar</span>
              </div>
              <span className="text-xs uppercase tracking-[0.2em] text-white/30">Sync</span>
            </button>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-[18px] bg-emerald-400/10 px-3 py-3 text-emerald-200">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
                  Connected
                </div>
                <span className="text-xs uppercase tracking-[0.2em] text-emerald-100/70">Live</span>
              </div>
              <button
                type="button"
                onClick={handleDisconnect}
                className="w-full rounded-[18px] border border-rose-300/20 px-3 py-2.5 text-xs font-semibold uppercase tracking-[0.22em] text-rose-200 transition hover:bg-rose-400/12 hover:text-white"
              >
                Disconnect
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              setActiveView('teams');
              setSearchQuery('');
              setIsMobileMenuOpen(false);
            }}
            className={`mt-3 flex w-full items-center justify-between rounded-[18px] px-3 py-3 text-sm font-medium transition ${
              activeView === 'teams'
                ? 'bg-white text-slate-950 shadow-[0_18px_40px_rgba(255,255,255,0.12)]'
                : 'text-white/70 hover:bg-white/8 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <Users size={17} />
              Teams
            </div>
            <span className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${activeView === 'teams' ? 'text-slate-500' : 'text-white/28'}`}>
              Space
            </span>
          </button>
        </div>
      </aside>

      <main className="relative z-10 min-w-0 px-2 py-3 sm:px-4 sm:py-4 md:pl-[324px]">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-4">
          <div className="surface-card flex items-center justify-between gap-3 px-3 py-3 sm:px-5 sm:py-4 md:hidden">
            <button type="button" onClick={() => setIsMobileMenuOpen(true)} className="rounded-xl p-2 text-slate-700">
              <Menu size={22} />
            </button>
            <div className="min-w-0 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Workspace</p>
              <h1 className="truncate text-base font-semibold text-slate-900">{sectionTitle(activeView, activeTeam)}</h1>
            </div>
            <div className="w-10" />
          </div>

          <div className="surface-card overflow-visible">
            <div className="border-b border-white/65 px-4 py-5 sm:px-6 sm:py-6 md:px-8">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="premium-chip mb-4">
                    {activeView === 'today' ? 'Today' : activeView === 'teams' ? 'Teams' : sectionTitle(activeView, activeTeam)}
                  </div>
                  <h1 className="break-words text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl md:text-4xl">
                    {searchQuery ? `Results for "${searchQuery}"` : sectionTitle(activeView, activeTeam)}
                  </h1>
                </div>

                <div className="grid w-full grid-cols-1 gap-3 sm:flex sm:flex-wrap sm:items-center lg:w-auto lg:justify-end">
                  <div className="rounded-[22px] border border-white/70 bg-white/70 px-4 py-3 text-center text-sm font-medium text-slate-500 shadow-sm sm:text-left">
                    {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                  </div>
                  {activeView !== 'teams' && (
                    <>
                      <button
                        type="button"
                        onClick={() => { setActiveView('weather'); setSearchQuery(''); setIsMobileMenuOpen(false); }}
                        className="rounded-[22px] border border-white/70 bg-white/70 px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-white"
                      >
                        Weather
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingTask(null);
                          openTaskModal(new Date());
                        }}
                        className="inline-flex items-center justify-center gap-2 rounded-[22px] bg-aurora-gradient px-5 py-3 text-sm font-semibold text-white transition hover-glow"
                      >
                        <Plus size={16} />
                        Add Task
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="px-3 py-4 sm:px-4 sm:py-5 md:px-6 md:py-6">
              {renderMainContent()}
            </div>
          </div>
        </div>
      </main>

      <ChatWidget token={token} onTaskUpdate={refreshTasks} />

      <AddTaskModal
        isOpen={isModalOpen}
        onClose={closeTaskModal}
        onTaskAdded={() => {
          refreshTasks();
          setIsModalOpen(false);
          setEditingTask(null);
          axios.get(apiUrl('/notifications/unread-count'), { headers: { Authorization: `Bearer ${token}` } })
            .then((res) => setUnreadCount(res.data.count || 0))
            .catch(() => {});
        }}
        token={token}
        initialDate={newTaskDate}
        teamId={teamForTask?._id}
        teamMembers={teamMembersForTask}
        editingTask={editingTask}
        preAssigned={preAssignedUser}
      />

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
