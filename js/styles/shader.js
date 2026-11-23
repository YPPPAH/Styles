/* Style: GLSL shader. One shared WebGL context renders domain-warped fbm flames for every canvas
   on the page; the result is composited into each 2D canvas with a blurred bloom pass.
   Falls back to the CPU heat field (blurred by upscaling) when WebGL is not available. */
(function (FL) {
  'use strict';
  const GW = 800, GH = 600, MAXE = 12;
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
  let G = null;
  function glState() {
    if (G !== null) return G;
    G = false;
    try {
      const c = FL.canvas(GW, GH), g = c.getContext('webgl', { premultipliedAlpha: true, antialias: false });
      if (!g) return G;
      const sh = (type, src) => {
        const s = g.createShader(type); g.shaderSource(s, src); g.compileShader(s);
        if (!g.getShaderParameter(s, g.COMPILE_STATUS)) throw new Error(g.getShaderInfoLog(s)); return s;
      };
      const p = g.createProgram();
      g.attachShader(p, sh(g.VERTEX_SHADER, 'attribute vec2 a; void main(){ gl_Position = vec4(a, 0., 1.); }'));
      g.attachShader(p, sh(g.FRAGMENT_SHADER, FS)); g.linkProgram(p);
      if (!g.getProgramParameter(p, g.LINK_STATUS)) throw new Error(g.getProgramInfoLog(p));
      g.useProgram(p);
      g.bindBuffer(g.ARRAY_BUFFER, g.createBuffer()); g.bufferData(g.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), g.STATIC_DRAW);
      const a = g.getAttribLocation(p, 'a'); g.enableVertexAttribArray(a); g.vertexAttribPointer(a, 2, g.FLOAT, false, 0, 0);
      const U = {}; for (const n of ['uRes', 'uT', 'uWind', 'uInt', 'uN', 'uEm', 'uPal', 'uClip']) U[n] = g.getUniformLocation(p, n);
      c.addEventListener('webglcontextlost', () => { G = false; });
      G = { c, g, U };
    } catch (err) { console.warn('Fire Style Lab: WebGL unavailable, using the canvas fallback.', err); G = false; }
    return G;
  }
  function renderGL(sc, t, P, gw, gh) {
    const g = G.g, U = G.U, em = new Float32Array(MAXE * 4), pal = new Float32Array(18), c = sc.clip;
    sc.emitters.slice(0, MAXE).forEach((e, i) => em.set([e.x, e.y, e.w, e.h], i * 4));
    P.pal.stops.forEach((s, i) => pal.set([s[0] / 255, s[1] / 255, s[2] / 255], i * 3));
    g.viewport(0, 0, gw, gh);
    g.uniform2f(U.uRes, gw, gh); g.uniform1f(U.uT, t % 600); g.uniform1f(U.uWind, P.wind); g.uniform1f(U.uInt, P.intensity);
    g.uniform1f(U.uN, Math.min(MAXE, sc.emitters.length)); g.uniform4fv(U.uEm, em); g.uniform3fv(U.uPal, pal);
    g.uniform4f(U.uClip, c ? c.x : 0, c ? c.y : 0, c ? c.w : -1, c ? c.h : 0);
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
    }
  });
})(window.FL);
