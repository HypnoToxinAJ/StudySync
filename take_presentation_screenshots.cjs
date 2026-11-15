const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');

const outputDir = path.resolve(__dirname, 'presentation_screenshots');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function run() {
  console.log('Launching Chrome...');
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2 // 2x crisp DPI for presentation slides
  });

  const page = await context.newPage();

  // 1. Login Page
  console.log('Capturing Login Page...');
  await page.goto('http://localhost:3000/#/login', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(outputDir, '01_Login_Page.png'), fullPage: false });

  // Click Explore Demo / Presentation Mode
  console.log('Logging in with Demo mode...');
  const demoButton = await page.waitForSelector('text=Explore Demo / Presentation Mode');
  await demoButton.click();
  await page.waitForTimeout(2000);

  // 2. Dashboard
  console.log('Capturing Dashboard...');
  await page.goto('http://localhost:3000/#/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(outputDir, '02_Dashboard.png'), fullPage: false });

  // 3. CGPA Calculator
  console.log('Capturing CGPA Calculator...');
  await page.goto('http://localhost:3000/#/cgpa', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(outputDir, '03_CGPA_Calculator.png'), fullPage: false });

  // 4. Class Routine
  console.log('Capturing Class Routine...');
  await page.goto('http://localhost:3000/#/routine', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(outputDir, '04_Class_Routine.png'), fullPage: false });

  // 5. Test and Assignment Scheduling (Assessments)
  console.log('Capturing Test & Assignment Scheduling...');
  await page.goto('http://localhost:3000/#/assessments', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(outputDir, '05_Test_and_Assignment_Scheduling.png'), fullPage: false });

  // Bonus: Attendance Tracker
  console.log('Capturing Smart Attendance Tracker...');
  await page.goto('http://localhost:3000/#/attendance', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(outputDir, '06_Attendance_Tracker.png'), fullPage: false });

  console.log('All presentation screenshots captured successfully!');
  await browser.close();
}

run().catch(err => {
  console.error('Error during screenshot capture:', err);
  process.exit(1);
});
