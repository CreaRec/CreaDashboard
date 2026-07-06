const fs = require('fs');
const path = require('path');
const vscode = require('vscode');

const SERVER_TASKS = ['dev:backend', 'dev:frontend'];
const MARKER_FILE = 'start-servers';

function getMarkerPath() {
  const folder = vscode.workspace.workspaceFolders?.[0];
  if (!folder) {
    return null;
  }

  return path.join(folder.uri.fsPath, '.dev', MARKER_FILE);
}

async function startServers() {
  const tasks = await vscode.tasks.fetchTasks();

  for (const taskName of SERVER_TASKS) {
    const task = tasks.find((entry) => entry.name === taskName);
    if (task) {
      await vscode.tasks.executeTask(task);
    }
  }
}

function clearMarker(markerPath) {
  try {
    fs.unlinkSync(markerPath);
  } catch {
    // Marker may already be gone.
  }
}

function activate(context) {
  const markerPath = getMarkerPath();
  if (!markerPath) {
    return;
  }

  const markerDir = path.dirname(markerPath);

  const handleMarker = async () => {
    if (!fs.existsSync(markerPath)) {
      return;
    }

    clearMarker(markerPath);
    await startServers();
  };

  const command = vscode.commands.registerCommand(
    'crea-dev-launcher.startServers',
    startServers
  );

  const watcher = vscode.workspace.createFileSystemWatcher(
    new vscode.RelativePattern(markerDir, MARKER_FILE)
  );

  watcher.onDidCreate(handleMarker);
  watcher.onDidChange(handleMarker);

  context.subscriptions.push(command, watcher);

  void handleMarker();
}

module.exports = {
  activate,
};
