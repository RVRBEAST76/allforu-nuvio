const hs = require('./providers/hotstar.js');
(async () => {
  for (const [id,type,s,e,name] of [
    ['tt9140554','tv',2,1,'Loki S2E1'],
    ['tt30825738','movie',1,1,'Mandalorian Grogu'],
    ['tt0458290','movie',1,1,'Deadpool'],
    ['tt0111161','movie',1,1,'Shawshank'],
  ]) {
    const r = await hs.getStreams(id,type,s,e);
    const dbg=r[0]&&r[0].quality==='DBG';
    console.log(name,'=>',r.length, dbg?('['+r[0].title.slice(0,50)+']'):('['+r[0].quality+' '+String(r[0].url).slice(0,55)+']'));
  }
})().catch(e=>console.log('ERR',e.message));
