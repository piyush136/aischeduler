import NotificationService from './NotificationService';
import { parseISO, isFuture, differenceInMilliseconds } from 'date-fns';

class TimeNotificationService {
  constructor() {
    this.scheduledTimeouts = new Map(); // taskId -> { [offset]: timeoutId }
  }

  /**
   * Sync the notification schedule with the current list of tasks
   * @param {Array} tasks - List of active tasks
   */
  sync(tasks) {
    const now = new Date();

    // Clear old timeouts that are no longer relevant or tasks that are completed
    this.scheduledTimeouts.forEach((timeouts, taskId) => {
      const task = tasks.find(t => t._id === taskId);
      if (!task || task.status === 'completed') {
        Object.values(timeouts).forEach(clearTimeout);
        this.scheduledTimeouts.delete(taskId);
      }
    });

    // Schedule new timeouts for upcoming tasks
    tasks.forEach(task => {
      if (task.status === 'completed' || !task.due_at) return;

      const dueTime = parseISO(task.due_at);
      const taskId = task._id;
      
      // Initialize task timeouts mapping if it doesn't exist
      if (!this.scheduledTimeouts.has(taskId)) {
        this.scheduledTimeouts.set(taskId, {});
      }
      
      const currentTimeouts = this.scheduledTimeouts.get(taskId);
      
      // Define reminder offsets in minutes
      const offsets = [
        { min: 10, label: 'starts in 10 minutes' },
        { min: 5, label: 'starts in 5 minutes' },
        { min: 0, label: 'is starting now' }
      ];

      offsets.forEach(offset => {
        const triggerTime = new Date(dueTime.getTime() - offset.min * 60000);
        const delay = differenceInMilliseconds(triggerTime, now);

        // Only schedule if it's in the future and not already scheduled for this specific offset
        if (delay > 0 && !currentTimeouts[offset.min]) {
          const timeoutId = setTimeout(() => {
            this.triggerNotification(task, offset.label);
            delete currentTimeouts[offset.min];
            
            // Clean up taskId mapping if no more timeouts remain
            if (Object.keys(currentTimeouts).length === 0) {
              this.scheduledTimeouts.delete(taskId);
            }
          }, delay);
          
          currentTimeouts[offset.min] = timeoutId;
        }
      });
    });
  }

  triggerNotification(task, label) {
    NotificationService.notify(`⏰ Task Reminder: ${task.title}`, {
      body: `Your task "${task.title}" ${label}. ${task.location ? `\n📍 Location: ${task.location.name}` : ''}`,
      tag: `time-${task._id}-${label.replace(/\s+/g, '-')}`,
      requireInteraction: true
    });
  }

  clearAll() {
    this.scheduledTimeouts.forEach(timeouts => {
      Object.values(timeouts).forEach(clearTimeout);
    });
    this.scheduledTimeouts.clear();
  }
}

export default new TimeNotificationService();
