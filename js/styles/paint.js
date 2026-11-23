/* Style: gouache. The scene is baked once as flat colour plus thousands of short brush dabs.
   The flame is a swarm of opaque dabs that rise, cool and shrink; water is flat-brush strokes
   that slide along the current over a painted base. */
(function (FL) {
  'use strict';
  // Back and front layers as CPU canvases (baked once, never redrawn) plus the canvas weave.
  // under(x) may paint more flat colour into the back layer before the dabs go on.
  function bake(sc, cw, ch, P, under) {
    const k = cw / FL.W, ref = FL.canvas(160, 120), rx = ref.getContext('2d', { willReadFrequently: true });
    const layers = [sc.back, sc.front].map((list, li) => {
      const c = FL.canvas(cw, ch), x = c.getContext('2d', { willReadFrequently: true });
      x.setTransform(k, 0, 0, k, 0, 0); FL.fillShapes(x, list, sc, Object.assign({}, P, { intensity: 1 }), 0.55, 1);
      if (under && !li) under(x);
      rx.setTransform(1, 0, 0, 1, 0, 0); rx.clearRect(0, 0, 160, 120); rx.drawImage(c, 0, 0, 160, 120);
      const d = rx.getImageData(0, 0, 160, 120).data, q = FL.rng(77 + li);
      for (let i = 0, n = li ? 7000 : 2600; i < n; i++) { // a flat-brush dab takes the colour under its centre
        const px = q() * FL.W, py = q() * FL.H, j = ((py / 2 | 0) * 160 + (px / 2 | 0)) * 4;
        if (d[j + 3] < 200) continue;
        const v = 0.84 + q() * 0.32, len = li ? 2 + q() * 2.6 : 4 + q() * 6, wd = li ? 1.1 + q() * 1.2 : 1.6 + q() * 2;
        const a = -0.5 + (q() - 0.5) * 0.9, ca = Math.cos(a) * k, sa = Math.sin(a) * k;
        x.fillStyle = `rgba(${Math.min(255, d[j] * v) | 0},${Math.min(255, d[j + 1] * v) | 0},${Math.min(255, d[j + 2] * v) | 0},0.8)`;
        x.setTransform(ca, sa, -sa, ca, px * k, py * k); x.fillRect(-len, -wd, len * 2, wd * 2);
      }
      return c;
    });
    const g = FL.canvas(64, 64), gx = g.getContext('2d'), w = FL.rng(4); // canvas weave
    gx.fillStyle = '#fff'; gx.fillRect(0, 0, 64, 64);
    for (let i = 0; i < 64; i += 2) { gx.fillStyle = `rgba(0,0,0,${0.03 + w() * 0.05})`; gx.fillRect(i, 0, 1, 64); gx.fillRect(0, i, 64, 1); }
    return { layers, weave: layers[0].getContext('2d').createPattern(g, 'repeat') };
  }
  FL.style({
    id: 'paint', name: 'Gouache', tech: 'Brush-dab particles · baked impasto · 60 fps',
    note: 'No outlines and no gradients, only opaque strokes. Around a hundred flame dabs rise from the fuel, sorted so the hottest paint lands last, the way a painter works dark to light.',
    create(sc) {
      const sparks = new FL.Sparks(sc, 20), smoke = new FL.Smoke(sc), r = FL.rng(21), dabs = [];
      sc.emitters.forEach((e, ei) => {
        const n = Math.max(5, Math.round(e.w * e.h / 110));
        for (let i = 0; i < n; i++) dabs.push({ e, ei, life: r(), rate: 0.7 + r() * 0.7, off: r() + r() - 1, ph: r() * 6.28, sz: 0.75 + r() * 0.5, v: 0 });
      });
      let layers = null, key = '', weave = null;
      return {
        draw(ctx, cw, ch, t, dt, P) {
          sparks.step(dt, t, P); smoke.step(dt, t, P);
          const k2 = cw + P.pal.id + P.glow; // flame height never forces a repaint of the scenery
          if (k2 !== key) { key = k2; const b = bake(sc, cw, ch, P); layers = b.layers; weave = b.weave; }
          const k = cw / FL.W, f = FL.flick(t);
          ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(layers[0], 0, 0);
          ctx.setTransform(k, 0, 0, k, 0, 0);
          for (const p of smoke.list) { ctx.fillStyle = `rgba(158,160,176,${p.a * 0.3})`; ctx.beginPath(); ctx.ellipse(p.x, p.y, p.r, p.r * 0.7, p.ph, 0, 6.2832); ctx.fill(); }
          for (const d of dabs) {
            d.life += dt * d.rate;
            if (d.life > 1) { d.life -= 1; d.off = Math.random() + Math.random() - 1; d.sz = 0.75 + Math.random() * 0.5; }
            const e = d.e, s = d.life, h = e.h * P.intensity * (0.85 + 0.3 * FL.noise1(t * 1.6 + d.ei * 9.7));
            d.x = e.x + d.off * e.w * 0.5 * Math.pow(1 - s, 0.7) * (0.62 + 0.38 * Math.min(1, s * 4)) +
              P.wind * h * 0.55 * s * s + Math.sin(t * 2.8 + d.ph + s * 4) * e.w * 0.09 * s;
            d.y = e.y - s * h;
            d.v = FL.clamp(1.02 - s * 0.72 - Math.abs(d.off) * 0.3, 0.12, 1);
          }
          dabs.sort((a, b) => a.v - b.v);
          ctx.save(); FL.clipTo(ctx, sc);
          for (const d of dabs) {
            const sz = d.sz * (1 - 0.5 * d.life) * Math.max(3, d.e.w * 0.16);
            ctx.fillStyle = FL.rgb(P.pal.at(Math.round(d.v * 8) / 8), 0.92);
            ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(P.wind * 0.5 * d.life + Math.sin(d.ph) * 0.25);
            ctx.beginPath(); ctx.ellipse(0, 0, sz, sz * 2.1, 0, 0, 6.2832); ctx.fill(); ctx.restore();
          }
          ctx.restore();
          ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(layers[1], 0, 0);
          ctx.setTransform(k, 0, 0, k, 0, 0);
          for (const p of sparks.list) {
            ctx.fillStyle = FL.rgb(P.pal.at(0.6 + 0.4 * p.k), Math.min(1, p.k * 2));
            ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.atan2(p.vy, p.vx)); ctx.beginPath(); ctx.ellipse(0, 0, 2.2, 0.9, 0, 0, 6.2832); ctx.fill(); ctx.restore();
          }
          FL.glow(ctx, sc, P, f, 0.5);
          ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = weave;
          ctx.fillRect(0, 0, cw, ch); ctx.globalCompositeOperation = 'source-over';
        }
      };
    },
    water: {
      tech: 'Flat-brush strokes · baked impasto · 60 fps',
      note: 'The water gets a painted base like the rest of the scene, then loose flat-brush strokes slide over it along the current: mid-tones on a river, near-white on a fall. Foam is a few thick dabs of white, put on last.',
      create(sc) {
        const spray = new FL.Spray(sc, 40), mist = new FL.Mist(sc, 20);
        let B = null, key = '';
        const base = x => { for (const b of sc.water) { x.fillStyle = FL.rgb(B0.pal.at(b.kind === 'fall' ? 0.55 : b.base)); FL.path(x, b.shape); x.fill(); } };
        let B0 = null;
        return {
          draw(ctx, cw, ch, t, dt, P) {
            spray.step(dt, t, P); mist.step(dt, t, P);
            const k2 = cw + P.pal.id; // the flow never forces a repaint of the scenery
            if (k2 !== key) { key = k2; B0 = P; B = bake(sc, cw, ch, P, base); }
            const k = cw / FL.W;
            ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(B.layers[0], 0, 0);
            for (const b of sc.water) { // each stroke: a short row of flat-brush dabs laid along the current
              const fall = b.kind === 'fall';
              ctx.setTransform(k, 0, 0, k, 0, 0); ctx.save(); FL.path(ctx, b.shape); ctx.clip();
              for (const s of FL.streaks(sc, t, P, { body: b, min: 1.6, lanes: fall ? 0.7 : 0.9 })) {
                const p = s.pts, wd = Math.max(0.8, s.lane * (fall ? 0.36 : 0.27));
                for (let i = 1; i < p.length; i++) {
                  const dx = p[i][0] - p[i - 1][0], dy = p[i][1] - p[i - 1][1], l = Math.hypot(dx, dy) || 1, v = s.v + (FL.hash2(s.id, i) - 0.5) * 0.22;
                  ctx.fillStyle = FL.rgb(P.pal.at(Math.round(v * 8) / 8), 0.9);
                  ctx.setTransform(dx / l * k, dy / l * k, -dy / l * k, dx / l * k, (p[i][0] + p[i - 1][0]) / 2 * k, (p[i][1] + p[i - 1][1]) / 2 * k);
                  ctx.fillRect(-l * 0.62 - 0.6, -wd, l * 1.24 + 1.2, wd * 2);
                }
              }
              ctx.restore();
            }
            ctx.setTransform(k, 0, 0, k, 0, 0); ctx.save(); FL.waterClip(ctx, sc);
            ctx.lineWidth = 1.1;
            for (const g of FL.rings(sc, t)) { ctx.strokeStyle = FL.rgb(P.pal.at(0.75), g.a * 0.8); ctx.beginPath(); ctx.ellipse(g.x, g.y, g.rx + 0.1, g.ry + 0.1, 0, 0, 6.2832); ctx.stroke(); }
            FL.foams(sc, t, P).forEach((f, i) => { // thick white, slightly off-white underneath
              ctx.fillStyle = FL.rgb(P.pal.at(0.84), 0.95); ctx.beginPath(); ctx.ellipse(f.x + 0.6, f.y + 0.7, f.r, f.r * 0.66, FL.hash2(i, 3) * 3, 0, 6.2832); ctx.fill();
              ctx.fillStyle = FL.rgb(P.pal.at(1), 0.95); ctx.beginPath(); ctx.ellipse(f.x - 0.3, f.y - 0.4, f.r * 0.78, f.r * 0.5, FL.hash2(i, 3) * 3, 0, 6.2832); ctx.fill();
            });
            ctx.restore();
            ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(B.layers[1], 0, 0);
            ctx.setTransform(k, 0, 0, k, 0, 0);
            for (const p of mist.list) { ctx.fillStyle = `rgba(250,250,246,${p.a * 0.34})`; ctx.beginPath(); ctx.ellipse(p.x, p.y, p.r, p.r * 0.72, p.ph, 0, 6.2832); ctx.fill(); }
            ctx.fillStyle = 'rgba(255,255,255,0.95)';
            for (const p of spray.list) { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.atan2(p.vy, p.vx)); ctx.beginPath(); ctx.ellipse(0, 0, 1.7, 0.75, 0, 0, 6.2832); ctx.fill(); ctx.restore(); }
            ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = B.weave;
            ctx.fillRect(0, 0, cw, ch); ctx.globalCompositeOperation = 'source-over';
          }
        };
      }
    }
  });
})(window.FL);
