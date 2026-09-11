/**
 * ofa doctor — Diagnostic self-check
 *
 * Validates the ONEFORALL installation, developer identity, configuration,
 * and runs a synthetic test of boundary protection.
 */

import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { findProjectRoot, readConfig, configExists, writeConfig } from '../config.js';
import { resolveIdentity, isValidGithubHandle } from '../identity.js';
import { checkBoundaryViolations, fileInZone } from '../lock-manager.js';

export async function doctorCommand() {
  const projectRoot = findProjectRoot();
  let hasErrors = false;
  let hasWarnings = false;

  console.log('');
  console.log(chalk.bold.cyan('  🩺 ONEFORALL Doctor — System Diagnostics'));
  console.log(chalk.dim('  Running health checks on your setup...\n'));

  // ── Check 1: CLI Version ────────────────────────────────────────────────
  try {
    const pkgPath = path.resolve(new URL('../../package.json', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'));
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    console.log(chalk.green('  ✔ [CLI] ') + `ONEFORALL v${pkg.version} is installed and executable`);
  } catch {
    console.log(chalk.green('  ✔ [CLI] ') + 'ONEFORALL is installed and executable');
  }

  // ── Check 2: Developer Identity ─────────────────────────────────────────
  const identity = await resolveIdentity({}, projectRoot);
  if (!identity.handle) {
    hasErrors = true;
    console.log(chalk.red('  ✖ [Identity] ') + 'Could not resolve a valid GitHub handle');
    if (identity.warning) {
      console.log(chalk.dim(`    Details: ${identity.warning}`));
    }
    console.log(chalk.yellow('    👉 Fix: Run "ofa whoami --set <your-github-username>"'));
  } else if (identity.source === 'git') {
    hasWarnings = true;
    console.log(chalk.yellow('  ⚠️  [Identity] ') + `Resolved @${identity.handle} from git config (unverified guess)`);
    console.log(chalk.dim('    👉 Tip: Run "ofa whoami --set ' + identity.handle + '" to verify your handle'));
  } else {
    console.log(chalk.green('  ✔ [Identity] ') + `Active handle @${identity.handle} (source: ${identity.source})`);
  }

  // ── Check 3: Configuration & Zone Integrity ─────────────────────────────
  if (!configExists(projectRoot)) {
    hasWarnings = true;
    console.log(chalk.yellow('  ⚠️  [Config] ') + 'No .ofa/config.yml found in project');
    console.log(chalk.dim('    👉 Tip: Run "ofa init" to initialize ownership zones'));
  } else {
    const config = readConfig(projectRoot);
    if (!config || !config.zones) {
      hasErrors = true;
      console.log(chalk.red('  ✖ [Config] ') + '.ofa/config.yml exists but is missing "zones" map');
      console.log(chalk.yellow('    👉 Fix: Run "ofa init --force" to re-generate configuration'));
    } else {
      const zoneNames = Object.keys(config.zones);
      let invalidOwners = 0;
      let unnormalizedPaths = 0;

      for (const [name, zone] of Object.entries(config.zones)) {
        if (zone.owner && !isValidGithubHandle(zone.owner)) {
          invalidOwners++;
          console.log(chalk.red(`  ✖ [Zone: ${name}] `) + `Invalid owner "@${zone.owner}" (contains spaces or invalid characters)`);
          console.log(chalk.yellow(`    👉 Fix: Change owner to a valid GitHub username, or run "ofa release ${name} --force"`));
        }
        if (Array.isArray(zone.paths)) {
          for (const p of zone.paths) {
            if (!p.endsWith('/') && !path.extname(p)) {
              unnormalizedPaths++;
            }
          }
        }
      }

      if (invalidOwners > 0) {
        hasErrors = true;
      } else {
        console.log(chalk.green('  ✔ [Config] ') + `All ${zoneNames.length} zone owners are valid GitHub handles`);
      }

      if (unnormalizedPaths > 0) {
        hasWarnings = true;
        console.log(chalk.yellow('  ⚠️  [Paths] ') + `${unnormalizedPaths} zone path(s) lack trailing slashes`);
        console.log(chalk.dim('    👉 Tip: Run "ofa sync" to automatically normalize all zone paths'));
      }
    }
  }

  // ── Check 4: Synthetic Boundary Engine Test ─────────────────────────────
  let enginePassed = false;
  try {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ofa-doctor-'));
    try {
      const testConfig = {
        version: 1,
        project: { name: 'doctor-test', type: 'test' },
        zones: {
          api: {
            paths: ['src/api/'],
            owner: 'alice',
            description: 'API zone',
          },
        },
        locks: [],
      };
      writeConfig(tempDir, testConfig);

      // Boundary check 1: Alice modifies own zone -> 0 violations
      const r1 = checkBoundaryViolations(tempDir, ['src/api/users.js'], 'alice');
      // Boundary check 2: Bob modifies Alice's zone -> 1 violation
      const r2 = checkBoundaryViolations(tempDir, ['src/api/users.js'], 'bob');
      // Boundary check 3: Prefix safety -> src/api-legacy is not matched by src/api
      const safePrefix = !fileInZone('src/api-legacy/old.js', { paths: ['src/api/'] });

      if (r1.violations.length === 0 && r2.violations.length === 1 && safePrefix) {
        enginePassed = true;
      }
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  } catch {
    enginePassed = false;
  }

  if (enginePassed) {
    console.log(chalk.green('  ✔ [Engine] ') + 'Synthetic boundary check and path isolation passed');
  } else {
    hasErrors = true;
    console.log(chalk.red('  ✖ [Engine] ') + 'Synthetic boundary check failed internal assertions');
    console.log(chalk.yellow('    👉 Fix: Check file permissions and lock-manager installation'));
  }

  console.log('');
  if (hasErrors) {
    console.log(chalk.red.bold('  ❌ Diagnostics found issues that require attention. See fixes above.\n'));
    process.exit(1);
  } else if (hasWarnings) {
    console.log(chalk.yellow.bold('  ⚠️  Diagnostics passed with warnings. Your setup is functional.\n'));
  } else {
    console.log(chalk.green.bold('  ✅ All checks passed! ONEFORALL is fully configured and ready.\n'));
  }
}
