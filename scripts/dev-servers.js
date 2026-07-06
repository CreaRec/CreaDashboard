#!/usr/bin/env node

const { execFileSync, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const {
  getServerMarkerPath,
  isEditorIntegratedTerminal,
} = require('./dev-servers-lib');

const root = path.resolve(__dirname, '..');

function log(message) {
  console.log(`\n[dev] ${message}`);
}

function requestServersInCursor() {
  const markerPath = getServerMarkerPath(root);
  fs.mkdirSync(path.dirname(markerPath), { recursive: true });
  fs.writeFileSync(markerPath, String(Date.now()), 'utf8');
}

function triggerBuildTaskShortcut() {
  if (process.platform !== 'darwin') {
    return false;
  }

  try {
    execFileSync('osascript', [
      '-e',
      'tell application "Cursor" to activate',
      '-e',
      'delay 0.4',
      '-e',
      'tell application "System Events" to keystroke "b" using {command down, shift down}',
    ]);
    return true;
  } catch {
    return false;
  }
}

function startWithConcurrently() {
  execFileSync(
    'npx',
    [
      'concurrently',
      '-n',
      'backend,frontend',
      '-c',
      'blue,green',
      'npm run dev -w backend',
      'npm run dev -w frontend',
    ],
    {
      cwd: root,
      stdio: 'inherit',
    }
  );
}

function wait(ms) {
  execSync(`sleep ${ms / 1000}`);
}

function printCursorInstructions({ extensionResponded, shortcutTriggered }) {
  log('Backend и frontend запускаются в отдельных терминалах Cursor.');
  log('Смотрите панель Terminal внизу → справа в списке вкладок:');
  log('  • dev:backend');
  log('  • dev:frontend');

  if (!extensionResponded && !shortcutTriggered) {
    log('Терминалы не запустились автоматически.');
    log('1. Cmd+Shift+P → Developer: Reload Window');
    log('2. Снова выполните npm run dev');
    log('Или вручную: Cmd+Shift+B / Tasks: Run Task → dev:servers');
  } else if (!extensionResponded) {
    log('Если вкладки не появились, нажмите Cmd+Shift+B.');
  }

  log('Остановить серверы: Ctrl+C в каждой вкладке или иконка корзины.\n');
}

function main() {
  if (isEditorIntegratedTerminal(process.env)) {
    requestServersInCursor();
    const shortcutTriggered = triggerBuildTaskShortcut();
    wait(1500);

    const markerPath = getServerMarkerPath(root);
    const extensionResponded = !fs.existsSync(markerPath);

    printCursorInstructions({ extensionResponded, shortcutTriggered });
    return;
  }

  log('Запуск вне Cursor — backend и frontend в одном терминале.');
  startWithConcurrently();
}

main();
