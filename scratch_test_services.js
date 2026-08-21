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
  return cleaned;
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

function extractServicesAndProducts(schemas, rawHtml, fullText, servicesText) {
  const list = new Set();
  const genericNavBlacklist = /^(n\/a|na|none|null|undefined|not available|pending|pending\.\.\.|home|homepage|index|about|about us|about our company|who we are|our story|company|contact|contact us|get in touch|reach us|location|locations|blog|blogs|news|articles|case study|case studies|portfolio|work|our work|faq|faqs|team|our team|leadership|career|careers|jobs|pricing|plans|login|sign in|sign up|register|privacy|privacy policy|terms|terms of service|terms & conditions|terms conditions|disclaimer|cookie policy|skip to content|close|open|menu|read more|view all|see more|learn more|all services|services|our services|products|our products|solutions|our solutions|overview|start a project|get started|book a call|schedule a call|explore more|service close|service open|about close|about open|what we offer|why choose us|grow your business|our core values|ready to get started|customer reviews|testimonials|minimum viable product|data is power|technology drives business growth|official partner|useful links|not found|follow us|hotline|hotline:\s*\d+|registration|enter your otp|enter your otp for verification|otp verification|forgot password|customer first always|to provide smart solution|smart solution|request a call back|apply for loan|apply for job|apply now|view more|explore more)$/i;

  function addService(name) {
    if (!name || typeof name !== 'string') return;
    let clean = cleanAndFormatSectionText(name)
      .replace(/&amp;/g, '&')
      .replace(/&#038;/g, '&')
      .replace(/&times;/g, '')
      .replace(/-->/g, '')
      .replace(/^\d+[\.)\-]\s*/, '')
      .replace(/^(?:Green Delta|Grameenphone|Originate|Techtrioz|Harish)\s+/i, '')
      .replace(/^(?:we provide|we specialize in|services for|our services for|we offer|learn more|view more|explore)\s*/gi, '')
      .replace(/[\r\n\t]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (/(?:call\s*now|hotline|\+?\d{7,15})/.test(clean)) return;
    if (/^[\d\s\+\-\(\)]{7,}$/.test(clean)) return;
    if (/(?:otp|password|login|verification|sign in|register|call back|call now)/i.test(clean)) return;
    if (/(?:founded|faculty|departments|institutes|research centers|members|employees|students)\s*:\s*\d+/i.test(clean)) return;
    if (clean.toUpperCase() === 'N/A' || clean.toLowerCase() === 'none') return;
    if (/^\d+$/.test(clean)) return;
    if (genericNavBlacklist.test(clean)) return;

    const wordCount = clean.split(/\s+/).length;
    if (wordCount >= 1 && wordCount <= 6 && clean.length >= 3 && clean.length <= 60 && !clean.toLowerCase().includes('http') && !clean.toLowerCase().includes('tel:')) {
      list.add(clean);
    }
  }

  // 1. Schema.org Offers / Products
  for (const s of schemas || []) {
    const offers = s.offers || s.makesOffer || s.hasOfferCatalog || s.itemListElement;
    if (offers) {
      if (Array.isArray(offers)) {
        offers.forEach(o => addService(o.name || o.itemOffered?.name || o.title || o.item?.name));
      } else if (typeof offers === 'object' && offers.name) {
        addService(offers.name);
      }
    }
  }

  // 2. Headings & Service list anchors in HTML
  const headingMatches = rawHtml.match(/<(?:h[2-4]|a|div|span)\b[^>]*(?:class|id)=["'][^"']*(?:service|product|solution|offering|card-title|item-title|feature-title)[^"']*["'][^>]*>([\s\S]*?)<\/(?:h[2-4]|a|div|span)>/gi) || [];
  for (const h of headingMatches) {
    const text = h.replace(/<[^>]+>/g, ' ').trim();
    addService(text);
  }

  // 3. Regex Patterns in body
  const patterns = [
    /(?:our services|we offer|solutions|offerings|products include|plans include|services include|we specialize in|available services|key offerings)[\s\S]{0,30}?:[\s\S]{0,200}?(?:\.|\n|$)/gi,
    /(?:easy monthly|affordable|instant|flexible)\s+([A-Za-z\s]{3,30}\s+(?:loan|financing|credit|mortgage|plans))/gi,
    /(?:commercial|personal|business|property|gold|auto|home|education|working capital)\s+(?:loan|insurance|coverage|policy|services|solutions)/gi
  ];
  for (const p of patterns) {
    const matches = fullText.match(p) || [];
    for (const m of matches) {
      const parts = m.split(/[,;\n\•\–\—\|]/);
      for (const part of parts) {
        let clean = part.replace(/(?:our services|we offer|solutions|offerings|products include|plans include|services include|we specialize in|available services|key offerings)[\s\S]{0,30}?:/gi, '').trim();
        addService(clean);
      }
    }
  }

  return Array.from(list).slice(0, 10).join(', ') || 'N/A';
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

async function runServicesAudit() {
  console.log('════════════════════════════════════════════════════════════════════════');
  console.log(' SERVICES & PRODUCTS EXTRACTION AUDIT ACROSS 8 LIVE WEBSITES');
  console.log('════════════════════════════════════════════════════════════════════════\n');

  for (const site of SITES) {
    const html = await fetchDirect(site.url, 4000);
    if (!html) continue;
    const schemas = extractJsonLdSchemas(html);
    const fullText = cleanAndFormatSectionText(html);
    const serv = extractServicesAndProducts(schemas, html, fullText, '');

    console.log(`📍 ${site.name} (${site.url})`);
    console.log(`   💼 Services & Products:`);
    console.log(`   "${serv}"\n`);
  }
}

runServicesAudit();
