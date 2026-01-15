import { X, Trash2, Plus, Clock, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';

export default function DayDetailModal({ 
  isOpen, 
  onClose, 
  date, 
  events, 
  onDeleteTask, 
  onAddTask 
}) {
  if (!isOpen || !date) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]">
        
        {/* Header */}
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-slate-800">
              {format(date, 'EEEE, MMMM do')}
            </h2>
            <p className="text-slate-500 text-sm">
              {events.length} {events.length === 1 ? 'Event' : 'Events'} Scheduled
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-200 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
          {events.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <p>No tasks or events for this day.</p>
              <button 
                onClick={() => onAddTask(date)}
                className="mt-4 text-indigo-600 hover:text-indigo-700 font-medium text-sm flex items-center justify-center gap-1 mx-auto"
              >
                <Plus size={16} /> Add your first task
              </button>
            </div>
          ) : (
            events.map((event) => (
              <div 
                key={event.id} 
                className={`p-4 rounded-xl border flex items-start justify-between group transition-all
                  ${event.source === 'google' 
                    ? 'bg-orange-50/50 border-orange-100' 
                    : 'bg-white border-slate-100 hover:border-slate-300 shadow-sm'
                  }
                `}
              >
                <div className="flex-1 min-w-0 mr-3">
                  <h4 className={`font-semibold text-sm truncate mb-1 ${
                    event.source === 'google' ? 'text-orange-900' : 'text-slate-800'
                  }`}>
                    {event.title}
                  </h4>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                     <div className="flex items-center gap-1">
                        <Clock size={12} />
                        {format(new Date(event.start), 'h:mm a')} - {format(new Date(event.end), 'h:mm a')}
                     </div>
                     {event.source === 'google' && (
                        <span className="flex items-center gap-1 text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded">
                           Google Event
                        </span>
                     )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                   {event.source === 'google' ? (
                     <a 
                       href={event.link} 
                       target="_blank" 
                       rel="noreferrer"
                       className="p-1.5 text-orange-400 hover:text-orange-600 hover:bg-orange-100 rounded-lg transition-colors"
                       title="Open in Google Calendar"
                     >
                       <ExternalLink size={16} />
                     </a>
                   ) : (
                     <button 
                       onClick={() => onDeleteTask(event.id)}
                       className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                       title="Delete Task"
                     >
                       <Trash2 size={16} />
                     </button>
                   )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
           <button 
              onClick={() => onAddTask(date)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-lg shadow-indigo-900/20 transition-all transform active:scale-95"
           >
              <Plus size={18} />
              Add Task for Day
           </button>
        </div>

      </div>
    </div>
  );
}
