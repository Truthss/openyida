'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { mkdirPrivate, mkdirPrivateDirectories } = require('../lib/agent/private-directory');
const { prepareConnection } = require('../lib/agent/connection-store');
const { createDiagnosticLog } = require('../lib/agent/diagnostic-log');

const windowsTest = process.platform === 'win32' ? test : test.skip;
windowsTest('new Windows launcher state, credentials and logs have private inherited ACLs', () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'openyida-private-'));
  try {
    const root = path.join(fixture, '中文 space', 'local-agent');
    // Exceed Windows' per-variable size limit; batch input must travel on stdin.
    const nested = Array.from({ length: 300 }, (_, i) => path.join(root, "batch user's 中文", 'directory-' + i + '-'.repeat(40), 'child'));
    expect(JSON.stringify(nested).length).toBeGreaterThan(32767);
    mkdirPrivateDirectories(nested);
    const log = createDiagnosticLog(path.join(root, 'logs'));
    log('info', 'fixture_created');
    const connection = prepareConnection(root, 'fixture.' + 'x'.repeat(40));
    expect(fs.readdirSync(path.join(root, 'logs')).length).toBe(1);
    const script = `
$ErrorActionPreference='Stop'
$current=[System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value
$allowed=@($current,'S-1-5-18','S-1-5-32-544')
$items=@(Get-Item -LiteralPath $env:OPENYIDA_TEST_ROOT)+@(Get-ChildItem -LiteralPath $env:OPENYIDA_TEST_ROOT -Recurse -Force)
foreach($item in $items){
  $acl=$item.GetAccessControl()
  if($item.PSIsContainer -and $acl.GetOwner([System.Security.Principal.SecurityIdentifier]).Value -ne $current){throw 'Unexpected directory owner'}
  foreach($rule in $acl.Access){
    $sid=$rule.IdentityReference.Translate([System.Security.Principal.SecurityIdentifier]).Value
    if($sid -notin $allowed){throw 'Unexpected ACL identity'}
  }
}
'private'
`;
    const output = execFileSync(path.join(process.env.SystemRoot, 'System32/WindowsPowerShell/v1.0/powershell.exe'), ['-NoProfile', '-NonInteractive', '-Command', script], {
      encoding: 'utf8', windowsHide: true, env: { ...process.env, OPENYIDA_TEST_ROOT: root },
    });
    expect(output.trim()).toBe('private');
    expect(fs.existsSync(path.join(connection.stateDir, 'device.json'))).toBe(true);
    mkdirPrivate(root);
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
}, 60000);
