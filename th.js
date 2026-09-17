const hs = require('./providers/hotstar.js');
(async () => {
  console.log('=== Hotstar: The Mandalorian and Grogu (tt30825738) ===');
  let r = await hs.getStreams('tt30825738','movie',1,1);
  r.slice(0,3).forEach(s=>console.log(' ',s.name,'|',s.quality,'|',String(s.url).slice(0,70)));
  console.log('=== Hotstar series: Loki tt9140554 S1E1 ===');
  r = await hs.getStreams('tt9140554','tv',1,1);
  r.slice(0,3).forEach(s=>console.log(' ',s.name,'|',s.quality,'|',String(s.url).slice(0,70)));
})().catch(e=>console.log('ERR',e.message));
