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
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
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

function cleanAndFormatAddress(raw) {
  if (!raw) return 'N/A';
  let clean = String(raw).replace(/<[^>]+>/g, ' ').replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
  clean = clean.replace(/^(?:Address|Location|Our Office|Head Office|Corporate Office|Physical Address|Find Us|Reach Us|Office Address)\s*[:\-–—]\s*/i, '');
  clean = clean.replace(/\b(?:Phone|Email|Call Now|Get in Touch|To More Inquiry|Contact Us|admin@|info@|sales@|support@|\+?\d{10,15})[\s\S]*/i, '').trim();
  clean = clean.replace(/\badmin\b\s*$/i, '').trim();
  clean = clean.replace(/[\s,\-]+$/, '').trim();
  return clean;
}

function extractStreetAddressFromHtml(rawHtml, fullText) {
  // 1. Check for dedicated address HTML containers / icon list items
  const containerMatches = rawHtml.match(/<(?:span|p|div|li|address)\b[^>]*(?:class|id)=["'][^"']*(?:elementor-icon-list-text|address|location|contact-detail|contact-info)[^"']*["'][^>]*>([\s\S]*?)<\/(?:span|p|div|li|address)>/gi) || [];
  for (const c of containerMatches) {
    const text = c.replace(/<[^>]+>/g, ' ').trim();
    if (/(?:dhaka|chittagong|sylhet|jaipur|mumbai|delhi|bangalore|mirpur|gulshan|banani|shewrapara|uttara|dhanmondi|bashundhara|mohakhali|road|sector|holding|plot|bazar|plaza)/i.test(text)) {
      if (/\b(?:\d{4,6}|\d{1,5}\/\w+|\b(?:1\d{3}|2\d{3}|3\d{3}|4\d{3}|5\d{3}|6\d{3}|7\d{3}|8\d{3}|9\d{3}))\b/.test(text) || /(?:bangladesh|india|dhaka|rajasthan)/i.test(text)) {
        const clean = cleanAndFormatAddress(text);
        if (clean.length >= 12 && clean.length <= 150 && !clean.includes('http') && !clean.includes('function(')) {
          return clean;
        }
      }
    }
  }

  // 2. Comprehensive Regex that catches full holding numbers
  const patterns = [
    /\b((?:\d{1,5}[\/\-A-Za-z0-9]*,?\s+)?(?:[A-Za-z0-9\s.,\(\)#\/-]{3,80},\s*(?:Mohakhali|Bashundhara|Baridhara|Gulshan|Banani|Dhanmondi|Motijheel|Uttara|Mirpur|Tejgaon|Badda|Shewrapara|Kawran\s*Bazar|Chittagong|Chattogram|Sylhet|Khulna|Rajshahi)[A-Za-z0-9\s.,\/-]{0,50}(?:Dhaka)?(?:[\s,-]*(?:1\d{3}|2\d{3}|3\d{3}|4\d{3}|5\d{3}|6\d{3}|7\d{3}|8\d{3}|9\d{3}))?))\b/i,
    /\b([A-Z]-?\d{1,4}[A-Z0-9,\s.-]{5,60},\s*(?:Jaipur|Mumbai|Delhi|Bangalore|Chennai|Hyderabad|Pune|Ahmedabad|Kolkata|Surat|Rajasthan|Gujarat|Maharashtra)[A-Za-z0-9\s.,#-]{0,60}(?:\s+\d{6})?)\b/i,
    /\b([A-Za-z0-9\s.,#-]{5,80},\s*(?:Sector|Road|Nagar|Marg|Bagh|Enclave|Vihar|Complex|Plaza|Tower|Building|Bhavan|GIDC|MIDC|Phase|Extension)[A-Za-z0-9\s.,#-]{0,60},\s*[A-Za-z\s]{3,30}(?:,\s*[A-Za-z\s]{3,30})?(?:[\s,-]+\d{6}))\b/i
  ];

  for (const p of patterns) {
    const match = (rawHtml + ' ' + (fullText || '')).match(p);
    if (match && match[1]) {
      const clean = cleanAndFormatAddress(match[1]);
      if (clean.length >= 12 && clean.length <= 150) {
        return clean;
      }
    }
  }

  return 'N/A';
}

const SITES = [
  'https://originatemarketing.com/',
  'https://harishfinance.in',
  'https://techtrioz.com',
  'https://www.squarepharma.com.bd'
];

async function runTest() {
  for (const url of SITES) {
    const html = await fetchDirect(url, 4000);
    const addr = extractStreetAddressFromHtml(html, html.replace(/<[^>]+>/g, ' '));
    console.log(`URL: ${url}`);
    console.log(`Address: "${addr}"\n`);
  }
}

runTest();
