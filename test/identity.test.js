import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  isValidGithubHandle,
  resolveIdentity,
  getStoredIdentity,
  setStoredIdentity,
  clearStoredIdentity,
} from '../src/identity.js';

test('isValidGithubHandle - validates legitimate GitHub handles', () => {
  assert.equal(isValidGithubHandle('alice'), true);
  assert.equal(isValidGithubHandle('Bob-123'), true);
  assert.equal(isValidGithubHandle('a'), true);
  assert.equal(isValidGithubHandle('x-y-z'), true);
  assert.equal(isValidGithubHandle('user-name'), true);
  assert.equal(isValidGithubHandle('a'.repeat(39)), true);
});

test('isValidGithubHandle - rejects invalid handles', () => {
  // Spaces
  assert.equal(isValidGithubHandle('Alice Smith'), false);
  assert.equal(isValidGithubHandle(' alice'), false);
  assert.equal(isValidGithubHandle('alice '), false);
  // Special characters & symbols
  assert.equal(isValidGithubHandle('@alice'), false);
  assert.equal(isValidGithubHandle('alice!'), false);
  assert.equal(isValidGithubHandle('alice.smith'), false);
  // Hyphen positions
  assert.equal(isValidGithubHandle('-leading'), false);
  assert.equal(isValidGithubHandle('trailing-'), false);
  assert.equal(isValidGithubHandle('double--hyphen'), false);
  // Empty / types / lengths
  assert.equal(isValidGithubHandle(''), false);
  assert.equal(isValidGithubHandle(null), false);
  assert.equal(isValidGithubHandle(undefined), false);
  assert.equal(isValidGithubHandle(123), false);
  assert.equal(isValidGithubHandle('a'.repeat(40)), false);
});

test('setStoredIdentity / getStoredIdentity / clearStoredIdentity', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ofa-ident-test-'));
  try {
    // Initially empty
    assert.equal(getStoredIdentity(tempDir), null);

    // Rejects invalid handle
    const failRes = setStoredIdentity(tempDir, 'Invalid Name');
    assert.equal(failRes.success, false);
    assert.equal(getStoredIdentity(tempDir), null);

    // Saves valid handle (stripping @ if passed)
    const okRes = setStoredIdentity(tempDir, '@charlie');
    assert.equal(okRes.success, true);
    assert.equal(getStoredIdentity(tempDir), 'charlie');

    // Clears stored identity
    assert.equal(clearStoredIdentity(tempDir), true);
    assert.equal(getStoredIdentity(tempDir), null);
    assert.equal(clearStoredIdentity(tempDir), false);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('resolveIdentity - Priority 1: --user flag overrides everything', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ofa-ident-p1-'));
  const originalPr = process.env.OFA_PR_AUTHOR;
  try {
    process.env.OFA_PR_AUTHOR = 'ci-author';
    setStoredIdentity(tempDir, 'stored-user');

    const result = await resolveIdentity({ user: 'flag-user' }, tempDir);
    assert.equal(result.handle, 'flag-user');
    assert.equal(result.source, 'flag');
    assert.equal(result.warning, null);
  } finally {
    process.env.OFA_PR_AUTHOR = originalPr;
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('resolveIdentity - Priority 2: OFA_PR_AUTHOR in CI when no --user flag', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ofa-ident-p2-'));
  const originalPr = process.env.OFA_PR_AUTHOR;
  try {
    process.env.OFA_PR_AUTHOR = 'ci-author';
    setStoredIdentity(tempDir, 'stored-user');

    const result = await resolveIdentity({}, tempDir);
    assert.equal(result.handle, 'ci-author');
    assert.equal(result.source, 'ci');
    assert.equal(result.warning, null);
  } finally {
    process.env.OFA_PR_AUTHOR = originalPr;
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('resolveIdentity - Priority 3: stored identity when no flag and no CI env', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ofa-ident-p3-'));
  const originalPr = process.env.OFA_PR_AUTHOR;
  delete process.env.OFA_PR_AUTHOR;
  try {
    setStoredIdentity(tempDir, 'stored-developer');

    const result = await resolveIdentity({}, tempDir);
    assert.equal(result.handle, 'stored-developer');
    assert.equal(result.source, 'stored');
    assert.equal(result.warning, null);
  } finally {
    process.env.OFA_PR_AUTHOR = originalPr;
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
