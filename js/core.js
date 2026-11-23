/* Style Lab — core: maths, noise, colour, flame palettes, the shared fire model and the
   registries that subjects (what is drawn) and styles (how it is drawn) plug into.
   The water model lives in water.js. Scene space is always 320 x 240 units, y down. */
(function (g) {
  'use strict';
  const FL = g.FL = { styles: [], subjects: [], W: 320, H: 240 };

  // ---------- maths ----------
  const clamp = FL.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = FL.lerp = (a, b, t) => a + (b - a) * t;
  const smooth = t => t * t * (3 - 2 * t);
  FL.rng = function (seed) { // mulberry32: deterministic scenes
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  function hash2(x, y) {
    let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  FL.hash2 = hash2;
  function noise2(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = smooth(x - xi), yf = smooth(y - yi);
    return lerp(lerp(hash2(xi, yi), hash2(xi + 1, yi), xf),
                lerp(hash2(xi, yi + 1), hash2(xi + 1, yi + 1), xf), yf);
  }
  const fbm2 = (x, y) => noise2(x, y) * 0.6 + noise2(x * 2.1 + 17.3, y * 2.1 + 9.1) * 0.3 +
                         noise2(x * 4.3 + 3.7, y * 4.3 + 41.2) * 0.1;
  const noise1 = x => noise2(x, 7.31);
  FL.noise1 = noise1; FL.noise2 = noise2; FL.fbm2 = fbm2;
  FL.bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => v / 16);

  // ---------- colour ----------
  const hex = FL.hex = h => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  FL.rgb = (c, a) => (a == null ? `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`
                                : `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`);
  const mix = FL.mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
  FL.mul = (c, k) => [Math.min(255, c[0] * k), Math.min(255, c[1] * k), Math.min(255, c[2] * k)];
  FL.lum = c => (c[0] * 0.299 + c[1] * 0.587 + c[2] * 0.114) / 255;

  // ---------- flame palettes: cool edge -> hot core ----------
  function palette(id, name, note, stops) {
    const cols = stops.map(hex), lut = new Uint8ClampedArray(768);
    for (let i = 0; i < 256; i++) {
      const f = i / 255 * (cols.length - 1), k = Math.min(cols.length - 2, f | 0);
      const c = mix(cols[k], cols[k + 1], f - k);
      lut[i * 3] = c[0]; lut[i * 3 + 1] = c[1]; lut[i * 3 + 2] = c[2];
    }
    const glow = mix(mix(cols[2], cols[3], 0.6), [255, 255, 255], 0.22);
    const gm = Math.max(glow[0], glow[1], glow[2]);
    return {
      id, name, note, stops: cols, lut, glow, light: [glow[0] / gm, glow[1] / gm, glow[2] / gm],
      at(v) { const i = clamp(v * 255 | 0, 0, 255) * 3; return [lut[i], lut[i + 1], lut[i + 2]]; }
    };
  }
  FL.palette = palette;
  FL.palettes = [
    palette('wood', 'Wood fire', 'Seasoned hardwood, roughly 600–1100 °C',
      ['#2a0500', '#a81905', '#ee5a0c', '#ffa51f', '#ffe270', '#fffbe0']),
    palette('gas', 'Gas blue', 'Premixed gas flame, roughly 1900 °C',
      ['#04103a', '#123fc4', '#2f86ff', '#7cc8ff', '#d9f4ff', '#ffffff']),
    palette('copper', 'Copper green', 'Copper salts thrown on the logs',
      ['#01200f', '#0a6e33', '#1fc060', '#8df07a', '#e2ffc0', '#fbfff0']),
    palette('violet', 'Potash violet', 'Potassium salts, a lilac flame',
      ['#1b0533', '#5e1aa8', '#a743f0', '#e58bff', '#ffd9ff', '#fff6ff'])
  ];

  // ---------- materials (lit, daylight-ish base colours) ----------
  const M = {
    sky: '#0c1230', pine: '#122822', ground: '#3a2e20', stone: '#827b72', wood: '#84512a',
    woodend: '#d6ab72', char: '#241a15', brick: '#9c4530', wall: '#5a5262', floor: '#5a3f2a',
    iron: '#2b2e36', firebox: '#140e0c', plaster: '#b9b2a8', metal: '#9a9fa8', rug: '#7a3646',
    pebble: '#c9c4ba', mantel: '#6a4528', ember: '#ff6a1a'
  };
  FL.mat = {}; for (const k in M) FL.mat[k] = hex(M[k]);

  // Colour of a shape under the current fire: ambient + flickering firelight.
  FL.shade = function (sh, sc, P, flick) {
    const b = FL.mat[sh.m] || FL.mat.stone, k = 1 + (sh.s || 0) * 0.22;
    if (sh.m === 'ember') return P.pal.at(clamp(0.45 + 0.3 * flick + (sh.s || 0) * 0.15, 0, 1));
    if (sh.m === 'sky') return [b[0] * k, b[1] * k, b[2] * k];
    const l = P.pal.light, a = sc.amb;
    const L = P.glow ? sh.lit * (0.7 + 0.6 * flick) * Math.min(1.3, 0.35 + P.intensity * 0.8) * 1.3 : 0;
    return [Math.min(255, b[0] * k * (a[0] + L * l[0])),
            Math.min(255, b[1] * k * (a[1] + L * l[1])),
            Math.min(255, b[2] * k * (a[2] + L * l[2]))];
  };
  FL.flick = t => noise1(t * 6.1) * 0.6 + noise1(t * 14.3 + 40) * 0.4;

  // ---------- shared fire model 1: a heat field (pixel, ASCII, low-poly, soft styles) ----------
  FL.heat = function (sc, x, y, t, P) {
    const em = sc.emitters; let inv = 1;
    for (let i = 0; i < em.length; i++) {
      const e = em[i];
      const h = e.h * P.intensity * (0.84 + 0.32 * noise1(t * 1.6 + i * 9.7));
      const s = (e.y - y) / h;
      if (s < -0.06 || s > 1.3) continue;
      const q = s < 0 ? 0 : s;
      const cx = e.x + P.wind * h * 0.6 * q * q + Math.sin(t * 2.6 + i * 2.1 + q * 3.2) * e.w * 0.12 * q;
      const u = (x - cx) / (e.w * 0.5 * (1 - 0.8 * Math.min(1, q)) * (0.7 + 0.3 * Math.min(1, q * 4)) + 0.001);
      if (u > 1.6 || u < -1.6) continue;
      const n = fbm2(x * 0.05 + i * 13.1, y * 0.04 + t * 2.2);
      let v = (1 - u * u) * (1.2 - 0.55 * q) + (n - 0.56) * (0.55 + 1.5 * q) - Math.max(0, s - 0.85) * 2;
      if (s < 0) v *= 1 + s / 0.06;
      if (v <= 0) continue;
      inv *= 1 - (v > 1 ? 1 : v);
    }
    return 1 - inv;
  };

  // ---------- shared fire model 2: flame tongues as outlines (vector, ink, neon, paper) ----------
  // Returns {pts:[[x,y]...], tip:index}. k scales the tongue towards its base: 1 = outer, ~0.45 = core.
  FL.tongue = function (e, seed, t, P, k, dx, hk) {
    const h = e.h * P.intensity * k * hk * (0.8 + 0.4 * noise1(t * 2.1 + seed * 5.3));
    const w = e.w * 0.5 * (0.5 + 0.5 * k) * (hk < 1 ? 0.6 : 1), N = 12, L = [], R = [];
    const bx = e.x + dx * e.w;
    for (let j = 0; j <= N; j++) {
      const s = j / N;
      const prof = Math.pow(1 - s, 0.8) * (0.62 + 0.38 * Math.sin(Math.PI * Math.min(1, s * 2.2) * 0.5 + 0));
      const cx = bx + P.wind * h * 0.55 * s * s + w * 0.55 * Math.pow(s, 1.3) * Math.sin(t * 3.1 + seed * 2.3 + s * 4);
      const wl = 1 + 0.2 * Math.sin(t * 5.2 - s * 7 + seed * 1.7), wr = 1 + 0.2 * Math.sin(t * 4.6 - s * 8 + seed * 2.9 + 1.3);
      const y = e.y - h * s;
      L.push([cx - w * prof * wl, y]); R.push([cx + w * prof * wr, y]);
    }
    L.pop(); const tip = R.pop();
    return { pts: L.concat([tip], R.reverse()), tip: L.length, base: [bx, e.y + w * 0.34] };
  };
  FL.tongues = function (sc, t, P, k) {
    const out = [];
    sc.emitters.forEach((e, i) => {
      const main = FL.tongue(e, i * 3 + 1, t, P, k, 0, 1); main.main = true; main.big = e.w > 26; out.push(main);
      if (e.w > 26) {
        out.push(FL.tongue(e, i * 3 + 2, t, P, k, -0.27, 0.62));
        out.push(FL.tongue(e, i * 3 + 3, t, P, k, 0.29, 0.7));
      }
    });
    return out;
  };
  FL.tonguePath = function (ctx, tg) { // smooth sides, sharp tip
    const p = tg.pts, n = p.length, ti = tg.tip;
    ctx.beginPath(); ctx.moveTo(p[0][0], p[0][1]);
    for (let i = 1; i < n - 1; i++) {
      if (i === ti) { ctx.lineTo(p[i][0], p[i][1]); continue; }
      if (i + 1 === ti) { ctx.quadraticCurveTo(p[i][0], p[i][1], p[ti][0], p[ti][1]); i++; continue; }
      ctx.quadraticCurveTo(p[i][0], p[i][1], (p[i][0] + p[i + 1][0]) / 2, (p[i][1] + p[i + 1][1]) / 2);
    }
    ctx.lineTo(p[n - 1][0], p[n - 1][1]);
    ctx.quadraticCurveTo(tg.base[0], tg.base[1], p[0][0], p[0][1]); ctx.closePath(); // rounded belly
  };

  // ---------- sparks and smoke, simulated once, drawn by each style in its own idiom ----------
  const inClip = (sc, x, y) => !sc.clip || (x > sc.clip.x && x < sc.clip.x + sc.clip.w && y > sc.clip.y && y < sc.clip.y + sc.clip.h);
  FL.inClip = inClip;
  FL.Sparks = function (sc, max) { this.sc = sc; this.max = max || 36; this.list = []; this.acc = 0; };
  FL.Sparks.prototype.step = function (dt, t, P) {
    const em = this.sc.emitters, L = this.list;
    this.acc = Math.min(2, this.acc + dt * 9 * P.intensity * (P.sparks ? this.sc.sparkRate : 0));
    while (this.acc >= 1 && L.length < this.max) {
      this.acc -= 1; const e = em[Math.random() * em.length | 0];
      L.push({ x: e.x + (Math.random() - 0.5) * e.w * 0.6, y: e.y - e.h * P.intensity * (0.15 + Math.random() * 0.5),
        vx: (Math.random() - 0.5) * 16, vy: -(22 + Math.random() * 46), life: 0, max: 0.7 + Math.random() * 1.7, ph: Math.random() * 6.28 });
    }
    for (let i = L.length - 1; i >= 0; i--) {
      const p = L[i]; p.life += dt;
      p.vx += (P.wind * 70 - p.vx) * dt * 0.9 + Math.sin(t * 7 + p.ph) * 34 * dt; p.vy += 7 * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.k = 1 - p.life / p.max;
      if (p.life > p.max || !inClip(this.sc, p.x, p.y)) L.splice(i, 1);
    }
  };
  FL.Smoke = function (sc) { this.sc = sc; this.list = []; this.acc = 0; };
  FL.Smoke.prototype.step = function (dt, t, P) {
    const L = this.list, e = this.sc.emitters[0];
    if (P.smoke && this.sc.smoke) this.acc += dt * 2.2;
    while (this.acc >= 1) {
      this.acc -= 1; const h = e.h * P.intensity;
      L.push({ x: e.x + P.wind * h * 0.4 + (Math.random() - 0.5) * 10, y: e.y - h * 0.82, r: 5 + Math.random() * 3,
        vx: (Math.random() - 0.5) * 6, vy: -(15 + Math.random() * 9), life: 0, max: 3 + Math.random() * 1.6, ph: Math.random() * 6.28 });
    }
    for (let i = L.length - 1; i >= 0; i--) {
      const p = L[i]; p.life += dt; p.vx += (P.wind * 34 - p.vx) * dt * 0.6;
      p.x += (p.vx + Math.sin(t * 1.3 + p.ph) * 5) * dt; p.y += p.vy * dt; p.r += dt * 5.5;
      const k = p.life / p.max; p.a = Math.sin(Math.PI * Math.min(1, k)) * (1 - k * 0.4);
      if (p.life > p.max || p.y < -30) L.splice(i, 1);
    }
  };

  // ---------- drawing helpers shared by several styles ----------
  FL.canvas = function (w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, w | 0); c.height = Math.max(1, h | 0); return c; };
  FL.path = function (ctx, sh) {
    const p = sh.p, n = p.length;
    ctx.beginPath();
    if (sh.sm && n > 2) {
      ctx.moveTo((p[n - 1][0] + p[0][0]) / 2, (p[n - 1][1] + p[0][1]) / 2);
      for (let i = 0; i < n; i++) { const a = p[i], b = p[(i + 1) % n]; ctx.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); }
    } else { ctx.moveTo(p[0][0], p[0][1]); for (let i = 1; i < n; i++) ctx.lineTo(p[i][0], p[i][1]); }
    ctx.closePath();
  };
  // afterSky (optional) runs once the sky is painted, so stars sit behind the tree line.
  FL.fillShapes = function (ctx, list, sc, P, flick, maxD, afterSky) {
    for (let i = 0; i < list.length; i++) {
      const sh = list[i]; if (sh.d > maxD) continue;
      ctx.fillStyle = FL.rgb(FL.shade(sh, sc, P, flick)); FL.path(ctx, sh); ctx.fill();
      if (afterSky && sh.m === 'sky') afterSky();
    }
  };
  FL.stars = function (ctx, sc, t, size, col) {
    for (const s of sc.stars) {
      ctx.fillStyle = FL.rgb(col || [225, 232, 255], s[2] * (0.5 + 0.5 * Math.sin(t * 1.7 + s[0] * 3.1)));
      ctx.fillRect(s[0], s[1], size, size);
    }
  };
  FL.clipTo = function (ctx, sc) { if (sc.clip) { ctx.beginPath(); ctx.rect(sc.clip.x, sc.clip.y, sc.clip.w, sc.clip.h); ctx.clip(); } };
  FL.glow = function (ctx, sc, P, flick, k) {
    if (!P.glow) return;
    const g = sc.glow, r = g.r * (0.85 + 0.25 * flick) * Math.min(1.25, 0.5 + P.intensity * 0.6), c = P.pal.glow;
    const gr = ctx.createRadialGradient(g.x, g.y, 0, g.x, g.y, r);
    gr.addColorStop(0, FL.rgb(c, 0.5 * k)); gr.addColorStop(0.4, FL.rgb(c, 0.18 * k)); gr.addColorStop(1, FL.rgb(c, 0));
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = gr;
    ctx.fillRect(g.x - r, g.y - r, r * 2, r * 2); ctx.restore();
  };

  // ---------- registries ----------
  const cache = {};
  FL.style = def => { FL.styles.push(def); return def; };
  FL.subject = def => { FL.subjects.push(def); return def; };
  FL.scene = function (id) {
    if (cache[id]) return cache[id];
    const def = FL.subjects.find(s => s.id === id), sc = def.build();
    sc.id = id; sc.kind = def.kind; sc.lab = def.lab || 'fire';
    for (const sh of sc.back.concat(sc.front)) {
      let x = 0, y = 0; for (const q of sh.p) { x += q[0]; y += q[1]; }
      sh.cx = x / sh.p.length; sh.cy = y / sh.p.length; sh.d = sh.d || 0;
      if (sh.bg == null) sh.bg = !sh.d && /^(sky|ground|floor|wall|plaster)$/.test(sh.m); // backdrop sheets
      if (sh.lit == null) sh.lit = sc.glow ? Math.pow(clamp(1 - Math.hypot(sh.cx - sc.glow.x, (sh.cy - sc.glow.y) * 1.3) / sc.glow.r, 0, 1), 1.3) : 0;
    }
    return (cache[id] = sc);
  };
})(window);
