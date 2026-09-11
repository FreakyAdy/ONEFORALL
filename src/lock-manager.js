/**
 * Lock Manager — manages zone ownership and file locks
 *
 * Handles claiming/releasing zones, TTL-based auto-expiry, and
 * conflict detection when multiple developers try to claim the same zone.
 */

import { readConfig, writeConfig } from './config.js';

/**
 * Claim a zone for a developer.
 *
 * @param {string} projectRoot
 * @param {string} zoneName
 * @param {string} username - GitHub username
 * @param {number} ttlHours - Auto-release after N hours
 * @returns {{ success: boolean, message: string }}
 */
export function claimZone(projectRoot, zoneName, username, ttlHours = 24) {
  const config = readConfig(projectRoot);
  if (!config) {
    return { success: false, message: 'No .ofa/config.yml found. Run "ofa init" first.' };
  }

  // Check zone exists
  if (!config.zones[zoneName]) {
    const available = Object.keys(config.zones).join(', ');
    return {
      success: false,
      message: `Zone "${zoneName}" does not exist. Available zones: ${available}`,
    };
  }

  // Purge expired locks first
  purgeExpiredLocks(config);

  const zone = config.zones[zoneName];

  // Check if already claimed by someone else
  if (zone.owner && zone.owner !== username) {
    return {
      success: false,
      message: `Zone "${zoneName}" is already claimed by @${zone.owner}. They must release it first, or wait for TTL expiry.`,
    };
  }

  // Check if already claimed by this user
  if (zone.owner === username) {
    // Refresh the TTL
    updateLockTTL(config, zoneName, ttlHours);
    writeConfig(projectRoot, config);
    return {
      success: true,
      message: `Zone "${zoneName}" TTL refreshed for @${username} (expires in ${ttlHours}h).`,
    };
  }

  // Claim it
  zone.owner = username;
  zone.claimed_at = new Date().toISOString();

  // Add to locks array
  config.locks = config.locks || [];
  config.locks.push({
    zone: zoneName,
    owner: username,
    claimed_at: zone.claimed_at,
    expires_at: new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString(),
    ttl_hours: ttlHours,
  });

  writeConfig(projectRoot, config);

  return {
    success: true,
    message: `Zone "${zoneName}" claimed by @${username} (expires in ${ttlHours}h).`,
  };
}

/**
 * Release a zone.
 *
 * @param {string} projectRoot
 * @param {string} zoneName
 * @param {string} [username] - If provided, only release if owned by this user
 * @returns {{ success: boolean, message: string }}
 */
export function releaseZone(projectRoot, zoneName, username) {
  const config = readConfig(projectRoot);
  if (!config) {
    return { success: false, message: 'No .ofa/config.yml found. Run "ofa init" first.' };
  }

  if (!config.zones[zoneName]) {
    return { success: false, message: `Zone "${zoneName}" does not exist.` };
  }

  const zone = config.zones[zoneName];

  if (!zone.owner) {
    return { success: false, message: `Zone "${zoneName}" is not claimed by anyone.` };
  }

  if (username && zone.owner !== username) {
    return {
      success: false,
      message: `Zone "${zoneName}" is owned by @${zone.owner}, not @${username}.`,
    };
  }

  const previousOwner = zone.owner;
  zone.owner = null;
  delete zone.claimed_at;

  // Remove from locks array
  config.locks = (config.locks || []).filter(l => l.zone !== zoneName);

  writeConfig(projectRoot, config);

  return {
    success: true,
    message: `Zone "${zoneName}" released by @${previousOwner}. It's now available.`,
  };
}

/**
 * Get a summary of all zone ownership status.
 */
export function getOwnershipStatus(projectRoot) {
  const config = readConfig(projectRoot);
  if (!config) return null;

  purgeExpiredLocks(config);
  writeConfig(projectRoot, config);

  const zones = [];
  for (const [name, zone] of Object.entries(config.zones)) {
    const lock = (config.locks || []).find(l => l.zone === name);
    zones.push({
      name,
      paths: zone.paths,
      description: zone.description,
      owner: zone.owner || null,
      claimed_at: zone.claimed_at || null,
      expires_at: lock?.expires_at || null,
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
    const normalizedZone = zonePath.replace(/\\/g, '/');
    if (normalizedFile.startsWith(normalizedZone) || normalizedFile === normalizedZone.slice(0, -1)) {
      return true;
    }
  }
  return false;
}

/**
 * Given a list of changed files, check which zones they belong to and if
 * the current user is allowed to modify them.
 *
 * @returns {{ violations: Array, warnings: Array }}
 */
export function checkBoundaryViolations(projectRoot, changedFiles, currentUser) {
  const config = readConfig(projectRoot);
  if (!config) return { violations: [], warnings: [] };

  purgeExpiredLocks(config);

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

    // Check if the zone is claimed by someone else
    if (fileZone.owner && fileZone.owner !== currentUser) {
      violations.push({
        file,
        zone: fileZoneName,
        owner: fileZone.owner,
        message: `File is in zone "${fileZoneName}" owned by @${fileZone.owner}. You (@${currentUser}) cannot modify it.`,
      });
    }

    // Check shared zones
    if (fileZone.require_all_owners) {
      const activeOwners = Object.entries(config.zones)
        .filter(([_, z]) => z.owner && !z.require_all_owners)
        .map(([_, z]) => z.owner);

      if (activeOwners.length > 0 && !activeOwners.includes(currentUser)) {
        warnings.push({
          file,
          zone: fileZoneName,
          message: `File is in shared zone "${fileZoneName}" — changes require review from: ${activeOwners.map(o => '@' + o).join(', ')}`,
        });
      }
    }
  }

  return { violations, warnings };
}

// ── Internal helpers ────────────────────────────────────────────────────

function purgeExpiredLocks(config) {
  const now = new Date();
  config.locks = (config.locks || []).filter(lock => {
    if (new Date(lock.expires_at) <= now) {
      // Expired — clear the zone owner
      if (config.zones[lock.zone]) {
        config.zones[lock.zone].owner = null;
        delete config.zones[lock.zone].claimed_at;
      }
      return false;
    }
    return true;
  });
}

function updateLockTTL(config, zoneName, ttlHours) {
  const lock = (config.locks || []).find(l => l.zone === zoneName);
  if (lock) {
    lock.expires_at = new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString();
    lock.ttl_hours = ttlHours;
  }
}
