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

async function inspectOriginate() {
  const html = await fetchUrl('https://originatemarketing.com/');
  console.log('HTML Length:', html.length);
  
  // Find where "Shewrapara" or "1216" or "Mirpur" appears in HTML
  const matches = html.match(/.{0,100}(?:Shewrapara|1216|Mirpur).{0,100}/gi) || [];
  console.log('\nMatches in HTML:');
  matches.forEach((m, i) => console.log(`[${i+1}] ${m.replace(/\s+/g, ' ')}`));
}

inspectOriginate();
