import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
  eachDayOfInterval, format, isSameMonth, isSameDay, 
  addMonths, subMonths, isToday 
} from 'date-fns';
import { ChevronLeft, ChevronRight, Clock, MapPin } from 'lucide-react';

import DayDetailModal from './DayDetailModal';

export default function CalendarView({ token, onDeleteTask, onAddTask }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [hoveredDate, setHoveredDate] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [isDayModalOpen, setIsDayModalOpen] = useState(false);

  // Derived dates
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  useEffect(() => {
    fetchEvents();
  }, [currentDate, token]);

  const fetchEvents = async () => {
    try {
      // Fetch range: startDate to endDate
      const res = await axios.get('/api/calendar/events', {
        params: { 
            start: startDate.toISOString(), 
            end: endDate.toISOString() 
        },
        headers: { Authorization: `Bearer ${token}` }
      });
      setEvents(res.data.events || []);
    } catch (err) {
      console.error("Failed to fetch events", err);
    }
  };

  const getEventsForDay = (day) => {
    return events.filter(e => isSameDay(new Date(e.start), day));
  };

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-visible">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-slate-100">
        <h2 className="text-xl font-bold text-slate-800">
          {format(currentDate, 'MMMM yyyy')}
        </h2>
        <div className="flex gap-2">
          <button onClick={prevMonth} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600">
            <ChevronLeft size={20} />
          </button>
          <button onClick={nextMonth} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Scrollable Container for Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[700px]">
          {/* Grid Header */}
          <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="py-3 text-center text-sm font-semibold text-slate-500 uppercase tracking-wider">
                {day}
              </div>
            ))}
          </div>

          {/* Grid Body */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day, idx) => {
              const dayEvents = getEventsForDay(day);
              const isCurrentMonth = isSameMonth(day, monthStart);
              const isDayToday = isToday(day);
              
              return (
                <div 
                  key={day.toISOString()}
                  className={`min-h-[80px] md:min-h-[120px] border-b border-r border-slate-100 p-2 relative group transition-colors hover:bg-slate-50
                    ${!isCurrentMonth ? 'bg-slate-50/50 text-slate-400' : 'bg-white'}
                  `}
                  onMouseEnter={() => setHoveredDate(day)}
                  onMouseLeave={() => setHoveredDate(null)}
                  onClick={() => {
                    setSelectedDay(day);
                    setIsDayModalOpen(true);
                  }}
                >
                  {/* Day Number */}
                  <div className={`text-sm font-medium mb-1 md:mb-2 w-6 h-6 md:w-7 md:h-7 flex items-center justify-center rounded-full
                     ${isDayToday ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'text-slate-700'}
                  `}>
                    {format(day, 'd')}
                  </div>

                  {/* Event Dots/Indicators */}
                  <div className="space-y-0.5 md:space-y-1">
                    {dayEvents.slice(0, 3).map(event => (
                      <div key={event.id} className="text-[10px] md:text-xs truncate px-1 md:px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                        {event.title}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-[10px] md:text-xs text-slate-400 pl-1">
                        +{dayEvents.length - 3}
                      </div>
                    )}
                  </div>

                  {/* Hover Popover - keeping generic logic, hidden on mobile by default via css usually, but group-hover generally requires hover capable device */}
                  <div className="absolute left-1/2 bottom-full mb-2 -translate-x-1/2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 p-4 z-50 hidden md:group-hover:block animate-in fade-in zoom-in-95 duration-200">
                     <div className="font-bold text-slate-800 mb-3 pb-2 border-b border-slate-100">
                        {format(day, 'EEEE, MMM do')}
                     </div>
                     
                     {dayEvents.length === 0 ? (
                        <p className="text-sm text-slate-400 italic">No events scheduled</p>
                     ) : (
                        <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar">
                            {dayEvents.map(event => (
                                <div key={event.id} className="text-left">
                                    <div className="font-medium text-slate-800 text-sm line-clamp-2">{event.title}</div>
                                    <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500">
                                        <Clock size={12} />
                                        <span>
                                            {format(new Date(event.start), 'h:mm a')} - {format(new Date(event.end), 'h:mm a')}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                     )}
                     
                     {/* Little Triangle Arrow */}
                     <div className="absolute left-1/2 top-full -translate-x-1/2 -mt-1 border-8 border-transparent border-t-white drop-shadow-sm"></div>
                  </div>

                </div>
              );
            })}
          </div>
        </div>
      </div>
      
      <DayDetailModal 
        isOpen={isDayModalOpen}
        onClose={() => setIsDayModalOpen(false)}
        date={selectedDay}
        events={selectedDay ? getEventsForDay(selectedDay) : []}
        onDeleteTask={(id) => {
            onDeleteTask(id);
            // Refresh events after delete? The parent needs to trigger a refresh.
            // For now, simpler to just close or let parent update.
            // Ideally we lift state up or trigger a refresh callback.
            // Let's assume onTaskAdded/Deleted triggers a refresh in parent, which propogates here?
            // Actually, CalendarView fetches its own events. We need a refresh trigger.
            // Let's rely on parent passing a refreshKey or similar, or just re-fetch.
            // Quick fix: re-fetch after short delay or pass a callback that calls fetchEvents.
            setTimeout(fetchEvents, 500); 
            setIsDayModalOpen(false);
        }}
        onAddTask={(date) => {
            setIsDayModalOpen(false);
            onAddTask(date);
        }}
      />
    </div>
  );
}
