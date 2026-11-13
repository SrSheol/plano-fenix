# Compara visualmente dos PDF (página 1 de cada uno): los convierte a PNG con PyMuPDF y cuenta los píxeles distintos.
# Uso: python comparar_pdf.py original.pdf nuevo.pdf carpeta_salida nombre [dpi]
# Escribe <nombre>-original.png, <nombre>-nuevo.png, <nombre>-diferencias.png (rojo = distinto) y <nombre>-lado-a-lado.png.
# Imprime en una línea JSON: {"ancho":..,"alto":..,"distintos":..,"pct":..,"tam_a":[w,h],"tam_b":[w,h]}
import sys, json, os
import pymupdf
from PIL import Image, ImageChops

a, b, out, nombre = sys.argv[1:5]
dpi = int(sys.argv[5]) if len(sys.argv) > 5 else 110
os.makedirs(out, exist_ok=True)

def png(pdf, sufijo):
    d = pymupdf.open(pdf)
    p = d[0]
    tam = [round(p.rect.width), round(p.rect.height)]
    ruta = os.path.join(out, f"{nombre}-{sufijo}.png")
    p.get_pixmap(dpi=dpi, alpha=False).save(ruta)
    return Image.open(ruta).convert("RGB"), tam

ia, ta = png(a, "original")
ib, tb = png(b, "nuevo")
if ia.size != ib.size:
    print(json.dumps({"error": "tamaños distintos", "tam_a": ta, "tam_b": tb}))
    sys.exit(0)
dif = ImageChops.difference(ia, ib).convert("L")
mascara = dif.point(lambda v: 255 if v > 40 else 0)
distintos = sum(1 for v in mascara.getdata() if v)
total = ia.size[0] * ia.size[1]
# diferencias: el original en gris claro y lo distinto en rojo
base = ia.convert("L").point(lambda v: 160 + v * 95 // 255).convert("RGB")
rojo = Image.new("RGB", ia.size, (220, 0, 0))
base.paste(rojo, mask=mascara)
base.save(os.path.join(out, f"{nombre}-diferencias.png"))
# lado a lado (reducido)
k = 0.5
w, h = int(ia.size[0] * k), int(ia.size[1] * k)
lado = Image.new("RGB", (w * 2 + 20, h), "white")
lado.paste(ia.resize((w, h)), (0, 0))
lado.paste(ib.resize((w, h)), (w + 20, 0))
lado.save(os.path.join(out, f"{nombre}-lado-a-lado.png"))
print(json.dumps({"ancho": ia.size[0], "alto": ia.size[1], "distintos": distintos, "pct": round(distintos * 100 / total, 5), "tam_a": ta, "tam_b": tb}))
