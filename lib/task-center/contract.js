'use strict';

// Kept portable so the CLI and generated pages use the same task contract.
function createTaskCenterContract() {
  const definitions = {
    todo: { method: 'getTodoTasksInApp', endpoint: 'task/getTodoTasksInApp', filters: ['keyword'] },
    created: { method: 'getMySubmitInApp', endpoint: 'process/getMySubmitInApp', filters: ['keyword'] },
    done: { method: 'getDoneTasksInApp', endpoint: 'task/getDoneTasksInApp', filters: ['keyword'] },
    cc: { method: 'getNotifyMeTasksInApp', endpoint: 'task/getNotifyMeTasksInApp', filters: ['keyword', 'processCodes', 'instanceStatus'] },
  };
  function fail(code, field) {
    const error = new Error(code + (field ? ': ' + field : ''));
    error.code = code;
    error.field = field || '';
    throw error;
  }
  function kindOf(kind) {
    const value = kind === 'submitted' ? 'created' : kind;
    if (!Object.prototype.hasOwnProperty.call(definitions, value)) { fail('TASK_KIND_INVALID', kind); }
    return value;
  }
  function appOf(appType) {
    if (typeof appType !== 'string' || !/^APP_[A-Za-z0-9_-]+$/.test(appType)) { fail('TASK_APP_INVALID', 'appType'); }
    return appType;
  }
  function positive(value, fallback, max) {
    if (value === undefined) { return fallback; }
    if (!/^\d+$/.test(String(value)) || !Number.isSafeInteger(Number(value)) || Number(value) < 1 || Number(value) > max) {
      fail('TASK_PAGINATION_INVALID');
    }
    return Number(value);
  }
  function request(kind, options = {}) {
    const canonical = kindOf(kind);
    const def = definitions[canonical];
    const params = {
      appType: appOf(options.appType),
      currentPage: positive(options.page, 1, Number.MAX_SAFE_INTEGER),
      pageSize: positive(options.pageSize, 20, 100),
    };
    for (const filter of ['keyword', 'processCodes', 'instanceStatus']) {
      const value = options[filter];
      if (value === undefined || value === null || value === '') { continue; }
      if (!def.filters.includes(filter)) { fail('TASK_FILTER_UNSUPPORTED', filter); }
      if (filter === 'processCodes') {
        let codes = value;
        if (typeof codes === 'string') {
          try { codes = JSON.parse(codes); } catch { fail('TASK_FILTER_INVALID', filter); }
        }
        if (!Array.isArray(codes) || codes.some(code => typeof code !== 'string' || !code.trim())) { fail('TASK_FILTER_INVALID', filter); }
        params[filter] = JSON.stringify(codes);
      } else {
        if (typeof value !== 'string') { fail('TASK_FILTER_INVALID', filter); }
        params[filter] = value;
      }
    }
    return { kind: canonical, method: def.method, endpoint: def.endpoint, params };
  }
  function text(value) {
    let parsed = value;
    if (typeof value === 'string' && /^\s*\{/.test(value)) {
      try { parsed = JSON.parse(value); } catch { return value; }
    }
    if (typeof parsed === 'string' || typeof parsed === 'number') { return String(parsed); }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) { return ''; }
    return String(parsed.zh_CN || parsed.zh || parsed.en_US || parsed.en || parsed.text || '');
  }
  function id(value) { return typeof value === 'string' && value.trim() ? value : null; }
  function normalizeItem(row, kind, appType, index) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) { fail('TASK_RESPONSE_INVALID', 'item'); }
    if (row.appType && row.appType !== appType) { fail('TASK_SCOPE_MISMATCH', 'appType'); }
    const taskId = id(row.taskId);
    const processInstanceId = id(row.processInstanceId || row.procInstId);
    const formInstId = id(row.formInstId || row.formInstanceId);
    const formUuid = id(row.formUuid);
    const activityId = id(row.carbonActivityId || row.activityId);
    let detailTarget = null;
    if (kind === 'created' && row.dataType === 'finst') {
      if (formUuid && formInstId) { detailTarget = { type: 'detail', appType, formUuid, formInstId }; }
    } else if (kind === 'cc') {
      if ((processInstanceId || formInstId) && activityId) {
        detailTarget = { type: 'carbon-detail', appType, processInstanceId: processInstanceId || formInstId, activityId };
      }
    } else if (processInstanceId) {
      detailTarget = { type: 'process-detail', appType, processInstanceId, ...(taskId ? { taskId } : {}) };
    }
    const recordId = kind === 'cc' ? id(row.id) || (Number.isSafeInteger(row.id) ? String(row.id) : null) : null;
    const originator = row.creatorInfo || {};
    const identity = kind === 'created' ? processInstanceId || formInstId
      : kind === 'cc' ? recordId || (activityId && (processInstanceId || formInstId) ? [processInstanceId || formInstId, activityId] : null)
        : taskId;
    return {
      key: JSON.stringify([appType, kind, identity || ['unidentified', index]]),
      kind, appType, taskId, processInstanceId, formInstanceId: formInstId, formUuid,
      title: text(row.title || row.titleEn),
      originator: text(row.originatorName || row.originatorDisplayName || originator.displayName),
      instanceStatus: text(row.processInstanceStatusText || row.processInstanceStatus),
      result: text(row.outResultName || row.outResult || row.processApprovedResultText),
      submittedAt: row.packageGmtCreate || (kind === 'created' ? row.createTime : null),
      arrivedAt: kind === 'todo' ? row.activeTime || row.createTime : null,
      finishedAt: row.finishTime || null,
      notifiedAt: kind === 'cc' ? row.gmtCreate || row.createTime : null,
      agentType: text(row.agentType),
      sourceActionerName: text(row.sourceActionerName),
      toActionerName: text(row.toActionerName),
      detailTarget,
    };
  }
  function checkFailure(payload) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) { fail('TASK_RESPONSE_INVALID'); }
    if (payload.__needLogin) { fail('NEED_LOGIN'); }
    const code = payload.errorCode;
    if (payload.success === false || (code !== undefined && code !== null && code !== '' && String(code) !== '0')) {
      fail('TASK_REQUEST_FAILED', text(payload.errorMsg || payload.errorMessage || code));
    }
  }
  function normalize(payload, context) {
    const kind = kindOf(context.kind);
    const appType = appOf(context.appType);
    checkFailure(payload);
    const page = Object.prototype.hasOwnProperty.call(payload, 'content') ? payload.content : payload;
    // The app-v1 task API uses successful null content for an empty result.
    if (page === null && payload.success === true) {
      return { items: [], total: 0, page: context.page || 1, pageSize: context.pageSize || 20 };
    }
    checkFailure(page);
    const rows = (page.data === undefined || page.data === null) && page.totalCount === 0 ? [] : page.data;
    if (!Array.isArray(rows)) { fail('TASK_RESPONSE_INVALID', 'data'); }
    let total = null;
    if (page.totalCount !== undefined && page.totalCount !== null) {
      if (!/^\d+$/.test(String(page.totalCount)) || !Number.isSafeInteger(Number(page.totalCount))) { fail('TASK_RESPONSE_INVALID', 'totalCount'); }
      total = Number(page.totalCount);
    }
    return {
      items: rows.map((row, index) => normalizeItem(row, kind, appType, index)),
      total,
      page: positive(page.currentPage, context.page || 1, Number.MAX_SAFE_INTEGER),
      pageSize: context.pageSize || 20,
    };
  }
  function capabilities() {
    return {
      scope: 'app', kinds: Object.keys(definitions), aliases: { submitted: 'created' },
      filters: Object.fromEntries(Object.entries(definitions).map(([kind, def]) => [kind, def.filters.slice()])),
      defaultPageSize: 20, maxPageSize: 100, inlineApproval: false,
      identity: 'current-visitor', detail: 'native-page', theme: 'existing-application',
    };
  }
  return { kindOf, appOf, request, normalize, capabilities };
}

module.exports = { createTaskCenterContract, ...createTaskCenterContract() };
