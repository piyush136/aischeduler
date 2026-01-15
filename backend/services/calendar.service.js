const { google } = require('googleapis');

// Placeholder for Google Calendar logic
// Requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env

class CalendarService {
  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
  }

  generateAuthUrl() {
    const scopes = ['https://www.googleapis.com/auth/calendar.events'];
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent' // Force refresh_token on every connect
    });
  }

  async getToken(code) {
    const { tokens } = await this.oauth2Client.getToken(code);
    return tokens;
  }

  async createTaskEvent(authTokens, task) {
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    this.oauth2Client.setCredentials(authTokens);
    
    // Simple event based on task due date
    const event = {
      summary: task.title,
      description: task.description,
      start: {
        dateTime: new Date(task.due_at).toISOString(),
        timeZone: 'UTC', // standardized
      },
      end: {
        dateTime: new Date(new Date(task.due_at).getTime() + 60 * 60 * 1000).toISOString(), // Default 1 hour duration
        timeZone: 'UTC',
      },
    };

    if (task.recurrence) {
        event.recurrence = [`RRULE:FREQ=${task.recurrence}`];
    }
    
    require('fs').appendFileSync('sync_debug.log', `[${new Date().toISOString()}] Google Payload: ${JSON.stringify(event, null, 2)}\n`);

    const res = await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
    });
    
    return res.data;
  }

  async listEvents(authTokens, timeMin, timeMax) {
    if (!authTokens) throw new Error('No auth tokens provided');
    
    this.oauth2Client.setCredentials(authTokens);
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    
    const res = await calendar.events.list({
      calendarId: 'primary',
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });
    
    return res.data.items;
  }

  async deleteEvent(authTokens, calendarId, eventId) {
      if (!authTokens) throw new Error('No auth tokens provided');
      this.oauth2Client.setCredentials(authTokens);
      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

      await calendar.events.delete({
          calendarId: calendarId || 'primary',
          eventId: eventId
      });
  }
}

module.exports = new CalendarService();
