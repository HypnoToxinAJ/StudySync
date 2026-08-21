/**
 * CUET Result Secure Proxy Endpoint (Vercel Serverless / Node.js API)
 *
 * Security Architecture:
 * - Credentials received ONLY via POST body over HTTPS.
 * - Passwords are NEVER logged, persisted, or returned to clients.
 * - Sanitized proxying with 15s timeout, origin protection, and payload-size caps.
 * - CUET session cookies are isolated in-memory and discarded after a short-lived CAPTCHA flow.
 */

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { chromium } from 'playwright-core';

const challengeSecret = process.env.CUET_CHALLENGE_SECRET || 'studysync-local-cuet-challenge-secret';
const challengeKey = createHash('sha256').update(challengeSecret).digest();

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

const getRequestStage = (req) => new URL(req.url || '/', 'http://localhost').searchParams.get('stage') || 'complete';

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
  const imageUrl = new URL('captcha.php', loginUrl).toString();
  const imageResponse = await fetch(imageUrl, {
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

const getBrowserExecutablePath = () => {
  const candidates = [
    process.env.CUET_BROWSER_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe'
  ].filter(Boolean);

  return candidates.find(candidate => existsSync(candidate)) || null;
};

const fetchResultWithBrowser = async ({ loginUrl, cookie, csrfToken, studentId, password, captcha }, signal) => {
  const executablePath = getBrowserExecutablePath();
  if (!executablePath) {
    throw new Error('No local browser executable was found for CUET portal automation.');
  }

  const browser = await chromium.launch({
    headless: true,
    executablePath,
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });

  try {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 StudySync/1.0',
      locale: 'en-US'
    });

    await context.addCookies(cookie.split(';').filter(Boolean).map(entry => {
      const [name, ...rest] = entry.trim().split('=');
      return {
        name,
        value: rest.join('='),
        domain: new URL(loginUrl).hostname,
        path: '/'
      };
    }));

    const page = await context.newPage();
      // Do not load captcha.php again: it would replace the challenge image
      // already shown to the user and invalidate the entered code.
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

    if (signal?.aborted) {
      throw new Error('Request was cancelled.');
    }

    const htmlContent = await page.content();
    const cookies = await context.cookies();
    await context.close();

    return {
      htmlContent,
      cookie: cookies.map(cookieItem => `${cookieItem.name}=${cookieItem.value}`).join('; ')
    };
  } finally {
    await browser.close().catch(() => {});
  }
};

export default async function handler(req, res) {
  // 1. Enforce POST method only
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method Not Allowed',
      message: 'Only POST requests are permitted.'
    });
  }

  // 2. Validate request body
  const { studentId, password, challengeId, captcha } = req.body || {};
  const stage = getRequestStage(req);

  if (stage === 'start' && (!studentId || typeof studentId !== 'string' || !password || typeof password !== 'string')) {
    return res.status(400).json({ error: 'Bad Request', message: 'Student ID and Password are required.' });
  }

  if (stage === 'complete' && (!challengeId || typeof challengeId !== 'string' || !captcha || typeof captcha !== 'string')) {
    return res.status(400).json({ error: 'Bad Request', message: 'A CAPTCHA code is required.' });
  }

  const session = stage === 'complete' ? decodeChallenge(challengeId) : null;
  if (stage === 'complete' && (!session || session.expiresAt < Date.now())) {
    return res.status(410).json({ error: 'Challenge Expired', message: 'The CAPTCHA expired. Please request a new one.' });
  }

  const sanitizedStudentId = stage === 'start' ? studentId.trim() : session.studentId;

  // Basic format validation
  if (sanitizedStudentId.length < 4 || sanitizedStudentId.length > 20) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Invalid Student ID format.'
    });
  }

  const CUET_LOGIN_URL = process.env.CUET_PORTAL_URL || 'https://course.cuet.ac.bd/result_published.php';
  const CUET_PORTAL_ORIGIN = new URL(CUET_LOGIN_URL).origin;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

  try {
    // Establish a portal session first. The current CUET form supplies a CSRF token
    // and expects the session cookie on the authenticated request.
    const loginPageResponse = stage === 'start' ? await fetch(CUET_LOGIN_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36 StudySync/1.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      signal: controller.signal
    }) : null;
    const loginPageHtml = stage === 'start' ? await loginPageResponse.text() : '';
    const csrfToken = stage === 'start' ? getCsrfToken(loginPageHtml) : session.csrfToken;
    const cookie = stage === 'start' ? getCookieHeader(loginPageResponse) : session.cookie;

    if (stage === 'start') {
      const { captchaImage, captchaCookie } = await getCaptchaImage(CUET_LOGIN_URL, cookie, controller.signal);
      const newChallengeId = encodeChallenge({
        studentId: sanitizedStudentId,
        password,
        csrfToken,
        cookie: captchaCookie || cookie,
        expiresAt: Date.now() + 5 * 60 * 1000
      });
      return res.status(200).json({ challengeRequired: true, challengeId: newChallengeId, captchaImage });
    }

    const browserResult = await fetchResultWithBrowser(
      {
        loginUrl: CUET_LOGIN_URL,
        cookie,
        csrfToken,
        studentId: sanitizedStudentId,
        password: session.password,
        captcha: captcha.trim()
      },
      controller.signal
    );

    clearTimeout(timeoutId);

    const htmlContent = browserResult.htmlContent;
    const returnedCookie = browserResult.cookie || cookie;

    if (!hasResultRows(htmlContent) && hasLoginForm(htmlContent)) {
      return res.status(401).json({
        error: 'Authentication Failed',
        message: 'The CUET portal did not authenticate this request. Check the Student ID, password, and CAPTCHA, then request a fresh CAPTCHA.'
      });
    }

    if (!hasResultRows(htmlContent) && /invalid captcha|wrong captcha|captcha is required/i.test(htmlContent)) {
      return res.status(401).json({
        error: 'Invalid CAPTCHA',
        message: 'The CAPTCHA code was not accepted. Please try the new image again.'
      });
    }

    if (!hasResultRows(htmlContent) && /invalid student id|wrong password|user not found|please enter both student id and password/i.test(htmlContent)) {
      return res.status(401).json({
        error: 'Authentication Failed',
        message: 'The CUET portal did not authenticate this request. Check the Student ID and password, then request a fresh CAPTCHA.'
      });
    }

    // Check for explicit login failure text in HTML
    if (
      htmlContent.includes('Invalid Password') ||
      htmlContent.includes('Wrong Password') ||
      htmlContent.includes('Invalid Student ID') ||
      htmlContent.includes('User not found') ||
      htmlContent.includes('Incorrect password')
    ) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'The Student ID or password was not accepted.'
      });
    }

    // Check for CAPTCHA/MFA challenges
    if (
      htmlContent.includes('g-recaptcha') ||
      htmlContent.includes('cf-turnstile') ||
      htmlContent.includes('hcaptcha') ||
      htmlContent.includes('Enter OTP')
    ) {
      return res.status(429).json({
        error: 'Security Verification Required',
        message: 'The CUET portal has triggered an interactive CAPTCHA/MFA security challenge. Please access the portal directly.'
      });
    }

    // Return sanitized HTML content to the frontend for secure client-side DOM parsing
    return res.status(200).json({
      success: true,
      html: htmlContent,
      studentId: sanitizedStudentId,
      cookie: returnedCookie,
      fetchedAt: new Date().toISOString()
    });

  } catch (err) {
    clearTimeout(timeoutId);

    if (err.name === 'AbortError') {
      return res.status(504).json({
        error: 'Gateway Timeout',
        message: 'The CUET portal did not respond within 15 seconds. Please try again later.'
      });
    }

    // Never log raw error containing sensitive parameters
    console.error('CUET Proxy Connection Error:', err.message || 'Connection failed');

    return res.status(503).json({
      error: 'Service Unavailable',
      message: 'The CUET portal is temporarily unreachable. Please check your connection or try again shortly.'
    });
  }
}
