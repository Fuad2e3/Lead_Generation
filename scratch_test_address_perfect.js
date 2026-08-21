const https = require('https');

function fetchUrl(targetUrl) {
  return new Promise((resolve) => {
    https.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', () => resolve(''));
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

function extractStreetAddressFromHtml(rawHtml) {
  // 1. Check for dedicated address HTML containers / icon list items
  const containerMatches = rawHtml.match(/<(?:span|p|div|li|address)\b[^>]*(?:class|id)=["'][^"']*(?:elementor-icon-list-text|address|location|contact-detail)[^"']*["'][^>]*>([\s\S]*?)<\/(?:span|p|div|li|address)>/gi) || [];
  for (const c of containerMatches) {
    const text = c.replace(/<[^>]+>/g, ' ').trim();
    if (/(?:dhaka|chittagong|sylhet|jaipur|mumbai|delhi|bangalore|mirpur|gulshan|banani|shewrapara|uttara|dhanmondi|bashundhara|mohakhali|road|sector|holding|plot|bazar)/i.test(text)) {
      if (/\b(?:\d{4,6}|\d{1,5}\/\w+|\b(?:1\d{3}|2\d{3}|3\d{3}|4\d{3}|5\d{3}|6\d{3}|7\d{3}|8\d{3}|9\d{3}))\b/.test(text)) {
        const clean = cleanAndFormatAddress(text);
        if (clean.length >= 12 && clean.length <= 150 && !clean.includes('http')) {
          return clean;
        }
      }
    }
  }

  // 2. Comprehensive Regex that catches full holding numbers: "1059/4/A, Jamtola Bazar..."
  const patterns = [
    /\b((?:\d{1,5}[\/\-A-Za-z0-9]*,?\s+)?(?:[A-Za-z0-9\s.,\(\)#\/-]{3,80},\s*(?:Mohakhali|Bashundhara|Baridhara|Gulshan|Banani|Dhanmondi|Motijheel|Uttara|Mirpur|Tejgaon|Badda|Shewrapara|Kawran\s*Bazar|Chittagong|Chattogram|Sylhet|Khulna|Rajshahi)[A-Za-z0-9\s.,\/-]{0,50}(?:Dhaka)?(?:[\s,-]*(?:1\d{3}|2\d{3}|3\d{3}|4\d{3}|5\d{3}|6\d{3}|7\d{3}|8\d{3}|9\d{3}))?))\b/i,
    /\b([A-Za-z0-9\s.,#-]{5,80},\s*(?:Sector|Road|Nagar|Marg|Bagh|Enclave|Vihar|Complex|Plaza|Tower|Building|Bhavan|GIDC|MIDC|Phase|Extension)[A-Za-z0-9\s.,#-]{0,60},\s*[A-Za-z\s]{3,30}(?:,\s*[A-Za-z\s]{3,30})?(?:[\s,-]+\d{6}))\b/i
  ];

  for (const p of patterns) {
    const match = rawHtml.match(p);
    if (match && match[1]) {
      const clean = cleanAndFormatAddress(match[1]);
      if (clean.length >= 12 && clean.length <= 150) {
        return clean;
      }
    }
  }

  return 'N/A';
}

async function testOriginateAddress() {
  const html = await fetchUrl('https://originatemarketing.com/');
  const result = extractStreetAddressFromHtml(html);
  console.log('════════════════════════════════════════════════════════════════════════');
  console.log(' ORIGINATE MARKETING ADDRESS TEST');
  console.log('════════════════════════════════════════════════════════════════════════');
  console.log('🎯 Extracted Address:');
  console.log(`   "${result}"`);
  console.log('════════════════════════════════════════════════════════════════════════');
}

testOriginateAddress();
