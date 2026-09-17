const mb = require('./providers/moviebox.js');
(async () => {
  console.log('=== Movie tt1375666 (verify stream) ===');
  const m = await mb.getStreams('tt1375666','movie',1,1);
  m.forEach(s=>console.log(' ',s.quality,'|',s.url.slice(0,75)));
  if (m[0] && !m[0].quality.includes('DBG')) {
    const r = await fetch(m[0].url, { headers: m[0].headers });
    const b = await r.arrayBuffer();
    console.log('  FETCH:', r.status, b.byteLength, 'bytes');
  }
  console.log('=== Series tt0903747 S1E1 ===');
  const s = await mb.getStreams('tt0903747','tv',1,1);
  s.slice(0,3).forEach(x=>console.log(' ',x.quality,'|',x.url.slice(0,75)));
})().catch(e=>console.log('ERR',e.message));
