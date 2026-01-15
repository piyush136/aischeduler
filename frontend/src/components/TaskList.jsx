import { useEffect, useState } from 'react';
import axios from 'axios';
import { Check, Trash2, Calendar, Clock } from 'lucide-react';
import { format, isToday, isPast, isTomorrow, isWithinInterval, addDays, parseISO } from 'date-fns';

export default function TaskList({ token, view, searchQuery }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const toggleTask = async (task) => {
    // Confirmation
    const confirmMsg = task.status === 'completed' 
        ? "Mark this task as pending?" 
        : (task.isGoogleEvent ? "Mark this Google Event as complete? This will delete it from your calendar." : "Have you completed this task?");
    
    if (!window.confirm(confirmMsg)) return;

    try {
        if (task.isGoogleEvent) {
             // Treat completion of Google Event as deletion
             await axios.delete(`/api/calendar/events/${task._id}`, {
                headers: { Authorization: `Bearer ${token}` }
             });
             // Remove from local view
             setTasks(prev => prev.filter(t => t._id !== task._id));
        } else {
            const newStatus = task.status === 'completed' ? 'pending' : 'completed';
            setTasks(prev => prev.map(t => t._id === task._id ? { ...t, status: newStatus } : t));
            
            await axios.patch(`/api/tasks/${task._id}`, { status: newStatus }, {
                headers: { Authorization: `Bearer ${token}` }
            });
        }
    } catch (err) {
         console.error(err);
         fetchTasks();
    }
  };

  const deleteTask = async (task) => {
    // For Google events, we already handled "Complete" as delete, but "Delete" button does same
    const confirmMsg = task.isGoogleEvent 
        ? "Are you sure you want to delete this event from Google Calendar?"
        : "Are you sure you want to delete this task?";

    if(!window.confirm(confirmMsg)) return;

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
    } catch (err) {
        console.error(err);
        fetchTasks();
    }
  }

  if (loading) return <div className="p-4 text-gray-400">Loading tasks...</div>;

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
        filteredTasks = filteredTasks.filter(t => t.status !== 'completed'); // Hide completed in Today unless search
    } else if (view === 'upcoming') {
        filteredTasks = tasks.filter(task => {
            if (!task.due_at) return false;
            const date = parseISO(task.due_at);
            return (isPast(date) === false || isToday(date)) && task.status !== 'completed';
        }).sort((a,b) => new Date(a.due_at) - new Date(b.due_at));
    } else if (view === 'completed') {
        filteredTasks = tasks.filter(t => t.status === 'completed');
    } else {
        // Inbox
        filteredTasks = tasks.filter(t => t.status !== 'completed');
    }
  }
  
  const getPriorityBadge = (p) => {
      switch(p) {
          case 5: return <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-red-100 text-red-600 uppercase tracking-wide">High</span>;
          case 4: return <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-orange-100 text-orange-600 uppercase tracking-wide">Medium</span>;
          default: return null; 
      }
  };

  return (
    <div className={
        // Use Grid for Today/Upcoming/Completed to fill space nicely without stretching
        // Use a focused list for Inbox or just Grid for everything? 
        // User asked specifically for Today/Upcoming not to expand.
        "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
    }>
      {filteredTasks.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-20 opacity-60">
              <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
                 <Check size={40} className="text-indigo-300" />
              </div>
              <p className="text-slate-500 font-medium text-lg">
                  {searchQuery ? "No matching tasks found." : 
                   view === 'completed' ? "No completed tasks yet." : 
                   "All caught up! Time to relax."}
              </p>
          </div>
      )}
      
      {filteredTasks.map((task) => (
        <div key={task._id} className={`group relative bg-white rounded-xl p-5 shadow-sm border ${task.isGoogleEvent ? 'border-blue-200/60 bg-blue-50/10' : 'border-slate-100/60'} hover:shadow-md hover:border-indigo-100/80 transition-all duration-300 flex flex-col h-full hover:-translate-y-1`}>
          <div className="flex items-start gap-4 flex-1">
            {/* Checkbox or Icon */}
            <button 
                onClick={() => toggleTask(task)}
                className={`flex-shrink-0 mt-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                    task.status === 'completed' 
                        ? 'bg-indigo-500 border-indigo-500 scale-95' 
                        : (task.isGoogleEvent ? 'border-blue-300 hover:border-blue-500 hover:bg-blue-50' : 'border-slate-300 hover:border-indigo-500')
                }`}
            >
                {task.status === 'completed' && <Check size={14} className="text-white" />}
                {task.isGoogleEvent && task.status !== 'completed' && <Check size={14} className="text-blue-400 opacity-0 hover:opacity-100" />}
            </button>

            {/* Content */}
            <div className={`flex-1 min-w-0 ${task.status === 'completed' ? 'opacity-50' : ''}`}>
                <div className="flex flex-col gap-2 mb-2">
                     {!task.isGoogleEvent && getPriorityBadge(task.priority)}
                     {task.isGoogleEvent && <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-blue-100 text-blue-600 uppercase tracking-wide w-fit flex items-center gap-1">
                        <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="G" className="w-3 h-3" />
                        Google Event
                     </span>}
                     
                     <h3 className={`text-base font-semibold text-slate-800 break-words leading-snug ${task.status === 'completed' ? 'line-through text-slate-400' : ''}`}>
                        {task.title}
                    </h3>
                </div>
                
                {task.due_at && (
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-auto pt-2">
                        <span className={`flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-50 ${isToday(parseISO(task.due_at)) ? 'text-green-600 bg-green-50 font-medium' : ''}`}>
                            <Calendar size={13} />
                            {isToday(parseISO(task.due_at)) ? 'Today' : format(parseISO(task.due_at), 'MMM d')}
                        </span>
                        <span className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-50">
                            <Clock size={13} />
                            {format(parseISO(task.due_at), 'p')}
                        </span>
                    </div>
                )}
            </div>
          </div>
          
           {/* Actions */}
           <button 
                onClick={() => deleteTask(task)}
                className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                title={task.isGoogleEvent ? "Delete from Google Calendar" : "Delete task"}
            >
                <Trash2 size={16} />
            </button>
        </div>
      ))}
    </div>
  );
}
