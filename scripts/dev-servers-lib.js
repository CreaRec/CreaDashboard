const path = require('path');

const DEV_LAUNCHER_EXTENSION_ID = 'local.crea-dev-launcher';
const SERVER_MARKER_FILE = 'start-servers';

function isEditorIntegratedTerminal(env = process.env) {
  return (
    env.TERM_PROGRAM === 'vscode' ||
    Boolean(env.VSCODE_IPC_HOOK) ||
    Boolean(env.VSCODE_GIT_IPC_HANDLE)
  );
}

function resolveEditorCliCandidates(env = process.env) {
  return [
    env.CURSOR_CLI_PATH,
    'cursor',
    '/Applications/Cursor.app/Contents/Resources/app/bin/cursor',
    'code',
    '/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code',
  ].filter(Boolean);
}

function getServerMarkerPath(rootDir) {
  return path.join(rootDir, '.dev', SERVER_MARKER_FILE);
}

module.exports = {
  DEV_LAUNCHER_EXTENSION_ID,
  SERVER_MARKER_FILE,
  isEditorIntegratedTerminal,
  resolveEditorCliCandidates,
  getServerMarkerPath,
};
