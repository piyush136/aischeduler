const trimTrailingSlash = (value) => String(value || '').replace(/\/+$/, '');
const trimLeadingSlash = (value) => String(value || '').replace(/^\/+/, '');

export const API_BASE_URL = trimTrailingSlash(import.meta.env.VITE_API_BASE_URL || '/api');
export const MCP_BASE_URL = trimTrailingSlash(import.meta.env.VITE_MCP_BASE_URL || 'http://localhost:4000/mcp');
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '747419449636-ilnmj1uv3u3p7atfmonk87pird8c05ib.apps.googleusercontent.com';

export function apiUrl(path = '') {
  const cleanPath = trimLeadingSlash(path).replace(/^api\//, '');
  return cleanPath ? `${API_BASE_URL}/${cleanPath}` : API_BASE_URL;
}

export function mcpUrl(path = '') {
  const cleanPath = trimLeadingSlash(path).replace(/^mcp\//, '');
  return cleanPath ? `${MCP_BASE_URL}/${cleanPath}` : MCP_BASE_URL;
}
