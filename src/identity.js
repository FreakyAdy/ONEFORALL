/**
 * Identity Resolver — determines the current developer's GitHub handle
 *
 * Implements a strict priority resolution order:
 * 1. Explicit --user flag (highest priority)
 * 2. CI environment variable OFA_PR_AUTHOR (when present in CI)
 * 3. Stored identity in .ofa/identity (created via `ofa whoami --set <handle>`)
 * 4. git config user.name (last resort, flagged as unverified guess; rejected if invalid/contains spaces)
 */

import fs from 'fs';
import path from 'path';
import { simpleGit } from 'simple-git';
import { findProjectRoot } from './config.js';

const GITHUB_HANDLE_REGEX = /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/;

/**
 * Validate that a string is a legitimate GitHub username.
 * Rejects strings with spaces, consecutive hyphens, leading/trailing hyphens,
 * special characters, or invalid lengths (1-39 chars allowed).
 *
 * @param {string} str
 * @returns {boolean}
 */
export function isValidGithubHandle(str) {
  if (typeof str !== 'string') return false;
  if (!str || str.trim() !== str) return false;
  return GITHUB_HANDLE_REGEX.test(str);
}

/**
 * Get stored identity from .ofa/identity if it exists and is valid.
 *
 * @param {string} projectRoot
 * @returns {string|null}
 */
export function getStoredIdentity(projectRoot = findProjectRoot()) {
  const idPath = path.join(projectRoot, '.ofa', 'identity');
  if (!fs.existsSync(idPath)) return null;
  try {
    const content = fs.readFileSync(idPath, 'utf-8').trim().replace(/^@/, '');
    return content || null;
  } catch {
    return null;
  }
}

/**
 * Store a verified GitHub handle into .ofa/identity.
 *
 * @param {string} projectRoot
 * @param {string} handle
 * @returns {{ success: boolean, message: string }}
 */
export function setStoredIdentity(projectRoot = findProjectRoot(), handle) {
  const clean = typeof handle === 'string' ? handle.trim().replace(/^@/, '') : '';
  if (!isValidGithubHandle(clean)) {
    return {
      success: false,
      message: `"${handle}" is not a valid GitHub username. Handles must be 1-39 alphanumeric characters or hyphens (no spaces, no consecutive/leading/trailing hyphens).`,
    };
  }

  const dir = path.join(projectRoot, '.ofa');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(path.join(dir, 'identity'), clean + '\n', 'utf-8');
  return {
    success: true,
    message: `Stored identity set to @${clean} in .ofa/identity`,
  };
}

/**
 * Clear stored identity from .ofa/identity.
 *
 * @param {string} projectRoot
 * @returns {boolean}
 */
export function clearStoredIdentity(projectRoot = findProjectRoot()) {
  const idPath = path.join(projectRoot, '.ofa', 'identity');
  if (fs.existsSync(idPath)) {
    try {
      fs.unlinkSync(idPath);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Resolve the current developer's GitHub identity following the strict priority order.
 *
 * @param {object} [options] - Options object, e.g. { user: 'alice' }
 * @param {string} [projectRoot] - Root path of the project
 * @returns {Promise<{ handle: string|null, source: 'flag'|'ci'|'stored'|'git'|'none', warning: string|null }>}
 */
export async function resolveIdentity(options = {}, projectRoot = findProjectRoot()) {
  // 1. Explicit --user flag
  if (options && options.user) {
    const raw = String(options.user).trim();
    const clean = raw.replace(/^@/, '');
    if (isValidGithubHandle(clean)) {
      return { handle: clean, source: 'flag', warning: null };
    }
    return {
      handle: null,
      source: 'flag',
      warning: `The provided username "${options.user}" is not a valid GitHub handle.`,
    };
  }

  // 2. CI environment variable OFA_PR_AUTHOR
  if (process.env.OFA_PR_AUTHOR) {
    const raw = String(process.env.OFA_PR_AUTHOR).trim();
    const clean = raw.replace(/^@/, '');
    if (isValidGithubHandle(clean)) {
      return { handle: clean, source: 'ci', warning: null };
    }
    return {
      handle: null,
      source: 'ci',
      warning: `OFA_PR_AUTHOR environment variable ("${process.env.OFA_PR_AUTHOR}") is not a valid GitHub handle.`,
    };
  }

  // 3. Stored identity in .ofa/identity
  const stored = getStoredIdentity(projectRoot);
  if (stored) {
    if (isValidGithubHandle(stored)) {
      return { handle: stored, source: 'stored', warning: null };
    }
    return {
      handle: null,
      source: 'stored',
      warning: `Stored identity in .ofa/identity ("${stored}") is not a valid GitHub handle.`,
    };
  }

  // 4. git config user.name (last resort fallback)
  try {
    const git = simpleGit(projectRoot);
    const gitUser = await git.getConfig('user.name');
    if (gitUser && gitUser.value) {
      const raw = gitUser.value.trim();
      const clean = raw.replace(/^@/, '');
      if (isValidGithubHandle(clean)) {
        return {
          handle: clean,
          source: 'git',
          warning: `Resolved identity from git config user.name ("${clean}") as an unverified guess. Set a verified handle with "ofa whoami --set <handle>".`,
        };
      }
      return {
        handle: null,
        source: 'git',
        warning: `git config user.name ("${gitUser.value}") is not a valid GitHub handle (contains spaces or invalid characters). Set a valid handle with "ofa whoami --set <handle>" or pass --user.`,
      };
    }
  } catch {
    // git config not available or failed
  }

  return {
    handle: null,
    source: 'none',
    warning: 'Could not resolve identity. Specify --user <handle> or run "ofa whoami --set <handle>".',
  };
}
