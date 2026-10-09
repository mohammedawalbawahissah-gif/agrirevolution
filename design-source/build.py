import cairosvg, io, json, sys, shutil, subprocess
from PIL import Image
D = "out"; R = "/home/claude/agri/agrirevolution"
FE, MO = f"{R}/frontend", f"{R}/mobile"
def png(name, size, path=None, rgb=False):
    im = Image.open(io.BytesIO(cairosvg.svg2png(url=f"{D}/{name}", output_width=size, output_height=size))).convert("RGBA")
    if rgb: im = im.convert("RGB")
    if path: im.save(path, optimize=True)
    return im
# ---- web
shutil.copy(f"{D}/logo.svg", f"{FE}/src/assets/logo.svg")
shutil.copy(f"{D}/favicon.svg", f"{FE}/public/favicon.svg")
shutil.copy(f"{D}/icon-full.svg", f"{FE}/src/assets/logo-square.svg")
shutil.copy(f"{D}/android-background.svg", f"{FE}/src/assets/logo-background.svg")
shutil.copy(f"{D}/android-foreground.svg", f"{FE}/src/assets/logo-foreground.svg")
png("icon-full.svg", 180, f"{FE}/public/apple-touch-icon.png", rgb=True)
png("logo.svg", 192, f"{FE}/public/icon-192.png")
png("logo.svg", 512, f"{FE}/public/icon-512.png")
# maskable: full-bleed with the adaptive (safe-zone) geometry
bg = png("android-background.svg", 512); bg.alpha_composite(png("android-foreground.svg", 512)); bg.convert("RGB").save(f"{FE}/public/icon-maskable-512.png", optimize=True)
fav = [png("favicon.svg", s) for s in (16, 32, 48)]
fav[2].save(f"{FE}/public/favicon.ico", sizes=[(16,16),(32,32),(48,48)], append_images=fav[:2])
json.dump({
  "name": "AgriRevolution", "short_name": "AgriRevolution",
  "icons": [
    {"src": "/icon-192.png", "sizes": "192x192", "type": "image/png"},
    {"src": "/icon-512.png", "sizes": "512x512", "type": "image/png"},
    {"src": "/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"}],
  "theme_color": "#0F172A", "background_color": "#FBF8F2", "display": "standalone", "start_url": "/"
}, open(f"{FE}/public/site.webmanifest", "w"), indent=2)
# ---- mobile
png("icon-full.svg", 1024, f"{MO}/assets/icon.png", rgb=True)
png("android-foreground.svg", 1024, f"{MO}/assets/android-icon-foreground.png")
png("android-background.svg", 1024, f"{MO}/assets/android-icon-background.png", rgb=True)
subprocess.run(["python3", "mono.py", D, "1024", f"{MO}/assets/android-icon-monochrome.png"], check=True)
png("logo.svg", 1024, f"{MO}/assets/splash-icon.png")
png("favicon.svg", 48, f"{MO}/assets/favicon.png")
png("logo.svg", 256, f"{MO}/assets/logo.png")   # in-app brand mark (rounded tile)
print("ok")
