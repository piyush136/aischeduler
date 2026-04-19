function trimTrailingSlash(value) {
  return String(value || '').replace(/\/+$/, '');
}

const BACKEND_API_URL = trimTrailingSlash(process.env.BACKEND_URL || 'http://localhost:5000');
const MCP_PUBLIC_URL = trimTrailingSlash(process.env.MCP_PUBLIC_URL || `http://localhost:${process.env.PORT || 4000}/mcp`);

module.exports = {
  BACKEND_API_URL,
  MCP_PUBLIC_URL
};
