function normalizeDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? new Date(value) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isPastDate(value) {
  const date = normalizeDate(value);
  return Boolean(date && date.getTime() < Date.now());
}

function getTaskDurationMinutes(task, fallbackMinutes = 60) {
  if (task?.has_time === false) return 0;
  const duration = Number(task?.duration_minutes);
  return Number.isFinite(duration) && duration > 0 ? duration : fallbackMinutes;
}

function getTaskEnd(task, fallbackMinutes = 60) {
  const start = normalizeDate(task?.due_at);
  if (!start) return null;

  const end = new Date(start);
  end.setMinutes(end.getMinutes() + getTaskDurationMinutes(task, fallbackMinutes));
  return end;
}

function hasCalendarRelevantChanges(previousTask, nextTask) {
  if (!previousTask || !nextTask) return true;

  const keys = [
    'title',
    'description',
    'due_at',
    'has_time',
    'duration_minutes',
    'recurrence',
    'recurrence_end_date'
  ];

  return keys.some(key => {
    const previous = previousTask[key] instanceof Date ? previousTask[key].toISOString() : previousTask[key];
    const next = nextTask[key] instanceof Date ? nextTask[key].toISOString() : nextTask[key];
    return previous !== next;
  });
}

module.exports = {
  getTaskDurationMinutes,
  getTaskEnd,
  hasCalendarRelevantChanges,
  isPastDate,
  normalizeDate
};
