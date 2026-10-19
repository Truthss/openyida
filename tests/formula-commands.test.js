'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
jest.mock('../lib/core/yida-client', () => ({ createAuthRef: jest.fn(() => ({})), createYidaClient: jest.fn() }));
jest.mock('../lib/integration/integration-api', () => ({ getFormSchema: jest.fn() }));
const { createYidaClient } = require('../lib/core/yida-client');
const { getFormSchema } = require('../lib/integration/integration-api');
const { builtin } = require('../lib/formula/metadata');
const { run } = require('../lib/formula/commands');
const metadata = { success: true, content: { expressionMapping: Object.fromEntries(Object.entries(builtin.functions).map(([name, fn]) => [name, {
  inputs: { requiredParams: fn.required.map(baseType => ({ baseType })), notRequiredParams: fn.optional.map(baseType => ({ baseType })), notRequiredCount: fn.variadic ? 'N' : fn.optional.length, needSameType: fn.sameType }, outputs: { baseType: fn.result }, desc: fn.description,
}])), componentMapping: Object.fromEntries(Object.entries(builtin.components).map(([name, type]) => [name, { type }])) } };

describe('formula platform commands', () => {
  let directory, dataFile, get, postFormOnce, log;
  beforeEach(() => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'openyida-formula-'));
    dataFile = path.join(directory, 'data.json');
    fs.writeFileSync(dataFile, JSON.stringify({ numberField_amount: 12.345 }));
    get = jest.fn().mockResolvedValue(metadata);
    postFormOnce = jest.fn().mockResolvedValue({ success: true, content: '12.35' });
    createYidaClient.mockReturnValue({ get, postFormOnce });
    getFormSchema.mockResolvedValue([{ componentName: 'NumberField', props: { fieldId: 'numberField_amount', formula: 'ROUND(1,2)', valueType: 'formula', complexValue: { complexType: 'formula', formula: 'ROUND(1,2)' } } }]);
    log = jest.spyOn(console, 'log').mockImplementation(() => {});
  });
  afterEach(() => { log.mockRestore(); fs.rmSync(directory, { recursive: true, force: true }); });

  test('queries current signatures and exports a new snapshot without overwriting files', async () => {
    const output = path.join(directory, 'metadata.json');
    const result = await run('functions', ['APP_TEST', '--name', 'ROUND', '--output', output, '--json']);
    expect(result.functions[0]).toMatchObject({ name: 'ROUND', required: [['number'], ['number']], contextAvailable: true });
    expect(JSON.parse(fs.readFileSync(output, 'utf8'))).toEqual(metadata);
    await expect(run('functions', ['APP_TEST', '--output', output])).rejects.toThrow();
    expect(postFormOnce).not.toHaveBeenCalled();
  });
  test('inspects configured formulas without execution', async () => {
    expect(await run('inspect', ['APP_TEST', 'FORM_TEST', '--field', 'numberField_amount'])).toMatchObject({ runtimeVerified: false, fields: [{ fieldId: 'numberField_amount', formula: 'ROUND(1,2)' }] });
    expect(postFormOnce).not.toHaveBeenCalled();
  });
  test('sends field data once and preserves the platform result type', async () => {
    const result = await run('test', ['APP_TEST', 'FORM_TEST', 'ROUND(#{numberField_amount},2)', '--data-file', dataFile, '--expect', '"12.35"']);
    expect(result).toMatchObject({ success: true, value: '12.35', valueType: 'string', saved: false, verification: 'expression-endpoint', binding: 'platform', runtimeVerified: false });
    expect(postFormOnce).toHaveBeenCalledTimes(1);
    expect(postFormOnce).toHaveBeenCalledWith(expect.stringContaining('/query/expression/evaluate.json'), { expression: 'ROUND(#{numberField_amount},2)', varMap: '{"numberField_amount":12.345}', formUuid: 'FORM_TEST' });
  });
  test.each([0, false, '', null])('preserves primitive platform result %j', async value => {
    postFormOnce.mockResolvedValue({ success: true, content: value });
    expect(await run('test', ['APP_TEST', 'FORM_TEST', '1', '--data-file', dataFile, '--expect', JSON.stringify(value)])).toMatchObject({ success: true, value });
  });
  test('fails strict expected type comparison', async () => {
    await expect(run('test', ['APP_TEST', 'FORM_TEST', 'ROUND(1,2)', '--data-file', dataFile, '--expect', '12.35'])).rejects.toThrow();
    expect(postFormOnce).toHaveBeenCalledTimes(1);
  });
  test.each(['INSERT("x")', 'IF(TRUE(),1,UPDATE("x"))', 'NEWFUNCTION()', 'ROUND(1,2,3,4)', 'ROUND(#{numberField_missing},2)'])('blocks unsafe or invalid test before evaluation: %s', async formula => {
    await expect(run('test', ['APP_TEST', 'FORM_TEST', formula, '--data-file', dataFile])).rejects.toThrow();
    expect(postFormOnce).not.toHaveBeenCalled();
  });
  test('requires referenced data and parses the expectation before any evaluation', async () => {
    fs.writeFileSync(dataFile, '{}');
    await expect(run('test', ['APP_TEST', 'FORM_TEST', 'ROUND(#{numberField_amount},2)', '--data-file', dataFile])).rejects.toThrow(/numberField_amount/);
    await expect(run('test', ['APP_TEST', 'FORM_TEST', '1', '--data-file', dataFile, '--expect', 'invalid'])).rejects.toThrow();
    expect(postFormOnce).not.toHaveBeenCalled();
  });
  test('blocks unknown function even when platform metadata lists it', async () => {
    get.mockResolvedValue({ success: true, content: { ...metadata.content, expressionMapping: { ...metadata.content.expressionMapping, NEWFUNCTION: {} } } });
    await expect(run('test', ['APP_TEST', 'FORM_TEST', 'NEWFUNCTION()', '--data-file', dataFile])).rejects.toThrow();
    expect(postFormOnce).not.toHaveBeenCalled();
  });
  test('handles platform errors and rejects irrelevant flags', async () => {
    postFormOnce.mockResolvedValue({ success: false, errorMsg: 'backend rejected' });
    await expect(run('test', ['APP_TEST', 'FORM_TEST', '1', '--data-file', dataFile])).rejects.toThrow(/backend rejected/);
    await expect(run('inspect', ['APP_TEST', 'FORM_TEST', '--expect', '1'])).rejects.toThrow();
  });
  test('tests a saved formula with native field binding and explicit timezone', async () => {
    postFormOnce.mockResolvedValue({ success: true, content: { calculateComplete: true,
      data: [{ fieldId: 'numberField_amount', fieldData: { value: '12.35' } }] } });
    expect(await run('test', ['APP_TEST', 'FORM_TEST', '--field', 'numberField_amount', '--data-file', dataFile,
      '--timezone-offset', '0', '--expect', '12.35'])).toMatchObject({ success: true, value: 12.35, timezoneOffset: 0 });
    expect(postFormOnce.mock.calls[0][1]._locale_time_zone_offset).toBe(0);
  });
  test('runs repeatable field cases and retains failures by name', async () => {
    fs.writeFileSync(dataFile, JSON.stringify([
      { name: 'positive', data: {}, expect: 12.35 }, { name: 'zero', data: {}, expect: 0 },
    ]));
    postFormOnce.mockResolvedValueOnce({ success: true, content: { calculateComplete: true,
      data: [{ fieldId: 'numberField_amount', fieldData: { value: '12.35' } }] } })
      .mockResolvedValueOnce({ success: false, errorMsg: 'calculation failed' });
    await expect(run('test', ['APP_TEST', 'FORM_TEST', '--field', 'numberField_amount', '--cases', dataFile])).rejects.toThrow();
    const result = JSON.parse(log.mock.calls[0][0]);
    expect(result.summary).toEqual({ total: 2, passed: 1, failed: 1 });
    expect(result.results[1]).toMatchObject({ name: 'zero', success: false });
  });
  test('validates every case before executing any formula', async () => {
    fs.writeFileSync(dataFile, JSON.stringify([{ name: 'valid', data: {}, expect: 1 }, { name: 'bad', data: { typo: 1 }, expect: 1 }]));
    await expect(run('test', ['APP_TEST', 'FORM_TEST', '--field', 'numberField_amount', '--cases', dataFile])).rejects.toThrow();
    expect(postFormOnce).not.toHaveBeenCalled();
    fs.writeFileSync(dataFile, JSON.stringify([{ name: 'without-expect', data: {} }]));
    await expect(run('test', ['APP_TEST', 'FORM_TEST', '--field', 'numberField_amount', '--cases', dataFile])).rejects.toThrow();
  });
});
