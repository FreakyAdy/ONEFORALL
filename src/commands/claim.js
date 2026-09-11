/**
 * ofa claim <zone> — Claim ownership of a zone
 *
 * Locks a zone for a developer, updates all AI config files,
 * and regenerates CODEOWNERS.
 */

import chalk from 'chalk';
import { simpleGit } from 'simple-git';
import { findProjectRoot, readConfig } from '../config.js';
import { claimZone } from '../lock-manager.js';
import { generateAllConfigs } from './init.js';

export async function claimCommand(zone, options) {
  const projectRoot = findProjectRoot();
  const config = readConfig(projectRoot);

  if (!config) {
    console.log(chalk.red('\n  ✖ No .ofa/config.yml found. Run "ofa init" first.\n'));
    process.exit(1);
  }

  // Determine the username
  let username = options.user;

  if (!username) {
    // Try to get from git config
    try {
      const git = simpleGit(projectRoot);
      const gitUser = await git.getConfig('user.name');
      username = gitUser.value;
    } catch {
      // ignore
    }
  }

  if (!username) {
    console.log(chalk.red('\n  ✖ Could not determine your username.'));
    console.log(chalk.dim('     Use: ofa claim <zone> --user <github-username>\n'));
    process.exit(1);
  }

  console.log('');
  console.log(chalk.dim(`  🔒 Claiming zone "${zone}" for @${username}...`));

  const result = claimZone(projectRoot, zone, username, parseInt(options.ttl) || 24);

  if (result.success) {
    console.log(chalk.green(`  ✔ ${result.message}`));

    // Regenerate all AI config files
    console.log(chalk.dim('  📝 Updating AI config files...'));
    const updatedConfig = readConfig(projectRoot);
    generateAllConfigs(projectRoot, updatedConfig);
    console.log(chalk.green('  ✔ All config files updated.'));

    console.log('');
    console.log(chalk.white('  Your AI agent will now see that you own: ') + chalk.bold.cyan(zone));
    console.log(chalk.dim('  Other developers\' AI agents will be told NOT to touch your zone.'));
  } else {
    console.log(chalk.red(`  ✖ ${result.message}`));
  }

  console.log('');
}
