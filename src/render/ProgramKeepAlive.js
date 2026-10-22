// ProgramKeepAlive.js — Que un shader no se borre solo porque se destruyó el último material que lo usaba.
//
// three.js comparte un programa (shader compilado) entre todos los materiales con la misma "receta" y
// lo BORRA cuando se destruye el último de ellos. Muchos efectos de combate (chispas, destellos,
// marcas en el suelo, estelas, casillas resaltadas...) crean sus materiales al lanzarse y los destruyen
// al terminar: si nadie más usa esa receta, el shader se borra y el siguiente lanzamiento lo vuelve a
// compilar (un tirón de decenas a cientos de ms en el fotograma del efecto).
//
// Aquí, justo antes de que un material se destruya, si es el último usuario de alguno de sus
// programas, se le suma un uso "de reserva" a ese programa: three no lo borra y el próximo material
// con la misma receta lo reutiliza al instante. El aspecto no cambia (es el mismo shader). Hay un tope
// de programas reservados para que la memoria no crezca sin límite.
//
// Nota: usa dos detalles internos de three r160 (`renderer.properties.get(material).programs` y
// `program.usedTimes`), estables en la versión que trae el proyecto (vendor/three.module.js).

import * as THREE from 'three';

/**
 * @param {THREE.WebGLRenderer} renderer el renderer principal (overworld y combate comparten el mismo)
 * @param {{ max?: number }} [opts] máximo de programas que se mantienen en reserva
 * @returns {{ pinned: Set<object> } | null}
 */
export function installProgramKeepAlive(renderer, { max = 256 } = {}) {
  if (!renderer || !renderer.properties) return null;
  if (renderer.__lkKeepAlive) return renderer.__lkKeepAlive;
  const props = renderer.properties;
  const pinned = new Set();
  const proto = THREE.Material.prototype;
  const original = proto.dispose;

  const pin = (program) => {
    if (!program || pinned.has(program) || pinned.size >= max) return;
    if (program.usedTimes === 1) { program.usedTimes++; pinned.add(program); }
  };

  proto.dispose = function lkDisposeKeepingPrograms() {
    try {
      // ShaderMaterial / RawShaderMaterial: su clave de programa incluye un identificador del código que
      // three renueva al destruirse el último material con ese código, así que el programa guardado no
      // se podría reutilizar nunca. Solo se guardan los de materiales normales (Basic, Standard, ...).
      // properties.get() crea una entrada vacía si el material nunca se dibujó: three la quita al destruirlo
      const st = this.isShaderMaterial ? null : props.get(this);
      if (st) {
        if (st.programs && typeof st.programs.forEach === 'function') st.programs.forEach(pin);
        else pin(st.currentProgram);
      }
    } catch (_) { /* nunca debe impedir destruir el material */ }
    return original.call(this);
  };

  const api = { pinned, max };
  renderer.__lkKeepAlive = api;
  return api;
}
