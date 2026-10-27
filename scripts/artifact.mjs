// Turns the single-file build (dist-single/index.html) into a page body that
// can be published as a hosted page: no <html>/<head>/<body> wrappers.
// usage: npm run build:single && node scripts/artifact.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const html = readFileSync('dist-single/index.html', 'utf8');
const pick = (re) => [...html.matchAll(re)].map((m) => m[0]);
const styles = pick(/<style[\s\S]*?<\/style>/g);
const scripts = pick(/<script[\s\S]*?<\/script>/g);
const body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/)[1].replace(/<script[\s\S]*?<\/script>/g, '');
const out = [
  '<title>Swarmbreak</title>',
  '<meta name="description" content="Swarmbreak — a sci-fi dark fantasy horde-survival roguelite.">',
  ...styles,
  body.trim(),
  ...scripts,
].join('\n');
writeFileSync('dist-single/swarmbreak.html', out);
console.log('wrote dist-single/swarmbreak.html', (out.length / 1024).toFixed(0), 'KB');
