// Comparación visual: el PDF de la app original (FenixMex) contra el de plano-fenix, con los mismos datos de muestra.
// Guarda en muestras/ las imágenes (original, nuevo, diferencias en rojo y lado a lado) y muestras/comparacion.json con los números.
// Uso:  node pruebas/comparar.js        (lo usa también comparar.test.js)
'use strict';
const fs=require('fs'),path=require('path'),os=require('os'),{spawnSync}=require('child_process');
const C=require('./lib/comun'),O=require('./lib/original');
const MUESTRAS=path.join(C.RAIZ,'muestras');
// campos que FenixMex pide para generar el expediente (no salen en el plano; solo para poder sacar la hoja de rutas del original)
const EXTRA_EXP={rfcEmpresa:'FIN850101AB1',representanteLegalNombre:'MARIA LOPEZ PEREZ',testigo1Nombre:'JUAN PEREZ GOMEZ',testigo2Nombre:'LUIS RAMIREZ SOTO',testigo2Curp:'RASL800101HDFMTS09',
  tel94ProteccionCivil:'55 5683 2222',tel94Policia:'55 5242 5100',tel94Bomberos:'55 5768 2532',tel94CruzRoja:'55 5395 1111',tel94Emergencias:'911'};

function comparar(py,a,b,nombre){
  const ta=path.join(os.tmpdir(),'pf-a-'+nombre+'.pdf'),tb=path.join(os.tmpdir(),'pf-b-'+nombre+'.pdf');fs.writeFileSync(ta,a);fs.writeFileSync(tb,b);
  const r=spawnSync(py,[path.join(__dirname,'lib','comparar_pdf.py'),ta,tb,MUESTRAS,nombre],{encoding:'utf8'});
  fs.unlinkSync(ta);fs.unlinkSync(tb);
  if(r.status!==0)throw new Error('comparar_pdf.py: '+r.stderr);
  return JSON.parse(r.stdout.trim().split('\n').pop());
}
// la hoja del expediente original que tiene TODOS los textos dados (separados por |) → PDF de una sola hoja
function extraerHoja(py,pdf,texto){
  const f=path.join(os.tmpdir(),'pf-exp.pdf'),o=path.join(os.tmpdir(),'pf-hoja.pdf');fs.writeFileSync(f,pdf);
  const r=spawnSync(py,['-c',`import sys,pymupdf
d=pymupdf.open(sys.argv[1]);t=sys.argv[2].split('|')
i=[k for k,p in enumerate(d) if all(x in p.get_text() for x in t)]
if not i: print('-1'); sys.exit(0)
n=pymupdf.open();n.insert_pdf(d,from_page=i[0],to_page=i[0]);n.save(sys.argv[3]);print(i[0]+1)`,f,texto,o],{encoding:'utf8'});
  if(r.status!==0)throw new Error(r.stderr);const hoja=+r.stdout.trim();
  const out=hoja>0?fs.readFileSync(o):null;try{fs.unlinkSync(f);fs.unlinkSync(o);}catch(_){}return {hoja,pdf:out};
}

async function correr(log){
  log=log||console.log;const py=C.python();if(!py)throw new Error('Falta Python con PyMuPDF y Pillow (python -m pip install pymupdf pillow)');
  fs.mkdirSync(MUESTRAS,{recursive:true});
  const srv=await C.servidor(),b=await C.navegador(),res=[];
  try{
    for(const [arch,eqs,conRutas] of [['muestra-ejemplo.json',null,false],['muestra-completa.json',null,true]]){
      const j=JSON.parse(fs.readFileSync(path.join(C.DATOS,arch),'utf8')).plano,ids=j.D.equipos.map(e=>e.id),base=arch.replace('.json','').replace('muestra-','');
      // nuevo (plano-fenix): importar el .json y descargar desde «Vista previa y descarga»
      const cn=await C.contexto(b,srv.url),pn=await C.abrirApp(cn,srv.url);await C.importar(pn,path.join(C.DATOS,arch));
      await pn.click('#pasos li[data-paso="descarga"] button');await pn.waitForTimeout(600);
      // original (FenixMex): mismos datos en su navegador
      const co=await C.contexto(b,srv.url),po=await O.abrirOriginal(co,srv.url);await O.inyectar(po,j,conRutas?EXTRA_EXP:null);
      for(const id of ids){const e=j.D.equipos.find(x=>x.id===id),nombre=`plano-${base}-${e.tag}`;
        await pn.click(`#eqTabs [data-eqt="${id}"]`);await pn.waitForTimeout(700);
        const nuevo=await C.descargar(pn,'#dlPlano'),orig=await O.planoPDF(po,id);
        const r=comparar(py,orig.bytes,nuevo.bytes,nombre);r.nombre=nombre;r.archivos={original:orig.nombre,nuevo:nuevo.nombre};res.push(r);log(`${nombre}: ${r.distintos} píxeles distintos de ${r.ancho*r.alto} (${r.pct} %)`);}
      if(conRutas){
        const nuevo=await C.descargar(pn,'#rtPdf'),exp=await O.expedientePDF(po),h=extraerHoja(py,exp,'UBICACIÓN DE RECIPIENTES Y RUTAS DE EVACUACIÓN|SIMBOLOGÍA');
        if(!h.pdf)throw new Error('El expediente original no trae la hoja de rutas');
        const r=comparar(py,h.pdf,nuevo.bytes,`rutas-${base}`);r.nombre=`rutas-${base}`;r.archivos={original:`expediente original, hoja ${h.hoja}`,nuevo:nuevo.nombre};res.push(r);
        log(`rutas-${base} (hoja ${h.hoja} del expediente original): ${r.distintos} píxeles distintos (${r.pct} %)`);
        // la hoja 20 del expediente (plano dentro del expediente) también debe ser igual al plano suelto
        const h20=extraerHoja(py,exp,'PLANO Y MEMORIA DE C|NOMENCLATURA');if(h20.pdf){const e=j.D.equipos[0],nuevoPl=await (async()=>{await pn.click(`#eqTabs [data-eqt="${e.id}"]`);await pn.waitForTimeout(700);return C.descargar(pn,'#dlPlano');})();
          const r2=comparar(py,h20.pdf,nuevoPl.bytes,`plano-${base}-${e.tag}-hoja-expediente`);r2.nombre=`plano-${base}-${e.tag}-hoja-expediente`;r2.archivos={original:`expediente original, hoja ${h20.hoja}`,nuevo:nuevoPl.nombre};res.push(r2);
          log(`${r2.nombre} (hoja ${h20.hoja} del expediente original): ${r2.distintos} píxeles distintos (${r2.pct} %)`);}
      }
      const errs=[...pn._errs,...po._errs.filter(x=>!/firebase|nube|Drive|gstatic|googleapis/i.test(x))];if(errs.length)log('Avisos de consola: '+errs.join(' | '));
      await cn.close();await co.close();
    }
  }finally{await b.close();await srv.cerrar();}
  fs.writeFileSync(path.join(MUESTRAS,'comparacion.json'),JSON.stringify({fecha:new Date().toISOString(),dpi:110,umbral:'un píxel cuenta como distinto si algún canal difiere más de 40/255',resultados:res},null,1));
  return res;
}
module.exports={correr};
if(require.main===module)correr().then(r=>{console.log('Listo: muestras/ ('+r.length+' comparaciones)');}).catch(e=>{console.error(e);process.exit(1);});
