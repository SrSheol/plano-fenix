# INFORME · plano-fenix

Generador de planos extraído de la app de expedientes FenixMex (`referencia/index-exp-fenix.html`, que **no se modificó**).

---

## 1. Qué se encontró en la app original (análisis previo, antes de cambiar nada)

`referencia/index-exp-fenix.html` pesa 18.6 MB y tiene ~13,900 líneas. Es una sola página con 6 pasos
(Visita → Equipos → Plano → Personas → Revisión → Generar). Todo lo del plano vive en el **paso 3 «Plano y memoria de cálculo»**,
pero se alimenta de datos que se capturan en otros pasos.

### 1.1 Módulos (bloques `<script>`) y su relación con el plano

| Líneas | Módulo | ¿Del plano? |
|---|---|---|
| 1735–1751 | **pdf-lib** (genera los PDF) | Sí, se necesita |
| 1752 | **fontkit** (incrusta fuentes TTF en pdf-lib) | Sí, se necesita |
| 1754–1766 | JSZip (ZIP del expediente) | No |
| 1767–4066 | qrcode-generator | No |
| 4067–4169 | FXQR (QR de verificación) | No |
| 4170–6068 | FXEngine (motor del expediente NOM-020: plantillas, hojas 1–109, Cat II) | No (solo 4 utilidades pequeñas: nombre de archivo, ¿es compresor?) |
| 6069 | `FX_ASSETS` (13 MB): plantillas PDF del expediente, mapa de campos, **fuentes Liberation Sans**, **logo por omisión** | Solo fuentes R/B y `logoDefault` |
| 6071 | Textos del rediseño del expediente | No |
| 6072–6118 | ExcelJS (lista de documentos) | No |
| 6119–7344 | **FXLev**: modelo del levantamiento, croquis del tanque (vista frontal y lateral), boquillas, orificios, espesores | Sí: el croquis del plano y su editor salen de aquí |
| 7345–8312 | **FXPlano**: memoria de cálculo ASME VIII Div. 1, hoja tabloide 17 × 11 in (H/V), cajetín, especificaciones, tabla de boquillas, croquis de ubicación, SVG y PDF | Sí: es el corazón |
| 8313–9657 | **FXRutas**: plano de rutas de evacuación (Anexo No. 1): editor a pantalla completa con muros, puertas, equipos, señales, extintores, ruta, textos, cotas, capas, escala, cuadrícula y simbología | Sí: es la otra mitad del paso Plano |
| 9658–13861 | Interfaz v10 (pasos, formularios, IndexedDB + **Firebase**, imágenes, firmas, editor de imágenes, croquis, plano, rutas, documentos, escáner, QR, **Google Drive**, «Mis expedientes») | Parcial |
| 13863–13876 | Temas de pantalla | Sí (mismo aspecto) |

### 1.2 Lo que el plano usa y de dónde viene

**Pantalla Plano (paso 3)**
- *Geometría, área y capacidad* (§3 y §4): Ø interior, longitud soldadura–soldadura, profundidad de tapa, ceja recta (C.R.); áreas y volúmenes; **C.R. ↔ capacidad de placa** con «Ajustar C.R.» y «Deshacer».
- *Material y esfuerzo permisible*: material del cuerpo y de las tapas (tabla de 17 materiales ASME), factor de seguridad (3 / 3.5 / 4), S escrito a mano (opcional).
- *Espesor requerido y presión máxima permisible* (§1 y §2, UG-27 / UG-32): eficiencia de soldadura E (0.10 a 1.00).
- *Dispositivo de relevo* (§5, Apéndice 11): catálogo de válvulas (7 tipos, medidas, áreas), constantes C, K, M.
- *Especificaciones y cajetín*: fabricante, National Board, código de fabricación, fecha del plano + datos vinculados.
- *Croquis de ubicación*: sin croquis / plano del lugar (imagen + flecha) / esquema (cuarto + puerta + equipo); editor de imagen a pantalla completa (girar, espejo, recortar, zoom, flecha).
- *Rutas de evacuación*: usar plano del lugar / subir imagen / dibujar plano / sin plano, con editor a pantalla completa.
- *Vista previa*: hoja del plano (SVG) y memoria completa. Botones **Plano PDF** y **SVG**.

**Datos de otros pasos que el plano imprime o calcula**
- Visita: razón social, domicilio.
- Equipos › Identificación: tipo, nombre, TAG, número de serie, marca, fecha/año de fabricación, ubicación, fluido, fecha de inspección (da la fecha del plano), capacidad de placa (referencia).
- Equipos › Presiones: presión de diseño (y prueba hidrostática = × 1.1), calibración, operación, temperaturas de diseño y operación.
- Equipos › Válvula: tipo y medida (catálogo → área instalada).
- Equipos › **Croquis y boquillas**: orientación H/V, dimensiones, C.R., boquillas (tipo, Ø, cara, posición, orificio, conexión), vista frontal y lateral/superior editables con dedo/mouse.
- Equipos › Espesores (16 puntos por columna): el mínimo es el espesor empleado del plano.
- Equipos › Documentos: código de memoria de cálculo (plano No. `RSP-020-XXX-2026`).
- Personas: responsable técnico (nombre, cédula, **firma** → cajetín «Revisó»), «Dibujó» por equipo (por omisión ING. PABLO MOTA), **logo**.

**Recursos**: fuentes Liberation Sans regular y negrita (en `FX_ASSETS.fonts.R/B`), logo por omisión (`FX_ASSETS.logoDefault`, que la app corrige al vuelo para poner acentos). El dibujo es 100 % vectorial (no hay imágenes de símbolos: todo se dibuja con primitivas).

**Exportación**: `FXPlano.pdf()` crea una hoja tabloide 1224 × 792 pt con pdf-lib, fuentes incrustadas (subconjunto), logo, firma recortada y la imagen del plano del lugar. La hoja de rutas la dibuja `FXRutas.pdfHoja()` en una hoja carta (horizontal o vertical) con encabezado (logo + «UBICACIÓN DE RECIPIENTES Y RUTAS DE EVACUACIÓN» + razón social); en la app original solo sale dentro del expediente (hoja tras la portada del Anexo No. 1).

### 1.3 Lo que no es del plano (se quita)
Hojas del expediente (FXEngine y plantillas de 12 MB), DC-3, categoría II (previo y dictamen), hoja 66, hoja 23, QR y registro de verificación, **Firebase** (claves y sincronización), **Google Drive**, «Mis expedientes» en la nube, documentos de la visita y escáner, Excel de documentos, directorio de emergencias, tríptico, fotos de placa y muestras PND, testigos y representante legal, técnicos PND, importación de la hoja de campo en PDF y de visitas, buscador de campos.

---

## 2. Qué se extrajo (y cómo)

**Un solo archivo `index.html` (2 MB)**, página estática compatible con GitHub Pages: sin compilación, sin servidor y sin red (ni siquiera fuentes web: la pantalla usa las fuentes del sistema).

Se copiaron **sin ningún cambio** del original:
- **FXPlano** (memoria de cálculo, tabla de materiales, catálogo de válvulas, hoja H/V, cajetín, especificaciones, tabla de boquillas, croquis de ubicación, SVG y PDF).
- **FXLev** (croquis del tanque, vista frontal y lateral/superior, boquillas, orificios, espesores).
- **FXRutas** (rutas de evacuación con su editor a pantalla completa: muros, puertas, equipos, señales, extintores, ruta, textos, cotas, capas, escala, cuadrícula, simbología).
- **pdf-lib** y **fontkit**; de `FX_ASSETS` solo las fuentes Liberation Sans regular/negrita y el logo por omisión (de 13 MB a 79 KB).
- Todo el **CSS** (mismos temas y estilo vino/oro: Brasa, Pizarra, Musgo, Índigo, Claro, Mono, Mono noche).

De la interfaz original se conservó el código de todo lo que toca el plano (mismo comportamiento): formulario del equipo, catálogo de válvulas, espesores con «Rellenar», editor del croquis con dedo/mouse (zoom, lupa, deshacer, flechas), boquillas con conexión y orificios, tarjetas de cálculo del paso Plano, «Ajustar C.R.» con «Deshacer», S escrito a mano, «= cuerpo», croquis de ubicación con editor de imagen (girar, espejo, recortar, flecha), rutas de evacuación (usar plano del lugar / subir imagen / dibujar / sin plano), firmas (cargar, dibujar, «Limpiar firma»), «Dibujó» por equipo, logo, barra de equipos (agregar, duplicar, mover, eliminar), numeración automática de nombre y TAG, avisos de pendientes con «ir al campo».

**Flujo en 4 pasos** (captura → dibujo → vista previa → descarga):
1. **Empresa y firmas**: razón social, domicilio, responsable técnico (nombre, cédula, firma), «Dibujó», logo.
2. **Equipo**: identificación y placa, presiones y temperaturas, válvula, **croquis y boquillas**, espesores, plano No. Un plano por equipo (pestañas arriba).
3. **Plano**: geometría y capacidad, material y S, espesor requerido y Pm, relevo, especificaciones y cajetín, croquis de ubicación, rutas de evacuación (las mismas tarjetas de FenixMex).
4. **Vista previa y descarga**: hoja del plano, memoria completa y hoja de rutas tal como salen; botones **Plano PDF**, **Rutas de evacuación PDF**, **Plano SVG** y **Exportar plano (.json)**; lista «Antes de descargar» con pendientes y avisos.

**Nuevo (pedido)**:
- **Mis planos** (botón arriba): lista de planos guardados en el navegador (IndexedDB, base `plano-fenix`), con búsqueda, **Abrir**, **Duplicar**, **Exportar (.json)** y **Eliminar** (con confirmación; nada se borra solo). **Plano nuevo** y **Cargar ejemplo**.
- **Responsable técnico, firma y logo comunes** (decisión de Juan): se guardan una sola vez en el navegador (almacén `ajustes`, aparte de los planos) y valen para todos los planos, nuevos y guardados, como los «globales» de FenixMex. Si se cambian en un plano, cambian en todos. «Dibujó» sigue siendo por equipo y la empresa, por plano.
- **Guardado automático** de cada cambio (0.4 s después de escribir).
- **Exportar / importar .json**: el plano completo (datos e imágenes en base64). Al importar uno que ya existe pregunta si reemplazarlo o agregarlo como copia. También abre un **borrador .json exportado por FenixMex** (toma empresa, equipos, planos y rutas).
- **Rutas de evacuación PDF** suelto: en FenixMex esa hoja solo salía dentro del expediente; aquí se descarga sola y es la misma hoja (verificado píxel a píxel).

## 3. Qué se quitó
Pasos Visita (salvo empresa), Personas (salvo responsable técnico, Dibujó y logo), Revisión (queda el panel «Antes de descargar») y Generar. Motor del expediente y sus plantillas, DC-3, Cat II, hojas 9/10/23/66/71–75/94, QR y registro, **Firebase** (incluidas sus claves), **Google Drive**, «Mis expedientes» en la nube, documentos y escáner, Excel, cámara/fotos de placa y muestras, testigos y representante legal, técnicos PND, menú «Levantamiento» (hoja de campo PDF, JSON, visita, formatos en blanco), importación de levantamientos/visitas/hoja de campo PDF, buscador Ctrl+K y el medidor de categoría.
Del formulario del equipo se ocultaron los campos que el plano no usa (modelo, presión de arranque, tipo y número de dispositivos de relevo, programa de calibración, categoría, folio, PND, tipo de tapas, fotos). Si un archivo los trae se conservan en los datos; solo no se muestran.

## 4. Cómo se usa
1. Abrir `index.html` (publicado en GitHub Pages, o con doble clic en la PC; se probó en Chrome).
2. **Empresa y firmas** → **Equipo** (capturar datos, dibujar boquillas en el croquis) → **Plano** (material, E, ubicación, rutas) → **Vista previa y descarga**.
3. Descargar **Plano PDF** (uno por equipo: cambiar con las pestañas) y, si se dibujó, **Rutas de evacuación PDF**.
4. Para llevar un plano a otra PC: **Exportar plano (.json)** y en la otra PC **Mis planos → Importar (.json)**.
Nota: los planos viven en el navegador de cada PC; borrar los datos del navegador los borra. Conviene exportar el .json de los importantes.

## 5. Pruebas (`pruebas\`)
Requisitos: Node 20+ (se usó 26.13), Chrome instalado, `playwright-core` (se usa el que ya trae `@playwright/cli` global; si no, `npm i -g playwright-core`) y, para la comparación, Python con `pymupdf` y `pillow` (si falta, esa prueba se salta). Sin servicios externos: servidor HTTP local en 127.0.0.1 y Chrome con toda la red bloqueada.

```
npm test            (= node --test --test-concurrency=1 pruebas/)
npm run comparar    (solo la comparación; rehace muestras\)
```

| Archivo | Qué comprueba | Resultado |
|---|---|---|
| `render.test.js` | Solo Node: los módulos dentro de index.html cargan; la memoria del ejemplo da los mismos números de FenixMex (V 0.4999 m³, Pm 18.30, t 2.83 mm, A 0.0571 cm²); hoja H y V con cajetín, especificaciones, memoria y boquillas; PDF 1224 × 792 pt con fuentes, logo y firma | 5/5 ✔ |
| `app.test.js` | En Chrome: arranca sin errores ni Firebase/Drive; importa la muestra; croquis con 6 boquillas, agregar/quitar boquilla; memoria completa; editor de imagen y editor de rutas abren y cierran; vista previa (hoja, memoria, rutas); descarga Plano PDF de los 2 equipos, SVG y Rutas PDF; abierto como archivo local, index.html no pide **nada** más (ni internet, ni fuentes web, ni `referencia\`) | 10/10 ✔ |
| `almacenamiento.test.js` | Guardado automático, reapertura tras recargar, imágenes del plano guardadas con el plano y la firma aparte (común), plano nuevo con el mismo responsable, cambiar el responsable en un plano lo cambia en todos (y en el cajetín), abrir desde la lista, duplicar, eliminar con confirmación («Cancelar» no borra), eliminar el abierto, nada se borra solo | 11/11 ✔ |
| `json.test.js` | Exportar trae datos, responsable común e imágenes byte por byte; importar en otra «PC» (navegador limpio) y volver a exportar da **el mismo JSON**; reemplazar/copia al reimportar; un archivo con otro responsable técnico pregunta («Cancelar» conserva el de aquí, «Aceptar» lo cambia en todos); archivo inválido no cambia nada; abre borradores de FenixMex | 8/8 ✔ |
| `comparar.test.js` | PDF de plano-fenix vs la app original con los mismos datos | 1/1 ✔ |

**Total: 35 pruebas, 35 correctas, 0 fallas (≈ 64 s; última corrida 2026-11-13, con la fuente del sistema y el `.gitignore` ya puestos).**

Nota: en esta PC el antivirus Kaspersky inyecta su propio script en las páginas servidas por `http://127.0.0.1`. No viene de index.html; por eso la prueba de «nada externo» abre la app como archivo local (`file://`), donde no hay inyección.

**Comparación visual** (`muestras\`, 110 dpi; un píxel cuenta como distinto si algún canal difiere > 40/255). La app original se abrió en Chrome sin red, con los datos puestos en su propio IndexedDB, y se usó su botón **Plano PDF**; la hoja de rutas se sacó de su **expediente generado** («Generar sin descargar»), porque solo ahí existe:

| Comparación | Hoja | Píxeles distintos |
|---|---|---|
| Ejemplo FenixMex · COM-01 (plantilla H) | 1224 × 792 | **0** |
| Muestra completa · COM-01 (H, 6 boquillas, firma, plano del lugar + flecha) | 1224 × 792 | **0** |
| Muestra completa · COM-02 (V, esquema de ubicación, material de tapas propio) | 1224 × 792 | **0** |
| Rutas de evacuación vs hoja 118 del expediente original | 792 × 612 | **0** |
| Plano COM-01 vs hoja 31 (hoja 20) del expediente original | 1224 × 792 | **0** |

Por cada una hay `-original.png`, `-nuevo.png`, `-diferencias.png` (rojo = distinto) y `-lado-a-lado.png`; los números están en `muestras\comparacion.json`. Al repositorio solo van `comparacion.json` y los `-lado-a-lado.png` (ver §8); los demás se quedan en esta PC.
Datos de muestra: `pruebas\datos\muestra-ejemplo.json` y `muestra-completa.json` (se regeneran con `npm run muestras`; las imágenes con `crear-imagenes.py`).

## 6. Lo que no se replicó igual, y por qué
- **Responsable técnico, firma y logo**: en FenixMex eran «globales en la nube». Aquí también son comunes a todos los planos, pero guardados en el navegador de cada PC. Para que un plano llevado a otra PC salga igual, el .json exportado los incluye; al importarlo, si la otra PC ya tiene otro responsable, firma o logo, pregunta cuál usar (si todavía no tiene ninguno capturado, toma los del archivo sin preguntar).
- **Pestañas de equipos**: en lugar del sello «CAT I/II/III» (categoría del expediente) muestran «PLANO» o «PEND.» (si falta geometría para dibujar).
- **Pendientes**: FenixMex validaba todo el expediente; aquí solo lo que usa el plano, y nada impide descargar (el PDF deja «—» en lo que falte, como el botón Plano PDF original).
- **Fuente de la pantalla**: decisión de Juan: sin fuente web. La pantalla usa las fuentes del sistema (`system-ui`, Segoe UI en Windows, Roboto, Helvetica, Arial); antes cargaba «Archivo» de Google Fonts. **Los PDF no cambian**: siguen llevando Liberation Sans incrustada (comparación en 0 píxeles distintos después del cambio).
- **Hoja de campo del levantamiento (PDF/JSON) y formatos en blanco**: decisión de Juan: no van; esta app es solo el plano.

## 7. Preguntas de Juan (todas resueltas)
1. **Responsable técnico, firma y logo**: comunes a todos los planos (ver §2 y §6). ✔
2. **`referencia\`**: no se publica. El `.gitignore` la excluye y `index.html` no depende de nada de ella al ejecutarse (verificado: abierta como archivo local, la app solo carga `index.html`; prueba en `app.test.js`). Sin `referencia\`, `comparar.test.js` se salta sola y las demás pruebas corren igual. ✔
3. **Fuente de la pantalla**: no se incrusta; se usan las fuentes del sistema. Los PDF quedan igual. ✔
4. **Hoja de campo**: no; solo el plano. ✔

## 8. Archivos del repositorio `plano-fenix`
Son exactamente los archivos que no excluye el `.gitignore` (25 archivos, 3,332,320 B, 3.2 MB). Para publicar en GitHub Pages basta con `index.html`; lo demás es documentación y pruebas.

| Archivo | Tamaño | Qué es |
|---|---:|---|
| `index.html` | 2,065,524 B (2.0 MB) | La app completa (una sola página) |
| `INFORME-PLANO.md` | 19,328 B | Este informe |
| `.gitignore` | 640 B | Lo que no va al repositorio |
| `package.json` | 388 B | Atajos de pruebas (`npm test`), sin dependencias |
| `pruebas/render.test.js` | 4,487 B | Pruebas solo con Node |
| `pruebas/app.test.js` | 7,301 B | Pruebas de la app en Chrome |
| `pruebas/almacenamiento.test.js` | 6,356 B | Guardar, reabrir, duplicar, eliminar |
| `pruebas/json.test.js` | 7,082 B | Exportar / importar .json |
| `pruebas/comparar.test.js` | 1,092 B | Comparación contra la original (se salta sin `referencia\`) |
| `pruebas/comparar.js` | 5,786 B | Genera la comparación y `muestras\` |
| `pruebas/lib/comun.js` | 8,557 B | Servidor local, Chrome sin red, lectura de PDF |
| `pruebas/lib/original.js` | 3,321 B | Maneja la app original para comparar |
| `pruebas/lib/comparar_pdf.py` | 1,943 B | PDF → PNG y conteo de píxeles (PyMuPDF) |
| `pruebas/datos/muestra-completa.json` | 41,538 B | Plano de muestra (2 equipos, imágenes, rutas) |
| `pruebas/datos/muestra-ejemplo.json` | 3,083 B | Ejemplo de FenixMex |
| `pruebas/datos/plano-del-lugar.png` | 21,243 B | Imagen de muestra |
| `pruebas/datos/firma.png` | 1,341 B | Firma de muestra |
| `pruebas/datos/crear-muestras.js` | 8,354 B | Rehace las muestras .json |
| `pruebas/datos/crear-imagenes.py` | 2,160 B | Rehace las imágenes de muestra |
| `muestras/comparacion.json` | 1,828 B | Resultado numérico de la comparación |
| `muestras/plano-ejemplo-COM-01-lado-a-lado.png` | 254,011 B | Original y nuevo, lado a lado |
| `muestras/plano-completa-COM-01-lado-a-lado.png` | 274,827 B | 〃 |
| `muestras/plano-completa-COM-02-lado-a-lado.png` | 260,617 B | 〃 |
| `muestras/plano-completa-COM-01-hoja-expediente-lado-a-lado.png` | 274,827 B | 〃 (contra la hoja 20 del expediente) |
| `muestras/rutas-completa-lado-a-lado.png` | 56,686 B | 〃 (rutas de evacuación) |

**No van** (excluidos por `.gitignore`, se quedan en esta PC): `referencia\index-exp-fenix.html` (17.8 MB, sin cambios) y las 15 imágenes intermedias de `muestras\` (`-original`, `-nuevo`, `-diferencias`; ≈ 4.5 MB).
No se creó repositorio ni se hizo commit ni push.
