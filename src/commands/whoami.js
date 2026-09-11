/**
 * ofa whoami — View or configure developer identity
 */

import chalk from 'chalk';
import { findProjectRoot } from '../config.js';
import {
  resolveIdentity,
  setStoredIdentity,
  clearStoredIdentity,
  getStoredIdentity,
  isValidGithubHandle,
} from '../identity.js';

export async function whoamiCommand(options = {}) {
  const projectRoot = findProjectRoot();

  // Handle --clear
  if (options.clear) {
    const cleared = clearStoredIdentity(projectRoot);
    if (cleared) {
      console.log(chalk.green('\n  ✔ Cleared stored identity from .ofa/identity.\n'));
    } else {
      console.log(chalk.dim('\n  No stored identity found in .ofa/identity.\n'));
    }
    return;
  }

  // Handle --set <handle>
  if (options.set) {
    const clean = String(options.set).trim().replace(/^@/, '');
    if (!isValidGithubHandle(clean)) {
      console.log(chalk.red(`\n  ✖ "${options.set}" is not a valid GitHub username.`));
      console.log(chalk.dim('     Handles must be 1-39 alphanumeric characters or hyphens (no spaces).\n'));
      process.exit(1);
    }

    const res = setStoredIdentity(projectRoot, clean);
    if (res.success) {
      console.log(chalk.green(`\n  ✔ ${res.message}\n`));
    } else {
      console.log(chalk.red(`\n  ✖ ${res.message}\n`));
      process.exit(1);
    }
    return;
  }

  // Default: inspect and report identity
  const identity = await resolveIdentity(options, projectRoot);
  const stored = getStoredIdentity(projectRoot);

  console.log('');
  console.log(chalk.bold.cyan('  👤 ONEFORALL Developer Identity'));
  console.log('');

  if (identity.handle) {
    console.log(chalk.white('  Resolved Handle: ') + chalk.bold.green(`@${identity.handle}`));
    console.log(chalk.white('  Source:          ') + chalk.cyan(identity.source));

    if (identity.source === 'git') {
      console.log(chalk.yellow('\n  ⚠️  Notice: Resolved from git config user.name as an unverified guess.'));
      console.log(chalk.dim(`     To set your official GitHub username, run: ofa whoami --set <handle>`));
    }
  } else {
    console.log(chalk.white('  Resolved Handle: ') + chalk.bold.red('None'));
    if (identity.warning) {
      console.log(chalk.dim(`  Reason:          ${identity.warning}`));
    }
    console.log(chalk.dim(`\n  To set your identity, run: ofa whoami --set <your-github-username>`));
  }

  if (stored && identity.source !== 'stored') {
    console.log(chalk.dim(`  Stored in .ofa:  @${stored}`));
  }

  console.log('');
}
