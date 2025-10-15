#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');

mkdirSync(distDir, { recursive: true });

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const argOutput = process.argv[2];
const outputName = argOutput ? (argOutput.endsWith('.zip') ? argOutput : `${argOutput}.zip`) : `propad-${timestamp}.zip`;
const outputPath = path.join(distDir, outputName);

const excludePatterns = [
  '.git/*',
  'dist/*',
  'node_modules/*',
  '**/node_modules/*',
  'apps/web/.next/*',
  'apps/web/out/*',
  'apps/api/dist/*',
  'coverage/*',
  'playwright-report/*',
  '*.log',
  'pnpm-lock.yaml',
  'yarn.lock'
];

const zipArgs = ['-r', outputPath, '.', ...excludePatterns.flatMap((pattern) => ['-x', pattern])];

const result = spawnSync('zip', zipArgs, {
  cwd: rootDir,
  stdio: 'inherit'
});

if (result.error) {
  console.error(`Failed to run zip: ${result.error.message}`);
  process.exit(1);
}

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

console.log(`\nCreated PropAd artifact at ${outputPath}`);
console.log('Unzip the file, run "npm install", copy env templates, and start Docker using infrastructure/docker-compose.yml.');
