// Utilidades compartidas de las pruebas de plano-fenix. Sin servicios externos: servidor HTTP local (127.0.0.1) y Chrome sin red.
'use strict';
const fs=require('fs'),path=require('path'),http=require('http'),vm=require('vm'),os=require('os');
const RAIZ=path.resolve(__dirname,'..','..');
const APP=path.join(RAIZ,'index.html');
const ORIGINAL=path.join(RAIZ,'referencia','index-exp-fenix.html');
const DATOS=path.join(RAIZ,'pruebas','datos');

// ---------- Playwright (playwright-core) y Chrome ----------
// Se busca playwright-core instalado en el proyecto, globalmente o dentro de @playwright/cli (lo que hay en la PC de Juan).
function playwright(){
  const npmG=process.env.APPDATA?path.join(process.env.APPDATA,'npm','node_modules'):path.join(os.homedir(),'.npm-global','lib','node_modules');
  const cand=['playwright-core','playwright',path.join(npmG,'playwright-core'),path.join(npmG,'playwright'),path.join(npmG,'@playwright','cli','node_modules','playwright-core'),path.join(npmG,'@playwright','test','node_modules','playwright-core')];
  for(const c of cand){try{return require(c);}catch(_){}}
  throw new Error('No se encontró playwright-core. Instálalo con:  npm i -g playwright-core   (o define NODE_PATH)');
}
function chrome(){
  const c=[process.env.CHROME_PATH,'C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    process.env.LOCALAPPDATA&&path.join(process.env.LOCALAPPDATA,'Google/Chrome/Application/chrome.exe'),'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    '/usr/bin/google-chrome','/usr/bin/chromium','/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].filter(Boolean);
  return c.find(p=>{try{return fs.statSync(p).isFile();}catch(_){return false;}})||null;
}
async function navegador(){
  const pw=playwright(),exe=chrome();
  return pw.chromium.launch(exe?{executablePath:exe,headless:true}:{headless:true});
}

// ---------- servidor estático local (como GitHub Pages, pero en 127.0.0.1) ----------
const TIPOS={'.html':'text/html; charset=utf-8','.js':'text/javascript','.json':'application/json','.png':'image/png','.css':'text/css','.svg':'image/svg+xml'};
function servidor(){
  return new Promise(res=>{
    const s=http.createServer((q,r)=>{let f=decodeURIComponent(new URL(q.url,'http://x').pathname);if(f.endsWith('/'))f+='index.html';
      const p=path.join(RAIZ,path.normalize(f).replace(/^([\\/])+/,''));
      if(!p.startsWith(RAIZ)){r.writeHead(403);return r.end();}
      fs.readFile(p,(e,b)=>{if(e){r.writeHead(404);return r.end('no');}r.writeHead(200,{'Content-Type':TIPOS[path.extname(p)]||'application/octet-stream','Cache-Control':'no-store'});r.end(b);});});
    s.listen(0,'127.0.0.1',()=>res({url:`http://127.0.0.1:${s.address().port}`,cerrar:()=>new Promise(r=>s.close(r))}));
  });
}
// contexto del navegador SIN red: solo el servidor local (las fuentes web, Firebase y Drive quedan bloqueados)
async function contexto(b,base){
  const ctx=await b.newContext({viewport:{width:1400,height:1000},acceptDownloads:true,locale:'es-MX'});
  await ctx.route('**/*',r=>r.request().url().startsWith(base)||r.request().url().startsWith('data:')||r.request().url().startsWith('blob:')?r.continue():r.abort());
  return ctx;
}
function vigilar(p){const errs=[];
  p.on('pageerror',e=>errs.push('Error de página: '+e.message));
  p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource|ERR_FAILED|net::/.test(m.text()))errs.push('Consola: '+m.text());});
  return errs;}
async function abrirApp(ctx,base){
  const p=await ctx.newPage();const errs=vigilar(p);p._errs=errs;
  p.on('dialog',d=>{const r=p._respuesta;(r===false?d.dismiss():d.accept()).catch(()=>{});(p._dialogos=p._dialogos||[]).push(d.message());});
  await p.goto(base+'/index.html');
  await p.waitForFunction(()=>document.documentElement.dataset.listo==='1',null,{timeout:30000});
  return p;
}
async function importar(p,archivo){
  await p.click('#btnPlanos');
  await p.setInputFiles('#fImportPlano',archivo);
  await p.waitForFunction(()=>document.querySelector('#mPlanos').classList.contains('oculto'),null,{timeout:20000});
  await p.waitForTimeout(400);
}
async function descargar(p,sel){
  const [dl]=await Promise.all([p.waitForEvent('download',{timeout:60000}),p.click(sel)]);
  const f=path.join(os.tmpdir(),'plano-fenix-'+Date.now()+'-'+Math.random().toString(36).slice(2)+'-'+dl.suggestedFilename().replace(/[^\w.-]+/g,'_'));
  await dl.saveAs(f);const b=fs.readFileSync(f);fs.unlinkSync(f);return {nombre:dl.suggestedFilename(),bytes:b};
}
// espera a que el guardado (debounce de 400 ms) termine
async function guardado(p){await p.waitForFunction(()=>/Guardado en este navegador/.test(document.querySelector('#estadoGuardado').textContent),null,{timeout:15000});}
// registros del almacén 'planos' (IndexedDB) tal como están en el navegador
async function registros(p){
  return p.evaluate(()=>new Promise((res,rej)=>{const q=indexedDB.open('plano-fenix');q.onsuccess=()=>{const t=q.result.transaction('planos').objectStore('planos').getAll();
    t.onsuccess=()=>res(t.result.map(r=>({id:r.id,nombre:r.nombre,modificado:r.modificado,rs:r.D&&r.D.razonSocialPropietario,neq:r.D&&r.D.equipos.length,imgs:Object.keys(r.imgs||{})})));t.onerror=()=>rej(t.error);};q.onerror=()=>rej(q.error);}));
}

// ---------- módulos de index.html en Node (sin navegador): pdf-lib, fontkit, FX_ASSETS, FXLev y FXPlano ----------
function scripts(html){return [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);}
function modulosNode(archivo){
  const html=fs.readFileSync(archivo||APP,'utf8'),sc=scripts(html);
  const busca=(t,n)=>{const s=sc.find(x=>x.includes(t));if(!s)throw new Error('no se encontró '+n+' en index.html');return s;};
  const caja={console,atob,btoa,crypto:globalThis.crypto,TextEncoder,TextDecoder,setTimeout,clearTimeout,Promise};caja.self=caja;caja.window=caja;caja.globalThis=caja;
  vm.createContext(caja);
  for(const [t,n] of [['PDFLib={}','pdf-lib'],['fontkit','fontkit'],['window.FX_ASSETS=','recursos'],['FenixMex — LEVANTAMIENTO','FXLev'],['FenixMex — PLANO v2','FXPlano']]){
    let s=busca(t,n);if(n==='fontkit')s=sc.find(x=>/^!function\(e,t\)\{"object"==typeof exports/.test(x)&&x.includes('fontkit'))||s;
    vm.runInContext(s,caja,{filename:n+'.js'});}
  return caja;
}
// lee un PDF con la pdf-lib del propio index.html: {paginas, tam:[[w,h],…], titulo, productor}
async function infoPDF(caja,bytes){
  caja.__b=vm.runInContext('Uint8Array',caja).from(bytes);   // la Uint8Array del contexto de pdf-lib
  return JSON.parse(await vm.runInContext(`(async()=>{const d=await PDFLib.PDFDocument.load(__b);return JSON.stringify({paginas:d.getPageCount(),tam:d.getPages().map(p=>[Math.round(p.getWidth()),Math.round(p.getHeight())]),titulo:d.getTitle()||'',productor:d.getProducer()||''});})()`,caja));
}
// texto de un PDF con PyMuPDF (si hay Python): para revisar que el contenido salga
function textoPDF(bytes){
  const {spawnSync}=require('child_process'),f=path.join(os.tmpdir(),'pf-txt-'+Date.now()+'.pdf');fs.writeFileSync(f,bytes);
  try{for(const py of ['python','py','python3']){const r=spawnSync(py,['-c','import sys,pymupdf;d=pymupdf.open(sys.argv[1]);print("\\n".join(p.get_text() for p in d))',f],{encoding:'utf8',env:Object.assign({},process.env,{PYTHONIOENCODING:'utf-8'})});if(r.status===0)return r.stdout;}return null;}
  finally{try{fs.unlinkSync(f);}catch(_){}}
}
function python(){const {spawnSync}=require('child_process');for(const py of ['python','py','python3']){const r=spawnSync(py,['-c','import pymupdf,PIL;print("ok")'],{encoding:'utf8',env:Object.assign({},process.env,{PYTHONIOENCODING:'utf-8'})});if(r.status===0&&/ok/.test(r.stdout))return py;}return null;}

// responsable técnico, firma y logo comunes (almacén 'ajustes', clave 'globales')
async function globales(p){
  return p.evaluate(()=>new Promise((res,rej)=>{const q=indexedDB.open('plano-fenix');q.onsuccess=()=>{const db=q.result;if(!db.objectStoreNames.contains('ajustes'))return res(null);
    const t=db.transaction('ajustes').objectStore('ajustes').get('globales');t.onsuccess=()=>res(t.result?{G:t.result.G,imgs:Object.keys(t.result.imgs||{}).sort()}:null);t.onerror=()=>rej(t.error);};q.onerror=()=>rej(q.error);}));
}
module.exports={globales,RAIZ,APP,ORIGINAL,DATOS,playwright,chrome,navegador,servidor,contexto,vigilar,abrirApp,importar,descargar,guardado,registros,modulosNode,infoPDF,textoPDF,python,scripts};
