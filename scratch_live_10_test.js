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
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        timeout: timeoutMs
      }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          clearTimeout(timer);
          let nextUrl = res.headers.location;
          if (!nextUrl.startsWith('http')) {
            nextUrl = new URL(nextUrl, targetUrl).href;
          }
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

function decodeHtmlEntities(str) {
  if (!str) return '';
  const ENTITY_MAP = {
    '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'",
    '&copy;': '©', '&reg;': '®', '&#8217;': "'", '&#8220;': '"', '&#8221;': '"', '&ndash;': '-', '&mdash;': '—'
  };
  return String(str).replace(/&(nbsp|amp|lt|gt|quot|#39|copy|reg|#8217|#8220|#8221|ndash|mdash);/gi, m => ENTITY_MAP[m.toLowerCase()] || m);
}

function cleanAndFormatSectionText(text) {
  if (!text || text === 'N/A' || text === 'Not Found' || text === 'Pending...' || text === 'Undefined') return 'N/A';
  let cleaned = String(text);
  cleaned = cleaned.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
                   .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
                   .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, ' ')
                   .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, ' ');
  cleaned = decodeHtmlEntities(cleaned);
  cleaned = cleaned.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return cleaned.length > 0 ? cleaned : 'N/A';
}

function extractJsonLdSchemas(html) {
  const schemas = [];
  const scriptMatches = html.match(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
  for (const s of scriptMatches) {
    const jsonText = s.replace(/<script\b[^>]*>|<\/script>/gi, '').trim();
    try {
      const parsed = JSON.parse(jsonText);
      if (Array.isArray(parsed)) {
        schemas.push(...parsed);
      } else if (parsed['@graph'] && Array.isArray(parsed['@graph'])) {
        schemas.push(...parsed['@graph']);
      } else {
        schemas.push(parsed);
      }
    } catch (_) { }
  }
  return schemas;
}

function extractCompanyName(schemas, rawHtml, fullText, baseUrl) {
  function isInvalidCompanyName(name) {
    if (!name || typeof name !== 'string') return true;
    const clean = name.trim().toLowerCase();
    if (clean.length < 2 || clean.length > 70) return true;
    const blacklisted = [
      'request rejected', 'access denied', '403 forbidden', '404 not found', '502 bad gateway',
      '503 service unavailable', 'blocked', 'attention required', 'security check', 'just a moment',
      'cloudflare', 'robot check', 'loading', 'untitled', 'website builder', 'please wait',
      'one moment', 'error', 'bad request', 'forbidden', 'not found', 'internal server error',
      'home', 'welcome', 'about', 'contact', 'services', 'index', 'official site', 'login', 'dashboard',
      'website', 'page', 'site', 'theme', 'wordpress', 'html5', 'bootstrap', 'skip to content',
      'gp website prod bot', 'bot'
    ];
    return blacklisted.some(b => clean === b || clean.startsWith(b) || (clean.includes(b) && clean.length < 30));
  }

  function stripSlogan(str) {
    if (!str || typeof str !== 'string') return '';
    const clean = str.trim();
    const parts = clean.split(/\s*[\-\|\–\—\•\:\/]\s*/);
    if (parts.length > 1) {
      const first = parts[0].trim();
      if (first.length >= 2 && first.length <= 40 && !isInvalidCompanyName(first)) {
        return first;
      }
    }
    return clean;
  }

  // 1. Schema.org JSON-LD
  for (const s of schemas || []) {
    const name = s.name || s.legalName || s.alternateName;
    if (name && typeof name === 'string' && !isInvalidCompanyName(name)) {
      return cleanAndFormatSectionText(stripSlogan(name.trim()));
    }
  }

  // 2. OpenGraph Meta Tags
  const ogMatch = rawHtml.match(/<meta\s+(?:property|name)=["'](?:og:site_name|application-name|publisher|author|copyright)["']\s+content=["']([^"']+)["']/i);
  if (ogMatch && ogMatch[1]) {
    const val = ogMatch[1].trim();
    if (!isInvalidCompanyName(val) && !val.toLowerCase().includes('http')) {
      return cleanAndFormatSectionText(stripSlogan(val));
    }
  }

  // 3. Logo Alt Text
  const logoMatch = rawHtml.match(/<(?:img|a)\b[^>]*(?:class|id)=["'][^"']*(?:logo|brand|site-title)[^"']*["'][^>]*alt=["']([^"']+)["']/i);
  if (logoMatch && logoMatch[1]) {
    const altText = logoMatch[1].trim();
    if (altText && !isInvalidCompanyName(altText)) {
      return cleanAndFormatSectionText(stripSlogan(altText.replace(/\s*logo\s*/gi, '').trim()));
    }
  }

  // 4. Page Title
  const titleMatch = rawHtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleMatch && titleMatch[1]) {
    const rawTitle = titleMatch[1].trim();
    if (!isInvalidCompanyName(rawTitle)) {
      const parts = rawTitle.split(/\s*[\-\|\–\—\•\:\/]\s*/);
      if (parts.length > 1) {
        const first = parts[0].trim();
        const last = parts[parts.length - 1].trim();
        if (!isInvalidCompanyName(first)) return cleanAndFormatSectionText(first);
        if (!isInvalidCompanyName(last)) return cleanAndFormatSectionText(last);
      } else {
        return cleanAndFormatSectionText(stripSlogan(rawTitle));
      }
    }
  }

  // 5. Copyright Match
  const copyMatch = fullText.match(/(?:©|Copyright|\(c\))\s*(?:\d{4}\s*[-–]\s*)?(?:\d{4})?\s*([A-Za-z0-9\s.,&'-]{2,50}?)(?:\.|\s+All\s+Rights|\s+Inc|\s+LLC|\s+Ltd|\s+Pvt|\s+GmbH|\s*$|\s*\|)/i);
  if (copyMatch && copyMatch[1]) {
    const cName = copyMatch[1].replace(/all rights reserved/gi, '').replace(/\b(?:by|for)\b/gi, '').trim();
    if (!isInvalidCompanyName(cName)) return cleanAndFormatSectionText(stripSlogan(cName));
  }

  // 6. Clean Domain Fallback
  try {
    if (baseUrl) {
      let host = new URL(baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`).hostname;
      host = host.replace(/^(?:www\.|app\.|portal\.|m\.)/i, '');
      const mainPart = host.split('.')[0];
      if (mainPart && mainPart.length >= 2) {
        return mainPart.split(/[-_]+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      }
    }
  } catch (_) { }

  return 'N/A';
}

function extractIndustry(schemas, rawHtml, fullText, baseUrl) {
  for (const s of schemas || []) {
    const ind = s.industry || s.category || s.knowsAbout;
    if (ind) {
      const val = Array.isArray(ind) ? ind.join(', ') : String(ind);
      if (val.trim().length >= 2 && val.trim().length <= 80) return cleanAndFormatSectionText(val);
    }
  }
  const textSample = (rawHtml + ' ' + fullText.slice(0, 5000)).toLowerCase();
  const categories = [
    { name: 'Fintech & Financial Services', keywords: ['loan', 'lending', 'nbfc', 'mortgage', 'finance', 'financial', 'fintech', 'credit card', 'banking', 'investment'] },
    { name: 'Information Technology & SaaS', keywords: ['software', 'saas', 'cloud platform', 'cybersecurity', 'ai solutions', 'api', 'mobile app', 'web application', 'it solutions', 'machine learning', 'devops'] },
    { name: 'E-Commerce & Online Retail', keywords: ['shop', 'store', 'cart', 'ecommerce', 'e-commerce', 'apparel', 'retail', 'products', 'order online', 'buy now', 'marketplace'] },
    { name: 'Healthcare & Medical Services', keywords: ['clinic', 'hospital', 'doctor', 'medical', 'dental', 'dentist', 'healthcare', 'pharma', 'health', 'surgery', 'medicine', 'pharmaceuticals'] },
    { name: 'Insurance & Risk Management', keywords: ['insurance', 'coverage', 'policy', 'underwriting', 'life insurance', 'health insurance', 'general insurance'] },
    { name: 'Telecommunications', keywords: ['telecom', 'broadband', 'internet service', 'mobile operator', 'cellular', 'grameenphone', 'banglalink', 'telenor'] },
    { name: 'Education & E-Learning', keywords: ['academy', 'course', 'training', 'school', 'university', 'learning', 'education', 'institute', 'north south'] },
    { name: 'Logistics & Supply Chain', keywords: ['shipping', 'logistics', 'freight', 'cargo', 'courier', 'transportation', 'delivery service', 'parcel'] },
    { name: 'Legal & Law Firm Services', keywords: ['lawyer', 'attorney', 'law firm', 'legal advice', 'litigation', 'solicitor', 'advocate', 'legal counsel'] }
  ];
  for (const cat of categories) {
    for (const kw of cat.keywords) {
      if (textSample.includes(kw)) return cat.name;
    }
  }
  return 'General Business';
}

function extractYearFounded(schemas, rawHtml, fullText) {
  const currentYear = new Date().getFullYear();
  for (const s of schemas || []) {
    const fd = s.foundingDate || s.foundingYear || s.dateCreated || s.datePublished;
    if (fd) {
      const m = String(fd).match(/(?:18|19|20)\d{2}/);
      if (m) {
        const yr = parseInt(m[0], 10);
        if (yr >= 1800 && yr <= currentYear) return String(yr);
      }
    }
  }
  const foundRegexes = [
    /\b(?:established|founded|est\.?|incepted|incorporated|incorporation|commenced(?:\s+operations)?|launched|journey started|operating since|serving since|trusted since)\b(?:(?!\b(?:18|19|20)\d{2}\b)[\s\S]){0,60}?\b((?:18|19|20)\d{2})\b/i,
    /\b(?:operations|commercial\s+operations|journey|services)\s+(?:started|commenced|began|launched|on|in)\s+(?:(?:on|in)\s+)?(?:[a-zA-Z]+\s+\d{1,2},?\s+)?\b((?:18|19|20)\d{2})\b/i,
    /\b(?:serving|operating\s+in)\s+[A-Za-z\s]{2,30}\s+since\s+\b((?:18|19|20)\d{2})\b/i,
    /\bsince\s+\b((?:18|19|20)\d{2})\b/i
  ];
  for (const r of foundRegexes) {
    const match = fullText.match(r);
    if (match && match[1]) {
      const yr = parseInt(match[1], 10);
      if (yr >= 1800 && yr <= currentYear - 1) return String(yr);
    }
  }
  const expRegex = /\b(?:over\s+|more\s+than\s+)?(\d{1,2})\+?\s*(?:years|yrs)\s*(?:of\s*(?:[a-z]+\s*){0,3}(?:experience|trust|excellence|service|expertise|presence|operation|working|banking|delivering)|in\s+(?:the\s+)?(?:industry|business|market|field)|serving|in\s+service)\b/i;
  const expMatch = fullText.match(expRegex);
  if (expMatch && expMatch[1]) {
    const years = parseInt(expMatch[1], 10);
    if (years >= 2 && years <= 100) {
      return `Est. ~${currentYear - years} (${years}+ Yrs Exp)`;
    }
  }
  const copySpanMatch = rawHtml.match(/(?:©|&copy;|copyright|\(c\))\s*((?:18|19|20)\d{2})\s*[-–—]\s*(?:(?:18|19|20)\d{2}|present)/i);
  if (copySpanMatch && copySpanMatch[1]) {
    const yr = parseInt(copySpanMatch[1], 10);
    if (yr >= 1800 && yr <= currentYear - 2) return String(yr);
  }
  const copySingleMatch = rawHtml.match(/(?:©|&copy;|copyright)\s*((?:19|20)\d{2})\b(?!\s*[-–—])/i);
  if (copySingleMatch && copySingleMatch[1]) {
    const yr = parseInt(copySingleMatch[1], 10);
    if (yr >= 1980 && yr <= currentYear - 2) return String(yr);
  }
  return 'N/A';
}

function extractPhones(rawHtml, fullText) {
  const phones = new Set();
  const phoneMatches = (rawHtml + ' ' + fullText).match(/(?:\+?880|01|\+?91|\+?1)[0-9\-\s\(\)]{8,16}/g) || [];
  phoneMatches.forEach(p => {
    const digits = p.replace(/\D/g, '');
    if (digits.length >= 10 && digits.length <= 14) {
      if (digits.startsWith('8801') && digits.length === 13) phones.add(`+880 ${digits.slice(3, 7)}-${digits.slice(7)}`);
      else if (digits.startsWith('01') && digits.length === 11) phones.add(`+880 ${digits.slice(1, 5)}-${digits.slice(5)}`);
      else if (digits.startsWith('91') && digits.length === 12) phones.add(`+91 ${digits.slice(2, 7)} ${digits.slice(7)}`);
      else if (digits.length === 10 && /^[6-9]/.test(digits)) phones.add(`+91 ${digits.slice(0, 5)} ${digits.slice(5)}`);
    }
  });
  return Array.from(phones);
}

function extractEmails(rawHtml) {
  const emails = new Set();
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi;
  const ignored = /\.(png|jpg|jpeg|gif|svg|webp|css|js|woff2?|ttf|pdf|ico)$/i;
  (rawHtml.match(emailRegex) || []).forEach(e => {
    const lower = e.toLowerCase().trim();
    if (!ignored.test(lower) && lower.length <= 60) emails.add(lower);
  });
  return Array.from(emails);
}

const SITES = [
  { name: '1. Fintech & NBFC', url: 'https://harishfinance.in' },
  { name: '2. Telecommunications', url: 'https://www.grameenphone.com' },
  { name: '3. IT & SaaS Agency', url: 'https://techtrioz.com' },
  { name: '4. Pharma & Healthcare', url: 'https://www.squarepharma.com.bd' },
  { name: '5. Insurance & Risk PLC', url: 'https://green-delta.com' },
  { name: '6. E-Commerce & Retail', url: 'https://www.daraz.com.bd' },
  { name: '7. Logistics & Courier', url: 'https://redx.com.bd' },
  { name: '8. University & Education', url: 'https://www.northsouth.edu' },
  { name: '9. Legal & Law Firm', url: 'https://www.thedhakalawyers.com' },
  { name: '10. Dead Domain (Fail-Fast)', url: 'https://harisance.in' }
];

async function run() {
  console.log('════════════════════════════════════════════════════════════════════════');
  console.log(' 10-DISTINCT-INDUSTRY LIVE SCRAPING & FIELD AUDIT');
  console.log('════════════════════════════════════════════════════════════════════════\n');

  for (const site of SITES) {
    const start = Date.now();
    console.log(`\n────────────────────────────────────────────────────────────────────────`);
    console.log(`📍 TYPE: ${site.name} | URL: ${site.url}`);
    console.log(`────────────────────────────────────────────────────────────────────────`);

    const html = await fetchDirect(site.url, 4000);
    const fetchTime = Date.now() - start;

    if (!html || html.length < 50) {
      console.log(`❌ Status: ERROR (Site Unreachable / Dead Domain) — Caught in ${fetchTime}ms [PASS FAIL-FAST]`);
      continue;
    }

    const schemas = extractJsonLdSchemas(html);
    const fullText = cleanAndFormatSectionText(html);

    const cName = extractCompanyName(schemas, html, fullText, site.url);
    const ind = extractIndustry(schemas, html, fullText, site.url);
    const year = extractYearFounded(schemas, html, fullText);
    const phones = extractPhones(html, fullText);
    const emails = extractEmails(html);

    console.log(`  🏢 Company Name:      "${cName}"`);
    console.log(`  🏭 Industry:          "${ind}"`);
    console.log(`  📅 Year Founded:      "${year}"`);
    console.log(`  📞 Phones:            [${phones.slice(0, 3).join(', ')}]`);
    console.log(`  ✉️ Emails:            [${emails.slice(0, 3).join(', ')}]`);
    console.log(`  ⏱️ Extraction Time:   ${Date.now() - start}ms`);
  }
}

run();
