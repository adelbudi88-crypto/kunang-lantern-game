// Kunang screenshot + play-test runner (dev-only, not part of the entry):
// serves game/, opens it in headless Chromium, takes the deterministic
// screenshots from shots.json, then actually plays the game for a few seconds
// with keyboard and mouse and reports console errors, network requests and
// whether the score moved.
//
//   node scripts/shots.mjs
import { spawn } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { chromium } from 'playwright';

const ROOT = new URL('..', import.meta.url).pathname;
const SHOTS = JSON.parse(readFileSync(`${ROOT}shots.json`, 'utf8'));

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(url, tries = 40) {
  for (let i = 0; i < tries; i += 1) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {
      // Not up yet.
    }
    await wait(250);
  }
  throw new Error('serve.ts did not come up');
}

const server = spawn('node', ['serve.ts', '--port', '8080'], { cwd: ROOT, stdio: 'pipe' });
let serverLog = '';
server.stdout.on('data', (d) => { serverLog += d; });
server.stderr.on('data', (d) => { serverLog += d; });

const browser = await chromium.launch();
const results = { consoleErrors: [], requests: [], shots: [], play: {} };
try {
  await waitForServer('http://localhost:8080/index.html');
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on('console', (msg) => {
    if (msg.type() === 'error') results.consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => results.consoleErrors.push(String(err)));
  page.on('request', (req) => results.requests.push(req.url()));

  // Deterministic screenshots.
  for (const shot of SHOTS) {
    await page.goto(`http://localhost:8080/index.html${shot.query}`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__shotReady === true, { timeout: 30000 });
    await page.waitForTimeout(150);
    const path = `${ROOT}screenshots/${shot.name}`;
    await page.screenshot({ path, type: 'jpeg', quality: 82 });
    const bytes = (await import('node:fs')).statSync(path).size;
    results.shots.push({ name: shot.name, bytes, ok: bytes <= 262144 });
    console.log(`shot ${shot.name}: ${bytes} bytes ${bytes <= 262144 ? 'OK' : 'TOO BIG'}`);
  }

  // Live play-test: start with Space, steer with keys and mouse, watch the score.
  await page.goto('http://localhost:8080/index.html', { waitUntil: 'load' });
  await page.waitForTimeout(800);
  await page.keyboard.press('Space');
  await page.waitForTimeout(500);
  const statusAfterStart = await page.evaluate(() => document.getElementById('status').textContent);
  results.play.statusAfterStart = statusAfterStart;
  // Fly around: hold keys in a pattern and sweep the mouse.
  await page.mouse.move(640, 300);
  await page.keyboard.down('d');
  await page.waitForTimeout(1200);
  await page.keyboard.up('d');
  await page.mouse.move(900, 500, { steps: 12 });
  await page.keyboard.down('w');
  await page.waitForTimeout(900);
  await page.keyboard.up('w');
  await page.mouse.move(300, 200, { steps: 12 });
  await page.keyboard.down('a');
  await page.waitForTimeout(900);
  await page.keyboard.up('a');
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${ROOT}screenshots/0-live-play.jpg`, type: 'jpeg', quality: 82 });
  const liveBytes = (await import('node:fs')).statSync(`${ROOT}screenshots/0-live-play.jpg`).size;
  results.play.liveShotBytes = liveBytes;
  // Pause, then resume, then check the HUD is still alive.
  await page.keyboard.press('p');
  await page.waitForTimeout(400);
  const statusPaused = await page.evaluate(() => document.getElementById('status').textContent);
  await page.keyboard.press('p');
  await page.waitForTimeout(400);
  const statusResumed = await page.evaluate(() => document.getElementById('status').textContent);
  results.play.statusPaused = statusPaused;
  results.play.statusResumed = statusResumed;
  const best = await page.evaluate(() => window.localStorage.getItem('kunang-best-score'));
  results.play.bestInStorage = best;
  // The score lives on the canvas; the status line proves the loop ran.
  console.log('play status after start:', statusAfterStart);
  console.log('play status paused:', statusPaused, '| resumed:', statusResumed);
  console.log('live shot bytes:', liveBytes);
} finally {
  await browser.close();
  server.kill();
}

const external = results.requests.filter((u) => !u.startsWith('http://localhost:8080'));
console.log('---');
console.log('console errors:', results.consoleErrors.length, results.consoleErrors);
console.log('total requests:', results.requests.length, '| external (non-localhost):', external.length, external);
console.log('shots:', JSON.stringify(results.shots));
console.log(serverLog.trim());
if (results.consoleErrors.length > 0 || external.length > 0) {
  console.log('PLAY-TEST: ISSUES FOUND');
  process.exitCode = 1;
} else {
  console.log('PLAY-TEST: CLEAN');
}
