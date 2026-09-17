const hs = require('./providers/hotstar.js');
(async () => {
  for (const [id,type,s,e,name] of [
    ['tt30825738','movie',1,1,'Mandalorian Grogu'],
    ['tt9140554','tv',2,1,'Loki S2E1'],
  ]) {
    const r = await hs.getStreams(id,type,s,e);
    if (!r[0] || r[0].quality==='DBG') { console.log(name,'=> FAIL',r[0]&&r[0].title); continue; }
    const s0 = r[0];
    const res = await fetch(s0.url, { headers: s0.headers });
    const t = await res.text();
    const v = t.split('\n').find(l=>l.trim() && !l.startsWith('#') && l.includes('.m3u8'));
    const vr = await fetch(v, { headers: s0.headers });
    const vt = await vr.text();
    const durs = (vt.match(/#EXTINF:([0-9.]+)/g)||[]).map(x=>parseFloat(x.replace('#EXTINF:','')));
    const total = durs.reduce((a,b)=>a+b,0);
    console.log(name, '=>', s0.url.slice(0,55), '| DURATION:', Math.floor(total/60)+'m'+Math.floor(total%60)+'s', '('+Math.round(total)+'s)');
  }
})().catch(e=>console.log('ERR',e.message));
