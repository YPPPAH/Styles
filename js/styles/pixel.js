/* Styles: pixel art (32 colours) and LCD handheld (4 greens).
   The scene is baked at low resolution and snapped to a palette; the flame is the shared heat field
   cut into hard colour bands with an ordered dither, stepped at a low frame rate. */
(function (FL) {
  'use strict';
  // Pixel art works in colour ramps: every material owns four shades, dark to firelit.
  const RAMP = {
    sky: ['#171a33'], pine: ['#080c12', '#0f1c1c', '#1a3328', '#2a4c34'], ground: ['#12101a', '#2a1c22', '#5e3626', '#95592f'],
    stone: ['#2b2a3c', '#555061', '#8d8482', '#c9b9a0'], wood: ['#2c1b20', '#58301f', '#93562a', '#cf8a45'],
    woodend: ['#5b3a2b', '#9a693a', '#dba463', '#f6d79b'], char: ['#0c0a10', '#1a1216', '#2e1a18', '#4a241a'],
    brick: ['#33192a', '#66282a', '#a3422c', '#d66a36'], wall: ['#201d31', '#322c47', '#4c405a', '#6e566a'],
    floor: ['#1c1420', '#3d2424', '#6f402b', '#a56735'], iron: ['#0d0e17', '#1b1d2c', '#34384e', '#5b6079'],
    firebox: ['#07060b', '#150d11', '#2e1814', '#52291a'], plaster: ['#3f3a4c', '#6c6471', '#a39a90', '#d8cdb6'],
    metal: ['#2b2d3d', '#555a6e', '#8f94a1', '#c9cdd4'], pebble: ['#3c3947', '#6d6a73', '#a6a09b', '#ddd6c8'],
    mantel: ['#1f141a', '#40251f', '#704526', '#a56e39']
  };
  for (const k in RAMP) RAMP[k] = RAMP[k].map(FL.hex);
  const tinted = {};
  function rampColor(sh, sc, P, f) {
    if (sh.m === 'ember') return P.pal.at(FL.clamp(0.45 + 0.3 * f + sh.s * 0.15, 0, 1));
    const r = RAMP[sh.m] || RAMP.stone; if (r.length === 1) return r[0];
    // light level relative to the bare material; distant backdrop keeps one shade so the whole screen never strobes
    const v = FL.lum(FL.shade(sh, sc, P, sh.lit < 0.2 ? 0.5 : f)) / (FL.lum(FL.mat[sh.m]) + 0.001);
    const lv = v < 0.45 ? 0 : v < 0.75 ? 1 : v < 1.1 ? 2 : 3;
    if (lv < 2 || P.pal.id === 'wood') return r[lv];
    const key = sh.m + lv + P.pal.id, l = P.pal.light; // coloured fires tint the two lit shades
    return tinted[key] || (tinted[key] = FL.mix(r[lv], [Math.min(255, r[lv][0] * l[0] * 1.5), Math.min(255, r[lv][1] * l[1] * 1.5), Math.min(255, r[lv][2] * l[2] * 1.5)], 0.55).map(Math.round));
  }
  const LCD = ['#0f380f', '#306230', '#8bac0f', '#9bbc0f'].map(FL.hex);
  const BANDS = [[0.78, 1], [0.58, 0.85], [0.4, 0.68], [0.25, 0.5], [0, 0.32]]; // [heat threshold, palette position]

  function nearest(pal, r, g, b) {
    let best = pal[0], bd = 1e12;
    for (let i = 0; i < pal.length; i++) {
      const c = pal[i], d = (c[0] - r) * (c[0] - r) * 0.3 + (c[1] - g) * (c[1] - g) * 0.59 + (c[2] - b) * (c[2] - b) * 0.11;
      if (d < bd) { bd = d; best = c; }
    }
    return best;
  }

  function make(cfg) {
    FL.style({
      id: cfg.id, name: cfg.name, tech: cfg.tech, note: cfg.note, file: 'pixel.js',
      create(sc) {
        const lw = cfg.lw, lh = cfg.lh, sx = FL.W / lw, sy = FL.H / lh;
        const low = FL.canvas(lw, lh), lx = low.getContext('2d', { willReadFrequently: true });
        const img = lx.createImageData(lw, lh), D = img.data;
        const sparks = new FL.Sparks(sc, 24), smoke = new FL.Smoke(sc);
        let key = '', levels = null, last = -1, mid = null, mx = null;

        function bake(P) { // three firelight levels x (back, front), quantised once
          levels = [0.12, 0.5, 0.9].map(f => [sc.back, sc.front].map(list => {
            lx.setTransform(1, 0, 0, 1, 0, 0); lx.clearRect(0, 0, lw, lh); lx.setTransform(1 / sx, 0, 0, 1 / sy, 0, 0);
            const used = [], memo = new Map();
            for (const sh of list) {
              const c = cfg.color ? cfg.color(sh, sc, P, f) : FL.shade(sh, sc, P, f);
              if (cfg.color && !used.includes(c)) used.push(c);
              lx.fillStyle = FL.rgb(c); FL.path(lx, sh); lx.fill();
            }
            const d = lx.getImageData(0, 0, lw, lh).data, out = new Uint8ClampedArray(d.length);
            for (let i = 0, n = lw * lh; i < n; i++) { // snap every pixel (including soft edges) to an allowed colour
              if (d[i * 4 + 3] < 128) continue;
              const b = (i % lw & 3) + ((i / lw | 0) & 3) * 4, key = (d[i * 4] << 20 | d[i * 4 + 1] << 12 | d[i * 4 + 2] << 4 | b) >>> 0;
              let c = memo.get(key);
              if (!c) { c = cfg.quant(d[i * 4], d[i * 4 + 1], d[i * 4 + 2], FL.bayer[b], used); memo.set(key, c); }
              out[i * 4] = c[0]; out[i * 4 + 1] = c[1]; out[i * 4 + 2] = c[2]; out[i * 4 + 3] = 255;
            }
            return out;
          }));
        }
        function put(x, y, c) {
          x |= 0; y |= 0; if (x < 0 || y < 0 || x >= lw || y >= lh) return;
          const i = (y * lw + x) * 4; D[i] = c[0]; D[i + 1] = c[1]; D[i + 2] = c[2]; D[i + 3] = 255;
        }
        function frame(step, P) {
          const tq = step / cfg.fps, f = FL.flick(tq), lv = levels[f < 0.4 ? 0 : f < 0.6 ? 1 : 2];
          D.set(lv[0]);
          for (const s of sc.stars) if (FL.hash2(s[0] * 7, step >> 2) < 0.3 + 0.7 * s[2]) put(s[0] / sx, s[1] / sy, cfg.star);
          for (const p of smoke.list) {
            const r = p.r / sx, cx = p.x / sx, cy = p.y / sy;
            for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++)
              if ((x - cx) * (x - cx) + (y - cy) * (y - cy) < r * r && FL.bayer[(x & 3) + (y & 3) * 4] < p.a * 0.5) put(x, y, cfg.smoke);
          }
          let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
          for (const e of sc.emitters) {
            const h = e.h * P.intensity * 1.2, m = e.w * 0.9 + Math.abs(P.wind) * h * 0.7;
            x0 = Math.min(x0, e.x - m); x1 = Math.max(x1, e.x + m); y0 = Math.min(y0, e.y - h * 1.3); y1 = Math.max(y1, e.y + 3);
          }
          const px0 = Math.max(0, x0 / sx | 0), px1 = Math.min(lw - 1, x1 / sx | 0), py0 = Math.max(0, y0 / sy | 0), py1 = Math.min(lh - 1, y1 / sy | 0);
          for (let py = py0; py <= py1; py++) for (let px = px0; px <= px1; px++) {
            const X = (px + 0.5) * sx, Y = (py + 0.5) * sy; if (!FL.inClip(sc, X, Y)) continue;
            const h = FL.heat(sc, X, Y, tq, P) + (FL.bayer[(px & 3) + (py & 3) * 4] - 0.5) * 0.09;
            if (h >= 0.14) put(px, py, cfg.flame(h, P));
          }
          const fr = lv[1];
          for (let i = 0; i < fr.length; i += 4) if (fr[i + 3]) { D[i] = fr[i]; D[i + 1] = fr[i + 1]; D[i + 2] = fr[i + 2]; }
          for (const p of sparks.list) put(p.x / sx, p.y / sy, cfg.spark(p.k, P));
          lx.setTransform(1, 0, 0, 1, 0, 0); lx.putImageData(img, 0, 0);
        }
        return {
          draw(ctx, cw, ch, t, dt, P) {
            sparks.step(dt, t, P); smoke.step(dt, t, P);
            const k = P.pal.id + P.glow + Math.round(P.intensity * 4);
            if (k !== key) { key = k; bake(P); last = -1; }
            const step = Math.floor(t * cfg.fps);
            if (step !== last) { last = step; frame(step, P); }
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            const z = Math.max(1, Math.round(cw / lw)); // whole-number zoom first, so every pixel stays the same size
            if (lw * z === cw) { ctx.imageSmoothingEnabled = false; ctx.drawImage(low, 0, 0, cw, ch); }
            else {
              if (!mid || mid.width !== lw * z) { mid = FL.canvas(lw * z, lh * z); mx = mid.getContext('2d'); mx.imageSmoothingEnabled = false; }
              mx.drawImage(low, 0, 0, lw * z, lh * z); ctx.imageSmoothingEnabled = true; ctx.drawImage(mid, 0, 0, cw, ch);
            }
            if (cfg.grid) cfg.grid(ctx, cw, ch, lw, lh);
          }
        };
      }
    });
  }

  make({
    id: 'pixel', name: 'Pixel art', tech: 'Heat field · 160×120 · 4-shade ramps · 12 fps', lw: 160, lh: 120, fps: 12,
    note: 'A cellular heat field cut into five hard colour bands with an ordered dither. Every material owns a four-shade ramp, and firelight moves shapes up and down their ramp in three baked steps, the way a sprite sheet would.',
    color: rampColor, quant: (r, g, b, bay, used) => nearest(used, r, g, b),
    flame: (h, P) => { for (const [th, v] of BANDS) if (h >= th) return P.pal.at(v); },
    spark: (k, P) => P.pal.at(0.6 + 0.4 * k), star: [203, 219, 252], smoke: [105, 106, 106]
  });

  make({
    id: 'lcd', name: 'LCD handheld', tech: 'Heat field · 80×60 · 4 greens · 8 fps', lw: 80, lh: 60, fps: 8,
    note: 'The same heat field squeezed onto a four-shade pea-green screen. Flame colour is ignored here: only brightness survives, so shape and timing have to carry the fire.',
    quant: (r, g, b, bay) => LCD[FL.clamp(Math.floor(Math.min(0.999, FL.lum([r, g, b]) * 2.1) * 4 - 0.2 + (bay - 0.5) * 0.6), 0, 3)],
    flame: h => (h >= 0.55 ? LCD[3] : h >= 0.27 ? LCD[2] : LCD[0]), // darkest shade = keyline round the flame
    spark: () => LCD[3], star: LCD[2], smoke: LCD[1],
    grid(ctx, cw, ch, lw, lh) {
      const cs = cw / lw; if (cs < 3) return;
      const g = Math.max(1, cs * 0.09);
      ctx.fillStyle = 'rgba(15,56,15,0.3)';
      for (let i = 1; i < lw; i++) ctx.fillRect(Math.round(i * cs - g / 2), 0, g, ch);
      for (let j = 1; j < lh; j++) ctx.fillRect(0, Math.round(j * cs - g / 2), cw, g);
    }
  });
})(window.FL);
