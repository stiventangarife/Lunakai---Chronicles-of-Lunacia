#!/usr/bin/env python3
"""build_skill_sfx.py — Prepara el pack de sonidos de habilidades para el navegador (fase 1 del plan de audio de skills).

Lee los WAV del pack de combate (backups/2026-10-30_sounds/combat/*.wav; antes en assets/sounds/sfx/combat/) y escribe en
assets/sounds/sfx/skills/:
  · un MP3 mono por sonido distinto (48 kHz, LAME VBR -q:a 3, ~90–110 kbps);
  · manifest.json con la clave lógica de cada sonido, su categoría, clase, animación, duración y nivel.

Qué hace con cada archivo:
  1. Nombre: minúsculas, guiones y espacios → «_», «#1234» → «_alt», erratas corregidas (vunerable → vulnerable).
  2. Duplicados: si dos WAV tienen el mismo audio una vez recortados (hash del PCM), se escribe un solo MP3 y el
     resto queda como alias en el manifiesto (menos descarga y menos memoria decodificada).
  3. Recorte: quita el silencio del principio (deja 5 ms antes del ataque) y del final (deja 80 ms de cola tras el
     último sonido por encima de −55 dBFS), con fundido de entrada de 2 ms y de salida de 60 ms para que no haya clics.
  4. Nivel: iguala la sonoridad (EBU R128, LUFS) por categoría, sin pasar nunca de −1,5 dBTP antes de codificar
     (si el objetivo pidiera más, se queda por debajo: no se usa limitador para no aplastar los golpes).
       attack −18 · hit −18 · impact −18 · status −20 · fly −22 LUFS
     Los archivos demasiado cortos para medir LUFS (< 0,4 s) se ajustan por pico verdadero a −3 dBTP.

Requisitos: Python 3.8+ y ffmpeg (con libmp3lame) en el PATH, o --ffmpeg/--ffprobe con su ruta. Sin paquetes extra.

Uso (desde axie-tactics-web/):
    python tools/audio/build_skill_sfx.py
    python tools/audio/build_skill_sfx.py --src backups/2026-10-30_sounds/combat --out assets/sounds/sfx/skills
    python tools/audio/build_skill_sfx.py --dry-run          # solo analiza e imprime la tabla

No toca los WAV de origen ni el código del juego. Volver a ejecutarlo rehace los MP3 y el manifiesto.
"""

import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
import tempfile
from collections import OrderedDict
from pathlib import Path

CLASSES = ['aquatic', 'beast', 'bird', 'bug', 'dawn', 'dusk', 'mech', 'plant', 'reptile']
ANIMS = ['bite', 'cast', 'gore', 'projectile', 'slash', 'smash', 'throw']
TARGET_LUFS = {'attack': -18.0, 'hit': -18.0, 'impact': -18.0, 'status': -20.0, 'fly': -22.0}
TP_CEIL = -1.5            # dBTP antes de codificar (el MP3 puede subir ~0,3–0,5 dB)
SHORT_TP = -3.0           # archivos sin LUFS medible
SILENCE_DB = -55          # umbral de silencio para recortar
PRE_ROLL = 0.005          # s que se dejan antes del primer sonido
TAIL = 0.08               # s de cola tras el último sonido
FADE_IN, FADE_OUT = 0.002, 0.06
SAMPLE_RATE = 48000
MP3_QUALITY = '3'         # LAME VBR (0 mejor … 9 peor)

FIXED_NAMES = {'vunerable': 'vulnerable'}
GENERIC_IMPACTS = {'critical', 'counter', 'tackle'}


def clean_name(stem):
    """'heal #5993' → 'heal_alt' · 'hit-normal' → 'hit_normal' · 'vunerable' → 'vulnerable'."""
    s = stem.strip().lower()
    s = re.sub(r'\s*#\s*\d+$', '_alt', s)
    s = re.sub(r'[\s\-]+', '_', s)
    s = re.sub(r'[^a-z0-9_]', '', s)
    s = re.sub(r'_+', '_', s).strip('_')
    return FIXED_NAMES.get(s, s)


def classify(key):
    """Devuelve (categoría, clase, animación) a partir de la clave lógica."""
    m = re.fullmatch(r'(%s)_(%s)_(attack|fly|hit)' % ('|'.join(CLASSES), '|'.join(ANIMS)), key)
    if m:
        cls, anim, part = m.groups()
        return ('fly' if part == 'fly' else part), cls, anim
    m = re.fullmatch(r'(%s)_fly' % '|'.join(CLASSES), key)
    if m:
        return 'fly', m.group(1), None
    if key.endswith('_hit') or key.startswith('hit_') or key in GENERIC_IMPACTS:
        return 'impact', None, None
    return 'status', None, None


class Tools:
    def __init__(self, ffmpeg, ffprobe):
        self.ffmpeg, self.ffprobe = ffmpeg, ffprobe

    def _run(self, args, binary=False):
        r = subprocess.run(args, capture_output=True)
        if r.returncode != 0:
            raise RuntimeError(f"{' '.join(map(str, args[:6]))}…\n{r.stderr.decode('utf-8', 'replace')[-800:]}")
        return r if binary else r.stderr.decode('utf-8', 'replace')

    def duration(self, path):
        r = subprocess.run([self.ffprobe, '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(path)],
                           capture_output=True, text=True)
        return float(r.stdout.strip())

    def pcm_hash(self, path):
        r = self._run([self.ffmpeg, '-v', 'error', '-i', str(path), '-ac', '1', '-f', 's16le', '-'], binary=True)
        return hashlib.sha1(r.stdout).hexdigest()

    def active_span(self, path, dur):
        """(inicio, fin) del sonido: primer y último instante por encima de SILENCE_DB."""
        e = self._run([self.ffmpeg, '-hide_banner', '-nostats', '-i', str(path),
                       '-af', f'silencedetect=n={SILENCE_DB}dB:d=0.02', '-f', 'null', '-'])
        starts = [float(x) for x in re.findall(r'silence_start: (-?[\d.]+)', e)]
        ends = [float(x) for x in re.findall(r'silence_end: ([\d.]+)', e)]
        segs = [(s, ends[i] if i < len(ends) else dur) for i, s in enumerate(starts)]
        a, b = 0.0, dur
        if segs and segs[0][0] <= 0.001:              # silencio al principio
            a = segs[0][1]
        if segs and segs[-1][1] >= dur - 0.02 and segs[-1][0] > a:   # silencio hasta el final
            b = segs[-1][0]
        if b <= a:                                    # todo silencio: se deja tal cual
            return 0.0, dur
        return a, b

    def loudness(self, path):
        e = self._run([self.ffmpeg, '-hide_banner', '-nostats', '-i', str(path),
                       '-af', 'ebur128=peak=true:framelog=quiet', '-f', 'null', '-'])
        i = re.findall(r'I:\s+(-?[\d.]+|-inf)\s+LUFS', e)
        p = re.findall(r'Peak:\s+(-?[\d.]+|-inf)\s+dBFS', e)
        lufs = float(i[-1]) if i and i[-1] != '-inf' else None
        tp = float(p[-1]) if p and p[-1] != '-inf' else None
        return lufs, tp


def build(args):
    tools = Tools(args.ffmpeg, args.ffprobe)
    src, out = Path(args.src), Path(args.out)
    wavs = sorted(p for p in src.iterdir() if p.suffix.lower() == '.wav')
    if not wavs:
        sys.exit(f'No hay WAV en {src}')
    if not args.dry_run:
        out.mkdir(parents=True, exist_ok=True)

    # 1) nombres. Orden: «<clase>_fly» antes que el resto, para que sea el nombre que se queda si hay duplicados
    entries, renamed = OrderedDict(), {}
    for p in sorted(wavs, key=lambda q: (not re.fullmatch(r'[a-z]+_fly', clean_name(q.stem)), clean_name(q.stem))):
        key = clean_name(p.stem)
        if key in entries:
            sys.exit(f'Dos archivos acaban con el mismo nombre «{key}»: {entries[key]["src"].name} y {p.name}')
        if key != p.stem:
            renamed[p.name] = key + '.mp3'
        entries[key] = {'src': p}
    aliases, by_hash = {}, {}

    # 3) recorte, duplicados, nivel y codificación
    sounds, rows, total_bytes, total_dec = OrderedDict(), [], 0, 0
    with tempfile.TemporaryDirectory() as tmp:
        for key, ent in entries.items():
            p = ent['src']
            cat, cls, anim = classify(key)
            dur = tools.duration(p)
            a, b = tools.active_span(p, dur)
            start = max(0.0, a - PRE_ROLL)
            end = min(dur, b + TAIL)
            length = end - start
            fo = min(FADE_OUT, length * 0.3)
            trim = (f'atrim=start={start:.4f}:end={end:.4f},asetpts=PTS-STARTPTS,'
                    f'afade=t=in:d={FADE_IN},afade=t=out:st={length - fo:.4f}:d={fo:.4f}')
            tmp_wav = Path(tmp) / f'{key}.wav'
            tools._run([tools.ffmpeg, '-v', 'error', '-y', '-i', str(p), '-af', trim, '-ac', '1',
                        '-ar', str(SAMPLE_RATE), '-c:a', 'pcm_f32le', str(tmp_wav)])
            # 2) duplicados: mismo audio una vez recortado (p. ej. un «fly» igual a otro con más silencio al final)
            h = tools.pcm_hash(tmp_wav)
            if h in by_hash:
                aliases[key] = by_hash[h]
                continue
            by_hash[h] = key
            lufs, tp = tools.loudness(tmp_wav)
            target = TARGET_LUFS[cat]
            if lufs is None or lufs < -60:                      # demasiado corto para LUFS
                gain = SHORT_TP - (tp if tp is not None else 0.0)
                mode = 'tp'
            else:
                gain = target - lufs
                mode = 'lufs'
            capped = False
            if tp is not None and tp + gain > TP_CEIL:
                gain, capped = TP_CEIL - tp, True
            row = {'key': key, 'cat': cat, 'src_dur': round(dur, 3), 'dur': round(length, 3),
                   'cut_lead': round(start, 3), 'cut_tail': round(dur - end, 3),
                   'src_lufs': lufs, 'gain_db': round(gain, 2), 'mode': mode, 'capped': capped}
            if not args.dry_run:
                mp3 = out / f'{key}.mp3'
                tools._run([tools.ffmpeg, '-v', 'error', '-y', '-i', str(tmp_wav), '-af', f'volume={gain:.3f}dB',
                            '-ac', '1', '-ar', str(SAMPLE_RATE), '-c:a', 'libmp3lame', '-q:a', MP3_QUALITY,
                            '-map_metadata', '-1', '-id3v2_version', '0', '-write_xing', '1', str(mp3)])
                f_lufs, f_tp = tools.loudness(mp3)
                f_dur = tools.duration(mp3)
                size = mp3.stat().st_size
                total_bytes += size
                total_dec += int(f_dur * SAMPLE_RATE * 4)     # Float32 mono decodificado (AudioBuffer)
                row.update({'lufs': f_lufs, 'tp': f_tp, 'bytes': size})
                info = OrderedDict(file=f'{key}.mp3', cat=cat)
                if cls:
                    info['cls'] = cls
                if anim:
                    info['anim'] = anim
                info['dur'] = round(f_dur, 3)
                info['lufs'] = f_lufs if f_lufs is None or f_lufs > -60 else None
                info['tp'] = f_tp
                sounds[key] = info
            rows.append(row)

    # 4) informe
    print(f"{'clave':30} {'cat':7} {'dur':>6} {'→':>6} {'LUFS orig':>9} {'ganancia':>8}  final")
    for r in sorted(rows, key=lambda r: r['key']):
        fin = f"{r.get('lufs')} LUFS / {r.get('tp')} dBTP" if 'lufs' in r else ''
        flag = ' (tope de pico)' if r['capped'] else (' (por pico)' if r['mode'] == 'tp' else '')
        print(f"{r['key']:30} {r['cat']:7} {r['src_dur']:6.2f} {r['dur']:6.2f} {str(r['src_lufs']):>9} {r['gain_db']:+8.2f}  {fin}{flag}")
    print(f'\n{len(entries)} WAV · {len(rows)} sonidos distintos · {len(aliases)} alias · {len(renamed)} renombrados')
    if args.dry_run:
        return
    print(f'MP3: {total_bytes / 1e6:.2f} MB en disco · {total_dec / 1e6:.1f} MB decodificados si se cargaran todos a la vez')

    manifest = OrderedDict(
        version=1,
        description='Pack de sonidos de habilidades (fase 1). Clave lógica → archivo. Generado por tools/audio/build_skill_sfx.py; no editar a mano.',
        format=OrderedDict(codec='mp3', channels=1, sampleRate=SAMPLE_RATE, lame='VBR q' + MP3_QUALITY),
        loudness=OrderedDict(standard='EBU R128', targetsLUFS=TARGET_LUFS, truePeakCeil=TP_CEIL),
        classes=CLASSES, anims=ANIMS,
        sounds=OrderedDict(sorted(sounds.items())),
        aliases=OrderedDict(sorted(aliases.items())),
        renamedFrom=OrderedDict(sorted(renamed.items())),
    )
    (out / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print(f'Manifiesto: {out / "manifest.json"}')


def main():
    here = Path(__file__).resolve().parents[2]          # axie-tactics-web/
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--src', default=str(here / 'backups/2026-10-30_sounds/combat'), help='carpeta con los WAV del pack')
    ap.add_argument('--out', default=str(here / 'assets/sounds/sfx/skills'), help='carpeta de salida (MP3 + manifest.json)')
    ap.add_argument('--ffmpeg', default='ffmpeg')
    ap.add_argument('--ffprobe', default='ffprobe')
    ap.add_argument('--dry-run', action='store_true', help='solo analizar, sin escribir nada')
    args = ap.parse_args()
    if Path(args.src).resolve() == Path(args.out).resolve():
        sys.exit('--out no puede ser la misma carpeta que --src')
    build(args)


if __name__ == '__main__':
    main()
