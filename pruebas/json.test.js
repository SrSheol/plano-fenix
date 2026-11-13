// Prueba 4 · exportar e importar un plano como .json (para moverlo entre PCs): ida y vuelta idéntica.
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),path=require('path'),fs=require('fs'),os=require('os');
const C=require('./lib/comun');

const muestra=JSON.parse(fs.readFileSync(path.join(C.DATOS,'muestra-completa.json'),'utf8'));
// lo que debe viajar igual (la fecha de exportación y la de modificación cambian en cada guardado)
const sinFechas=j=>{const x=JSON.parse(JSON.stringify(j));delete x.exportado;delete x.plano.modificado;return x;};
const TMP=[];
const tmp=(nombre,obj)=>{const f=path.join(os.tmpdir(),'pf-'+Date.now()+'-'+nombre);fs.writeFileSync(f,typeof obj==='string'?obj:JSON.stringify(obj));TMP.push(f);return f;};

test('exportar / importar .json',async t=>{
  const srv=await C.servidor(),b=await C.navegador();
  t.after(async()=>{await b.close();await srv.cerrar();for(const f of TMP)try{fs.unlinkSync(f);}catch(_){}});
  const pcA=await C.contexto(b,srv.url),pA=await C.abrirApp(pcA,srv.url);   // «PC 1»
  let A,B;

  await t.test('exportar: el archivo trae el plano completo (datos e imágenes sin cambios)',async()=>{
    await C.importar(pA,path.join(C.DATOS,'muestra-completa.json'));await C.guardado(pA);
    await pA.click('#pasos li[data-paso="descarga"] button');
    const r=await C.descargar(pA,'#btnExportarPlano');assert.match(r.nombre,/^PLANO FOCAS INDUSTRIALES SA DE CV COM-01 COM-02 \d{4}-\d{2}-\d{2}\.json$/);
    A=JSON.parse(r.bytes.toString('utf8'));
    assert.equal(A.schema,'plano-fenix');assert.equal(A.version,1);assert.equal(A.plano.id,muestra.plano.id);
    assert.deepEqual(A.plano.imgs,muestra.plano.imgs,'imágenes byte por byte');
    assert.deepEqual(A.plano.G,muestra.plano.G);
    const D=A.plano.D,M=muestra.plano.D;
    assert.equal(D.razonSocialPropietario,M.razonSocialPropietario);assert.equal(D.domicilio,M.domicilio);
    assert.deepEqual(D.equipos.map(e=>e.id),M.equipos.map(e=>e.id));
    D.equipos.forEach((e,i)=>{const m=M.equipos[i];
      for(const k of ['nombre','tag','numeroSerie','marca','presionDiseno','presionCalibracion','tempDiseno','tipoValvula','diametroValvulaMm','codigoMemoriaCalculo','diametroInteriorCm','longitudMm','profundidadTapaMm','materialCuerpo','materialTapa','espEnv','espSup','espInf'])assert.deepEqual(e[k],m[k],`${m.tag} · ${k}`);
      for(const k of ['orientacion','cejaRectaMm','eficiencia','factorSeguridad','nationalBoard','fecha','ubicModo','ubicX','ubicY','ubicAng','ubicTam'])assert.equal(String(e.plano[k]),String(m.plano[k]??e.plano[k]),`${m.tag} · plano.${k}`);
      assert.deepEqual(e.levantamiento.boquillas.map(q=>[q.id,q.tipo,q.cara,q.pos,q.conexion,q.diametroPulgadas]),m.levantamiento.boquillas.map(q=>[q.id,q.tipo,q.cara,q.pos,q.conexion,q.diametroPulgadas]),`${m.tag} · boquillas`);});
    assert.deepEqual(D.rutasEvac.elementos.map(x=>[x.id,x.t,x.x,x.y,x.pts]),M.rutasEvac.elementos.map(x=>[x.id,x.t,x.x,x.y,x.pts]),'rutas de evacuación');
  });

  await t.test('importar en otra PC (navegador sin datos) y volver a exportar: idéntico',async()=>{
    const pcB=await C.contexto(b,srv.url),pB=await C.abrirApp(pcB,srv.url);
    await C.importar(pB,tmp('A.json',A));await C.guardado(pB);
    assert.equal(await pB.textContent('#topRsTxt'),'FOCAS INDUSTRIALES, S.A. DE C.V.');
    const reg=await C.registros(pB);assert.ok(reg.some(r=>r.id===A.plano.id),'conserva el id del plano');
    await pB.click('#pasos li[data-paso="descarga"] button');
    B=JSON.parse((await C.descargar(pB,'#btnExportarPlano')).bytes.toString('utf8'));
    assert.deepEqual(sinFechas(B),sinFechas(A));
    // y los PDF que salen en la otra PC son los mismos
    const pa=await C.descargar(pA,'#dlPlano'),pb=await C.descargar(pB,'#dlPlano');
    const strip=x=>x.toString('latin1').replace(/\/(CreationDate|ModDate) \(D:[^)]*\)/g,'').replace(/\/ID \[[^\]]*\]/g,'');
    assert.equal(strip(pb.bytes).length,strip(pa.bytes).length,'mismo PDF (salvo fechas)');
    assert.deepEqual(pB._errs,[]);await pcB.close();
  });

  await t.test('importar un plano que ya existe: pregunta; «Cancelar» lo agrega como copia, «Aceptar» lo reemplaza',async()=>{
    const n0=(await C.registros(pA)).length;
    pA._dialogos=[];pA._respuesta=false;await C.importar(pA,tmp('B.json',B));
    assert.match(pA._dialogos.pop(),/Este plano ya está en este navegador/);assert.equal((await C.registros(pA)).length,n0+1);
    pA._respuesta=true;await C.importar(pA,tmp('B2.json',B));assert.equal((await C.registros(pA)).length,n0+1);
  });

  await t.test('responsable técnico común: un archivo con otro responsable pregunta; «Cancelar» conserva el de aquí, «Aceptar» lo cambia en todos',async()=>{
    const otro=JSON.parse(JSON.stringify(B));otro.plano.G={firmanteIzquierdoNombre:'ING. DE OTRA PC',firmanteIzquierdoCedula:'11111111'};
    otro.plano.id='potrapc1';pA._dialogos=[];pA._respuesta=false;await C.importar(pA,tmp('otro1.json',otro));
    assert.match(pA._dialogos.pop()||'',/otro responsable técnico, firma o logo/);
    assert.equal(await pA.inputValue('#g_fin'),'JOSE MARTINEZ ARGUETA','se conserva el de este navegador');
    assert.equal((await C.globales(pA)).G.firmanteIzquierdoNombre,'JOSE MARTINEZ ARGUETA');
    otro.plano.id='potrapc2';pA._respuesta=true;await C.importar(pA,tmp('otro2.json',otro));await C.guardado(pA);
    assert.equal(await pA.inputValue('#g_fin'),'ING. DE OTRA PC');
    assert.equal((await C.globales(pA)).G.firmanteIzquierdoNombre,'ING. DE OTRA PC','queda para todos los planos');
    // vuelve el original para las pruebas siguientes
    otro.plano.id='potrapc3';otro.plano.G=A.plano.G;await C.importar(pA,tmp('otro3.json',otro));await C.guardado(pA);
    assert.equal(await pA.inputValue('#g_fin'),'JOSE MARTINEZ ARGUETA');
  });

  await t.test('un archivo que no es plano no cambia nada',async()=>{
    const n0=(await C.registros(pA)).length;
    await pA.click('#btnPlanos');await pA.setInputFiles('#fImportPlano',tmp('malo.json','{"hola":1}'));await pA.waitForTimeout(500);
    assert.match(await pA.textContent('#toast'),/no es un plano/);assert.equal((await C.registros(pA)).length,n0);
    await pA.click('#mPlanos [data-cerrar]');
  });

  await t.test('también abre un borrador .json exportado por FenixMex',async()=>{
    const bor={version:1,draft:Object.assign({},muestra.plano.D,{rfcEmpresa:'FIN850101AB1',representanteLegalNombre:'X'}),imgs:{'e:eqh0001:ubicPlano':muestra.plano.imgs['e:eqh0001:ubicPlano'],'d:fotoFachada':muestra.plano.imgs['g:firmanteIzquierdoFirma']}};
    const n0=(await C.registros(pA)).length;await C.importar(pA,tmp('borrador.json',bor));await C.guardado(pA);
    const r=await C.registros(pA);assert.equal(r.length,n0+1);const nuevo=r.find(x=>!r.slice(0,0).includes(x)&&x.imgs.includes('e:eqh0001:ubicPlano')&&!x.imgs.includes('d:fotoFachada'));
    assert.ok(nuevo,'solo se toman las imágenes del plano');assert.equal(await pA.$$eval('#eqTabs [data-eqt]',l=>l.length),2);
  });
  await t.test('sin errores de JavaScript',()=>assert.deepEqual(pA._errs,[]));
});
