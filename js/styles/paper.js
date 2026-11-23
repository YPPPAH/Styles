/* Style: paper cut-out. Matte sheets stacked with soft drop shadows and moved by hand,
   8 poses a second, like stop-motion. */
(function (FL) {
  'use strict';
  const LAYERS = [[1, 0.38], [0.7, 0.62], [0.42, 0.88]];
  const matte = c => FL.mix(c, [226, 214, 196], 0.14); // take the digital edge off every colour
  FL.style({
    id: 'paper', name: 'Paper cut-out', tech: 'Stacked sheets · drop shadows · 8 fps',
    note: 'Flat sheets of coloured paper with a shadow under each one. The flame is three cut shapes nudged to a new pose eight times a second, so it moves like stop-motion. Smoke is opaque card, not vapour.',
    create(sc) {
      const sparks = new FL.Sparks(sc, 18), smoke = new FL.Smoke(sc);
      let out = null, ox = null, last = '', grain = null;
      function sheet(x, k, on) { x.shadowColor = on ? 'rgba(0,0,0,0.42)' : 'rgba(0,0,0,0)'; x.shadowBlur = on ? 2.6 * k : 0; x.shadowOffsetY = on ? 1.5 * k : 0; x.shadowOffsetX = on ? 0.5 * k : 0; }
      function shapes(x, list, k, P) {
        for (const sh of list) {
          sheet(x, k, !sh.d && !sh.bg);
          x.fillStyle = FL.rgb(matte(FL.shade(sh, sc, P, 0.55))); FL.path(x, sh); x.fill();
        }
      }
      function render(step, cw, P) {
        const k = cw / FL.W, tq = step / 8;
        ox.setTransform(k, 0, 0, k, 0, 0);
        shapes(ox, sc.back, k, P);
        sheet(ox, k, false); FL.stars(ox, sc, tq, 1.6, [244, 232, 190]);
        sheet(ox, k, true);
        for (const p of smoke.list) { // each puff is one cut-out cloud: three overlapping discs
          const r = p.r * Math.min(1, p.a * 2.4); ox.fillStyle = '#b9b7c2'; ox.beginPath();
          for (const [dx, dy, k2] of [[-0.62, 0.16, 0.58], [0, -0.2, 0.74], [0.64, 0.14, 0.54]]) {
            ox.moveTo(p.x + r * (dx + k2), p.y + r * dy); ox.arc(p.x + r * dx, p.y + r * dy, r * k2, 0, 6.2832);
          }
          ox.fill();
        }
        ox.save(); FL.clipTo(ox, sc);
        LAYERS.forEach(([kk, v], li) => {
          ox.fillStyle = FL.rgb(matte(P.pal.at(v)));
          FL.tongues(sc, tq, P, kk).forEach((tg, i) => { // each sheet lands a little askew
            const e = tg.base, a = (FL.hash2(step * 13 + li * 7, i) - 0.5) * 0.09;
            ox.save(); ox.translate(e[0], e[1]); ox.rotate(a); ox.translate(-e[0], -e[1]);
            FL.tonguePath(ox, tg); ox.fill(); ox.restore();
          });
        });
        ox.restore();
        shapes(ox, sc.front, k, P);
        sheet(ox, k, true);
        for (const p of sparks.list) {
          ox.fillStyle = FL.rgb(matte(P.pal.at(0.55 + 0.4 * p.k)));
          ox.save(); ox.translate(p.x, p.y); ox.rotate(p.ph + step); ox.fillRect(-1.3, -1.3, 2.6, 2.6); ox.restore();
        }
        sheet(ox, k, false);
        FL.glow(ox, sc, P, FL.flick(tq), 0.4);
        ox.setTransform(1, 0, 0, 1, 0, 0); ox.globalCompositeOperation = 'multiply'; ox.fillStyle = grain;
        ox.fillRect(0, 0, out.width, out.height); ox.globalCompositeOperation = 'source-over';
      }
      return {
        draw(ctx, cw, ch, t, dt, P) {
          sparks.step(dt, t, P); smoke.step(dt, t, P);
          if (!out || out.width !== cw || out.height !== ch) {
            out = FL.canvas(cw, ch); ox = out.getContext('2d'); last = '';
            const g = FL.canvas(128, 128), gx = g.getContext('2d'), r = FL.rng(9); // paper fibre
            gx.fillStyle = '#fff'; gx.fillRect(0, 0, 128, 128);
            for (let i = 0; i < 1500; i++) { gx.fillStyle = `rgba(0,0,0,${0.03 + r() * 0.05})`; gx.fillRect(r() * 128, r() * 128, 1 + r() * 3, 1); }
            grain = ox.createPattern(g, 'repeat');
          }
          const step = Math.floor(t * 8), key = step + P.pal.id + P.glow + P.intensity + P.wind;
          if (key !== last) { last = key; render(step, cw, P); }
          ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(out, 0, 0);
        }
      };
    }
  });
})(window.FL);
