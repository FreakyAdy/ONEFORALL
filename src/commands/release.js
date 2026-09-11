/**
 * ofa release <zone> — Release ownership of a zone
 *
 * Unlocks a zone, making it available for others, and updates
 * all AI config files.
 */

import chalk from 'chalk';
import { findProjectRoot, readConfig } from '../config.js';
import { releaseZone } from '../lock-manager.js';
import { generateAllConfigs } from './init.js';

export async function releaseCommand(zone) {
  const projectRoot = findProjectRoot();
  const config = readConfig(projectRoot);

  if (!config) {
    console.log(chalk.red('\n  ✖ No .ofa/config.yml found. Run "ofa init" first.\n'));
    process.exit(1);
  }

  console.log('');
  console.log(chalk.dim(`  🔓 Releasing zone "${zone}"...`));

  const result = releaseZone(projectRoot, zone);

  if (result.success) {
    console.log(chalk.green(`  ✔ ${result.message}`));

    // Regenerate all AI config files
    console.log(chalk.dim('  📝 Updating AI config files...'));
    const updatedConfig = readConfig(projectRoot);
    generateAllConfigs(projectRoot, updatedConfig);
    console.log(chalk.green('  ✔ All config files updated.'));
  } else {
    console.log(chalk.red(`  ✖ ${result.message}`));
  }

  console.log('');
}
