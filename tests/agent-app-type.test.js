'use strict';
const { isAgentAppType } = require('../lib/app/agent-app-type');

test.each(['cloud', 'local', 'web_local', 'qwenwork', ' WEB_LOCAL '])('accepts server AI type %s', value => {
  expect(isAgentAppType(value)).toBe(true);
});
test.each(['none', 'unknown', '', null, undefined, {}, ['cloud']])('rejects non-string or unknown type %p', value => {
  expect(isAgentAppType(value)).toBe(false);
});
