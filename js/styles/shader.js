/* Style: GLSL shader. One shared WebGL context renders for every canvas on the page: domain-warped
   fbm flames for fire, ribbon flow coordinates for water. The result is composited into each 2D
   canvas with a blurred bloom pass. Falls back to the CPU fields (blurred by upscaling) without WebGL. */
(function (FL) {
  'use strict';
  const GW = 800, GH = 600, MAXE = 12, MAXS = 26, MAXB = 8, MAXF = 14, MAXR = 3;
  const FS = `precision highp float;
uniform vec2 uRes; uniform float uT, uWind, uInt, uN; uniform vec4 uEm[${MAXE}]; uniform vec3 uPal[6]; uniform vec4 uClip;
float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1., 0.)), f.x), mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), f.x), f.y); }
float fbm(vec2 p){ float a = .5, s = 0.; for (int i = 0; i < 5; i++) { s += a * noise(p); p = p * 2.03 + vec2(11.7, 3.1); a *= .5; } return s; }
vec3 ramp(float v){ v = clamp(v, 0., 1.) * 5.; float i = min(floor(v), 4.); vec3 a = uPal[0], b = uPal[1];
  for (int k = 0; k < 5; k++) { if (float(k) == i) { a = uPal[k]; b = uPal[k + 1]; } } return mix(a, b, v - i); }
void main(){
  vec2 p = vec2(gl_FragCoord.x / uRes.x * 320., (1. - gl_FragCoord.y / uRes.y) * 240.);
  float inv = 1.;
  for (int i = 0; i < ${MAXE}; i++) {
    if (float(i) >= uN) break;
    vec4 e = uEm[i]; float fi = float(i);
    float h = e.w * uInt * (.86 + .28 * noise(vec2(uT * 1.6 + fi * 9.7, 7.31)));
    float s = (e.y - p.y) / h; if (s < -.06 || s > 1.3) continue;
    float q = max(s, 0.);
    float cx = e.x + uWind * h * .6 * q * q + sin(uT * 2.6 + fi * 2.1 + q * 3.2) * e.z * .12 * q;
    float u = (p.x - cx) / (e.z * .5 * (1. - .8 * min(1., q)) * (.7 + .3 * min(1., q * 4.)) + .001);
    if (abs(u) > 1.7) continue; // far from this flame: skip the noise
    vec2 np = vec2(p.x * .05 + fi * 13.1, p.y * .04 + uT * 2.2);
    float n = fbm(np + .7 * vec2(fbm(np * 1.7 + 3.1), fbm(np * 1.7 + 9.2)));
    float v = (1. - u * u) * (1.2 - .55 * q) + (n - .5) * (.6 + 1.7 * q) - max(0., s - .85) * 2.;
    if (s < 0.) v *= 1. + s / .06;
    inv *= 1. - clamp(v, 0., 1.);
  }
  float heat = 1. - inv;
  if (uClip.z > 0. && (p.x < uClip.x || p.x > uClip.x + uClip.z || p.y < uClip.y || p.y > uClip.y + uClip.w)) heat = 0.;
  float a = smoothstep(.05, .45, heat);
  gl_FragColor = vec4(ramp(.15 + heat * .9) * a, a);
}`;
  // Water: find the body this pixel belongs to and its flow coordinates (s downstream, u bank to bank),
  // then read the same field as FL.flow() in water.js, only smooth.
  // uA: x0 y0 x1 y1 (pool: cx cy rx ry) · uB: w0+1000*body, w1 (pool: -1), s0, s1 (negative on a body's last segment)
  // uP: speed lanes rough base · uQ: length seed kind freq · uF: foam patches · uR: ripple rings
  const WS = `precision highp float;
uniform vec2 uRes; uniform float uT, uWind, uInt, uFoam, uN, uNF, uNR; uniform vec3 uPal[6];
uniform vec4 uA[${MAXS}], uB[${MAXS}], uP[${MAXB}], uQ[${MAXB}], uF[${MAXF}], uR[${MAXR}]; uniform float uFk[${MAXF}];
float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1., 0.)), f.x), mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), f.x), f.y); }
float n1(float x){ return noise(vec2(x, 7.31)); }
float fbm(vec2 p){ return noise(p) * .6 + noise(p * 2.1 + vec2(17.3, 9.1)) * .3 + noise(p * 4.3 + vec2(3.7, 41.2)) * .1; }
vec3 ramp(float v){ v = clamp(v, 0., 1.) * 5.; float i = min(floor(v), 4.); vec3 a = uPal[0], b = uPal[1];
  for (int k = 0; k < 5; k++) { if (float(k) == i) { a = uPal[k]; b = uPal[k + 1]; } } return mix(a, b, v - i); }
void main(){
  vec2 p = vec2(gl_FragCoord.x / uRes.x * 320., (1. - gl_FragCoord.y / uRes.y) * 240.);
  float best = 9., s = 0., u = 0., hw = 1., bi = -1.;
  for (int i = 0; i < ${MAXS}; i++) {
    if (float(i) >= uN) break;
    vec4 A = uA[i], B = uB[i]; float b = floor(B.x / 1000.), r, ss, uu, ww;
    if (B.y < 0.) {
      vec2 d = (p - A.xy) / A.zw; if (abs(d.x) >= 1.) continue;
      float c = sqrt(1. - d.x * d.x); uu = d.y / c; if (abs(uu) > 1.) continue;
      r = abs(uu); ss = (p.x - A.x + A.z) / 12.; ww = A.w * c;
    } else {
      vec2 e = A.zw - A.xy, q = p - A.xy; float h = dot(q, e) / dot(e, e);
      if ((h < 0. && B.z == 0.) || (h > 1. && B.w < 0.)) continue;
      h = clamp(h, 0., 1.); vec2 o = q - e * h; ww = mix(B.x - b * 1000., B.y, h); r = length(o) / ww; if (r > 1.) continue;
      ss = mix(B.z, abs(B.w), h); uu = e.x * o.y - e.y * o.x >= 0. ? r : -r;
    }
    if (b != bi || r < best) { bi = b; best = r; s = ss; u = uu; hw = ww; } // later bodies sit in front
  }
  if (bi < 0.) { gl_FragColor = vec4(0.); return; }
  vec4 P = uP[0], Q = uQ[0];
  for (int k = 0; k < ${MAXB}; k++) { if (float(k) == bi) { P = uP[k]; Q = uQ[k]; } }
  float lanes = P.y, rough = P.z, L = Q.x, seed = Q.y, fall = Q.z > .5 && Q.z < 1.5 ? 1. : 0., q = s / L, v;
  float lf = (u * .5 + .5 + fall * uWind * .3 * q * q) * lanes + (n1(s * .55 + seed) - .5) * mix(.9, .5, fall);
  float li = floor(lf), c = abs(lf - li - .5) * 2., h = hash(vec2(li, seed));
  if (fall > .5) {
    float ph = pow(q, .75) * L * Q.w * .9 - uT * P.x * (.85 + .3 * h) + h * 40.;
    v = .46 + .36 * n1(ph) + .2 * n1(ph * .37 + h * 9.) + .08 * (uInt - 1.) - .16 * c * c + .1 * (noise(vec2(lf * 3.1, ph * .7)) - .5);
    v = mix(v, .4 + .12 * n1(ph), clamp(1. - s / 1.1, 0., 1.) * .85);
    if (uFoam > .5) v = max(v, 1. - (L - s) * 1.1);
  } else {
    float sp = P.x * (1. - .4 * u * u) * (.8 + .4 * h), ph = s * Q.w - uT * sp + h * 40.;
    float far = clamp((2. * hw / lanes - .9) / 1.6, 0., 1.), thr = .68 - .2 * rough - .1 * (uInt - 1.) - .06 * abs(uWind);
    v = P.w + .1 * (1. - far) + .12 * (noise(vec2(s * .3 + seed, u * 1.4)) - .5) + .05 * smoothstep(.72, 1., abs(u)) - .03 * (1. - u * u);
    v = mix(v, .64, smoothstep(thr - .06, thr + .16, n1(ph)) * (1. - smoothstep(.1, .95, c)) * far);
    v += .09 * far * (fbm(vec2(s * 3.2 - uT * sp * 1.4, lf * 1.7)) - .45); // fine ripple
    if (rough > .25) { float chop = noise(vec2(s * 1.7 - uT * sp * .55, u * 2.6 + seed)); v = mix(v, .92, smoothstep(.62 - .14 * rough * uInt, .86, chop) * rough * far); }
  }
  for (int i = 0; i < ${MAXR}; i++) {
    if (float(i) >= uNR) break;
    vec4 g = uR[i]; float d = length(vec2(p.x - g.x, (p.y - g.y) / g.w));
    if (d < g.z) { float w = sin(d * .8 - uT * 4.5); if (w > .5) v += .34 * (1. - d / g.z) * (w - .5) * 2.; }
  }
  if (uFoam > .5) {
    for (int i = 0; i < ${MAXF}; i++) {
      if (float(i) >= uNF) break;
      vec2 d = (p - uF[i].xy) / uF[i].zw; float dd = dot(d, d);
      if (dd < 1.) {
        float e = (1. - dd) * uFk[i] * (.55 + .45 * uInt) + (fbm(vec2(p.x * .16 - uT * .5, p.y * .2 + uT * .9)) - .5) * .9;
        if (e > .2) v = max(v, .66 + .34 * smoothstep(.2, .55, e));
      }
    }
  }
  float a = clamp((1. - best) * hw / (480. / uRes.x), 0., 1.); // soft edge, about a pixel and a half wide
  gl_FragColor = vec4(ramp(v) * a, a);
}`;
  function build(g, fs, names) { // one full-screen-triangle program; attribute 0 is shared by both
    const sh = (type, src) => {
      const s = g.createShader(type); g.shaderSource(s, src); g.compileShader(s);
      if (!g.getShaderParameter(s, g.COMPILE_STATUS)) throw new Error(g.getShaderInfoLog(s)); return s;
    };
    const p = g.createProgram();
    g.attachShader(p, sh(g.VERTEX_SHADER, 'attribute vec2 a; void main(){ gl_Position = vec4(a, 0., 1.); }'));
    g.attachShader(p, sh(g.FRAGMENT_SHADER, fs)); g.bindAttribLocation(p, 0, 'a'); g.linkProgram(p);
    if (!g.getProgramParameter(p, g.LINK_STATUS)) throw new Error(g.getProgramInfoLog(p));
    const U = {}; for (const n of names) U[n] = g.getUniformLocation(p, n);
    return { p, U };
  }
  let G = null;
  function glState() {
    if (G !== null) return G;
    G = false;
    try {
      const c = FL.canvas(GW, GH), g = c.getContext('webgl', { premultipliedAlpha: true, antialias: false });
      if (!g) return G;
      const fire = build(g, FS, ['uRes', 'uT', 'uWind', 'uInt', 'uN', 'uEm', 'uPal', 'uClip']);
      g.bindBuffer(g.ARRAY_BUFFER, g.createBuffer()); g.bufferData(g.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), g.STATIC_DRAW);
      g.enableVertexAttribArray(0); g.vertexAttribPointer(0, 2, g.FLOAT, false, 0, 0);
      c.addEventListener('webglcontextlost', () => { G = false; });
      G = { c, g, p: fire.p, U: fire.U };
    } catch (err) { console.warn('Style Lab: WebGL unavailable, using the canvas fallback.', err); G = false; }
    return G;
  }
  function waterProgram() { // compiled on first use, so a GPU that rejects it still gets the fire shader
    if (!glState()) return null;
    if (G.w === undefined) {
      G.w = null;
      try { G.w = build(G.g, WS, ['uRes', 'uT', 'uWind', 'uInt', 'uFoam', 'uN', 'uNF', 'uNR', 'uPal', 'uA', 'uB', 'uP', 'uQ', 'uF', 'uR', 'uFk']); }
      catch (err) { console.warn('Style Lab: water shader unavailable, using the canvas fallback.', err); }
    }
    return G.w;
  }
  function renderGL(sc, t, P, gw, gh) {
    const g = G.g, U = G.U, em = new Float32Array(MAXE * 4), pal = new Float32Array(18), c = sc.clip;
    sc.emitters.slice(0, MAXE).forEach((e, i) => em.set([e.x, e.y, e.w, e.h], i * 4));
    P.pal.stops.forEach((s, i) => pal.set([s[0] / 255, s[1] / 255, s[2] / 255], i * 3));
    g.useProgram(G.p); g.viewport(0, 0, gw, gh);
    g.uniform2f(U.uRes, gw, gh); g.uniform1f(U.uT, t % 600); g.uniform1f(U.uWind, P.wind); g.uniform1f(U.uInt, P.intensity);
    g.uniform1f(U.uN, Math.min(MAXE, sc.emitters.length)); g.uniform4fv(U.uEm, em); g.uniform3fv(U.uPal, pal);
    g.uniform4f(U.uClip, c ? c.x : 0, c ? c.y : 0, c ? c.w : -1, c ? c.h : 0);
    g.drawArrays(g.TRIANGLES, 0, 3);
  }

  function pack(sc) { // the scene's water as flat uniform arrays, built once
    if (sc.wpack) return sc.wpack;
    const k = sc.wpack = { A: new Float32Array(MAXS * 4), B: new Float32Array(MAXS * 4), P: new Float32Array(MAXB * 4), Q: new Float32Array(MAXB * 4),
      F: new Float32Array(MAXF * 4), Fk: new Float32Array(MAXF), R: new Float32Array(MAXR * 4), n: 0, nf: Math.min(MAXF, sc.foam.length), nr: Math.min(MAXR, sc.rings.length) };
    sc.water.slice(0, MAXB).forEach((b, bi) => {
      k.P.set([b.speed, b.lanes, b.rough, b.base], bi * 4); k.Q.set([b.L, b.seed, b.kind === 'fall' ? 1 : b.kind === 'pool' ? 2 : 0, b.freq], bi * 4);
      if (b.kind === 'pool') { if (k.n < MAXS) { k.A.set([b.x, b.y, b.rx, b.ry], k.n * 4); k.B.set([bi * 1000, -1, 0, b.L], k.n * 4); k.n++; } return; }
      for (let i = 1; i < b.pts.length && k.n < MAXS; i++, k.n++) {
        const p = b.pts[i - 1], q = b.pts[i];
        k.A.set([p[0], p[1], q[0], q[1]], k.n * 4); k.B.set([bi * 1000 + p[2], q[2], b.s[i - 1], i === b.pts.length - 1 ? -b.s[i] : b.s[i]], k.n * 4);
      }
    });
    sc.foam.slice(0, MAXF).forEach((f, i) => { k.F.set([f.x, f.y, f.rx, f.ry], i * 4); k.Fk[i] = f.k; });
    sc.rings.slice(0, MAXR).forEach((r, i) => k.R.set([r.x, r.y, r.r, r.q], i * 4));
    return k;
  }
  function renderWater(sc, t, P, gw, gh) {
    const g = G.g, U = G.w.U, k = pack(sc), pal = new Float32Array(18);
    P.pal.stops.forEach((s, i) => pal.set([s[0] / 255, s[1] / 255, s[2] / 255], i * 3));
    g.useProgram(G.w.p); g.viewport(0, 0, gw, gh);
    g.uniform2f(U.uRes, gw, gh); g.uniform1f(U.uT, t % 600); g.uniform1f(U.uWind, P.wind); g.uniform1f(U.uInt, P.intensity);
    g.uniform1f(U.uFoam, P.foam ? 1 : 0); g.uniform1f(U.uN, k.n); g.uniform1f(U.uNF, k.nf); g.uniform1f(U.uNR, k.nr); g.uniform3fv(U.uPal, pal);
    g.uniform4fv(U.uA, k.A); g.uniform4fv(U.uB, k.B); g.uniform4fv(U.uP, k.P); g.uniform4fv(U.uQ, k.Q);
    g.uniform4fv(U.uF, k.F); g.uniform4fv(U.uR, k.R); g.uniform1fv(U.uFk, k.Fk);
    g.drawArrays(g.TRIANGLES, 0, 3);
  }

  FL.style({
    id: 'shader', name: 'GLSL shader', tech: 'Fragment shader · warped fbm noise · bloom · 60 fps',
    note: 'Every pixel evaluates five octaves of domain-warped noise scrolling upward through a flame-shaped mask, then a blurred copy is added back as bloom. The closest to live footage, and the one to reach for in a game engine.',
    create(sc) {
      const sparks = new FL.Sparks(sc, 40), smoke = new FL.Smoke(sc), r = FL.rng(8), coals = [];
      for (const sh of sc.back.concat(sc.front)) if (sh.m === 'ember') for (let i = 0; i < 7; i++) {
        const a = sh.p[r() * sh.p.length | 0]; coals.push([sh.cx + (a[0] - sh.cx) * r(), sh.cy + (a[1] - sh.cy) * r(), r() * 40]);
      }
      const soft = { c: FL.canvas(160, 120) }; soft.x = soft.c.getContext('2d'); soft.img = soft.x.createImageData(160, 120);
      function cpu(t, P) { // fallback: the JS heat field at 160 x 120
        const D = soft.img.data, lut = P.pal.lut; D.fill(0);
        for (let y = 0; y < 120; y++) for (let x = 0; x < 160; x++) {
          const X = x * 2 + 1, Y = y * 2 + 1; if (!FL.inClip(sc, X, Y)) continue;
          const h = FL.heat(sc, X, Y, t, P); if (h < 0.05) continue;
          const i = (y * 160 + x) * 4, j = FL.clamp((0.15 + h * 0.9) * 255 | 0, 0, 255) * 3, a = FL.clamp((h - 0.05) / 0.4, 0, 1);
          D[i] = lut[j]; D[i + 1] = lut[j + 1]; D[i + 2] = lut[j + 2]; D[i + 3] = a * a * (3 - 2 * a) * 255;
        }
        soft.x.putImageData(soft.img, 0, 0);
      }
      return {
        draw(ctx, cw, ch, t, dt, P) {
          const k = cw / FL.W, f = FL.flick(t), S = glState();
          sparks.step(dt, t, P); smoke.step(dt, t, P);
          ctx.setTransform(k, 0, 0, k, 0, 0);
          FL.fillShapes(ctx, sc.back, sc, P, f, 1, () => FL.stars(ctx, sc, t, 1));
          FL.glow(ctx, sc, P, f, 0.75);
          for (const p of smoke.list) {
            const gr = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 1.5);
            gr.addColorStop(0, `rgba(130,132,150,${p.a * 0.16})`); gr.addColorStop(1, 'rgba(130,132,150,0)');
            ctx.fillStyle = gr; ctx.fillRect(p.x - p.r * 1.5, p.y - p.r * 1.5, p.r * 3, p.r * 3);
          }
          let src, sx = 0, sy = 0, sw, sh;
          if (S) { sw = Math.min(GW, cw); sh = Math.round(sw * 0.75); renderGL(sc, t, P, sw, sh); src = S.c; sy = GH - sh; }
          else { cpu(t, P); src = soft.c; sw = 160; sh = 120; }
          ctx.drawImage(src, sx, sy, sw, sh, 0, 0, FL.W, FL.H);
          ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5; // bloom
          if ('filter' in ctx) ctx.filter = `blur(${(4.5 * k).toFixed(1)}px)`;
          ctx.drawImage(src, sx, sy, sw, sh, 0, 0, FL.W, FL.H); ctx.restore();
          FL.fillShapes(ctx, sc.front, sc, P, f, 1);
          ctx.save(); ctx.globalCompositeOperation = 'lighter';
          for (const c of coals) { // coals breathe
            const a = FL.noise1(t * 2.4 + c[2]); if (a < 0.45) continue;
            ctx.fillStyle = FL.rgb(P.pal.at(0.8), (a - 0.45) * 1.6); ctx.beginPath(); ctx.arc(c[0], c[1], 1.1, 0, 6.2832); ctx.fill();
          }
          ctx.lineCap = 'round'; ctx.lineWidth = 0.9;
          for (const p of sparks.list) {
            ctx.strokeStyle = FL.rgb(P.pal.at(0.55 + 0.4 * p.k), Math.min(1, p.k * 1.8));
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.045, p.y - p.vy * 0.045); ctx.stroke();
          }
          ctx.restore();
          const vg = ctx.createRadialGradient(160, 130, 70, 160, 130, 230); // vignette
          vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.55)');
          ctx.fillStyle = vg; ctx.fillRect(0, 0, FL.W, FL.H);
        }
      };
    },
    water: {
      tech: 'Fragment shader · ribbon flow coordinates · bloom · 60 fps',
      note: 'Every pixel works out which stretch of water it is in and how far along the current, then reads streaks, chop, foam and ripple rings from scrolling noise. Edges are anti-aliased and a soft bloom lifts the white water. The smoothest of the ten, and the one to port to a game engine.',
      create(sc) {
        const spray = new FL.Spray(sc, 70), mist = new FL.Mist(sc, 30);
        const soft = { c: FL.canvas(160, 120) }; soft.x = soft.c.getContext('2d'); soft.img = soft.x.createImageData(160, 120);
        function cpu(t, P) { // fallback: the JS flow field at 160 x 120
          const D = soft.img.data, lut = P.pal.lut; D.fill(0);
          for (let y = 0; y < 120; y++) for (let x = 0; x < 160; x++) {
            const v = FL.flow(sc, x * 2 + 1, y * 2 + 1, t, P, 1); if (v < 0) continue;
            const i = (y * 160 + x) * 4, j = (v * 255 | 0) * 3;
            D[i] = lut[j]; D[i + 1] = lut[j + 1]; D[i + 2] = lut[j + 2]; D[i + 3] = 255;
          }
          soft.x.putImageData(soft.img, 0, 0);
        }
        return {
          draw(ctx, cw, ch, t, dt, P) {
            const k = cw / FL.W, W = waterProgram();
            spray.step(dt, t, P); mist.step(dt, t, P);
            ctx.setTransform(k, 0, 0, k, 0, 0);
            FL.fillShapes(ctx, sc.back, sc, P, 0.5, 1);
            let src, sy = 0, sw, sh;
            if (W) { sw = Math.min(GW, cw); sh = Math.round(sw * 0.75); renderWater(sc, t, P, sw, sh); src = G.c; sy = GH - sh; }
            else { cpu(t, P); src = soft.c; sw = 160; sh = 120; }
            ctx.drawImage(src, 0, sy, sw, sh, 0, 0, FL.W, FL.H);
            ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.2; // bloom
            if ('filter' in ctx) ctx.filter = `blur(${(3.5 * k).toFixed(1)}px)`;
            ctx.drawImage(src, 0, sy, sw, sh, 0, 0, FL.W, FL.H); ctx.restore();
            FL.fillShapes(ctx, sc.front, sc, P, 0.5, 1);
            for (const p of mist.list) {
              const gr = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 1.6);
              gr.addColorStop(0, `rgba(255,255,255,${p.a * 0.34})`); gr.addColorStop(1, 'rgba(255,255,255,0)');
              ctx.fillStyle = gr; ctx.fillRect(p.x - p.r * 1.6, p.y - p.r * 1.6, p.r * 3.2, p.r * 3.2);
            }
            ctx.lineCap = 'round'; ctx.lineWidth = 0.8;
            for (const p of spray.list) {
              ctx.strokeStyle = `rgba(255,255,255,${Math.min(1, p.k * 1.6)})`;
              ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03); ctx.stroke();
            }
            const sun = ctx.createLinearGradient(0, 0, 0, FL.H); // a little air: light from above, depth below
            sun.addColorStop(0, 'rgba(255,250,235,0.1)'); sun.addColorStop(0.55, 'rgba(255,250,235,0)'); sun.addColorStop(1, 'rgba(8,16,40,0.2)');
            ctx.fillStyle = sun; ctx.fillRect(0, 0, FL.W, FL.H);
          }
        };
      }
    }
  });
})(window.FL);
