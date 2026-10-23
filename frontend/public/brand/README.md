# Second Moon brand asset

`second-moon.png` is the generated master. `app-icon.png` is the web/workbench copy; platform sizes are generated in `src-tauri/icons/` with the official Tauri CLI.

The crescent represents the researcher, the smaller moon the personal agent. One orbital path and its nodes suggest connected evidence and iterative research. The palette follows the dark workbench: graphite, ivory and sage.

Generated using the built-in imagegen tool. Prompt: “A minimal geometric app icon for a scientific personal AI research agent: a bold ivory crescent, a smaller sage moon, and one clean tilted elliptical orbit with two or three evidence-graph nodes. Strong small-size silhouette, balanced negative space, deep graphite square background, flat vector-like shapes, no text, no stars, no document/flask/code collage, no 3D or watermark.”

Regenerate platform sizes from the project root:

```bash
npm run tauri -- icon frontend/public/brand/second-moon.png --ios-color '#181b20'
```
