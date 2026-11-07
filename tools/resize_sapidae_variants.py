# Reescala a 512×512 las texturas de las variantes del Sapidae (pelo, cabeza, camisa, ojos, boca) dentro del GLB.
import json, struct, sys, io, re
from PIL import Image
PAT = re.compile(r'^T_Char_Sapidae_(Ema|Kai)_(Hair|Head|Shirt|Eyes|Mouth)[A-E]_C$')
def rewrite(src, dst, size=512):
    b = open(src, 'rb').read()
    jl = struct.unpack('<I', b[12:16])[0]; j = json.loads(b[20:20 + jl])
    bo = 20 + jl; bl = struct.unpack('<I', b[bo:bo + 4])[0]; binb = b[bo + 8:bo + 8 + bl]
    repl = {}; log = []
    for im in j['images']:
        name = im.get('name', '')
        if not PAT.match(name) or im.get('mimeType') != 'image/png': continue
        bvi = im['bufferView']; bv = j['bufferViews'][bvi]
        data = binb[bv.get('byteOffset', 0):bv.get('byteOffset', 0) + bv['byteLength']]
        I = Image.open(io.BytesIO(data)); I.load()
        if I.size[0] <= size: continue
        mode = I.mode
        if mode == 'RGBA':
            R = I.convert('RGBa').resize((size, size), Image.LANCZOS).convert('RGBA')
        else:
            R = I.resize((size, size), Image.LANCZOS)
        out = io.BytesIO(); R.save(out, 'PNG', optimize=True); nd = out.getvalue()
        repl[bvi] = nd; log.append((name, I.size, len(data) // 1024, len(nd) // 1024))
    # reconstruir el binario
    nb = bytearray()
    for i, bv in enumerate(j['bufferViews']):
        data = repl.get(i)
        if data is None: data = binb[bv.get('byteOffset', 0):bv.get('byteOffset', 0) + bv['byteLength']]
        while len(nb) % 4: nb.append(0)
        bv['byteOffset'] = len(nb); bv['byteLength'] = len(data); nb += data
    while len(nb) % 4: nb.append(0)
    j['buffers'][0]['byteLength'] = len(nb)
    js = json.dumps(j, separators=(',', ':')).encode()
    while len(js) % 4: js += b' '
    total = 12 + 8 + len(js) + 8 + len(nb)
    out = struct.pack('<III', 0x46546C67, 2, total) + struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(nb), 0x004E4942) + bytes(nb)
    open(dst, 'wb').write(out)
    return log, len(b), len(out)
if __name__ == '__main__':
    for src, dst in zip(sys.argv[1::2], sys.argv[2::2]):
        log, a, c = rewrite(src, dst)
        print(dst, f'{a/1048576:.2f} MB -> {c/1048576:.2f} MB, {len(log)} imagenes')
        for l in log: print('  ', l)
