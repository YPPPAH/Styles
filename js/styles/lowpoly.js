/* Style: low-poly. A jittered triangle mesh; every facet takes one flat colour from the scene
   under its centre, and facets inside the heat field blend towards the flame ramp.
   The mesh is painted once; each frame only repaints facets that burn or catch firelight. */
(function (FL) {
  'use strict';
  const COLS = 32, ROWS = 24, RW = 160, RH = 120;
  FL.style({
    id: 'lowpoly', name: 'Low-poly', tech: 'Jittered mesh · 1,536 flat facets · 60 fps',
    note: 'The picture is rebuilt from flat triangles. Each facet samples the scene once and is tinted by the heat field at its centre, so the flame reads as shards of colour that flare and fade.',
    create(sc) {
      const r = FL.rng(3), cw0 = FL.W / COLS, ch0 = FL.H / ROWS, V = [], tris = [];
      for (let j = 0; j <= ROWS; j++) for (let i = 0; i <= COLS; i++) {
        const edge = i === 0 || j === 0 || i === COLS || j === ROWS;
        V.push([i * cw0 + (edge ? 0 : (r() - 0.5) * cw0 * 0.72), j * ch0 + (edge ? 0 : (r() - 0.5) * ch0 * 0.72)]);
      }
      function tri(a, b, c) {
        const cx = (a[0] + b[0] + c[0]) / 3, cy = (a[1] + b[1] + c[1]) / 3;
        const grow = q => { const dx = q[0] - cx, dy = q[1] - cy, l = Math.hypot(dx, dy) || 1; return [q[0] + dx / l * 0.5, q[1] + dy / l * 0.5]; }; // overlap hides seams
        tris.push({ p: [grow(a), grow(b), grow(c)], cx, cy, jit: 0.92 + r() * 0.16 });
      }
      for (let j = 0; j < ROWS; j++) for (let i = 0; i < COLS; i++) {
        const a = V[j * (COLS + 1) + i], b = V[j * (COLS + 1) + i + 1], c = V[(j + 1) * (COLS + 1) + i], d = V[(j + 1) * (COLS + 1) + i + 1];
        if ((i + j) & 1) { tri(a, b, c); tri(b, d, c); } else { tri(a, b, d); tri(a, d, c); }
      }
      const ref = FL.canvas(RW, RH), rx = ref.getContext('2d', { willReadFrequently: true });
      const sparks = new FL.Sparks(sc, 20), smoke = new FL.Smoke(sc);
      let key = '', stat = null, sx = null;
      function grab(list, f, P) {
        rx.setTransform(1, 0, 0, 1, 0, 0); rx.clearRect(0, 0, RW, RH); rx.setTransform(RW / FL.W, 0, 0, RH / FL.H, 0, 0);
        FL.fillShapes(rx, list, sc, P, f, 1); return rx.getImageData(0, 0, RW, RH).data;
      }
      function facet(ctx, T, c) {
        ctx.fillStyle = FL.rgb(FL.mul(c, T.jit)); const p = T.p;
        ctx.beginPath(); ctx.moveTo(p[0][0], p[0][1]); ctx.lineTo(p[1][0], p[1][1]); ctx.lineTo(p[2][0], p[2][1]); ctx.closePath(); ctx.fill();
      }
      function bake(P, cw, ch) { // dim and bright firelight per facet; facets under a front shape never burn
        const b0 = grab(sc.back, 0.1, P), b1 = grab(sc.back, 0.95, P), f0 = grab(sc.front, 0.1, P), f1 = grab(sc.front, 0.95, P);
        if (!stat || stat.width !== cw) { stat = FL.canvas(cw, ch); sx = stat.getContext('2d'); }
        sx.setTransform(cw / FL.W, 0, 0, cw / FL.W, 0, 0);
        for (const T of tris) {
          const i = (Math.min(RH - 1, T.cy * RH / FL.H | 0) * RW + Math.min(RW - 1, T.cx * RW / FL.W | 0)) * 4;
          T.front = f0[i + 3] > 128; const A = T.front ? f0 : b0, B = T.front ? f1 : b1;
          T.dim = [A[i], A[i + 1], A[i + 2]]; T.bright = [B[i], B[i + 1], B[i + 2]];
          T.dyn = Math.abs(FL.lum(T.bright) - FL.lum(T.dim)) > 0.025;
          facet(sx, T, FL.mix(T.dim, T.bright, 0.5));
        }
      }
      const kite = (ctx, x, y, s) => { ctx.beginPath(); ctx.moveTo(x, y - s * 1.5); ctx.lineTo(x + s, y); ctx.lineTo(x, y + s * 1.5); ctx.lineTo(x - s, y); ctx.closePath(); ctx.fill(); };
      return {
        draw(ctx, cw, ch, t, dt, P) {
          sparks.step(dt, t, P); smoke.step(dt, t, P);
          const k2 = cw + P.pal.id + P.glow + Math.round(P.intensity * 4);
          if (k2 !== key) { key = k2; bake(P, cw, ch); }
          const k = cw / FL.W, f = FL.flick(t);
          ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(stat, 0, 0);
          ctx.setTransform(k, 0, 0, k, 0, 0);
          let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
          for (const e of sc.emitters) {
            const h = e.h * P.intensity * 1.2, m = e.w * 0.9 + Math.abs(P.wind) * h * 0.7;
            x0 = Math.min(x0, e.x - m); x1 = Math.max(x1, e.x + m); y0 = Math.min(y0, e.y - h * 1.3); y1 = Math.max(y1, e.y + 4);
          }
          for (const T of tris) {
            let c = null;
            if (!T.front && T.cx > x0 && T.cx < x1 && T.cy > y0 && T.cy < y1 && FL.inClip(sc, T.cx, T.cy)) {
              const h = FL.heat(sc, T.cx, T.cy, t, P);
              if (h > 0.1) c = FL.mix(FL.mix(T.dim, T.bright, f), P.pal.at(0.22 + 0.78 * h), Math.min(1, h * 1.7));
            }
            if (!c && T.dyn) c = FL.mix(T.dim, T.bright, f);
            if (c) facet(ctx, T, c);
          }
          for (const s of sc.stars) { ctx.fillStyle = `rgba(220,230,255,${s[2] * (0.5 + 0.5 * Math.sin(t * 1.7 + s[0]))})`; kite(ctx, s[0], s[1], 0.9); }
          for (const p of smoke.list) { ctx.fillStyle = `rgba(150,154,172,${p.a * 0.22})`; kite(ctx, p.x, p.y, p.r * 0.8); }
          for (const p of sparks.list) { ctx.fillStyle = FL.rgb(P.pal.at(0.6 + 0.4 * p.k), Math.min(1, p.k * 2)); kite(ctx, p.x, p.y, 1.1 + p.k); }
          FL.glow(ctx, sc, P, f, 0.35);
        }
      };
    }
  });
})(window.FL);
