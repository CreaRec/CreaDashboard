#!/usr/bin/env node

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  DEV_LAUNCHER_EXTENSION_ID,
  getServerMarkerPath,
  isEditorIntegratedTerminal,
  resolveEditorCliCandidates,
} = require('./dev-servers-lib');

test('detects Cursor or VS Code integrated terminal', () => {
  assert.equal(isEditorIntegratedTerminal({ TERM_PROGRAM: 'vscode' }), true);
  assert.equal(
    isEditorIntegratedTerminal({ VSCODE_IPC_HOOK: '/tmp/vscode-ipc.sock' }),
    true
  );
  assert.equal(
    isEditorIntegratedTerminal({ VSCODE_GIT_IPC_HANDLE: '/tmp/vscode-git.sock' }),
    true
  );
  assert.equal(isEditorIntegratedTerminal({ TERM_PROGRAM: 'Apple_Terminal' }), false);
});

test('builds editor CLI candidate list without empty entries', () => {
  assert.deepEqual(
    resolveEditorCliCandidates({ CURSOR_CLI_PATH: '/custom/cursor' }),
    [
      '/custom/cursor',
      'cursor',
      '/Applications/Cursor.app/Contents/Resources/app/bin/cursor',
      'code',
      '/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code',
    ]
  );
});

test('uses a marker file under .dev for Cursor task launch', () => {
  const root = path.join(os.tmpdir(), 'crea-dashboard-test');
  assert.equal(
    getServerMarkerPath(root),
    path.join(root, '.dev', 'start-servers')
  );
});

test('uses the local dev launcher extension id', () => {
  assert.equal(DEV_LAUNCHER_EXTENSION_ID, 'local.crea-dev-launcher');
});
