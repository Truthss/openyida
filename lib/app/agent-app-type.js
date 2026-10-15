'use strict';

// Keep the server-derived AI application types in one place. Unknown types fail closed.
const AGENT_APP_TYPES = new Set(['cloud', 'local', 'web_local', 'qwenwork']);

function isAgentAppType(value) {
  return typeof value === 'string' && AGENT_APP_TYPES.has(value.trim().toLowerCase());
}

module.exports = { isAgentAppType };
