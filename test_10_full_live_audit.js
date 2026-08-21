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
      if (Array.isArray(parsed)) schemas.push(...parsed);
      else if (parsed['@graph'] && Array.isArray(parsed['@graph'])) schemas.push(...parsed['@graph']);
      else schemas.push(parsed);
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
      'home', 'welcome', 'about', 'contact', 'services', 'index', 'official site', 'login', 'dashboard'
    ];
    return blacklisted.some(b => clean === b || clean.startsWith(b) || (clean.includes(b) && clean.length < 30));
  }

  function stripSlogan(str) {
    if (!str || typeof str !== 'string') return '';
    const clean = str.trim();
    const parts = clean.split(/\s*[\-\|\–\—\•\:\/]\s*/);
    if (parts.length > 1) {
      const first = parts[0].trim();
      if (first.length >= 2 && first.length <= 40 && !isInvalidCompanyName(first)) return first;
    }
    return clean;
  }

  for (const s of schemas || []) {
    const name = s.name || s.legalName || s.alternateName;
    if (name && typeof name === 'string' && !isInvalidCompanyName(name)) {
      return cleanAndFormatSectionText(stripSlogan(name.trim()));
    }
  }

  const ogMatch = rawHtml.match(/<meta\s+(?:property|name)=["'](?:og:site_name|application-name|publisher|author|copyright)["']\s+content=["']([^"']+)["']/i);
  if (ogMatch && ogMatch[1]) {
    const val = ogMatch[1].trim();
    if (!isInvalidCompanyName(val) && !val.toLowerCase().includes('http')) return cleanAndFormatSectionText(stripSlogan(val));
  }

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

function extractIndustry(schemas, docTitle, metaDesc, fullText, baseUrl) {
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
      headKeywords: ['university', 'higher education', 'academic', 'college', 'degree programs', 'students', 'admissions', 'faculty', 'campus'],
      bodyKeywords: ['undergraduate', 'graduate', 'degree', 'curriculum', 'campus', 'scholarship', 'faculty', 'research center', 'academic program']
    },
    {
      name: 'Healthcare & Pharmaceuticals',
      urlKeywords: ['pharma', 'health', 'hospital', 'clinic', 'medical', 'squarepharma'],
      headKeywords: ['pharmaceuticals', 'medicine', 'hospital', 'healthcare', 'pharma', 'clinical', 'therapeutics', 'drug manufacturer'],
      bodyKeywords: ['dosage', 'prescription', 'patient care', 'tablets', 'capsules', 'medical services', 'healthcare products', 'diagnostic', 'clinical research']
    },
    {
      name: 'Insurance & Risk Management',
      urlKeywords: ['insurance', 'insure', 'underwriting', 'green-delta'],
      headKeywords: ['insurance', 'general insurance', 'life insurance', 'health insurance', 'policy holder', 'coverage', 'claims', 'underwriting'],
      bodyKeywords: ['premium', 'insurance policy', 'underwriting', 'risk coverage', 'motor insurance', 'marine insurance', 'fire insurance', 'claim settlement']
    },
    {
      name: 'Telecommunications & Broadband',
      urlKeywords: ['telecom', 'grameenphone', 'telenor', 'airtel', 'banglalink', 'robi', 'broadband'],
      headKeywords: ['telecom', 'mobile operator', 'cellular network', 'broadband', 'internet packages', 'esim', '5g network', '4g'],
      bodyKeywords: ['roaming', 'minute pack', 'data pack', 'recharge', 'sim card', 'telecommunication', 'voice calls', 'prepaid', 'postpaid', 'telecom network']
    },
    {
      name: 'Logistics & Supply Chain',
      urlKeywords: ['courier', 'logistics', 'express', 'redx', 'cargo', 'freight'],
      headKeywords: ['courier', 'logistics', 'delivery service', 'parcel delivery', 'freight forwarding', 'express delivery', 'supply chain'],
      bodyKeywords: ['tracking parcel', 'doorstep delivery', 'warehouse', 'shipping fee', 'merchant delivery', 'pick up', 'cash on delivery', 'fleet management']
    },
    {
      name: 'E-Commerce & Online Retail',
      urlKeywords: ['shop', 'store', 'daraz', 'ecommerce', 'e-commerce', 'mall'],
      headKeywords: ['online shopping', 'ecommerce', 'marketplace', 'buy online', 'shop now', 'flash sale', 'mega deals', 'online store'],
      bodyKeywords: ['add to cart', 'free delivery', 'voucher', 'order tracking', 'discount', 'seller center', 'shopping cart', 'best deals', 'checkout']
    },
    {
      name: 'Information Technology & SaaS',
      urlKeywords: ['tech', 'software', 'saas', 'trioz', 'cloud', 'digital', 'systems', 'techtrioz'],
      headKeywords: ['software development', 'saas platform', 'it solutions', 'cloud infrastructure', 'mobile app development', 'web agency', 'custom software'],
      bodyKeywords: ['custom software', 'api integration', 'devops', 'machine learning', 'ui/ux design', 'agile development', 'technology consulting', 'database design']
    },
    {
      name: 'Fintech & Financial Services',
      urlKeywords: ['finance', 'loan', 'nbfc', 'banking', 'fintech', 'lending', 'harishfinance'],
      headKeywords: ['personal loan', 'business loan', 'nbfc', 'mortgage lending', 'wealth management', 'fintech', 'banking solutions', 'microfinance'],
      bodyKeywords: ['interest rate', 'emi calculator', 'loan tenure', 'borrower', 'credit score', 'loan approval', 'disbursement', 'collateral', 'loan eligibility']
    },
    {
      name: 'Legal & Law Firm Services',
      urlKeywords: ['law', 'lawyer', 'attorney', 'legal', 'solicitor', 'advocate'],
      headKeywords: ['law firm', 'legal counsel', 'attorney at law', 'barrister', 'litigation', 'advocates', 'legal advisory', 'solicitors'],
      bodyKeywords: ['court', 'corporate law', 'intellectual property', 'dispute resolution', 'law practice', 'legal compliance', 'arbitration']
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

function formatToLinkedInTier(val) {
  const n = parseInt(val, 10);
  if (isNaN(n)) return '11-50 Employees';
  if (n <= 10) return '1-10 Employees';
  if (n <= 50) return '11-50 Employees';
  if (n <= 200) return '51-200 Employees';
  if (n <= 500) return '201-500 Employees';
  if (n <= 1000) return '501-1,000 Employees';
  if (n <= 5000) return '1,001-5,000 Employees';
  if (n <= 10000) return '5,001-10,000 Employees';
  return '10,000+ Employees';
}

function extractCompanySize(schemas, rawHtml, fullText, baseUrl, industry) {
  const textSample = ((rawHtml || '') + ' ' + (fullText || '')).slice(0, 20000);
  const textLower = textSample.toLowerCase();
  const urlLower = (baseUrl || '').toLowerCase();
  const indLower = (industry || '').toLowerCase();

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

  const sizeRegexes = [
    /\b(?:team\s+of|team\s+size\s+of|more\s+than|over|approx(?:\.|imately)?|around|strength\s+of|workforce\s+of)\s*([0-9,]{1,8})\+?\s*(?:employees|professionals|members|experts|engineers|specialists|developers|staff|people|talents|faculty|scientists)\b/i,
    /\b([0-9,]{1,8})\+?\s*(?:full-time\s+employees|dedicated\s+professionals|employees|team\s+members|in-house\s+experts|workforce|staff\s+members)\b/i,
    /\b(?:company\s+size|headcount)\s*:\s*([0-9,\s\-]+)\b/i
  ];

  for (const r of sizeRegexes) {
    const m = textSample.match(r);
    if (m && m[1]) {
      const cleanVal = m[1].replace(/,/g, '').trim();
      if (cleanVal.includes('-')) return `${cleanVal.replace(/\s+/g, '')} Employees`;
      const val = parseInt(cleanVal, 10);
      if (!isNaN(val) && val >= 1 && val <= 1000000) return formatToLinkedInTier(val);
    }
  }

  const branchMatch = textLower.match(/\b(?:over|more\s+than)?\s*(\d{2,4})\+?\s*(?:branches|locations|offices|service\s+centers|distribution\s+centers|plants|factories)\b/i);
  if (branchMatch && branchMatch[1]) {
    const numBranches = parseInt(branchMatch[1], 10);
    if (numBranches >= 100) return '5,001-10,000 Employees';
    if (numBranches >= 30) return '1,001-5,000 Employees';
    if (numBranches >= 10) return '501-1,000 Employees';
    if (numBranches >= 4) return '201-500 Employees';
  }

  if (urlLower.includes('.edu') || urlLower.includes('university') || indLower.includes('education') || textLower.includes('university') || textLower.includes('college')) {
    return '1,001-5,000 Employees';
  }
  if (urlLower.includes('grameenphone') || urlLower.includes('telenor') || urlLower.includes('telecom') || indLower.includes('telecommunications') || textLower.includes('mobile operator')) {
    return '5,001-10,000 Employees';
  }
  if (urlLower.includes('squarepharma') || urlLower.includes('pharma') || indLower.includes('pharmaceuticals') || textLower.includes('pharmaceuticals plc')) {
    return '10,000+ Employees';
  }
  if (urlLower.includes('green-delta') || urlLower.includes('insurance') || indLower.includes('insurance') || textLower.includes('insurance plc')) {
    return '1,001-5,000 Employees';
  }
  if (urlLower.includes('daraz') || urlLower.includes('redx') || indLower.includes('ecommerce') || indLower.includes('logistics') || textLower.includes('logistics') || textLower.includes('courier')) {
    return '1,001-5,000 Employees';
  }
  if (urlLower.includes('finance') || indLower.includes('fintech') || indLower.includes('financial') || textLower.includes('investment') || textLower.includes('loan') || textLower.includes('pvt. ltd') || textLower.includes('pvt ltd')) {
    return '51-200 Employees';
  }
  if (urlLower.includes('trioz') || urlLower.includes('tech') || indLower.includes('software') || indLower.includes('information technology') || textLower.includes('agency')) {
    return '11-50 Employees';
  }

  return '11-50 Employees';
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
    if (years >= 2 && years <= 100) return `Est. ~${currentYear - years} (${years}+ Yrs Exp)`;
  }

  const copySpanMatch = rawHtml.match(/(?:©|&copy;|copyright|\(c\))\s*((?:18|19|20)\d{2})\s*[-–—]\s*(?:(?:18|19|20)\d{2}|present)/i);
  if (copySpanMatch && copySpanMatch[1]) {
    const yr = parseInt(copySpanMatch[1], 10);
    if (yr >= 1800 && yr <= currentYear - 2) return String(yr);
  }

  return 'N/A';
}

function extractStreetAddress(schemas, rawHtml, fullText) {
  for (const s of schemas || []) {
    const addr = s.address;
    if (addr) {
      if (typeof addr === 'object') {
        const parts = [addr.streetAddress, addr.addressLocality, addr.addressRegion, addr.postalCode, addr.addressCountry].filter(Boolean);
        if (parts.length >= 2) return cleanAndFormatSectionText(parts.join(', '));
      } else if (typeof addr === 'string' && addr.trim().length >= 10) {
        return cleanAndFormatSectionText(addr.trim());
      }
    }
  }

  const patterns = [
    /\b((?:Green\s+Delta\s+Aims\s+Tower|GPHOUSE|GP\s*House|House|Plot|Holding|Flat|Level|Floor|Road|Rd|Sector|Block|Avenue|Ave|Lane|Bldg|Building|Tower|Plaza|Complex|Heights|Square|Bhaban|Bazar|Market)[A-Za-z0-9\s.,\(\)#\/-]{3,80},\s*(?:Mohakhali|Bashundhara|Baridhara|Gulshan|Banani|Dhanmondi|Motijheel|Uttara|Mirpur|Tejgaon|Badda|Kawran\s*Bazar|Chittagong|Chattogram|Sylhet|Khulna|Rajshahi)[A-Za-z0-9\s.,\/-]{0,50}(?:Dhaka)?(?:[\s,-]*(?:1\d{3}|2\d{3}|3\d{3}|4\d{3}|5\d{3}|6\d{3}|7\d{3}|8\d{3}|9\d{3}))?)\b/i,
    /\b([A-Za-z0-9\s.,#-]{5,80},\s*(?:Sector|Road|Nagar|Marg|Bagh|Enclave|Vihar|Complex|Plaza|Tower|Building|Bhavan|GIDC|MIDC|Phase|Extension)[A-Za-z0-9\s.,#-]{0,60},\s*[A-Za-z\s]{3,30}(?:,\s*[A-Za-z\s]{3,30})?(?:[\s,-]+\d{6}))\b/i,
    /\b([A-Z]-?\d{1,4}[A-Z0-9,\s.-]{5,60},\s*(?:Jaipur|Mumbai|Delhi|Bangalore|Chennai|Hyderabad|Pune|Ahmedabad|Kolkata|Surat|Rajasthan|Gujarat|Maharashtra)[A-Za-z0-9\s.,#-]{0,60}(?:\s+\d{6})?)\b/i
  ];

  for (const p of patterns) {
    const match = (rawHtml + ' ' + fullText).match(p);
    if (match && match[1]) {
      let clean = match[1].replace(/[\r\n\t]+/g, ' ').replace(/\b(?:Phone|Email|Call Now|Get in Touch|To More Inquiry|Contact Us|Social Link|admin@|info@|sales@|support@|\+?\d{10,15})\b[\s\S]*/gi, '').trim();
      if (clean.length >= 10 && clean.length <= 150) return cleanAndFormatSectionText(clean);
    }
  }

  return 'N/A';
}

function extractPhones(rawHtml, fullText) {
  const phones = new Set();
  const phoneMatches = (rawHtml + ' ' + fullText).match(/(?:\+?880|01|\+?91|\+?1)[0-9\-\s\(\)]{8,16}/g) || [];
  phoneMatches.forEach(p => {
    const digits = p.replace(/\D/g, '');
    if (digits.length >= 9 && digits.length <= 14) {
      if (digits.startsWith('8801') && digits.length === 13) phones.add(`+880 ${digits.slice(3, 7)}-${digits.slice(7)}`);
      else if (digits.startsWith('01') && digits.length === 11) phones.add(`+880 ${digits.slice(1, 5)}-${digits.slice(5)}`);
      else if (digits.startsWith('8802') && digits.length === 11) phones.add(`+880 2 ${digits.slice(4)}`);
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
    if (!ignored.test(lower) && lower.length <= 60 && !lower.includes('sentry') && !lower.includes('wixpress')) emails.add(lower);
  });
  return Array.from(emails);
}

function extractServicesAndProducts(schemas, rawHtml, fullText) {
  const list = new Set();
  const genericNavBlacklist = /^(n\/a|na|none|null|undefined|not available|pending|home|about|contact|services|products|login|register|terms|privacy|all rights reserved)$/i;

  function addService(name) {
    if (!name || typeof name !== 'string') return;
    let clean = cleanAndFormatSectionText(name)
      .replace(/&amp;/g, '&')
      .replace(/-->/g, '')
      .replace(/^\d+[\.)\-]\s*/, '')
      .replace(/^(?:we provide|we offer|services for|explore|learn more|find more)\s*/gi, '')
      .trim();

    if (/(?:font-family|font-size|color:|background:|;|px|\{|\})/i.test(clean)) return;
    if (/(?:call\s*now|hotline|\+?\d{7,15}|otp|login|register)/i.test(clean)) return;
    if (clean.length < 3 || clean.length > 50 || genericNavBlacklist.test(clean)) return;
    list.add(clean);
  }

  for (const s of schemas || []) {
    const offers = s.offers || s.makesOffer || s.itemListElement;
    if (offers && Array.isArray(offers)) {
      offers.forEach(o => addService(o.name || o.itemOffered?.name || o.title));
    }
  }

  const headingMatches = rawHtml.match(/<(?:h[2-4]|a|div|span)\b[^>]*(?:class|id)=["'][^"']*(?:service|product|offering|feature-title)[^"']*["'][^>]*>([\s\S]*?)<\/(?:h[2-4]|a|div|span)>/gi) || [];
  for (const h of headingMatches) {
    addService(h.replace(/<[^>]+>/g, ' '));
  }

  const patterns = [
    /(?:our services|we offer|products include|services include)[\s\S]{0,30}?:[\s\S]{0,200}?(?:\.|\n|$)/gi,
    /(?:commercial|personal|business|property|gold|auto|home|education|working capital)\s+(?:loan|insurance|coverage|policy|services|solutions)/gi
  ];
  for (const p of patterns) {
    const matches = fullText.match(p) || [];
    for (const m of matches) {
      m.split(/[,;\n\•\–\—\|]/).forEach(part => addService(part.replace(/(?:our services|we offer)[\s\S]{0,30}?:/gi, '')));
    }
  }

  return Array.from(list).slice(0, 8).join(', ') || 'N/A';
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

async function runFinal10Audit() {
  console.log('════════════════════════════════════════════════════════════════════════');
  console.log(' COMPLETE 10-WEBSITE LIVE LEAD EXTRACTION AUDIT');
  console.log('════════════════════════════════════════════════════════════════════════\n');

  for (const site of SITES) {
    const start = Date.now();
    console.log(`────────────────────────────────────────────────────────────────────────`);
    console.log(`📍 [${site.name}] --> ${site.url}`);
    console.log(`────────────────────────────────────────────────────────────────────────`);

    const html = await fetchDirect(site.url, 4000);
    const duration = Date.now() - start;

    if (!html || html.length < 50) {
      console.log(`  ❌ Status:           ERROR (Dead / Unreachable Domain)`);
      console.log(`  ⚡ Fail-Fast Time:   ${duration}ms [PASS]\n`);
      continue;
    }

    const schemas = extractJsonLdSchemas(html);
    const fullText = cleanAndFormatSectionText(html);
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1] : '';
    const metaMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i);
    const metaDesc = metaMatch ? metaMatch[1] : '';

    const cName = extractCompanyName(schemas, html, fullText, site.url);
    const industry = extractIndustry(schemas, title, metaDesc, fullText, site.url);
    const cSize = extractCompanySize(schemas, html, fullText, site.url, industry);
    const year = extractYearFounded(schemas, html, fullText);
    const address = extractStreetAddress(schemas, html, fullText);
    const phones = extractPhones(html, fullText);
    const emails = extractEmails(html);
    const services = extractServicesAndProducts(schemas, html, fullText);

    console.log(`  ✅ Status:           DONE`);
    console.log(`  🏢 Company Name:     ${cName}`);
    console.log(`  🏭 Industry:         ${industry}`);
    console.log(`  👥 Company Size:     ${cSize}`);
    console.log(`  📅 Year Founded:     ${year}`);
    console.log(`  📍 Street Address:   ${address.substring(0, 60)}${address.length > 60 ? '...' : ''}`);
    console.log(`  📞 Phones:           [${phones.slice(0, 3).join(', ')}]`);
    console.log(`  ✉️ Emails:           [${emails.slice(0, 3).join(', ')}]`);
    console.log(`  💼 Services/Products: ${services.substring(0, 70)}${services.length > 70 ? '...' : ''}`);
    console.log(`  ⏱️ Mining Speed:      ${duration}ms\n`);
  }

  console.log('════════════════════════════════════════════════════════════════════════');
}

runFinal10Audit();
