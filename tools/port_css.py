"""Porta el CSS del sistema de diseño (celeste.html) a una hoja con espacio de nombres lk-.
- Clases .foo -> .lk-foo (las que ya empiezan por lk- se quedan igual)
- Variables globales de :root --x -> --lk-x (las locales como --v, --c no cambian)
- @keyframes x -> lk-x
- Reglas de página (html, body, main, section.ch, footer...) se descartan; las de elementos
  (h1, p, button...) se limitan a :where(.lk-ui) para no tocar el resto del juego."""
import re, sys
src, dst = sys.argv[1], sys.argv[2]
html = open(src, encoding='utf-8').read()
css = html[html.index('<style>') + 7:html.index('</style>')]
css = re.sub(r'/\*[\s\S]*?\*/', '', css)

# --- tokens de :root
root = re.search(r':root\s*\{([\s\S]*?)\}', css).group(1)
tokens = sorted(set(re.findall(r'(--[\w-]+)\s*:', root)), key=len, reverse=True)
def ren_vars(t):
    return re.sub(r'--([\w-]+)', lambda m: ('--lk-' + m.group(1)) if ('--' + m.group(1)) in tokens else m.group(0), t)

# --- parser de bloques
def parse(t):
    out, i, n = [], 0, len(t)
    while i < n:
        j = t.find('{', i)
        if j < 0: break
        pre = t[i:j].strip()
        depth, k = 1, j + 1
        while k < n and depth:
            if t[k] == '{': depth += 1
            elif t[k] == '}': depth -= 1
            k += 1
        body = t[j + 1:k - 1]
        out.append((pre, body))
        i = k
    return out

kf_names = set(re.findall(r'@keyframes\s+([\w-]+)', css))
DROP_ELEM = re.compile(r'^(html|body(?![.\w-])|main|section\.ch|footer\.foot|pre\.code)\b')
def map_sel(sel):
    sel = sel.strip()
    if not sel: return None
    if sel == ':root': return ':root'
    if DROP_ELEM.match(sel): return None
    s = re.sub(r'\.(?!lk-)([A-Za-z_][\w-]*)', r'.lk-\1', sel)
    if s.startswith('body.'): return s                          # body.lk-is-dragging
    first = s[0]
    if first in '.[#': return s
    return ':where(.lk-ui) ' + s                                  # h1, p, button, svg.ic, :focus-visible...
def ren_anim(body):
    def fix(m):
        val = m.group(2)
        for k in sorted(kf_names, key=len, reverse=True):
            val = re.sub(r'(?<![\w-])' + re.escape(k) + r'(?![\w-])', 'lk-' + k, val)
        return m.group(1) + val
    return re.sub(r'(animation(?:-name)?\s*:)([^;}]*)', fix, body)

def emit(blocks, indent=''):
    out = []
    for pre, body in blocks:
        if pre.startswith('@media') or pre.startswith('@supports'):
            inner = emit(parse(body), indent + '  ')
            if inner.strip(): out.append(f'{indent}{pre}{{\n{inner}{indent}}}\n')
        elif pre.startswith('@keyframes'):
            name = pre.split()[1]
            out.append(f'{indent}@keyframes lk-{name}{{{ren_vars(body).strip()}}}\n')
        else:
            sels = [map_sel(x) for x in pre.split(',')]
            sels = [x for x in sels if x]
            if not sels: continue
            b = ren_anim(ren_vars(body)).strip()
            # url(assets/...) relativas al juego: la hoja vive en src/ui/
            b = re.sub(r'url\((["\']?)assets/', r'url(\1../../assets/ui/', b)
            out.append(f'{indent}{",".join(sels)}{{{b}}}\n')
    return ''.join(out)

body = emit(parse(css))
# en el CSS original: "button{font:inherit}" etc. ya quedan en :where(.lk-ui)
head = '/* Generado automáticamente desde el sistema de diseño Crónica Celeste. No editar a mano: usa tools/port_css.py */\n'
open(dst, 'w', encoding='utf-8').write(head + body)
print('tokens', len(tokens), 'keyframes', len(kf_names), 'bytes', len(head + body))
