/**
 * ofa claim <zone> — Claim ownership of a zone
 *
 * Locks a zone for a developer, updates all AI config files,
 * and regenerates CODEOWNERS.
 */

import chalk from 'chalk';
import path from 'path';
import { simpleGit } from 'simple-git';
import { findProjectRoot, readConfig } from '../config.js';
import { claimZone } from '../lock-manager.js';
import { generateAllConfigs } from './init.js';
import { resolveIdentity } from '../identity.js';

export async function claimCommand(zone, options = {}) {
  const projectRoot = findProjectRoot();
  const config = readConfig(projectRoot);

  if (!config) {
    console.log(chalk.red('\n  ✖ No .ofa/config.yml found. Run "ofa init" first.\n'));
    process.exit(1);
  }

  // Determine the username via shared resolver
  const identity = await resolveIdentity(options, projectRoot);
  if (identity.warning && identity.handle) {
    console.log(chalk.yellow(`\n  ⚠️  ${identity.warning}`));
  }

  const username = identity.handle;
  if (!username) {
    console.log(chalk.red('\n  ✖ Could not determine a valid GitHub username.'));
    if (identity.warning) {
      console.log(chalk.dim(`     Reason: ${identity.warning}`));
    }
    console.log(chalk.dim('     Use: ofa claim <zone> --user <github-username> or "ofa whoami --set <handle>"\n'));
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
    const generated = generateAllConfigs(projectRoot, updatedConfig);
    console.log(chalk.green('  ✔ All config files updated.'));

    // If --commit is requested, stage and commit the changes
    if (options.commit) {
      try {
        const git = simpleGit(projectRoot);
        const filesToStage = ['.ofa/config.yml', ...generated.map(f => path.relative(projectRoot, f).replace(/\\/g, '/'))];
        await git.add(filesToStage);
        await git.commit(`chore(ofa): claim zone "${zone}" for @${username}`);
        console.log(chalk.green('  ✔ Changes committed to git.'));
      } catch (err) {
        console.log(chalk.yellow(`  ⚠️  Failed to commit changes: ${err.message}`));
      }
    }

    console.log('');
    console.log(chalk.white('  Your AI agent will now see that you own: ') + chalk.bold.cyan(zone));
    console.log(chalk.dim('  Other developers\' AI agents will be told NOT to touch your zone.'));
  } else {
    console.log(chalk.red(`  ✖ ${result.message}`));
    process.exit(1);
  }

  console.log('');
}
