const axios = require('axios');
const { getDayBounds, normalizeDueAt } = require('./utils/dateTime');
const { buildAuthHeaders, getApiErrorMessage } = require('./utils/runtime');

const { BACKEND_API_URL: API_URL } = require('../config/api');

const listEvents = {
  name: 'list_events',
  description: 'List local scheduled items and mirrored Google Calendar events for a date range.',
  parameters: {
    type: 'object',
    properties: {
      start_date: {
        type: 'string',
        description: 'Optional start date/time or natural language date.'
      },
      end_date: {
        type: 'string',
        description: 'Optional end date/time or natural language date.'
      }
    }
  },
  execute: async (args, token) => {
    try {
      const { _meta = {} } = args;
      let startDate;
      let endDate;

      if (args.start_date) {
        const normalizedStart = normalizeDueAt(args.start_date, _meta);
        if (!normalizedStart.dueAt) {
          return { success: false, error: normalizedStart.error || `Could not understand "${args.start_date}".` };
        }
        startDate = new Date(normalizedStart.dueAt);
      } else {
        startDate = getDayBounds(_meta.localDate || 'today', _meta).start;
      }

      if (args.end_date) {
        const normalizedEnd = normalizeDueAt(args.end_date, _meta);
        if (!normalizedEnd.dueAt) {
          return { success: false, error: normalizedEnd.error || `Could not understand "${args.end_date}".` };
        }
        endDate = new Date(normalizedEnd.dueAt);
      } else {
        endDate = new Date(startDate);
        endDate.setHours(23, 59, 59, 999);
      }

      const response = await axios.get(`${API_URL}/calendar/events`, {
        params: { start: startDate.toISOString(), end: endDate.toISOString() },
        headers: buildAuthHeaders(token)
      });

      const localEvents = response.data.events || [];
      const externalEvents = response.data.externalEvents || [];
      const allEvents = [
        ...localEvents.map(event => ({ ...event, source: event.source || 'local' })),
        ...externalEvents.map(event => ({ ...event, source: event.source || 'google' }))
      ];

      const eventsSummary = allEvents
        .sort((a, b) => new Date(a.start) - new Date(b.start))
        .map(event => {
          const time = event.start ? new Date(event.start).toLocaleString() : 'No time';
          return `- [${time}] ${event.title} (${event.source})`;
        })
        .join('\n');

      return {
        success: true,
        connected: Boolean(response.data.connected),
        count: allEvents.length,
        localCount: localEvents.length,
        externalCount: externalEvents.length,
        events_summary: eventsSummary || 'No events found for this period.',
        events: allEvents
      };
    } catch (error) {
      return { success: false, error: getApiErrorMessage(error, 'Failed to fetch events.') };
    }
  }
};

module.exports = listEvents;
