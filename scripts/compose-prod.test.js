#!/usr/bin/env node

const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const COMPOSE_FILE = 'docker-compose.prod.yml';

const FIXTURE_ENV = `
IMAGE=ghcr.io/crearec/crea-dashboard
WEB_IMAGE=ghcr.io/crearec/crea-dashboard-web
IMAGE_TAG=ci-test
LAN_BIND_IP=192.168.1.135
DASHBOARD_HTTP_PORT=3080
TEMPORAL_UI_HTTP_PORT=8080
TEMPORAL_CORS_ORIGIN=http://192.168.1.135:8080
POSTGRES_USER=crea
POSTGRES_PASSWORD=crea
POSTGRES_DB=crea_dashboard
DATABASE_URL=postgresql://crea:crea@127.0.0.1:5435/crea_dashboard
TEMPORAL_ADDRESS=127.0.0.1:7233
NODE_ENV=production
LOG_LEVEL=info
PORT=3001
`.trimStart();

function dockerComposeAvailable() {
  const docker = spawnSync('docker', ['compose', 'version'], { encoding: 'utf8' });
  return docker.status === 0;
}

test('docker-compose.prod.yml passes docker compose config', { skip: !dockerComposeAvailable() }, () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'crea-dashboard-compose-'));
  try {
    fs.copyFileSync(path.join(ROOT, COMPOSE_FILE), path.join(tmp, COMPOSE_FILE));
    fs.writeFileSync(path.join(tmp, '.env'), FIXTURE_ENV);

    const rendered = execFileSync(
      'docker',
      ['compose', '-f', COMPOSE_FILE, 'config'],
      { cwd: tmp, encoding: 'utf8' }
    );

    assert.match(rendered, /crea-dashboard-api/);
    assert.match(rendered, /crea-dashboard-worker/);
    assert.match(rendered, /crea-dashboard-web/);
    assert.match(rendered, /crea-dashboard-migrate/);
    assert.match(rendered, /postgres:5432/);
    assert.match(rendered, /temporal:7233/);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
