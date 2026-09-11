#!/usr/bin/env node

/**
 * ONEFORALL (ofa) — Universal AI Collaboration CLI
 *
 * Enables multiple developers and their AI agents to work on the same
 * GitHub repo without merge conflicts through ownership zones,
 * file locking, and cross-platform AI config generation.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { initCommand } from '../src/commands/init.js';
import { claimCommand } from '../src/commands/claim.js';
import { releaseCommand } from '../src/commands/release.js';
import { statusCommand } from '../src/commands/status.js';
import { guardCommand } from '../src/commands/guard.js';
import { syncCommand } from '../src/commands/sync.js';

const program = new Command();

program
  .name('ofa')
  .description(
    chalk.bold('ONEFORALL') +
    ' — Universal AI Collaboration Tool for GitHub Teams\n\n' +
    '  Let multiple developers and their AI agents work on the same\n' +
    '  repo without merge conflicts.'
  )
  .version('0.1.0');

// ── ofa init ──────────────────────────────────────────────────────────────
program
  .command('init')
  .description('Initialize ONEFORALL in the current project — scans structure, generates AI configs & ownership map')
  .option('-y, --yes', 'Skip interactive prompts and use detected defaults')
  .option('--force', 'Overwrite existing .ofa config')
  .action(initCommand);

// ── ofa claim ─────────────────────────────────────────────────────────────
program
  .command('claim <zone>')
  .description('Claim ownership of a zone (e.g., "backend", "frontend")')
  .option('-u, --user <username>', 'GitHub username of the developer claiming the zone')
  .option('--ttl <hours>', 'Auto-release after N hours (default: 24)', '24')
  .action(claimCommand);

// ── ofa release ───────────────────────────────────────────────────────────
program
  .command('release <zone>')
  .description('Release ownership of a previously claimed zone')
  .action(releaseCommand);

// ── ofa status ────────────────────────────────────────────────────────────
program
  .command('status')
  .description('Show current zone ownership, active locks, and team overview')
  .option('--json', 'Output as JSON for CI/CD integration')
  .action(statusCommand);

// ── ofa guard ─────────────────────────────────────────────────────────────
program
  .command('guard')
  .description('Check that staged/committed changes respect ownership boundaries')
  .option('--staged', 'Check only staged changes (for pre-commit hooks)')
  .option('--pr <number>', 'Check changes for a specific PR (for CI)')
  .option('--strict', 'Exit with error code on any violation')
  .action(guardCommand);

// ── ofa sync ──────────────────────────────────────────────────────────────
program
  .command('sync')
  .description('Regenerate all AI config files from the current .ofa/config.yml')
  .action(syncCommand);

// ── Parse & Run ───────────────────────────────────────────────────────────
program.parse();
