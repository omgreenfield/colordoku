/**
 * Renders the link-preview image, the Apple touch icon, and the README screenshots with local Chrome.
 *
 * Run with `npm run images`. Set CHROME_PATH when Chrome isn't at the default macOS location.
 */
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const CHROME_PATH =
  process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
/** The puzzle the README screenshots show. */
const SCREENSHOT_SEARCH = '?size=8&seed=colordoku';
/** Hints applied, in order, to reach a mid-game board for the screenshots. */
const SCREENSHOT_HINTS = ['mark', 'mark', 'mark', 'reason', 'reason'];
/** @type {Record<string, string>} */
const CONTENT_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

/**
 * Serves the repo root on a free local port.
 *
 * @returns {Promise<{ origin: string, close: () => void }>}
 */
async function serveRepo() {
  const server = createServer(async (request, response) => {
    const { pathname } = new URL(request.url ?? '/', 'http://localhost');
    const file = join(
      ROOT,
      decodeURIComponent(pathname.endsWith('/') ? `${pathname}index.html` : pathname),
    );
    try {
      const body = await readFile(file);
      response.writeHead(200, {
        'Content-Type': CONTENT_TYPES[extname(file)] ?? 'application/octet-stream',
      });
      response.end(body);
    } catch {
      response.writeHead(404).end();
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(undefined)));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('The image server did not start');
  return { origin: `http://127.0.0.1:${address.port}`, close: () => server.close() };
}

const server = await serveRepo();
const browser = await puppeteer.launch({ executablePath: CHROME_PATH });
try {
  const page = await browser.newPage();
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);

  await page.setViewport({ width: 1200, height: 630 });
  await page.goto(`${server.origin}/scripts/og-image.html`);
  await page.waitForSelector('body[data-ready]');
  await page.screenshot({ path: join(ROOT, 'site/assets/og-image.png') });

  await page.setViewport({ width: 180, height: 180 });
  await page.setContent(
    `<body style="margin:0;background:#fff"><img src="${server.origin}/site/assets/favicon.svg" width="180" height="180" style="display:block"></body>`,
  );
  await page.screenshot({ path: join(ROOT, 'site/assets/apple-touch-icon.png') });

  await page.setViewport({ width: 1180, height: 900, deviceScaleFactor: 2 });
  await page.goto(`${server.origin}/site/${SCREENSHOT_SEARCH}`);
  await page.waitForSelector('.cell[aria-label]');
  for (const hint of SCREENSHOT_HINTS) {
    await page.click(`[data-hint="${hint}"]`);
    await page.click('#apply-hint');
  }
  await page.mouse.move(0, 0);
  await page.evaluate(() => window.scrollTo(0, 0));
  for (const scheme of ['light', 'dark']) {
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
    await page.screenshot({
      path: join(ROOT, `docs/images/screenshot-${scheme}.png`),
      fullPage: true,
    });
  }
} finally {
  await browser.close();
  server.close();
}
