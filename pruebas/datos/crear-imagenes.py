# Genera las imágenes de muestra de las pruebas (plano del lugar y firma). Solo hace falta correrlo si se quieren rehacer.
# Requiere Pillow:  python -m pip install pillow
import os, math
from PIL import Image, ImageDraw, ImageFont

AQUI = os.path.dirname(os.path.abspath(__file__))

def fuente(t):
    for f in ("arial.ttf", "DejaVuSans.ttf", "LiberationSans-Regular.ttf"):
        try:
            return ImageFont.truetype(f, t)
        except OSError:
            pass
    return ImageFont.load_default()

# Plano del lugar: una nave con oficinas, almacén y cuarto de máquinas (1200 × 800 px, fondo blanco)
im = Image.new("RGB", (1200, 800), "white")
d = ImageDraw.Draw(im)
gris, negro = (90, 90, 90), (20, 20, 20)
d.rectangle([60, 60, 1140, 740], outline=negro, width=8)
d.line([520, 60, 520, 460], fill=negro, width=6)
d.line([60, 460, 1140, 460], fill=negro, width=6)
d.line([860, 460, 860, 740], fill=negro, width=6)
for x0, x1 in ((250, 330), (650, 730), (960, 1040)):          # puertas
    d.line([x0, 460, x1, 460], fill="white", width=8)
d.line([560, 740, 680, 740], fill="white", width=10)           # acceso principal
f = fuente(34)
d.text((180, 240), "OFICINAS", fill=gris, font=f)
d.text((720, 240), "ALMACÉN", fill=gris, font=f)
d.text((330, 590), "PRODUCCIÓN", fill=gris, font=f)
d.text((880, 590), "CUARTO DE MÁQUINAS", fill=gris, font=fuente(26))
d.text((520, 760), "ACCESO PRINCIPAL", fill=gris, font=fuente(22))
for i in range(6):                                             # columnas
    d.rectangle([150 + i * 170, 450, 166 + i * 170, 466], fill=gris)
im.save(os.path.join(AQUI, "plano-del-lugar.png"), optimize=True)

# Firma: trazo azul oscuro sobre fondo transparente (600 × 220 px)
fi = Image.new("RGBA", (600, 220), (0, 0, 0, 0))
g = ImageDraw.Draw(fi)
pts = []
for k in range(0, 520):
    t = k / 520
    x = 40 + 520 * t
    y = 120 + 45 * math.sin(t * 9.5) * (1 - t * 0.6) - 30 * math.sin(t * 3.1)
    pts.append((x, y))
g.line(pts, fill=(20, 34, 79, 255), width=6, joint="curve")
g.line([(120, 175), (470, 160)], fill=(20, 34, 79, 255), width=4)
fi.save(os.path.join(AQUI, "firma.png"), optimize=True)
print("listo")
