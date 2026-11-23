/* Style: ink sketch. Pen outlines that are re-traced 8 times a second ("line boil"),
   with loose watercolour washes on bare paper. Sky and walls are left undrawn; water is
   mostly bare paper too, described by pen strokes that follow the current. */
(function (FL) {
  'use strict';
  const INK = [42, 36, 32], PAPER = '#efe7d6';
  const WASH = {
    pine: [86, 116, 102], ground: [186, 164, 132], floor: [190, 152, 116], stone: [158, 156, 158], wood: [180, 126, 82],
    woodend: [228, 198, 152], char: [78, 66, 62], brick: [200, 114, 92], iron: [92, 98, 116], firebox: [70, 60, 62],
    metal: [164, 172, 184], pebble: [204, 200, 192], mantel: [154, 108, 74],
    zenith: [178, 204, 222], cloud: [246, 245, 240], peak: [156, 166, 188], snow: [240, 242, 244], hill: [134, 164, 128], grass: [158, 188, 118],
    fir: [80, 118, 92], leaf: [118, 162, 98], trunk: [124, 100, 82], cliff: [176, 168, 158], cave: [92, 92, 98], moss: [140, 164, 94],
    earth: [156, 130, 104], sand: [224, 208, 166], mesa: [212, 142, 104], reed: [172, 174, 100]
  };
  const NOLINE = { ground: 1, floor: 1, char: 1, firebox: 1, zenith: 1, grass: 1, earth: 1, sand: 1, hill: 1, moss: 1 };
  const jx = (seed, i, amp) => (FL.hash2(seed + i * 17, 3) - 0.5) * amp, jy = (seed, i, amp) => (FL.hash2(seed + i * 17, 11) - 0.5) * amp;
  const wob = (p, seed, amp) => p.map((q, i) => [q[0] + jx(seed, i, amp), q[1] + jy(seed, i, amp)]);

  function shapes(x, list, step, P, base, solid) { // solid: each sheet first blanks the paper under it, so nothing shows through
    list.forEach((sh, i) => {
      const w = WASH[sh.m]; if (!w && sh.m !== 'ember') return;
      const seed = (base + i) * 31 + step * 101, s = { p: wob(sh.p, seed, sh.d ? 0.7 : 1.3), sm: sh.sm };
      if (sh.m === 'ember') { FL.path(x, s); x.fillStyle = FL.rgb(P.pal.at(0.6), 0.75); x.fill(); return; }
      if (solid && !sh.d && !sh.bg) { FL.path(x, s); x.fillStyle = PAPER; x.fill(); }
      if (!sh.d || sh.m !== 'brick') { // wash, nudged off the line; warmer near the fire
        const c = FL.mix(FL.mul(w, 1 + sh.s * 0.1), P.pal.glow, P.glow ? sh.lit * 0.4 : 0);
        x.save(); x.translate(1.1, 0.8); FL.path(x, s); x.fillStyle = FL.rgb(c, sh.d ? 0.35 : 0.6); x.fill(); x.restore();
      }
      if (NOLINE[sh.m] || (sh.d && FL.hash2(base + i, 5) < 0.35)) return;
      FL.path(x, s); x.strokeStyle = FL.rgb(INK, sh.m === 'pine' || sh.m === 'fir' ? 0.4 : sh.d ? 0.45 : 0.85); x.lineWidth = sh.d ? 0.45 : 0.9; x.stroke();
    });
  }
  function tooth(ox) { // paper tooth, as a repeating pattern
    const g = FL.canvas(96, 96), gx = g.getContext('2d'), r = FL.rng(5);
    for (let i = 0; i < 900; i++) { gx.fillStyle = r() < 0.5 ? 'rgba(90,70,40,0.07)' : 'rgba(255,255,255,0.12)'; gx.fillRect(r() * 96, r() * 96, 1 + r() * 2, 1); }
    return ox.createPattern(g, 'repeat');
  }

  FL.style({
    id: 'ink', name: 'Ink sketch', tech: 'Line boil · watercolour wash · 8 fps',
    note: 'Every outline is re-traced with fresh wobble eight times a second, the way hand-drawn animation shimmers. Washes sit slightly off their lines. Night is implied by the bare paper, not painted.',
    create(sc) {
      const sparks = new FL.Sparks(sc, 16), smoke = new FL.Smoke(sc);
      let out = null, ox = null, last = -1, grain = null;

      function render(step, cw, P) {
        const k = cw / FL.W, tq = step / 8;
        ox.setTransform(1, 0, 0, 1, 0, 0); ox.fillStyle = PAPER; ox.fillRect(0, 0, out.width, out.height);
        ox.setTransform(k, 0, 0, k, 0, 0); ox.lineJoin = 'round'; ox.lineCap = 'round';
        if (P.glow) { // a warm wash around the fire instead of light
          const g = sc.glow, gr = ox.createRadialGradient(g.x, g.y, 4, g.x, g.y, g.r * 0.8);
          gr.addColorStop(0, FL.rgb(P.pal.glow, 0.3)); gr.addColorStop(1, FL.rgb(P.pal.glow, 0));
          ox.fillStyle = gr; ox.fillRect(0, 0, FL.W, FL.H);
        }
        for (const s of sc.stars) if (s[2] > 0.62) { // a few pen ticks for stars
          ox.strokeStyle = FL.rgb(INK, 0.5); ox.lineWidth = 0.5; ox.beginPath();
          ox.moveTo(s[0] - 1.4, s[1]); ox.lineTo(s[0] + 1.4, s[1]); ox.moveTo(s[0], s[1] - 1.4); ox.lineTo(s[0], s[1] + 1.4); ox.stroke();
        }
        shapes(ox, sc.back, step, P, 0);
        for (const p of smoke.list) { // scribbled curls
          ox.strokeStyle = FL.rgb(INK, p.a * 0.4); ox.lineWidth = 0.6; ox.beginPath();
          for (let a = 0; a < 8.5; a += 0.5) { const r = p.r * (0.35 + a / 13) + jx(step * 7 + (p.ph * 50 | 0), a * 2 | 0, 1.6); ox.lineTo(p.x + Math.cos(a + p.ph) * r, p.y + Math.sin(a + p.ph) * r * 0.8); }
          ox.stroke();
        }
        ox.save(); FL.clipTo(ox, sc);
        [[1, 0.45, 0.55, 1.1], [0.56, 0.74, 0.65, 0.7]].forEach(([kk, v, a, lw], li) => {
          FL.tongues(sc, tq, P, kk).forEach((tg, i) => {
            const seed = 9000 + li * 500 + i * 37 + step * 101;
            const w = { pts: wob(tg.pts, seed, 1.6), tip: tg.tip, base: tg.base };
            ox.save(); ox.translate(1.2, 0.9); FL.tonguePath(ox, w); ox.fillStyle = FL.rgb(P.pal.at(v), a); ox.fill(); ox.restore();
            FL.tonguePath(ox, w); ox.strokeStyle = FL.rgb(INK, 0.85); ox.lineWidth = lw; ox.stroke();
          });
        });
        ox.restore();
        shapes(ox, sc.front, step, P, 5000);
        for (const p of sparks.list) {
          ox.strokeStyle = FL.rgb(INK, 0.3 + 0.5 * p.k); ox.lineWidth = 0.7; ox.beginPath();
          ox.moveTo(p.x, p.y); ox.lineTo(p.x - p.vx * 0.05, p.y - p.vy * 0.05); ox.stroke();
          ox.fillStyle = FL.rgb(P.pal.at(0.6), 0.6 * p.k); ox.beginPath(); ox.arc(p.x + 0.8, p.y + 0.5, 1.5, 0, 6.2832); ox.fill();
        }
        ox.setTransform(1, 0, 0, 1, 0, 0); ox.globalAlpha = 0.5; ox.fillStyle = grain; ox.fillRect(0, 0, out.width, out.height); ox.globalAlpha = 1;
      }
      return {
        draw(ctx, cw, ch, t, dt, P) {
          sparks.step(dt, t, P); smoke.step(dt, t, P);
          if (!out || out.width !== cw || out.height !== ch) {
            out = FL.canvas(cw, ch); ox = out.getContext('2d'); last = -1; grain = tooth(ox);
          }
          const step = Math.floor(t * 8), key = step + P.pal.id + P.glow + P.intensity + P.wind;
          if (key !== last) { last = key; render(step, cw, P); }
          ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(out, 0, 0);
        }
      };
    },
    water: {
      tech: 'Line boil · flow strokes · watercolour wash · 8 fps',
      note: 'The water is nearly bare paper: one pale wash, then pen strokes that follow the current and are re-traced eight times a second. Froth is drawn as empty loops, the way a pen leaves white by going round it.',
      create(sc) {
        const spray = new FL.Spray(sc, 24), mist = new FL.Mist(sc, 14);
        let out = null, ox = null, last = '', grain = null;
        function render(step, cw, P) {
          const k = cw / FL.W, tq = step / 8;
          ox.setTransform(1, 0, 0, 1, 0, 0); ox.fillStyle = PAPER; ox.fillRect(0, 0, out.width, out.height);
          ox.setTransform(k, 0, 0, k, 0, 0); ox.lineJoin = 'round'; ox.lineCap = 'round';
          shapes(ox, sc.back, step, P, 0, true);
          sc.water.forEach((b, bi) => {
            const seed = 7000 + bi * 53 + step * 101, o = { p: wob(b.shape.p, seed, 1.1) }, fall = b.kind === 'fall';
            FL.path(ox, o); ox.fillStyle = PAPER; ox.fill(); // water hides what runs under it
            ox.save(); ox.translate(1.1, 0.8); FL.path(ox, o); ox.fillStyle = FL.rgb(FL.mix(P.pal.at(fall ? 0.7 : 0.48), [255, 255, 255], 0.2), fall ? 0.4 : 0.5); ox.fill(); ox.restore();
            ox.save(); FL.path(ox, b.shape); ox.clip();
            ox.lineWidth = 0.55; ox.strokeStyle = FL.rgb(INK, fall ? 0.55 : 0.45);
            for (const s of FL.streaks(sc, tq, P, { body: b, min: 1.6, lanes: fall ? 0.6 : 0.85 })) FL.strokePts(ox, wob(s.pts, seed + s.id * 7, 0.8));
            ox.restore();
            FL.path(ox, o); ox.strokeStyle = FL.rgb(INK, 0.8); ox.lineWidth = 0.85; ox.stroke();
          });
          ox.save(); FL.waterClip(ox, sc);
          ox.lineWidth = 0.5;
          for (const g of FL.rings(sc, tq)) { ox.strokeStyle = FL.rgb(INK, g.a * 0.6); ox.beginPath(); ox.ellipse(g.x, g.y, g.rx + 0.1, g.ry + 0.1, 0, 0, 6.2832); ox.stroke(); }
          FL.foams(sc, tq, P).forEach((f, i) => { // froth: white the pen has gone round
            const r = f.r * 0.85, n = 7, p = [];
            for (let j = 0; j < n; j++) p.push([f.x + Math.cos(j / n * 6.2832) * r, f.y + Math.sin(j / n * 6.2832) * r * 0.8]);
            const o = { p: wob(p, step * 101 + i * 13, r * 0.5), sm: 1 };
            FL.path(ox, o); ox.fillStyle = 'rgba(255,255,255,0.85)'; ox.fill(); ox.strokeStyle = FL.rgb(INK, 0.5); ox.stroke();
          });
          ox.restore();
          shapes(ox, sc.front, step, P, 5000, true);
          for (const p of mist.list) { // drifting spray as scribbled curls
            ox.strokeStyle = FL.rgb(INK, p.a * 0.3); ox.lineWidth = 0.5; ox.beginPath();
            for (let a = 0; a < 8.5; a += 0.5) { const r = p.r * (0.35 + a / 13) + jx(step * 7 + (p.ph * 50 | 0), a * 2 | 0, 1.6); ox.lineTo(p.x + Math.cos(a + p.ph) * r, p.y + Math.sin(a + p.ph) * r * 0.8); }
            ox.stroke();
          }
          ox.strokeStyle = FL.rgb(INK, 0.6); ox.lineWidth = 0.6;
          for (const p of spray.list) { ox.beginPath(); ox.moveTo(p.x, p.y); ox.lineTo(p.x - p.vx * 0.035, p.y - p.vy * 0.035); ox.stroke(); }
          ox.setTransform(1, 0, 0, 1, 0, 0); ox.globalAlpha = 0.5; ox.fillStyle = grain; ox.fillRect(0, 0, out.width, out.height); ox.globalAlpha = 1;
        }
        return {
          draw(ctx, cw, ch, t, dt, P) {
            spray.step(dt, t, P); mist.step(dt, t, P);
            if (!out || out.width !== cw || out.height !== ch) { out = FL.canvas(cw, ch); ox = out.getContext('2d'); last = ''; grain = tooth(ox); }
            const step = Math.floor(t * 8), key = step + P.pal.id + P.intensity + P.wind + P.foam;
            if (key !== last) { last = key; render(step, cw, P); }
            ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(out, 0, 0);
          }
        };
      }
    }
  });
})(window.FL);
