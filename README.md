# Generador de discos de tonos ópticos

App web (React + Vite) para diseñar tonewheels de instrumentos DIY tipo Electric Fan Harp
y exportarlos a escala real: SVG para corte láser (MDF, acrílico) y PNG/PDF para imprimir
en papel (sensor reflectivo).

## Contenido de la carpeta

| Archivo | Para qué sirve |
|---|---|
| `CLAUDE.md` | Contexto del proyecto para Claude Code: reglas, comandos y hoja de ruta. Claude Code lo lee automáticamente. |
| `PROMPT.md` | El prompt inicial que debes pegar en Claude Code, más los prompts de cada tarea. |
| `src/App.jsx` | Componente principal: UI, estado y persistencia en `localStorage`. |
| `src/lib/geometry.js` | Funciones puras: utilidades musicales (`noteFreq`, `noteLabel`) y geometría SVG (`sectorPath`, `buildSVG`). |
| `src/lib/presets.js` | Presets de escala (Do mayor justa, pentatónica, cromática 12-TET). |
| `src/main.jsx`, `index.html`, `vite.config.js`, `package.json` | Andamiaje estándar de Vite; no hace falta tocarlos. |

## Cómo usarlo en VS Code con Claude Code

1. Abre esta carpeta en VS Code (`Archivo → Abrir carpeta`).
2. Instala Node.js 18+ si no lo tienes (https://nodejs.org).
3. Abre la terminal integrada y ejecuta:
   ```bash
   npm install
   npm run dev
   ```
   Abre la URL que muestra Vite (normalmente http://localhost:5173) para ver la app.
4. Abre Claude Code en la carpeta (extensión de VS Code o `claude` en la terminal).
   Puedes usar un modelo más económico (por ejemplo Haiku o Sonnet): el trabajo pesado
   ya está hecho y CLAUDE.md le da instrucciones paso a paso.
5. Pega el prompt inicial de `PROMPT.md` y ve aprobando una tarea a la vez.

## Comandos

```bash
npm run dev       # desarrollo con recarga en vivo
npm run build     # genera dist/ listo para publicar
npm run preview   # prueba el build de producción
```

## Publicar la página

`npm run build` genera la carpeta `dist/`: súbela tal cual a Netlify, Vercel, GitHub Pages
o cualquier hosting estático (la config ya usa rutas relativas, `base: "./"`).

## Notas de fabricación

- **Láser (MDF/acrílico):** importa el SVG exportado directo en LightBurn/RDWorks.
  Trazos de 0,1 mm = corte. Corta primero interiores, contorno al final. Si tu máquina
  pide DXF: Inkscape → Guardar como → DXF R14.
- **Papel (reflectivo):** imprime el PNG 300 dpi o el PDF al **100 %** (sin "ajustar a
  página"), pega sobre un disco rígido y usa luz + sensor del mismo lado.
- Fórmula del instrumento: `frecuencia (Hz) = N aberturas × rpm / 60`.
