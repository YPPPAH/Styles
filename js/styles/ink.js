/* Style: ink sketch. Pen outlines that are re-traced 8 times a second ("line boil"),
   with loose watercolour washes on bare paper. Sky and walls are left undrawn. */
(function (FL) {
  'use strict';
  const INK = [42, 36, 32], PAPER = '#efe7d6';
  const WASH = {
    pine: [86, 116, 102], ground: [186, 164, 132], floor: [190, 152, 116], stone: [158, 156, 158], wood: [180, 126, 82],
    woodend: [228, 198, 152], char: [78, 66, 62], brick: [200, 114, 92], iron: [92, 98, 116], firebox: [70, 60, 62],
    metal: [164, 172, 184], pebble: [204, 200, 192], mantel: [154, 108, 74]
  };
  const NOLINE = { ground: 1, floor: 1, char: 1, firebox: 1 };
  const jx = (seed, i, amp) => (FL.hash2(seed + i * 17, 3) - 0.5) * amp, jy = (seed, i, amp) => (FL.hash2(seed + i * 17, 11) - 0.5) * amp;
  const wob = (p, seed, amp) => p.map((q, i) => [q[0] + jx(seed, i, amp), q[1] + jy(seed, i, amp)]);

  FL.style({
    id: 'ink', name: 'Ink sketch', tech: 'Line boil · watercolour wash · 8 fps',
    note: 'Every outline is re-traced with fresh wobble eight times a second, the way hand-drawn animation shimmers. Washes sit slightly off their lines. Night is implied by the bare paper, not painted.',
    create(sc) {
      const sparks = new FL.Sparks(sc, 16), smoke = new FL.Smoke(sc);
      let out = null, ox = null, last = -1, grain = null;

      function shapes(x, list, step, P, base) {
        list.forEach((sh, i) => {
          const w = WASH[sh.m]; if (!w && sh.m !== 'ember') return;
          const seed = (base + i) * 31 + step * 101, s = { p: wob(sh.p, seed, sh.d ? 0.7 : 1.3), sm: sh.sm };
          if (sh.m === 'ember') { FL.path(x, s); x.fillStyle = FL.rgb(P.pal.at(0.6), 0.75); x.fill(); return; }
          if (!sh.d || sh.m !== 'brick') { // wash, nudged off the line; warmer near the fire
            const c = FL.mix(FL.mul(w, 1 + sh.s * 0.1), P.pal.glow, P.glow ? sh.lit * 0.4 : 0);
            x.save(); x.translate(1.1, 0.8); FL.path(x, s); x.fillStyle = FL.rgb(c, sh.d ? 0.35 : 0.6); x.fill(); x.restore();
          }
          if (NOLINE[sh.m] || (sh.d && FL.hash2(base + i, 5) < 0.35)) return;
          FL.path(x, s); x.strokeStyle = FL.rgb(INK, sh.m === 'pine' ? 0.4 : sh.d ? 0.45 : 0.85); x.lineWidth = sh.d ? 0.45 : 0.9; x.stroke();
        });
      }
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
            out = FL.canvas(cw, ch); ox = out.getContext('2d'); last = -1;
            const g = FL.canvas(96, 96), gx = g.getContext('2d'), r = FL.rng(5); // paper tooth
            for (let i = 0; i < 900; i++) { gx.fillStyle = r() < 0.5 ? 'rgba(90,70,40,0.07)' : 'rgba(255,255,255,0.12)'; gx.fillRect(r() * 96, r() * 96, 1 + r() * 2, 1); }
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
