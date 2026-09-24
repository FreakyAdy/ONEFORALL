import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  fileInZone,
  claimZone,
  releaseZone,
  checkBoundaryViolations,
} from '../src/lock-manager.js';
import { writeConfig } from '../src/config.js';

test('fileInZone - boundary matching prevents prefix overlap (Bug #6)', () => {
  const zoneWithSlash = { paths: ['src/api/'] };
  const zoneWithoutSlash = { paths: ['src/api'] };

  // Negative boundary checks: must NOT match prefix extensions
  assert.equal(fileInZone('src/api-legacy/old.js', zoneWithSlash), false);
  assert.equal(fileInZone('src/api-legacy/old.js', zoneWithoutSlash), false);
  assert.equal(fileInZone('src/api_v2/route.js', zoneWithSlash), false);
  assert.equal(fileInZone('src/api_v2/route.js', zoneWithoutSlash), false);
  assert.equal(fileInZone('src/apidocs.md', zoneWithSlash), false);
  assert.equal(fileInZone('src/apidocs.md', zoneWithoutSlash), false);

  // Positive boundary checks: MUST match files within zone directory
  assert.equal(fileInZone('src/api/users.js', zoneWithSlash), true);
  assert.equal(fileInZone('src/api/users.js', zoneWithoutSlash), true);
  assert.equal(fileInZone('src/api/v1/auth.js', zoneWithSlash), true);
  assert.equal(fileInZone('src/api/v1/auth.js', zoneWithoutSlash), true);
});

import { simpleGit } from 'simple-git';
import { getProvider } from '../src/engine/state.js';

async function setupGitRepo(tempDir) {
  const git = simpleGit(tempDir);
  await git.init();
  await git.addConfig('user.name', 'Test User');
  await git.addConfig('user.email', 'test@example.com');
  // Need an initial commit so we can branch off
  fs.writeFileSync(path.join(tempDir, 'README.md'), 'Test');
  await git.add('.');
  await git.commit('initial');
  return git;
}

test('claimZone - claiming, conflicts, and TTL refresh', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ofa-claim-test-'));
  try {
    await setupGitRepo(tempDir);
    const config = {
      version: 2,
      project: { name: 'test-app', type: 'node' },
      zones: {
        backend: { paths: ['src/api/'], description: 'Backend' },
        frontend: { paths: ['src/ui/'], description: 'Frontend' },
      }
    };
    writeConfig(tempDir, config);

    const provider = getProvider(tempDir);
    await provider.init();

    // 1. Claim unclaimed zone
    const r1 = await claimZone(tempDir, 'backend', 'alice', 24);
    assert.equal(r1.success, true);

    // 2. Conflict: bob tries to claim backend
    const r2 = await claimZone(tempDir, 'backend', 'bob', 24);
    assert.equal(r2.success, false);
    assert.match(r2.message, /already claimed by @alice/);

    // 3. TTL refresh: alice re-claims backend
    const r3 = await claimZone(tempDir, 'backend', 'alice', 48);
    assert.equal(r3.success, true);
    assert.match(r3.message, /TTL refreshed/);

    // 4. Non-existent zone
    const r4 = await claimZone(tempDir, 'nonexistent', 'alice', 24);
    assert.equal(r4.success, false);
    assert.match(r4.message, /does not exist/);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('releaseZone - ownership verification and force release', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ofa-release-test-'));
  try {
    await setupGitRepo(tempDir);
    const config = {
      version: 2,
      project: { name: 'test-app', type: 'node' },
      zones: {
        backend: { paths: ['src/api/'], description: 'Backend' },
      }
    };
    writeConfig(tempDir, config);

    const provider = getProvider(tempDir);
    await provider.init();

    await claimZone(tempDir, 'backend', 'alice', 24);

    // 1. Bob tries to release Alice's zone without force -> Refused
    const r1 = await releaseZone(tempDir, 'backend', 'bob', false);
    assert.equal(r1.success, false);
    assert.match(r1.message, /owned by @alice, not @bob/);

    // 2. Bob force-releases Alice's zone -> Allowed
    const r2 = await releaseZone(tempDir, 'backend', 'bob', true);
    assert.equal(r2.success, true);
    assert.match(r2.message, /force-released/);

    // 3. Releasing an already unclaimed zone
    const r3 = await releaseZone(tempDir, 'backend', 'alice', false);
    assert.equal(r3.success, false);
    assert.match(r3.message, /not claimed by anyone/);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('checkBoundaryViolations - enforcement logic', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ofa-guard-test-'));
  try {
    await setupGitRepo(tempDir);
    const config = {
      version: 2,
      project: { name: 'test-app', type: 'node' },
      zones: {
        backend: { paths: ['src/api/'], description: 'Backend' },
        frontend: { paths: ['src/ui/'], description: 'Frontend' },
        shared: { paths: ['src/shared/'], require_all_owners: true, description: 'Shared' },
      }
    };
    writeConfig(tempDir, config);

    const provider = getProvider(tempDir);
    await provider.init();

    await claimZone(tempDir, 'backend', 'alice', 24);
    await claimZone(tempDir, 'frontend', 'bob', 24);

    // 1. Alice modifies own files -> No violations
    const r1 = await checkBoundaryViolations(tempDir, ['src/api/users.js'], 'alice');
    assert.equal(r1.violations.length, 0);

    // 2. Alice modifies Bob's files -> 1 Violation
    const r2 = await checkBoundaryViolations(tempDir, ['src/ui/button.jsx'], 'alice');
    assert.equal(r2.violations.length, 1);
    assert.equal(r2.violations[0].owner, 'bob');

    // 3. Modifying unzoned file -> Warning, not violation
    const r3 = await checkBoundaryViolations(tempDir, ['README.md'], 'alice');
    assert.equal(r3.violations.length, 0);
    assert.equal(r3.warnings.length, 1);
    assert.match(r3.warnings[0].message, /not in any defined zone/);

    // 4. Modifying shared zone when not owner -> Warning
    const r4 = await checkBoundaryViolations(tempDir, ['src/shared/types.ts'], 'charlie');
    assert.equal(r4.violations.length, 0);
    assert.equal(r4.warnings.length, 1);
    assert.match(r4.warnings[0].message, /shared zone/);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
