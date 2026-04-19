function trimTrailingSlash(value) {
  return String(value || '').replace(/\/+$/, '');
}

const FRONTEND_URL = trimTrailingSlash(process.env.FRONTEND_URL || 'http://localhost:5173');
const BACKEND_PUBLIC_URL = trimTrailingSlash(process.env.BACKEND_PUBLIC_URL || `http://localhost:${process.env.PORT || 3000}`);
const MCP_SERVER_URL = trimTrailingSlash(process.env.MCP_SERVER_URL || 'http://localhost:4000');

function frontendUrl(path = '') {
  const cleanPath = String(path || '').replace(/^\/+/, '');
  return cleanPath ? `${FRONTEND_URL}/${cleanPath}` : FRONTEND_URL;
}

module.exports = {
  BACKEND_PUBLIC_URL,
  FRONTEND_URL,
  MCP_SERVER_URL,
  frontendUrl
};
