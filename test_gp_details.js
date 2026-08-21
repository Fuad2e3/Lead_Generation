const https = require('https');

function fetchDirect(url) {
  return new Promise((resolve) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36'
      },
      timeout: 10000
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    }).on('error', () => resolve(''));
  });
}

async function test() {
  const html = await fetchDirect('https://www.grameenphone.com/about/corporate-information');
  console.log('Fetched About length:', html.length);
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  console.log('Text snippet:', text.substring(0, 1000));

  // Check 1997
  const match1997 = text.match(/(?:1996|1997|1998|1999|200\d)[^.]{0,100}/gi) || [];
  console.log('\nYear matches in text:', match1997.slice(0, 5));
}

test();
