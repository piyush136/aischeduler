const axios = require('axios');
const { buildAuthHeaders } = require('./runtime');

const { BACKEND_API_URL: API_URL } = require('../../config/api');

function levenshtein(a, b) {
  const matrix = [];
  const aLen = a.length;
  const bLen = b.length;

  if (aLen === 0) return bLen;
  if (bLen === 0) return aLen;

  for (let i = 0; i <= bLen; i += 1) matrix[i] = [i];
  for (let j = 0; j <= aLen; j += 1) matrix[0][j] = j;

  for (let i = 1; i <= bLen; i += 1) {
    for (let j = 1; j <= aLen; j += 1) {
      const cost = a[j - 1] === b[i - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[bLen][aLen];
}

function similarityScore(a, b) {
  if (!a || !b) return 0;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 100;
  return Math.round((1 - levenshtein(a, b) / maxLen) * 100);
}

function normalizeText(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\b(the|a|an|time|task|date|change|update|move|set|to|my|me|please)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function sortedWords(text) {
  return normalizeText(text)
    .split(' ')
    .filter(Boolean)
    .sort()
    .join(' ');
}

function scoreTask(task, query) {
  const title = normalizeText(task.title);
  const description = normalizeText(task.description);
  const normalizedQuery = normalizeText(query);

  if (!title && !description) return { score: 0, matchType: 'none' };
  if (!normalizedQuery) return { score: 0, matchType: 'empty_query' };

  if (title === normalizedQuery) return { score: 100, matchType: 'exact' };
  if (sortedWords(title) === sortedWords(normalizedQuery)) return { score: 94, matchType: 'word_reorder' };
  if (title.startsWith(normalizedQuery)) return { score: 90, matchType: 'starts_with' };
  if (title.includes(normalizedQuery)) return { score: 86, matchType: 'contains' };

  const queryWords = normalizedQuery.split(' ').filter(Boolean);
  const titleWords = title.split(' ').filter(Boolean);
  if (queryWords.length > 0 && queryWords.every(queryWord => titleWords.some(titleWord => titleWord.includes(queryWord) || queryWord.includes(titleWord)))) {
    return { score: 80, matchType: 'word_match' };
  }

  if (description && description.includes(normalizedQuery)) {
    return { score: 60, matchType: 'description_match' };
  }

  const fuzzySimilarity = similarityScore(title, normalizedQuery);
  if (fuzzySimilarity >= 62) return { score: fuzzySimilarity, matchType: 'fuzzy' };

  let bestWordFuzzy = 0;
  for (const queryWord of queryWords) {
    for (const titleWord of titleWords) {
      bestWordFuzzy = Math.max(bestWordFuzzy, similarityScore(titleWord, queryWord));
    }
  }
  if (bestWordFuzzy >= 65) return { score: Math.round(bestWordFuzzy * 0.85), matchType: 'fuzzy_word' };

  return { score: 0, matchType: 'none' };
}

async function fetchTasksByScope(token, scope, teamId) {
  if (scope === 'team' && teamId) {
    const response = await axios.get(`${API_URL}/teams/${teamId}/tasks`, {
      headers: buildAuthHeaders(token)
    });
    return response.data || [];
  }

  if (scope === 'all') {
    const [personalResponse, teamResponse] = await Promise.all([
      axios.get(`${API_URL}/tasks`, { headers: buildAuthHeaders(token) }),
      axios.get(`${API_URL}/teams`, { headers: buildAuthHeaders(token) })
    ]);

    const personalTasks = personalResponse.data || [];
    const teams = teamResponse.data || [];
    const teamTasksArrays = await Promise.all(
      teams.map(team => axios.get(`${API_URL}/teams/${team.team_id || team._id}/tasks`, {
        headers: buildAuthHeaders(token)
      }).then(result => result.data || []).catch(() => []))
    );

    return [...personalTasks, ...teamTasksArrays.flat()];
  }

  const response = await axios.get(`${API_URL}/tasks`, {
    headers: buildAuthHeaders(token)
  });
  return response.data || [];
}

async function fuzzyTaskSearch(query, token, options = {}) {
  const {
    scope = 'personal',
    teamId = null,
    statusFilter = 'all',
    minScore = 45,
    limit = 10
  } = options;

  if (!query || !query.trim()) {
    return { success: false, error: 'Search query is required' };
  }

  try {
    let allTasks = await fetchTasksByScope(token, scope, teamId);

    if (statusFilter === 'pending') {
      allTasks = allTasks.filter(task => task.status !== 'completed');
    } else if (statusFilter === 'completed') {
      allTasks = allTasks.filter(task => task.status === 'completed');
    }

    const scored = allTasks
      .map(task => {
        const { score, matchType } = scoreTask(task, query);
        return {
          task_id: task._id,
          title: task.title,
          status: task.status,
          priority: task.priority,
          due_at: task.due_at,
          team_id: task.team_id || null,
          score,
          matchType
        };
      })
      .filter(task => task.score >= minScore)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if ((a.priority || 3) !== (b.priority || 3)) return (a.priority || 3) - (b.priority || 3);
        if (a.due_at && b.due_at) return new Date(a.due_at) - new Date(b.due_at);
        if (a.due_at) return -1;
        if (b.due_at) return 1;
        return a.title.localeCompare(b.title);
      })
      .slice(0, limit);

    if (scored.length === 0) {
      return {
        success: true,
        matches: [],
        bestMatch: null,
        ambiguous: false,
        message: `No tasks found matching "${query}".`
      };
    }

    const bestMatch = scored[0];
    const secondMatch = scored[1];
    const ambiguous = Boolean(
      secondMatch &&
      bestMatch.score < 92 &&
      bestMatch.score - secondMatch.score <= 8
    );

    return {
      success: true,
      matches: scored,
      bestMatch,
      ambiguous,
      message: ambiguous
        ? `Found multiple tasks matching "${query}".`
        : `Found task: "${bestMatch.title}" (ID: ${bestMatch.task_id})`
    };
  } catch (error) {
    console.error('[fuzzyTaskSearch] Error:', error.message);
    return { success: false, error: error.message };
  }
}

async function resolveTaskId(query, token, options = {}) {
  const result = await fuzzyTaskSearch(query, token, { ...options, statusFilter: options.statusFilter || 'pending' });

  if (!result.success) {
    return { resolved: false, error: result.error };
  }

  if (!result.bestMatch) {
    return { resolved: false, ambiguous: false, matches: [], message: `No tasks found matching "${query}".` };
  }

  if (result.ambiguous) {
    return {
      resolved: false,
      ambiguous: true,
      matches: result.matches.slice(0, 5).map(match => ({
        task_id: match.task_id,
        title: match.title,
        status: match.status,
        due_at: match.due_at,
        score: match.score
      })),
      message: `Multiple tasks match "${query}". Please specify which one.`
    };
  }

  return {
    resolved: true,
    task_id: result.bestMatch.task_id,
    title: result.bestMatch.title,
    score: result.bestMatch.score,
    matchType: result.bestMatch.matchType
  };
}

module.exports = {
  fuzzyTaskSearch,
  resolveTaskId,
  scoreTask,
  levenshtein,
  normalizeText,
  similarityScore
};
