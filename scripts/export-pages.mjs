// GitHub Pages build: expo export, then 404.html, .nojekyll and an index.html copy per route so deep links return 200.
import { execSync } from 'node:child_process';
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
execSync('npx expo export --platform web', { stdio: 'inherit' });
const sections = ['hand', 'precision', 'bolting', 'rigging', 'power', 'machinist', 'shims', 'layout', 'lubrication', 'ppe', 'storage'];
const routes = [...sections.map((s) => `category/${s}`), 'shop/cart', 'my-tools'];
copyFileSync('dist/index.html', 'dist/404.html');
writeFileSync('dist/.nojekyll', '');
for (const r of routes) { mkdirSync(`dist/${r}`, { recursive: true }); copyFileSync('dist/index.html', `dist/${r}/index.html`); }
console.log(`Pages build ready: ${routes.length} route copies, 404.html, .nojekyll`);
