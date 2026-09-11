/**
 * ofa status — Show current zone ownership and team overview
 *
 * Displays a beautiful terminal table of who owns what,
 * with optional JSON output for CI/CD integration.
 */

import chalk from 'chalk';
import { findProjectRoot } from '../config.js';
import { getOwnershipStatus } from '../lock-manager.js';

export async function statusCommand(options) {
  const projectRoot = findProjectRoot();
  const status = getOwnershipStatus(projectRoot);

  if (!status) {
    console.log(chalk.red('\n  ✖ No .ofa/config.yml found. Run "ofa init" first.\n'));
    process.exit(1);
  }

  // JSON output for CI
  if (options.json) {
    console.log(JSON.stringify(status, null, 2));
    return;
  }

  // Pretty terminal output
  console.log('');
  console.log(chalk.bold.cyan('  ╔══════════════════════════════════════════╗'));
  console.log(chalk.bold.cyan('  ║') + chalk.bold.white('    🛡️  ONEFORALL — Ownership Status       ') + chalk.bold.cyan('║'));
  console.log(chalk.bold.cyan('  ╚══════════════════════════════════════════╝'));
  console.log('');
  console.log(chalk.dim(`  Project: ${status.project.name} (${status.project.type})`));
  console.log('');

  // Zone table
  const maxNameLen = Math.max(...status.zones.map(z => z.name.length), 6);
  const maxOwnerLen = Math.max(...status.zones.map(z => (z.owner || 'unclaimed').length + 1), 7);
  const maxPathLen = Math.max(...status.zones.map(z => z.paths.join(', ').length), 5);

  const header = `  ${'Zone'.padEnd(maxNameLen + 2)} ${'Owner'.padEnd(maxOwnerLen + 2)} ${'Paths'.padEnd(maxPathLen + 2)} Status`;
  const separator = `  ${'─'.repeat(maxNameLen + 2)} ${'─'.repeat(maxOwnerLen + 2)} ${'─'.repeat(maxPathLen + 2)} ${'─'.repeat(10)}`;

  console.log(chalk.bold.white(header));
  console.log(chalk.dim(separator));

  for (const zone of status.zones) {
    const name = zone.name.padEnd(maxNameLen + 2);
    const owner = (zone.owner ? `@${zone.owner}` : '—').padEnd(maxOwnerLen + 2);
    const paths = zone.paths.join(', ').padEnd(maxPathLen + 2);

    let statusIcon;
    if (zone.owner) {
      statusIcon = chalk.red('🔴 Claimed');
    } else {
      statusIcon = chalk.green('🟢 Free');
    }

    const sharedTag = zone.require_all_owners ? chalk.yellow(' 🔗') : '';

    const ownerColor = zone.owner ? chalk.bold.white(owner) : chalk.dim(owner);

    console.log(`  ${chalk.cyan(name)} ${ownerColor} ${chalk.dim(paths)} ${statusIcon}${sharedTag}`);

    if (zone.expires_at) {
      const expiresDate = new Date(zone.expires_at);
      const hoursLeft = Math.max(0, Math.round((expiresDate - Date.now()) / (1000 * 60 * 60)));
      console.log(chalk.dim(`  ${''.padEnd(maxNameLen + 2)} expires in ~${hoursLeft}h`));
    }
  }

  console.log('');

  // Rules
  if (status.rules && status.rules.length > 0) {
    console.log(chalk.dim('  Rules:'));
    for (const rule of status.rules) {
      console.log(chalk.dim(`    • ${rule}`));
    }
    console.log('');
  }

  // Quick reference
  console.log(chalk.dim('  Commands: ofa claim <zone>  |  ofa release <zone>  |  ofa guard  |  ofa sync'));
  console.log('');
}
