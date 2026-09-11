/**
 * ofa guard — Check that changes respect ownership boundaries
 *
 * Validates staged or committed changes against the zone ownership map.
 * Can be used as a pre-commit hook, in CI, or manually.
 */

import chalk from 'chalk';
import { simpleGit } from 'simple-git';
import { findProjectRoot, readConfig } from '../config.js';
import { checkBoundaryViolations } from '../lock-manager.js';

export async function guardCommand(options) {
  const projectRoot = findProjectRoot();
  const config = readConfig(projectRoot);

  if (!config) {
    console.log(chalk.red('\n  ✖ No .ofa/config.yml found. Run "ofa init" first.\n'));
    process.exit(1);
  }

  const git = simpleGit(projectRoot);

  // Determine the current user
  let currentUser;
  try {
    const gitUser = await git.getConfig('user.name');
    currentUser = gitUser.value;
  } catch {
    currentUser = process.env.OFA_PR_AUTHOR || 'unknown';
  }

  // Get changed files
  let changedFiles = [];

  if (options.staged) {
    // Pre-commit: check staged files
    const diff = await git.diff(['--cached', '--name-only']);
    changedFiles = diff.split('\n').filter(f => f.trim());
  } else if (process.env.CHANGED_FILES) {
    // CI: files passed via environment
    changedFiles = process.env.CHANGED_FILES.split(' ').filter(f => f.trim());
  } else {
    // Default: check uncommitted changes against the current branch
    try {
      const diff = await git.diff(['--name-only']);
      const staged = await git.diff(['--cached', '--name-only']);
      const allFiles = [...diff.split('\n'), ...staged.split('\n')];
      changedFiles = [...new Set(allFiles.filter(f => f.trim()))];
    } catch {
      // If no git history, check all tracked files
      changedFiles = [];
    }
  }

  if (changedFiles.length === 0) {
    console.log(chalk.green('\n  ✔ No changed files detected. All clear!\n'));
    return;
  }

  console.log('');
  console.log(chalk.bold.cyan('  🛡️  ONEFORALL Guard — Boundary Check'));
  console.log(chalk.dim(`  Checking ${changedFiles.length} file(s) for @${currentUser}...`));
  console.log('');

  const { violations, warnings } = checkBoundaryViolations(
    projectRoot,
    changedFiles,
    currentUser
  );

  // Show results
  if (violations.length === 0 && warnings.length === 0) {
    console.log(chalk.green('  ✅ All changes are within your ownership boundaries. Good to go!'));
    console.log('');
    return;
  }

  // Violations
  if (violations.length > 0) {
    console.log(chalk.red.bold(`  ❌ ${violations.length} BOUNDARY VIOLATION(S):`));
    console.log('');
    for (const v of violations) {
      console.log(chalk.red(`  ✖ ${v.file}`));
      console.log(chalk.dim(`    ${v.message}`));
      console.log('');
    }
  }

  // Warnings
  if (warnings.length > 0) {
    console.log(chalk.yellow.bold(`  ⚠️  ${warnings.length} WARNING(S):`));
    console.log('');
    for (const w of warnings) {
      console.log(chalk.yellow(`  ⚡ ${w.file}`));
      console.log(chalk.dim(`    ${w.message}`));
      console.log('');
    }
  }

  // Exit with error in strict mode if there are violations
  if (violations.length > 0 && options.strict) {
    console.log(chalk.red.bold('  Guard failed. Fix boundary violations before committing.'));
    console.log('');
    process.exit(1);
  }

  if (violations.length > 0) {
    console.log(chalk.yellow('  Tip: Use --strict flag to enforce boundary violations as errors.'));
    console.log('');
  }
}
