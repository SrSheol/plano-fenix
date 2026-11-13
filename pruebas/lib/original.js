// Maneja la app ORIGINAL (referencia/index-exp-fenix.html) en Chrome sin red, para comparar sus PDF con los de plano-fenix.
// No modifica el archivo: los datos de muestra se ponen en SU IndexedDB ('fenixmex-nom020') como si se hubieran capturado ahí.
'use strict';
const C=require('./comun');

async function abrirOriginal(ctx,base){
  const p=await ctx.newPage();p._errs=C.vigilar(p);
  p.on('dialog',d=>{(p._dialogos=p._dialogos||[]).push(d.message());d.accept().catch(()=>{});});
  await p.goto(base+'/referencia/index-exp-fenix.html');
  await listo(p);return p;
}
async function listo(p){
  await p.waitForFunction(()=>window.FXPlano&&document.querySelector('#estadoGuardado')&&!/Cargando/.test(document.querySelector('#estadoGuardado').textContent)&&document.querySelector('#eqTabs [data-eqt]'),null,{timeout:120000});
  await p.waitForTimeout(500);
}
// plano de plano-fenix (formato .json) → borrador, globales e imágenes de FenixMex. extra = campos del expediente (no salen en el plano).
async function inyectar(p,plano,extra){
  const D=Object.assign(JSON.parse(JSON.stringify(plano.D)),extra||{}),G=plano.G,imgs=plano.imgs||{};
  await p.evaluate(async({D,G,imgs})=>{
    const db=await new Promise((res,rej)=>{const q=indexedDB.open('fenixmex-nom020',1);q.onupgradeneeded=()=>q.result.createObjectStore('kv');q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error);});
    const u8=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
    await new Promise((res,rej)=>{const t=db.transaction('kv','readwrite'),s=t.objectStore('kv');
      s.clear();s.put(D,'draft');s.put(Object.assign({firmanteIzquierdoNombre:'',firmanteIzquierdoCedula:'',pnd1Nombre:'JOSE MARTINEZ ARGUETA',pnd2Nombre:'CARLOS AARON CLORIO HERRERA'},G),'globals');
      for(const k of Object.keys(imgs))s.put(u8(imgs[k]),'img:'+k);
      t.oncomplete=res;t.onerror=()=>rej(t.error);});
    db.close();
    localStorage.setItem('fenixmex-eq',D.equipos[0].id);localStorage.setItem('fenixmex-paso','plano');localStorage.removeItem('fenixmex-vistas');
  },{D,G,imgs});
  await p.reload();await listo(p);
}
// «Plano PDF» del paso Plano para un equipo (el mismo botón que usa Juan hoy)
async function planoPDF(p,eqId){
  await p.evaluate(()=>{location.hash='#plano';});await p.waitForTimeout(300);
  await p.click(`#eqTabs [data-eqt="${eqId}"]`);await p.waitForTimeout(800);
  return C.descargar(p,'#plPdf');
}
// expediente completo («Generar sin descargar»): de ahí sale la hoja de rutas de evacuación, que FenixMex solo imprime dentro del expediente
async function expedientePDF(p){
  await p.evaluate(()=>{location.hash='#generar';});await p.waitForTimeout(800);
  const v=await p.evaluate(()=>document.querySelector('#validacion').textContent);
  if(/Falta/.test(v))throw new Error('El expediente original no se puede generar: '+v);
  await p.click('#btnGenerar');
  await p.waitForFunction(()=>document.querySelector('#archivos a.btn'),null,{timeout:300000});
  const b64=await p.evaluate(async()=>{const a=document.querySelector('#archivos a.btn'),b=new Uint8Array(await (await fetch(a.href)).arrayBuffer());let s='';for(let i=0;i<b.length;i+=0x8000)s+=String.fromCharCode.apply(null,b.subarray(i,i+0x8000));return btoa(s);});
  return Buffer.from(b64,'base64');
}
module.exports={abrirOriginal,inyectar,planoPDF,expedientePDF};
