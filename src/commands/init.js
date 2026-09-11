/**
 * ofa init — Initialize ONEFORALL in the current project
 *
 * Scans the project structure, detects zones, generates:
 * - .ofa/config.yml (ownership manifest)
 * - AI config files for all platforms (Copilot, Cursor, Gemini, Claude)
 * - CODEOWNERS
 * - GitHub Actions workflow
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import path from 'path';
import { findProjectRoot, configExists, createDefaultConfig, writeConfig, readConfig } from '../config.js';
import { scanProject } from '../scanner.js';
import { generateCopilotInstructions } from '../generators/copilot.js';
import { generateCursorRules } from '../generators/cursor.js';
import { generateGeminiInstructions } from '../generators/gemini.js';
import { generateClaudeInstructions } from '../generators/claude.js';
import { generateCodeowners } from '../generators/codeowners.js';
import { generateGithubActions } from '../generators/github-actions.js';

export async function initCommand(options) {
  const projectRoot = findProjectRoot();

  console.log('');
  console.log(chalk.bold.cyan('  ╔══════════════════════════════════════════╗'));
  console.log(chalk.bold.cyan('  ║') + chalk.bold.white('    🚀 ONEFORALL — Project Initialization   ') + chalk.bold.cyan('║'));
  console.log(chalk.bold.cyan('  ╚══════════════════════════════════════════╝'));
  console.log('');

  // Check if already initialized
  if (configExists(projectRoot) && !options.force) {
    console.log(chalk.yellow('  ⚠️  ONEFORALL is already initialized in this project.'));
    console.log(chalk.dim('     Use --force to reinitialize, or run `ofa sync` to update configs.'));
    console.log('');
    return;
  }

  // Scan the project
  console.log(chalk.dim('  📁 Scanning project structure...'));
  const scan = scanProject(projectRoot);
  console.log('');
  console.log(chalk.green('  ✔ Project type detected: ') + chalk.bold(scan.projectType));
  console.log(chalk.green('  ✔ Directories found: ') + chalk.bold(scan.stats.totalDirs));
  console.log(chalk.green('  ✔ Files found: ') + chalk.bold(scan.stats.totalFiles));
  console.log('');

  // Show detected zones
  const zoneCount = Object.keys(scan.detectedZones).length;
  console.log(chalk.cyan(`  📋 Detected ${zoneCount} ownership zone(s):`));
  console.log('');

  for (const [name, zone] of Object.entries(scan.detectedZones)) {
    const paths = zone.paths.map(p => chalk.dim(p)).join(', ');
    console.log(`     ${chalk.bold.white(name)} → ${paths}`);
    console.log(`     ${chalk.dim(zone.description)}`);
    console.log('');
  }

  // Interactive confirmation (unless --yes)
  let projectName = path.basename(projectRoot);
  let confirmedZones = scan.detectedZones;

  if (!options.yes) {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'projectName',
        message: 'Project name:',
        default: projectName,
      },
      {
        type: 'confirm',
        name: 'acceptZones',
        message: 'Accept detected zones? (You can edit .ofa/config.yml later)',
        default: true,
      },
    ]);

    projectName = answers.projectName;

    if (!answers.acceptZones) {
      console.log(chalk.yellow('\n  Edit .ofa/config.yml after initialization to customize zones.'));
    }
  }

  // Create config
  console.log('');
  console.log(chalk.dim('  ⚙️  Generating configuration...'));

  const config = createDefaultConfig(projectName, scan.projectType, confirmedZones);
  writeConfig(projectRoot, config);
  console.log(chalk.green('  ✔ ') + chalk.dim('.ofa/config.yml'));

  // Generate all AI config files
  console.log(chalk.dim('  📝 Generating AI config files...'));

  const generated = generateAllConfigs(projectRoot, config);
  for (const file of generated) {
    const relative = path.relative(projectRoot, file);
    console.log(chalk.green('  ✔ ') + chalk.dim(relative));
  }

  // Summary
  console.log('');
  console.log(chalk.bold.green('  ✅ ONEFORALL initialized successfully!'));
  console.log('');
  console.log(chalk.white('  Next steps:'));
  console.log(chalk.dim('  1. ') + chalk.white('Review and edit ') + chalk.cyan('.ofa/config.yml') + chalk.white(' to customize zones'));
  console.log(chalk.dim('  2. ') + chalk.white('Claim your zone: ') + chalk.cyan('ofa claim <zone> --user <github-username>'));
  console.log(chalk.dim('  3. ') + chalk.white('Check status: ') + chalk.cyan('ofa status'));
  console.log(chalk.dim('  4. ') + chalk.white('Commit the generated files to your repo'));
  console.log('');
}

/**
 * Generate all AI config files from a config object.
 * Returns an array of generated file paths.
 */
export function generateAllConfigs(projectRoot, config) {
  const generated = [];

  try {
    generated.push(generateCopilotInstructions(projectRoot, config));
  } catch (e) {
    console.error(chalk.red(`  ✖ Failed to generate Copilot instructions: ${e.message}`));
  }

  try {
    generated.push(generateCursorRules(projectRoot, config));
  } catch (e) {
    console.error(chalk.red(`  ✖ Failed to generate Cursor rules: ${e.message}`));
  }

  try {
    const files = generateGeminiInstructions(projectRoot, config);
    generated.push(...files);
  } catch (e) {
    console.error(chalk.red(`  ✖ Failed to generate Gemini instructions: ${e.message}`));
  }

  try {
    generated.push(generateClaudeInstructions(projectRoot, config));
  } catch (e) {
    console.error(chalk.red(`  ✖ Failed to generate Claude instructions: ${e.message}`));
  }

  try {
    generated.push(generateCodeowners(projectRoot, config));
  } catch (e) {
    console.error(chalk.red(`  ✖ Failed to generate CODEOWNERS: ${e.message}`));
  }

  try {
    generated.push(generateGithubActions(projectRoot, config));
  } catch (e) {
    console.error(chalk.red(`  ✖ Failed to generate GitHub Actions workflow: ${e.message}`));
  }

  return generated;
}
