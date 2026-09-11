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

test('claimZone - claiming, conflicts, and TTL refresh', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ofa-claim-test-'));
  try {
    const config = {
      version: 1,
      project: { name: 'test-app', type: 'node' },
      zones: {
        backend: { paths: ['src/api/'], owner: null, description: 'Backend' },
        frontend: { paths: ['src/ui/'], owner: null, description: 'Frontend' },
      },
      locks: [],
    };
    writeConfig(tempDir, config);

    // 1. Claim unclaimed zone
    const r1 = claimZone(tempDir, 'backend', 'alice', 24);
    assert.equal(r1.success, true);

    // 2. Conflict: bob tries to claim backend
    const r2 = claimZone(tempDir, 'backend', 'bob', 24);
    assert.equal(r2.success, false);
    assert.match(r2.message, /already claimed by @alice/);

    // 3. TTL refresh: alice re-claims backend
    const r3 = claimZone(tempDir, 'backend', 'alice', 48);
    assert.equal(r3.success, true);
    assert.match(r3.message, /TTL refreshed/);

    // 4. Non-existent zone
    const r4 = claimZone(tempDir, 'nonexistent', 'alice', 24);
    assert.equal(r4.success, false);
    assert.match(r4.message, /does not exist/);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('releaseZone - ownership verification and force release (Bug #5)', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ofa-release-test-'));
  try {
    const config = {
      version: 1,
      project: { name: 'test-app', type: 'node' },
      zones: {
        backend: { paths: ['src/api/'], owner: 'alice', description: 'Backend' },
      },
      locks: [{ zone: 'backend', owner: 'alice', expires_at: new Date(Date.now() + 100000).toISOString() }],
    };
    writeConfig(tempDir, config);

    // 1. Bob tries to release Alice's zone without force -> Refused
    const r1 = releaseZone(tempDir, 'backend', 'bob', false);
    assert.equal(r1.success, false);
    assert.match(r1.message, /owned by @alice, not @bob/);

    // 2. Bob force-releases Alice's zone -> Allowed
    const r2 = releaseZone(tempDir, 'backend', 'bob', true);
    assert.equal(r2.success, true);
    assert.match(r2.message, /force-released/);

    // 3. Releasing an already unclaimed zone
    const r3 = releaseZone(tempDir, 'backend', 'alice', false);
    assert.equal(r3.success, false);
    assert.match(r3.message, /not claimed by anyone/);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('checkBoundaryViolations - enforcement logic', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ofa-guard-test-'));
  try {
    const config = {
      version: 1,
      project: { name: 'test-app', type: 'node' },
      zones: {
        backend: { paths: ['src/api/'], owner: 'alice', description: 'Backend' },
        frontend: { paths: ['src/ui/'], owner: 'bob', description: 'Frontend' },
        shared: { paths: ['src/shared/'], owner: null, require_all_owners: true, description: 'Shared' },
      },
      locks: [],
    };
    writeConfig(tempDir, config);

    // 1. Alice modifies own files -> No violations
    const r1 = checkBoundaryViolations(tempDir, ['src/api/users.js'], 'alice');
    assert.equal(r1.violations.length, 0);

    // 2. Alice modifies Bob's files -> 1 Violation
    const r2 = checkBoundaryViolations(tempDir, ['src/ui/button.jsx'], 'alice');
    assert.equal(r2.violations.length, 1);
    assert.equal(r2.violations[0].owner, 'bob');

    // 3. Modifying unzoned file -> Warning, not violation
    const r3 = checkBoundaryViolations(tempDir, ['README.md'], 'alice');
    assert.equal(r3.violations.length, 0);
    assert.equal(r3.warnings.length, 1);
    assert.match(r3.warnings[0].message, /not in any defined zone/);

    // 4. Modifying shared zone when not owner -> Warning
    const r4 = checkBoundaryViolations(tempDir, ['src/shared/types.ts'], 'charlie');
    assert.equal(r4.violations.length, 0);
    assert.equal(r4.warnings.length, 1);
    assert.match(r4.warnings[0].message, /shared zone/);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
