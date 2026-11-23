/* Style: neon sign. Outlines only, drawn as glowing glass tubes. Nothing flows: like a real
   animated sign, the flame switches between three fixed sets of tubes, and water is three sets of
   short tubes lit in turn so the light seems to run downstream. The unlit sets stay visible. */
(function (FL) {
  'use strict';
  const TUBE = {
    wood: [226, 96, 255], woodend: [240, 160, 255], mantel: [255, 122, 72], stone: [92, 212, 255], iron: [128, 150, 255],
    metal: [176, 204, 255], brick: [255, 84, 128], pebble: [150, 232, 255], pine: [52, 230, 160]
  };
  const PHASE = [0, 0.43, 0.87];
  // Daylight scenes get their own tube colours: warm rock, so the water keeps the blues to itself.
  const DAY = {
    fir: [52, 230, 160], leaf: [120, 240, 110], peak: [170, 150, 255], hill: [60, 200, 130], cliff: [255, 170, 120], stone: [255, 200, 140],
    mesa: [255, 110, 70], cloud: [235, 238, 255], cave: [150, 110, 210], reed: [200, 230, 90]
  };
  const DIM = { fir: 0.45, cloud: 0.5, peak: 0.6, hill: 0.5, cave: 0.5, reed: 0.5 };
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
    },
    water: {
      tech: 'Stroked tubes · additive glow · 3-frame chase',
      note: 'Outlines only, as bent glass tubing. Each stretch of water carries three sets of short tubes that light in turn, five times a second, so the glow appears to run downstream the way a chasing sign does. Every shape is backed with black board, which hides the tubes behind it. A sign has no mist.',
      create(sc) {
        const spray = new FL.Spray(sc, 16);
        const bodies = sc.water.map(b => { // three interleaved sets of dashes per lane, fixed once
          const fall = b.kind === 'fall', n = FL.clamp(Math.round(b.lanes * (fall ? 0.34 : 0.5)), 2, fall ? 14 : 5);
          const D = b.L / Math.max(1, Math.round(b.L / (fall ? 3.2 : 2.6))), sets = [[], [], []];
          for (let li = 0; li < n; li++) {
            const u = ((li + 0.5) / n * 2 - 1) * 0.82, off = FL.hash2(li, b.seed);
            for (let j = 0; j < 3; j++) for (let k = -1; (k + off + j / 3) * D < b.L; k++) {
              const a = Math.max(0, (k + off + j / 3) * D), e = Math.min(b.L, (k + off + j / 3 + 0.45) * D);
              if (e - a < D * 0.12) continue;
              const pts = [], m = Math.max(1, Math.ceil((e - a) / 0.4));
              for (let i = 0; i <= m; i++) { const q = a + (e - a) * i / m; pts.push(FL.wpos(b, q, u + (fall ? 0 : 0.5 / n * Math.sin(q * 2.6 + li)))); }
              if (pts[m >> 1][2] * 2 / n > 2.2) sets[j].push(pts); // far water is too narrow to bend tubing for
            }
          }
          return { b, sets, fall };
        });
        function shapes(ctx, list, t, base) { // board first, tube on top: nearer shapes hide the tubes behind them
          list.forEach((sh, i) => {
            if (sh.d || sh.m === 'zenith' || sh.m === 'day' || sh.m === 'haze' || sh.m === 'moss' || sh.m === 'trunk') return;
            const c = DAY[sh.m];
            FL.path(ctx, sh); ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = c ? FL.rgb(FL.mul(c, 0.06)) : '#0a0812'; ctx.fill();
            if (!c) return;
            ctx.globalCompositeOperation = 'lighter';
            tube(ctx, c, (DIM[sh.m] || 0.85) * (sh.s <= -2.4 ? 0.55 : 1) * (FL.hash2(base + i, t * 14 | 0) < 0.006 ? 0.25 : 1), 1);
          });
        }
        return {
          draw(ctx, cw, ch, t, dt, P) {
            const k = cw / FL.W, fr = Math.floor(t * 5) % 3, on = FL.hash2(7, t * 20 | 0) < 0.03 ? 0.4 : 1;
            spray.step(dt, t, P);
            ctx.setTransform(k, 0, 0, k, 0, 0);
            const bg = ctx.createLinearGradient(0, 0, 0, FL.H); bg.addColorStop(0, '#07060f'); bg.addColorStop(1, '#0d0914');
            ctx.fillStyle = bg; ctx.fillRect(0, 0, FL.W, FL.H);
            ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
            shapes(ctx, sc.back, t, 0);
            for (const w of bodies) {
              FL.path(ctx, w.b.shape); ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = FL.rgb(FL.mul(P.pal.at(0.3), 0.14)); ctx.fill();
              ctx.globalCompositeOperation = 'lighter'; tube(ctx, P.pal.at(0.42), 0.5, 0.8);
              for (let j = 0; j < 3; j++) {
                if (j === fr) continue; // idle sets: dark glass
                ctx.strokeStyle = 'rgba(150,170,200,0.1)'; ctx.lineWidth = 0.9;
                for (const pts of w.sets[j]) FL.strokePts(ctx, pts);
              }
              const c = P.pal.at(w.fall ? 0.84 : 0.66);
              for (const pts of w.sets[fr]) { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); tube(ctx, c, on, 0.95); }
            }
            ctx.globalCompositeOperation = 'lighter';
            if (P.foam) for (const f of sc.foam) { // froth: one white wave-tube that shifts with the chase
              const n = FL.clamp(Math.round(f.rx / 7), 1, 6), m = n * 8;
              ctx.beginPath();
              for (let i = 0; i <= m; i++) { const a = i / m * 2 - 1; ctx.lineTo(f.x + a * f.rx * 0.9, f.y + Math.sin(a * Math.PI * n + fr * 2.094) * Math.min(f.ry * 0.4, 3)); }
              tube(ctx, [255, 255, 255], 0.9 * on, 0.8);
            }
            for (const g of sc.rings) { // one ring lit at a time, growing
              const q = (fr + 1) / 3; ctx.beginPath(); ctx.ellipse(g.x, g.y, g.r * q * 0.8, g.r * q * 0.8 * g.q, 0, 0, 6.2832); tube(ctx, P.pal.at(0.76), 1 - fr * 0.28, 0.7);
            }
            shapes(ctx, sc.front, t, 900);
            ctx.globalCompositeOperation = 'lighter';
            for (const p of spray.list) if ((t * 9 + p.ph | 0) % 2) { ctx.fillStyle = `rgba(255,255,255,${p.k})`; ctx.beginPath(); ctx.arc(p.x, p.y, 1, 0, 6.2832); ctx.fill(); }
            ctx.restore();
          }
        };
      }
    }
  });
})(window.FL);
