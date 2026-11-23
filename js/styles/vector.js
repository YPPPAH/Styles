/* Style: flat vector. Nested Bézier flame tongues, flat fills, no outlines. */
(function (FL) {
  'use strict';
  const LAYERS = [[1, 0.34], [0.74, 0.56], [0.5, 0.78], [0.28, 0.97]]; // [tongue scale, palette position]
  FL.style({
    id: 'vector', name: 'Flat vector', tech: 'Bézier tongues · flat fills · 60 fps',
    note: 'Four nested flame shapes sway on travelling sine waves. Crisp at any size, so it suits icons, UI and motion graphics.',
    create(sc) {
      const sparks = new FL.Sparks(sc), smoke = new FL.Smoke(sc);
      return {
        draw(ctx, cw, ch, t, dt, P) {
          const f = FL.flick(t), k = cw / FL.W;
          sparks.step(dt, t, P); smoke.step(dt, t, P);
          ctx.setTransform(k, 0, 0, k, 0, 0);
          FL.fillShapes(ctx, sc.back, sc, P, f, 1, () => FL.stars(ctx, sc, t, 1.3));
          for (const p of smoke.list) { ctx.fillStyle = `rgba(150,152,170,${p.a * 0.2})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.2832); ctx.fill(); }
          ctx.save(); FL.clipTo(ctx, sc);
          for (const [kk, v] of LAYERS) {
            ctx.fillStyle = FL.rgb(P.pal.at(v));
            for (const tg of FL.tongues(sc, t, P, kk)) { FL.tonguePath(ctx, tg); ctx.fill(); }
          }
          ctx.restore();
          FL.fillShapes(ctx, sc.front, sc, P, f, 1);
          for (const p of sparks.list) {
            ctx.fillStyle = FL.rgb(P.pal.at(0.55 + 0.4 * p.k), Math.min(1, p.k * 2));
            ctx.beginPath(); ctx.arc(p.x, p.y, 0.8 + p.k * 0.9, 0, 6.2832); ctx.fill();
          }
          FL.glow(ctx, sc, P, f, 0.55);
        }
      };
    }
  });
})(window.FL);
