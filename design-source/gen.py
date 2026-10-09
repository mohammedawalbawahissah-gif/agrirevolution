"""AgriRevolution icon generator — one geometry, every variant.

Concept: a gold sun rising over a fan of ploughed furrows that converge on
the horizon, with a sprout growing out of the vanishing point into the sun.
Brand palette only (terracotta / gold / cream / navy) — no green, matching
the app's deliberate "not another green farm app" direction.
"""
import math, os, sys

OUT = sys.argv[1] if len(sys.argv) > 1 else "out"
os.makedirs(OUT, exist_ok=True)

TERRA = "#B3543A"
TERRA_DARK = "#8C4029"
TERRA_DEEP = "#6E301E"
GOLD = "#D9A441"
GOLD_LIGHT = "#E8BC5E"
CREAM = "#FBF8F2"
NAVY = "#0F172A"

S = 1024
CX = 512
HORIZON = 650          # y of the horizon / vanishing point
SUN_R = 290
SUN_CY = HORIZON - 30  # sun sits slightly sunk into the horizon


def defs():
    return f"""
  <defs>
    <linearGradient id="ar-sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#C66544"/>
      <stop offset="1" stop-color="{TERRA}"/>
    </linearGradient>
    <linearGradient id="ar-sun" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="{GOLD_LIGHT}"/>
      <stop offset="1" stop-color="{GOLD}"/>
    </linearGradient>
    <clipPath id="ar-above"><rect x="0" y="0" width="{S}" height="{HORIZON}"/></clipPath>
  </defs>"""


def sky():
    return f'<rect width="{S}" height="{S}" fill="url(#ar-sky)"/>'


def field(n=9, bottom=1500):
    """Alternating furrow wedges fanning from the vanishing point.
    Drawn past the canvas edge so scaled variants never show a gap."""
    spread = 700 * (bottom - HORIZON) / (S - HORIZON)
    parts = [f'<rect x="-600" y="{HORIZON}" width="{S+1200}" height="{bottom-HORIZON}" fill="{TERRA_DARK}"/>']
    left, right = CX - (CX + spread), CX + (CX + spread)
    step = (right - left) / n
    for i in range(1, n, 2):
        x0 = left + i * step
        parts.append(f'<path d="M{CX} {HORIZON} L{x0:.1f} {bottom} L{x0+step:.1f} {bottom} Z" fill="{TERRA_DEEP}"/>')
    return "\n    ".join(parts)


def sun():
    return (f'<g clip-path="url(#ar-above)">'
            f'<circle cx="{CX}" cy="{SUN_CY}" r="{SUN_R}" fill="url(#ar-sun)"/></g>')


def sprout(fill=NAVY, k=1.0):
    """Stem rises from the vanishing point; two leaves, the right one larger."""
    top = HORIZON - 330 * k
    sw = 40 * k
    stem = (f'<path d="M{CX} {HORIZON+6} C {CX-8*k} {HORIZON-110*k}, {CX+8*k} {top+120*k}, {CX} {top}" '
            f'fill="none" stroke="{fill}" stroke-width="{sw}" stroke-linecap="round"/>')
    rb = (CX + 4, top + 95 * k)
    rt = (CX + 250 * k, top - 50 * k)
    right = (f'<path d="M{rb[0]} {rb[1]} C {rb[0]+25*k} {rb[1]-150*k}, {rt[0]-80*k} {rt[1]-25*k}, {rt[0]} {rt[1]} '
             f'C {rt[0]-12*k} {rt[1]+120*k}, {rb[0]+135*k} {rb[1]+55*k}, {rb[0]} {rb[1]} Z" fill="{fill}"/>')
    lb = (CX - 4, top + 185 * k)
    lt = (CX - 200 * k, top + 65 * k)
    left = (f'<path d="M{lb[0]} {lb[1]} C {lb[0]-25*k} {lb[1]-120*k}, {lt[0]+65*k} {lt[1]-28*k}, {lt[0]} {lt[1]} '
            f'C {lt[0]+12*k} {lt[1]+100*k}, {lb[0]-112*k} {lb[1]+40*k}, {lb[0]} {lb[1]} Z" fill="{fill}"/>')
    return f'<g>{stem}{right}{left}</g>'


def svg(body, size=S, extra_defs=""):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" '
            f'viewBox="0 0 {S} {S}">{defs()}{extra_defs}\n  {body}\n</svg>\n')


def scene(n=9, k=1.0):
    return f"{sky()}\n    {field(n)}\n    {sun()}\n    {sprout(k=k)}"


RX = 230  # iOS-style corner radius for the rounded-tile variants
TILE = f'<defs><clipPath id="ar-tile"><rect width="{S}" height="{S}" rx="{RX}"/></clipPath></defs>'
# Android adaptive icons only guarantee a ~61% centre circle; shrink about the centre.
AK = 0.80
ATF = f'transform="translate({CX*(1-AK):.1f} {CX*(1-AK):.1f}) scale({AK})"'

files = {
    # Full-bleed square (iOS / Expo icon.png — the OS applies its own mask)
    "icon-full.svg": svg(scene()),
    # Rounded tile used inside the web/mobile UI and splash
    "logo.svg": svg(f'<g clip-path="url(#ar-tile)">{scene()}</g>', extra_defs=TILE),
    # Favicon (16-32px): fewer, wider furrows and a slightly bigger sprout so it survives tiny sizes
    "favicon.svg": svg(f'<g clip-path="url(#ar-tile)">{scene(n=5, k=1.08)}</g>', extra_defs=TILE),
    # Android adaptive layers, sharing one scaled geometry
    "android-background.svg": svg(f'{sky()}<g {ATF}>{field()}</g>'),
    "android-foreground.svg": svg(f'<g {ATF}>{sun()}{sprout()}</g>'),
    # Monochrome ingredients (composited with PIL: sun XOR sprout)
    "mono-sun.svg": svg(f'<g {ATF}><g clip-path="url(#ar-above)"><circle cx="{CX}" cy="{SUN_CY}" r="{SUN_R}" fill="#fff"/></g>'
                        f'<rect x="{CX-SUN_R}" y="{HORIZON+30}" width="{2*SUN_R}" height="30" rx="15" fill="#fff"/>'
                        f'<rect x="{CX-SUN_R*0.7:.0f}" y="{HORIZON+90}" width="{2*SUN_R*0.7:.0f}" height="26" rx="13" fill="#fff"/></g>'),
    "mono-sprout.svg": svg(f'<g {ATF}>{sprout("#fff")}</g>'),
}

for name, content in files.items():
    with open(os.path.join(OUT, name), "w") as f:
        f.write(content)
print("wrote", list(files))
