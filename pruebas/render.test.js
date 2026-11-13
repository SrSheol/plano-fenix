// Prueba 1 · el plano se dibuja y se exporta a PDF con datos de muestra, solo con Node (sin navegador ni red).
// Usa los módulos tal como están dentro de index.html: pdf-lib, fontkit, fuentes, FXLev y FXPlano.
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm');
const {modulosNode,infoPDF,DATOS,textoPDF}=require('./lib/comun');

const muestra=JSON.parse(fs.readFileSync(path.join(DATOS,'muestra-completa.json'),'utf8')).plano;
const ejemplo=JSON.parse(fs.readFileSync(path.join(DATOS,'muestra-ejemplo.json'),'utf8')).plano;
const M=modulosNode();
const corre=(codigo,datos)=>{M.__x=JSON.stringify(datos);return vm.runInContext(codigo,M);};
const ctxDe=p=>({razonSocial:p.D.razonSocialPropietario,domicilio:p.D.domicilio,firmante:p.G.firmanteIzquierdoNombre,cedula:p.G.firmanteIzquierdoCedula});

test('los módulos originales cargan dentro de index.html',()=>{
  assert.equal(typeof M.PDFLib.PDFDocument.create,'function');
  assert.equal(typeof M.fontkit.create,'function');
  assert.equal(typeof M.FXPlano.hoja,'function');assert.equal(typeof M.FXLev.croquis,'function');
  assert.ok(M.FX_ASSETS.fonts.R&&M.FX_ASSETS.fonts.B&&M.FX_ASSETS.logoDefault,'fuentes y logo por omisión');
});

test('memoria de cálculo del ejemplo: mismos resultados que FenixMex (Ø 60 cm, L 1500 mm, C.R. 34 mm)',()=>{
  const r=corre(`(()=>{const x=JSON.parse(__x),e=x.e;e.plano=FXPlano.reparar(e.plano);const d=FXPlano.datos(e,x.ctx);return {r:d.r,faltan:d.faltan.length,esp:FXPlano.especificaciones(d)};})()`,{e:ejemplo.D.equipos[0],ctx:ctxDe(ejemplo)});
  assert.equal(r.faltan,0,'el ejemplo no tiene pendientes');
  assert.equal(r.r.Vtot.toFixed(4),'0.4999');     // volumen total (capacidad) como lo imprime FenixMex
  assert.equal(r.r.Pm.toFixed(2),'18.30');        // presión máxima permisible = mín(envolvente, tapas)
  assert.equal(r.r.tEnvReq.toFixed(2),'2.83');
  assert.equal(r.r.A.toFixed(4),'0.0571');        // área de desfogue calculada
  const esp=Object.fromEntries(r.esp.filter(x=>typeof x[1]==='string').map(x=>[x[0],x[1]]));
  assert.equal(esp['CAPACIDAD VOLUMÉTRICA (m³ )'],'0.500');
  assert.equal(esp['PRES. TRAB. MÁX. PERM. (kg/cm²)'],'18.30');
  assert.equal(esp['PRES. PRUEB. HIDROSTÁTICA   (kg/cm²)'],'13.20');
});

for(const [i,o] of [[0,'H'],[1,'V']])test(`hoja del plano (plantilla ${o}) con la muestra completa: SVG con cajetín, especificaciones, memoria y boquillas`,()=>{
  const r=corre(`(()=>{const x=JSON.parse(__x),e=x.e;e.plano=FXPlano.reparar(e.plano);const d=FXPlano.datos(e,x.ctx),M=FXPlano.metricas({R:Uint8Array.from(atob(FX_ASSETS.fonts.R),c=>c.charCodeAt(0)),B:Uint8Array.from(atob(FX_ASSETS.fonts.B),c=>c.charCodeAt(0))});
    const lay=FXPlano.hoja(d,{M,logo:false,firma:false,ubicImg:false,ubicDim:null});return {W:lay.W,H:lay.H,n:lay.items.length,o:d.inp.o,svg:FXPlano.svg(lay,{}),bq:FXPlano.boquillas(d).length};})()`,{e:muestra.D.equipos[i],ctx:ctxDe(muestra)});
  assert.equal(r.W,1224);assert.equal(r.H,792);assert.equal(r.o,o);
  assert.ok(r.n>300,'cientos de primitivas dibujadas ('+r.n+')');
  for(const t of ['ESPECIFICACIONES','MEMORIA DE C','NOMENCLATURA','FOCAS INDUSTRIALES',muestra.D.equipos[i].tag,muestra.D.equipos[i].codigoMemoriaCalculo,'JOSE MARTINEZ ARGUETA'])
    assert.ok(r.svg.includes(t),'el SVG incluye «'+t+'»');
  assert.equal(r.bq,muestra.D.equipos[i].levantamiento.boquillas.length,'una fila por boquilla');
});

test('PDF del plano: 1 hoja tabloide 1224 × 792 pt, fuentes Liberation Sans incrustadas, logo y firma',async()=>{
  const bytes=await corre(`(async()=>{const x=JSON.parse(__x),e=x.e;e.plano=FXPlano.reparar(e.plano);const d=FXPlano.datos(e,x.ctx),u=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
    return await FXPlano.pdf(d,{fonts:{R:u(FX_ASSETS.fonts.R),B:u(FX_ASSETS.fonts.B)},logo:u(FX_ASSETS.logoDefault),firma:u(x.firma),ubic:u(x.ubic)});})()`,
    {e:muestra.D.equipos[0],ctx:ctxDe(muestra),firma:muestra.imgs['g:firmanteIzquierdoFirma'],ubic:muestra.imgs['e:eqh0001:ubicPlano']});
  const b=Buffer.from(bytes);assert.equal(b.subarray(0,5).toString(),'%PDF-');
  const info=await infoPDF(M,b);
  assert.equal(info.paginas,1);assert.deepEqual(info.tam[0],[1224,792]);assert.match(info.titulo,/Plano COM-01/);
  const t=textoPDF(b);if(t!==null){for(const s of ['ESPECIFICACIONES','FOCAS INDUSTRIALES','RSP-020-101-2026','CAMPBELL HAUSFELD'])assert.ok(t.includes(s),'el PDF incluye «'+s+'»');}
});
