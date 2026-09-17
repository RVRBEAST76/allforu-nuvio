const hs = require('./providers/hotstar.js');
(async () => {
  for (const [id,type,s,e,name] of [
    ['tt0903747','tv',1,1,'Breaking Bad S1E1'],
    ['tt5753856','tv',1,1,'Dark S1E1'],
    ['tt9140554','tv',2,1,'Loki S2E1'],
  ]) {
    const r = await hs.getStreams(id,type,s,e);
    const dbg=r[0]&&r[0].quality==='DBG';
    console.log(name,'=>',r.length, dbg?('['+r[0].title+']'):('['+r[0].quality+' '+String(r[0].url).slice(0,60)+']'));
  }
})().catch(e=>console.log('ERR',e.message));
