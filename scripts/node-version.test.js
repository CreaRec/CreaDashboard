#!/usr/bin/env node

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

function read(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

test('Dockerfiles use Node 24 bookworm-slim images', () => {
  for (const file of ['Dockerfile.backend', 'Dockerfile.web']) {
    const contents = read(file);
    assert.match(contents, /FROM node:24-bookworm-slim AS build/);
    assert.doesNotMatch(contents, /FROM node:22-/);
  }

  assert.match(read('Dockerfile.backend'), /FROM node:24-bookworm-slim AS runtime/);
});

test('CI installs Node 24 and uses Node 24-compatible actions', () => {
  const workflow = read('.github/workflows/ci-cd.yml');
  assert.match(workflow, /node-version:\s*"24"/);
  assert.match(workflow, /uses:\s*actions\/checkout@v6/);
  assert.match(workflow, /uses:\s*actions\/setup-node@v6/);
  assert.match(workflow, /uses:\s*docker\/setup-buildx-action@v4/);
  assert.match(workflow, /uses:\s*docker\/login-action@v4/);
  assert.match(workflow, /uses:\s*docker\/build-push-action@v7/);
  assert.match(workflow, /tailscale\/github-action/);
  assert.match(workflow, /tag:ci/);
  assert.doesNotMatch(workflow, /node-version:\s*"22"/);
});

test('package engines require Node 24+', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.equal(pkg.engines?.node, '>=24');
});
