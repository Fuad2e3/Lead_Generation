const https = require('https');
const fs = require('fs');

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,*/*',
      },
      timeout: 15000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
  });
}

async function test() {
  console.log('Fetching https://www.harishfinance.in/...');
  const html = await fetchPage('https://www.harishfinance.in/');
  const fullText = html.replace(/<style[\s\S]*?<\/style>/gi, ' ')
                       .replace(/<script[\s\S]*?<\/script>/gi, ' ')
                       .replace(/<[^>]+>/g, ' ')
                       .replace(/\s+/g, ' ');

  // 1. Year Founded Test
  const currentYear = new Date().getFullYear();
  const expRegex = /\b(?:over\s+|more\s+than\s+)?(\d{1,2})\+?\s*(?:years|yrs)\s*(?:of\s*(?:[a-z]+\s*){0,3}(?:experience|trust|excellence|service|expertise|presence|operation|working|banking|delivering)|in\s+(?:the\s+)?(?:industry|business|market|field)|serving|in\s+service)\b/i;
  const expMatch = fullText.match(expRegex);
  console.log('\n--- YEAR FOUNDED TEST ---');
  console.log('Match Found:', expMatch ? expMatch[0] : 'None');
  if (expMatch && expMatch[1]) {
    const years = parseInt(expMatch[1], 10);
    const estYear = currentYear - years;
    console.log(`Year Founded Result: Est. ~${estYear} (${years}+ Yrs Exp)`);
  }

  // 2. Services & Products Test
  console.log('\n--- SERVICES & PRODUCTS TEST ---');
  const list = new Set();
  const genericNavBlacklist = /^(n\/a|na|none|null|undefined|not available|pending|pending\.\.\.|home|homepage|index|about|about us|about our company|who we are|our story|company|contact|contact us|get in touch|reach us|location|locations|blog|blogs|news|articles|case study|case studies|portfolio|work|our work|faq|faqs|team|our team|leadership|career|careers|jobs|pricing|plans|login|sign in|sign up|register|privacy|privacy policy|terms|terms of service|terms & conditions|terms conditions|disclaimer|cookie policy|skip to content|close|open|menu|read more|view all|see more|learn more|all services|services|our services|products|our products|solutions|our solutions|overview|start a project|get started|book a call|schedule a call|explore more|service close|service open|about close|about open|what we offer|why choose us|grow your business|our core values|ready to get started|customer reviews|testimonials|minimum viable product|data is power|technology drives business growth|official partner|useful links|not found|follow us|hotline|hotline:\s*\d+|registration|enter your otp|enter your otp for verification|otp verification|forgot password|customer first always|to provide smart solution|smart solution|request a call back|apply for loan|apply for job|apply now|view more|explore more)$/i;

  function addService(name) {
    if (!name || typeof name !== 'string') return;
    let clean = name.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (/(?:call\s*now|hotline|\+?\d{7,15})/.test(clean)) return;
    if (/^[\d\s\+\-\(\)]{7,}$/.test(clean)) return;
    if (/(?:otp|password|login|verification|sign in|register|call back|call now)/i.test(clean)) return;
    if (genericNavBlacklist.test(clean)) return;
    if (clean.length >= 3 && clean.length <= 60) list.add(clean);
  }

  // Check Schema description
  const schemaMatches = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi) || [];
  for (const sStr of schemaMatches) {
    try {
      const json = JSON.parse(sStr.replace(/<[^>]+>/g, ''));
      if (json.description) {
        const descMatch = json.description.match(/(?:speciali[sz]e in|we offer|we provide|including|such as|from)\s+([^.]{10,200})/i);
        if (descMatch && descMatch[1]) {
          descMatch[1].split(/[,;]|\s+and\s+/i).forEach(item => addService(item.trim()));
        }
      }
    } catch(e) {}
  }

  // Check specialize in from text
  const matchSpec = fullText.match(/specialize in\s+([^.]+)/i);
  if (matchSpec && matchSpec[1]) {
    matchSpec[1].split(/[,;]|\s+and\s+/i).forEach(item => addService(item.trim().replace(/^and\s+/i, '')));
  }

  // Check heading services
  const headingMatches = html.match(/<h[2-5][^>]*>([^<]+)<\/h[2-5]>/gi) || [];
  headingMatches.forEach(h => {
    const text = h.replace(/<[^>]+>/g, '').trim();
    if (/loan|finance|investment|credit|advisory|banking/i.test(text)) {
      addService(text);
    }
  });

  console.log('Services Extracted:', Array.from(list));
}

test().catch(console.error);
