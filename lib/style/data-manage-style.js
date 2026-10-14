'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { t } = require('../core/i18n');
const { throwCommandError, throwUsage } = require('../core/command-errors');
const { renderNativeStyle, presets } = require('./native-data-manage');

const fail = (code, details) => throwCommandError(t('data_manage_style.' + code.toLowerCase()), { code, details });
const usage = () => t('data_manage_style.usage');
const digest = value => crypto.createHash('sha256').update(value).digest('hex');

function parseArgs(args = []) {
  if (args.length === 0 || ['--help', '-h'].includes(args[0])) { return { help: true }; }
  const p = { action: args[0], fieldIds: [], emphasizeFields: [], tagFields: [], focus: 'balanced', followShell: false };
  if (!['list', 'generate'].includes(p.action)) { throwUsage(usage()); }
  const values = { '--app': 'app', '--form': 'form', '--style': 'style', '--base-css': 'baseCss', '--output': 'output', '--focus': 'focus', '--field-id': 'fieldIds', '--emphasize-field': 'emphasizeFields', '--tag-field': 'tagFields' };
  const seen = new Set();
  for (let i = 1; i < args.length; i++) {
    const a = args[i];
    if (['--help', '-h'].includes(a)) { p.help = true; continue; }
    if (seen.has(a) && !['--field-id', '--emphasize-field', '--tag-field'].includes(a)) { throwUsage(usage()); }
    seen.add(a);
    if (a === '--json') { p.json = true; continue; }
    if (p.action === 'list') { throwUsage(usage()); }
    if (a === '--follow-shell') { p.followShell = true; continue; }
    if (!values[a] || !args[i + 1] || args[i + 1].startsWith('--')) { throwUsage(usage()); }
    const value = args[++i];
    if (Array.isArray(p[values[a]])) { p[values[a]].push(value); } else { p[values[a]] = value; }
  }
  if (p.help || p.action === 'list') { return p; }
  if (!/^APP_[A-Za-z0-9]+$/.test(p.app || '') || !/^FORM-[A-Za-z0-9]+$/.test(p.form || '') ||
      !presets.some(item => item.id === p.style) || !['balanced', 'actions'].includes(p.focus) ||
      !p.baseCss || !p.output || p.fieldIds.length > 100 ||
      p.fieldIds.some(id => !/^[A-Za-z][A-Za-z0-9]*_[A-Za-z0-9_-]+$/.test(id)) || new Set(p.fieldIds).size !== p.fieldIds.length) {
    fail('DATA_STYLE_INVALID');
  }
  for (const ids of [p.emphasizeFields, p.tagFields]) {
    if (ids.length > 100 || new Set(ids).size !== ids.length ||
        ids.some(id => !/^[A-Za-z][A-Za-z0-9]*_[A-Za-z0-9_-]+$/.test(id))) { fail('DATA_STYLE_INVALID'); }
  }
  if (p.tagFields.some(id => !/^selectField_/.test(id) || p.emphasizeFields.includes(id))) { fail('DATA_STYLE_INVALID'); }
  // Column targets are also real field evidence for navigation-free views.
  p.fieldIds = [...new Set([...p.fieldIds, ...p.emphasizeFields, ...p.tagFields])];
  return p;
}

function buildStylesheet(base, options) {
  // Validate the pure API as strictly as the CLI before interpolating selectors.
  const argv = ['generate', '--app', options.app, '--form', options.form, '--style', options.style,
    '--base-css', 'base.css', '--output', 'out.css', '--focus', options.focus || 'balanced'];
  for (const id of options.fieldIds || []) { argv.push('--field-id', id); }
  for (const id of options.emphasizeFields || []) { argv.push('--emphasize-field', id); }
  for (const id of options.tagFields || []) { argv.push('--tag-field', id); }
  if (options.followShell) { argv.push('--follow-shell'); }
  const p = parseArgs(argv);
  if (typeof base !== 'string' || !base.trim() || Buffer.byteLength(base) > 20 * 1024 * 1024 || !/--color-brand1-6\s*:/.test(base)) { fail('DATA_STYLE_BASE'); }
  const key = `${p.app}:${p.form}`;
  const begin = `/* openyida-data-manage:${key}:start */`;
  const end = `/* openyida-data-manage:${key}:end */`;
  const start = base.indexOf(begin), finish = base.indexOf(end);
  if ((start === -1) !== (finish === -1) || (start !== -1 && (finish < start || base.indexOf(begin, start + begin.length) !== -1 || base.indexOf(end, finish + end.length) !== -1))) { fail('DATA_STYLE_MARKER'); }
  const block = begin + '\n' + renderNativeStyle(p) + '\n' + end;
  // Replace only this form's owned block, preserving all unrelated bytes.
  return start === -1 ? base + '\n' + block + '\n' : base.slice(0, start) + block + base.slice(finish + end.length);
}

function generate(p) {
  const input = path.resolve(p.baseCss), output = path.resolve(p.output);
  if (input === output || !/\.css$/i.test(output) || fs.existsSync(output)) { fail('DATA_STYLE_OUTPUT'); }
  if (!fs.statSync(input).isFile() || fs.statSync(input).size > 20 * 1024 * 1024) { fail('DATA_STYLE_BASE'); }
  p = parseArgs(['generate', '--app', p.app, '--form', p.form, '--style', p.style, '--base-css', p.baseCss, '--output', p.output, '--focus', p.focus || 'balanced',
    ...(p.fieldIds || []).flatMap(id => ['--field-id', id]), ...(p.emphasizeFields || []).flatMap(id => ['--emphasize-field', id]),
    ...(p.tagFields || []).flatMap(id => ['--tag-field', id]), ...(p.followShell ? ['--follow-shell'] : [])]);
  const base = fs.readFileSync(input, 'utf8');
  const css = buildStylesheet(base, p);
  if (Buffer.byteLength(css) > 20 * 1024 * 1024) { fail('DATA_STYLE_BASE'); }
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, css, { flag: 'wx' });
  return { success: true, appType: p.app, formUuid: p.form, style: p.style, focus: p.focus,
    followShell: p.followShell, emphasizeFields: p.emphasizeFields, tagFields: p.tagFields, output, baseSha256: digest(base), sha256: digest(css),
    navFreeSupported: p.fieldIds.length > 0, runtimeVerified: false, published: false,
    next: ['app-theme.snapshot', 'update-app', 'app-theme.snapshot', 'app-theme.restore --check'],
    verification: 'Review the scoped diff, publish only with authorization, then verify the actual native DOM and business controls.' };
}

async function run(args) {
  const p = parseArgs(args);
  if (p.help) { console.log(usage()); return; }
  const result = p.action === 'list' ? { success: true, styles: presets, focus: ['balanced', 'actions'],
    columnEmphasis: { flags: ['--emphasize-field', '--tag-field'], accentLine: false, tagFieldType: 'SelectField', conditionalFormatting: false },
    customLayouts: ['cards', 'split-pane', 'kanban', 'timeline', 'emerald-overview', 'olive-register'] } : generate(p);
  if (p.json) { console.log(JSON.stringify(result, null, 2)); }
  else if (p.action === 'list') { console.log(presets.map(item => `${item.id}\t${item.name}\t${item.description}`).join('\n')); }
  else { console.log(t('data_manage_style.generated', result.output)); }
  return result;
}
module.exports = { run, parseArgs, buildStylesheet, generate };
