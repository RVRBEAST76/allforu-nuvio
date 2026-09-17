const hs = require('./providers/hotstar.js');
(async () => {
  for (const [id,type,s,e,name,expMin] of [
    ['tt30825738','movie',1,1,'Mandalorian Grogu',90],
    ['tt9140554','tv',2,1,'Loki S2E1',40],
  ]) {
    const r = await hs.getStreams(id,type,s,e);
    const st = r[0];
    if (!st || st.quality==='DBG') { console.log(name,'=> FAIL',st&&st.title); continue; }
    const res = await fetch(st.url, { headers: st.headers });
    const t = await res.text();
    console.log('['+name+'] master status', res.status, 'lines', t.split('\n').length);
    const v = t.split('\n').find(l=>l.trim() && !l.startsWith('#') && l.includes('.m3u8'));
    if (!v) { console.log('  NO VARIANT. master:', t.slice(0,200)); continue; }
    const vr = await fetch(v, { headers: st.headers });
    const vt = await vr.text();
    const durs = (vt.match(/#EXTINF:([0-9.]+)/g)||[]).map(x=>parseFloat(x.replace('#EXTINF:','')));
    const total = durs.reduce((a,b)=>a+b,0);
    console.log('  variant', v.slice(0,50), '=> segs', durs.length, 'DURATION', Math.floor(total/60)+'m'+Math.floor(total%60)+'s');
  }
})().catch(e=>console.log('ERR',e.message));
