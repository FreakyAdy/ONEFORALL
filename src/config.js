/**
 * Config Manager — reads and writes .ofa/config.yml
 *
 * This is the single source of truth for zone definitions, ownership,
 * locks, and project-wide rules. Every command reads/writes through here.
 */

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

const CONFIG_DIR = '.ofa';
const CONFIG_FILE = 'config.yml';

/**
 * Find the project root by walking up from `startDir` looking for .ofa/ or .git/
 * Falls back to `startDir` itself if nothing is found.
 */
export function findProjectRoot(startDir = process.cwd()) {
  let dir = path.resolve(startDir);
  while (true) {
    if (fs.existsSync(path.join(dir, CONFIG_DIR, CONFIG_FILE))) return dir;
    if (fs.existsSync(path.join(dir, '.git'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break; // filesystem root
    dir = parent;
  }
  return startDir;
}

/**
 * Return the absolute path to .ofa/config.yml
 */
export function configPath(projectRoot) {
  return path.join(projectRoot, CONFIG_DIR, CONFIG_FILE);
}

/**
 * Return the absolute path to the .ofa/ directory
 */
export function configDir(projectRoot) {
  return path.join(projectRoot, CONFIG_DIR);
}

/**
 * Check if .ofa/config.yml exists
 */
export function configExists(projectRoot) {
  return fs.existsSync(configPath(projectRoot));
}

/**
 * Read and parse .ofa/config.yml → JS object
 */
export function readConfig(projectRoot) {
  const filePath = configPath(projectRoot);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const raw = fs.readFileSync(filePath, 'utf-8');
  return yaml.load(raw);
}

/**
 * Write a JS object → .ofa/config.yml
 */
export function writeConfig(projectRoot, config) {
  const dir = configDir(projectRoot);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const raw = yaml.dump(config, {
    indent: 2,
    lineWidth: 120,
    noRefs: true,
    sortKeys: false,
  });
  fs.writeFileSync(configPath(projectRoot), raw, 'utf-8');
}

/**
 * Create a default config object for a new project.
 */
export function createDefaultConfig(projectName, projectType, zones = {}) {
  return {
    version: 1,
    project: {
      name: projectName || path.basename(process.cwd()),
      type: projectType || 'unknown',
    },
    zones: zones,
    locks: [],
    rules: [
      'Never modify files outside your claimed zone without approval',
      'Shared zone changes require review from all active zone owners',
      'Always create a new branch for your work, never push to main directly',
      'Run tests before committing',
      'Keep commits small and focused on a single task',
    ],
  };
}
