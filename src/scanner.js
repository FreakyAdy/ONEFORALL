/**
 * Project Scanner — detects project structure, language, framework,
 * and suggests ownership zones based on directory patterns.
 */

import fs from 'fs';
import path from 'path';

// ── Known directory patterns mapped to zone suggestions ─────────────────

const ZONE_PATTERNS = {
  // Backend patterns
  backend: {
    dirs: ['backend', 'server', 'api', 'src/api', 'src/server', 'app/api', 'src/routes', 'src/controllers', 'src/services', 'src/models'],
    description: 'Backend API, services, and business logic',
  },
  frontend: {
    dirs: ['frontend', 'client', 'web', 'src/components', 'src/pages', 'src/views', 'src/app', 'app', 'components', 'pages'],
    description: 'Frontend UI components, pages, and views',
  },
  shared: {
    dirs: ['shared', 'common', 'lib', 'src/lib', 'src/types', 'src/utils', 'src/shared', 'src/common', 'packages/shared', 'types'],
    description: 'Shared types, utilities, and common code — changes require review from all zone owners',
  },
  database: {
    dirs: ['db', 'database', 'migrations', 'prisma', 'drizzle', 'src/db', 'src/database', 'supabase'],
    description: 'Database schemas, migrations, and data layer',
  },
  infra: {
    dirs: ['infra', 'infrastructure', 'terraform', 'pulumi', 'cdk', 'deploy', 'docker', '.github', 'ci', 'k8s', 'kubernetes'],
    description: 'Infrastructure, CI/CD, deployment, and DevOps',
  },
  docs: {
    dirs: ['docs', 'documentation', 'wiki'],
    description: 'Documentation and guides',
  },
  mobile: {
    dirs: ['mobile', 'ios', 'android', 'app/src', 'src/mobile'],
    description: 'Mobile app code (iOS, Android, React Native, Flutter)',
  },
  tests: {
    dirs: ['test', 'tests', '__tests__', 'spec', 'e2e', 'cypress', 'playwright'],
    description: 'Test suites and testing infrastructure',
  },
};

// ── Project type detection ──────────────────────────────────────────────

const PROJECT_INDICATORS = {
  'next.js': ['next.config.js', 'next.config.mjs', 'next.config.ts'],
  'react': ['src/App.jsx', 'src/App.tsx', 'src/index.jsx', 'src/index.tsx'],
  'vue': ['vue.config.js', 'src/App.vue', 'nuxt.config.js', 'nuxt.config.ts'],
  'angular': ['angular.json', 'src/app/app.module.ts'],
  'express': ['src/server.js', 'src/app.js', 'server.js', 'app.js'],
  'fastapi': ['main.py', 'app/main.py', 'requirements.txt'],
  'django': ['manage.py', 'settings.py'],
  'flask': ['app.py', 'wsgi.py'],
  'monorepo': ['packages/', 'apps/', 'lerna.json', 'pnpm-workspace.yaml', 'turbo.json'],
  'rust': ['Cargo.toml', 'src/main.rs'],
  'go': ['go.mod', 'main.go'],
  'dotnet': ['*.sln', '*.csproj'],
  'java': ['pom.xml', 'build.gradle', 'build.gradle.kts'],
  'flutter': ['pubspec.yaml', 'lib/main.dart'],
  'react-native': ['metro.config.js', 'app.json'],
};

/**
 * Scan a project directory and return a structured analysis.
 *
 * @param {string} projectRoot - Absolute path to the project root
 * @returns {{ projectType: string, detectedZones: object, stats: object }}
 */
export function scanProject(projectRoot) {
  const entries = getDirectoryTree(projectRoot, 2); // scan 2 levels deep
  const projectType = detectProjectType(projectRoot, entries);
  const detectedZones = detectZones(projectRoot, entries);
  const stats = {
    totalDirs: entries.filter(e => e.isDirectory).length,
    totalFiles: entries.filter(e => !e.isDirectory).length,
    topLevelDirs: entries.filter(e => e.isDirectory && e.depth === 1).map(e => e.relativePath),
  };

  return { projectType, detectedZones, stats };
}

/**
 * Get a shallow directory tree (up to `maxDepth` levels)
 */
function getDirectoryTree(root, maxDepth, currentDepth = 0) {
  const results = [];
  if (currentDepth > maxDepth) return results;

  let items;
  try {
    items = fs.readdirSync(root, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const item of items) {
    // Skip hidden dirs, node_modules, etc.
    if (item.name.startsWith('.') && item.name !== '.github') continue;
    if (['node_modules', 'dist', 'build', '.next', '__pycache__', 'venv', '.venv', 'target'].includes(item.name)) continue;

    const fullPath = path.join(root, item.name);
    const relativePath = path.relative(path.resolve(root, currentDepth === 0 ? '.' : '..'.repeat(currentDepth)), fullPath);
    const relativeFromRoot = path.relative(path.resolve(root, '..'.repeat(currentDepth)), fullPath);

    results.push({
      name: item.name,
      relativePath: item.name,
      fullPath,
      isDirectory: item.isDirectory(),
      depth: currentDepth + 1,
    });

    if (item.isDirectory() && currentDepth < maxDepth) {
      const children = getDirectoryTree(fullPath, maxDepth, currentDepth + 1);
      for (const child of children) {
        child.relativePath = path.join(item.name, child.relativePath).replace(/\\/g, '/');
        results.push(child);
      }
    }
  }
  return results;
}

/**
 * Detect the project type based on known indicator files.
 */
function detectProjectType(root, entries) {
  const fileNames = entries.filter(e => !e.isDirectory).map(e => e.relativePath.replace(/\\/g, '/'));
  const dirNames = entries.filter(e => e.isDirectory).map(e => e.relativePath.replace(/\\/g, '/'));

  for (const [type, indicators] of Object.entries(PROJECT_INDICATORS)) {
    for (const indicator of indicators) {
      if (indicator.endsWith('/')) {
        // directory check
        const dirName = indicator.slice(0, -1);
        if (dirNames.some(d => d === dirName || d.endsWith('/' + dirName))) {
          return type;
        }
      } else if (indicator.startsWith('*')) {
        // glob check
        const ext = indicator.slice(1);
        if (fileNames.some(f => f.endsWith(ext))) {
          return type;
        }
      } else {
        // exact file check
        if (fileNames.includes(indicator) || fs.existsSync(path.join(root, indicator))) {
          return type;
        }
      }
    }
  }

  // Fallback detection
  if (fs.existsSync(path.join(root, 'package.json'))) return 'node';
  if (fs.existsSync(path.join(root, 'requirements.txt')) || fs.existsSync(path.join(root, 'pyproject.toml'))) return 'python';
  return 'unknown';
}

/**
 * Detect ownership zones based on existing directories.
 */
function detectZones(root, entries) {
  const dirNames = entries
    .filter(e => e.isDirectory)
    .map(e => e.relativePath.replace(/\\/g, '/'));

  const detected = {};

  for (const [zoneName, zoneConfig] of Object.entries(ZONE_PATTERNS)) {
    const matchedPaths = [];

    for (const pattern of zoneConfig.dirs) {
      // Check if this pattern matches any directory
      if (dirNames.includes(pattern)) {
        matchedPaths.push(pattern + '/');
      }
      // Also check if it exists directly
      if (fs.existsSync(path.join(root, pattern)) && fs.statSync(path.join(root, pattern)).isDirectory()) {
        const normalized = pattern + '/';
        if (!matchedPaths.includes(normalized)) {
          matchedPaths.push(normalized);
        }
      }
    }

    if (matchedPaths.length > 0) {
      detected[zoneName] = {
        paths: matchedPaths,
        owner: null,
        description: zoneConfig.description,
        ...(zoneName === 'shared' ? { require_all_owners: true } : {}),
      };
    }
  }

  // If no zones detected, create a default "main" zone with the src/ directory
  if (Object.keys(detected).length === 0) {
    if (fs.existsSync(path.join(root, 'src'))) {
      detected['main'] = {
        paths: ['src/'],
        owner: null,
        description: 'Main source code',
      };
    } else {
      detected['main'] = {
        paths: ['./'],
        owner: null,
        description: 'Entire project (no structure detected — run ofa init after setting up your project)',
      };
    }
  }

  return detected;
}
