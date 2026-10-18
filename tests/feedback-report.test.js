'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { buildReport, parseReportArgs, renderMarkdown, writeReport } = require('../lib/feedback/report');
const { parseArgs } = require('../lib/feedback/feedback');

const summary = { title: 'Repeated publish error', actual: 'No recovery advice', command: 'publish' };

describe('offline feedback reports', () => {
  let directory;
  beforeEach(() => {directory = fs.mkdtempSync(path.join(os.tmpdir(), 'openyida-report-'));});
  afterEach(() => {fs.rmSync(directory, { recursive: true, force: true });});

  test('accepts only explicit summary data and distinguishes hypotheses from observations', () => {
    const report = buildReport({
      ...summary,
      auth: { accessToken: 'do-not-copy' }, fullConversation: 'do-not-copy',
      cause: { category: 'cli', status: 'hypothesis', summary: 'Possibly incomplete error handling' },
    });
    expect(JSON.stringify(report)).not.toContain('do-not-copy');
    expect(report.cause.status).toBe('hypothesis');
    expect(report.occurrenceCount).toBeNull();
    expect(report.submissionPerformed).toBe(false);
    expect(report.environment).toEqual({
      openyida: require('../package.json').version,
      node: process.version, platform: process.platform, arch: process.arch,
    });
    expect(buildReport(summary).cause).toMatchObject({ category: 'unknown', status: 'unknown' });
    expect(buildReport(summary).fingerprint).toBe(buildReport(summary).fingerprint);
    expect(buildReport({ ...summary, actual: 'A different failure' }).fingerprint).not.toBe(report.fingerprint);
  });

  test('removes common secrets, resource identifiers, private URLs and source paths', () => {
    const report = buildReport({
      ...summary,
      evidence: [
        'Authorization: Bearer topSecretBearer',
        'Cookie: sid=secretCookie',
        '"refreshToken": "secretRefresh", password=secretPassword',
        'openyida login --token secretOption',
        'ghp_secretGithubToken github_pat_secretGithubPat',
        'https://private.example/repo/closed-source /Users/customer/internal-repo/source.js',
        'C:\\Users\\customer\\secret-repo\\source.js',
        'APP_PRIVATE123 FORM-PRIVATE123 person@customer.example 13812345678 110101199001011234',
        '-----BEGIN PRIVATE KEY-----\nsecretPrivateKey\n-----END PRIVATE KEY-----',
      ],
    });
    const output = JSON.stringify(report) + renderMarkdown(report);
    ['topSecretBearer', 'secretCookie', 'secretRefresh', 'secretPassword', 'secretOption',
      'secretGithubToken', 'secretGithubPat', 'private.example', 'internal-repo', 'secret-repo',
      'customer.example', 'PRIVATE123', '13812345678', '110101199001011234', 'secretPrivateKey']
      .forEach(secret => {expect(output).not.toContain(secret);});
  });

  test('escapes executable or externally loaded Markdown in copied diagnostic snippets', () => {
    const text = renderMarkdown(buildReport({ ...summary, evidence: ['![tracking](data:image/png;base64,abc)', '<img src="secret">', '`$(do-not-run)`'] }));
    expect(text).toContain('\\!\\[tracking\\]\\(data:image');
    expect(text).toContain('\\<img');
    expect(text).not.toContain('![tracking](');
  });

  test.each([
    null, [], {}, { ...summary, steps: ['ok', { cookie: 'unsafe' }] },
    { ...summary, cause: { status: 'confirmed' } }, { ...summary, occurrenceCount: -1 },
    { ...summary, actual: 'x'.repeat(12001) },
  ])('rejects malformed or unsupported report input %#', input => {
    expect(() => buildReport(input)).toThrow();
  });

  test('requires explicit files and rejects unexpected CLI arguments', () => {
    expect(parseArgs(['report', '--input', 'a.json', '--output-dir', 'fresh'])).toEqual({
      command: 'report', options: { input: 'a.json', outputDir: 'fresh' },
    });
    [[], ['--input', 'a'], ['--input', 'a', '--output-dir', 'b', '--submit'],
      ['--input', 'a', '--input', 'b', '--output-dir', 'c']]
      .forEach(args => {expect(() => parseReportArgs(args)).toThrow();});
  });

  test('writes local review drafts and never overwrites a previous report', () => {
    const input = path.join(directory, 'input.json');
    const outputDir = path.join(directory, 'draft');
    fs.writeFileSync(input, JSON.stringify(summary));
    const result = writeReport({ input, outputDir });
    expect(result).toMatchObject({ submissionPerformed: false, reviewRequired: true });
    expect(fs.readdirSync(outputDir).sort()).toEqual(['issue.md', 'report.json']);
    const before = fs.readFileSync(result.bodyFile, 'utf8');
    expect(before).toContain('not submitted');
    expect(() => writeReport({ input, outputDir })).toThrow();
    expect(fs.readFileSync(result.bodyFile, 'utf8')).toBe(before);
    if (process.platform !== 'win32') {
      expect(fs.statSync(result.reportFile).mode & 0o777).toBe(0o600);
    }
  });

  test('malformed JSON is not echoed and oversize inputs do not create drafts', () => {
    const input = path.join(directory, 'input.json');
    const outputDir = path.join(directory, 'draft');
    fs.writeFileSync(input, '{"password":"secret-invalid-json');
    expect(() => writeReport({ input, outputDir })).toThrow(expect.objectContaining({ code: 'FEEDBACK_REPORT_INVALID' }));
    expect(fs.existsSync(outputDir)).toBe(false);
    fs.writeFileSync(input, 'x'.repeat(1024 * 1024 + 1));
    expect(() => writeReport({ input, outputDir })).toThrow('1 MiB');
  });

  test('copies only explicit screenshots with generic filenames and keeps them local', () => {
    const privateSourceName = 'private-customer-screen.png';
    const screenshot = path.join(directory, privateSourceName);
    const image = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jYaQAAAAASUVORK5CYII=', 'base64');
    fs.writeFileSync(screenshot, image);
    fs.writeFileSync(path.join(directory, 'unselected.png'), image);
    const input = path.join(directory, 'input.json');
    fs.writeFileSync(input, JSON.stringify({ ...summary, screenshots: [{ path: privateSourceName, description: 'Selected error screen' }] }));
    const result = writeReport({ input, outputDir: path.join(directory, 'draft') });
    const report = JSON.parse(fs.readFileSync(result.reportFile));
    expect(report.screenshots).toEqual([{ file: 'screenshot-01.png', description: 'Selected error screen', reviewRequired: true }]);
    expect(fs.readFileSync(result.screenshotFiles[0])).toEqual(image);
    expect(fs.readdirSync(path.dirname(result.bodyFile)).sort()).toEqual(['issue.md', 'report.json', 'screenshot-01.png']);
    expect(fs.readFileSync(result.reportFile, 'utf8')).not.toContain(privateSourceName);
    expect(fs.readFileSync(result.bodyFile, 'utf8')).not.toContain(directory);
    expect(result.submissionPerformed).toBe(false);
    expect(result.reviewDigest).toMatch(/^[a-f0-9]{64}$/);
    fs.writeFileSync(screenshot, Buffer.concat([image, Buffer.from('changed-metadata')]));
    const changed = writeReport({ input, outputDir: path.join(directory, 'changed-draft') });
    expect(changed.fingerprint).toBe(result.fingerprint);
    expect(changed.reviewDigest).not.toBe(result.reviewDigest);
  });

  test('rejects unsupported screenshot content before creating any output', () => {
    const input = path.join(directory, 'input.json');
    fs.writeFileSync(path.join(directory, 'fake.png'), '<script>not an image</script>');
    fs.writeFileSync(input, JSON.stringify({ ...summary, screenshots: [{ path: 'fake.png' }] }));
    const outputDir = path.join(directory, 'draft');
    expect(() => writeReport({ input, outputDir })).toThrow(expect.objectContaining({ code: 'FEEDBACK_REPORT_INVALID' }));
    expect(fs.existsSync(outputDir)).toBe(false);
  });

  test('records actual before/after test evidence and never invents a passing result', () => {
    const report = buildReport({ ...summary, comparison: {
      before: { status: 'failed', revision: 'baseline', command: 'npm test -- case', actual: 'Assertion failed', evidence: ['Observed exit 1'] },
      after: { status: 'passed', revision: 'fix', command: 'npm test -- case', actual: 'Assertion passed', evidence: ['Observed exit 0'] },
      limitations: ['Browser not verified'],
    } });
    expect(report.comparison.regression.status).toBe('not_run');
    const body = renderMarkdown(report);
    expect(body).toContain('Test comparison: before');
    expect(body).toContain('Assertion failed');
    expect(body).toContain('Assertion passed');
    expect(body).toContain('Browser not verified');
    expect(renderMarkdown(buildReport(summary))).not.toContain('Test comparison:');
    expect(() => buildReport({ ...summary, comparison: { after: { status: 'passed' } } })).toThrow();
  });

  test('runs from a source-free directory with no login or network access', () => {
    const input = path.join(directory, 'input.json');
    const outputDir = path.join(directory, 'draft');
    fs.writeFileSync(input, JSON.stringify(summary));
    const guardFile = path.join(directory, 'no-network.cjs');
    fs.writeFileSync(guardFile, `
      for (const name of ['http', 'https', 'net', 'tls']) {
        const mod = require(name);
        for (const method of ['request', 'get', 'connect', 'createConnection']) {
          if (mod[method]) mod[method] = () => { throw new Error('Network forbidden'); };
        }
      }
      global.fetch = () => { throw new Error('Network forbidden'); };
    `);
    const result = spawnSync(process.execPath, [path.resolve(__dirname, '../bin/yida.js'),
      'feedback', 'report', '--input', input, '--output-dir', outputDir], {
      cwd: directory, encoding: 'utf8',
      env: { ...process.env, HOME: directory, USERPROFILE: directory, CODEX_HOME: directory,
        NODE_OPTIONS: `--require=${guardFile}` },
    });
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({ success: true, submissionPerformed: false });
  });
});
