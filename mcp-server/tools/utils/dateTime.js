const chrono = require('chrono-node');

const DEFAULT_VAGUE_TIMES = {
  morning: '09:00',
  afternoon: '14:00',
  evening: '19:00',
  tonight: '21:00',
  night: '22:00',
  noon: '12:00',
  later: '18:00',
  'later today': '18:00',
  'end of day': '23:00'
};

function pad(value) {
  return String(value).padStart(2, '0');
}

function toLocalISOString(date) {
  return [
    date.getFullYear(),
    '-',
    pad(date.getMonth() + 1),
    '-',
    pad(date.getDate()),
    'T',
    pad(date.getHours()),
    ':',
    pad(date.getMinutes()),
    ':',
    pad(date.getSeconds())
  ].join('');
}

function getReferenceDate(meta = {}) {
  const localDate = typeof meta.localDate === 'string' ? meta.localDate.trim() : '';
  const localTimeString = typeof meta.localTimeString === 'string' ? meta.localTimeString.trim() : '';

  if (localDate) {
    const timeMatch = localTimeString.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?/i);
    let hours = 12;
    let minutes = 0;
    let seconds = 0;

    if (timeMatch) {
      hours = Number(timeMatch[1]);
      minutes = Number(timeMatch[2]);
      seconds = Number(timeMatch[3] || 0);
      const meridiem = timeMatch[4]?.toUpperCase();
      if (meridiem === 'PM' && hours !== 12) hours += 12;
      if (meridiem === 'AM' && hours === 12) hours = 0;
    }

    const reference = new Date(`${localDate}T00:00:00`);
    if (!Number.isNaN(reference.getTime())) {
      reference.setHours(hours, minutes, seconds, 0);
      return reference;
    }
  }

  return new Date();
}

function extractVagueTime(text = '') {
  const normalized = text.toLowerCase();
  const matchedKey = Object.keys(DEFAULT_VAGUE_TIMES)
    .sort((a, b) => b.length - a.length)
    .find(key => normalized.includes(key));

  return matchedKey ? DEFAULT_VAGUE_TIMES[matchedKey] : null;
}

function hasExplicitTime(text = '') {
  return (
    /\b\d{1,2}(:\d{2})?\s*(am|pm)\b/i.test(text) ||
    /\b\d{1,2}:\d{2}\b/.test(text) ||
    /\b(noon|midnight)\b/i.test(text)
  );
}

function combineDateAndClock(date, clock) {
  const combined = new Date(date);
  const match = String(clock).match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return combined;
  combined.setHours(Number(match[1]), Number(match[2]), Number(match[3] || 0), 0);
  return combined;
}

function normalizeDueAt(input, meta = {}, options = {}) {
  const {
    defaultTimeIfDateOnly = null,
    preferFuture = true
  } = options;

  if (input === undefined || input === null || input === '') {
    return { dueAt: null, hasTime: false, inferredTime: false, source: 'missing' };
  }

  const referenceDate = getReferenceDate(meta);

  if (input instanceof Date && !Number.isNaN(input.getTime())) {
    return {
      dueAt: toLocalISOString(input),
      hasTime: true,
      inferredTime: false,
      source: 'date'
    };
  }

  const raw = String(input).trim();
  if (!raw) {
    return { dueAt: null, hasTime: false, inferredTime: false, source: 'empty' };
  }

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?$/i.test(raw)) {
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      return {
        dueAt: toLocalISOString(parsed),
        hasTime: true,
        inferredTime: false,
        source: 'iso'
      };
    }
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const dateOnly = new Date(`${raw}T00:00:00`);
    if (!Number.isNaN(dateOnly.getTime())) {
      const finalDate = defaultTimeIfDateOnly ? combineDateAndClock(dateOnly, defaultTimeIfDateOnly) : dateOnly;
      return {
        dueAt: toLocalISOString(finalDate),
        hasTime: Boolean(defaultTimeIfDateOnly),
        inferredTime: Boolean(defaultTimeIfDateOnly),
        source: 'date_only'
      };
    }
  }

  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(raw)) {
    const combined = combineDateAndClock(referenceDate, raw);
    return {
      dueAt: toLocalISOString(combined),
      hasTime: true,
      inferredTime: false,
      source: 'time_only'
    };
  }

  let preparedText = raw;
  let inferredTime = false;
  const vagueTime = !hasExplicitTime(raw) ? extractVagueTime(raw) : null;
  if (vagueTime) {
    preparedText = `${raw} ${vagueTime}`;
    inferredTime = true;
  }

  const parsedResults = chrono.parse(preparedText, referenceDate, { forwardDate: preferFuture });
  const parsedResult = parsedResults[0];
  if (!parsedResult) {
    return { dueAt: null, hasTime: false, inferredTime: false, error: `Could not parse "${raw}"`, source: 'unparsed' };
  }

  const parsedDate = parsedResult.start.date();
  const knownValues = parsedResult.start.knownValues || {};
  const hasTime = Object.prototype.hasOwnProperty.call(knownValues, 'hour') || inferredTime;

  if (!hasTime && defaultTimeIfDateOnly) {
    const adjusted = combineDateAndClock(parsedDate, defaultTimeIfDateOnly);
    return {
      dueAt: toLocalISOString(adjusted),
      hasTime: true,
      inferredTime: true,
      source: 'chrono_default_time'
    };
  }

  if (!hasTime) {
    parsedDate.setHours(0, 0, 0, 0);
  }

  return {
    dueAt: toLocalISOString(parsedDate),
    hasTime,
    inferredTime,
    source: 'chrono'
  };
}

function isPastDue(dueAt, meta = {}, options = {}) {
  const { hasTime = true } = options;
  if (!dueAt) return false;
  const parsed = new Date(dueAt);
  if (Number.isNaN(parsed.getTime())) return false;

  if (!hasTime) {
    const endOfDay = new Date(parsed);
    endOfDay.setHours(23, 59, 59, 999);
    return endOfDay.getTime() < getReferenceDate(meta).getTime();
  }

  return parsed.getTime() < getReferenceDate(meta).getTime();
}

function getDayBounds(dateLike, meta = {}) {
  const normalized = normalizeDueAt(dateLike, meta);
  const baseDate = normalized.dueAt ? new Date(normalized.dueAt) : getReferenceDate(meta);
  const start = new Date(baseDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(baseDate);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

module.exports = {
  DEFAULT_VAGUE_TIMES,
  getDayBounds,
  getReferenceDate,
  isPastDue,
  normalizeDueAt,
  toLocalISOString
};
