/* Style: flat vector. Fire: nested Bézier flame tongues. Water: flat ribbons with travelling strokes.
   Flat fills throughout, no outlines. */
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
    },
    water: {
      tech: 'Ribbon streaks · flat fills · 60 fps',
      note: 'Each stretch of water is one flat shape. Round-ended highlight strokes ride along it, foam is a cluster of white discs and mist is a few soft circles. Nothing is shaded, so the motion alone has to describe the surface.',
      create(sc) {
        const spray = new FL.Spray(sc), mist = new FL.Mist(sc);
        return {
          draw(ctx, cw, ch, t, dt, P) {
            const k = cw / FL.W;
            spray.step(dt, t, P); mist.step(dt, t, P);
            ctx.setTransform(k, 0, 0, k, 0, 0);
            FL.fillShapes(ctx, sc.back, sc, P, 0.5, 1);
            ctx.lineCap = 'round';
            for (const b of sc.water) { // far to near: fill the body, then its strokes, clipped to it
              const fall = b.kind === 'fall';
              ctx.save(); FL.path(ctx, b.shape); ctx.fillStyle = FL.rgb(P.pal.at(fall ? 0.57 : b.base + 0.04)); ctx.fill(); ctx.clip();
              for (const s of FL.streaks(sc, t, P, { body: b, min: 1.2 })) {
                ctx.strokeStyle = FL.rgb(P.pal.at(s.v)); ctx.lineWidth = Math.max(0.7, s.lane * (fall ? 0.5 : 0.3)); FL.strokePts(ctx, s.pts);
              }
              ctx.restore();
            }
            ctx.save(); FL.waterClip(ctx, sc);
            ctx.lineWidth = 0.9;
            for (const g of FL.rings(sc, t)) { ctx.strokeStyle = FL.rgb(P.pal.at(0.78), g.a * 0.9); ctx.beginPath(); ctx.ellipse(g.x, g.y, g.rx + 0.1, g.ry + 0.1, 0, 0, 6.2832); ctx.stroke(); }
            ctx.fillStyle = FL.rgb(P.pal.at(1));
            for (const f of FL.foams(sc, t, P)) { ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 6.2832); ctx.fill(); }
            ctx.restore();
            FL.fillShapes(ctx, sc.front, sc, P, 0.5, 1);
            for (const p of mist.list) { ctx.fillStyle = `rgba(255,255,255,${p.a * 0.3})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.2832); ctx.fill(); }
            ctx.fillStyle = FL.rgb(P.pal.at(0.96));
            for (const p of spray.list) { ctx.beginPath(); ctx.arc(p.x, p.y, 0.6 + p.k * 0.7, 0, 6.2832); ctx.fill(); }
          }
        };
      }
    }
  });
})(window.FL);
