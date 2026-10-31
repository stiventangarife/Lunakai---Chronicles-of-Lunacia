"""Mipmaps con relleno de huecos UV (push-pull) para atlas horneados.
pad_levels(img RGB(A), mask bool HxW) -> lista de PIL por nivel (nivel 0 = original con huecos rellenos)."""
import numpy as np
from PIL import Image
from scipy import ndimage

def _fill(col, cov):
    """Rellena los texeles sin cobertura con el color del texel cubierto más cercano."""
    if cov.all() or not cov.any():
        return col
    idx = ndimage.distance_transform_edt(~cov, return_distances=False, return_indices=True)
    return col[idx[0], idx[1]]

def pad_levels(img, mask, srgb=True, min_size=1):
    a = np.asarray(img).astype(np.float64) / 255.0
    lin = (np.where(a <= 0.04045, a / 12.92, ((a + 0.055) / 1.055) ** 2.4)) if srgb else a
    w = mask.astype(np.float64)
    levels = []
    col = _fill(lin, w > 0)
    levels.append(col)
    while col.shape[0] > min_size or col.shape[1] > min_size:
        h2, w2 = max(1, col.shape[0] // 2), max(1, col.shape[1] // 2)
        def down(x):
            x = x[: h2 * 2, : w2 * 2]
            return x.reshape(h2, 2, w2, 2, *x.shape[2:]).mean(axis=(1, 3))
        ws = down(w)
        num = down(levels[-1] * w[..., None]) if True else None
        cov = ws > 1e-6
        c = np.where(cov[..., None], num / np.maximum(ws, 1e-9)[..., None], 0)
        col = _fill(c, cov)
        levels.append(col)
        w = ws
    out = []
    for c in levels:
        c = np.clip(c, 0, 1)
        s = np.where(c <= 0.0031308, c * 12.92, 1.055 * np.power(c, 1 / 2.4) - 0.055) if srgb else c
        out.append(Image.fromarray((s * 255 + 0.5).astype(np.uint8)))
    return out
