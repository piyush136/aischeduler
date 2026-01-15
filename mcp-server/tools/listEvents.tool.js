const axios = require('axios');

const API_URL = process.env.BACKEND_URL;

const listEvents = {
  name: "list_events",
  description: "List calendar events and tasks for a given date range to check availability or summarize schedule.",
  parameters: {
    type: "object",
    properties: {
      start_date: {
        type: "string",
        description: "Start date in ISO-8601 format (e.g., '2023-10-27T00:00:00Z'). Defaults to Start of Today if not provided."
      },
      end_date: {
        type: "string",
        description: "End date in ISO-8601 format. Defaults to End of Today if not provided."
      }
    }
  },
  execute: async (args, token) => {
    try {
      let { start_date, end_date } = args;

      // Defaults
      if (!start_date) {
        const now = new Date();
        now.setHours(0,0,0,0);
        start_date = now.toISOString();
      }
      if (!end_date) {
         const end = new Date(start_date); // Start from start_date
         end.setHours(23,59,59,999); // End of that day
         end_date = end.toISOString();
      }

      console.log(`[MCP] Fetching events from ${start_date} to ${end_date}`);

      const response = await axios.get(`${API_URL}/calendar/events`, {
        params: { start: start_date, end: end_date },
        headers: { Authorization: `Bearer ${token}` }
      });

      const events = response.data.events || [];
      
      // Simplify output for LLM to save tokens
      const summary = events.map(e => {
        const time = new Date(e.start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        return `- [${time}] ${e.title} (${e.source})`; 
      }).join('\n');

      return { 
        count: events.length, 
        events_summary: summary || "No events found for this period." 
      };

    } catch (error) {
      console.error("[MCP] list_events error:", error.message);
      return { success: false, error: "Failed to fetch events. Ensure Google Calendar is connected if needed." };
    }
  }
};

module.exports = listEvents;
