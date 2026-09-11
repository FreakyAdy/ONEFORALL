/**
 * Claude Instructions Generator
 *
 * Generates/updates CLAUDE.md with zone ownership boundaries.
 * If a CLAUDE.md already exists (e.g., with Karpathy's guidelines),
 * we append our ownership section rather than overwriting.
 */

import fs from 'fs';
import path from 'path';

const OFA_MARKER_START = '<!-- OFA:START -->';
const OFA_MARKER_END = '<!-- OFA:END -->';

/**
 * Generate or update CLAUDE.md
 *
 * @param {string} projectRoot
 * @param {object} config - The .ofa/config.yml content
 */
export function generateClaudeInstructions(projectRoot, config) {
  const outputFile = path.join(projectRoot, 'CLAUDE.md');
  const ofaSection = buildClaudeSection(config);

  if (fs.existsSync(outputFile)) {
    // File exists — update the OFA section or append it
    let existing = fs.readFileSync(outputFile, 'utf-8');

    if (existing.includes(OFA_MARKER_START)) {
      // Replace existing OFA section
      const regex = new RegExp(
        `${escapeRegex(OFA_MARKER_START)}[\\s\\S]*?${escapeRegex(OFA_MARKER_END)}`,
        'g'
      );
      existing = existing.replace(regex, ofaSection);
    } else {
      // Append OFA section
      existing = existing.trimEnd() + '\n\n' + ofaSection;
    }

    fs.writeFileSync(outputFile, existing, 'utf-8');
  } else {
    // Create new file
    fs.writeFileSync(outputFile, ofaSection, 'utf-8');
  }

  return outputFile;
}

function buildClaudeSection(config) {
  const lines = [];

  lines.push(OFA_MARKER_START);
  lines.push('');
  lines.push('## ONEFORALL — Zone Ownership (Auto-generated)');
  lines.push('');
  lines.push('> ⚠️ This section is managed by ONEFORALL (ofa). Do not edit manually.');
  lines.push('> Edit `.ofa/config.yml` and run `ofa sync` to update.');
  lines.push('');
  lines.push('This project uses zone-based ownership for multi-developer AI collaboration.');
  lines.push('');

  // Ownership table
  lines.push('### Current Ownership Map');
  lines.push('');
  lines.push('| Zone | Owner | Paths | Notes |');
  lines.push('|------|-------|-------|-------|');
  for (const [name, zone] of Object.entries(config.zones)) {
    const owner = zone.owner ? `@${zone.owner}` : '_unclaimed_';
    const paths = zone.paths.join(', ');
    const notes = zone.require_all_owners ? 'Shared — all owners must review' : zone.description;
    lines.push(`| ${name} | ${owner} | ${paths} | ${notes} |`);
  }
  lines.push('');

  // Rules
  lines.push('### Rules');
  lines.push('');
  lines.push('1. **Check zone ownership before editing any file.**');
  lines.push('2. **Do NOT modify files in zones owned by another developer.**');
  lines.push('3. **Shared zones require review from all active zone owners.**');
  lines.push('4. **Use feature branches, never commit to main directly.**');
  lines.push('5. **Run `ofa guard` before committing to verify boundaries.**');
  lines.push('');

  if (config.rules && config.rules.length > 0) {
    lines.push('### Additional Rules');
    lines.push('');
    for (const rule of config.rules) {
      lines.push(`- ${rule}`);
    }
    lines.push('');
  }

  lines.push(OFA_MARKER_END);

  return lines.join('\n');
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
