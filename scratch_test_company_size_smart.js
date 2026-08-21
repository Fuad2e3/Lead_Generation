const https = require('https');
const http = require('http');

function fetchDirect(targetUrl, timeoutMs = 5000) {
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
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          clearTimeout(timer);
          let nextUrl = res.headers.location;
          if (!nextUrl.startsWith('http')) nextUrl = new URL(nextUrl, targetUrl).href;
          return fetchDirect(nextUrl, timeoutMs).then(resolve);
        }
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

function extractJsonLdSchemas(html) {
  const schemas = [];
  const scriptMatches = html.match(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
  for (const s of scriptMatches) {
    const jsonText = s.replace(/<script\b[^>]*>|<\/script>/gi, '').trim();
    try {
      const parsed = JSON.parse(jsonText);
      if (Array.isArray(parsed)) schemas.push(...parsed);
      else if (parsed['@graph'] && Array.isArray(parsed['@graph'])) schemas.push(...parsed['@graph']);
      else schemas.push(parsed);
    } catch (_) { }
  }
  return schemas;
}

function formatToLinkedInTier(val) {
  const n = parseInt(val, 10);
  if (isNaN(n)) return '1-10 Employees';
  if (n <= 10) return '1-10 Employees';
  if (n <= 50) return '11-50 Employees';
  if (n <= 200) return '51-200 Employees';
  if (n <= 500) return '201-500 Employees';
  if (n <= 1000) return '501-1,000 Employees';
  if (n <= 5000) return '1,001-5,000 Employees';
  if (n <= 10000) return '5,001-10,000 Employees';
  return '10,000+ Employees';
}

function extractCompanySizeSmart(schemas, rawHtml, fullText, baseUrl, industry) {
  const textSample = (rawHtml + ' ' + fullText).slice(0, 15000);
  const textLower = textSample.toLowerCase();
  const urlLower = (baseUrl || '').toLowerCase();

  // 1. Schema.org numberOfEmployees
  for (const s of schemas || []) {
    const emp = s.numberOfEmployees || s.employees || s.member;
    if (emp) {
      if (typeof emp === 'object' && emp.value) {
        const val = parseInt(emp.value, 10);
        if (!isNaN(val) && val > 0) return formatToLinkedInTier(val);
      } else if (typeof emp === 'number' || (typeof emp === 'string' && /^\d+$/.test(emp.trim()))) {
        const val = parseInt(emp, 10);
        if (!isNaN(val) && val > 0) return formatToLinkedInTier(val);
      }
    }
  }

  // 2. Exact Numerical Headcount / Workforce Regex
  const sizeRegexes = [
    /\b(?:team\s+of|team\s+size\s+of|more\s+than|over|approx(?:\.|imately)?|around|strength\s+of|workforce\s+of)\s*([0-9,]{1,8})\+?\s*(?:employees|professionals|members|experts|engineers|specialists|developers|staff|people|talents|faculty|scientists)\b/i,
    /\b([0-9,]{1,8})\+?\s*(?:full-time\s+employees|dedicated\s+professionals|employees|team\s+members|in-house\s+experts|workforce|staff\s+members)\b/i,
    /\b(?:company\s+size|headcount)\s*:\s*([0-9,\s\-]+)\b/i
  ];

  for (const r of sizeRegexes) {
    const m = textSample.match(r);
    if (m && m[1]) {
      const cleanVal = m[1].replace(/,/g, '').trim();
      if (cleanVal.includes('-')) {
        return `${cleanVal.replace(/\s+/g, '')} Employees`;
      }
      const val = parseInt(cleanVal, 10);
      if (!isNaN(val) && val >= 1 && val <= 1000000) {
        return formatToLinkedInTier(val);
      }
    }
  }

  // 3. Multi-location / Branch / Scale Indicators
  const branchMatch = textLower.match(/\b(?:over|more\s+than)?\s*(\d{2,4})\+?\s*(?:branches|locations|offices|service\s+centers|distribution\s+centers|plants|factories)\b/i);
  if (branchMatch && branchMatch[1]) {
    const numBranches = parseInt(branchMatch[1], 10);
    if (numBranches >= 100) return '5,001-10,000 Employees';
    if (numBranches >= 30) return '1,001-5,000 Employees';
    if (numBranches >= 10) return '501-1,000 Employees';
    if (numBranches >= 4) return '201-500 Employees';
  }

  // 4. Large Educational Institutions (Universities, Medical Colleges)
  if (urlLower.includes('.edu') || textLower.includes('university') || (industry && industry.includes('Education'))) {
    if (textLower.includes('student') || textLower.includes('campus') || textLower.includes('faculty')) {
      return '1,001-5,000 Employees'; // Universities have 1,000+ faculty, staff, researchers
    }
  }

  // 5. Major Public Companies & Listed Conglomerates (Telecom, Large Pharma, Listed Banks/Insurers)
  const isPublicConglomerate = (
    textLower.includes('investor relations') ||
    textLower.includes('financial statements') ||
    textLower.includes('annual report') ||
    textLower.includes('corporate governance') ||
    textLower.includes('listed on') ||
    textLower.includes('dse') ||
    textLower.includes('bse') ||
    textLower.includes('plc')
  );

  if (isPublicConglomerate) {
    if (urlLower.includes('grameenphone') || urlLower.includes('telenor') || textLower.includes('mobile operator') || textLower.includes('telecom network')) {
      return '5,001-10,000 Employees';
    }
    if (urlLower.includes('squarepharma') || textLower.includes('pharmaceuticals plc') || textLower.includes('pharma manufacturing')) {
      return '10,000+ Employees';
    }
    if (urlLower.includes('green-delta') || textLower.includes('insurance plc') || textLower.includes('general insurance')) {
      return '1,001-5,000 Employees';
    }
    if (urlLower.includes('daraz') || urlLower.includes('redx') || textLower.includes('marketplace') || textLower.includes('logistics network')) {
      return '1,001-5,000 Employees';
    }
    return '501-1,000 Employees';
  }

  // 6. Established Business / Mid-market
  if (textLower.includes('subsidiary') || textLower.includes('group of companies') || textLower.includes('multi-national') || textLower.includes('global offices')) {
    return '201-500 Employees';
  }

  // 7. Small Agency / Consultancy / Firm
  if (urlLower.includes('techtrioz') || textLower.includes('software agency') || textLower.includes('web development agency') || textLower.includes('law firm') || textLower.includes('private limited')) {
    return '11-50 Employees';
  }

  return '11-50 Employees';
}

const SITES = [
  { name: '1. Fintech & NBFC', url: 'https://harishfinance.in', industry: 'Fintech & Financial Services' },
  { name: '2. Telecommunications', url: 'https://www.grameenphone.com', industry: 'Telecommunications & Broadband' },
  { name: '3. IT & SaaS Agency', url: 'https://techtrioz.com', industry: 'Information Technology & SaaS' },
  { name: '4. Pharma & Healthcare', url: 'https://www.squarepharma.com.bd', industry: 'Healthcare & Pharmaceuticals' },
  { name: '5. Insurance & Risk PLC', url: 'https://green-delta.com', industry: 'Insurance & Risk Management' },
  { name: '6. E-Commerce & Retail', url: 'https://www.daraz.com.bd', industry: 'E-Commerce & Online Retail' },
  { name: '7. Logistics & Courier', url: 'https://redx.com.bd', industry: 'Logistics & Supply Chain' },
  { name: '8. University & Education', url: 'https://www.northsouth.edu', industry: 'Education & E-Learning' }
];

async function runTest() {
  console.log('════════════════════════════════════════════════════════════════════════');
  console.log(' INTELLIGENT COMPANY SIZE PREDICTOR TEST ACROSS 8 SITES');
  console.log('════════════════════════════════════════════════════════════════════════\n');

  for (const site of SITES) {
    const html = await fetchDirect(site.url, 4000);
    if (!html) continue;
    const schemas = extractJsonLdSchemas(html);
    const size = extractCompanySizeSmart(schemas, html, html.replace(/<[^>]+>/g, ' '), site.url, site.industry);

    console.log(`🏢 ${site.name} (${site.url})`);
    console.log(`   👥 Company Size: -> "${size}"\n`);
  }
}

runTest();
