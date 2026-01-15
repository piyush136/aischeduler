import TaskList from '../components/TaskList';
import CalendarView from '../components/CalendarView';
import ChatWidget from '../components/ChatWidget';
import AddTaskModal from '../components/AddTaskModal';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Calendar, Plus, Search, Inbox, Hash, Users, HelpCircle, 
  ChevronDown, ChevronRight, CheckCircle, Tag, Filter, Menu, X 
} from 'lucide-react';

export default function Dashboard({ token, logout }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [activeView, setActiveView] = useState('today');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandFilters, setExpandFilters] = useState(true);
  const [newTaskDate, setNewTaskDate] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    axios.get('/api/calendar/status', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setIsConnected(res.data.connected))
      .catch(console.error);
  }, [token]);

  const handleConnect = async () => {
    try {
        const res = await axios.get('/api/calendar/auth');
        window.location.href = res.data.url;
    } catch (err) {
        console.error(err);
        alert('Could not start Google Auth');
    }
  };

  const handleDisconnect = async () => {
      try {
          await axios.post('/api/calendar/disconnect', {}, {
              headers: { Authorization: `Bearer ${token}` }
          });
          setIsConnected(false);
          alert('Disconnected from Google Calendar');
      } catch (err) {
          console.error(err);
          alert('Failed to disconnect');
      }
  };

  const refreshTasks = () => setRefreshKey(prev => prev + 1);

  const handleDeleteTask = async (id) => {
    try {
        await axios.delete(`/api/tasks/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        refreshTasks();
    } catch (err) {
        console.error('Failed to delete task', err);
        alert('Failed to delete task');
    }
  };

  const NavItem = ({ id, label, icon: Icon, color, count }) => (
    <button
      onClick={() => { setActiveView(id); setSearchQuery(''); setIsMobileMenuOpen(false); }}
      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${
        activeView === id 
          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' 
          : 'text-slate-400 hover:bg-white/5 hover:text-white'
      }`}
    >
      <div className="flex items-center gap-3">
        <Icon size={18} className={activeView === id ? 'text-white' : (color || 'text-slate-500')} />
        {label}
      </div>
      {count && <span className="text-xs text-slate-500">{count}</span>}
    </button>
  );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans relative">
      
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 md:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
          fixed inset-y-0 left-0 w-[280px] bg-slate-900 flex flex-col border-r border-slate-800 shadow-xl z-30 transform transition-transform duration-300 ease-in-out
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
          md:relative md:translate-x-0
      `}>
        {/* User Profile / Top Header */}
        <div className="p-6 pb-4 flex items-center justify-between">
           <div className="flex items-center gap-3 cursor-pointer p-2 -mx-2 rounded-xl hover:bg-white/5 transition border border-transparent hover:border-white/10 flex-1">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-inner">
                 KH
              </div>
              <div>
                  <h3 className="font-semibold text-white text-sm">Khushi</h3>
                  <p className="text-xs text-slate-400">Pro Plan</p>
              </div>
              <ChevronDown size={14} className="text-slate-500 ml-auto" />
           </div>
           {/* Close Button Mobile */}
           <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden text-slate-400 p-2">
             <X size={20} />
           </button>
        </div>

        {/* Add Task & Search */}
        <div className="px-6 mb-6 space-y-3">
            <button 
                onClick={() => { setIsModalOpen(true); setIsMobileMenuOpen(false); }}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold text-sm hover:from-indigo-500 hover:to-violet-500 py-2.5 rounded-xl shadow-lg shadow-indigo-900/20 transition-all transform active:scale-95"
            >
                <Plus size={16} />
                Create New Task
            </button>
            <div className="relative group">
                <Search size={16} className="absolute left-3 top-2.5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                <input 
                  type="text" 
                  placeholder="Search tasks..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700/50 focus:border-indigo-500/50 focus:bg-slate-800 rounded-xl text-sm text-slate-200 placeholder-slate-500 outline-none transition-all"
                />
            </div>
        </div>

        {/* Main Navigation */}
        <div className="flex-1 overflow-y-auto px-4 space-y-1">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-3 mt-4">Details</div>
            <NavItem id="inbox" label="Inbox" icon={Inbox} color="text-blue-400" />
            <NavItem id="today" label="Today" icon={Calendar} color="text-green-400" />
            <NavItem id="upcoming" label="Upcoming" icon={Calendar} color="text-violet-400" />
            <NavItem id="calendar" label="Calendar" icon={Calendar} color="text-indigo-400" />
            <NavItem id="completed" label="Completed" icon={CheckCircle} color="text-slate-400" />

            {/* Filters & Labels Accordion */}
            <div className="mt-8">
                <button 
                    onClick={() => setExpandFilters(!expandFilters)}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-slate-500 hover:text-slate-300 uppercase tracking-wider transition-colors"
                >
                    Filters & Labels
                    {expandFilters ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
                
                {expandFilters && (
                    <div className="mt-2 space-y-1">
                        <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors">
                            <Filter size={16} className="text-orange-400" />
                            High Priority
                        </button>
                         <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors">
                            <Tag size={16} className="text-blue-400" />
                            Personal
                        </button>
                         <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors">
                            <Tag size={16} className="text-pink-400" />
                            Work
                        </button>
                    </div>
                )}
            </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 space-y-1">
            {!isConnected ? (
                <button 
                    onClick={handleConnect}
                    className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-white bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-xl transition-all mb-2 group"
                >
                    <div className="flex items-center gap-3">
                        <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="G" className="w-4 h-4 grayscale group-hover:grayscale-0 transition-all opacity-70 group-hover:opacity-100" />
                        <span className="text-slate-400 group-hover:text-white transition-colors">Connect Calendar</span>
                    </div>
                </button>
            ) : (
                <div className="mb-2 space-y-2">
                    <div className="w-full flex items-center justify-between px-3 py-2 text-sm bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                            <span className="text-emerald-400 font-medium">Connected</span>
                        </div>
                    </div>
                    <button 
                        onClick={handleDisconnect}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs text-rose-400 hover:text-white hover:bg-rose-500/20 border border-rose-500/20 rounded-xl transition-all"
                    >
                        Disconnect
                    </button>
                </div>
            )}
            <button className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors">
                <Users size={18} />
                Teams
            </button>
            <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-rose-500 hover:bg-rose-500/10 rounded-xl transition-colors">
                <Users size={18} />
                Logout
            </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-slate-50 w-full">
        {/* Mobile Header Bar */}
        <div className="md:hidden flex items-center justify-between p-4 bg-white border-b border-slate-100 sticky top-0 z-10">
             <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 -ml-2 text-slate-600">
                <Menu size={24} />
             </button>
             <h1 className="font-bold text-slate-800 text-lg">AntiGravity</h1>
             <div className="w-8"></div> {/* Spacer for center alignment */}
        </div>

        <div className="max-w-5xl mx-auto px-4 py-6 md:px-12 md:py-12">
            <header className="mb-6 md:mb-8 p-1">
                <h2 className="text-2xl md:text-3xl font-extrabold text-slate-800 capitalize flex flex-col md:flex-row md:items-center gap-2 md:gap-3 tracking-tight">
                    {searchQuery ? (
                        <>
                           <div className="flex items-center gap-2">
                             <Search size={28} className="text-indigo-600 hidden md:block" />
                             <span>Results for "{searchQuery}"</span>
                           </div>
                        </>
                    ) : (
                        <>
                             <div className="flex items-center gap-2">
                                {activeView === 'inbox' && <Inbox size={32} className="text-blue-600 hidden md:block" />}
                                {activeView === 'today' && <Calendar size={32} className="text-green-600 hidden md:block" />}
                                {activeView === 'upcoming' && <Calendar size={32} className="text-violet-600 hidden md:block" />}
                                {activeView === 'calendar' && <Calendar size={32} className="text-indigo-600 hidden md:block" />}
                                {activeView === 'completed' && <CheckCircle size={32} className="text-slate-600 hidden md:block" />}
                                
                                <span className="bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">
                                    {activeView === 'inbox' ? 'My Inbox' : 
                                    activeView === 'today' ? 'Today\'s Plan' : 
                                    activeView === 'upcoming' ? 'Upcoming' : 
                                    activeView === 'calendar' ? 'Calendar View' : 'Completed'}
                                </span>
                             </div>
                        </>
                    )}
                </h2>
                {(activeView === 'today' || activeView === 'calendar') && <p className="text-slate-500 mt-1 md:mt-2 font-medium md:ml-11 text-sm md:text-base">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>}
            </header>

            {activeView === 'calendar' ? (
                <CalendarView 
                    token={token} 
                    onDeleteTask={handleDeleteTask}
                    onAddTask={(date) => {
                        setNewTaskDate(date);
                        setIsModalOpen(true);
                    }}
                />
            ) : (
                <TaskList 
                    token={token} 
                    key={refreshKey} 
                    view={activeView} 
                    searchQuery={searchQuery} 
                />
            )}
        </div>
      </main>

      <ChatWidget token={token} onTaskUpdate={refreshTasks} />
      <AddTaskModal 
        isOpen={isModalOpen} 
        onClose={() => {
            setIsModalOpen(false);
            setNewTaskDate(null);
        }} 
        onTaskAdded={refreshTasks}
        token={token}
        initialDate={newTaskDate}
      />
    </div>
  );
}
