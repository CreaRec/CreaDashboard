#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const backendEnvPath = path.join(root, 'backend', '.env');
const envExamplePath = path.join(root, '.env.example');

function log(message) {
  console.log(`\n[setup] ${message}`);
}

function run(command) {
  log(command);
  execSync(command, { cwd: root, stdio: 'inherit' });
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

function setupDatabase() {
  ensureBackendEnv();
  run('npm run db:generate -w backend');
  run('npm run db:migrate:deploy -w backend');
  run('npm run db:seed -w backend');
}

setupDatabase();
log('Database is ready');
