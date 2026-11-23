/* Style Lab — water subjects, part 2: four waterfalls. Same rules as the rivers:
   back = drawn behind the water, front = drawn over it, and the water itself comes from water.js. */
(function (FL) {
  'use strict';
  const K = FL.kit;
  const mossy = (dst, r, x, y, rx, ry, m, s) => { dst.push(...K.blob(r, x, y, rx, ry, m, s)); dst.push(K.ell(x - 1, y - ry * 0.62, rx * 0.7, ry * 0.28, 'moss', 0, 1)); };
  // a lit ledge with its shadow underneath: the way a rock face reads as stepped
  const ledge = (dst, x0, y0, x1, y1, h) => dst.push(K.poly([[x0, y0], [x1, y1], [x1, y1 + h], [x0, y0 + h]], 'cliff', 1, 1), K.poly([[x0, y0 + h], [x1, y1 + h], [x1, y1 + h * 2.2], [x0, y0 + h * 2.2]], 'cliff', -1.5, 1));

  FL.subject({
    id: 'plunge', lab: 'water', kind: 'waterfall', name: 'Plunge fall',
    blurb: 'One clean column dropping clear of an overhang into a deep pool. The textbook waterfall: a glassy lip, a white foot, rings spreading over still water.',
    build() {
      const sc = K.scene(), r = FL.rng(53); sc.sound = { roar: 1, babble: 0.2 };
      K.sky(sc, 46);
      for (let i = 0; i < 15; i++) { const x = 6 + i * 22 + r() * 8; if (Math.abs(x - 160) > 20) K.fir(sc.back, x, 40 + r() * 4, 20 + r() * 14, r() < 0.5 ? 0 : -1.5); }
      const face = K.poly([[0, 38], [60, 32], [120, 36], [148, 44], [172, 44], [200, 34], [260, 30], [320, 36], [320, 240], [0, 240]], 'cliff', 0); face.bg = 1; sc.back.push(face);
      sc.back.push(K.poly([[0, 38], [60, 32], [120, 36], [148, 44], [148, 48], [120, 41], [60, 37], [0, 44]], 'grass', -0.5), K.poly([[172, 44], [200, 34], [260, 30], [320, 36], [320, 42], [260, 35], [200, 39], [172, 48]], 'grass', -0.5));
      sc.back.push(K.poly([[122, 178], [118, 110], [128, 70], [146, 50], [174, 50], [194, 72], [202, 112], [198, 178]], 'cave', 0)); // the alcove behind the fall
      sc.back.push(K.poly([[136, 178], [134, 112], [142, 78], [152, 62], [168, 62], [180, 80], [186, 114], [184, 178]], 'cave', -1.5, 1));
      ledge(sc.back, 0, 84, 98, 78, 5); ledge(sc.back, 224, 94, 320, 86, 5); ledge(sc.back, 0, 134, 110, 127, 4); ledge(sc.back, 212, 140, 320, 133, 4);
      for (const [x, y, rx, ry, s] of [[70, 68, 22, 7, -0.5], [258, 72, 26, 8, 0], [94, 116, 14, 5, -1], [238, 122, 18, 6, -0.5], [40, 156, 20, 6, 0], [280, 160, 16, 5, -0.5]]) sc.back.push(K.ell(x, y, rx, ry, 'moss', s));
      sc.back.push(K.ell(160, 197, 204, 35, 'earth', -1.5)); // wet rock round the pool
      const pool = FL.pool(160, 200, 196, 32, { base: 0.28 }), fall = FL.ribbon('fall', [[160, 46, 8.5], [160, 171, 10.5]], { sub: 1, lanes: 6, speed: 1.6 });
      sc.water.push(pool, fall);
      K.splash(sc, 160, 171, 10.5);
      mossy(sc.front, r, 22, 180, 26, 14, 'cliff', -1); mossy(sc.front, r, 300, 182, 24, 14, 'cliff', -1);
      sc.front.push(K.poly([[0, 241], [0, 222], [40, 226], [90, 232], [150, 235], [210, 233], [270, 228], [320, 220], [320, 241]], 'earth', -1.5));
      mossy(sc.front, r, 36, 226, 22, 13, 'stone', -0.4); mossy(sc.front, r, 286, 224, 26, 15, 'stone', -0.4);
      sc.front.push(...K.blob(r, 236, 235, 12, 7, 'stone', -0.4), ...K.blob(r, 92, 237, 10, 6, 'stone', -0.4));
      return sc;
    }
  });

  FL.subject({
    id: 'tiers', lab: 'water', kind: 'waterfall', name: 'Tiered cascade',
    blurb: 'Three falls in a staircase, each one landing on a ledge, pooling and pouring off again. Good for testing how a style keeps separate sheets of water apart.',
    build() {
      const sc = K.scene(), r = FL.rng(67); sc.sound = { roar: 0.8, babble: 0.5 };
      K.sky(sc, 44);
      for (let i = 0; i < 12; i++) { const x = 100 + i * 20 + r() * 8; if (Math.abs(x - 216) > 14) K.fir(sc.back, x, 34 + r() * 4, 18 + r() * 14, r() < 0.5 ? 0 : -1.5); }
      const rock = K.poly([[0, 46], [100, 30], [320, 26], [320, 240], [0, 240]], 'cliff', -0.5); rock.bg = 1; sc.back.push(rock);
      sc.back.push(K.poly([[150, 80], [250, 78], [320, 82], [320, 91], [246, 89], [152, 91]], 'cliff', 1), K.poly([[152, 91], [246, 89], [320, 91], [320, 100], [150, 101]], 'cliff', -1.5, 1)); // first tread and its shadow
      sc.back.push(K.poly([[96, 134], [222, 132], [320, 138], [320, 147], [220, 143], [98, 146]], 'cliff', 1), K.poly([[98, 146], [220, 143], [320, 147], [320, 157], [96, 157]], 'cliff', -1.5, 1));
      const slope = K.poly([[0, 46], [100, 30], [150, 80], [96, 134], [60, 192], [0, 204]], 'hill', -0.5); slope.bg = 1; sc.back.push(slope);
      for (const [x, y, h] of [[20, 84, 44], [56, 70, 36], [88, 58, 30], [40, 132, 52], [78, 112, 40], [16, 176, 56]]) K.fir(sc.back, x, y, h, r() < 0.5 ? 0 : -1.5);
      for (const [x, y, rx, ry] of [[270, 60, 24, 7], [120, 112, 16, 5], [276, 118, 22, 6], [250, 172, 26, 7], [86, 172, 14, 5]]) sc.back.push(K.ell(x, y, rx, ry, 'moss', -0.5));
      sc.back.push(K.ell(160, 212, 208, 29, 'earth', -1.5));
      const f1 = FL.ribbon('fall', [[216, 30, 5], [214, 83, 6]], { sub: 1, lanes: 4 }), p1 = FL.pool(200, 85, 27, 4.5);
      const f2 = FL.ribbon('fall', [[186, 86, 7.5], [184, 137, 9]], { sub: 1, lanes: 5 }), p2 = FL.pool(167, 139, 38, 5.5);
      const f3 = FL.ribbon('fall', [[150, 141, 11], [148, 195, 14]], { sub: 1, lanes: 7 }), basin = FL.pool(160, 215, 200, 26, { base: 0.28 });
      sc.water.push(p1, f1, p2, f2, basin, f3);
      K.splash(sc, 214, 83, 6, { mist: 0.6, ring: 3 }); K.splash(sc, 184, 137, 9, { mist: 0.8, ring: 3 }); K.splash(sc, 148, 195, 14);
      sc.front.push(K.poly([[0, 241], [0, 226], [60, 231], [130, 236], [200, 235], [262, 229], [320, 222], [320, 241]], 'earth', -1.5));
      mossy(sc.front, r, 30, 204, 24, 14, 'cliff', -1); mossy(sc.front, r, 284, 206, 30, 16, 'cliff', -1);
      mossy(sc.front, r, 66, 230, 16, 10, 'stone', -0.4); sc.front.push(...K.blob(r, 222, 236, 13, 7, 'stone', -0.4));
      K.fir(sc.front, 312, 246, 124, -3);
      return sc;
    }
  });

  FL.subject({
    id: 'curtain', lab: 'water', kind: 'waterfall', name: 'Curtain fall',
    blurb: 'A whole river going over a straight sill at once. Too wide to read as lines, so it has to work as a moving wall of texture, with a bank of mist where it lands.',
    build() {
      const sc = K.scene(), r = FL.rng(71); sc.sound = { roar: 1.25, babble: 0 };
      K.sky(sc, 62);
      K.cloud(sc.back, 62, 22, 70); K.cloud(sc.back, 242, 30, 56);
      K.ridge(sc.back, r, 52, 6, 68, 'hill', -1.5, 26);
      for (let i = 0; i < 20; i++) K.fir(sc.back, 62 + i * 10.4 + r() * 4, 61, 9 + r() * 9, r() < 0.5 ? 0 : -1.5);
      K.ground(sc, 60, 'cliff', -1.5);
      sc.back.push(K.poly([[0, 52], [44, 50], [58, 64], [54, 120], [62, 178], [0, 192]], 'cliff', 0), K.poly([[320, 50], [276, 50], [262, 64], [268, 120], [258, 178], [320, 192]], 'cliff', -0.5));
      ledge(sc.back, 0, 96, 55, 92, 4); ledge(sc.back, 267, 108, 320, 104, 4);
      for (const [x, y, h] of [[14, 56, 34], [34, 54, 26], [292, 54, 30], [310, 56, 38]]) K.fir(sc.back, x, y, h, -1.5);
      for (const [x, y, rx, ry] of [[26, 74, 20, 6], [300, 78, 18, 6], [30, 146, 18, 6], [294, 150, 20, 6]]) sc.back.push(K.ell(x, y, rx, ry, 'moss', -0.5));
      const up = FL.ribbon('river', [[160, 60, 100], [160, 73, 104]], { sub: 1, unit: 5, lanes: 24, speed: 0.9, rough: 0.1, base: 0.38, freq: 2 });
      const basin = FL.ribbon('river', [[160, 170, 124], [160, 254, 168]], { sub: 1, unit: 9, lanes: 16, speed: 0.5, rough: 0.3, base: 0.3 });
      const sheet = FL.ribbon('fall', [[160, 73, 104], [160, 173, 110]], { sub: 1, lanes: 46, speed: 1.6 });
      sc.water.push(up, basin, sheet);
      K.foam(sc, 160, 175, 126, 12, 1.3); K.foam(sc, 108, 201, 40, 5, 0.6); K.foam(sc, 222, 215, 46, 6, 0.6);
      for (const x of [86, 132, 176, 244]) sc.spray.push({ x, y: 170, w: 40, rate: 14, up: 46 });
      for (const x of [98, 160, 234]) sc.mist.push({ x, y: 165, w: 70, rate: 2, rise: 10, r: 13 });
      sc.front.push(K.poly([[196, 58], [204, 52], [214, 56], [218, 70], [214, 150], [206, 158], [198, 148], [194, 70]], 'cliff', -1.5)); // the rock that splits the curtain
      sc.front.push(K.ell(205, 57, 9, 3, 'moss', 0, 1)); K.fir(sc.front, 206, 57, 22, -1.5);
      mossy(sc.front, r, 28, 232, 44, 22, 'cliff', -1.5); mossy(sc.front, r, 298, 236, 40, 20, 'cliff', -1.5);
      K.fir(sc.front, 12, 226, 62, -3);
      return sc;
    }
  });

  FL.subject({
    id: 'ribbon', lab: 'water', kind: 'waterfall', name: 'Ribbon fall',
    blurb: 'A thin thread of water down a granite wall, hundreds of metres in one frame. Small on screen, so the wind matters more than the volume: it bends the fall and carries the mist.',
    build() {
      const sc = K.scene(), r = FL.rng(83); sc.sound = { roar: 0.45, babble: 0.4 };
      K.sky(sc, 184);
      K.cloud(sc.back, 52, 34, 64); K.cloud(sc.back, 100, 76, 40);
      K.ridge(sc.back, r, 116, 30, 186, 'peak', 0.5, 44);
      sc.back.push(K.poly([[100, 186], [112, 150], [124, 96], [146, 48], [172, 24], [222, 12], [320, 16], [320, 186]], 'cliff', 1));
      sc.back.push(K.poly([[214, 186], [220, 120], [236, 60], [262, 20], [320, 16], [320, 186]], 'cliff', -0.5));
      for (const [x, y0, y1, l] of [[150, 60, 142, -7], [176, 40, 112, -4], [250, 40, 152, -6], [288, 30, 120, 4], [130, 104, 160, -8]]) sc.back.push(K.poly([[x, y0], [x + 2.6, y0], [x + 2.6 + l, y1], [x + l, y1]], 'cliff', -1.5, 1));
      sc.back.push(K.poly([[160, 121], [226, 117], [232, 123], [164, 131]], 'cliff', -1.5), K.poly([[160, 119], [226, 115], [226, 118], [160, 122]], 'cliff', 2, 1));
      K.ground(sc, 182, 'grass', 0);
      sc.back.push(K.poly([[96, 190], [128, 170], [200, 165], [260, 171], [320, 167], [320, 192], [96, 192]], 'cliff', -0.5)); // scree at the foot of the wall
      sc.back.push(K.poly([[0, 200], [320, 194], [320, 206], [0, 214]], 'grass', 1, 1));
      for (let i = 0; i < 17; i++) { const x = 98 + i * 13.5 + r() * 6; if (Math.abs(x - 172) > 13) K.fir(sc.back, x, 187 + r() * 6, 20 + r() * 16, r() < 0.5 ? 0 : -1.5); }
      const top = FL.ribbon('fall', [[197, 22, 2.2], [195, 70, 3.2], [191, 121, 5.4]], { sub: 2, lanes: 3, speed: 1.3, unit: 10 });
      const apron = FL.ribbon('fall', [[190, 124, 6], [184, 148, 9], [175, 171, 12]], { sub: 2, lanes: 5, speed: 1.1, unit: 10 });
      const stream = FL.ribbon('river', [[173, 174, 4], [150, 190, 8], [168, 211, 15], [198, 254, 30]], { speed: 0.7, lanes: 5, rough: 0.2 });
      sc.back.push(K.bank(stream, 3, 'earth', -0.5), K.ell(175, 176, 23, 8.5, 'earth', -1.5));
      sc.water.push(stream, FL.pool(175, 176, 21, 7), top, apron);
      K.splash(sc, 191, 122, 5, { mist: 1.6, spray: 0.6, ring: 0.1 }); K.splash(sc, 175, 172, 11, { mist: 1.2, ring: 0.1 });
      for (const [x, y, h] of [[132, 206, 34], [228, 204, 40], [262, 214, 30]]) K.fir(sc.front, x, y, h, -1.5);
      mossy(sc.front, r, 118, 226, 12, 7, 'stone', -0.4); mossy(sc.front, r, 250, 232, 15, 9, 'stone', -0.4);
      K.fir(sc.front, 26, 246, 156, -3); K.fir(sc.front, 76, 242, 92, -3);
      return sc;
    }
  });
})(window.FL);
