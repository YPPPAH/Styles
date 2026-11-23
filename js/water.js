/* Style Lab — the shared water model, used by every art style in the Water section.
   A stretch of water is a RIBBON: a centre line with a half-width at each point. Rivers and falls
   are ribbons, a pool is an ellipse. Every body carries flow coordinates: s runs downstream and
   u runs bank to bank (-1..1). Styles read the water in one of two ways:
     FL.flow()     a brightness field (0 deep .. 1 foam) for pixel, LCD, ASCII, low-poly and gouache
     FL.streaks()  moving highlight strokes for vector, ink, paper and neon
   Foam, ripple rings, spray and mist are worked out once here and drawn by each style in its own idiom. */
(function (FL) {
  'use strict';
  const { clamp, lerp, noise1, noise2, fbm2, hash2 } = FL, TAU = 6.2832;
  const sstep = FL.sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

  // ---------- water palettes: deep -> open water -> light streak -> foam ----------
  FL.waters = [
    FL.palette('clear', 'Mountain clear', 'Snowmelt over granite, blue where it runs deep',
      ['#0b2a4a', '#1d5f8f', '#3f97c2', '#86cbe2', '#d5f1f6', '#ffffff']),
    FL.palette('glacial', 'Glacial melt', 'Rock flour in suspension turns it milky turquoise',
      ['#0d4a52', '#178a8c', '#3fc0b4', '#8fe3d2', '#dcf7ee', '#ffffff']),
    FL.palette('jungle', 'Jungle green', 'Slow, warm and full of algae',
      ['#0f2a12', '#2a5a24', '#4f8a3a', '#93bd62', '#dde9b4', '#fbfdf0']),
    FL.palette('peat', 'Peat brown', 'Stained by bog and leaf litter, the colour of tea',
      ['#2a1408', '#5c3214', '#96602a', '#c99a55', '#ecd6a4', '#fff9ea'])
  ];

  // ---------- daylight materials ----------
  const M = {
    zenith: '#5f9fdc', day: '#8fc4ea', haze: '#c4e2f3', cloud: '#f2f5f7', peak: '#8c9cb6', snow: '#eef3f7', hill: '#6a9a62', grass: '#86b454', fir: '#2f6240',
    leaf: '#5a9642', trunk: '#5c4433', cliff: '#8e867b', cave: '#33363a', moss: '#75953d', earth: '#7d6044', sand: '#dcc48e',
    mesa: '#c46f42', reed: '#a3a64e'
  };
  for (const k in M) FL.mat[k] = FL.hex(M[k]);

  // ---------- bodies of water ----------
  function spline(cp, n) { // Catmull-Rom through [x, y, halfWidth] control points
    if (n < 2) return cp.map(p => p.slice());
    const out = [], q = i => cp[clamp(i, 0, cp.length - 1)];
    for (let i = 0; i < cp.length - 1; i++) for (let j = 0; j < n; j++) {
      const t = j / n, a = q(i - 1), b = q(i), c = q(i + 1), d = q(i + 2), p = [];
      for (let k = 0; k < 3; k++) p.push(0.5 * (2 * b[k] + (c[k] - a[k]) * t + (2 * a[k] - 5 * b[k] + 4 * c[k] - d[k]) * t * t + (3 * b[k] - a[k] - 3 * c[k] + d[k]) * t * t * t));
      out.push(p);
    }
    out.push(cp[cp.length - 1].slice()); return out;
  }
  function finish(b, outline) { // same winding for every body, so one clip path can hold them all
    let area = 0, x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    outline.forEach((p, i) => {
      const q = outline[(i + 1) % outline.length]; area += p[0] * q[1] - q[0] * p[1];
      x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]);
    });
    b.shape = { p: area < 0 ? outline.reverse() : outline }; b.box = [x0, y0, x1, y1];
    b.seed = Math.abs(Math.round(x0 * 7 + y0 * 13 + b.L * 31)) % 89 + 1;
    return b;
  }
  // kind 'river': s counts in widths, so far water moves slowly on screen. kind 'fall': s counts in 12-unit steps.
  FL.ribbon = function (kind, cp, o) {
    const fall = kind === 'fall';
    const b = Object.assign({ kind, speed: fall ? 1.5 : 1, lanes: 6, freq: 1, rough: 0.2, base: fall ? 0.6 : 0.32, sub: 3, unit: fall ? 12 : 0 }, o);
    const p = b.pts = spline(cp, b.sub), n = p.length, left = [], right = [];
    b.s = [0]; b.nx = []; b.ny = [];
    for (let i = 0; i < n; i++) {
      p[i][2] = Math.max(0.6, p[i][2]);
      const a = p[Math.max(0, i - 1)], c = p[Math.min(n - 1, i + 1)], l = Math.hypot(c[0] - a[0], c[1] - a[1]) || 1;
      b.nx[i] = -(c[1] - a[1]) / l; b.ny[i] = (c[0] - a[0]) / l;
      if (i) b.s[i] = b.s[i - 1] + Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]) / (b.unit || Math.max(3, (p[i][2] + p[i - 1][2]) / 2));
      left.push([p[i][0] + b.nx[i] * p[i][2], p[i][1] + b.ny[i] * p[i][2]]);
      right.unshift([p[i][0] - b.nx[i] * p[i][2], p[i][1] - b.ny[i] * p[i][2]]);
    }
    b.L = b.s[n - 1];
    return finish(b, left.concat(right));
  };
  FL.pool = function (x, y, rx, ry, o) {
    const b = Object.assign({ kind: 'pool', x, y, rx, ry, speed: 0.22, lanes: Math.max(2, Math.round(ry / 3.4)), freq: 1, rough: 0, base: 0.3, unit: 12 }, o);
    const out = []; for (let i = 0; i < 24; i++) out.push([x + Math.cos(i / 24 * TAU) * rx, y + Math.sin(i / 24 * TAU) * ry]);
    b.L = 2 * rx / b.unit;
    return finish(b, out);
  };
  // flow coordinates -> scene point [x, y, local half-width]
  FL.wpos = function (b, s, u) {
    if (b.kind === 'pool') {
      const x = b.x - b.rx + s * b.unit, dx = (x - b.x) / b.rx, c = Math.sqrt(Math.max(0, 1 - dx * dx));
      return [x, b.y + u * b.ry * c, b.ry * c];
    }
    const S = b.s; let i = 1; while (i < S.length - 1 && S[i] < s) i++;
    const a = clamp((s - S[i - 1]) / (S[i] - S[i - 1] || 1), 0, 1), p = b.pts[i - 1], q = b.pts[i], w = lerp(p[2], q[2], a);
    return [lerp(p[0], q[0], a) + lerp(b.nx[i - 1], b.nx[i], a) * u * w, lerp(p[1], q[1], a) + lerp(b.ny[i - 1], b.ny[i], a) * u * w, w];
  };
  // scene point -> [s, u, half-width] in this body, or null outside it. The array is reused: read it at once.
  const R = [0, 0, 0];
  FL.wcoord = function (b, x, y) {
    if (b.kind === 'pool') {
      const dx = (x - b.x) / b.rx; if (dx <= -1 || dx >= 1) return null;
      const c = Math.sqrt(1 - dx * dx), u = (y - b.y) / (b.ry * c); if (u < -1 || u > 1) return null;
      R[0] = (x - b.x + b.rx) / b.unit; R[1] = u; R[2] = b.ry * c; return R;
    }
    const p = b.pts, n = p.length; let best = 1.03, found = false;
    for (let i = 1; i < n; i++) {
      const a = p[i - 1], c = p[i], ex = c[0] - a[0], ey = c[1] - a[1];
      let h = ((x - a[0]) * ex + (y - a[1]) * ey) / (ex * ex + ey * ey);
      if ((h < 0 && i === 1) || (h > 1 && i === n - 1)) continue; // both ends are cut square
      h = h < 0 ? 0 : h > 1 ? 1 : h;
      const dx = x - a[0] - ex * h, dy = y - a[1] - ey * h, w = a[2] + (c[2] - a[2]) * h, d = Math.hypot(dx, dy) / w;
      if (d < best) { best = d; found = true; R[0] = b.s[i - 1] + (b.s[i] - b.s[i - 1]) * h; R[1] = ex * dy - ey * dx >= 0 ? d : -d; R[2] = w; }
    }
    if (!found) return null;
    R[1] = clamp(R[1], -1, 1); return R;
  };
  // 160 x 120 lookup of which body covers each cell and its flow coordinates. Later bodies sit in front.
  FL.wmap = function (sc) {
    if (sc.wmap) return sc.wmap;
    const W = 160, H = 120, N = W * H;
    const m = sc.wmap = { w: W, h: H, id: new Uint8Array(N), s: new Float32Array(N), u: new Float32Array(N), hw: new Float32Array(N) };
    sc.water.forEach((b, bi) => {
      const i0 = Math.max(0, Math.floor(b.box[0] / 2) - 1), i1 = Math.min(W - 1, Math.ceil(b.box[2] / 2) + 1);
      const j0 = Math.max(0, Math.floor(b.box[1] / 2) - 1), j1 = Math.min(H - 1, Math.ceil(b.box[3] / 2) + 1);
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const r = FL.wcoord(b, i * 2 + 1, j * 2 + 1); if (!r) continue;
        const k = j * W + i; m.id[k] = bi + 1; m.s[k] = r[0]; m.u[k] = r[1]; m.hw[k] = r[2];
      }
    });
    return m;
  };

  // ---------- model 1: the brightness field ----------
  // 0 = deep, about 0.3 = open water, 0.65 = a light streak, 1 = foam. det < 1 gives coarse styles bolder lanes.
  function field(sc, b, s, u, hw, x, y, t, P, det) {
    const I = P.intensity, n = Math.max(2, Math.round(b.lanes * det)), fall = b.kind === 'fall', q = s / b.L;
    const lf = (u * 0.5 + 0.5 + (fall ? P.wind * 0.3 * q * q : 0)) * n + (noise1(s * 0.55 + b.seed) - 0.5) * (fall ? 0.5 : 0.9);
    const li = Math.floor(lf), c = Math.abs(lf - li - 0.5) * 2, h = hash2(li, b.seed); // c: 0 at the lane centre, 1 at its edge
    let v;
    if (fall) {
      const ph = Math.pow(q, 0.75) * b.L * b.freq * det * 0.9 - t * b.speed * (0.85 + 0.3 * h) + h * 40; // falling water speeds up: streaks stretch
      v = 0.46 + 0.36 * noise1(ph) + 0.2 * noise1(ph * 0.37 + h * 9) + 0.08 * (I - 1) - 0.16 * c * c;
      v = lerp(v, 0.4 + 0.12 * noise1(ph), clamp(1 - s / 1.1, 0, 1) * 0.85); // the glassy lip before the sheet breaks up
      if (P.foam) v = Math.max(v, 1 - (b.L - s) * 1.1);                      // churned white at the foot
    } else {
      const sp = b.speed * (1 - 0.4 * u * u) * (0.8 + 0.4 * h), ph = s * b.freq * det - t * sp + h * 40;
      const far = clamp((2 * hw / n - 0.9) / 1.6, 0, 1); // lanes thinner than a pixel melt into flat, sky-lit water
      const thr = 0.68 - 0.2 * b.rough - 0.1 * (I - 1) - 0.06 * Math.abs(P.wind);
      v = b.base + 0.1 * (1 - far) + 0.12 * (noise2(s * 0.3 + b.seed, u * 1.4) - 0.5);
      v = lerp(v, 0.64, sstep(thr, thr + 0.07, noise1(ph)) * sstep(0.85, 0.5, c) * far);
      if (b.rough > 0.25) { // broken water carries slower white patches
        const chop = noise2(s * 1.7 * det - t * sp * 0.55, u * 2.6 + b.seed);
        v = lerp(v, 0.92, sstep(0.62 - 0.14 * b.rough * I, 0.86, chop) * b.rough * far);
      }
    }
    for (const g of sc.rings) {
      const d = Math.hypot(x - g.x, (y - g.y) / g.q); if (d >= g.r) continue;
      const w = Math.sin(d * 0.8 - t * 4.5); if (w > 0.5) v += 0.34 * (1 - d / g.r) * (w - 0.5) * 2;
    }
    if (P.foam) for (const f of sc.foam) {
      const dx = (x - f.x) / f.rx, dy = (y - f.y) / f.ry, d = dx * dx + dy * dy; if (d >= 1) continue;
      const e = (1 - d) * f.k * (0.55 + 0.45 * I) + (fbm2(x * 0.16 - t * 0.5, y * 0.2 + t * 0.9) - 0.5) * 0.9;
      if (e > 0.2) v = Math.max(v, 0.66 + 0.34 * sstep(0.2, 0.55, e));
    }
    return clamp(v, 0, 1);
  }
  FL.flow = function (sc, x, y, t, P, det) { // -1 where there is no water
    const m = sc.wmap || FL.wmap(sc), i = x / 2 | 0, j = y / 2 | 0;
    if (i < 0 || j < 0 || i >= m.w || j >= m.h) return -1;
    const k = j * m.w + i, id = m.id[k]; if (!id) return -1;
    return field(sc, sc.water[id - 1], m.s[k], m.u[k], m.hw[k], x, y, t, P, det || 1);
  };

  // ---------- model 2: highlight strokes that travel downstream ----------
  // A pure function of time, so stepped styles can ask for any frame. o.body limits it to one body,
  // o.lanes scales the lane count, o.min drops strokes where a lane is narrower than this many units.
  FL.streaks = function (sc, t, P, o) {
    o = o || {}; const out = [], I = P.intensity;
    for (const b of (o.body ? [o.body] : sc.water)) {
      const fall = b.kind === 'fall', n = Math.max(1, Math.round(b.lanes * (o.lanes || 1))), D = (fall ? 2.4 : 3) / b.freq;
      const dens = clamp((fall ? 0.9 : b.kind === 'pool' ? 0.28 : 0.42 + 0.4 * b.rough) * (0.7 + 0.3 * I) + (fall ? 0 : 0.12 * Math.abs(P.wind)), 0.1, 1);
      const ext = fall ? Math.ceil(n * 0.3 * Math.abs(P.wind)) : 0; // wind slants a fall, so lanes enter from the windward side
      for (let li = -ext; li < n + ext; li++) {
        const h = hash2(li, b.seed), u0 = ((li + 0.5) / n * 2 - 1) * (fall ? 0.94 : 0.88);
        const off = t * b.speed * (fall ? 1 : 1 - 0.4 * u0 * u0) * (0.8 + 0.4 * h) + h * 40;
        for (let k = Math.floor(-off / D) - 1, k1 = Math.floor((b.L - off) / D) + 1; k <= k1; k++) {
          const r1 = hash2(k * 7 + li * 131, b.seed + 3); if (r1 > dens) continue;
          const r2 = hash2(k * 13 + li * 17, b.seed + 9), a0 = k * D + off + r2 * D * 0.4;
          const lo = Math.max(0, a0), hi = Math.min(b.L, a0 + D * (fall ? 0.35 + 0.5 * r2 : 0.2 + 0.45 * r2));
          if (hi - lo < D * 0.06) continue;
          const pts = [], m = Math.max(1, Math.ceil((hi - lo) / (fall ? 0.9 : 0.4)));
          for (let j = 0; j <= m; j++) {
            let s = lo + (hi - lo) * j / m, q = s / b.L;
            if (fall) { q = Math.pow(q, 1 / 0.75); s = q * b.L; }
            pts.push(FL.wpos(b, s, u0 - (fall ? P.wind * 0.6 * q * q : 0) + 0.45 / n * Math.sin(s * 1.9 + h * 9)));
          }
          const lane = pts[m >> 1][2] * 2 / n; if (lane < (o.min || 0)) continue;
          out.push({ pts, b, lane, v: fall ? 0.72 + 0.28 * r2 : 0.56 + 0.16 * r2 + 0.24 * b.rough * r1, id: k * 131 + li });
        }
      }
    }
    return out;
  };
  FL.strokePts = function (ctx, pts) { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.stroke(); };
  FL.waterClip = function (ctx, sc) { // clip to all the water at once
    ctx.beginPath();
    for (const b of sc.water) { const p = b.shape.p; ctx.moveTo(p[0][0], p[0][1]); for (let i = 1; i < p.length; i++) ctx.lineTo(p[i][0], p[i][1]); ctx.closePath(); }
    ctx.clip();
  };
  FL.foams = function (sc, t, P) { // scalloped foam as overlapping discs: [{x, y, r}]
    const out = []; if (!P.foam) return out;
    sc.foam.forEach((f, fi) => {
      const n = clamp(Math.round(f.rx / f.ry * 2.4), 4, 24), g = (0.8 + 0.2 * P.intensity) * Math.min(1.15, f.k);
      for (let i = 0; i < n; i++) { // spread along the long axis, thinner towards the ends
        const a = (i + 0.5) / n * 2 - 1, w = Math.sqrt(1 - a * a * 0.8);
        out.push({ x: f.x + a * f.rx * 0.92 + Math.sin(t * 1.3 + i * 2.1) * f.rx * 0.3 / n, y: f.y + (hash2(i, fi * 31 + 5) - 0.5) * f.ry * 0.9 * w,
          r: f.ry * w * (0.5 + 0.4 * noise1(t * 1.7 + i * 5.3 + fi * 11)) * g });
      }
    });
    return out;
  };
  FL.rings = function (sc, t) { // ripples spreading from where water lands: [{x, y, rx, ry, a}]
    const out = [];
    sc.rings.forEach((g, gi) => {
      for (let j = 0; j < 3; j++) { const p = (t * 0.45 + j / 3 + gi * 0.17) % 1; out.push({ x: g.x, y: g.y, rx: g.r * p, ry: g.r * p * g.q, a: (1 - p) * (1 - p) * Math.min(1, p * 6) }); }
    });
    return out;
  };

  // ---------- spray and mist ----------
  const pick = (list, r) => { for (const e of list) if ((r -= e.rate) <= 0) return e; return list[list.length - 1]; };
  const total = list => list.reduce((a, e) => a + e.rate, 0);
  FL.Spray = function (sc, max) { this.sc = sc; this.max = max || 60; this.list = []; this.acc = 0; this.rate = total(sc.spray); };
  FL.Spray.prototype.step = function (dt, t, P) {
    const L = this.list;
    if (P.spray && this.rate) this.acc = Math.min(4, this.acc + dt * this.rate * P.intensity);
    while (this.acc >= 1 && L.length < this.max) {
      this.acc -= 1; const e = pick(this.sc.spray, Math.random() * this.rate), a = Math.random() - 0.5;
      L.push({ x: e.x + a * e.w, y: e.y, y0: e.y + 3, vx: a * e.w * 1.5 + (Math.random() - 0.5) * 12, vy: -e.up * (0.45 + Math.random() * 0.75), life: 0, max: 0.5 + Math.random() * 0.7, ph: Math.random() * 6.28 });
    }
    for (let i = L.length - 1; i >= 0; i--) {
      const p = L[i]; p.life += dt; p.vy += 150 * dt; p.vx += (P.wind * 46 - p.vx) * dt * 0.9;
      p.x += p.vx * dt; p.y += p.vy * dt; p.k = 1 - p.life / p.max;
      if (p.life > p.max || (p.vy > 0 && p.y > p.y0)) L.splice(i, 1);
    }
  };
  FL.Mist = function (sc, max) { this.sc = sc; this.max = max || 26; this.list = []; this.acc = 0; this.rate = total(sc.mist); };
  FL.Mist.prototype.step = function (dt, t, P) {
    const L = this.list;
    if (P.mist && this.rate) this.acc = Math.min(3, this.acc + dt * this.rate * (0.45 + 0.55 * P.intensity));
    while (this.acc >= 1 && L.length < this.max) {
      this.acc -= 1; const e = pick(this.sc.mist, Math.random() * this.rate);
      L.push({ x: e.x + (Math.random() - 0.5) * e.w, y: e.y, r: e.r * (0.6 + Math.random() * 0.5), vx: (Math.random() - 0.5) * 5,
        vy: -e.rise * (0.6 + Math.random() * 0.8), life: 0, max: 2.6 + Math.random() * 2, ph: Math.random() * 6.28, a: 0 });
    }
    for (let i = L.length - 1; i >= 0; i--) {
      const p = L[i]; p.life += dt; p.vx += (P.wind * 38 - p.vx) * dt * 0.5;
      p.x += (p.vx + Math.sin(t * 0.9 + p.ph) * 4) * dt; p.y += p.vy * dt; p.r += dt * 4.5;
      const k = p.life / p.max; p.a = Math.sin(Math.PI * Math.min(1, k)) * (1 - k * 0.4);
      if (p.life > p.max) L.splice(i, 1);
    }
  };

  // ---------- kit for building daylight scenes (shared by the river and waterfall subjects) ----------
  const K = FL.kit = {};
  K.poly = (p, m, s, d) => ({ p, m, s: s || 0, d: d || 0, lit: 0 });
  K.rect = (x, y, w, h, m, s, d) => K.poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], m, s, d);
  K.ell = function (x, y, rx, ry, m, s, d) {
    const p = []; for (let i = 0; i < 12; i++) p.push([x + Math.cos(i / 12 * TAU) * rx, y + Math.sin(i / 12 * TAU) * ry]);
    const sh = K.poly(p, m, s, d); sh.sm = 1; return sh;
  };
  K.blob = function (rnd, x, y, rx, ry, m, s) { // a boulder: lumpy body, sunlit cap, shaded foot
    const p = [];
    for (let i = 0; i < 8; i++) { const a = (i + rnd() * 0.5) / 8 * TAU, k = 0.84 + rnd() * 0.3; p.push([x + Math.cos(a) * rx * k, y + Math.sin(a) * ry * k]); }
    const sh = K.poly(p, m, s); sh.sm = 1;
    return [sh, K.ell(x - rx * 0.16, y - ry * 0.34, rx * 0.56, ry * 0.3, m, (s || 0) + 1, 1), K.ell(x + rx * 0.1, y + ry * 0.52, rx * 0.62, ry * 0.2, m, (s || 0) - 1.5, 1)];
  };
  K.fir = function (dst, x, y, h, s) { // y is the foot of the tree
    const w = 5 + h * 0.2;
    dst.push(K.rect(x - h * 0.03, y - h * 0.16, h * 0.06, h * 0.16, 'trunk', -1.5, 1));
    for (let k = 0; k < 3; k++) { const ty = y - h + k * h * 0.27, tw = w * (0.42 + k * 0.29), th = h * 0.44; dst.push(K.poly([[x, ty], [x + tw, ty + th], [x - tw, ty + th]], 'fir', s)); }
  };
  K.tree = function (dst, x, y, h, s) { // a round broadleaf
    dst.push(K.rect(x - h * 0.04, y - h * 0.45, h * 0.08, h * 0.45, 'trunk', -1.5));
    dst.push(K.ell(x - h * 0.16, y - h * 0.56, h * 0.24, h * 0.2, 'leaf', s - 1.5), K.ell(x + h * 0.14, y - h * 0.6, h * 0.26, h * 0.22, 'leaf', s),
      K.ell(x - h * 0.02, y - h * 0.78, h * 0.25, h * 0.2, 'leaf', s), K.ell(x - h * 0.08, y - h * 0.86, h * 0.13, h * 0.09, 'leaf', s + 1, 1));
  };
  K.cloud = (dst, x, y, w) => { for (const [dx, dy, k] of [[-0.3, 0.1, 0.3], [0, -0.06, 0.38], [0.32, 0.1, 0.27]]) { const e = K.ell(x + dx * w, y + dy * w, k * w, k * w * 0.42, 'cloud', 0); e.bg = 1; dst.push(e); } };
  K.ridge = function (dst, rnd, y, amp, floor, m, s, step) { // a skyline from edge to edge, filled down to `floor`
    const p = [[0, floor], [0, y + rnd() * amp]];
    for (let x = step * (0.4 + rnd() * 0.4); x < 320; x += step * (0.6 + rnd() * 0.8)) p.push([x, y - rnd() * amp * (p.length & 1 ? 1 : 0.25)]);
    p.push([320, y + rnd() * amp], [320, floor]);
    const sh = K.poly(p, m, s); sh.bg = 1; dst.push(sh); return sh;
  };
  K.sky = function (sc, h) { // three flat bands, deepest overhead
    for (const [a, b, m] of [[0, 0.4, 'zenith'], [0.4, 0.75, 'day'], [0.75, 1, 'haze']]) { const r = K.rect(0, h * a, 320, h * (b - a) + 1, m, 0); r.bg = 1; sc.back.push(r); }
  };
  K.ground = (sc, y, m, s) => { const r = K.rect(0, y, 320, 240 - y, m, s); r.bg = 1; sc.back.push(r); };
  K.bank = function (b, extra, m, s) { // the water's outline pushed outward: a margin of gravel or mud
    const p = b.pts, left = [], right = [];
    p.forEach((q, i) => { const w = q[2] + extra * Math.min(1, 0.25 + q[2] / 14); left.push([q[0] + b.nx[i] * w, q[1] + b.ny[i] * w]); right.unshift([q[0] - b.nx[i] * w, q[1] - b.ny[i] * w]); });
    return K.poly(left.concat(right), m, s);
  };
  K.scene = () => ({ lab: 'water', back: [], front: [], water: [], foam: [], rings: [], spray: [], mist: [], stars: [], emitters: [],
    clip: null, glow: null, amb: [1, 1, 1], sound: { roar: 0.3, babble: 0.5 } });
  K.foam = (sc, x, y, rx, ry, k) => sc.foam.push({ x, y, rx, ry, k: k || 1 });
  // where falling water lands: foam, rings, spray and mist in one call, scaled by the width of the fall
  K.splash = function (sc, x, y, w, o) {
    o = o || {};
    K.foam(sc, x, y + 1, w * 1.9, Math.max(3, w * 0.5), 1.2);
    sc.rings.push({ x, y: y + 2, r: w * (o.ring || 4), q: 0.3 });
    sc.spray.push({ x, y: y - 1, w: w * 1.6, rate: (o.spray || 1) * w * 2.2, up: 22 + w * 1.6 });
    sc.mist.push({ x, y: y - 3, w: w * 2, rate: (o.mist || 1) * (0.8 + w * 0.16), rise: 7 + w * 0.3, r: 5 + w * 0.55 });
  };
})(window.FL);
