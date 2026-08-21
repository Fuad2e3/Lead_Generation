const https = require('https');

function fetchProxy(url) {
  return new Promise((resolve) => {
    const pUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
    https.get(pUrl, { timeout: 10000 }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.contents || '');
        } catch (_) {
          resolve('');
        }
      });
    }).on('error', () => resolve(''));
  });
}

async function test() {
  const html = await fetchProxy('https://www.grameenphone.com/');
  console.log('Proxy HTML length:', html.length);
  console.log('Title:', (html.match(/<title[^>]*>([^<]+)<\/title>/i) || [])[1]);
  console.log('Has 1997:', html.includes('1997'));
  const m1997 = html.match(/(?:1996|1997|1998|1999)[^.]{0,100}/gi) || [];
  console.log('Matches:', m1997.slice(0, 5));
}

test();
