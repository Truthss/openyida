'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { catalog } = require('../lib/design-plan/init');
const { getVisualDecisionPolicy } = require('../lib/design-plan/visual-policy');

const html = fs.readFileSync(path.join(__dirname, '../yida-skills/skills/yida-design/templates/theme-selector.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];

// Small DOM double for bridge/error behavior; native layout/keyboard need browser checks.
function element(tag) {
  return {
    tag, childNodes: [], handlers: {}, attributes: {}, hidden: false,
    appendChild(child) { child.parent = this; this.childNodes.push(child); },
    setAttribute(name, value) { this.attributes[name] = value; },
    addEventListener(name, handler) { this.handlers[name] = handler; },
    remove() { this.parent.childNodes = this.parent.childNodes.filter(child => child !== this); },
  };
}
function mount(themes, bridge = { sendToAgent: jest.fn() }) {
  const ids = Object.fromEntries(['themes', 'choices', 'confirm', 'status', 'reference-note'].map(id => [id, element('div')]));
  const window = { __WIDGET_DATA__: { themes }, __bridge: bridge };
  vm.runInNewContext(script, { window, document: { getElementById: id => ids[id], createElement: element } });
  const descendants = node => [node, ...node.childNodes.flatMap(descendants)];
  return { ...ids, window, bridge, nodes: tag => descendants(ids.themes).filter(node => node.tag === tag) };
}
const candidates = [
  { id: 'soft-inset-surfaces', name: '柔和内嵌', desc: '适合持续阅读', img: 'https://example.test/preview.png', tags: ['推荐'] },
  { id: 'free-creative', name: '自由创意', desc: '重新推演' },
];

test('requires explicit confirmation and sends a natural-language string for the chosen theme', async () => {
  const ui = mount(candidates);
  expect(ui.confirm.disabled).toBe(true);
  await ui.confirm.handlers.click();
  expect(ui.bridge.sendToAgent).not.toHaveBeenCalled();
  const radio = ui.nodes('input')[1];
  radio.checked = true;
  radio.handlers.change();
  await ui.confirm.handlers.click();
  expect(ui.bridge.sendToAgent).toHaveBeenCalledWith('已选择「自由创意」风格（themeId: free-creative），请继续下一步');
  await ui.confirm.handlers.click();
  expect(ui.bridge.sendToAgent).toHaveBeenCalledTimes(1);
  expect(ui.choices.disabled).toBe(true);
});

test('preselection enables confirm but never sends automatically; locks while awaiting bridge', async () => {
  let finish;
  const bridge = { sendToAgent: jest.fn(() => new Promise(resolve => { finish = resolve; })) };
  const ui = mount([{ ...candidates[0], selected: true }], bridge);
  expect(ui.confirm.disabled).toBe(false);
  expect(bridge.sendToAgent).not.toHaveBeenCalled();
  const sending = ui.confirm.handlers.click();
  expect(ui.confirm.disabled).toBe(true);
  await ui.confirm.handlers.click();
  expect(bridge.sendToAgent).toHaveBeenCalledTimes(1);
  finish();
  await sending;
});

test('missing bridge and rejection retain selection and allow retry', async () => {
  const ui = mount([{ ...candidates[0], selected: true }], undefined);
  ui.window.__bridge = null;
  await ui.confirm.handlers.click();
  expect(ui.status.textContent).toContain('暂时无法回传');
  expect(ui.confirm.disabled).toBe(false);
  ui.window.__bridge = { sendToAgent: jest.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(undefined) };
  await ui.confirm.handlers.click();
  expect(ui.status.textContent).toContain('失败');
  expect(ui.choices.disabled).toBe(false);
  await ui.confirm.handlers.click();
  expect(ui.window.__bridge.sendToAgent).toHaveBeenCalledTimes(2);
  expect(ui.status.textContent).toContain('已提交');
});

test('missing or broken images leave text choices without an empty image frame', () => {
  const ui = mount(candidates);
  expect(ui.nodes('img')).toHaveLength(1);
  const image = ui.nodes('img')[0];
  expect(image.hidden).toBe(true);
  image.handlers.load();
  expect(image.hidden).toBe(false);
  expect(ui['reference-note'].hidden).toBe(false);
  image.handlers.error();
  expect(ui.nodes('img')).toHaveLength(0);
  expect(ui['reference-note'].hidden).toBe(true);
  expect(ui.nodes('input')).toHaveLength(2);
});

test('renders supplied text literally, rejects invalid/duplicate IDs and unsafe image schemes', () => {
  const name = '<img src=x onerror=alert(1)>';
  const ui = mount([{ id: 'safe', name, img: 'javascript:alert(1)' }, { id: 'safe', name: '重复' }, { id: 'bad）', name: '错误' }, null]);
  expect(ui.nodes('input')).toHaveLength(1);
  expect(ui.nodes('img')).toHaveLength(0);
  expect(ui.nodes('span').some(node => node.textContent === '1 · ' + name)).toBe(true);
  expect(ui.nodes('input')[0].attributes['aria-labelledby']).toBe('theme-title-0');
});

test.each([undefined, null, {}, []])('empty or malformed data cannot confirm: %p', async themes => {
  const ui = mount(themes);
  expect(ui.confirm.disabled).toBe(true);
  await ui.confirm.handlers.click();
  expect(ui.bridge.sendToAgent).not.toHaveBeenCalled();
});

test('current CLI catalog supplies optional images to template without requiring every theme to have one', () => {
  const result = catalog();
  const themes = [...result.themes, result.creativeOption].map(theme => ({
    id: theme.themeId, name: theme.label, desc: theme.styleSummary, img: theme.previewImage?.url,
  }));
  const ui = mount(themes);
  expect(ui.nodes('input')).toHaveLength(themes.length);
  expect(ui.nodes('img')).toHaveLength(result.themes.filter(theme => theme.previewImage).length);
  expect(ui.nodes('input').some(radio => radio.value === 'free-creative')).toBe(true);
  const policy = getVisualDecisionPolicy().themeSelection;
  expect(policy.qwenwork).toMatchObject({ activeToolId: 'qwenwork', tool: 'qoder_show_widget', response: 'natural_language_with_themeId' });
  expect(policy.otherHosts).toBe('ask_human');
  expect(fs.existsSync(path.join(__dirname, '..', policy.qwenwork.template))).toBe(true);
});
