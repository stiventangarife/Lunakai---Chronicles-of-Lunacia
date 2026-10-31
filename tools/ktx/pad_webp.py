"""pad_webp.py in.glb out.glb mask.png [calidad] — rellena los huecos UV de las texturas WebP/PNG/JPG de un GLB (nivel 0)
y las guarda como WebP; el navegador genera los mipmaps a partir de la imagen ya rellena."""
import sys, io, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ktx_convert import read_glb, write_glb, texture_source
from padmip import pad_levels
from PIL import Image
import numpy as np
src, dst, maskp = sys.argv[1:4]
q = int(sys.argv[4]) if len(sys.argv) > 4 else 92
j, binc = read_glb(src); views = j['bufferViews']
data = [binc[v.get('byteOffset', 0):v.get('byteOffset', 0) + v['byteLength']] for v in views]
M = Image.open(maskp).convert('L')
srgb_imgs = {texture_source(j['textures'][m['pbrMetallicRoughness']['baseColorTexture']['index']]) for m in j.get('materials', []) if (m.get('pbrMetallicRoughness') or {}).get('baseColorTexture')}
for si, img in enumerate(j['images']):
    if img.get('mimeType') not in ('image/webp', 'image/png', 'image/jpeg'): continue
    raw = data[img['bufferView']]; pil = Image.open(io.BytesIO(raw)); alpha = pil.mode in ('RGBA', 'LA')
    pil = pil.convert('RGBA' if alpha else 'RGB')
    mask = np.asarray(M.resize(pil.size, Image.BILINEAR)) > 40
    lv0 = pad_levels(pil, mask, srgb=si in srgb_imgs)[0]
    buf = io.BytesIO(); lv0.save(buf, 'WEBP', quality=q, method=6)
    data[img['bufferView']] = buf.getvalue()
    if img['mimeType'] != 'image/webp':
        img['mimeType'] = 'image/webp'
        for t in j['textures']:
            if t.get('source') == si:
                t.pop('source'); t.setdefault('extensions', {})['EXT_texture_webp'] = {'source': si}
        for k in ('extensionsUsed',): j.setdefault(k, []); 'EXT_texture_webp' in j[k] or j[k].append('EXT_texture_webp')
    print(f'  imagen {si}: {pil.size[0]}×{pil.size[1]} {len(raw)//1024} KB → WebP rellena {len(buf.getvalue())//1024} KB')
out = bytearray()
for v, d in zip(views, data):
    out += b'\0' * ((4 - len(out) % 4) % 4); v['byteOffset'] = len(out); v['byteLength'] = len(d); out += d
j['buffers'][0]['byteLength'] = len(out); write_glb(dst, j, bytes(out))
