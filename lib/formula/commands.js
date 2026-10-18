'use strict';

const fs = require('fs');
const path = require('path');
const { isDeepStrictEqual } = require('util');
const { createAuthRef, createYidaClient } = require('../core/yida-client');
const { getFormSchema } = require('../integration/integration-api');
const { fetchMetadata, builtin, context, fail } = require('./metadata');
const { collectFields, bindNumericValues } = require('./syntax');
const { analyzeFormula, readFormulaInput } = require('./evaluate');
const { CONTRACTS } = require('./contracts');
const { t } = require('../core/i18n');

function parse(args) {
  const positions = [], flags = {};
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (!arg.startsWith('--')) { positions.push(arg); continue; }
    const key = arg.slice(2);
    if (Object.hasOwn(flags, key)) { fail('duplicate ' + arg); }
    if (['json', 'help'].includes(key)) { flags[key] = true; }
    else if (['name', 'context', 'output', 'field', 'data-file', 'expect', 'binding'].includes(key)
      && args[index + 1] && !args[index + 1].startsWith('--')) { flags[key] = args[++index]; }
    else { fail(arg); }
  }
  return { positions, flags };
}
async function run(action, args) {
  const { positions, flags } = parse(args);
  if (action === 'contracts') {
    if (positions.length || Object.keys(flags).some(key => !['json', 'help'].includes(key))) { fail('arguments'); }
    const output = { success: true, contracts: CONTRACTS, runtimeVerified: false };
    console.log(flags.json ? JSON.stringify(output, null, 2) : t('formula_v2.contracts_help'));
    return output;
  }
  if (!positions.length || flags.help) { console.log(t('formula_v2.usage')); return; }
  const [appType, formUuid, input] = positions;
  if (!['functions', 'inspect', 'test'].includes(action) || positions.length !== { functions: 1, inspect: 2, test: 3 }[action]) {
    fail('arguments');
  }
  const allowed = { functions: ['json', 'context', 'name', 'output'], inspect: ['json', 'field'],
    test: ['json', 'context', 'data-file', 'expect', 'binding'] }[action];
  for (const key of Object.keys(flags)) { if (!allowed.includes(key)) { fail('--' + key); } }
  const selectedContext = context(flags.context);
  let output;
  if (action === 'functions') {
    const { raw, catalog } = await fetchMetadata(appType);
    const names = Object.keys(catalog.functions).filter(name => !flags.name || name === flags.name);
    if (flags.name && !names.length) { fail('function: ' + flags.name); }
    const functions = names.map(name => ({ name, ...catalog.functions[name],
      contextAvailable: catalog.functions[name].contexts.length ? catalog.functions[name].contexts.includes(selectedContext) : null }));
    if (flags.output) {
      const file = path.resolve(flags.output);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      // A metadata export is a new snapshot; never overwrite an arbitrary file.
      fs.writeFileSync(file, JSON.stringify(raw, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
    }
    output = { success: true, context: selectedContext, source: catalog.source, functions,
      consumerAvailabilityVerified: false,
      supportQueryFuncs: catalog.supportQueryFuncs, outputPath: flags.output && path.resolve(flags.output) };
  } else {
    const authRef = createAuthRef();
    const fields = await getFormSchema(authRef, { appType, formUuid });
    const byId = new Map(fields.map(field => [field.props.fieldId, field]));
    if (flags.field && !byId.has(flags.field)) { fail('field: ' + flags.field); }
    if (action === 'inspect') {
      output = { success: true, appType, formUuid, fields: [...byId.values()]
        .filter(field => !flags.field || field.props.fieldId === flags.field)
        .map(field => ({ fieldId: field.props.fieldId, componentType: field.componentName,
          label: field.props.label, valueType: field.props.valueType,
          formula: field.props.complexValue?.formula || field.props.formula || '',
          complexValue: field.props.complexValue, validation: field.props.validation })), runtimeVerified: false };
    } else {
      if (!flags['data-file'] || !['form', 'validation'].includes(selectedContext)) { fail('test requires --data-file and context form/validation'); }
      const values = JSON.parse(fs.readFileSync(flags['data-file'], 'utf8'));
      const binding = flags.binding || 'platform';
      if (!['platform', 'numeric-literals'].includes(binding)) { fail('--binding platform|numeric-literals'); }
      const expected = flags.expect === undefined ? undefined : JSON.parse(flags.expect);
      if (!values || typeof values !== 'object' || Array.isArray(values)) { fail('data object'); }
      const formula = readFormulaInput(input);
      const { catalog } = await fetchMetadata(appType);
      const result = analyzeFormula(formula, { context: selectedContext, fields: collectFields(fields), metadata: catalog });
      // The platform evaluator can execute business functions. Only a known
      // non-writing set is accepted here; changing a metadata file cannot widen it.
      const unsafe = result.functions.filter(name => !['pure', 'context-read'].includes(builtin.functions[name]?.effect));
      // These depend on preCompile and form/instance state. A raw endpoint
      // probe does not implement that consumer pipeline.
      const requiresConsumer = result.functions.filter(name => ['EXIST', 'EQUAL'].includes(name));
      if (!result.ok) { fail(result.diagnostics.filter(item => item.level === 'error').map(item => item.message).join('; ')); }
      if (unsafe.length) { fail(t('formula_v2.test_blocked', unsafe.join(', '))); }
      if (requiresConsumer.length) { fail(t('formula_v2.consumer_required', requiresConsumer.join(', '))); }
      for (const id of result.fieldRefs) { if (!Object.hasOwn(values, id)) { fail('missing data: ' + id); } }
      const expression = binding === 'numeric-literals' ? bindNumericValues(formula, values) : formula;
      const response = await createYidaClient({ authRef }).postFormOnce(
        `/alibaba/web/${encodeURIComponent(appType)}/query/expression/evaluate.json`,
        { expression, varMap: JSON.stringify(values), formUuid }
      );
      if (response?.success !== true) { fail(response?.errorMsg || 'platform evaluation failed'); }
      const value = response.content;
      output = { success: expected === undefined || isDeepStrictEqual(value, expected), value,
        valueType: Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value, expected,
        verification: 'expression-endpoint', binding, expression, saved: false, context: selectedContext,
        runtimeVerified: false, checks: { endpoint: 'passed', consumerPreprocessing: 'not_run', targetConversion: 'not_run', runtime: 'not_run' } };
      console.log(JSON.stringify(output, null, 2));
      if (!output.success) { fail(t('formula_v2.expect_failed')); }
      return output;
    }
  }
  if (flags.json || action === 'inspect') { console.log(JSON.stringify(output, null, 2)); }
  else { console.log(output.functions.map(fn => fn.name + ' — ' + fn.description).join('\n')); }
  return output;
}
module.exports = { run, parse };
