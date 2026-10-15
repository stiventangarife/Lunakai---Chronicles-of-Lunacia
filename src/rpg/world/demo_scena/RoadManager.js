import * as THREE from 'three';

/**
 * Gestor del camino principal y senderos.
 * Conecta Pradera -> Bosque -> Vado de Río -> Colina Mirador -> Formación Rocosa.
 */
export class RoadManager {
  constructor() {
    // 1. Camino Principal del Valle y la Costa:
    // Conecta Pradera -> Valle Central -> Vado del Río -> Ensenada y Playa hacia el Mar Abierto
    const coastPoints = [
      new THREE.Vector2(-95, 25),   // Inicio en Pradera del Valle
      new THREE.Vector2(-68, 5),    // Meandro entre colinas suaves
      new THREE.Vector2(-40, -18),  // Entrada al corredor central
      new THREE.Vector2(-10, -38),  // Paso de piedras y orilla del río
      new THREE.Vector2(12, -68),   // Apertura del cañón hacia el mar
      new THREE.Vector2(28, -105),  // Descenso a la playa costera
      new THREE.Vector2(38, -145),  // Mirador sobre el mar y arena dorada
      new THREE.Vector2(42, -185)   // Borde del mar con vista a la isla lejana
    ];

    // 2. Camino hacia los Riscos y el Promontorio Volado (Ladera Este)
    const cliffPoints = [
      new THREE.Vector2(-10, -38),  // Bifurcación en el río
      new THREE.Vector2(22, -22),   // Ladera este
      new THREE.Vector2(55, -35),   // Subida por las terrazas de roca
      new THREE.Vector2(85, -55),   // Repisa rocosa intermedia
      new THREE.Vector2(112, -75),  // Gran Promontorio / Mirador de los Riscos
      new THREE.Vector2(122, -95)   // Borde del acantilado sobre el océano
    ];

    // 3. Sendero hacia el Santuario Atia y Formación de Pilares Rocosos
    const shrinePoints = [
      new THREE.Vector2(22, -22),   // Empalme
      new THREE.Vector2(48, 15),    // Hacia el sur-este
      new THREE.Vector2(78, 48),    // Entre pilares de piedra
      new THREE.Vector2(108, 68),   // Santuario Atia
      new THREE.Vector2(125, 82)    // Riscos altos del santuario
    ];

    // 4. Sendero hacia el Gran Árbol y Claros del Bosque
    const elderPoints = [
      new THREE.Vector2(-68, 5),    // Empalme en la pradera
      new THREE.Vector2(-42, 22),   // Claros de flores
      new THREE.Vector2(-12, 12),   // Gran Árbol Sagrado
      new THREE.Vector2(18, 28)     // Conexión con el bosque sur
    ];

    this.mainCurve = new THREE.SplineCurve(coastPoints);
    this.forkCurve = new THREE.SplineCurve(cliffPoints);
    this.dojoCurve = new THREE.SplineCurve(shrinePoints);
    this.elderCurve = new THREE.SplineCurve(elderPoints);

    // Muestreo denso de puntos para cálculos de distancia ultra rápidos
    this.samplePoints = [];
    const divisionsMain = 240;
    for (let i = 0; i <= divisionsMain; i++) {
      this.samplePoints.push(this.mainCurve.getPoint(i / divisionsMain));
    }
    const divisionsFork = 140;
    for (let i = 0; i <= divisionsFork; i++) {
      this.samplePoints.push(this.forkCurve.getPoint(i / divisionsFork));
    }
    for (let i = 0; i <= 90; i++) {
      this.samplePoints.push(this.dojoCurve.getPoint(i / 90));
    }
    for (let i = 0; i <= 90; i++) {
      this.samplePoints.push(this.elderCurve.getPoint(i / 90));
    }

    this.roadWidth = 4.8; // Ancho base del camino en metros
  }

  /**
   * Obtiene la distancia mínima de un punto (x, z) al centro del camino
   */
  getDistance(x, z) {
    let minDistSq = Infinity;
    const p = new THREE.Vector2(x, z);

    for (let i = 0; i < this.samplePoints.length; i++) {
      const sp = this.samplePoints[i];
      const dx = p.x - sp.x;
      const dy = p.y - sp.y;
      const dSq = dx * dx + dy * dy;
      if (dSq < minDistSq) {
        minDistSq = dSq;
      }
    }

    return Math.sqrt(minDistSq);
  }

  /**
   * Devuelve un factor entre 0 (lejos del camino) y 1 (pleno centro del camino)
   * con una curva Hermite de transición amplia y suave para evitar bordes poligonales.
   */
  getRoadFactor(x, z) {
    const dist = this.getDistance(x, z);
    // Variación orgánica del ancho y bordes del sendero para evitar un trazado geométrico artificial
    const widthNoise = Math.sin(x * 0.08 + z * 0.06) * 0.55 + Math.cos(z * 0.14) * 0.35;
    const effWidth = Math.max(3.2, this.roadWidth + widthNoise);

    const innerR = effWidth * 0.40;
    const outerR = effWidth * 0.5 + 1.9;
    if (dist >= outerR) return 0;
    if (dist <= innerR) return 1;
    
    // Transición suave cúbica (Hermite smoothstep)
    const t = (dist - innerR) / (outerR - innerR);
    return 1.0 - (t * t * (3.0 - 2.0 * t));
  }
}
