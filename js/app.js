/* Style Lab — app: the section switch, the stage, the thumbnail strips, the controls and the frame loop. */
(function (FL) {
  'use strict';
  const $ = id => document.getElementById(id);
  const byId = (list, id) => list.find(x => x.id === id);
  const el = (tag, cls) => { const e = document.createElement(tag); if (cls) e.className = cls; if (tag === 'button') e.type = 'button'; return e; };

  // A lab is one section of the site: its subjects, its own set of knobs and the words on its controls.
  const LABS = [{
    id: 'fire', noun: 'fire', palettes: FL.palettes, start: { style: 'pixel', subject: 'cabin' },
    lede: 'Eight fires, ten ways to draw them. Pick a fire and an art style, then change the flame, the wind and the fuel to see how each technique holds up in motion.',
    defaults: { intensity: 1, wind: 0, speed: 1, sparks: true, smoke: true, glow: true },
    intensity: { label: 'Flame height', min: 0.3, max: 1.5, words: [[0.5, 'embers'], [0.85, 'low'], [1.15, 'steady'], [1.35, 'high'], [9, 'roaring']] },
    palette: 'Fuel', toggles: [['sparks', 'Sparks'], ['smoke', 'Smoke'], ['glow', 'Firelight']], sound: 'Crackle sound',
    groups: [['campfire', 'Campfires', 'Four ways to lay the wood'], ['fireplace', 'Fireplaces', 'Four ways to keep the fire indoors']]
  }, {
    id: 'water', noun: 'scene', palettes: FL.waters, start: { style: 'pixel', subject: 'plunge' },
    lede: 'Eight stretches of moving water, ten ways to draw them. Pick a river or a waterfall and an art style, then change the flow, the wind and the water itself to see how each technique holds up in motion.',
    defaults: { intensity: 1, wind: 0, speed: 1, foam: true, spray: true, mist: true },
    intensity: { label: 'Flow', min: 0.4, max: 1.6, words: [[0.6, 'trickle'], [0.85, 'low water'], [1.15, 'steady'], [1.4, 'high water'], [9, 'in spate']] },
    palette: 'Water', toggles: [['foam', 'Foam'], ['spray', 'Spray'], ['mist', 'Mist']], sound: 'Water sound',
    groups: [['river', 'Rivers', 'Four rivers, from a brook to a gorge'], ['waterfall', 'Waterfalls', 'Four ways for water to fall']]
  }];
  for (const L of LABS) {
    L.P = Object.assign({ pal: L.palettes[0] }, L.defaults); L.state = Object.assign({}, L.start);
    L.subjects = FL.subjects.filter(s => (s.lab || 'fire') === L.id);
  }
  let lab = LABS[0], P = lab.P; // P: the one set of knobs every style reads
  const impl = (st, id) => (id === 'water' ? st.water : st); // a style keeps one renderer per section
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let paused = reduce, T = 8, last = performance.now(), fps = 60, rr = 0, shown = 0;

  // ---------- a view = one canvas showing one subject in one style ----------
  function View(canvas, cap) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.cap = cap;
    this.key = ''; this.inst = null; this.visible = true; this.lastT = T; this.dirty = true; this.dead = false;
  }
  View.prototype.set = function (styleId, subjectId) {
    const key = styleId + '/' + subjectId; if (key === this.key) return;
    this.key = key; this.dead = false; this.dirty = true;
    try { const sc = FL.scene(subjectId); this.inst = impl(byId(FL.styles, styleId), sc.lab).create(sc); } catch (e) { this.fail(e); }
  };
  View.prototype.size = function () { // backing store follows the CSS box, capped so previews stay cheap
    const w = this.canvas.clientWidth; if (!w) return;
    const cw = Math.max(160, Math.min(this.cap, Math.round(w * Math.min(window.devicePixelRatio || 1, 2))));
    if (cw !== this.canvas.width) { this.canvas.width = cw; this.canvas.height = Math.round(cw * 0.75); this.dirty = true; }
  };
  View.prototype.draw = function () {
    if (this.dead || !this.inst) return;
    const dt = Math.min(0.1, Math.max(0, T - this.lastT)); this.lastT = T; this.dirty = false;
    try { this.inst.draw(this.ctx, this.canvas.width, this.canvas.height, T, dt, P); } catch (e) { this.fail(e); }
  };
  View.prototype.fail = function (e) {
    this.dead = true; this.inst = null; console.error('Style Lab: ' + this.key + ' could not draw.', e);
    const c = this.ctx; c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = '#1a0f0d'; c.fillRect(0, 0, this.canvas.width, this.canvas.height);
    c.fillStyle = '#e6dfc8'; c.font = '14px sans-serif'; c.fillText('This style could not draw in this browser.', 12, 26);
  };

  const stage = new View($('stage'), 1280), views = new Map([[stage.canvas, stage]]);
  let thumbs = [];
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => { // skip canvases scrolled out of view
    const v = views.get(e.target); if (v) { v.visible = e.isIntersecting; if (v.visible) v.dirty = true; }
  }), { rootMargin: '80px' }) : null;
  if (io) io.observe(stage.canvas);
  function addCard(parent, kind, id, name, sub) {
    const b = el('button', 'card'), c = document.createElement('canvas'), n = el('span', 'card-name'), t = { view: new View(c, 400), kind, id, el: b };
    b.setAttribute('aria-pressed', 'false'); c.width = 320; c.height = 240; c.setAttribute('aria-hidden', 'true');
    n.textContent = name; b.append(c, n);
    if (sub != null) { t.sub = el('span', 'card-sub'); t.sub.textContent = sub; b.append(t.sub); }
    b.addEventListener('click', () => select(kind === 'style' ? { style: id } : { subject: id }));
    parent.appendChild(b); thumbs.push(t); views.set(c, t.view); if (io) io.observe(c);
  }
  FL.styles.forEach(s => addCard($('styles'), 'style', s.id, s.name, s.tech));

  function select(next) {
    Object.assign(lab.state, next);
    const st = byId(FL.styles, lab.state.style), su = byId(lab.subjects, lab.state.subject), m = impl(st, lab.id) || st;
    stage.set(st.id, su.id);
    for (const t of thumbs) { // style cards keep the subject, subject cards keep the style
      if (t.kind === 'style') t.view.set(t.id, su.id); else t.view.set(st.id, t.id);
      t.el.setAttribute('aria-pressed', String(t.id === (t.kind === 'style' ? st.id : su.id)));
    }
    $('cap-style').textContent = $('now-style').textContent = st.name;
    $('cap-subject').textContent = $('now-subject').textContent = su.name;
    $('now-tech').textContent = m.tech; $('now-note').textContent = m.note; $('now-blurb').textContent = su.blurb;
    $('now-src').textContent = 'js/styles/' + (st.file || st.id + '.js');
    $('styles-hint').textContent = `${su.name}, drawn ${FL.styles.length} ways.`;
    lab.groups.forEach((g, i) => { $('hint-' + 'ab'[i]).textContent = `${g[2]}, in ${st.name}.`; });
    try { history.replaceState(null, '', '#' + su.id + '-' + st.id); } catch (e) { /* sandboxed: the link just stays put */ }
    setVolume();
  }
  function fromHash() { // "#plunge-ink" picks a subject and a style, "#water" just a section
    const h = location.hash.slice(1), i = h.indexOf('-');
    if (byId(LABS, h)) return { lab: byId(LABS, h) };
    const su = i < 0 ? null : byId(FL.subjects, h.slice(0, i)), st = i < 0 ? null : byId(FL.styles, h.slice(i + 1));
    return su && st ? { lab: byId(LABS, su.lab || 'fire'), sel: { subject: su.id, style: st.id } } : {};
  }

  // ---------- switching section: new subjects, new knobs, new words on the controls ----------
  function setLab(next, sel) {
    lab = next; P = lab.P;
    document.documentElement.dataset.lab = lab.id;
    for (const b of $('labs').children) b.setAttribute('aria-pressed', String(b.dataset.lab === lab.id));
    $('lede').textContent = lab.lede;
    const ci = $('c-intensity'); ci.min = lab.intensity.min; ci.max = lab.intensity.max; $('l-intensity').textContent = lab.intensity.label;
    for (const k of ['intensity', 'wind', 'speed']) $('c-' + k).value = P[k];
    $('pal-label').textContent = lab.palette;
    $('pals').replaceChildren(...lab.palettes.map(pal => {
      const b = el('button', 'fuel'), sw = document.createElement('i');
      b.dataset.id = pal.id; sw.style.background = `linear-gradient(90deg, ${pal.stops.map(c => FL.rgb(c)).join(',')})`;
      b.append(sw, document.createTextNode(pal.name));
      b.addEventListener('click', () => { P.pal = pal; labels(); });
      return b;
    }));
    $('toggles').replaceChildren(...lab.toggles.map(([key, text]) => {
      const b = el('button', 'chip'); b.dataset.key = key; b.textContent = text;
      b.addEventListener('click', () => { P[key] = !P[key]; labels(); });
      return b;
    }));
    for (const t of thumbs) if (t.kind === 'subject') { views.delete(t.view.canvas); if (io) io.unobserve(t.view.canvas); }
    thumbs = thumbs.filter(t => t.kind === 'style');
    for (const t of thumbs) t.sub.textContent = (impl(byId(FL.styles, t.id), lab.id) || {}).tech || '';
    lab.groups.forEach((g, i) => {
      const box = $('group-' + 'ab'[i]); box.replaceChildren(); $('h-' + 'ab'[i]).textContent = g[1];
      lab.subjects.filter(s => s.kind === g[0]).forEach(s => addCard(box, 'subject', s.id, s.name));
    });
    $('foot-noun').textContent = lab.noun;
    select(sel || {}); labels(); resize();
  }
  for (const b of $('labs').children) b.addEventListener('click', () => {
    const next = byId(LABS, b.dataset.lab); if (next !== lab) setLab(next, { style: lab.state.style }); // the style comes along
  });

  // ---------- controls ----------
  const dirtyAll = () => { stage.dirty = true; thumbs.forEach(t => { t.view.dirty = true; }); };
  function labels() {
    const i = P.intensity, w = Math.round(Math.abs(P.wind) * 30);
    $('o-intensity').textContent = lab.intensity.words.find(q => i < q[0])[1] + ' · ' + Math.round(i * 100) + '%';
    $('o-wind').textContent = w < 1 ? 'calm' : `${w} km/h ${P.wind < 0 ? '←' : '→'}`;
    $('o-speed').textContent = '×' + P.speed.toFixed(2);
    $('o-pal').textContent = P.pal.note;
    document.documentElement.style.setProperty('--flame', FL.rgb(P.pal.stops[3]));
    for (const b of $('pals').children) b.setAttribute('aria-pressed', String(b.dataset.id === P.pal.id));
    for (const b of $('toggles').children) b.setAttribute('aria-pressed', String(P[b.dataset.key]));
    $('b-pause').textContent = paused ? 'Play' : 'Pause'; $('b-pause').classList.toggle('on', paused);
    $('b-sound').textContent = lab.sound + ': ' + (audio && audio.on ? 'on' : 'off');
    setVolume(); dirtyAll();
  }
  for (const k of ['intensity', 'wind', 'speed']) $('c-' + k).addEventListener('input', e => { P[k] = +e.target.value; labels(); });
  $('b-pause').addEventListener('click', () => { paused = !paused; labels(); });
  $('b-reset').addEventListener('click', () => {
    Object.assign(P, lab.defaults, { pal: lab.palettes[0] });
    for (const k of ['intensity', 'wind', 'speed']) $('c-' + k).value = P[k];
    labels();
  });
  $('stage-fig').addEventListener('keydown', e => {
    const step = (list, cur, d) => list[(list.findIndex(x => x.id === cur) + d + list.length) % list.length].id;
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') select({ style: step(FL.styles, lab.state.style, e.key === 'ArrowRight' ? 1 : -1) });
    else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') select({ subject: step(lab.subjects, lab.state.subject, e.key === 'ArrowDown' ? 1 : -1) });
    else if (e.key === ' ') { paused = !paused; labels(); }
    else return;
    e.preventDefault();
  });

  // ---------- sound, all synthesised. Fire: a brown-noise roar plus random filtered pops.
  //            Water: a low roar and a hiss for falls, two wandering band-pass voices for the babble of a stream.
  let audio = null;
  function setVolume() {
    if (!audio) return;
    const now = audio.ac.currentTime, to = (node, v) => node.gain.setTargetAtTime(v, now, 0.08), wet = lab.id === 'water';
    to(audio.master, audio.on && !paused ? 0.32 * Math.min(1.3, 0.4 + P.intensity * 0.6) : 0);
    to(audio.fire, wet ? 0 : 1); to(audio.water, wet ? 1 : 0);
    if (wet) {
      const s = FL.scene(lab.state.subject).sound;
      to(audio.roar, 0.75 * s.roar); to(audio.hiss, 0.1 * s.roar + 0.03 * s.babble);
      for (const v of audio.voices) to(v.gain, 0.42 * s.babble);
    }
  }
  function startAudio() {
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
    const ac = new AC(), sr = ac.sampleRate, gain = (v, out) => { const g = ac.createGain(); g.gain.value = v; g.connect(out); return g; };
    const master = gain(0, ac.destination), fire = gain(1, master), water = gain(0, master);
    const buf = ac.createBuffer(1, sr * 3, sr), d = buf.getChannelData(0);
    let b = 0; for (let i = 0; i < d.length; i++) { b = (b + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = b * 3.5; }
    const drift = d[d.length - 1] - d[0]; for (let i = 0; i < d.length; i++) d[i] -= drift * i / d.length; // loop without a click
    const white = ac.createBuffer(1, sr * 2, sr), wd = white.getChannelData(0); for (let i = 0; i < wd.length; i++) wd[i] = Math.random() * 2 - 1;
    const voice = (buffer, type, f, q, v, out) => { // looped noise -> filter -> gain
      const s = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = gain(v, out);
      s.buffer = buffer; s.loop = true; fl.type = type; fl.frequency.value = f; fl.Q.value = q; s.connect(fl); fl.connect(g); s.start();
      return { filter: fl, gain: g };
    };
    voice(buf, 'lowpass', 700, 1, 0.55, fire);
    const pb = ac.createBuffer(1, sr * 0.05 | 0, sr), pd = pb.getChannelData(0);
    for (let i = 0; i < pd.length; i++) pd[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / pd.length, 6);
    const a = { ac, master, fire, water, on: false, roar: voice(buf, 'lowpass', 520, 0.7, 0, water).gain, hiss: voice(white, 'bandpass', 2600, 0.6, 0, water).gain,
      voices: [voice(white, 'bandpass', 700, 7, 0, water), voice(white, 'bandpass', 1300, 9, 0, water)] };
    a.pop = function () {
      if (!a.on) return;
      if (!paused && lab.id === 'fire' && lab.state.subject !== 'linear') { // a gas burner hisses, it does not pop
        const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
        s.buffer = pb; s.playbackRate.value = 0.5 + Math.random() * 1.6;
        f.type = 'bandpass'; f.frequency.value = 900 + Math.random() * 4200; f.Q.value = 1.2;
        g.gain.value = Math.pow(Math.random(), 2.5) * 0.9 + 0.04;
        s.connect(f); f.connect(g); g.connect(fire); s.start();
      }
      setTimeout(a.pop, (30 + Math.random() * 320) / Math.max(0.3, P.intensity * P.speed));
    };
    a.babble = function () { // each voice keeps sliding to a new pitch, which is what makes running water gurgle
      if (!a.on) return;
      for (const v of a.voices) v.filter.frequency.setTargetAtTime(380 + Math.random() * 1500, ac.currentTime, 0.035);
      setTimeout(a.babble, 70 + Math.random() * 150);
    };
    return a;
  }
  $('b-sound').addEventListener('click', () => {
    if (!audio) audio = startAudio();
    if (!audio) { $('b-sound').textContent = 'No audio in this browser'; return; }
    audio.on = !audio.on;
    if (audio.on) { audio.ac.resume(); audio.pop(); audio.babble(); }
    $('b-sound').setAttribute('aria-pressed', String(audio.on));
    labels();
  });

  // ---------- frame loop: the stage every frame, previews with whatever time is left ----------
  function frame(now) {
    requestAnimationFrame(frame);
    const real = Math.min(0.1, (now - last) / 1000); last = now;
    if (real > 0) fps += (1 / real - fps) * 0.06;
    if (!paused) T += real * P.speed;
    if (stage.visible && (!paused || stage.dirty)) stage.draw();
    const t0 = performance.now();
    for (let n = 0; n < thumbs.length && performance.now() - t0 < 6; n++) { // about 6 ms a frame for previews
      const v = thumbs[rr = (rr + 1) % thumbs.length].view;
      if (v.visible && (!paused || v.dirty)) v.draw();
    }
    if (now - shown > 500) {
      shown = now; $('cap-fps').textContent = paused ? 'paused' : Math.round(fps) + ' fps';
      $('cap-size').textContent = stage.canvas.width + '×' + stage.canvas.height;
    }
  }
  function resize() { stage.size(); thumbs.forEach(t => t.view.size()); }
  window.addEventListener('resize', resize);

  const first = fromHash();
  setLab(first.lab || lab, first.sel);
  stage.draw(); thumbs.forEach(t => t.view.draw()); // a complete first frame, even when motion is reduced
  window.addEventListener('hashchange', () => {
    const h = fromHash(); if (!h.lab) return;
    if (h.lab !== lab) { setLab(h.lab, h.sel); stage.draw(); thumbs.forEach(t => t.view.draw()); } else if (h.sel) select(h.sel);
  });
  requestAnimationFrame(frame);
})(window.FL);
