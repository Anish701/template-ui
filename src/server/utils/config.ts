export const agentHost = process.env.AGENT_HOST || "http://localhost:5002";

// BASE_PATH  = "/{org}/{name}"        — router basename in path-prefix mode
// API_BASE_PATH = "/{org}/{name}/chat" — prefix for API fetch calls
// Both are empty strings in subdomain mode (UI served from /).
export const basePath = process.env.BASE_PATH || "";
export const apiBasePath = process.env.API_BASE_PATH || "";