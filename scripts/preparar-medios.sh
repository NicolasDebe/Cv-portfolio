#!/usr/bin/env bash
# Genera los medios livianos de la landing a partir de los renders de reels/.
# Previews: 6 s mudos, 432x768, para que la grilla se mueva sin costar megas.
set -euo pipefail

FF="/c/Users/nicod/proyectos/reels/.venv/Lib/site-packages/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe"
P="/c/Users/nicod/proyectos/reels/piezas"
OUT="/c/Users/nicod/proyectos/Cv-portfolio/media"

mkdir -p "$OUT/previews" "$OUT/posters"

# slug|mp4|portada
PIEZAS=(
  "voluntario-papa|$P/2026-11-04-voluntario-papa/out/2026-11-04-voluntario-papa.mp4|$P/2026-11-04-voluntario-papa/out/portada.png"
  "papa-dia-1-2|$P/2026-11-08-voluntario-dia-1-2/out/2026-11-08-voluntario-dia-1-2.mp4|$P/2026-11-08-voluntario-dia-1-2/out/portada.png"
  "papa-dia-3|$P/2026-11-09-voluntario-dia-3/out/2026-11-09-voluntario-dia-3.mp4|$P/2026-11-09-voluntario-dia-3/out/portada.png"
  "papa-testimonios|$P/2026-11-10-voluntario-dia-4-testimonios/out/2026-11-10-voluntario-dia-4-testimonios.mp4|$P/2026-11-10-voluntario-dia-4-testimonios/out/portada.png"
  "todos-todos-todos|$P/2026-11-11-todos-todos-todos/out/2026-11-11-todos-todos-todos.mp4|$P/2026-11-11-todos-todos-todos/out/portada-leon.png"
  "consecuencias|$P/2026-11-02-consecuencias/out/2026-11-02-consecuencias.mp4|$P/2026-11-02-consecuencias/out/portada.png"
  "disfraz-confiesa|$P/2026-10-30-disfraz-confiesa/out/2026-10-30-disfraz-confiesa-max.mp4|$P/2026-10-30-disfraz-confiesa/out/portada.png"
  "teologia-kayak|$P/2026-10-28-teologia-del-cuerpo-kayak/out/teologia-del-cuerpo-v8-final.mp4|$P/2026-10-28-teologia-del-cuerpo-kayak/out/portada-v8.png"
  "eco-periodismo|$P/2026-10-18-eco-periodismo/out/2026-10-18-eco-periodismo.mp4|$P/2026-10-18-eco-periodismo/out/portada.png"
  "concilio|$P/2026-10-09-concilio/out/reel-concilio-v4.mp4|$P/2026-10-09-concilio/out/portada.png"
)

for fila in "${PIEZAS[@]}"; do
  IFS='|' read -r slug mp4 portada <<< "$fila"

  if [ ! -f "$mp4" ]; then echo "FALTA mp4: $slug"; continue; fi

  "$FF" -y -loglevel error -ss 1.5 -t 6 -i "$mp4" \
    -an -vf "scale=432:768:flags=lanczos,fps=24" \
    -c:v libx264 -preset slow -crf 30 -pix_fmt yuv420p -movflags +faststart \
    "$OUT/previews/$slug.mp4"

  if [ -f "$portada" ]; then
    "$FF" -y -loglevel error -i "$portada" \
      -vf "scale=432:768:flags=lanczos" -q:v 6 "$OUT/posters/$slug.jpg"
  else
    "$FF" -y -loglevel error -ss 2 -i "$mp4" -frames:v 1 \
      -vf "scale=432:768:flags=lanczos" -q:v 6 "$OUT/posters/$slug.jpg"
  fi

  echo "ok $slug"
done

# Servicios: fragmento del horno (44-56 s) con todos los cuadros clave,
# para que el editor de la página lo recorra con el scroll sin saltos.
TODOS="$P/2026-11-11-todos-todos-todos/out/2026-11-11-todos-todos-todos.mp4"
if [ -f "$TODOS" ]; then
  "$FF" -y -loglevel error -ss 44 -t 12 -i "$TODOS" \
    -an -vf "scale=360:640:flags=lanczos,fps=20" \
    -c:v libx264 -preset slow -crf 33 -g 1 -pix_fmt yuv420p -movflags +faststart \
    "$OUT/previews/scrub-todos.mp4"
  echo "ok scrub-todos"
fi

# Foto del hero: dos tama~nos, sin recortar.
FOTO="/c/Users/nicod/.claude/uploads/99d0f868-535e-4ad2-bb1d-d8873cf5f8d1/d0da4540-image.jpg"
if [ -f "$FOTO" ]; then
  "$FF" -y -loglevel error -i "$FOTO" -vf "scale=1100:-1:flags=lanczos" -q:v 4 "$OUT/nicolas-hero.jpg"
  "$FF" -y -loglevel error -i "$FOTO" -vf "scale=360:-1:flags=lanczos" -q:v 5 "$OUT/nicolas-avatar.jpg"
  echo "ok foto"
fi

echo "--- pesos ---"
du -sh "$OUT/previews" "$OUT/posters"
ls -lh "$OUT"/previews/*.mp4 | awk '{print $5, $9}'
