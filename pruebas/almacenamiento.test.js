// Prueba 3 · guardar, reabrir, duplicar y eliminar planos en el navegador (IndexedDB), con confirmación y sin borrado automático.
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),path=require('path');
const C=require('./lib/comun');

test('Mis planos: guardar, reabrir, duplicar y eliminar',async t=>{
  const srv=await C.servidor(),b=await C.navegador(),ctx=await C.contexto(b,srv.url);
  t.after(async()=>{await b.close();await srv.cerrar();});
  const p=await C.abrirApp(ctx,srv.url);
  const abrirLista=async()=>{await p.click('#btnPlanos');await p.waitForSelector('#mPlanos:not(.oculto)');await p.waitForTimeout(250);};
  const cerrarLista=async()=>{await p.click('#mPlanos [data-cerrar]');};
  let id1;

  await t.test('al abrir por primera vez hay un plano nuevo, ya guardado',async()=>{
    await C.guardado(p);const r=await C.registros(p);assert.equal(r.length,1);id1=r[0].id;assert.equal(r[0].neq,1);
  });
  await t.test('lo capturado se guarda solo y sigue ahí al recargar la página',async()=>{
    await p.fill('#d_rsp','empresa de prueba, s.a. de c.v.');await p.press('#d_rsp','Tab');   // se pasa a mayúsculas al salir del campo
    await C.guardado(p);await p.waitForTimeout(600);
    let r=await C.registros(p);assert.equal(r[0].rs,'EMPRESA DE PRUEBA, S.A. DE C.V.');
    await p.reload();await p.waitForFunction(()=>document.documentElement.dataset.listo==='1');
    assert.equal(await p.inputValue('#d_rsp'),'EMPRESA DE PRUEBA, S.A. DE C.V.');
    r=await C.registros(p);assert.equal(r.length,1);assert.equal(r[0].id,id1);
  });
  await t.test('las imágenes (firma, plano del lugar) se guardan con el plano',async()=>{
    await C.importar(p,path.join(C.DATOS,'muestra-completa.json'));await C.guardado(p);
    await p.reload();await p.waitForFunction(()=>document.documentElement.dataset.listo==='1');
    assert.equal(await p.textContent('#topRsTxt'),'FOCAS INDUSTRIALES, S.A. DE C.V.','reabre el último plano abierto');
    const r=(await C.registros(p)).find(x=>x.rs==='FOCAS INDUSTRIALES, S.A. DE C.V.');
    assert.deepEqual(r.imgs.sort(),['e:eqh0001:ubicPlano'],'el plano guarda solo sus imágenes');
    const g=await C.globales(p);assert.deepEqual(g.imgs,['g:firmanteIzquierdoFirma'],'la firma va aparte, común a todos');
    assert.equal(g.G.firmanteIzquierdoNombre,'JOSE MARTINEZ ARGUETA');
    assert.ok(await p.$('.img.lleno[data-img="g:firmanteIzquierdoFirma"]'));
  });
  await t.test('plano nuevo: usa el mismo responsable técnico y firma (comunes); la lista muestra todos',async()=>{
    await abrirLista();await p.click('#planosNuevo');await p.waitForTimeout(500);await C.guardado(p);
    assert.equal(await p.inputValue('#d_rsp'),'');assert.equal(await p.inputValue('#g_fin'),'JOSE MARTINEZ ARGUETA');
    assert.ok(await p.$('.img.lleno[data-img="g:firmanteIzquierdoFirma"]'),'la firma es la misma en el plano nuevo');
    assert.equal((await C.registros(p)).length,3);
    await abrirLista();assert.equal(await p.$$eval('#planosLista [data-pid]',l=>l.length),3);
    assert.equal(await p.$$eval('#planosLista .hist-it.abierto',l=>l.length),1);
  });
  await t.test('cambiar el responsable técnico en un plano lo cambia en todos; reabrir un plano desde la lista',async()=>{
    await cerrarLista();
    await p.fill('#g_fin','ING. NUEVO RESPONSABLE');await p.fill('#g_fic','99999999');await C.guardado(p);await p.waitForTimeout(500);
    await abrirLista();await p.click(`#planosLista [data-pid="${id1}"] [data-pa="abrir"]`);await p.waitForTimeout(600);
    assert.equal(await p.inputValue('#d_rsp'),'EMPRESA DE PRUEBA, S.A. DE C.V.');
    assert.equal(await p.inputValue('#g_fin'),'ING. NUEVO RESPONSABLE');assert.equal(await p.inputValue('#g_fic'),'99999999');
    assert.ok(await p.$('.img.lleno[data-img="g:firmanteIzquierdoFirma"]'),'y la misma firma');
    // también sale en el cajetín de la hoja del plano
    await p.click('#pasos li[data-paso="descarga"] button');await p.waitForTimeout(700);
    assert.ok((await p.$$eval('#plHoja svg text',l=>l.map(x=>x.textContent).join('|'))).includes('ING. NUEVO RESPONSABLE'));
    await p.click('#pasos li[data-paso="visita"] button');
  });
  await t.test('duplicar crea una copia independiente',async()=>{
    await abrirLista();await p.click(`#planosLista [data-pid="${id1}"] [data-pa="dup"]`);await p.waitForTimeout(600);
    const r=await C.registros(p);assert.equal(r.length,4);assert.equal(r.filter(x=>x.rs==='EMPRESA DE PRUEBA, S.A. DE C.V.').length,2);
    assert.match(await p.textContent('#planosLista'),/Copia de un plano del/);
  });
  await t.test('eliminar pide confirmación: «Cancelar» no borra nada',async()=>{
    const otro=(await C.registros(p)).find(x=>x.id!==id1&&x.rs==='EMPRESA DE PRUEBA, S.A. DE C.V.');
    p._dialogos=[];p._respuesta=false;await p.click(`#planosLista [data-pid="${otro.id}"] [data-pa="del"]`);await p.waitForTimeout(500);
    assert.equal(p._dialogos.length,1);assert.match(p._dialogos[0],/¿Eliminar el plano/);assert.match(p._dialogos[0],/no se puede deshacer/);
    assert.equal((await C.registros(p)).length,4);
    p._respuesta=true;await p.click(`#planosLista [data-pid="${otro.id}"] [data-pa="del"]`);await p.waitForTimeout(600);
    const r=await C.registros(p);assert.equal(r.length,3);assert.ok(!r.some(x=>x.id===otro.id));
  });
  await t.test('eliminar el plano abierto abre otro (nunca deja la app vacía)',async()=>{
    p._respuesta=true;await p.click(`#planosLista [data-pid="${id1}"] [data-pa="del"]`);await p.waitForTimeout(900);
    const r=await C.registros(p);assert.equal(r.length,2);assert.ok(!r.some(x=>x.id===id1));
    assert.notEqual(await p.inputValue('#d_rsp'),'EMPRESA DE PRUEBA, S.A. DE C.V.');await cerrarLista();
  });
  await t.test('nada se borra solo: tras recargar siguen los mismos planos',async()=>{
    const antes=(await C.registros(p)).map(x=>x.id).sort();
    await p.reload();await p.waitForFunction(()=>document.documentElement.dataset.listo==='1');await p.waitForTimeout(800);
    assert.deepEqual((await C.registros(p)).map(x=>x.id).sort(),antes);
    assert.equal(await p.inputValue('#g_fin'),'ING. NUEVO RESPONSABLE','el responsable común sigue igual');
    assert.deepEqual((await C.globales(p)).imgs,['g:firmanteIzquierdoFirma']);
  });
  await t.test('sin errores de JavaScript',()=>assert.deepEqual(p._errs,[]));
});
