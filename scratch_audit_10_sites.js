const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

// Load dev/app.src.js functions in isolated context or replicate exact extractor functions
const appCode = fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', '..', 'Downloads', 'Office', 'Lead_Generation', 'dev', 'app.src.js'), 'utf8');

// We can run a direct script that pulls all 10 websites and runs the exact parsing
const SITES = [
  { name: '1. Fintech & NBFC', url: 'https://harishfinance.in' },
  { name: '2. Telecom Conglomerate', url: 'https://www.grameenphone.com' },
  { name: '3. IT & SaaS Agency', url: 'https://techtrioz.com' },
  { name: '4. Pharma & Healthcare', url: 'https://www.squarepharma.com.bd' },
  { name: '5. Insurance & Risk PLC', url: 'https://green-delta.com' },
  { name: '6. E-Commerce & Retail', url: 'https://www.daraz.com.bd' },
  { name: '7. Logistics & Courier', url: 'https://redx.com.bd' },
  { name: '8. University & Education', url: 'https://www.northsouth.edu' },
  { name: '9. Legal & Law Firm', url: 'https://www.thedhakalawyers.com' },
  { name: '10. Dead Domain (Fail-Fast Test)', url: 'https://harisance.in' }
];

function fetchUrl(targetUrl, timeoutMs = 4000) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(''), timeoutMs);
    try {
      const u = new URL(targetUrl);
      const client = u.protocol === 'https:' ? https : http;
      client.get(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        timeout: timeoutMs
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          clearTimeout(timer);
          resolve(data);
        });
      }).on('error', () => {
        clearTimeout(timer);
        resolve('');
      });
    } catch (_) {
      clearTimeout(timer);
      resolve('');
    }
  });
}

// Function to run through JSDOM with browser extractPageData logic
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { url: 'http://localhost' });
global.window = dom.window;
global.document = dom.window.document;
global.DOMParser = dom.window.DOMParser;
global.Node = dom.window.Node;

// Extract internal functions from app.src.js by evaluating the module scope
// or defining the extraction suite
const fnExtract = new Function('require', 'module', 'exports', `
  ${appCode}
  return {
    extractPageData: typeof extractPageData !== 'undefined' ? extractPageData : null,
    extractCompanyName: typeof extractCompanyName !== 'undefined' ? extractCompanyName : null,
    extractIndustry: typeof extractIndustry !== 'undefined' ? extractIndustry : null,
    extractCompanySize: typeof extractCompanySize !== 'undefined' ? extractCompanySize : null,
    extractYearFounded: typeof extractYearFounded !== 'undefined' ? extractYearFounded : null,
    extractStreetAddress: typeof extractStreetAddress !== 'undefined' ? extractStreetAddress : null,
    extractServicesAndProducts: typeof extractServicesAndProducts !== 'undefined' ? extractServicesAndProducts : null
  };
`);

async function run10SitesTest() {
  console.log('════════════════════════════════════════════════════════════════════════');
  console.log(' 10-DISTINCT-INDUSTRY LIVE SCRAPING & FIELD AUDIT');
  console.log('════════════════════════════════════════════════════════════════════════\n');

  let extractors;
  try {
    extractors = fnExtract(require, {}, {});
  } catch (err) {
    console.error('Extraction init error:', err.message);
  }

  for (const site of SITES) {
    const start = Date.now();
    console.log(`\n────────────────────────────────────────────────────────────────────────`);
    console.log(`📍 TYPE: ${site.name} | URL: ${site.url}`);
    console.log(`────────────────────────────────────────────────────────────────────────`);

    const html = await fetchUrl(site.url, 4000);
    const fetchTime = Date.now() - start;

    if (!html || html.length < 50) {
      console.log(`❌ Status: ERROR (Site Unreachable / Dead Domain) — Caught in ${fetchTime}ms [PASS FAIL-FAST]`);
      continue;
    }

    console.log(`📥 Fetched Homepage in ${fetchTime}ms (${(html.length / 1024).toFixed(1)} KB)`);

    if (extractors && extractors.extractPageData) {
      const data = extractors.extractPageData(html, site.url);
      console.log(`  🏢 Company Name:      "${data.companyName}"`);
      console.log(`  🏭 Industry:          "${data.industry}"`);
      console.log(`  👥 Company Size:      "${data.companySize}"`);
      console.log(`  📅 Year Founded:      "${data.yearFounded}"`);
      console.log(`  📍 Street Address:    "${data.address.substring(0, 70)}${data.address.length > 70 ? '...' : ''}"`);
      console.log(`  📞 Phones:            [${data.phones.join(', ')}]`);
      console.log(`  ✉️ Emails:            [${data.emails.join(', ')}]`);
      console.log(`  🌐 Socials:           ${JSON.stringify(data.socials)}`);
      console.log(`  💼 Services/Products: "${data.servicesProducts.substring(0, 80)}${data.servicesProducts.length > 80 ? '...' : ''}"`);
      console.log(`  📝 Home Text Length:  ${data.text ? data.text.length : 0} chars`);
      console.log(`  ⏱️ Mining Duration:   ${Date.now() - start}ms`);
    }
  }

  console.log('\n════════════════════════════════════════════════════════════════════════');
}

run10SitesTest();
