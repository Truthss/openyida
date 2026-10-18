'use strict';

function createTaskCenterLoader(contract, resolveBridge) {
  return async function load(kind, options) {
    const request = contract.request(kind, options);
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
