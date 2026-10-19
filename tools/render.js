import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import { serve } from './serve.js';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')).map(([k, v]) => [k, v ?? 'true']));
const width = parseInt(args.w || '1920', 10);
const height = parseInt(args.h || '1080', 10);
const quality = args.quality || 'high';
const views = (args.views || 'vista,hero,waterfall').split(',');
const time = args.time || '12';
const outDir = path.resolve(root, args.out || 'renders');
const port = parseInt(args.port || '4174', 10);
const suffix = args.suffix ? `-${args.suffix}` : '';
const pageName = args.page || '';
const extra = args.params ? `&${args.params}` : '';

const chromeCandidates = [process.env.CHROME_PATH, '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].filter(Boolean);
const executablePath = chromeCandidates.find((p) => fs.existsSync(p));
if (!executablePath) {
  console.error('No Chrome/Chromium found. Set CHROME_PATH.');
  process.exit(1);
}
if (!fs.existsSync(path.join(root, 'dist', 'index.html'))) {
  console.error('dist/ missing. Run "npm run build" first.');
  process.exit(1);
}
fs.mkdirSync(outDir, { recursive: true });

const server = await serve({ dir: path.join(root, 'dist'), listenPort: port });
const gpu = args.gpu === 'true';
const browser = await puppeteer.launch({
  executablePath,
  headless: true,
  protocolTimeout: 30 * 60 * 1000,
  args: [
    '--no-sandbox', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-dev-shm-usage',
    ...(gpu ? ['--use-angle=default'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']),
    `--window-size=${width},${height}`,
  ],
});
const errors = [];
try {
  const page = await browser.newPage();
  page.on('console', (m) => {
    const t = m.text();
    if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${t}`);
    console.log(`  [page:${m.type()}] ${t.slice(0, 400)}`);
  });
  page.on('pageerror', (e) => {
    errors.push(`pageerror: ${e.message}`);
    console.log(`  [pageerror] ${e.message}`);
  });
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  const url = `http://localhost:${port}/${pageName}?render&quality=${quality}&time=${time}&w=${width}&h=${height}&view=${views[0]}${extra}`;
  console.log(`loading ${url}`);
  const t0 = Date.now();
  await page.goto(url, { waitUntil: 'load', timeout: 0 });
  await page.waitForFunction('window.__athenaion && window.__athenaion.ready', { timeout: 0, polling: 500 });
  console.log(`scene ready in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  for (const view of views) {
    const t1 = Date.now();
    const data = await page.evaluate((v, t) => {
      window.__athenaion.setView(v);
      window.__athenaion.render(t);
      return window.__athenaion.render(t);
    }, view, parseFloat(time));
    const file = path.join(outDir, `${pageName ? pageName.replace('.html', '') + '-' : ''}${view}-${quality}${suffix}.png`);
    fs.writeFileSync(file, Buffer.from(data.split(',')[1], 'base64'));
    console.log(`wrote ${path.relative(root, file)} (${((Date.now() - t1) / 1000).toFixed(1)}s)`);
  }
} finally {
  await browser.close();
  server.close();
}
if (errors.length) {
  console.log(`\n${errors.length} console errors/warnings:`);
  for (const e of [...new Set(errors)].slice(0, 30)) console.log(`  ${e.slice(0, 600)}`);
}
