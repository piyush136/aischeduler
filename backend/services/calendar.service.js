const { google } = require('googleapis');
const { getTaskDurationMinutes, normalizeDate } = require('../utils/taskDate');

function normalizeInputDate(value) {
  const date = normalizeDate(value);
  if (!date) {
    throw new Error('Invalid date supplied to calendar service');
  }
  return date;
}

function mapRecurrenceToRule(task) {
  const recurrence = task?.recurrence;
  if (!recurrence || recurrence === 'NONE') return null;

  const weekdayMap = {
    EVERY_MONDAY: 'MO',
    EVERY_TUESDAY: 'TU',
    EVERY_WEDNESDAY: 'WE',
    EVERY_THURSDAY: 'TH',
    EVERY_FRIDAY: 'FR',
    EVERY_SATURDAY: 'SA',
    EVERY_SUNDAY: 'SU'
  };

  if (recurrence === 'DAILY') return 'RRULE:FREQ=DAILY';
  if (recurrence === 'WEEKDAYS') return 'RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR';
  if (recurrence === 'WEEKENDS') return 'RRULE:FREQ=WEEKLY;BYDAY=SA,SU';
  if (recurrence === 'EVERY_WEEK') return 'RRULE:FREQ=WEEKLY';
  if (recurrence === 'EVERY_2_WEEKS') return 'RRULE:FREQ=WEEKLY;INTERVAL=2';
  if (recurrence === 'EVERY_MONTH') return 'RRULE:FREQ=MONTHLY';
  if (recurrence === 'EVERY_3_MONTHS') return 'RRULE:FREQ=MONTHLY;INTERVAL=3';
  if (recurrence === 'EVERY_6_MONTHS') return 'RRULE:FREQ=MONTHLY;INTERVAL=6';
  if (recurrence === 'EVERY_YEAR') return 'RRULE:FREQ=YEARLY';
  if (recurrence === 'EVERY_2_DAYS') return 'RRULE:FREQ=DAILY;INTERVAL=2';
  if (recurrence === 'EVERY_3_DAYS') return 'RRULE:FREQ=DAILY;INTERVAL=3';
  if (weekdayMap[recurrence]) return `RRULE:FREQ=WEEKLY;BYDAY=${weekdayMap[recurrence]}`;
  return null;
}

class CalendarService {
  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
  }

  generateAuthUrl() {
    const scopes = [
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/calendar.readonly'
    ];
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent'
    });
  }

  async getToken(code) {
    const { tokens } = await this.oauth2Client.getToken(code);
    return tokens;
  }

  buildEventFromTask(task) {
    if (!task?.due_at) return null;

    const start = normalizeInputDate(task.due_at);
    const durationMinutes = getTaskDurationMinutes(task, 60);
    const end = new Date(start);
    end.setMinutes(end.getMinutes() + durationMinutes);

    const event = {
      summary: task.title,
      description: [task.description, task.location?.name ? `Location: ${task.location.name}` : null].filter(Boolean).join('\n'),
      reminders: {
        useDefault: true
      }
    };

    if (task.has_time === false) {
      const nextDay = new Date(start);
      nextDay.setDate(nextDay.getDate() + 1);
      event.start = { date: start.toISOString().slice(0, 10) };
      event.end = { date: nextDay.toISOString().slice(0, 10) };
    } else {
      event.start = {
        dateTime: start.toISOString(),
        timeZone: 'UTC'
      };
      event.end = {
        dateTime: end.toISOString(),
        timeZone: 'UTC'
      };
    }

    const recurrenceRule = mapRecurrenceToRule(task);
    if (recurrenceRule) {
      event.recurrence = [recurrenceRule];
    }

    return event;
  }

  async createTaskEvent(authTokens, task) {
    if (!task?.due_at) return null;

    this.oauth2Client.setCredentials(authTokens);
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    const event = this.buildEventFromTask(task);

    if (task.googleEventId) {
      try {
        const response = await calendar.events.update({
          calendarId: 'primary',
          eventId: task.googleEventId,
          resource: event
        });
        return response.data;
      } catch (error) {
        console.warn(`[CalendarService] Failed to update event ${task.googleEventId}, falling back to insert:`, error.message);
      }
    }

    const response = await calendar.events.insert({
      calendarId: 'primary',
      resource: event
    });

    return response.data;
  }

  async listEvents(authTokens, timeMin, timeMax) {
    if (!authTokens) throw new Error('No auth tokens provided');

    this.oauth2Client.setCredentials(authTokens);
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: normalizeInputDate(timeMin).toISOString(),
      timeMax: normalizeInputDate(timeMax).toISOString(),
      singleEvents: true,
      orderBy: 'startTime'
    });

    return response.data.items || [];
  }

  async deleteEvent(authTokens, calendarId, eventId) {
    if (!authTokens) throw new Error('No auth tokens provided');
    this.oauth2Client.setCredentials(authTokens);
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

    await calendar.events.delete({
      calendarId: calendarId || 'primary',
      eventId
    });
  }
}

module.exports = new CalendarService();
