import { readConfig } from './config.js';
import { getState, acquireLease, releaseLease } from './engine/state.js';
import picomatch from 'picomatch';
import path from 'path';

/**
 * Claim a zone for a developer.
 *
 * @param {string} projectRoot
 * @param {string} zoneName
 * @param {string} username - GitHub username
 * @param {number} ttlHours - Auto-release after N hours
 * @returns {Promise<{ success: boolean, message: string }>}
 */
export async function claimZone(projectRoot, zoneName, username, ttlHours = 24) {
  const config = readConfig(projectRoot);
  if (!config) {
    return { success: false, message: 'No .ofa/config.yml found. Run "ofa init" first.' };
  }

  // Check zone exists in policy
  if (!config.zones[zoneName]) {
    const available = Object.keys(config.zones).join(', ');
    return {
      success: false,
      message: `Zone "${zoneName}" does not exist. Available zones: ${available}`,
    };
  }

  const lease = {
    zone: zoneName,
    owner: username,
    expires_at: new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString(),
    ttl_hours: ttlHours
  };

  const result = await acquireLease(lease, projectRoot);
  return { success: result.success, message: result.message };
}

/**
 * Release a zone.
 *
 * @param {string} projectRoot
 * @param {string} zoneName
 * @param {string} [username] - If provided, only release if owned by this user
 * @returns {Promise<{ success: boolean, message: string }>}
 */
export async function releaseZone(projectRoot, zoneName, username, force = false) {
  const config = readConfig(projectRoot);
  if (!config) {
    return { success: false, message: 'No .ofa/config.yml found. Run "ofa init" first.' };
  }

  if (!config.zones[zoneName]) {
    return { success: false, message: `Zone "${zoneName}" does not exist in policy.` };
  }

  const result = await releaseLease(zoneName, username, force, projectRoot);
  return { success: result.success, message: result.message };
}

/**
 * Get a summary of all zone ownership status.
 */
export async function getOwnershipStatus(projectRoot) {
  const config = readConfig(projectRoot);
  if (!config) return null;

  const state = await getState(projectRoot);
  const locks = state.locks || [];

  const zones = [];
  for (const [name, zone] of Object.entries(config.zones)) {
    const lock = locks.find(l => l.zone === name);
    zones.push({
      name,
      paths: zone.paths,
      description: zone.description,
      owner: lock ? lock.owner : null,
      claimed_at: lock ? lock.claimed_at : null,
      expires_at: lock ? lock.expires_at : null,
      require_all_owners: zone.require_all_owners || false,
    });
  }

  return {
    project: config.project,
    zones,
    rules: config.rules,
  };
}

/**
 * Check if a file path falls within a specific zone.
 */
export function fileInZone(filePath, zone) {
  const normalizedFile = filePath.replace(/\\/g, '/');

  for (const zonePath of zone.paths) {
    let normalizedZone = zonePath.replace(/\\/g, '/');

    // Check if the user specified a directory path without a trailing slash (which was valid before)
    // We treat it as a directory if it doesn't contain glob stars and doesn't look like a specific file with an extension
    if (!normalizedZone.endsWith('/') && !normalizedZone.includes('*') && !path.extname(normalizedZone)) {
        normalizedZone += '/';
    }

    // If the path looks like a directory, treat it as a glob matching anything inside
    if (normalizedZone.endsWith('/')) {
      const glob = normalizedZone + '**/*';
      if (picomatch.isMatch(normalizedFile, [glob, normalizedZone.slice(0, -1)])) {
        return true;
      }
    } else {
      // If it's a specific file or a glob pattern
      if (picomatch.isMatch(normalizedFile, normalizedZone)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Given a list of changed files, check which zones they belong to and if
 * the current user is allowed to modify them.
 *
 * @returns {Promise<{ violations: Array, warnings: Array }>}
 */
export async function checkBoundaryViolations(projectRoot, changedFiles, currentUser) {
  const config = readConfig(projectRoot);
  if (!config) return { violations: [], warnings: [] };

  const state = await getState(projectRoot);
  const locks = state.locks || [];

  const violations = [];
  const warnings = [];

  for (const file of changedFiles) {
    let fileZone = null;
    let fileZoneName = null;

    // Find which zone this file belongs to
    for (const [name, zone] of Object.entries(config.zones)) {
      if (fileInZone(file, zone)) {
        fileZone = zone;
        fileZoneName = name;
        break;
      }
    }

    if (!fileZone) {
      // File not in any zone — warn but don't block
      warnings.push({
        file,
        message: `File is not in any defined zone. Consider adding it to .ofa/config.yml.`,
      });
      continue;
    }

    const lock = locks.find(l => l.zone === fileZoneName);

    // Check if the zone is claimed by someone else
    if (lock && lock.owner !== currentUser) {
      violations.push({
        file,
        zone: fileZoneName,
        owner: lock.owner,
        message: `File is in zone "${fileZoneName}" owned by @${lock.owner}. You (@${currentUser}) cannot modify it.`,
      });
    }

    // Check shared zones
    if (fileZone.require_all_owners) {
      const activeOwners = locks
        .filter(l => !config.zones[l.zone]?.require_all_owners)
        .map(l => l.owner);

      if (activeOwners.length > 0 && !activeOwners.includes(currentUser)) {
        warnings.push({
          file,
          zone: fileZoneName,
          message: `File is in shared zone "${fileZoneName}" — changes require review from: ${[...new Set(activeOwners)].map(o => '@' + o).join(', ')}`,
        });
      }
    }
  }

  return { violations, warnings };
}
