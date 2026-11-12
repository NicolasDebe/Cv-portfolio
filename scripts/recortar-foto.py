"""Recorta a Nicolas del fondo de madera para poder componerlo como collage."""
import io
import pathlib

from PIL import Image
from rembg import remove

ORIGEN = pathlib.Path(r"C:\Users\nicod\.claude\uploads\99d0f868-535e-4ad2-bb1d-d8873cf5f8d1\d0da4540-image.jpg")
DESTINO = pathlib.Path(r"C:\Users\nicod\proyectos\Cv-portfolio\media")
DESTINO.mkdir(parents=True, exist_ok=True)

origen = Image.open(ORIGEN).convert("RGB")
recorte = remove(origen)  # RGBA

# Recorte al contenido real, con un respiro de 12 px.
caja = recorte.getbbox()
if caja:
    x0, y0, x1, y1 = caja
    m = 12
    caja = (max(0, x0 - m), max(0, y0 - m), min(recorte.width, x1 + m), min(recorte.height, y1 + m))
    recorte = recorte.crop(caja)

ancho = 900
alto = round(recorte.height * ancho / recorte.width)
recorte = recorte.resize((ancho, alto), Image.LANCZOS)
recorte.save(DESTINO / "nicolas-recorte.png", optimize=True)

print("recorte", recorte.size, (DESTINO / "nicolas-recorte.png").stat().st_size // 1024, "KB")
