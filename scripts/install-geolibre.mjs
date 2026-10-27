import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

// Source/build is intentionally outside npm dependencies. See docs/geolibre-workspace.md.
const commit = '0dc5abc3026bbbfbb8e866bb09822c109cc285ab';
const source = resolve(process.argv[2] || '../GeoLibre');
const actual = execFileSync('git', ['-C', source, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
if (actual !== commit) throw new Error(`GeoLibre commit must be ${commit}, received ${actual}`);
if (execFileSync('git', ['-C', source, 'status', '--porcelain', '--untracked-files=no'], { encoding: 'utf8' }).trim()) throw new Error('GeoLibre tracked source must be clean');
const dist = join(source, 'apps/geolibre-desktop/dist-embed');
if (!existsSync(join(dist, 'index.html'))) throw new Error('Run GeoLibre npm run build:embed at the pinned commit first');
const index = readFileSync(join(dist, 'index.html'), 'utf8');
if (!index.includes('./assets/') || !index.includes('geolibre-runtime-config.js')) throw new Error('Expected relative-path embed build with runtime configuration');
const target = resolve('public/geolibre');
mkdirSync(target, { recursive: true });
cpSync(dist, target, { recursive: true });
cpSync(join(source, 'LICENSE'), join(target, 'LICENSE.txt'));
// Keep projection controlled by the host so saved state cannot silently diverge.
writeFileSync(join(target, 'quasar-host.css'), 'body { background: #081423; } .maplibregl-ctrl-globe, .maplibregl-ctrl-globe-enabled { display: none !important; }\n');
writeFileSync(join(target, 'index.html'), index.replace('</head>', '<link rel="stylesheet" href="./quasar-host.css"></head>'));
writeFileSync(join(target, 'geolibre-runtime-config.js'), `window.__GEOLIBRE_DEPLOYMENT_ENV__ = { VITE_GEOLIBRE_EMBED_ORIGINS: window.location.origin, VITE_GEOLIBRE_SHARE_URL: 'off' };\n`);
writeFileSync(join(target, 'quasar-build.json'), JSON.stringify({ project: 'opengeos/GeoLibre', version: '2.5.0', commit, indexSha256: createHash('sha256').update(index).digest('hex'), installedAt: new Date().toISOString() }, null, 2));
console.log('Installed pinned GeoLibre embed into public/geolibre');
