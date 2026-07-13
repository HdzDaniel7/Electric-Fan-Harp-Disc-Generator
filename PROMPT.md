# Prompt para Claude Code

Copia y pega esto como primer mensaje en Claude Code (dentro de esta carpeta):

---

Lee CLAUDE.md completo antes de hacer nada: ahí está la descripción del proyecto, las
reglas que no se pueden romper y la hoja de ruta.

Este proyecto es un generador paramétrico de discos de tonos ópticos (tonewheels) para un
instrumento musical DIY. `src/App.jsx` ya contiene la aplicación completa y funcional;
tu trabajo NO es reescribirla, sino mejorarla siguiendo la hoja de ruta de CLAUDE.md.

Empieza así:

1. Ejecuta `npm install` y luego `npm run build` para confirmar que el proyecto compila
   tal como está. Si no compila, arregla solo lo mínimo necesario y dime qué era.
2. Ejecuta `npm run dev` y confirma que la app carga con el preset "Do mayor justa"
   a 654 rpm, con 8 anillos visibles en la vista previa.
3. Haz la tarea 1 de la hoja de ruta (persistencia en localStorage) y detente.

Reglas de trabajo:
- Una tarea de la hoja de ruta por vez. Al terminar cada una, ejecuta `npm run build`,
  verifica los criterios de "terminado" de CLAUDE.md y espera mi confirmación antes de
  seguir con la siguiente.
- Cambios pequeños e incrementales; nunca reescribas `buildSVG()` ni `sectorPath()` salvo
  que la tarea lo pida.
- Todo texto de interfaz en español.
- Si algo del código actual te parece un error, pregúntame antes de "corregirlo": puede
  ser una decisión de diseño (por ejemplo, el desfase angular de 7° entre anillos es
  intencional, solo visual).

---

## Prompts de seguimiento (uno por tarea, después de aprobar la anterior)

- "Haz la tarea 2 de CLAUDE.md (refactor a src/lib/). Un archivo por vez, build entre cada uno."
- "Haz la tarea 3 (anillo tacómetro)."
- "Haz la tarea 4 (marcas de registro en modo imprimir)."
- "Haz la tarea 5 (PDF real con jspdf + svg2pdf.js). Mantén el método viejo como respaldo."
- "Haz la tarea 6 (disco grande partido en dos hojas A4 con solape y marcas)."
- "Haz la tarea 7 (modo muescas en el borde para optointerruptor de ranura)."

## Si algo sale mal
- "El build falla con este error: [pega el error]. Arréglalo sin tocar la geometría."
- "El SVG exportado no mide el diámetro correcto al abrirlo en Inkscape. Revisa que
  width/height estén en mm y el viewBox sea 1:1 con el diámetro."
