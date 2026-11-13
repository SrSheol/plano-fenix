// Prueba 5 · comparación visual contra la app original (referencia/index-exp-fenix.html) con los mismos datos.
// Convierte los PDF a PNG (PyMuPDF) y cuenta píxeles distintos. Deja las imágenes en muestras/. Requiere Python con pymupdf y pillow.
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs');
const C=require('./lib/comun');

test('los PDF de plano-fenix se ven igual que los de la app original',{skip:!C.python()&&'falta Python con pymupdf y pillow (python -m pip install pymupdf pillow)',timeout:900000},async t=>{
  if(!fs.existsSync(C.ORIGINAL)){t.skip('no está referencia/index-exp-fenix.html');return;}
  const res=await require('./comparar').correr(m=>t.diagnostic(m));
  assert.ok(res.length>=5,'se compararon planos (H, V, ejemplo), la hoja de rutas y la hoja 20 del expediente');
  for(const r of res){
    assert.ok(!r.error,r.nombre+': '+r.error);
    assert.deepEqual(r.tam_a,r.tam_b,r.nombre+': mismo tamaño de hoja');
    assert.ok(r.pct<=0.01,`${r.nombre}: ${r.distintos} píxeles distintos (${r.pct} %)`);
  }
});
