#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const backendDir = path.join(root, 'backend');
const backendEnvPath = path.join(backendDir, '.env');
const envExamplePath = path.join(root, '.env.example');

const DOCKER_BINARIES = [
  'docker',
  '/usr/local/bin/docker',
  '/opt/homebrew/bin/docker',
  '/Applications/Docker.app/Contents/Resources/bin/docker',
];

function log(message) {
  console.log(`\n[setup] ${message}`);
}

function run(command, options = {}) {
  log(command);
  execSync(command, {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
    ...options,
  });
}

function canRun(command, options = {}) {
  try {
    execSync(command, {
      cwd: root,
      stdio: 'ignore',
      env: process.env,
      ...options,
    });
    return true;
  } catch {
    return false;
  }
}

function ensureBackendEnv() {
  if (fs.existsSync(backendEnvPath)) {
    return;
  }

  if (!fs.existsSync(envExamplePath)) {
    throw new Error('Missing backend/.env and .env.example');
  }

  fs.copyFileSync(envExamplePath, backendEnvPath);
  log('Created backend/.env from .env.example');
}

function loadDatabaseUrl() {
  ensureBackendEnv();
  const envContent = fs.readFileSync(backendEnvPath, 'utf8');
  const match = envContent.match(/^DATABASE_URL=(.+)$/m);

  if (!match) {
    throw new Error('DATABASE_URL is missing in backend/.env');
  }

  return match[1].replace(/^["']|["']$/g, '');
}

function resolveDockerBinary() {
  for (const binary of DOCKER_BINARIES) {
    if (canRun(`${binary} info`)) {
      return binary;
    }
  }

  return null;
}

function waitForPostgres(dockerBinary, maxAttempts = 30) {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    if (
      canRun(
        `${dockerBinary} compose exec -T postgres pg_isready -U crea -d crea_dashboard`
      )
    ) {
      log('PostgreSQL is ready');
      return;
    }

    log(`Waiting for PostgreSQL... (${attempt}/${maxAttempts})`);
    execSync('sleep 1', { stdio: 'ignore' });
  }

  throw new Error('PostgreSQL did not become ready in time');
}

function canUseProjectDatabase() {
  try {
    execSync('npx prisma db execute --stdin --schema prisma/schema.prisma', {
      cwd: backendDir,
      input: 'SELECT 1;',
      stdio: ['pipe', 'ignore', 'ignore'],
      env: {
        ...process.env,
        DATABASE_URL: loadDatabaseUrl(),
      },
    });
    return true;
  } catch {
    return false;
  }
}

function startPostgres(dockerBinary) {
  try {
    run(`${dockerBinary} compose up -d postgres --wait`);
  } catch {
    run(`${dockerBinary} compose up -d postgres`);
    waitForPostgres(dockerBinary);
  }
}

function failWithInstructions(reason) {
  console.error(`\n[setup] ${reason}`);
  console.error(
    '\n[setup] Troubleshooting:\n' +
      '  1. Start Docker Desktop\n' +
      '  2. Run: npm run db:up\n' +
      '  3. Run: npm run setup\n' +
      '\n' +
      'If port 5432 is used by another PostgreSQL, this project uses port 5434.\n' +
      'Check backend/.env: DATABASE_URL should point to localhost:5434\n'
  );
  process.exit(1);
}

function main() {
  log('Starting development environment setup');

  ensureBackendEnv();

  const dockerBinary = resolveDockerBinary();

  if (dockerBinary) {
    startPostgres(dockerBinary);
  } else if (canUseProjectDatabase()) {
    log('Docker unavailable, using existing PostgreSQL from DATABASE_URL');
  } else {
    failWithInstructions(
      'Docker is not running and the project database is not reachable.'
    );
  }

  if (!canUseProjectDatabase()) {
    failWithInstructions(
      'PostgreSQL is running, but credentials/database from backend/.env do not work.'
    );
  }

  run('node scripts/setup-db.js');
  log('Development environment is ready');
}

main();
