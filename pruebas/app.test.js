// Prueba 2 · la app en Chrome (sin red): con la muestra completa el plano se dibuja en pantalla, los editores abren y los PDF se descargan.
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),path=require('path');
const C=require('./lib/comun');

test('plano-fenix en el navegador: dibujar, editar y descargar',async t=>{
  const srv=await C.servidor(),b=await C.navegador(),ctx=await C.contexto(b,srv.url);
  t.after(async()=>{await b.close();await srv.cerrar();});

  const p=await C.abrirApp(ctx,srv.url);

  await t.test('arranca sin errores, sin conexión y sin Firebase ni Google Drive',async()=>{
    assert.deepEqual(p._errs,[]);
    const g=await p.evaluate(()=>({fb:typeof window.firebase,drive:typeof window.gapi,html:document.documentElement.outerHTML}));
    assert.equal(g.fb,'undefined');assert.equal(g.drive,'undefined');
    assert.ok(!/firebase|googleapis\.com\/drive|firestore/i.test(g.html.replace(/Sin Firebase|sin Firebase|Firebase, sin|ni Firebase/g,'')),'ninguna conexión a Firebase o Drive');
    const pasos=await p.$$eval('#pasos li',l=>l.map(x=>x.dataset.paso));assert.deepEqual(pasos,['visita','equipos','plano','descarga']);
  });

  await t.test('importar la muestra completa: 2 equipos, empresa, firma y plano del lugar',async()=>{
    await C.importar(p,path.join(C.DATOS,'muestra-completa.json'));
    assert.equal(await p.textContent('#topRsTxt'),'FOCAS INDUSTRIALES, S.A. DE C.V.');
    assert.equal(await p.$$eval('#eqTabs [data-eqt]',l=>l.length),2);
    assert.ok(await p.$('.img.lleno[data-img="g:firmanteIzquierdoFirma"]'),'firma cargada');
  });

  await t.test('paso Equipo: el croquis dibuja las 6 boquillas y la vista lateral',async()=>{
    await p.click('#pasos li[data-paso="equipos"] button');await p.waitForTimeout(500);
    assert.equal(await p.$$eval('#levBqLista .lev-bq-fila',l=>l.length),6);
    assert.ok((await p.$$eval('#levCroquis *',l=>l.length))>25,'croquis frontal dibujado');
    const letras=await p.$eval('#levCroquis',s=>s.textContent);for(const L of 'ABCDEF')assert.ok(letras.includes(L),'letra '+L+' en el croquis');
    assert.ok((await p.$$eval('#levLatSvg *',l=>l.length))>20,'vista lateral dibujada');
    // agregar y quitar una boquilla (con confirmación)
    await p.click('#levBqAdd');await p.waitForTimeout(300);
    assert.equal(await p.$$eval('#levBqLista .lev-bq-fila',l=>l.length),7);
    p._respuesta=true;await p.click('#levBqLista .lev-bq-fila:last-child [data-ba="del"]');await p.waitForTimeout(300);
    assert.equal(await p.$$eval('#levBqLista .lev-bq-fila',l=>l.length),6);
  });

  await t.test('paso Plano: memoria calculada, croquis de ubicación con flecha y rutas',async()=>{
    await p.click('#pasos li[data-paso="plano"] button');await p.waitForTimeout(800);
    assert.match(await p.textContent('#plEstado'),/Memoria completa/);
    const pm=await p.textContent('#p-plano [data-tr="pm"] [data-fk="Pm"] .rv');assert.match(pm,/16\.67/);
    assert.ok(await p.$('#plUbic image'),'imagen del plano del lugar en el croquis de ubicación');
    assert.match(await p.textContent('#rtRes'),/11 elementos.*salida de emergencia.*punto de reunión/);
    // editor de imagen (pantalla completa) y editor de rutas: abren y cierran
    await p.click('#plUbicFull');await p.waitForSelector('#mImg:not(.oculto)');await p.click('[data-ed="cancelar"]');await p.waitForSelector('#mImg.oculto',{state:'attached'});
    await p.click('#rtFull');await p.waitForFunction(()=>window.FXRutas.abierto());
    await p.click('[data-re="listo"]');await p.waitForFunction(()=>!window.FXRutas.abierto());
  });

  await t.test('Vista previa: hoja del plano (SVG tabloide), memoria y hoja de rutas',async()=>{
    await p.click('#pasos li[data-paso="descarga"] button');await p.waitForTimeout(800);
    const vb=await p.$eval('#plHoja svg',s=>s.getAttribute('viewBox'));assert.equal(vb,'0 0 1224 792');
    const txt=await p.$$eval('#plHoja svg text',l=>l.map(x=>x.textContent).join('\n'));
    for(const x of ['ESPECIFICACIONES','MEMORIA DE CÁLCULO','NOMENCLATURA','FOCAS INDUSTRIALES, S.A. DE C.V.','RSP-020-101-2026','COM-01'])assert.ok(txt.includes(x),'la hoja muestra «'+x+'»');
    assert.ok(await p.$('#plHoja svg image'),'logo, firma o plano del lugar en la hoja');
    await p.click('[data-prev="mem"]');assert.match(await p.textContent('#plMem'),/1\. Cálculo de espesores/);
    await p.click('[data-prev="rutas"]');assert.equal(await p.$eval('#rtHojaPrev > svg',s=>s.getAttribute('viewBox')),'0 0 792 612');
    assert.match(await p.textContent('#descPend'),/Sin pendientes/);
  });

  const M=C.modulosNode();
  await t.test('descargar Plano PDF de cada equipo: 1 hoja tabloide 1224 × 792 pt',async()=>{
    for(const [id,tag] of [['eqh0001','COM-01'],['eqv0002','COM-02']]){
      await p.click(`#eqTabs [data-eqt="${id}"]`);await p.waitForTimeout(500);
      const r=await C.descargar(p,'#dlPlano');assert.equal(r.nombre,`PLANO ${tag} FOCAS INDUSTRIALES SA DE CV.pdf`);
      const i=await C.infoPDF(M,r.bytes);assert.equal(i.paginas,1);assert.deepEqual(i.tam[0],[1224,792]);assert.match(i.titulo,new RegExp('Plano '+tag));
      const tx=C.textoPDF(r.bytes);if(tx!==null){assert.ok(tx.includes(tag));assert.ok(tx.includes('ESPECIFICACIONES'));}
    }
  });
  await t.test('descargar SVG y PDF de rutas de evacuación (carta horizontal)',async()=>{
    const s=await C.descargar(p,'#dlSvg');assert.match(s.bytes.toString('utf8',0,200),/^<svg/);
    const r=await C.descargar(p,'#rtPdf');assert.equal(r.nombre,'RUTAS DE EVACUACION FOCAS INDUSTRIALES SA DE CV.pdf');
    const i=await C.infoPDF(M,r.bytes);assert.equal(i.paginas,1);assert.deepEqual(i.tam[0],[792,612]);
    const tx=C.textoPDF(r.bytes);if(tx!==null){assert.ok(tx.includes('UBICACIÓN DE RECIPIENTES Y RUTAS DE EVACUACIÓN'));assert.ok(tx.includes('SIMBOLOGÍA'));}
  });
  await t.test('sin errores de JavaScript en todo el recorrido',()=>assert.deepEqual(p._errs,[]));
  // Se abre como archivo local (file://): así ningún antivirus inyecta scripts (Kaspersky lo hace en páginas http://127.0.0.1)
  await t.test('index.html se basta solo: nada de referencia/ ni de internet (tampoco fuentes web)',async()=>{
    const cf=await b.newContext({acceptDownloads:true}),pf=await cf.newPage(),errs=C.vigilar(pf),ped=[];
    cf.on('request',q=>ped.push(q.url()));pf.on('dialog',d=>d.accept().catch(()=>{}));
    await pf.goto(require('url').pathToFileURL(C.APP).href);
    await pf.waitForFunction(()=>document.documentElement.dataset.listo==='1',null,{timeout:30000});
    await pf.click('#btnPlanos');await pf.setInputFiles('#fImportPlano',path.join(C.DATOS,'muestra-completa.json'));await pf.waitForTimeout(800);
    for(const paso of ['visita','equipos','plano','descarga']){await pf.click(`#pasos li[data-paso="${paso}"] button`);await pf.waitForTimeout(400);}
    await pf.click('[data-prev="rutas"]');await C.descargar(pf,'#dlPlano');await C.descargar(pf,'#rtPdf');
    const fuera=ped.filter(u=>!/^(data:|blob:)/.test(u)&&u!==require('url').pathToFileURL(C.APP).href);
    assert.deepEqual(fuera,[],'solo se carga index.html (ni internet, ni fuentes web, ni otros archivos)');
    assert.ok(!ped.some(u=>u.includes('referencia')),'nada de referencia/');
    assert.deepEqual(errs,[]);await cf.close();
  });
});
