/**
 * GitHub Actions Workflow Generator
 *
 * Generates .github/workflows/ofa-guard.yml that runs `ofa guard`
 * on every pull request to enforce ownership boundaries in CI.
 */

import fs from 'fs';
import path from 'path';

/**
 * Generate the GitHub Actions workflow file
 *
 * @param {string} projectRoot
 * @param {object} config - The .ofa/config.yml content
 */
export function generateGithubActions(projectRoot, config) {
  const outputDir = path.join(projectRoot, '.github', 'workflows');
  const outputFile = path.join(outputDir, 'ofa-guard.yml');

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const content = buildWorkflowContent(config);
  fs.writeFileSync(outputFile, content, 'utf-8');
  return outputFile;
}

function buildWorkflowContent(config) {
  return `# ONEFORALL Guard — Auto-generated CI check
# Validates that PRs respect zone ownership boundaries.
# Edit .ofa/config.yml and run \`ofa sync\` to regenerate.

name: OFA Guard — Ownership Check

on:
  pull_request:
    branches: [main, master, develop]

permissions:
  contents: read
  pull-requests: write

jobs:
  ownership-check:
    name: Check Zone Boundaries
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Need full history to detect changed files

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install ONEFORALL
        run: npm install -g github:FreakyAdy/ONEFORALL

      - name: Get changed files
        id: changed
        run: |
          FILES=$(git diff --name-only origin/\${{ github.base_ref }}..HEAD | tr '\\n' ' ')
          echo "files=$FILES" >> $GITHUB_OUTPUT

      - name: Run OFA Guard
        run: ofa guard --strict
        env:
          OFA_PR_NUMBER: \${{ github.event.pull_request.number }}
          OFA_PR_AUTHOR: \${{ github.event.pull_request.user.login }}
          CHANGED_FILES: \${{ steps.changed.outputs.files }}

      - name: Post ownership summary
        if: always()
        run: |
          echo "## 🛡️ ONEFORALL Ownership Check" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          ofa status --json | node -e "
            const data = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
            console.log('| Zone | Owner | Paths |');
            console.log('|------|-------|-------|');
            data.zones.forEach(z => {
              console.log('| ' + z.name + ' | ' + (z.owner || '_unclaimed_') + ' | ' + z.paths.join(', ') + ' |');
            });
          " >> $GITHUB_STEP_SUMMARY 2>/dev/null || echo "Could not generate summary" >> $GITHUB_STEP_SUMMARY
`;
}
