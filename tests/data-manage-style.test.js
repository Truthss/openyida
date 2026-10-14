'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { parseArgs, buildStylesheet, generate } = require('../lib/style/data-manage-style');
const { presets } = require('../lib/style/native-data-manage');
const { flattenCommandManifest } = require('../lib/core/command-manifest');
const { resolveManagedPolicy } = require('../lib/core/managed-policy');
const base = ':root { --color-brand1-6:#5168D9; }\n/* existing theme */\n.keep { color: red; }\n';
const config = { app: 'APP_TEST', form: 'FORM-TEST', style: 'horizontal', fieldIds: ['textField_actual'], focus: 'balanced' };

test.each(presets)('generates scoped $id without changing virtual row geometry', preset => {
  const css = buildStylesheet(base, { ...config, style: preset.id });
  expect(css.startsWith(base)).toBe(true);
  expect(css).toContain('[data-formuuid="FORM-TEST"]');
  expect(css).toContain('[data-field-id="textField_actual"]');
  const added = css.slice(base.length);
  // Every selector starts with the form manager or an explicit selected-nav guard.
  for (const rule of added.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selector = rule[1].replace(/\/\*[\s\S]*?\*\//g, '').trim();
    expect(selector.startsWith(':is(body:has(')).toBe(true);
  }
  expect(added).not.toMatch(/(?:^|[;\n])\s*(?:height|top|transform|position)\s*:/);
  expect(added).not.toContain('body {');
  expect(added).not.toContain('--pod-nav-l-container-bg');
});

test('regeneration is idempotent and preserves other forms and byte suffixes', () => {
  const first = buildStylesheet(base, config);
  expect(buildStylesheet(first, config)).toBe(first);
  const second = buildStylesheet(first, { ...config, form: 'FORM-OTHER', style: 'rose' });
  const changed = buildStylesheet(second, { ...config, style: 'dark-header' });
  const other = '/* openyida-data-manage:APP_TEST:FORM-OTHER:start */';
  expect(changed.slice(changed.indexOf(other))).toBe(second.slice(second.indexOf(other)));
  expect(changed.match(/APP_TEST:FORM-TEST:start/g)).toHaveLength(1);
});

test('dark header owns inner label tokens and checkbox contrast; rose has no nested capsule', () => {
  const dark = buildStylesheet(base, { ...config, style: 'dark-header' });
  expect(dark).toContain('--color-text1-4:#EAF0FC');
  expect(dark).toContain('--color-text1-10:#EAF0FC');
  expect(dark).toContain('input[type="checkbox"]:not(:checked) + span');
  expect(dark).toContain('--lab-native-tab-border:none');
  const rose = buildStylesheet(base, { ...config, style: 'rose' });
  expect(rose).toContain('--lab-native-left-border:none');
  expect(rose).toContain('--lab-native-left-shadow:none');
  expect(rose).toContain('--lab-native-control-radius:10px');
});

test('actions and shell options are explicit and retain dangerous-action semantics', () => {
  const css = buildStylesheet(base, { ...config, focus: 'actions', followShell: true });
  expect(css).toContain('text-underline-offset:3px');
  expect(css).toContain('.next-btn-primary:not(.next-btn-text):not([disabled])');
  expect(css).toContain('--pod-nav-l-container-bg');
  expect(css).not.toMatch(/\.notable-yida-action-column-btns\s*\{[^}]*background:/);
  expect(css).not.toContain('display:none');
});

test('nav-free fallback is omitted when no real field evidence is supplied', () => {
  const css = buildStylesheet(base, { ...config, fieldIds: [] });
  expect(css).not.toContain(':is()');
  expect(css).not.toContain('.vc-yida-form-manage:has(');
  expect(css).toContain('body:has(.next-selected[data-formuuid="FORM-TEST"])');
});

test.each([
  { form: 'FORM-X"]{}body{' }, { app: 'https://elsewhere' }, { style: 'olive-register' },
  { fieldIds: ['x"]body{}'] }, { fieldIds: ['textField_x', 'textField_x'] }, { focus: 'delete' },
])('rejects unsafe or unsupported options %j', patch => {
  expect(() => buildStylesheet(base, { ...config, ...patch })).toThrow();
});

test('malformed markers and absent base theme fail before writing', () => {
  expect(() => buildStylesheet(base + '/* openyida-data-manage:APP_TEST:FORM-TEST:start */', config)).toThrow();
  expect(() => buildStylesheet('', config)).toThrow();
  expect(() => parseArgs(['list', '--follow-shell'])).toThrow();
  expect(() => parseArgs(['generate', '--unknown'])).toThrow();
});

test('CLI generates a new file offline, never overwrites base/output, returns truthful evidence', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'data-style-'));
  try {
    const input = path.join(dir, 'base.css'), output = path.join(dir, 'new.css');
    fs.writeFileSync(input, base);
    const args = ['generate', '--app', config.app, '--form', config.form, '--style', config.style, '--base-css', input, '--output', output, '--json'];
    const parsed = parseArgs(args);
    const result = generate(parsed);
    expect(result).toMatchObject({ published: false, runtimeVerified: false, navFreeSupported: false });
    expect(fs.readFileSync(input, 'utf8')).toBe(base);
    expect(() => generate(parsed)).toThrow();
    expect(() => generate({ ...parsed, output: input })).toThrow();
    const run = spawnSync(process.execPath, [path.join(__dirname, '../bin/yida.js'), 'data-manage-style', 'list', '--json'], { encoding: 'utf8', env: { ...process.env, OPENYIDA_AUTO_UPDATE: '0' } });
    expect(run.status).toBe(0);
    expect(JSON.parse(run.stdout).styles).toHaveLength(24);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('manifest, managed scope and independent skill agree on both command IDs', () => {
  const commands = flattenCommandManifest().filter(c => c.id.startsWith('data-manage-style.'));
  expect(commands).toHaveLength(2);
  expect(commands.every(c => c.requiresLogin === false)).toBe(true);
  for (const command of commands) {
    expect(command.managedRun.scope).toBe('local');
    expect(command.sideEffect.mutates_yida).toBe(false);
  }
  expect(resolveManagedPolicy('data-manage-style', ['unknown'])).toBeNull();
  const index = require('../yida-skills/skills-index.json').skills.find(s => s.name === 'yida-data-manage-ui');
  expect(index.command_ids).toEqual(expect.arrayContaining(commands.map(c => c.id)));
  expect(index.positive_signals).toContain('针对当前数据管理页换一种风格');
  const skill = fs.readFileSync(path.join(__dirname, '..', 'yida-skills', index.path), 'utf8');
  expect(skill).toContain('--focus actions');
});
