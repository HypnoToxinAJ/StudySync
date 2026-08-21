import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { chromium } from 'playwright-core';

const challengeKey = createHash('sha256').update('studysync-local-cuet-challenge-secret').digest();

const encodeChallenge = (payload) => {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', challengeKey, iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64url');
};

const decodeChallenge = (token) => {
  try {
    const buffer = Buffer.from(token, 'base64url');
    const decipher = createDecipheriv('aes-256-gcm', challengeKey, buffer.subarray(0, 12));
    decipher.setAuthTag(buffer.subarray(12, 28));
    return JSON.parse(Buffer.concat([decipher.update(buffer.subarray(28)), decipher.final()]).toString('utf8'));
  } catch {
    return null;
  }
};

const getCookieHeader = (response) => {
  const setCookie = response.headers.get('set-cookie') || '';
  return setCookie.split(',').map(value => value.split(';')[0]).join('; ');
};

const mergeCookieHeaders = (...cookieHeaders) => {
  const cookies = new Map();
  cookieHeaders
    .filter(Boolean)
    .flatMap(header => header.split(/,(?=[^;,=]+=[^;,=]+)/))
    .forEach((cookieHeader) => {
      const pair = cookieHeader.split(';')[0].trim();
      const equalsIndex = pair.indexOf('=');
      if (equalsIndex > 0) {
        cookies.set(pair.slice(0, equalsIndex), pair.slice(equalsIndex + 1));
      }
    });
  return Array.from(cookies.entries()).map(([name, value]) => `${name}=${value}`).join('; ');
};

const getCsrfToken = (html) => html.match(/name=["']csrf_token["'][^>]*value=["']([^"']+)["']/i)?.[1] || '';

const hasResultRows = (html) => /class=["'][^"']*productall_row[^"']*["']/i.test(html);
const hasLoginForm = (html) => /name=["']user_email["']/i.test(html) && /name=["']user_password["']/i.test(html);

const getCaptchaImage = async (loginUrl, cookie, signal) => {
  const imageResponse = await fetch(new URL('captcha.php', loginUrl), {
    headers: { Cookie: cookie, Referer: loginUrl },
    signal
  });
  if (!imageResponse.ok) return { captchaImage: '', captchaCookie: cookie };
  const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
  const imageType = imageBuffer[0] === 0x89 && imageBuffer[1] === 0x50 && imageBuffer[2] === 0x4e && imageBuffer[3] === 0x47
    ? 'image/png'
    : (imageResponse.headers.get('content-type') || 'image/png').split(';')[0];
  const imageBytes = imageBuffer.toString('base64');
  const captchaCookie = mergeCookieHeaders(cookie, getCookieHeader(imageResponse));
  return { captchaImage: `data:${imageType};base64,${imageBytes}`, captchaCookie };
};

const getBrowserExecutablePath = () => [
  process.env.CUET_BROWSER_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe'
].filter(Boolean).find(candidate => existsSync(candidate)) || null;

const fetchResultWithBrowser = async ({ loginUrl, cookie, csrfToken, studentId, password, captcha }, signal) => {
  const executablePath = getBrowserExecutablePath();
  if (!executablePath) throw new Error('No local browser executable was found for CUET portal automation.');
  const browser = await chromium.launch({ headless: true, executablePath, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  try {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 StudySync/1.0',
      locale: 'en-US'
    });
    const initialCookies = cookie.split(';').filter(Boolean).map(entry => {
      const [name, ...rest] = entry.trim().split('=');
      return { name, value: rest.join('='), domain: new URL(loginUrl).hostname, path: '/' };
    });
    if (initialCookies.length) await context.addCookies(initialCookies);
    const page = await context.newPage();
      // Keep the CAPTCHA generated for the image shown in StudySync.
      await page.route('**/captcha.php', route => route.abort());
    await page.goto(loginUrl, { waitUntil: 'domcontentloaded' });
    if (csrfToken) {
      const csrfInput = page.locator('input[name="csrf_token"]');
      if (await csrfInput.count()) await csrfInput.evaluate((element, value) => { element.value = value; }, csrfToken);
    }
    await page.locator('#user_email, input[name="user_email"]').first().fill(studentId);
    await page.locator('#user_password, input[name="user_password"]').first().fill(password);
    await page.locator('input[name="captcha"]').first().fill(captcha);
    await Promise.all([
      page.waitForLoadState('domcontentloaded').catch(() => {}),
      page.locator('button[type="submit"], input[type="submit"]').first().click()
    ]);
    if (signal?.aborted) throw new Error('Request was cancelled.');
    const htmlContent = await page.content();
    await context.close();
    return htmlContent;
  } finally {
    await browser.close().catch(() => {});
  }
};

// Custom Vite plugin to handle /api/cuet-results/fetch-results during local development
const cuetProxyPlugin = () => ({
  name: 'cuet-proxy-middleware',
  configureServer(server) {
    server.middlewares.use('/api/cuet-results/fetch-results', async (req, res) => {
      if (req.method !== 'POST') {
        res.statusCode = 405;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Method Not Allowed', message: 'Only POST requests are permitted.' }));
        return;
      }

      const bodyChunks = [];
      req.on('data', chunk => {
        bodyChunks.push(Buffer.from(chunk));
      });

      req.on('end', async () => {
        try {
          const body = JSON.parse(Buffer.concat(bodyChunks).toString('utf8') || '{}');
          const { studentId, password, challengeId, captcha } = body;
          const stage = new URL(req.url || '/', 'http://localhost').searchParams.get('stage') || 'complete';
          const challengeSession = stage === 'complete' ? decodeChallenge(challengeId) : null;

          if (stage === 'start' && (!studentId || !password)) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Bad Request', message: 'Student ID and Password are required.' }));
            return;
          }

          if (stage === 'complete' && (!challengeSession || !captcha)) {
            res.statusCode = challengeSession ? 400 : 410;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Challenge Expired', message: challengeSession ? 'A CAPTCHA code is required.' : 'The CAPTCHA expired. Please request a new one.' }));
            return;
          }

          const sanitizedStudentId = stage === 'start' ? String(studentId).trim() : challengeSession.studentId;
          const CUET_LOGIN_URL = 'https://course.cuet.ac.bd/result_published.php';

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 15000);

          try {
            const loginPageResponse = stage === 'start' ? await fetch(CUET_LOGIN_URL, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36 StudySync/1.0',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
              },
              signal: controller.signal
            }) : null;
            const loginPageHtml = stage === 'start' ? await loginPageResponse.text() : '';
            const csrfToken = stage === 'start' ? getCsrfToken(loginPageHtml) : challengeSession.csrfToken;
            const cookie = stage === 'start' ? getCookieHeader(loginPageResponse) : challengeSession.cookie;

            if (stage === 'start') {
              const { captchaImage, captchaCookie } = await getCaptchaImage(CUET_LOGIN_URL, cookie, controller.signal);
              const newChallengeId = encodeChallenge({
                studentId: sanitizedStudentId,
                password,
                csrfToken,
                cookie: captchaCookie || cookie,
                expiresAt: Date.now() + 5 * 60 * 1000
              });
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ challengeRequired: true, challengeId: newChallengeId, captchaImage }));
              return;
            }

            const htmlContent = await fetchResultWithBrowser(
              {
                loginUrl: CUET_LOGIN_URL,
                cookie,
                csrfToken,
                studentId: sanitizedStudentId,
                password: challengeSession.password,
                captcha: captcha.trim()
              },
              controller.signal
            );

            clearTimeout(timeoutId);

            if (!hasResultRows(htmlContent) && hasLoginForm(htmlContent)) {
              res.statusCode = 401;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                error: 'Authentication Failed',
                message: 'The CUET portal did not authenticate this request. Check the Student ID, password, and CAPTCHA, then request a fresh CAPTCHA.'
              }));
              return;
            }

            if (!hasResultRows(htmlContent) && /invalid captcha|wrong captcha|captcha is required/i.test(htmlContent)) {
              res.statusCode = 401;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                error: 'Invalid CAPTCHA',
                message: 'The CAPTCHA code was not accepted. Please try the new image again.'
              }));
              return;
            }

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              success: true,
              html: htmlContent,
              studentId: sanitizedStudentId,
              fetchedAt: new Date().toISOString()
            }));
          } catch (fetchErr) {
            clearTimeout(timeoutId);
            if (fetchErr.name === 'AbortError') {
              res.statusCode = 504;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Gateway Timeout', message: 'The CUET portal did not respond within 15 seconds. Please try again.' }));
              return;
            }

            // Connection issue - return friendly error
            res.statusCode = 503;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              error: 'Service Unavailable',
              message: 'The CUET portal is temporarily unreachable. Please check your connection or try again shortly.'
            }));
          }
        } catch (jsonErr) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Bad Request', message: 'Invalid JSON payload.' }));
        }
      });
    });
  }
});

export default defineConfig({
  plugins: [react(), cuetProxyPlugin()],
  server: {
    host: true,
    port: 3000,
    open: true,
  },
});
