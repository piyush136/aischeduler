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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 backdrop-blur-sm animate-in fade-in duration-200 sm:p-4">
      <div className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:max-h-[80vh]">
        
        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold text-slate-800 sm:text-xl">
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
        <div className="custom-scrollbar flex-1 space-y-3 overflow-y-auto p-4 sm:p-6">
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
                className={`group flex flex-col gap-3 rounded-xl border p-4 transition-all sm:flex-row sm:items-start sm:justify-between
                  ${event.source === 'google' 
                    ? 'bg-orange-50/50 border-orange-100' 
                    : 'bg-white border-slate-100 hover:border-slate-300 shadow-sm'
                  }
                `}
              >
                <div className="min-w-0 flex-1 sm:mr-3">
                  <h4 className={`font-semibold text-sm truncate mb-1 ${
                    event.source === 'google' ? 'text-orange-900' : 'text-slate-800'
                  }`}>
                    {event.title}
                  </h4>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 sm:gap-3">
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
                <div className="flex items-center gap-2 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
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
        <div className="flex justify-end border-t border-slate-100 bg-slate-50 p-4">
           <button 
              onClick={() => onAddTask(date)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-900/20 transition-all hover:bg-indigo-700 active:scale-95 sm:w-auto"
           >
              <Plus size={18} />
              Add Task for Day
           </button>
        </div>

      </div>
    </div>
  );
}
