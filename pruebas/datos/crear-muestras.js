// Genera los planos de muestra de las pruebas (formato .json de plano-fenix):
//  · muestra-ejemplo.json  → el ejemplo de FenixMex (SERVICIO LOMAS ESTRELLA), sin imágenes
//  · muestra-completa.json → 2 equipos (H y V), boquillas, firma, croquis de ubicación (plano del lugar + flecha y esquema),
//                            rutas de evacuación dibujadas sobre el plano del lugar
// Uso: node pruebas/datos/crear-muestras.js
const fs=require('fs'),path=require('path');
const AQUI=__dirname,b64=f=>fs.readFileSync(path.join(AQUI,f)).toString('base64');
const DEF_EQ={nombre:'COMPRESOR DE AIRE NO. 1',numeroSerie:'',tag:'COM-01',clasificacion:'',fluido:'AIRE',capacidadVolumetrica:'',presionOperacion:'',presionCalibracion:'',presionDiseno:'',presionArranque:'',presionTrabajoMaxPermitida:'',presionPruebaHidrostatica:'',capacidadPlacaAnterior:'',tempDiseno:'55',tempOperacion:'28',tipoDispositivoRelevo:'VALVULA DE SEGURIDAD',tipoValvula:'SILBATO',diametroValvulaMm:'',valvulaModelo:'',valvulaPulg:'',valvulaAreaCm2:'',valvulaOrificioPulg:'',valvulaRevisar:'',dimensionesRelevo:'',numDispositivosRelevo:'1',ubicacion:'CUARTO DE MÁQUINAS',marca:'',modelo:'S/D',anioFabricacion:'',materialCuerpo:'SA-414-G',materialTapa:'SA-414-G',materialTapaPropio:'',tipoTapas:'SEMIELIPSOIDAL',pndSuperficial:'PARTICULAS MAGNETICAS (MT)',pndVolumetrica:'ULTRASONIDO INDUSTRIAL (UT)',fechaPnd:'',fechaProgramaCalibracion:'',codigoMemoriaCalculo:'',folio:'',fechaFabricacion:'',capacidadPlaca:''};
const eq=(id,o)=>Object.assign({id},JSON.parse(JSON.stringify(DEF_EQ)),{tipoEquipo:'COMPRESOR',espEnv:Array(16).fill(''),espSup:Array(16).fill(''),espInf:Array(16).fill('')},o);
const G={firmanteIzquierdoNombre:'JOSE MARTINEZ ARGUETA',firmanteIzquierdoCedula:'14204870'};
const plano=(id,nombre,D,imgs)=>({schema:'plano-fenix',version:1,exportado:'2026-11-12T12:00:00-06:00',plano:{id,nombre,creado:'2026-11-12T18:00:00.000Z',modificado:'2026-11-12T18:00:00.000Z',nota:'Muestra de pruebas',D,G,imgs}});

// 1 · ejemplo de FenixMex (mismos datos que «Cargar ejemplo»)
const ej=eq('ejcom01',{nombre:'COMPRESOR DE AIRE NO. 1',numeroSerie:'1628',tag:'COM-01',fluido:'AIRE',capacidadVolumetrica:'0.500',presionDiseno:'12.00',presionCalibracion:'10.50',presionArranque:'7.00',presionOperacion:'9.00',presionTrabajoMaxPermitida:'18.65',presionPruebaHidrostatica:'13.20',tempDiseno:'55',tempOperacion:'28',tipoValvula:'ARGOLLA',diametroValvulaMm:'6',ubicacion:'CUARTO ELECTRICO',marca:'ALANSA',anioFabricacion:'2002',fechaPnd:'2026-07-17',codigoMemoriaCalculo:'RSP-020-034-2026',espEnv:Array(16).fill('4.40'),espSup:Array(16).fill('4.30'),espInf:Array(16).fill('4.30'),
  diametroInteriorCm:'60',longitudMm:'1500',profundidadTapaMm:'150',plano:{orientacion:'H',cejaRectaMm:'34'}});
const Dej={modelo:10,razonSocialPropietario:'SERVICIO LOMAS ESTRELLA, S.A. DE C.V',razonSocialUsuario:'SERVICIO LOMAS ESTRELLA, S.A. DE C.V',domicilio:'AV. TLAHUAC NO. 4344, LOMAS ESTRELLA, Iztapalapa, 09890, Ciudad de México',conflictos:[],rutasEvac:null,equipos:[ej]};
fs.writeFileSync(path.join(AQUI,'muestra-ejemplo.json'),JSON.stringify(plano('pmuestraejemplo','SERVICIO LOMAS ESTRELLA, S.A. DE C.V · COM-01',Dej,{}),null,1));

// 2 · muestra completa
const esp=(base,var_)=>Array.from({length:16},(_,i)=>(base+((i*7)%4)*var_).toFixed(2));
const e1=eq('eqh0001',{nombre:'COMPRESOR DE AIRE NO. 1',numeroSerie:'A-2231',tag:'COM-01',fluido:'AIRE',presionDiseno:'12.30',presionCalibracion:'11.00',presionArranque:'7.50',presionOperacion:'9.50',tempDiseno:'60',tempOperacion:'32',
  tipoValvula:'PALANCA EMPACADA 632',diametroValvulaMm:'13 X 19',ubicacion:'CUARTO DE MÁQUINAS',marca:'CAMPBELL HAUSFELD',fechaFabricacion:'15/03/2011',anioFabricacion:'2011',fechaPnd:'2026-10-08',capacidadPlaca:'300 L',codigoMemoriaCalculo:'RSP-020-101-2026',
  materialCuerpo:'SA-285C',materialTapa:'SA-285C',espEnv:esp(4.6,0.01),espSup:esp(4.5,0.01),espInf:esp(4.52,0.01),diametroInteriorCm:'50.8',longitudMm:'1240',profundidadTapaMm:'135',
  plano:{orientacion:'H',cejaRectaMm:'38',eficiencia:'0.85',factorSeguridad:'3.5',nationalBoard:'NB-55821',fabricante:'',fecha:'',ubicModo:'img',ubicX:'0.83',ubicY:'0.78',ubicAng:'135',ubicTam:'1.2',ubicRotulo:''},
  levantamiento:{schema:'fenix-levantamiento',version:2,origen:'campo',orientacion:'H',boquillas:[
    {id:'bqa',letra:'A',tipo:'VALVULA DE SEGURIDAD',diametroPulgadas:0.5,cara:'arriba',pos:{u:0.32,v:1},conexion:'COPLE'},
    {id:'bqb',letra:'B',tipo:'MANOMETRO',diametroPulgadas:0.25,cara:'arriba',pos:{u:0.58,v:1},conexion:'COPLE'},
    {id:'bqc',letra:'C',tipo:'ENTRADA DE AIRE',diametroPulgadas:0.75,cara:'frente',pos:{u:0.74,v:0.62},conexion:'NIPLE'},
    {id:'bqd',letra:'D',tipo:'SALIDA DE AIRE',diametroPulgadas:0.75,cara:'atras',pos:{u:0.28,v:0.48},conexion:'COPLE'},
    {id:'bqe',letra:'E',tipo:'PURGA',diametroPulgadas:0.25,cara:'abajo',pos:{u:0.5,v:0},conexion:'COPLE'},
    {id:'bqf',letra:'F',tipo:'TAPÓN',diametroPulgadas:0.5,cara:'lado',pos:{u:1,v:0.62},conexion:'COPLE'}]}});
const e2=eq('eqv0002',{nombre:'COMPRESOR DE AIRE NO. 2',numeroSerie:'V-90412',tag:'COM-02',fluido:'AIRE',presionDiseno:'10.00',presionCalibracion:'8.80',presionArranque:'6.00',presionOperacion:'7.50',tempDiseno:'55',tempOperacion:'30',
  tipoValvula:'ARGOLLA',diametroValvulaMm:'9',ubicacion:'PATIO DE MANIOBRAS',marca:'INGERSOLL RAND',fechaFabricacion:'2018',anioFabricacion:'2018',fechaPnd:'2026-10-08',capacidadPlaca:'0.120 m³',codigoMemoriaCalculo:'RSP-020-102-2026',
  materialCuerpo:'SA-516-70',materialTapa:'SA-414-G',materialTapaPropio:'1',espEnv:Array(16).fill('3.80'),espSup:Array(16).fill('3.70'),espInf:Array(16).fill('3.72'),diametroInteriorCm:'40',longitudMm:'850',profundidadTapaMm:'110',
  plano:{orientacion:'V',cejaRectaMm:'30',eficiencia:'0.70',factorSeguridad:'4',fabricante:'IR DE MÉXICO',fecha:'OCTUBRE-2026',ubicModo:'esq',ubicPuerta:'derecha',ubicPuertaPos:'0.35',ubicEqX:'0.4',ubicEqY:'0.5',ubicAng:'225',ubicRotulo:'PATIO DE MANIOBRAS NORTE'},
  levantamiento:{schema:'fenix-levantamiento',version:2,origen:'campo',orientacion:'V',boquillas:[
    {id:'bv1',letra:'A',tipo:'VALVULA DE SEGURIDAD',diametroPulgadas:0.375,cara:'arriba',pos:{u:0.5,v:1},conexion:'COPLE'},
    {id:'bv2',letra:'B',tipo:'ENTRADA DE AIRE',diametroPulgadas:0.5,cara:'frente',pos:{u:0.6,v:0.7},conexion:'COPLE'},
    {id:'bv3',letra:'C',tipo:'PURGA',diametroPulgadas:0.25,cara:'abajo',pos:{u:0.5,v:0},conexion:'COPLE'}]}});
// rutas de evacuación: sobre el plano del lugar del equipo 1 (hoja carta horizontal, mm del área de dibujo 257 × 160)
const rutas={v:1,modo:'img',equipoPlanoId:'eqh0001',datosDe:'img',porModo:{},orientacion:'H',escala:200,grid:{ver:true,ajuste:true,cuadro:1,guias:true,ajusteElegido:false},tamSimbolos:1,reglas:false,
  fondoTransform:{rot:0,fh:false,fv:false,crop:null,op:1},leyenda:{on:true},
  capas:{fondo:{v:true,l:true},arq:{v:true,l:false},eq:{v:true,l:false},seg:{v:true,l:false},rutas:{v:true,l:false},txt:{v:true,l:false}},
  elementos:[
    {id:'r1',t:'tanqueH',capa:'eq',x:200,y:120,w:16,h:8,rot:0,eqId:'eqh0001'},
    {id:'r2',t:'tanqueV',capa:'eq',x:238,y:106,w:9,h:9,rot:0,eqId:'eqv0002'},
    {id:'r3',t:'salida',capa:'seg',x:128,y:143,w:16,h:8,rot:0},
    {id:'r4',t:'extintor',capa:'seg',x:180,y:104,w:7,h:7,rot:0},
    {id:'r5',t:'extintor',capa:'seg',x:60,y:104,w:7,h:7,rot:0},
    {id:'r6',t:'botiquin',capa:'seg',x:40,y:40,w:7,h:7,rot:0},
    {id:'r7',t:'reunion',capa:'seg',x:100,y:150,w:10,h:10,rot:0},
    {id:'r8',t:'ruta',capa:'rutas',pts:[[214,112],[214,100],[128,100],[128,140]]},
    {id:'r9',t:'rutasen',capa:'seg',x:170,y:94,w:13,h:8,rot:180},
    {id:'r10',t:'norte',capa:'txt',x:240,y:18,w:10,h:10,rot:0},
    {id:'r11',t:'rotulo',capa:'txt',x:214,y:140,w:30,h:6,rot:0,txt:'CUARTO DE MÁQUINAS'}]};
const Dc={modelo:10,razonSocialPropietario:'FOCAS INDUSTRIALES, S.A. DE C.V.',razonSocialUsuario:'FOCAS INDUSTRIALES, S.A. DE C.V.',domicilio:'CALLE NORTE 45 NO. 821, INDUSTRIAL VALLEJO, AZCAPOTZALCO, 02300, CIUDAD DE MÉXICO',conflictos:[],rutasEvac:rutas,equipos:[e1,e2]};
const imgs={'e:eqh0001:ubicPlano':b64('plano-del-lugar.png'),'g:firmanteIzquierdoFirma':b64('firma.png')};
fs.writeFileSync(path.join(AQUI,'muestra-completa.json'),JSON.stringify(plano('pmuestracompleta','FOCAS INDUSTRIALES, S.A. DE C.V. · COM-01, COM-02',Dc,imgs),null,1));
console.log('muestras listas');
