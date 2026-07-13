# CLAUDE.md — Generador paramétrico de discos de tonos ópticos

## Qué es este proyecto
Aplicación web (React + Vite) que genera "tonewheels": discos que giran en un motor con
anillos concéntricos de aberturas que interrumpen luz hacia un sensor óptico. Cada anillo
produce una nota según la fórmula fundamental del proyecto:

    frecuencia (Hz) = N (aberturas del anillo) × rpm / 60

El usuario configura el disco, previsualiza en vivo y exporta archivos a **escala real en mm**
para: corte láser en MDF/acrílico (SVG vectorial), o impresión en papel (PNG 300 dpi / PDF).

## Estado actual
`src/App.jsx` ya contiene la aplicación COMPLETA y FUNCIONAL en un solo componente:
- Parámetros del disco: diámetro exterior libre (40–600 mm), agujero de eje, agujeros de
  montaje (0–6), margen exterior, separación entre anillos, auto-distribución de anillos.
- Anillos: modo "nota" (C2–C7, calcula N = round(f × 60 / rpm) y muestra error en cents)
  o modo "N manual" (muestra la frecuencia resultante). Duty 10–90 %. Forma: ranura de
  arco (duty exacto) o círculos (duty aproximado, con advertencia).
- Global: rpm 200–4000, A4 de referencia, presets (Do mayor justa 24:27:30:32:36:40:45:48,
  pentatónica, cromática 12-TET), ancho mínimo de abertura con advertencias en rojo.
- Materiales: MDF 3 mm, acrílico 3/5 mm, papel (reflectivo), otro. El material fija el modo
  (transmisivo = vectores de corte / reflectivo = relleno negro) y el mínimo de ranura.
- Exportación: SVG (mm reales, trazo 0,1 mm), PNG 300 dpi, PDF (ventana de impresión),
  guardar/cargar configuración JSON. Nombre de archivo autodescriptivo.
- Vista previa SVG con etiquetas y animación de giro opcional (1/20 de la velocidad real).

## Comandos
- `npm install` — instalar dependencias (solo la primera vez)
- `npm run dev` — servidor de desarrollo (Vite)
- `npm run build` — build de producción en `dist/` (SIEMPRE ejecutar antes de dar por
  terminada una tarea; si falla, arreglar antes de continuar)
- `npm run preview` — probar el build

## Reglas que NO se pueden romper
1. **Toda la geometría está en mm reales.** El SVG exportado usa `width/height` en mm y
   `viewBox="0 0 D D"` 1:1. Nunca introducir factores de escala en píxeles en la geometría.
2. **La fórmula f = N × rpm / 60 y el cálculo de cents** (`1200 × log2(f_real / f_objetivo)`)
   no se modifican.
3. Las ranuras de arco son sectores anulares (dos arcos + dos radios) con ángulo abierto
   = duty × (360°/N), N repeticiones equiespaciadas. Ver `sectorPath()` y `buildSVG()`.
   No reescribir estas funciones salvo que la tarea lo pida explícitamente; si se tocan,
   verificar visualmente que un anillo con duty 50 % se ve mitad abierto / mitad cerrado.
4. Los archivos exportados NUNCA incluyen las etiquetas de texto de la vista previa.
5. Modo láser: `fill="none"`, trazo 0,1 mm del color elegido. Modo imprimir: disco negro,
   aberturas blancas, sin trazos de corte.
6. La interfaz es en **español** y debe seguir funcionando en móvil (columna única <860 px).
7. No agregar dependencias pesadas sin necesidad. Para PDF real (tarea opcional) usar
   `jspdf` + `svg2pdf.js`; nada más grande.

## Estilo de trabajo (importante para el agente)
- Hacer cambios PEQUEÑOS e incrementales. Después de cada cambio: `npm run build`.
- No refactorizar todo el archivo de golpe. Si una tarea pide dividir en componentes,
  mover UNA sección por commit y verificar que compila.
- Antes de tocar geometría, leer `buildSVG()` completa.
- Mantener el estado exportable: cualquier parámetro nuevo debe entrar también en el
  JSON de guardar/cargar configuración.

## Hoja de ruta (hacer en orden, una tarea por vez)
1. **Persistencia:** guardar automáticamente `{disc, rings, g}` en `localStorage`
   (clave `tonewheel-config-v1`) y restaurar al cargar. Botón "Restablecer valores de fábrica".
2. **Refactor suave:** extraer a `src/lib/geometry.js` las funciones puras
   (`noteFreq`, `sectorPath`, `buildSVG`, constantes) y a `src/lib/presets.js` los presets.
   `App.jsx` solo UI. El build debe pasar después de cada archivo movido.
3. **Anillo tacómetro:** botón "+ Anillo tacómetro" que agrega un anillo de N=1, duty 50 %,
   marcado como `tach: true` (etiqueta "TACO", sin nota ni cents en la tabla).
4. **Marcas de registro (modo imprimir):** cruces de centrado en el perímetro (0°, 90°,
   180°, 270°) fuera del disco para pegar el papel centrado. Checkbox para activarlas.
5. **PDF real:** reemplazar imprimir-a-PDF por generación con `jspdf` + `svg2pdf.js`,
   página del tamaño del disco + 20 mm de margen. Mantener el botón viejo como respaldo.
6. **Disco grande en dos hojas A4:** exportar el modo imprimir partido en dos mitades
   con solape de 10 mm y marcas de alineación.
7. **Modo muescas en el borde:** opción por anillo "muescas exteriores" que corta dientes
   en el perímetro (para optointerruptor de ranura) en lugar de un anillo interno; solo
   válido para el anillo más externo.

## Criterio de "terminado" para cualquier tarea
- `npm run build` pasa sin errores ni warnings nuevos.
- La vista previa se ve correcta con el preset "Do mayor justa" a 654 rpm.
- Exportar SVG y abrirlo: el disco mide exactamente el diámetro configurado en mm.
- La configuración nueva sobrevive a guardar JSON → recargar → cargar JSON.
