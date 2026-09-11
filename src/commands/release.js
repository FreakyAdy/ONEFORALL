/**
 * ofa release <zone> — Release ownership of a zone
 *
 * Unlocks a zone, making it available for others, and updates
 * all AI config files.
 */

import chalk from 'chalk';
import path from 'path';
import { simpleGit } from 'simple-git';
import { findProjectRoot, readConfig } from '../config.js';
import { releaseZone } from '../lock-manager.js';
import { generateAllConfigs } from './init.js';
import { resolveIdentity } from '../identity.js';

export async function releaseCommand(zone, options = {}) {
  const projectRoot = findProjectRoot();
  const config = readConfig(projectRoot);

  if (!config) {
    console.log(chalk.red('\n  ✖ No .ofa/config.yml found. Run "ofa init" first.\n'));
    process.exit(1);
  }

  // Check zone exists
  if (!config.zones || !config.zones[zone]) {
    console.log(chalk.red(`\n  ✖ Zone "${zone}" does not exist.\n`));
    process.exit(1);
  }

  const existingOwner = config.zones[zone].owner;
  if (!existingOwner) {
    console.log(chalk.yellow(`\n  ⚠️  Zone "${zone}" is not currently claimed by anyone.\n`));
    return;
  }

  // Determine user identity
  const identity = await resolveIdentity(options, projectRoot);
  const username = identity.handle;

  if (options.force) {
    console.log(chalk.yellow(`\n  ⚠️  --force specified: bypassing ownership check.`));
  } else if (!username) {
    console.log(chalk.red('\n  ✖ Could not determine your username to verify ownership.'));
    console.log(chalk.dim('     Use: ofa release <zone> --user <handle> or use --force to bypass.\n'));
    process.exit(1);
  }

  console.log('');
  console.log(chalk.dim(`  🔓 Releasing zone "${zone}"...`));

  const result = releaseZone(projectRoot, zone, username, Boolean(options.force));

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
        await git.commit(`chore(ofa): release zone "${zone}"`);
        console.log(chalk.green('  ✔ Committed config and AI files to git.'));
      } catch (err) {
        console.log(chalk.yellow(`  ⚠️  Failed to commit changes: ${err.message}`));
      }
    }
  } else {
    console.log(chalk.red(`  ✖ ${result.message}`));
    if (!options.force && existingOwner) {
      console.log(chalk.dim(`     To force-release, run: ofa release ${zone} --force\n`));
    }
    process.exit(1);
  }

  console.log('');
}
