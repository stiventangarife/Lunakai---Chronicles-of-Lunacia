#!/usr/bin/env python3
"""ktx_convert.py — Convierte texturas de GLB / glTF / PNG a KTX2 (Basis ETC1S o UASTC) sin tocar la geometría.

Necesita: Python 3 + Pillow, y `ktx` de KTX-Software 4.x (variable KTX_BIN o en el PATH).

Uso:
  # GLB: elige qué tipo de textura se convierte y con qué modo. Las demás quedan como estaban (PNG/JPG/WebP).
  python ktx_convert.py glb  entrada.glb salida.glb --slot color=etc1s [--slot normal=uastc] [--max 512]

  # Imagen suelta (PNG/JPG/WebP) → .ktx2
  python ktx_convert.py img  entrada.png salida.ktx2 --mode etc1s --tf srgb [--max 512]
     (--tf srgb para color; --tf linear para normales, rugosidad, etc.)

  # .gltf con imágenes externas: apunta las imágenes indicadas a su .ktx2 (que ya debe existir)
  python ktx_convert.py gltf entrada.gltf salida.gltf --map Rocks_Diffuse.png=Rocks_Diffuse.ktx2

  # Atlas horneados (muchas islas UV pequeñas): --uvpad máscara.png rellena los huecos entre islas y calcula cada
  # nivel de mipmap solo con texeles de las islas (push-pull). Sin esto, de lejos los mipmaps mezclan el negro de los
  # huecos y salen líneas oscuras en las costuras. La máscara (blanco = isla) la genera tools/ktx/uvmask.html
  # (http://localhost:8082/tools/ktx/uvmask.html?f=assets/models/kappa.glb). Necesita numpy y scipy.
  python ktx_convert.py glb entrada.glb salida.glb --slot color=etc1s --uvpad mascara.png

Tipos de textura (--slot): color, normal, mr (metallicRoughness), occl, emis.
Una textura solo se convierte si TODOS sus usos están en los --slot pedidos (una imagen usada como color y como
otra cosa a la vez se deja igual). Las texturas convertidas usan KHR_texture_basisu sin imagen de respaldo
(extensionsRequired): el juego necesita el KTX2Loader conectado al GLTFLoader.
"""
import argparse, io, json, os, struct, subprocess, sys, tempfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from PIL import Image

KTX = os.environ.get('KTX_BIN', 'ktx')
UASTC_RDO = None
UV_MASK = None    # --uvpad: máscara de islas UV (PIL L), se escala al tamaño de cada textura  # --rdo λ: post-proceso RDO de UASTC (archivos 25–35 % menores con zstd; 1–4, más alto = más pequeño)
SLOT_PATHS = {
    'color': lambda m: (m.get('pbrMetallicRoughness') or {}).get('baseColorTexture'),
    'mr': lambda m: (m.get('pbrMetallicRoughness') or {}).get('metallicRoughnessTexture'),
    'normal': lambda m: m.get('normalTexture'),
    'occl': lambda m: m.get('occlusionTexture'),
    'emis': lambda m: m.get('emissiveTexture'),
}
SRGB_SLOTS = {'color', 'emis'}


def encode_ktx2(img: Image.Image, mode: str, tf: str, max_size: int | None, rgb: bool = False) -> bytes:
    """Pillow → PNG temporal → `ktx create` → bytes del .ktx2 (con mipmaps)."""
    has_alpha = img.mode in ('RGBA', 'LA') or (img.mode == 'P' and 'transparency' in img.info)
    img = img.convert('RGBA' if has_alpha else 'RGB')
    if has_alpha and (rgb or img.getchannel('A').getextrema()[0] == 255):
        img, has_alpha = img.convert('RGB'), False  # canal alfa sin uso (o --rgb: sin transparencia real)
    w, h = img.size
    if max_size and max(w, h) > max_size:
        s = max_size / max(w, h)
        img = img.resize((max(4, round(w * s)), max(4, round(h * s))), Image.LANCZOS)
    w, h = img.size
    if w % 4 or h % 4:  # los formatos de bloque (BC/ETC) necesitan múltiplos de 4
        img = img.resize(((w + 3) // 4 * 4, (h + 3) // 4 * 4), Image.LANCZOS)
    chans = 'R8G8B8A8' if has_alpha else 'R8G8B8'
    fmt = f'{chans}_SRGB' if tf == 'srgb' else f'{chans}_UNORM'
    with tempfile.TemporaryDirectory() as d:
        src, dst = os.path.join(d, 'in.png'), os.path.join(d, 'out.ktx2')
        if UV_MASK is not None:
            # Niveles propios con relleno de huecos (padmip.py): se pasan a ktx create uno por archivo
            import numpy as np
            from padmip import pad_levels
            mask = np.asarray(UV_MASK.resize((w, h), Image.BILINEAR)) > 40
            levels = pad_levels(img, mask, srgb=(tf == 'srgb'))
            srcs = []
            for i, lv in enumerate(levels):
                f = os.path.join(d, f'l{i}.png'); lv.save(f); srcs.append(f)
            cmd = [KTX, 'create', '--format', fmt, '--assign-tf', 'srgb' if tf == 'srgb' else 'linear', '--levels', str(len(srcs))]
        else:
            img.save(src)
            srcs = [src]
            cmd = [KTX, 'create', '--format', fmt, '--assign-tf', 'srgb' if tf == 'srgb' else 'linear', '--generate-mipmap']
        if mode == 'etc1s':
            cmd += ['--encode', 'basis-lz', '--clevel', '2', '--qlevel', '255']
        elif mode == 'uastc':
            cmd += ['--encode', 'uastc', '--uastc-quality', '2']
            if UASTC_RDO: cmd += ['--uastc-rdo', '--uastc-rdo-l', str(UASTC_RDO)]
            cmd += ['--zstd', '18']
        else:
            raise ValueError(mode)
        cmd += srcs + [dst]
        r = subprocess.run(cmd, capture_output=True, text=True)
        if r.returncode != 0:
            raise RuntimeError(f'ktx create falló: {r.stderr or r.stdout}')
        v = subprocess.run([KTX, 'validate', dst], capture_output=True, text=True)
        if v.returncode != 0:
            raise RuntimeError(f'ktx validate falló: {v.stdout} {v.stderr}')
        return open(dst, 'rb').read()


def read_glb(path):
    b = open(path, 'rb').read()
    if b[:4] != b'glTF':
        raise ValueError(f'{path} no es un GLB')
    off, j, binc = 12, None, b''
    while off < len(b):
        ln, typ = struct.unpack('<II', b[off:off + 8])
        chunk = b[off + 8:off + 8 + ln]
        if typ == 0x4E4F534A: j = json.loads(chunk)
        elif typ == 0x004E4942: binc = chunk
        off += 8 + ln
    return j, binc


def write_glb(path, j, binc):
    jb = json.dumps(j, separators=(',', ':'), ensure_ascii=False).encode('utf-8')
    jb += b' ' * ((4 - len(jb) % 4) % 4)
    binc += b'\0' * ((4 - len(binc) % 4) % 4)
    total = 12 + 8 + len(jb) + (8 + len(binc) if binc else 0)
    out = struct.pack('<III', 0x46546C67, 2, total) + struct.pack('<II', len(jb), 0x4E4F534A) + jb
    if binc:
        out += struct.pack('<II', len(binc), 0x004E4942) + binc
    open(path, 'wb').write(out)


def texture_source(t):
    if 'source' in t: return t['source']
    ext = t.get('extensions') or {}
    for k in ('EXT_texture_webp', 'KHR_texture_basisu', 'EXT_texture_avif'):
        if k in ext: return ext[k]['source']
    return None


def add_ext(j, name, required=True):
    j.setdefault('extensionsUsed', [])
    if name not in j['extensionsUsed']: j['extensionsUsed'].append(name)
    if required:
        j.setdefault('extensionsRequired', [])
        if name not in j['extensionsRequired']: j['extensionsRequired'].append(name)


def drop_unused_ext(j, name):
    used = any(name in (t.get('extensions') or {}) for t in j.get('textures', []))
    if used: return
    for k in ('extensionsUsed', 'extensionsRequired'):
        if name in j.get(k, []): j[k].remove(name)
        if k in j and not j[k]: del j[k]


def convert_glb(src, dst, slot_modes, max_size, report):
    j, binc = read_glb(src)
    # Usos de cada textura
    uses, blended = {}, set()
    for m in j.get('materials', []):
        for slot, get in SLOT_PATHS.items():
            ref = get(m)
            if ref is not None:
                uses.setdefault(ref['index'], set()).add(slot)
                if m.get('alphaMode', 'OPAQUE') != 'OPAQUE': blended.add(ref['index'])
    views = j.get('bufferViews', [])
    data = [binc[v.get('byteOffset', 0):v.get('byteOffset', 0) + v['byteLength']] for v in views]
    done = {}  # imagen → modo (si dos texturas comparten imagen, se codifica una vez)
    for ti, t in enumerate(j.get('textures', [])):
        slots = uses.get(ti, set())
        if not slots or not slots.issubset(slot_modes): continue
        modes = {slot_modes[s] for s in slots}
        tfs = {'srgb' if s in SRGB_SLOTS else 'linear' for s in slots}
        if len(modes) != 1 or len(tfs) != 1:
            report.append(f'  textura {ti}: usos mezclados {slots}, se deja igual'); continue
        mode, tf = modes.pop(), tfs.pop()
        si = texture_source(t)
        img = j['images'][si]
        # ¿Otra textura NO convertida usa esta imagen?
        if any(texture_source(o) == si and not uses.get(oi, set()).issubset(slot_modes) for oi, o in enumerate(j['textures']) if oi != ti):
            report.append(f'  textura {ti}: la imagen {si} también la usa otra textura que no se convierte; se deja igual'); continue
        if si not in done:
            if 'bufferView' not in img:
                report.append(f'  textura {ti}: imagen externa ({img.get("uri")}), usa el modo gltf'); continue
            raw = data[img['bufferView']]
            pil = Image.open(io.BytesIO(raw)); pil.load()
            before = (pil.size, img.get('mimeType'), len(raw))
            # Materiales opacos: el canal alfa no se usa (three lo ignora) → RGB, que ocupa la mitad con ETC1S
            ktx = encode_ktx2(pil, mode, tf, max_size, rgb=ti not in blended)
            data[img['bufferView']] = ktx
            img['mimeType'] = 'image/ktx2'
            done[si] = mode
            report.append(f'  imagen {si} ({"+".join(sorted(slots))}): {before[1]} {before[0][0]}×{before[0][1]} {before[2] // 1024} KB → KTX2 {mode.upper()}{f" máx {max_size}" if max_size else ""} {len(ktx) // 1024} KB')
        t.pop('source', None)
        ext = t.setdefault('extensions', {})
        ext.pop('EXT_texture_webp', None); ext.pop('EXT_texture_avif', None)
        ext['KHR_texture_basisu'] = {'source': si}
    if not done:
        report.append('  (nada que convertir)')
        return False
    add_ext(j, 'KHR_texture_basisu')
    drop_unused_ext(j, 'EXT_texture_webp'); drop_unused_ext(j, 'EXT_texture_avif')
    # Reconstruir el BIN con cada bufferView alineado a 4 bytes (el resto de datos se copia tal cual)
    out = bytearray()
    for v, d in zip(views, data):
        out += b'\0' * ((4 - len(out) % 4) % 4)
        v['byteOffset'] = len(out); v['byteLength'] = len(d)
        out += d
    j['buffers'][0]['byteLength'] = len(out)
    write_glb(dst, j, bytes(out))
    return True


def convert_gltf(src, dst, mapping, report):
    j = json.load(open(src, encoding='utf-8'))
    changed = False
    for si, img in enumerate(j.get('images', [])):
        uri = img.get('uri')
        if uri not in mapping: continue
        new = mapping[uri]
        if not os.path.exists(os.path.join(os.path.dirname(dst) or '.', new)) and not os.path.exists(os.path.join(os.path.dirname(src) or '.', new)):
            report.append(f'  aviso: {new} no existe junto al .gltf')
        img['uri'] = new; img['mimeType'] = 'image/ktx2'
        for t in j.get('textures', []):
            if texture_source(t) == si:
                t.pop('source', None)
                ext = t.setdefault('extensions', {}); ext.pop('EXT_texture_webp', None)
                ext['KHR_texture_basisu'] = {'source': si}
        report.append(f'  {uri} → {new}')
        changed = True
    if changed:
        add_ext(j, 'KHR_texture_basisu'); drop_unused_ext(j, 'EXT_texture_webp')
        json.dump(j, open(dst, 'w', encoding='utf-8'), indent=2, ensure_ascii=False)
    else:
        report.append('  (sin imágenes que cambiar)')
    return changed


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('kind', choices=['glb', 'img', 'gltf'])
    ap.add_argument('src'); ap.add_argument('dst')
    ap.add_argument('--slot', action='append', default=[], help='tipo=modo, p. ej. color=etc1s')
    ap.add_argument('--mode', choices=['etc1s', 'uastc']); ap.add_argument('--tf', choices=['srgb', 'linear'], default='srgb')
    ap.add_argument('--max', type=int); ap.add_argument('--map', action='append', default=[])
    ap.add_argument('--rgb', action='store_true', help='descarta el canal alfa (imágenes sin transparencia real)')
    ap.add_argument('--rdo', type=float, help='UASTC con RDO (λ 1–4): archivos más pequeños')
    ap.add_argument('--uvpad', help='máscara de islas UV (PNG, blanco = isla): rellena huecos y mipmaps sin sangrado')
    a = ap.parse_args()
    global UASTC_RDO, UV_MASK
    UASTC_RDO = a.rdo
    if a.uvpad:
        UV_MASK = Image.open(a.uvpad).convert('L')
    rep = [f'{a.src}:']
    if a.kind == 'glb':
        convert_glb(a.src, a.dst, dict(s.split('=') for s in a.slot), a.max, rep)
    elif a.kind == 'img':
        pil = Image.open(a.src); pil.load()
        out = encode_ktx2(pil, a.mode, a.tf, a.max, a.rgb)
        open(a.dst, 'wb').write(out)
        rep.append(f'  {pil.size[0]}×{pil.size[1]} {os.path.getsize(a.src) // 1024} KB → KTX2 {a.mode.upper()} {len(out) // 1024} KB')
    else:
        convert_gltf(a.src, a.dst, dict(m.split('=') for m in a.map), rep)
    print('\n'.join(rep))


if __name__ == '__main__':
    main()
