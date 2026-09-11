/**
 * ofa sync — Regenerate all AI config files from .ofa/config.yml
 *
 * Reads the current config and re-generates all platform-specific
 * instruction files, CODEOWNERS, and GitHub Actions workflow.
 */

import chalk from 'chalk';
import path from 'path';
import { simpleGit } from 'simple-git';
import { findProjectRoot, readConfig } from '../config.js';
import { generateAllConfigs } from './init.js';

export async function syncCommand(options = {}) {
  const projectRoot = findProjectRoot();
  const config = readConfig(projectRoot);

  if (!config) {
    console.log(chalk.red('\n  ✖ No .ofa/config.yml found. Run "ofa init" first.\n'));
    process.exit(1);
  }

  console.log('');
  console.log(chalk.dim('  🔄 Syncing AI config files from .ofa/config.yml...'));
  console.log('');

  const generated = generateAllConfigs(projectRoot, config);

  for (const file of generated) {
    const relative = path.relative(projectRoot, file);
    console.log(chalk.green('  ✔ ') + chalk.dim(relative));
  }

  // If --commit is requested, stage and commit the changes
  if (options.commit) {
    try {
      const git = simpleGit(projectRoot);
      const filesToStage = ['.ofa/config.yml', ...generated.map(f => path.relative(projectRoot, f).replace(/\\/g, '/'))];
      await git.add(filesToStage);
      await git.commit('chore(ofa): sync AI configs and ownership map');
      console.log(chalk.green('  ✔ Committed config and AI files to git.'));
    } catch (err) {
      console.log(chalk.yellow(`  ⚠️  Failed to commit changes: ${err.message}`));
    }
  }

  console.log('');
  console.log(chalk.green(`  ✅ Synced ${generated.length} config file(s). All AI agents are up to date!`));
  console.log('');
}
