import { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Plus, Clock, Calendar } from 'lucide-react';
import { format } from 'date-fns';

export default function AddTaskModal({ isOpen, onClose, onTaskAdded, token, initialDate }) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(initialDate ? format(new Date(initialDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
  const [time, setTime] = useState('09:00');
  const [priority, setPriority] = useState(3);
  const [loading, setLoading] = useState(false);

  // Sync initialDate when it changes or modal opens
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
     if (initialDate && isOpen) setDate(format(new Date(initialDate), 'yyyy-MM-dd'));
  }, [initialDate, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    try {
      // Construct ISO DateTime
      const dateTime = new Date(`${date}T${time}:00`);
      
      await axios.post('/api/tasks', {
        title,
        due_at: dateTime.toISOString(),
        priority
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Reset & Close
      setTitle('');
      setPriority(3);
      onTaskAdded();
      onClose();
    } catch (err) {
      console.error('Failed to add task', err);
      alert('Error creating task. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all">
        {/* Header */}
        <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Plus className="bg-blue-600 text-white rounded-md p-0.5" size={20} />
            New Task
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Task Title</label>
            <input 
              autoFocus
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g., Buy groceries..."
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 text-gray-400" size={16} />
                <input 
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
              <div className="relative">
                <Clock className="absolute left-3 top-2.5 text-gray-400" size={16} />
                <input 
                  type="time"
                  value={time}
                  onChange={e => setTime(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>
            </div>
          </div>

          <div>
             <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
             <div className="flex gap-2">
               {[1, 2, 3, 4, 5].map(p => (
                 <button
                   key={p}
                   type="button"
                   onClick={() => setPriority(p)}
                   className={`flex-1 py-1 rounded border text-sm font-medium transition-colors ${
                     priority === p 
                       ? 'bg-blue-600 text-white border-blue-600' 
                       : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                   }`}
                 >
                   {p === 1 ? 'Low' : p === 5 ? 'High' : p}
                 </button>
               ))}
             </div>
          </div>

          <div className="pt-4 flex justify-end gap-3">
             <button 
               type="button" 
               onClick={onClose}
               className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium"
             >
               Cancel
             </button>
             <button 
               type="submit" 
               disabled={loading}
               className="px-6 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 disabled:opacity-50 text-sm font-medium transition-transform active:scale-95"
             >
               {loading ? 'Adding...' : 'Create Task'}
             </button>
          </div>
        </form>
      </div>
    </div>
  );
}
