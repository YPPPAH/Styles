/* Style: neon sign. Outlines only, drawn as glowing glass tubes. The flame does not flow:
   like a real animated sign it switches between three fixed sets of tubes, with the unlit sets left visible. */
(function (FL) {
  'use strict';
  const TUBE = {
    wood: [226, 96, 255], woodend: [240, 160, 255], mantel: [255, 122, 72], stone: [92, 212, 255], iron: [128, 150, 255],
    metal: [176, 204, 255], brick: [255, 84, 128], pebble: [150, 232, 255], pine: [52, 230, 160]
  };
  const PHASE = [0, 0.43, 0.87];
  function tube(ctx, c, a, w) { // soft halo, body, hot core
    ctx.strokeStyle = FL.rgb(c, 0.13 * a); ctx.lineWidth = 5.5 * w; ctx.stroke();
    ctx.strokeStyle = FL.rgb(c, 0.42 * a); ctx.lineWidth = 2.4 * w; ctx.stroke();
    ctx.strokeStyle = FL.rgb(FL.mix(c, [255, 255, 255], 0.55), a); ctx.lineWidth = 0.9 * w; ctx.stroke();
  }
  FL.style({
    id: 'neon', name: 'Neon sign', tech: 'Stroked tubes · additive glow · 3-frame cycle',
    note: 'Only outlines, bent like glass tubing and lit additively. The flame switches between three fixed tube sets five times a second, and the idle sets stay faintly visible. Smoke is left out: gas tubes do not smoke.',
    create(sc) {
      const sparks = new FL.Sparks(sc, 14);
      const all = sc.back.concat(sc.front).filter(sh => sh.d === 0 && TUBE[sh.m]);
      const embers = sc.back.concat(sc.front).filter(sh => sh.m === 'ember');
      return {
        draw(ctx, cw, ch, t, dt, P) {
          const k = cw / FL.W, f = FL.flick(t), fr = Math.floor(t * 5) % 3;
          sparks.step(dt, t, P);
          ctx.setTransform(k, 0, 0, k, 0, 0);
          const bg = ctx.createLinearGradient(0, 0, 0, FL.H); bg.addColorStop(0, '#07060f'); bg.addColorStop(1, '#0d0914');
          ctx.fillStyle = bg; ctx.fillRect(0, 0, FL.W, FL.H);
          FL.glow(ctx, sc, P, 0.5 + 0.2 * f, 0.5);
          ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
          FL.stars(ctx, sc, t, 1.2, [120, 220, 255]);
          all.forEach((sh, i) => {
            const buzz = FL.hash2(i, t * 14 | 0) < 0.006 ? 0.25 : 1;
            FL.path(ctx, sh); tube(ctx, TUBE[sh.m], (sh.m === 'pine' ? 0.4 : 0.55 + 0.45 * Math.min(1, sh.lit * 2)) * buzz, 1);
          });
          for (const sh of embers) { FL.path(ctx, sh); ctx.fillStyle = FL.rgb(P.pal.at(0.6), 0.5 + 0.3 * f); ctx.fill(); tube(ctx, P.pal.at(0.7), 0.8, 0.7); }
          ctx.save(); FL.clipTo(ctx, sc);
          for (let j = 0; j < 3; j++) { // idle tube sets: dark glass
            if (j === fr) continue;
            ctx.strokeStyle = 'rgba(150,160,190,0.1)'; ctx.lineWidth = 1;
            for (const tg of FL.tongues(sc, PHASE[j], P, 1)) if (tg.main) { FL.tonguePath(ctx, tg); ctx.stroke(); }
          }
          const on = FL.hash2(7, t * 20 | 0) < 0.03 ? 0.4 : 1; // the odd transformer stutter
          for (const [kk, v, w] of [[1, 0.5, 1.15], [0.58, 0.8, 0.9]]) {
            const c = P.pal.at(v);
            for (const tg of FL.tongues(sc, PHASE[fr], P, kk)) {
              if (kk < 1 && !(tg.main && tg.big)) continue; // one inner tube per big flame keeps the sign readable
              FL.tonguePath(ctx, tg); ctx.fillStyle = FL.rgb(c, 0.07 * on); ctx.fill(); tube(ctx, c, on, w);
            }
          }
          ctx.restore();
          for (const p of sparks.list) if ((t * 9 + p.ph | 0) % 2) {
            ctx.fillStyle = FL.rgb(P.pal.at(0.8), p.k); ctx.beginPath(); ctx.arc(p.x, p.y, 1.1, 0, 6.2832); ctx.fill();
          }
          ctx.restore();
        }
      };
    }
  });
})(window.FL);
