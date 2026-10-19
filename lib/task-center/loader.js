'use strict';

/* global window */

function createTaskCenterLoader(contract, resolveBridge, requestJson) {
  async function fetchPage(request) {
    const fetcher = typeof window !== 'undefined' && typeof window.fetch === 'function' ? window.fetch.bind(window)
      : typeof fetch === 'function' ? fetch : null;
    if (!fetcher) {
      const error = new Error('TASK_API_UNAVAILABLE');
      error.code = 'TASK_API_UNAVAILABLE';
      throw error;
    }
    const response = await fetcher(request.path + '?' + new URLSearchParams(request.params).toString(), {
      method: 'GET', credentials: 'include', cache: 'no-store', headers: { Accept: 'application/json' },
    });
    if (!response || response.ok !== true || typeof response.json !== 'function') {
      const error = new Error('TASK_REQUEST_FAILED');
      error.code = 'TASK_REQUEST_FAILED';
      throw error;
    }
    try { return await response.json(); } catch {
      const error = new Error('TASK_RESPONSE_INVALID');
      error.code = 'TASK_RESPONSE_INVALID';
      throw error;
    }
  }
  return async function load(kind, options) {
    const request = contract.request(kind, options);
    if (request.transport === 'app-query') {
      const payload = await (requestJson || fetchPage)(request);
      return contract.normalize(payload, { ...options, kind: request.kind, transport: request.transport });
    }
    const bridge = await resolveBridge();
    if (!bridge || typeof bridge[request.method] !== 'function'
      || (Array.isArray(bridge.availableMethods) && !bridge.availableMethods.includes(request.method))) {
      const error = new Error('TASK_API_UNAVAILABLE');
      error.code = 'TASK_API_UNAVAILABLE';
      throw error;
    }
    const payload = await bridge[request.method](request.params);
    return contract.normalize(payload, { ...options, kind: request.kind });
  };
}

module.exports = { createTaskCenterLoader };
