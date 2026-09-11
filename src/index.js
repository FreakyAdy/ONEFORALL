/**
 * ONEFORALL (ofa) — Public API
 */

export {
  readConfig,
  writeConfig,
  findProjectRoot,
  createDefaultConfig,
  configPath,
  configDir,
  configExists,
} from './config.js';

export { scanProject } from './scanner.js';

export {
  claimZone,
  releaseZone,
  getOwnershipStatus,
  fileInZone,
  checkBoundaryViolations,
} from './lock-manager.js';

export {
  resolveIdentity,
  isValidGithubHandle,
  getStoredIdentity,
  setStoredIdentity,
  clearStoredIdentity,
} from './identity.js';

export { generateAllConfigs } from './commands/init.js';
