// Layout audit: tabs in this app don't scroll, so nothing may overflow. This opens Home, Past and Present with worst-case data
// at several phone sizes and fails if any screen's content is taller than its box.
//   AUDIT_URL=http://localhost:4173 node scripts/overflow-audit.mjs        (after `npm run build && npx vite preview`)
// Needs Playwright + a Chrome (not a project dependency): set PLAYWRIGHT=/path/to/playwright and CHROME=/path/to/chrome if needed.
// Sizes at or above 740pt tall must pass; smaller ones (SE class) are reported as warnings, since essentials may scroll there.
const pwm = await import(process.env.PLAYWRIGHT || 'playwright'), pw = pwm.chromium ? pwm : pwm.default;
const URL = process.env.AUDIT_URL || 'http://localhost:4173';
const SIZES = [[375, 667], [390, 740], [393, 852], [430, 932]];
const TABS = ['Home', 'Past', 'Present'];

const longAnchor = 'Is there a gap or emptiness you’re trying to fill right now, and what do you reach for to fill it?';
const curated = 'When you notice yourself carrying the weight of the working day home again, what is one small thing you could do to put it down before the evening begins?';

const seed = ([longAnchor]) => {
  const p = n => String(n).padStart(2, '0'), ds = d => `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  const now = new Date(), today = ds(now), yest = ds(new Date(now - 864e5)), two = ds(new Date(now - 2 * 864e5));
  const slug = s => s.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48);
  const cats = [['training', 'Work'], ['training', 'Family'], ['training', 'Chaos'], ['recovery', 'Walk'], ['recovery', 'Nap'], ['recovery', 'Friends'], ['training', 'Finances'], ['recovery', 'Creative'], ['win', 'Win'], ['gratitude', 'Gratitude']];
  const ev = cats.flatMap(([type, category], i) => [0, 1, 2].map(j => ({ id: `e${i}${j}`, type, category, objectiveIntensity: 3 + ((i + j) % 6), intensity: 2, duration: '<1h', notes: 'A long note about what happened in this moment, enough to fill a line or two of text.', custom_data: { time: `${p(7 + ((i * 3 + j) % 14))}:00`, load: 10 + ((i * 7 + j * 5) % 40) }, date: today })));
  const state = { days: { [today]: { events: ev, answers: { driver: 3 }, note: 'A long day note. '.repeat(30) }, [yest]: { events: ev.slice(0, 4).map(e => ({ ...e, date: yest })), answers: {}, note: 'Yesterday was tense and busy. ' .repeat(8) } }, mottos: ['Finding joy in other’s joy helps take the microscope off yourself, and a little more besides so it runs very long indeed, as long as a motto can.'], geminiKey: 'AUDIT' };
  const past = (i, day) => ({ id: `p${i}`, kind: 'past', day, at: new Date(now - i * 6e4).toISOString(), board: null, body: 'An answer that runs long enough to need more than one line when it is clipped on the screen. '.repeat(3), meta: { tags: ['Mila', 'work'], question: `A fairly long question number ${i} that someone wrote earlier today?`, qid: `audit-q${i}` } });
  const items = [...Array.from({ length: 6 }, (_, i) => past(i, today)), past(9, two), ...Array.from({ length: 8 }, (_, i) => ({ id: `f${i}`, kind: 'future', day: today, at: new Date(now - i * 7e4).toISOString(), board: 'Inbox', body: `Idea ${i}` }))];
  localStorage.setItem('pulse_state', JSON.stringify(state));
  localStorage.setItem('omokage_items_v1', JSON.stringify(items));
  localStorage.setItem('omk_cutoff', '0');
  localStorage.setItem('omk_rhythm_epoch', two);
  // every anchor overdue (so "+N more" shows), with the longest one as tonight's
  localStorage.setItem(`omk_anchor_${today}`, slug(longAnchor));
};

const browser = await pw.chromium.launch({ executablePath: process.env.CHROME, args: ['--no-sandbox'] });
let bad = 0, warn = 0;
for (const [w, h] of SIZES) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  await ctx.addInitScript(seed, [longAnchor]);
  const page = await ctx.newPage();
  await page.route('**/generativelanguage.googleapis.com/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ candidates: [{ content: { parts: [{ text: curated }] } }] }) }));
  page.on('pageerror', e => console.log('PAGEERR', e.message));
  await page.goto(URL); await page.waitForTimeout(900);
  for (const tab of TABS) {
    await page.locator('nav.tabs button', { hasText: tab }).click(); await page.waitForTimeout(tab === 'Past' ? 1600 : 800);
    const r = await page.evaluate(() => {
      const out = [];
      for (const el of document.querySelectorAll('.screen, .screen > .grow')) {
        const o = el.scrollHeight - el.clientHeight;
        if (o > 1) out.push(`${el.className.includes('screen') ? 'screen' : 'region'} +${o}px`);
      }
      return out;
    });
    const tall = h >= 740, tag = r.length ? (tall ? 'FAIL' : 'warn') : 'ok';
    if (r.length) tall ? bad++ : warn++;
    console.log(`${String(w).padStart(3)}×${String(h).padEnd(4)} ${tab.padEnd(8)} ${tag} ${r.join(', ')}`);
  }
  await ctx.close();
}
await browser.close();
console.log(bad ? `\n${bad} failing` : `\nall tall sizes fit${warn ? ` (${warn} small-phone warnings)` : ''}`);
process.exit(bad ? 1 : 0);
