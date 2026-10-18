'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const Babel = require('@babel/standalone');
const { buildSource, validateSpec } = require('../lib/task-center/scaffold');

// A small hook host exercises the shipped component's requests and view state.
function mount(source, bridge) {
  const slots = [];
  let cursor = 0;
  let dirty = false;
  let effects = [];
  let tree;
  const cleanups = [];
  const React = {
    createContext: () => ({}),
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) { slots[index] = typeof initial === 'function' ? initial() : initial; }
      return [slots[index], value => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; dirty = true; }];
    },
    useRef(value) {
      const index = cursor++;
      if (!(index in slots)) { slots[index] = { current: value }; }
      return slots[index];
    },
    useEffect(effect, deps) {
      const index = cursor++;
      const old = slots[index];
      if (!old || deps.some((value, i) => value !== old[i])) {
        slots[index] = deps;
        effects.push(() => { cleanups[index]?.(); cleanups[index] = effect(); });
      }
    },
  };
  const antd = { Input: { Search: 'Search' }, Typography: { Title: 'Title', Text: 'Text' }, Empty: 'Empty' };
  for (const name of ['ConfigProvider', 'Drawer', 'Alert', 'Button', 'Pagination', 'Space', 'Spin', 'Table', 'Tabs']) { antd[name] = name; }
  const window = { __OPENYIDA_YIDA_API__: bridge, document: { hidden: false, addEventListener: jest.fn(), removeEventListener: jest.fn() }, addEventListener: jest.fn(), removeEventListener: jest.fn(), setTimeout };
  const compiled = Babel.transform(source + '\nexport { TaskInboxSection };', { presets: ['react'], plugins: ['transform-modules-commonjs'] }).code;
  const module = { exports: {} };
  const requireModule = name => name === 'react' ? React : name === 'antd' ? antd : {};
  new Function('require', 'module', 'exports', 'window', compiled)(requireModule, module, module.exports, window);
  const render = () => {
    cursor = 0; dirty = false; effects = [];
    tree = module.exports.TaskInboxSection({});
    effects.forEach(effect => effect());
  };
  const nodes = type => {
    const result = [];
    function walk(value) {
      if (Array.isArray(value)) { value.forEach(walk); return; }
      if (!value || typeof value !== 'object') { return; }
      if (value.type === type) { result.push(value); }
      walk(value.props?.children);
    }
    walk(tree);
    return result;
  };
  render();
  return {
    nodes,
    async flush() {
      for (let i = 0; i < 8; i++) {
        await new Promise(resolve => setImmediate(resolve));
        if (dirty) { render(); }
      }
    },
    unmount() { cleanups.forEach(cleanup => cleanup?.()); },
    window,
  };
}

let directory;
let source;
beforeAll(() => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'task-runtime-'));
  const designFile = path.join(directory, 'design.md');
  fs.writeFileSync(designFile, 'Use existing application theme.');
  source = buildSource(validateSpec({ appType: 'APP_TEST', designFile, customPage: { source: 'explicit-user-request', confirmed: true } }));
});
afterAll(() => fs.rmSync(directory, { recursive: true, force: true }));
const payload = (title, extra = {}) => ({ data: [{ taskId: title, title, processInstanceId: 'p', ...extra }], totalCount: 40, currentPage: 1 });

test('late responses cannot replace the selected tab, and each tab keeps its search', async () => {
  let resolveOld;
  const old = new Promise(resolve => { resolveOld = resolve; });
  const bridge = {
    ready: true,
    getTodoTasksInApp: jest.fn().mockReturnValueOnce(old).mockResolvedValue(payload('new todo')),
    getNotifyMeTasksInApp: jest.fn().mockResolvedValue(payload('carbon', { carbonActivityId: 'node' })),
  };
  const app = mount(source, bridge);
  await app.flush();
  app.nodes('Tabs')[0].props.onChange('cc');
  await app.flush();
  expect(app.nodes('Table')[0].props.dataSource[0].title).toBe('carbon');
  resolveOld(payload('old todo'));
  await app.flush();
  expect(app.nodes('Table')[0].props.dataSource[0].title).toBe('carbon');
  app.nodes('Search')[0].props.onSearch('invoice');
  await app.flush();
  expect(bridge.getNotifyMeTasksInApp).toHaveBeenLastCalledWith(expect.objectContaining({ keyword: 'invoice', currentPage: 1 }));
  app.nodes('Tabs')[0].props.onChange('todo');
  await app.flush();
  expect(app.nodes('Table')[0].props.dataSource[0].title).toBe('new todo');
  app.nodes('Tabs')[0].props.onChange('cc');
  await app.flush();
  expect(app.nodes('Search')[0].props.value).toBe('invoice');
  app.unmount();
  expect(app.window.document.removeEventListener).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
});

test('failed refresh retains the last successful result and exposes an error', async () => {
  const bridge = { ready: true, getTodoTasksInApp: jest.fn().mockResolvedValueOnce(payload('saved')).mockRejectedValue(new Error('network')) };
  const app = mount(source, bridge);
  await app.flush();
  app.nodes('Pagination')[0].props.onChange(2);
  await app.flush();
  expect(bridge.getTodoTasksInApp).toHaveBeenLastCalledWith(expect.objectContaining({ currentPage: 2 }));
  expect(app.nodes('Table')[0].props.dataSource[0].title).toBe('saved');
  expect(app.nodes('Alert')[0].props.message).toBeTruthy();
  expect(app.nodes('Alert')[0].props.description).toBeTruthy();
  app.unmount();
});
