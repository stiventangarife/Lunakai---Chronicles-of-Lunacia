#!/usr/bin/env python3
"""resize_glb_textures.py — Reescala imágenes dentro de un GLB (PNG o WebP) sin tocar la geometría (Draco incluido).

Uso:
  python resize_glb_textures.py entrada.glb salida.glb --max 512 [--name REGEX] [--size NOMBRE_REGEX=256 ...]

  --max N            lado máximo para las imágenes que casen con --name (por defecto, todas)
  --name REGEX       solo las imágenes cuyo nombre case (sin --name: todas)
  --size REGEX=N     tamaño propio para las imágenes cuyo nombre case (tiene prioridad sobre --max)

Conserva el formato (PNG optimizado / WebP calidad 92) y el canal alfa (reescalado con alfa premultiplicado).
Hito 145 (texturas de NPC Sapidae, mejillas y pantalón de Ema). Necesita Pillow.
"""
import argparse, io, json, re, struct
from PIL import Image


def read_glb(path):
    b = open(path, 'rb').read()
    jl = struct.unpack('<I', b[12:16])[0]
    j = json.loads(b[20:20 + jl])
    bo = 20 + jl
    bl = struct.unpack('<I', b[bo:bo + 4])[0]
    return b, j, b[bo + 8:bo + 8 + bl]


def encode(img, mime):
    out = io.BytesIO()
    if mime == 'image/webp':
        img.save(out, 'WEBP', quality=92, method=6)
    else:
        img.save(out, 'PNG', optimize=True)
    return out.getvalue()


def rewrite(src, dst, max_size, name_re, sizes):
    b, j, binb = read_glb(src)
    repl, log = {}, []
    for im in j.get('images', []):
        name = im.get('name', '')
        mime = im.get('mimeType')
        if mime not in ('image/png', 'image/webp') or 'bufferView' not in im:
            continue
        target = None
        for rx, n in sizes:
            if rx.search(name): target = n; break
        if target is None:
            if name_re and not name_re.search(name): continue
            target = max_size
        if not target: continue
        bvi = im['bufferView']
        bv = j['bufferViews'][bvi]
        data = binb[bv.get('byteOffset', 0):bv.get('byteOffset', 0) + bv['byteLength']]
        I = Image.open(io.BytesIO(data)); I.load()
        w, h = I.size
        if max(w, h) <= target: continue
        s = target / max(w, h)
        nw, nh = max(1, round(w * s)), max(1, round(h * s))
        if I.mode in ('RGBA', 'LA', 'P'):
            I = I.convert('RGBA')
            R = I.convert('RGBa').resize((nw, nh), Image.LANCZOS).convert('RGBA')
        else:
            R = I.convert('RGB').resize((nw, nh), Image.LANCZOS)
        nd = encode(R, mime)
        repl[bvi] = nd
        log.append(f'  {name or "(sin nombre)"}: {w}×{h} {len(data) // 1024} KB → {nw}×{nh} {len(nd) // 1024} KB')
    if not repl:
        return log, len(b), None
    nb = bytearray()
    for i, bv in enumerate(j['bufferViews']):
        d = repl.get(i)
        if d is None: d = binb[bv.get('byteOffset', 0):bv.get('byteOffset', 0) + bv['byteLength']]
        while len(nb) % 4: nb.append(0)
        bv['byteOffset'] = len(nb); bv['byteLength'] = len(d); nb += d
    while len(nb) % 4: nb.append(0)
    j['buffers'][0]['byteLength'] = len(nb)
    js = json.dumps(j, separators=(',', ':'), ensure_ascii=False).encode('utf-8')
    while len(js) % 4: js += b' '
    out = struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(nb)) + struct.pack('<II', len(js), 0x4E4F534A) + js \
        + struct.pack('<II', len(nb), 0x004E4942) + bytes(nb)
    open(dst, 'wb').write(out)
    return log, len(b), len(out)


if __name__ == '__main__':
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('src'); ap.add_argument('dst')
    ap.add_argument('--max', type=int, default=0)
    ap.add_argument('--name')
    ap.add_argument('--size', action='append', default=[])
    a = ap.parse_args()
    sizes = [(re.compile(s.rsplit('=', 1)[0]), int(s.rsplit('=', 1)[1])) for s in a.size]
    log, before, after = rewrite(a.src, a.dst, a.max, re.compile(a.name) if a.name else None, sizes)
    print(f'{a.src}: ' + (f'{before / 1048576:.2f} MB → {after / 1048576:.2f} MB' if after else 'sin cambios'))
    print('\n'.join(log))
