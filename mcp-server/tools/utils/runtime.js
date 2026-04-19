function buildAuthHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function ensureArray(value) {
  if (Array.isArray(value)) return value.filter(item => item !== undefined && item !== null);
  if (value === undefined || value === null) return [];
  return [value];
}

function coerceObjectArgs(args) {
  if (!args) return {};
  if (typeof args === 'string') {
    try {
      const parsed = JSON.parse(args);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (error) {
      return { raw: args };
    }
  }
  if (Array.isArray(args)) {
    return { items: args };
  }
  return typeof args === 'object' ? { ...args } : {};
}

function normalizeToolArgs(args = {}) {
  const normalized = coerceObjectArgs(args);

  if (typeof normalized.query === 'string') {
    normalized.query = normalized.query.trim();
  }

  return normalized;
}

function getApiErrorMessage(error, fallback = 'Request failed') {
  const status = error?.response?.status;
  const retryAfter = error?.response?.headers?.['retry-after'];

  if (status === 429) {
    const retryHint = retryAfter ? ` Please try again after ${retryAfter} second(s).` : ' Please wait a moment and try again.';
    return `The service is receiving too many requests right now.${retryHint}`;
  }

  if (status >= 500) {
    return 'The service is temporarily unavailable. Please try again in a moment.';
  }

  return (
    error?.response?.data?.error ||
    error?.response?.data?.message ||
    error?.response?.data?.details ||
    error?.message ||
    fallback
  );
}

module.exports = {
  buildAuthHeaders,
  cleanString,
  ensureArray,
  getApiErrorMessage,
  normalizeToolArgs
};
