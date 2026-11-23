/* Style Lab — water subjects, part 1: four rivers. Like the fires, each one is plain geometry
   (polygons tagged with a material) plus bodies of water from water.js, so any style can draw it.
   back = drawn behind the water, front = drawn over it. d:1 marks fine detail a style may skip. */
(function (FL) {
  'use strict';
  const K = FL.kit;
  // a rock standing in the current: the boulder goes in front, foam gathers round it
  function midRock(sc, r, x, y, rx, ry, k) {
    sc.front.push(...K.blob(r, x, y, rx, ry, 'stone', -0.4));
    K.foam(sc, x, y + ry * 0.35, rx * 1.7, ry * 1.35, k || 1);
  }
  const tuft = (dst, r, x, y, h, m) => { for (let i = 0; i < 3; i++) { const dx = (i - 1) * 2.6, l = (r() - 0.5) * 7; dst.push(K.poly([[x + dx - 1.2, y], [x + dx + 1.2, y], [x + dx + l, y - h * (0.7 + r() * 0.5)]], m, (r() - 0.5) * 2, 1)); } };

  FL.subject({
    id: 'brook', lab: 'water', kind: 'river', name: 'Mountain brook',
    blurb: 'A cold stream stepping down between boulders in a fir wood. Shallow, quick and broken, with foam wherever a rock stands in the way.',
    build() {
      const sc = K.scene(), r = FL.rng(11); sc.sound = { roar: 0.15, babble: 1 };
      K.sky(sc, 66);
      K.ridge(sc.back, r, 46, 22, 82, 'peak', 0, 46);
      K.ridge(sc.back, r, 64, 8, 92, 'hill', -1.5, 30);
      for (let i = 0; i < 12; i++) { const x = 6 + i * 27 + r() * 12; if (Math.abs(x - 158) > 18) K.fir(sc.back, x, 86 + r() * 6, 24 + r() * 14, -1.5); }
      K.ground(sc, 80, 'grass', -1.5);
      for (const [x, y, h] of [[34, 130, 72], [80, 116, 54], [94, 152, 80], [232, 122, 60], [270, 136, 78], [302, 112, 50], [216, 146, 44]]) K.fir(sc.back, x, y, h, r() < 0.5 ? 0 : -1.5);
      const b = FL.ribbon('river', [[158, 81, 2.4], [150, 98, 6], [171, 124, 12], [146, 160, 22], [166, 202, 37], [158, 250, 54]], { speed: 1.3, lanes: 7, rough: 0.55, freq: 1.1 });
      sc.back.push(K.bank(b, 6, 'sand', -1.5)); sc.water.push(b);
      K.foam(sc, 161, 112, 10, 2.5); K.foam(sc, 153, 181, 27, 4); // two small steps in the bed
      for (const [x, y, rx, ry] of [[175, 129, 5, 3.5], [138, 158, 8, 5.5], [161, 167, 5, 3.5], [150, 197, 11, 7.5], [187, 207, 9, 6], [127, 231, 13, 9], [199, 237, 10, 7]]) midRock(sc, r, x, y, rx, ry);
      sc.spray.push({ x: 150, y: 192, w: 12, rate: 9, up: 26 }, { x: 127, y: 225, w: 14, rate: 8, up: 28 });
      for (const [x, y, rx, ry] of [[112, 172, 12, 8], [206, 180, 14, 9], [226, 150, 9, 6]]) { sc.back.push(...K.blob(r, x, y, rx, ry, 'stone', -0.4)); sc.back.push(K.ell(x - 1, y - ry * 0.62, rx * 0.7, ry * 0.3, 'moss', 0, 1)); }
      for (const [x, y, rx, ry] of [[84, 226, 18, 12], [246, 222, 20, 13]]) { sc.front.push(...K.blob(r, x, y, rx, ry, 'stone', -0.4)); sc.front.push(K.ell(x - 2, y - ry * 0.62, rx * 0.7, ry * 0.3, 'moss', 0, 1)); }
      for (let i = 0; i < 9; i++) tuft(sc.front, r, i < 5 ? 40 + r() * 60 : 222 + r() * 70, 212 + r() * 28, 9 + r() * 6, 'grass');
      K.fir(sc.front, 6, 240, 150, -3); K.fir(sc.front, 316, 244, 128, -3);
      return sc;
    }
  });

  FL.subject({
    id: 'meander', lab: 'water', kind: 'river', name: 'Meadow meander',
    blurb: 'A lowland river taking the long way across a hay meadow. Slow, wide and nearly glassy: only a few drifting glints and the odd fish rising.',
    build() {
      const sc = K.scene(), r = FL.rng(23); sc.sound = { roar: 0, babble: 0.55 };
      K.sky(sc, 99);
      K.cloud(sc.back, 70, 30, 60); K.cloud(sc.back, 214, 20, 44); K.cloud(sc.back, 288, 52, 34);
      K.ridge(sc.back, r, 78, 18, 101, 'peak', 0.5, 50);
      K.ridge(sc.back, r, 91, 5, 103, 'hill', -0.5, 34);
      K.ground(sc, 97, 'grass', 0);
      for (const [y, h, s] of [[104, 5, 1], [121, 8, -1], [148, 12, 1], [190, 18, -1]]) sc.back.push(K.poly([[0, y + 3], [320, y], [320, y + h], [0, y + h + 4]], 'grass', s, 1));
      const b = FL.ribbon('river', [[224, 98, 1.2], [200, 103, 3], [140, 112, 6], [112, 126, 10], [150, 143, 15], [214, 159, 22], [226, 187, 31], [170, 215, 45], [118, 252, 64]],
        { speed: 0.45, lanes: 5, rough: 0.03, base: 0.36, freq: 0.8 });
      sc.back.push(K.bank(b, 3.5, 'earth', -0.5)); sc.water.push(b);
      sc.rings.push({ x: 197, y: 177, r: 15, q: 0.34 }, { x: 138, y: 228, r: 22, q: 0.36 });
      for (const [x, y, rx] of [[176, 105, 8], [96, 113, 10], [250, 104, 7], [72, 124, 9]]) sc.back.push(K.ell(x, y, rx, rx * 0.45, 'leaf', -1.5));
      K.tree(sc.back, 264, 117, 26, -0.5); K.tree(sc.back, 288, 121, 20, -1); K.tree(sc.back, 30, 109, 18, -1);
      K.tree(sc.back, 56, 156, 78, 0);
      for (let i = 0; i < 24; i++) { // reeds on the near bank
        const x = i < 18 ? 226 + r() * 92 : r() * 44, h = 20 + r() * 30, l = (r() - 0.5) * 12;
        sc.front.push(K.poly([[x - 1.3, 241], [x + 1.3, 241], [x + l, 241 - h]], 'reed', (r() - 0.5) * 2.4));
        if (r() < 0.4) sc.front.push(K.ell(x + l * 0.96, 243 - h, 1.5, 4, 'trunk', 0, 1));
      }
      return sc;
    }
  });

  FL.subject({
    id: 'rapids', lab: 'water', kind: 'river', name: 'Whitewater rapids',
    blurb: 'A full river forced over a boulder field. Standing waves hold their place while the water tears through them, and every rock throws spray.',
    build() {
      const sc = K.scene(), r = FL.rng(37); sc.sound = { roar: 0.85, babble: 0.5 };
      K.sky(sc, 52);
      K.ridge(sc.back, r, 42, 10, 72, 'hill', -1.5, 40);
      K.ground(sc, 56, 'sand', -1.2);
      const L = K.poly([[0, 46], [96, 60], [120, 74], [102, 110], [62, 150], [0, 192]], 'hill', -0.5), Rt = K.poly([[320, 42], [200, 56], [172, 66], [218, 104], [264, 150], [320, 182]], 'hill', -1);
      L.bg = Rt.bg = 1; sc.back.push(L, Rt);
      for (let i = 0; i < 18; i++) { // firs climbing both banks
        const left = i < 9, k = (i % 9) / 8, x = left ? 6 + k * 96 - r() * 8 : 314 - k * 120 + r() * 8, y = (left ? 150 - k * 76 : 146 - k * 78) - r() * 26;
        K.fir(sc.back, x, Math.max(62, y), 30 + r() * 26 - k * 12, r() < 0.5 ? 0 : -1.5);
      }
      const b = FL.ribbon('river', [[132, 62, 9], [150, 84, 20], [174, 118, 40], [168, 160, 66], [160, 205, 98], [160, 254, 124]], { speed: 2, lanes: 10, rough: 1, base: 0.34, freq: 1.3 });
      sc.water.push(b);
      for (const [x, y, rx, ry] of [[172, 90, 16, 3], [170, 122, 30, 4], [160, 166, 44, 5], [178, 190, 30, 5], [130, 228, 40, 6], [216, 206, 26, 5]]) K.foam(sc, x, y, rx, ry, 0.9); // standing waves
      for (const [x, y, rx, ry, big] of [[160, 104, 7, 5], [196, 132, 9, 6.5], [140, 150, 12, 8, 1], [214, 176, 14, 10, 1], [120, 196, 16, 11, 1], [176, 214, 11, 8], [250, 226, 15, 10, 1]]) {
        midRock(sc, r, x, y, rx, ry, 1.3);
        if (big) sc.spray.push({ x, y: y - ry * 0.4, w: rx * 1.7, rate: 9, up: 30 });
      }
      sc.mist.push({ x: 170, y: 150, w: 90, rate: 0.7, rise: 6, r: 10 });
      for (const [x, y, rx, ry] of [[100, 128, 10, 6], [76, 168, 13, 8], [238, 132, 11, 7], [272, 176, 14, 9], [42, 214, 20, 13], [296, 218, 18, 12]]) sc.front.push(...K.blob(r, x, y, rx, ry, 'stone', -0.4));
      return sc;
    }
  });

  FL.subject({
    id: 'canyon', lab: 'water', kind: 'river', name: 'Canyon river',
    blurb: 'A desert river at the bottom of a sandstone gorge. The walls are banded rock in full sun; the water is the only cool colour in the picture.',
    build() {
      const sc = K.scene(), r = FL.rng(41); sc.sound = { roar: 0.1, babble: 0.7 };
      K.sky(sc, 152);
      const butte = K.poly([[126, 152], [134, 86], [150, 68], [176, 64], [190, 82], [198, 152]], 'sand', -0.3); butte.bg = 1; sc.back.push(butte);
      K.ground(sc, 148, 'sand', 0);
      function wall(side, prof, s) { // prof: [y, x] down the inner edge; strata are drawn as bands across it
        const edge = side < 0 ? 0 : 320, last = prof[prof.length - 1];
        const at = y => { for (let i = 1; i < prof.length; i++) if (y <= prof[i][0]) { const a = prof[i - 1], c = prof[i]; return a[1] + (c[1] - a[1]) * (y - a[0]) / (c[0] - a[0]); } return last[1]; };
        sc.back.push(K.poly([[edge, prof[0][0]]].concat(prof.map(q => [q[1], q[0]]), [[edge, last[0]]]), 'mesa', s));
        for (let y = prof[0][0] + 10 + r() * 8; y < last[0] - 12; y += 14 + r() * 16) {
          const h = 3 + r() * 5; sc.back.push(K.poly([[edge, y], [at(y), y], [at(y + h), y + h], [edge, y + h]], 'mesa', s + (r() < 0.5 ? 1 : -1.2), 1));
        }
      }
      wall(-1, [[0, 132], [60, 141], [118, 128], [153, 137]], 0.8); wall(1, [[0, 186], [50, 182], [104, 197], [153, 186]], 0.3);
      wall(-1, [[0, 84], [44, 97], [98, 80], [140, 105], [186, 78], [216, 0]], -1.5); wall(1, [[0, 232], [56, 222], [110, 241], [150, 220], [190, 251], [218, 320]], -0.5);
      const b = FL.ribbon('river', [[163, 152, 2.5], [152, 166, 7], [171, 185, 14], [150, 211, 27], [170, 254, 46]], { speed: 0.7, lanes: 6, rough: 0.25, base: 0.34 });
      sc.back.push(K.bank(b, 5, 'sand', -1.5)); sc.water.push(b);
      K.foam(sc, 160, 175, 10, 2.5); K.foam(sc, 158, 223, 26, 4, 0.8);
      for (const [x, y, rx] of [[118, 179, 7], [228, 173, 6], [214, 207, 9], [96, 200, 6]]) sc.back.push(K.ell(x, y, rx, rx * 0.55, 'moss', -0.5), K.ell(x - 1, y - rx * 0.2, rx * 0.5, rx * 0.25, 'moss', 1, 1));
      for (const [x, y, rx, ry] of [[198, 197, 8, 5], [106, 216, 13, 8], [244, 226, 16, 10], [132, 190, 5, 3.5]]) sc.front.push(...K.blob(r, x, y, rx, ry, 'mesa', -1));
      return sc;
    }
  });
})(window.FL);
