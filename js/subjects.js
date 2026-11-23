/* Fire Style Lab — subjects: WHAT burns. Each subject is plain geometry (polygons tagged with a
   material) plus flame emitters, so every art style can draw every fire.
   back = drawn behind the flames, front = drawn over them. d:1 marks fine detail a style may skip. */
(function (FL) {
  'use strict';
  const TAU = 6.2832;
  const poly = (p, m, s, d, lit) => ({ p, m, s: s || 0, d: d || 0, lit });
  const rect = (x, y, w, h, m, s, d, lit) => poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], m, s, d, lit);
  function ell(x, y, rx, ry, m, s, d, lit, rot) {
    const p = [], c = Math.cos(rot || 0), q = Math.sin(rot || 0);
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU, ex = Math.cos(a) * rx, ey = Math.sin(a) * ry; p.push([x + ex * c - ey * q, y + ex * q + ey * c]); }
    const sh = poly(p, m, s, d, lit); sh.sm = 1; return sh;
  }
  // Log from (x1,y1) to (x2,y2). cap: sawn end shown at the start. char: fraction burnt at the far end.
  function log(x1, y1, x2, y2, r, s, cap, char, lit) {
    const dx = x2 - x1, dy = y2 - y1, l = Math.hypot(dx, dy);
    let nx = -dy / l * r, ny = dx / l * r; if (ny < 0 || (Math.abs(ny) < 0.3 * r && nx < 0)) { nx = -nx; ny = -ny; }
    const out = [poly([[x1 + nx, y1 + ny], [x2 + nx, y2 + ny], [x2 - nx, y2 - ny], [x1 - nx, y1 - ny]], 'wood', s, 0, lit),
      poly([[x1 + nx, y1 + ny], [x2 + nx, y2 + ny], [x2 + nx * 0.2, y2 + ny * 0.2], [x1 + nx * 0.2, y1 + ny * 0.2]], 'wood', s - 1, 1, lit)];
    if (char) { const cx = x2 - dx * char, cy = y2 - dy * char; out.push(poly([[cx + nx, cy + ny], [x2 + nx, y2 + ny], [x2 - nx, y2 - ny], [cx - nx, cy - ny]], 'char', 0, 0, lit)); }
    if (cap) { const a = Math.atan2(dy, dx); out.push(ell(x1, y1, r * 0.5, r, 'woodend', 0, 0, lit, a), ell(x1, y1, r * 0.24, r * 0.5, 'woodend', -1, 1, lit, a)); }
    return out;
  }
  const endLog = (x, y, r, lit) => [ell(x, y, r + 1.3, r + 1, 'wood', -0.4, 0, lit), ell(x, y, r, r * 0.94, 'woodend', 0, 0, lit),
    ell(x, y, r * 0.55, r * 0.5, 'woodend', -0.9, 1, lit), ell(x, y, r * 0.16, r * 0.15, 'wood', -0.5, 1, lit)];
  function stone(x, y, rx, ry, rnd, s, lit) {
    const p = [], n = 8;
    for (let i = 0; i < n; i++) { const a = (i + rnd() * 0.5) / n * TAU, k = 0.82 + rnd() * 0.32; p.push([x + Math.cos(a) * rx * k, y + Math.sin(a) * ry * k]); }
    const sh = poly(p, 'stone', s, 0, lit); sh.sm = 1;
    return [sh, ell(x - rx * 0.2, y - ry * 0.32, rx * 0.5, ry * 0.3, 'stone', s + 1, 1, lit)];
  }
  const scene = amb => ({ back: [], front: [], stars: [], emitters: [], clip: null, glow: { x: 160, y: 170, r: 150 }, amb, smoke: true, sparkRate: 1 });

  // ---------- backdrops ----------
  function night(rnd, gy) {
    const sc = scene([0.3, 0.34, 0.5]);
    sc.back.push(rect(0, 0, 320, 240, 'sky', 0, 0, 0));
    const tri = [];
    for (let i = 0; i < 11; i++) {
      const x = -8 + i * 33 + rnd() * 14, h = 44 + rnd() * 60, w = 15 + h * 0.2, s = (rnd() - 0.5) * 0.9;
      for (let k = 0; k < 3; k++) { const ty = gy + 4 - h + k * h * 0.27, tw = w * (0.42 + k * 0.29), th = h * 0.44; tri.push([x, ty, tw, th]); sc.back.push(poly([[x, ty], [x + tw, ty + th], [x - tw, ty + th]], 'pine', s, 0, 0.07)); }
    }
    for (let i = 0; i < 70 && sc.stars.length < 44; i++) { // stars only where no pine covers them
      const x = rnd() * 320, y = rnd() * (gy - 40);
      if (!tri.some(q => y >= q[1] - 1 && y <= q[1] + q[3] && Math.abs(x - q[0]) <= q[2] * (y - q[1]) / q[3] + 1.5)) sc.stars.push([x, y, 0.4 + rnd() * 0.6]);
    }
    sc.back.push(poly([[0, gy], [320, gy], [320, 240], [0, 240]], 'ground', 0, 0, 0.05));
    sc.back.push(ell(160, gy + 26, 128, 24, 'ground', 0.5, 0, 0.3), ell(160, gy + 25, 76, 14, 'ground', 1, 0, 0.62));
    return sc;
  }
  function room(wall) {
    const sc = scene([0.36, 0.33, 0.38]); sc.smoke = false;
    sc.back.push(rect(0, 0, 320, 198, wall, 0, 0, 0.14), rect(0, 189, 320, 9, 'mantel', -0.6, 0, 0.2));
    sc.back.push(poly([[0, 198], [320, 198], [320, 240], [0, 240]], 'floor', 0, 0, 0.14));
    for (let i = 0; i < 5; i++) sc.back.push(rect(0, 206 + i * 7.5, 320, 0.9, 'floor', -1.2, 1, 0.14));
    sc.back.push(ell(160, 218, 112, 17, 'floor', 0.4, 0, 0.4), ell(160, 214, 66, 9, 'floor', 0.8, 0, 0.66));
    return sc;
  }
  function ring(sc, rnd, cx, cy, rx, ry, n) {
    const it = [];
    for (let i = 0; i < n; i++) { const a = (i + rnd() * 0.4) / n * TAU; it.push([Math.sin(a), cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); }
    it.sort((a, b) => a[0] - b[0]);
    for (const [sn, x, y] of it) { const r = 8 + rnd() * 3.5, f = sn > 0.1; (f ? sc.front : sc.back).push(...stone(x, y, r, r * 0.72, rnd, (rnd() - 0.5) * 1.2, f ? 0.32 : 0.8)); }
  }
  const bed = (sc, x, y, r) => sc.back.push(ell(x, y + 1, r * 1.35, r * 0.27, 'char', 0, 0, 0.5), ell(x, y, r, r * 0.17, 'ember'));
  function bricks(dst, rnd, x, y, w, h, o) { // wall with an opening o left uncovered
    const base = (bx, by, bw, bh) => { if (bw > 0 && bh > 0) dst.push(rect(bx, by, bw, bh, 'brick', -1.7)); };
    base(x, y, w, o.y - y); base(x, o.y, o.x - x, y + h - o.y); base(o.x + o.w, o.y, x + w - o.x - o.w, y + h - o.y);
    const bw = 15, bh = 6.5;
    for (let r = 0, yy = y; yy < y + h - 1; r++, yy += bh) for (let xx = x - (r % 2) * bw / 2; xx < x + w; xx += bw) {
      let x0 = Math.max(x, xx) + 0.6, x1 = Math.min(x + w, xx + bw) - 0.6; const y0 = yy + 0.6, y1 = Math.min(y + h, yy + bh) - 0.4;
      if (y1 > o.y && x1 > o.x && x0 < o.x + o.w) { if (x0 < o.x) x1 = o.x - 0.6; else if (x1 > o.x + o.w) x0 = o.x + o.w + 0.6; else continue; }
      if (x1 - x0 > 2) dst.push(rect(x0, y0, x1 - x0, y1 - y0, 'brick', (rnd() - 0.5) * 1.4, 1));
    }
  }

  // ---------- campfires ----------
  FL.subject({ id: 'teepee', name: 'Teepee lay', kind: 'campfire',
    blurb: 'Kindling and split logs leaned into a cone. Lights fast and throws a tall, bright flame.',
    build() {
      const rnd = FL.rng(11), sc = night(rnd, 168);
      ring(sc, rnd, 160, 197, 64, 15, 13); bed(sc, 160, 193, 25);
      sc.back.push(...log(117, 193, 157, 126, 6, -0.3, 0, 0.3), ...log(204, 193, 163, 126, 6, -0.2, 0, 0.3), ...log(160, 187, 160, 122, 5.5, -0.6, 0, 0.3));
      sc.front.push(...log(137, 200, 158, 128, 6.5, 0.1, 1, 0.25, 0.4), ...log(185, 200, 162, 128, 6.5, -0.1, 1, 0.25, 0.4));
      sc.emitters = [{ x: 160, y: 193, w: 56, h: 126 }, { x: 139, y: 195, w: 20, h: 44 }, { x: 182, y: 195, w: 20, h: 48 }];
      return sc;
    } });

  FL.subject({ id: 'cabin', name: 'Log cabin lay', kind: 'campfire',
    blurb: 'Logs stacked as a square crib around the tinder. Burns evenly and leaves a deep coal bed for cooking.',
    build() {
      const rnd = FL.rng(23), sc = night(rnd, 168);
      ring(sc, rnd, 160, 199, 72, 15, 14); bed(sc, 160, 195, 30);
      sc.back.push(...log(118, 185, 202, 185, 6, -0.7), ...log(124, 163, 196, 163, 5.5, -0.7));
      sc.front.push(...endLog(128, 191, 8, 0.4), ...endLog(192, 191, 8, 0.4), ...log(113, 178, 207, 178, 6.5, 0, 0, 0, 0.42),
        ...endLog(134, 167, 7, 0.45), ...endLog(186, 167, 7, 0.45), ...log(120, 155, 200, 155, 6, 0.1, 0, 0, 0.5));
      sc.emitters = [{ x: 160, y: 187, w: 60, h: 98 }, { x: 137, y: 151, w: 18, h: 36 }, { x: 184, y: 151, w: 18, h: 40 }];
      sc.glow.y = 160; return sc;
    } });

  FL.subject({ id: 'star', name: 'Star fire', kind: 'campfire',
    blurb: 'Five logs laid like spokes and pushed inward as they burn. A small, frugal flame that lasts all night.',
    build() {
      const rnd = FL.rng(37), sc = night(rnd, 168);
      bed(sc, 160, 191, 26);
      sc.back.push(...log(140, 171, 155, 187, 4.5, -0.7, 0, 0.4), ...log(183, 170, 166, 187, 4.5, -0.7, 0, 0.4),
        ...log(96, 181, 150, 190, 5.5, -0.2, 1, 0.3), ...log(226, 181, 170, 190, 5.5, -0.3, 1, 0.3));
      sc.front.push(...log(112, 216, 153, 196, 6.5, 0.1, 1, 0.3, 0.45), ...log(211, 216, 168, 196, 6.5, 0, 1, 0.3, 0.45));
      sc.emitters = [{ x: 160, y: 191, w: 36, h: 56 }, { x: 148, y: 192, w: 12, h: 22 }, { x: 172, y: 192, w: 12, h: 24 }];
      sc.glow = { x: 160, y: 182, r: 125 }; sc.sparkRate = 0.6; return sc;
    } });

  FL.subject({ id: 'torch', name: 'Swedish torch', kind: 'campfire',
    blurb: 'One upright log, cross-cut most of the way down and lit from the top. It is its own stove and chimney.',
    build() {
      const rnd = FL.rng(41), sc = night(rnd, 168);
      sc.back.push(ell(160, 199, 30, 5, 'char', 0, 0, 0.3), rect(141, 117, 38, 82, 'wood', 0, 0, 0.5),
        rect(141, 117, 7, 82, 'wood', -1, 1, 0.4), rect(169, 117, 10, 82, 'wood', -1.3, 1, 0.4), rect(153, 117, 3, 82, 'wood', 0.6, 1, 0.5),
        ell(160, 199, 19, 4, 'wood', -1, 0, 0.4), ell(160, 117, 19, 5.5, 'char', 0, 0, 0.9), ell(160, 117, 13, 3.4, 'ember', 0.5));
      sc.front.push(rect(158.4, 121, 3.2, 58, 'ember', 0.2), rect(159.2, 179, 1.6, 12, 'ember', -1));
      sc.emitters = [{ x: 160, y: 118, w: 31, h: 68 }, { x: 160, y: 152, w: 7, h: 15 }];
      sc.glow = { x: 160, y: 122, r: 135 }; sc.sparkRate = 0.8; return sc;
    } });

  // ---------- fireplaces ----------
  FL.subject({ id: 'hearth', name: 'Brick hearth', kind: 'fireplace',
    blurb: 'The open masonry fireplace: firebox, grate, soldier-course lintel and a timber mantel shelf.',
    build() {
      const rnd = FL.rng(53), sc = room('wall'), o = { x: 114, y: 108, w: 92, h: 90 };
      sc.back.push(rect(o.x, o.y, o.w, o.h, 'firebox', 0, 0, 0.5), poly([[127, 121], [193, 121], [193, 198], [127, 198]], 'firebox', 2.5, 1, 1));
      bed(sc, 160, 192, 26); sc.back.push(...log(132, 183, 190, 186, 5.5, -0.6, 0, 0.2));
      bricks(sc.front, rnd, 78, 62, 164, 136, o);
      for (let x = 110; x < 208; x += 7) sc.front.push(rect(x + 0.5, 99.5, 6, 9, 'brick', (rnd() - 0.5) * 1.2 + 0.3, 1));
      sc.front.push(rect(70, 50, 180, 9, 'mantel', 0.3), rect(77, 59, 166, 4, 'mantel', -0.8), rect(66, 198, 188, 7, 'stone', 0.2, 0, 0.6));
      sc.front.push(rect(127, 189, 66, 2.6, 'iron', 1, 0, 0.5), rect(131, 189, 2.6, 9, 'iron', 0, 0, 0.3), rect(186.4, 189, 2.6, 9, 'iron', 0, 0, 0.3),
        rect(127, 181, 2.6, 9, 'iron', 0.5, 1, 0.4), rect(190.4, 181, 2.6, 9, 'iron', 0.5, 1, 0.4));
      sc.front.push(...log(131, 183.5, 189, 183.5, 5.8, 0.1, 1, 0, 0.45), ...log(140, 174, 184, 172, 5, -0.2, 1, 0.3, 0.5));
      sc.emitters = [{ x: 160, y: 181, w: 58, h: 60 }, { x: 138, y: 180, w: 16, h: 30 }, { x: 183, y: 180, w: 16, h: 32 }];
      sc.clip = o; sc.sparkRate = 0.6; return sc;
    } });

  FL.subject({ id: 'fieldstone', name: 'Fieldstone fireplace', kind: 'fireplace',
    blurb: 'A cabin chimney breast of rough-laid stone with an arched opening, andirons and a hewn-beam mantel.',
    build() {
      const rnd = FL.rng(67), sc = room('wall');
      const eL = y => 70 + (198 - y) * 0.11, eR = y => 250 - (198 - y) * 0.11;
      const archY = x => 150 - 34 * Math.sqrt(Math.max(0, 1 - Math.pow((x - 160) / 40, 2)));
      const arch = []; for (let i = 0; i <= 10; i++) { const x = 200 - i * 8; arch.push([x, archY(x)]); }
      sc.back.push(poly([[120, 198], [120, 150]].concat(arch.slice().reverse(), [[200, 198]]), 'firebox', 0, 0, 0.5),
        poly([[131, 198], [131, 150], [140, 132], [160, 125], [180, 132], [189, 150], [189, 198]], 'firebox', 2.5, 1, 1));
      bed(sc, 160, 193, 27); sc.back.push(...log(130, 184, 192, 187, 5.5, -0.6, 0, 0.2));
      const F = sc.front;
      F.push(poly([[70, 198], [eL(150), 150], [120, 150], [120, 198]], 'stone', -1.6), poly([[200, 198], [200, 150], [eR(150), 150], [250, 198]], 'stone', -1.6),
        poly([[eL(150), 150], [eL(0), 0], [eR(0), 0], [eR(150), 150]].concat(arch), 'stone', -1.6));
      for (let yy = 4; yy < 196; yy += 12.5) for (let xx = 70 + ((yy / 12.5 | 0) % 2) * 8; xx < 252; xx += 17) {
        const x = xx + (rnd() - 0.5) * 5, y = yy + (rnd() - 0.5) * 3, rx = 7 + rnd() * 2.5, ry = 5 + rnd() * 1.6;
        if (x - rx < eL(y) + 1 || x + rx > eR(y) - 1 || y + ry > 197) continue;
        if (x + rx > 117 && x - rx < 203 && y + ry > archY(clampX(x)) - 3) continue;
        const st = stone(x, y, rx, ry, rnd, (rnd() - 0.5) * 1.5); st[0].d = 1; F.push(...st);
      }
      F.push(rect(84, 92, 152, 13, 'mantel', 0.2), rect(84, 97, 152, 1, 'mantel', -1, 1), rect(84, 101.5, 152, 1, 'mantel', -1, 1), rect(64, 198, 192, 8, 'stone', 0.4, 0, 0.6));
      for (const x of [129, 191]) F.push(rect(x - 1.5, 170, 3, 28, 'iron', 0.4, 0, 0.3), ell(x, 168, 3.6, 3.6, 'iron', 1.5, 0, 0.4), rect(x - 5, 195, 10, 3, 'iron', 0, 0, 0.3));
      F.push(...log(123, 187, 197, 187, 6.8, 0, 1, 0, 0.45), ...log(133, 176, 188, 174, 5.6, -0.2, 1, 0.3, 0.5));
      sc.emitters = [{ x: 160, y: 185, w: 62, h: 62 }, { x: 139, y: 178, w: 16, h: 30 }, { x: 182, y: 178, w: 17, h: 33 }];
      sc.clip = { x: 120, y: 116, w: 80, h: 82 }; sc.sparkRate = 0.6; return sc;
    } });
  function clampX(x) { return FL.clamp(x, 121, 199); }

  FL.subject({ id: 'stove', name: 'Cast-iron stove', kind: 'fireplace',
    blurb: 'A closed wood stove. The fire shows through the door glass and the air vents glow underneath.',
    build() {
      const sc = room('wall'), B = (x, y, w, h, s, d, lit) => sc.front.push(rect(x, y, w, h, 'iron', s, d, lit == null ? 0.25 : lit));
      sc.back.push(poly([[86, 200], [234, 200], [250, 218], [70, 218]], 'stone', -0.3, 0, 0.45));
      sc.back.push(rect(130, 122, 60, 50, 'firebox', 1, 0, 0.9)); bed(sc, 160, 168, 21); sc.back.push(...log(138, 165, 183, 166, 4.5, -0.5, 0, 0.2));
      B(150, 0, 20, 104, 0.6, 0, 0.3); B(153, 0, 4, 104, 1.8, 1, 0.3); B(147, 96, 26, 6, 1.2, 0, 0.35); B(110, 102, 100, 7, 1.4, 0, 0.4);
      B(116, 109, 88, 13, 0); B(116, 122, 14, 50, 0); B(190, 122, 14, 50, 0); B(116, 172, 88, 17, 0);
      B(127, 119, 66, 3, 1.6, 1, 0.5); B(127, 172, 66, 3, 1.6, 1, 0.5); B(127, 119, 3, 56, 1.6, 1, 0.5); B(190, 119, 3, 56, 1.6, 1, 0.5); B(196, 139, 3.5, 15, 3, 1, 0.5);
      for (const x of [144, 157, 170]) sc.front.push(rect(x, 180, 7, 2.4, 'ember', -0.3));
      sc.front.push(poly([[119, 189], [129, 189], [125, 201], [118, 201]], 'iron', -0.5, 0, 0.2), poly([[191, 189], [201, 189], [202, 201], [195, 201]], 'iron', -0.5, 0, 0.2));
      sc.emitters = [{ x: 160, y: 168, w: 44, h: 40 }, { x: 146, y: 168, w: 12, h: 22 }, { x: 175, y: 168, w: 12, h: 25 }];
      sc.clip = { x: 130, y: 122, w: 60, h: 50 }; sc.glow = { x: 160, y: 150, r: 125 }; sc.sparkRate = 0.35; return sc;
    } });

  FL.subject({ id: 'linear', name: 'Linear gas fireplace', kind: 'fireplace',
    blurb: 'A long slot burner set flush in a plaster wall: a ribbon of small even flames over river pebbles.',
    build() {
      const rnd = FL.rng(79), sc = room('plaster'), o = { x: 60, y: 118, w: 200, h: 50 };
      sc.back.push(rect(o.x, o.y, o.w, o.h, 'firebox', 0.6, 0, 0.7), rect(66, 161, 188, 3, 'iron', 1, 1, 0.8));
      sc.front.push(rect(56, 114, 208, 4, 'metal', 0, 0, 0.5), rect(56, 168, 208, 4, 'metal', 0.3, 0, 0.6), rect(56, 114, 4, 58, 'metal', -0.3, 0, 0.5), rect(260, 114, 4, 58, 'metal', -0.3, 0, 0.5));
      for (let i = 0; i < 27; i++) sc.front.push(ell(65 + i * 7.3 + rnd() * 3, 165 + rnd() * 1.6, 3.3 + rnd() * 1.6, 2.2 + rnd(), 'pebble', (rnd() - 0.5) * 1.6, 0, 0.75));
      sc.front.push(rect(38, 184, 244, 6, 'mantel', 0.5, 0, 0.5));
      for (let i = 0; i < 11; i++) sc.emitters.push({ x: 78 + i * 16.4, y: 162, w: 13, h: 25 + (i * 7 % 4) * 3 });
      sc.clip = o; sc.glow = { x: 160, y: 146, r: 150 }; sc.sparkRate = 0; return sc;
    } });
})(window.FL);
