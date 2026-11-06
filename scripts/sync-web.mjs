import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const outputDirectory = resolve('dist');
const deploymentDirectory = resolve('www');
const publicDirectory = resolve('public');
const serviceWorker = resolve('sw.js');

if (!existsSync(resolve(outputDirectory, 'index.html'))) {
  throw new Error('Production build is missing dist/index.html. Run the Vite build first.');
}

cpSync(publicDirectory, resolve(outputDirectory, 'public'), { recursive: true, force: true });
cpSync(serviceWorker, resolve(outputDirectory, 'sw.js'));
mkdirSync(deploymentDirectory, { recursive: true });
cpSync(outputDirectory, deploymentDirectory, { recursive: true, force: true });

console.log(`Synchronized the production web app to ${deploymentDirectory}.`);
