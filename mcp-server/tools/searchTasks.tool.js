const axios = require('axios');
const { fuzzyTaskSearch } = require('./utils/fuzzyTaskSearch');

const API_URL = process.env.BACKEND_URL;

const searchTasks = {
  name: "search_tasks",
  description: "Smart search across all tasks using fuzzy matching. Finds tasks even with typos or partial names. Returns ranked results with match scores. Use this tool to find a task's ID before performing actions like update, delete, or postpone.",
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "The name, title, or partial text of the task to search for (e.g., 'gym', 'meeting', 'buy milk'). Handles typos and near-matches."
      },
      scope: {
        type: "string",
        enum: ["personal", "team"],
        description: "Where to search: 'personal' for user's own tasks (default), 'team' to search within a specific team."
      },
      team_id: {
        type: "string",
        description: "The team ID to search within (required if scope is 'team')."
      },
      status_filter: {
        type: "string",
        enum: ["pending", "completed", "all"],
        description: "Filter results by status. Default is 'all'."
      }
    },
    required: ["query"]
  },
  execute: async (args, token) => {
    try {
      const { query, scope = 'personal', team_id, status_filter = 'all' } = args;
      if (!query) return { success: false, error: "Missing query" };

      console.log(`[MCP] searchTasks: fuzzy searching for '${query}' (scope: ${scope})`);

      const result = await fuzzyTaskSearch(query, token, {
        scope,
        teamId: team_id,
        statusFilter: status_filter,
        minScore: 40,
        limit: 10
      });

      if (!result.success) return result;

      if (result.matches.length === 0) {
        return { success: true, message: `No tasks found matching '${query}'.`, count: 0, tasks: [] };
      }

      console.log(`[MCP] searchTasks: found ${result.matches.length} matches (best: "${result.bestMatch.title}" score: ${result.bestMatch.score})`);

      return {
        success: true,
        count: result.matches.length,
        tasks: result.matches,
        bestMatch: result.bestMatch,
        ambiguous: result.ambiguous,
        message: result.message
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};

module.exports = searchTasks;
