import cairosvg, io, sys
from PIL import Image, ImageChops
d, size, out = sys.argv[1], int(sys.argv[2]), sys.argv[3]
def a(n): return Image.open(io.BytesIO(cairosvg.svg2png(url=f"{d}/{n}", output_width=size, output_height=size))).convert("RGBA").split()[3]
alpha = ImageChops.difference(a("mono-sun.svg"), a("mono-sprout.svg"))
im = Image.new("RGBA", (size, size), (255,255,255,0)); im.putalpha(alpha); im.save(out)
