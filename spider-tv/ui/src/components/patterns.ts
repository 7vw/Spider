// Procedural, original background art. Everything is generated from geometry, so there are no
// third-party images to license and every theme scales cleanly to 4K.

/** Classic orb web: spokes from a centre with sagging spiral rings between them. */
export function orbWeb(cx: number, cy: number, radius: number, spokes = 18, rings = 13): string {
  const angles = Array.from({ length: spokes }, (_, i) => (i / spokes) * Math.PI * 2 + (i % 3) * 0.03);
  let d = '';
  for (const a of angles) d += `M${cx} ${cy}L${(cx + Math.cos(a) * radius).toFixed(1)} ${(cy + Math.sin(a) * radius).toFixed(1)}`;
  for (let r = 1; r <= rings; r++) {
    const rr = (radius * Math.pow(r / rings, 1.25)) | 0;
    for (let i = 0; i < spokes; i++) {
      const a1 = angles[i];
      const a2 = angles[(i + 1) % spokes] + (i === spokes - 1 ? Math.PI * 2 : 0);
      const x1 = cx + Math.cos(a1) * rr;
      const y1 = cy + Math.sin(a1) * rr;
      const x2 = cx + Math.cos(a2) * rr;
      const y2 = cy + Math.sin(a2) * rr;
      // Control point pulled toward the centre gives the characteristic sag.
      const am = (a1 + a2) / 2;
      const sag = rr * 0.86;
      const qx = cx + Math.cos(am) * sag;
      const qy = cy + Math.sin(am) * sag;
      d += `M${x1.toFixed(1)} ${y1.toFixed(1)}Q${qx.toFixed(1)} ${qy.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
    }
  }
  return d;
}

/** Deterministic PRNG so patterns are stable between renders. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

/** Organic tendrils for the Symbiote theme. */
export function veins(w: number, h: number, count = 22, seed = 7): string {
  const r = rng(seed);
  let d = '';
  for (let i = 0; i < count; i++) {
    let x = r() * w;
    let y = r() < 0.5 ? -20 : h + 20;
    const dir = y < 0 ? 1 : -1;
    d += `M${x.toFixed(0)} ${y.toFixed(0)}`;
    const steps = 4 + Math.floor(r() * 4);
    for (let s = 0; s < steps; s++) {
      const nx = x + (r() - 0.5) * 360;
      const ny = y + dir * (80 + r() * 160);
      const c1x = x + (r() - 0.5) * 260;
      const c1y = y + dir * r() * 120;
      d += `Q${c1x.toFixed(0)} ${c1y.toFixed(0)} ${nx.toFixed(0)} ${ny.toFixed(0)}`;
      x = nx;
      y = ny;
    }
  }
  return d;
}

/** Angular hex-web for Spider 2099. */
export function hexWeb(w: number, h: number, size = 120): string {
  let d = '';
  const hh = size * Math.sqrt(3) / 2;
  for (let row = -1; row * hh < h + hh; row++) {
    for (let col = -1; col * size * 1.5 < w + size; col++) {
      const cx = col * size * 1.5;
      const cy = row * hh * 2 + (col % 2 ? hh : 0);
      const pts = Array.from({ length: 6 }, (_, i) => {
        const a = (Math.PI / 3) * i;
        return `${(cx + Math.cos(a) * size * 0.5).toFixed(0)} ${(cy + Math.sin(a) * size * 0.5).toFixed(0)}`;
      });
      d += `M${pts.join('L')}Z`;
      if ((row + col) % 3 === 0) d += `M${cx} ${cy}L${(cx + size * 0.75).toFixed(0)} ${(cy + hh).toFixed(0)}`;
    }
  }
  return d;
}
