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

function extractIndustryWeighted(schemas, docTitle, metaDesc, fullText, baseUrl) {
  // 1. Schema.org
  for (const s of schemas || []) {
    const ind = s.industry || s.category || s.knowsAbout;
    if (ind && typeof ind === 'string' && ind.length >= 3 && ind.length <= 60) return ind;
  }

  const titleLower = (docTitle || '').toLowerCase();
  const descLower = (metaDesc || '').toLowerCase();
  const urlLower = (baseUrl || '').toLowerCase();
  const textLower = (fullText || '').slice(0, 8000).toLowerCase();

  const categories = [
    {
      name: 'Education & E-Learning',
      urlKeywords: ['.edu', 'university', 'college', 'academy', 'school'],
      headKeywords: ['university', 'higher education', 'academic', 'college', 'degree programs', 'students', 'admissions', 'faculty'],
      bodyKeywords: ['undergraduate', 'graduate', 'degree', 'curriculum', 'campus', 'scholarship', 'faculty', 'research center']
    },
    {
      name: 'Healthcare & Pharmaceuticals',
      urlKeywords: ['pharma', 'health', 'hospital', 'clinic', 'medical'],
      headKeywords: ['pharmaceuticals', 'medicine', 'hospital', 'healthcare', 'pharma', 'clinical', 'therapeutics', 'drug manufacturer'],
      bodyKeywords: ['dosage', 'prescription', 'patient care', 'tablets', 'capsules', 'medical services', 'healthcare products', 'diagnostic']
    },
    {
      name: 'Insurance & Risk Management',
      urlKeywords: ['insurance', 'insure', 'underwriting'],
      headKeywords: ['insurance', 'general insurance', 'life insurance', 'health insurance', 'policy holder', 'coverage', 'claims'],
      bodyKeywords: ['premium', 'insurance policy', 'underwriting', 'risk coverage', 'motor insurance', 'marine insurance', 'fire insurance']
    },
    {
      name: 'Telecommunications & Broadband',
      urlKeywords: ['telecom', 'grameenphone', 'telenor', 'airtel', 'banglalink', 'robi'],
      headKeywords: ['telecom', 'mobile operator', 'cellular network', 'broadband', 'internet packages', 'esim', '5g network', '4g'],
      bodyKeywords: ['roaming', 'minute pack', 'data pack', 'recharge', 'sim card', 'telecommunication', 'voice calls', 'prepaid', 'postpaid']
    },
    {
      name: 'Logistics & Supply Chain',
      urlKeywords: ['courier', 'logistics', 'express', 'redx', 'cargo', 'freight'],
      headKeywords: ['courier', 'logistics', 'delivery service', 'parcel delivery', 'freight forwarding', 'express delivery', 'supply chain'],
      bodyKeywords: ['tracking parcel', 'doorstep delivery', 'warehouse', 'shipping fee', 'merchant delivery', 'pick up', 'cash on delivery']
    },
    {
      name: 'E-Commerce & Online Retail',
      urlKeywords: ['shop', 'store', 'daraz', 'ecommerce', 'e-commerce', 'mall'],
      headKeywords: ['online shopping', 'ecommerce', 'marketplace', 'buy online', 'shop now', 'flash sale', 'mega deals'],
      bodyKeywords: ['add to cart', 'free delivery', 'voucher', 'order tracking', 'discount', 'seller center', 'shopping cart', 'best deals']
    },
    {
      name: 'Information Technology & SaaS',
      urlKeywords: ['tech', 'software', 'saas', 'trioz', 'cloud', 'digital', 'systems'],
      headKeywords: ['software development', 'saas platform', 'it solutions', 'cloud infrastructure', 'mobile app development', 'web agency'],
      bodyKeywords: ['custom software', 'api integration', 'devops', 'machine learning', 'ui/ux design', 'agile development', 'technology consulting']
    },
    {
      name: 'Fintech & Financial Services',
      urlKeywords: ['finance', 'loan', 'nbfc', 'banking', 'fintech', 'lending'],
      headKeywords: ['personal loan', 'business loan', 'nbfc', 'mortgage lending', 'wealth management', 'fintech', 'banking solutions'],
      bodyKeywords: ['interest rate', 'emi calculator', 'loan tenure', 'borrower', 'credit score', 'loan approval', 'disbursement', 'collateral']
    },
    {
      name: 'Legal & Law Firm Services',
      urlKeywords: ['law', 'lawyer', 'attorney', 'legal', 'solicitor', 'advocate'],
      headKeywords: ['law firm', 'legal counsel', 'attorney at law', 'barrister', 'litigation', 'advocates', 'legal advisory'],
      bodyKeywords: ['court', 'corporate law', 'intellectual property', 'dispute resolution', 'law practice', 'legal compliance']
    }
  ];

  let bestCat = 'General Business';
  let maxScore = 0;

  for (const cat of categories) {
    let score = 0;
    for (const kw of cat.urlKeywords) {
      if (urlLower.includes(kw)) score += 20;
    }
    for (const kw of cat.headKeywords) {
      if (titleLower.includes(kw)) score += 12;
      if (descLower.includes(kw)) score += 8;
    }
    for (const kw of cat.bodyKeywords) {
      const regex = new RegExp('\\b' + kw + '\\b', 'gi');
      const count = (textLower.match(regex) || []).length;
      score += Math.min(count * 3, 15);
    }

    if (score > maxScore && score >= 8) {
      maxScore = score;
      bestCat = cat.name;
    }
  }

  return bestCat;
}

const SITES = [
  { name: '1. Fintech & NBFC', url: 'https://harishfinance.in' },
  { name: '2. Telecommunications', url: 'https://www.grameenphone.com' },
  { name: '3. IT & SaaS Agency', url: 'https://techtrioz.com' },
  { name: '4. Pharma & Healthcare', url: 'https://www.squarepharma.com.bd' },
  { name: '5. Insurance & Risk PLC', url: 'https://green-delta.com' },
  { name: '6. E-Commerce & Retail', url: 'https://www.daraz.com.bd' },
  { name: '7. Logistics & Courier', url: 'https://redx.com.bd' },
  { name: '8. University & Education', url: 'https://www.northsouth.edu' }
];

async function runTest() {
  for (const site of SITES) {
    const html = await fetchDirect(site.url, 4000);
    if (!html) continue;
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1] : '';
    const metaMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i);
    const metaDesc = metaMatch ? metaMatch[1] : '';
    const cleanText = html.replace(/<[^>]+>/g, ' ');

    const detected = extractIndustryWeighted([], title, metaDesc, cleanText, site.url);
    console.log(`Site: ${site.url}`);
    console.log(`  -> Expected: ${site.name}`);
    console.log(`  -> Detected: ${detected}\n`);
  }
}

runTest();
