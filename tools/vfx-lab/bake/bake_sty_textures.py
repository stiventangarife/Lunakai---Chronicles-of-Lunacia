"""Hornea las texturas del kit estilizado de VFX (src/vfx/textures/).

  python3 tools/vfx-lab/bake/bake_sty_textures.py

sty-noise.webp  512x512 RGBA, tileable, datos lineales (no color):
  R  ruido fbm suave           -> erosión general, humo, nubes
  G  celdas (voronoi F1)       -> salpicaduras, escamas, burbujas
  B  vetas alargadas en U      -> tajos, estelas, viento
  A  ruido fino                -> rotura del borde de la erosión

sty-shapes.webp 1024x512 RGBA, atlas 4x2 de celdas de 256 px:
  R  altura/máscara de la forma (0 fuera)  -> silueta + normal (relieve) para el sombreado en bandas
  G  detalle interior (núcleo, nervio, brillo)
  B  ruido propio de la celda (para erosionar sin repetir)
  A  255
  celdas: 0 humo · 1 llama · 2 hoja · 3 esquirla · 4 gota · 5 chispa · 6 corte · 7 anillo de pincel
Determinista (semilla fija): rehornear da el mismo resultado. El equipo de arte puede repintar
cualquier celda respetando los canales.
"""
import os
import numpy as np
from PIL import Image

OUT = os.path.join(os.path.dirname(__file__), '..', '..', '..', 'src', 'vfx', 'textures')
rng = np.random.default_rng(20261029)


def norm01(a):
    a = a - a.min()
    return a / (a.max() + 1e-9)


def spectral_noise(n, beta=2.0, aniso=(1.0, 1.0), seed=0):
    """Ruido tileable por síntesis espectral (la FFT es periódica por construcción)."""
    r = np.random.default_rng(seed)
    kx = np.fft.fftfreq(n)[None, :] * aniso[0]
    ky = np.fft.fftfreq(n)[:, None] * aniso[1]
    k = np.sqrt(kx * kx + ky * ky)
    k[0, 0] = 1.0
    amp = 1.0 / np.power(k, beta / 2.0)
    amp[0, 0] = 0.0
    ph = r.uniform(0, 2 * np.pi, (n, n))
    spec = amp * np.exp(1j * ph)
    return norm01(np.real(np.fft.ifft2(spec)))


def voronoi_f1(n, cells=10, seed=1):
    r = np.random.default_rng(seed)
    pts = r.uniform(0, 1, (cells * cells, 2))
    yy, xx = np.mgrid[0:n, 0:n] / n
    d = np.full((n, n), 9.0)
    for px, py in pts:
        dx = np.abs(xx - px); dx = np.minimum(dx, 1 - dx)
        dy = np.abs(yy - py); dy = np.minimum(dy, 1 - dy)
        d = np.minimum(d, np.sqrt(dx * dx + dy * dy))
    return 1.0 - norm01(d)


def contrast(a, lo=0.08, hi=0.92):
    return np.clip((a - np.quantile(a, lo)) / (np.quantile(a, hi) - np.quantile(a, lo) + 1e-9), 0, 1)


def bake_noise():
    n = 512
    R = contrast(spectral_noise(n, 2.2, seed=3))
    G = voronoi_f1(n, 9, seed=4)
    B = contrast(spectral_noise(n, 2.0, aniso=(0.18, 1.0), seed=5))  # alargado en U
    A = contrast(spectral_noise(n, 1.1, seed=6))
    img = np.stack([R, G, B, A], -1)
    Image.fromarray((img * 255 + 0.5).astype(np.uint8), 'RGBA').save(os.path.join(OUT, 'sty-noise.webp'), quality=92, method=6, alpha_quality=100)


# ---------------------------------------------------------------- formas (supermuestreo x2)
S = 512                       # celda de trabajo (se reduce a 256)
yy, xx = (np.mgrid[0:S, 0:S] + 0.5) / S * 2 - 1   # -1..1, y hacia abajo
Y = -yy                                            # y hacia arriba
X = xx
cell_noise = [contrast(spectral_noise(S, 2.0, seed=40 + i)) for i in range(8)]


def smin(a, b, k):
    h = np.clip(0.5 + 0.5 * (b - a) / k, 0, 1)
    return b * (1 - h) + a * h - k * h * (1 - h)


def dome(sd, width):
    """Altura en cúpula desde una distancia con signo (negativa dentro)."""
    t = np.clip(-sd / width, 0, 1)
    return np.sqrt(1 - (1 - t) ** 2)


def edge_mask(sd, soft=0.012):
    return np.clip(0.5 - sd / soft, 0, 1)


def wobble(sd, i, amt=0.05):
    return sd + (cell_noise[i] - 0.5) * amt


def shape_puff(i):
    sd = None
    hs = 0
    for cx, cy, r in [(0, -0.08, 0.46), (-0.36, -0.2, 0.32), (0.38, -0.18, 0.34), (-0.12, 0.3, 0.34), (0.24, 0.22, 0.3), (-0.42, 0.12, 0.22)]:
        d = np.sqrt((X - cx) ** 2 + (Y - cy) ** 2) - r
        sd = d if sd is None else smin(sd, d, 0.08)
        hs = np.maximum(hs, dome(d, r) * (0.85 + 0.3 * r))
    sd = wobble(sd, i, 0.06)
    m = edge_mask(sd)
    return np.clip(hs, 0, 1) * m, m * (1 - np.clip(np.sqrt(X ** 2 + (Y + .05) ** 2) / .7, 0, 1))


def shape_flame(i):
    # lágrima con la punta arriba y la base redonda; la punta se curva un poco
    yb = Y + 0.45
    rb = 0.36
    ben = X + 0.1 * np.clip(Y + 0.2, 0, None) ** 1.6
    d1 = np.sqrt(ben ** 2 + yb ** 2) - rb
    w = rb * np.clip(1 - yb / 1.3, 0, 1) ** 1.5
    d2 = np.where(yb > 0, np.abs(ben) - w, 1)
    sd = smin(d1, d2, 0.05)
    sd = wobble(sd, i, 0.035)
    m = edge_mask(sd)
    core = np.clip(1 - np.sqrt(ben ** 2 + (yb - 0.05) ** 2) / 0.28, 0, 1)
    return dome(sd, 0.22) * m, core * m


def shape_leaf(i):
    t = np.clip((Y + 0.85) / 1.7, 0, 1)
    w = 0.4 * np.sin(np.pi * t) ** 0.9 * (1 - 0.25 * t)
    xb = X - 0.08 * np.sin(np.pi * t)
    sd = np.abs(xb) - w
    sd = np.where((Y < -0.85) | (Y > 0.85), 1, sd)
    m = edge_mask(wobble(sd, i, 0.02))
    vein = np.clip(1 - np.abs(xb) / 0.03, 0, 1) * m
    side = np.clip(1 - np.abs(np.abs(xb) - (Y - 0.0) * 0.0 - np.abs((Y + 0.8) % 0.34 - 0.17) * 0.0), 0, 1)
    h = (0.55 + 0.45 * np.clip(-xb / (w + 1e-3), -1, 1) * 0.5 + 0.25) * m  # pliegue: un lado más alto
    return np.clip(h, 0, 1) * dome(sd, 0.18), np.maximum(vein, 0) * 0.9 + 0 * side


def shape_shard(i):
    ang = np.arctan2(Y, X)
    r = np.sqrt(X ** 2 + Y ** 2)
    verts = 7
    rr = np.random.default_rng(70)
    radii = 0.55 + rr.uniform(-0.18, 0.2, verts)
    a0 = np.linspace(-np.pi, np.pi, verts, endpoint=False)
    # radio poligonal por interpolación entre vértices
    idx = ((ang + np.pi) / (2 * np.pi) * verts).astype(int) % verts
    f = ((ang + np.pi) / (2 * np.pi) * verts) % 1
    rv = radii[idx] * (1 - f) + radii[(idx + 1) % verts] * f
    sd = r - rv * 0.95
    m = edge_mask(sd, 0.01)
    # facetas: altura por planos (cada cara una pendiente distinta) -> bandas de luz duras
    facet = (np.cos(ang - a0[idx]) * 0.5 + 0.5) * 0.4 + (1 - r / (rv + 1e-3)) * 0.6
    return np.clip(facet, 0, 1) * m, (idx % 2) * m * 1.0


def shape_drop(i):
    yy2 = Y + 0.25
    rb = 0.42
    d1 = np.sqrt(X ** 2 + yy2 ** 2) - rb
    # punta hacia arriba
    w = rb * np.clip(1 - (yy2) / 1.05, 0, 1) ** 1.3
    d2 = np.where(yy2 > 0, np.abs(X) - w, 1)
    sd = np.minimum(d1, d2)
    m = edge_mask(sd)
    hl = np.clip(1 - np.sqrt((X + 0.16) ** 2 + (Y + 0.05) ** 2) / 0.13, 0, 1)
    return dome(sd, 0.3) * m, hl * m


def shape_spark(i):
    ax, ay = np.abs(X), np.abs(Y)
    star = np.minimum(ax * 6 + ay * 0.9, ay * 6 + ax * 0.9)
    diag = np.minimum((np.abs(X + Y)) * 5 + np.abs(X - Y) * 1.6, (np.abs(X - Y)) * 5 + np.abs(X + Y) * 1.6) * 1.35
    sd = np.minimum(star, diag) - 0.95
    m = edge_mask(sd, 0.02)
    core = np.clip(1 - np.sqrt(X ** 2 + Y ** 2) / 0.35, 0, 1)
    return np.clip(1 - np.sqrt(X ** 2 + Y ** 2), 0, 1) * m, core


def shape_slash(i):
    # media luna: círculo grande menos círculo desplazado; se afina hacia las puntas
    d1 = np.sqrt(X ** 2 + (Y + 0.15) ** 2) - 0.8
    d2 = np.sqrt(X ** 2 + (Y + 0.42) ** 2) - 0.86
    sd = np.maximum(d1, -d2)
    sd = np.where(Y < -0.2, 1, sd)
    sd = wobble(sd, i, 0.015)
    m = edge_mask(sd, 0.01)
    inner = np.clip(1 - np.abs(d1) / 0.06, 0, 1) * m
    return dome(sd, 0.06) * m, inner


def shape_ring(i):
    r = np.sqrt(X ** 2 + Y ** 2)
    ang = np.arctan2(Y, X)
    width = 0.09 * (0.6 + 0.8 * cell_noise[i])
    sd = np.abs(r - 0.78) - width
    dry = cell_noise[(i + 3) % 8]
    m = edge_mask(sd, 0.015) * np.clip((dry - 0.25) * 4, 0, 1)
    return dome(sd, 0.08) * m, np.clip(1 - np.abs(r - 0.78) / 0.03, 0, 1) * m


def bake_shapes():
    fns = [shape_puff, shape_flame, shape_leaf, shape_shard, shape_drop, shape_spark, shape_slash, shape_ring]
    atlas = np.zeros((512, 1024, 4))
    for i, fn in enumerate(fns):
        h, g = fn(i)
        b = cell_noise[i]
        cell = np.stack([np.clip(h, 0, 1), np.clip(g, 0, 1), b, np.ones_like(h)], -1)
        # reducción 2x (antialias)
        cell = cell.reshape(256, 2, 256, 2, 4).mean(axis=(1, 3))
        cx, cy = (i % 4) * 256, (i // 4) * 256
        atlas[cy:cy + 256, cx:cx + 256] = cell
    Image.fromarray((atlas * 255 + 0.5).astype(np.uint8), 'RGBA').convert('RGB').save(os.path.join(OUT, 'sty-shapes.webp'), quality=92, method=6)


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    bake_noise()
    bake_shapes()
    print('ok', os.listdir(OUT))
