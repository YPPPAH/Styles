/* Style: ASCII terminal. The scene and the heat field are sampled on a character grid:
   72 x 32 on a large canvas, 40 x 18 on a thumbnail so the glyphs stay legible. */
(function (FL) {
  'use strict';
  const SCENE = ' ..:-=+*#%@', FLAME = " .'^!*%$#@";
  const FONT = '"IBM Plex Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace';
  FL.style({
    id: 'ascii', name: 'ASCII terminal', tech: 'Heat field · 72×32 characters · 10 fps',
    note: 'Each character cell samples the scene for brightness and the heat field for flame, then picks a glyph from a density ramp. Hot cells jitter between neighbouring glyphs so the fire sizzles. Pines are left blank: the dotted sky draws them.',
    create(sc) {
      const sparks = new FL.Sparks(sc, 18), smoke = new FL.Smoke(sc);
      let COLS = 0, ROWS = 0, N = 0, sx = 1, sy = 1, low = null, lx = null, starAt = {};
      let key = '', levels = null, out = null, ox = null, last = -1;

      function grid(cols) {
        COLS = cols; ROWS = Math.round(cols * 0.444); N = COLS * ROWS; sx = FL.W / COLS; sy = FL.H / ROWS;
        low = FL.canvas(COLS, ROWS); lx = low.getContext('2d', { willReadFrequently: true }); starAt = {};
        for (const s of sc.stars) starAt[(s[1] / sy | 0) * COLS + (s[0] / sx | 0)] = s[2];
        key = '';
      }
      function bake(P) { // three firelight levels x (back, front): one glyph and colour per cell
        levels = [0.12, 0.5, 0.9].map(f => [sc.back, sc.front].map(list => {
          lx.setTransform(1, 0, 0, 1, 0, 0); lx.clearRect(0, 0, COLS, ROWS); lx.setTransform(1 / sx, 0, 0, 1 / sy, 0, 0);
          FL.fillShapes(lx, list, sc, P, f, 1);
          const d = lx.getImageData(0, 0, COLS, ROWS).data, cells = new Array(N);
          for (let i = 0; i < N; i++) {
            if (d[i * 4 + 3] < 128) { cells[i] = null; continue; }
            const c = [d[i * 4], d[i * 4 + 1], d[i * 4 + 2]], l = FL.lum(c);
            const gi = l < 0.04 ? 0 : FL.clamp(Math.round(Math.pow(l, 1.2) * 2.2 * (SCENE.length - 1)), 1, SCENE.length - 1);
            const b = Math.min(0.8, 0.25 + l * 1.8) * 255 / Math.max(c[0], c[1], c[2], 1); // keep the hue, lift it for a black screen; flames stay brightest
            cells[i] = [SCENE[gi], FL.rgb([c[0] * b, c[1] * b, c[2] * b])];
          }
          return cells;
        }));
      }
      function render(step, cw, ch, P) {
        const tq = step / 10, f = FL.flick(tq), lv = levels[f < 0.4 ? 0 : f < 0.6 ? 1 : 2], cx = cw / COLS, cy = ch / ROWS;
        ox.fillStyle = '#08090b'; ox.fillRect(0, 0, cw, ch);
        ox.font = `${Math.max(4, Math.floor(cy * 0.98))}px ${FONT}`; ox.textAlign = 'center'; ox.textBaseline = 'middle';
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
          const i = r * COLS + c; let cell = lv[1][i];
          if (!cell) {
            const X = (c + 0.5) * sx, Y = (r + 0.5) * sy;
            let h = FL.inClip(sc, X, Y) ? FL.heat(sc, X, Y, tq, P) : 0;
            if (h > 0.1) {
              h = FL.clamp(h + (FL.hash2(i, step) - 0.5) * 0.14, 0.1, 1);
              cell = [FLAME[Math.round(h * (FLAME.length - 1))], FL.rgb(P.pal.at(0.3 + h * 0.7))];
            } else if (starAt[i] && FL.hash2(i, step >> 2) < 0.35 + 0.6 * starAt[i]) cell = [starAt[i] > 0.8 ? '+' : '.', 'rgb(205,218,255)'];
            else cell = lv[0][i];
          }
          if (cell && cell[0] !== ' ') { ox.fillStyle = cell[1]; ox.fillText(cell[0], (c + 0.5) * cx, (r + 0.5) * cy); }
        }
        for (const p of smoke.list) if (p.a > 0.25) {
          ox.fillStyle = `rgba(165,168,180,${p.a * 0.75})`;
          const n = p.r > 12 ? 1 : 0;
          for (let k = -n; k <= n; k++) ox.fillText('~', (Math.floor(p.x / sx) + k + 0.5) * cx, (Math.floor(p.y / sy) + 0.5) * cy);
        }
        for (const p of sparks.list) {
          ox.fillStyle = FL.rgb(P.pal.at(0.6 + 0.4 * p.k));
          ox.fillText(p.k > 0.5 ? '*' : '.', (Math.floor(p.x / sx) + 0.5) * cx, (Math.floor(p.y / sy) + 0.5) * cy);
        }
      }
      return {
        draw(ctx, cw, ch, t, dt, P) {
          sparks.step(dt, t, P); smoke.step(dt, t, P);
          const cols = cw < 520 ? 40 : 72; if (cols !== COLS) grid(cols);
          const k = P.pal.id + P.glow + Math.round(P.intensity * 4);
          if (k !== key) { key = k; bake(P); last = -1; }
          if (!out || out.width !== cw || out.height !== ch) { out = FL.canvas(cw, ch); ox = out.getContext('2d'); last = -1; }
          const step = Math.floor(t * 10);
          if (step !== last) { last = step; render(step, cw, ch, P); }
          ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(out, 0, 0);
        }
      };
    }
  });
})(window.FL);
