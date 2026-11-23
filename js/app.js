/* Fire Style Lab — app: the stage, the thumbnail strips, the controls and the frame loop. */
(function (FL) {
  'use strict';
  const $ = id => document.getElementById(id);
  const byId = (list, id) => list.find(x => x.id === id);
  const DEFAULTS = { intensity: 1, wind: 0, speed: 1, sparks: true, smoke: true, glow: true };
  const P = Object.assign({ pal: FL.palettes[0] }, DEFAULTS); // the one set of knobs every style reads
  const state = { style: 'pixel', subject: 'cabin' };
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let paused = reduce, T = 8, last = performance.now(), fps = 60, rr = 0, shown = 0;

  // ---------- a view = one canvas showing one fire in one style ----------
  function View(canvas, cap) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.cap = cap;
    this.key = ''; this.inst = null; this.visible = true; this.lastT = T; this.dirty = true; this.dead = false;
  }
  View.prototype.set = function (styleId, subjectId) {
    const key = styleId + '/' + subjectId; if (key === this.key) return;
    this.key = key; this.dead = false; this.dirty = true;
    try { this.inst = byId(FL.styles, styleId).create(FL.scene(subjectId)); } catch (e) { this.fail(e); }
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
    this.dead = true; console.error('Fire Style Lab: ' + this.key + ' could not draw.', e);
    const c = this.ctx; c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = '#1a0f0d'; c.fillRect(0, 0, this.canvas.width, this.canvas.height);
    c.fillStyle = '#e6dfc8'; c.font = '14px sans-serif'; c.fillText('This style could not draw in this browser.', 12, 26);
  };

  const stage = new View($('stage'), 1280), thumbs = [];
  function addCard(parent, kind, id, name, sub) {
    const b = document.createElement('button'), c = document.createElement('canvas'), n = document.createElement('span');
    b.type = 'button'; b.className = 'card'; b.setAttribute('aria-pressed', 'false');
    c.width = 320; c.height = 240; c.setAttribute('aria-hidden', 'true');
    n.className = 'card-name'; n.textContent = name; b.append(c, n);
    if (sub) { const s = document.createElement('span'); s.className = 'card-sub'; s.textContent = sub; b.append(s); }
    b.addEventListener('click', () => select(kind === 'style' ? { style: id } : { subject: id }));
    parent.appendChild(b); thumbs.push({ view: new View(c, 400), kind, id, el: b });
  }
  FL.styles.forEach(s => addCard($('styles'), 'style', s.id, s.name, s.tech));
  FL.subjects.forEach(s => addCard($(s.kind === 'campfire' ? 'campfires' : 'fireplaces'), 'subject', s.id, s.name));

  function select(next) {
    Object.assign(state, next);
    const st = byId(FL.styles, state.style), su = byId(FL.subjects, state.subject);
    stage.set(st.id, su.id);
    for (const t of thumbs) { // style cards keep the fire, fire cards keep the style
      if (t.kind === 'style') t.view.set(t.id, su.id); else t.view.set(st.id, t.id);
      t.el.setAttribute('aria-pressed', String(t.id === (t.kind === 'style' ? st.id : su.id)));
    }
    $('cap-style').textContent = $('now-style').textContent = st.name;
    $('cap-subject').textContent = $('now-subject').textContent = su.name;
    $('now-tech').textContent = st.tech; $('now-note').textContent = st.note; $('now-blurb').textContent = su.blurb;
    $('now-src').textContent = 'js/styles/' + (st.file || st.id + '.js');
    $('styles-hint').textContent = `${su.name}, drawn ${FL.styles.length} ways.`;
    $('camp-hint').textContent = `Four ways to lay the wood, in ${st.name}.`;
    $('place-hint').textContent = `Four ways to keep the fire indoors, in ${st.name}.`;
    try { history.replaceState(null, '', '#' + su.id + '-' + st.id); } catch (e) { /* sandboxed: the link just stays put */ }
    setVolume();
  }
  function fromHash() {
    const h = location.hash.slice(1), i = h.indexOf('-');
    if (i < 0) return {};
    const su = byId(FL.subjects, h.slice(0, i)), st = byId(FL.styles, h.slice(i + 1));
    return su && st ? { subject: su.id, style: st.id } : {};
  }

  // ---------- controls ----------
  const dirtyAll = () => { stage.dirty = true; thumbs.forEach(t => { t.view.dirty = true; }); };
  function labels() {
    const i = P.intensity, w = Math.round(Math.abs(P.wind) * 30);
    $('o-intensity').textContent = (i < 0.5 ? 'embers' : i < 0.85 ? 'low' : i < 1.15 ? 'steady' : i < 1.35 ? 'high' : 'roaring') + ' · ' + Math.round(i * 100) + '%';
    $('o-wind').textContent = w < 1 ? 'calm' : `${w} km/h ${P.wind < 0 ? '←' : '→'}`;
    $('o-speed').textContent = '×' + P.speed.toFixed(2);
    $('o-fuel').textContent = P.pal.note;
    document.documentElement.style.setProperty('--flame', FL.rgb(P.pal.stops[3]));
    for (const b of $('fuels').children) b.setAttribute('aria-pressed', String(b.dataset.id === P.pal.id));
    for (const k of ['sparks', 'smoke', 'glow']) $('t-' + k).setAttribute('aria-pressed', String(P[k]));
    $('b-pause').textContent = paused ? 'Play' : 'Pause'; $('b-pause').classList.toggle('on', paused);
    setVolume(); dirtyAll();
  }
  for (const k of ['intensity', 'wind', 'speed']) $('c-' + k).addEventListener('input', e => { P[k] = +e.target.value; labels(); });
  for (const k of ['sparks', 'smoke', 'glow']) $('t-' + k).addEventListener('click', () => { P[k] = !P[k]; labels(); });
  FL.palettes.forEach(pal => {
    const b = document.createElement('button'), sw = document.createElement('i');
    b.type = 'button'; b.className = 'fuel'; b.dataset.id = pal.id;
    sw.style.background = `linear-gradient(90deg, ${pal.stops.map(c => FL.rgb(c)).join(',')})`;
    b.append(sw, document.createTextNode(pal.name));
    b.addEventListener('click', () => { P.pal = pal; labels(); });
    $('fuels').appendChild(b);
  });
  $('b-pause').addEventListener('click', () => { paused = !paused; labels(); });
  $('b-reset').addEventListener('click', () => {
    Object.assign(P, DEFAULTS, { pal: FL.palettes[0] });
    for (const k of ['intensity', 'wind', 'speed']) $('c-' + k).value = P[k];
    labels();
  });
  $('stage-fig').addEventListener('keydown', e => {
    const step = (list, cur, d) => list[(list.findIndex(x => x.id === cur) + d + list.length) % list.length].id;
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') select({ style: step(FL.styles, state.style, e.key === 'ArrowRight' ? 1 : -1) });
    else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') select({ subject: step(FL.subjects, state.subject, e.key === 'ArrowDown' ? 1 : -1) });
    else if (e.key === ' ') { paused = !paused; labels(); }
    else return;
    e.preventDefault();
  });

  // ---------- crackle: brown-noise roar plus random filtered pops, all synthesised ----------
  let audio = null;
  function setVolume() {
    if (!audio) return;
    const v = audio.on && !paused ? 0.32 * Math.min(1.3, 0.4 + P.intensity * 0.6) : 0;
    audio.master.gain.setTargetAtTime(v, audio.ac.currentTime, 0.08);
  }
  function startAudio() {
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
    const ac = new AC(), master = ac.createGain(), sr = ac.sampleRate; master.gain.value = 0; master.connect(ac.destination);
    const buf = ac.createBuffer(1, sr * 3, sr), d = buf.getChannelData(0);
    let b = 0; for (let i = 0; i < d.length; i++) { b = (b + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = b * 3.5; }
    const drift = d[d.length - 1] - d[0]; for (let i = 0; i < d.length; i++) d[i] -= drift * i / d.length; // loop without a click
    const bed = ac.createBufferSource(), lp = ac.createBiquadFilter(), bg = ac.createGain();
    bed.buffer = buf; bed.loop = true; lp.type = 'lowpass'; lp.frequency.value = 700; bg.gain.value = 0.55;
    bed.connect(lp); lp.connect(bg); bg.connect(master); bed.start();
    const pb = ac.createBuffer(1, sr * 0.05 | 0, sr), pd = pb.getChannelData(0);
    for (let i = 0; i < pd.length; i++) pd[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / pd.length, 6);
    const a = { ac, master, on: false };
    a.pop = function () {
      if (!a.on) return;
      if (!paused && state.subject !== 'linear') { // a gas burner hisses, it does not pop
        const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
        s.buffer = pb; s.playbackRate.value = 0.5 + Math.random() * 1.6;
        f.type = 'bandpass'; f.frequency.value = 900 + Math.random() * 4200; f.Q.value = 1.2;
        g.gain.value = Math.pow(Math.random(), 2.5) * 0.9 + 0.04;
        s.connect(f); f.connect(g); g.connect(master); s.start();
      }
      setTimeout(a.pop, (30 + Math.random() * 320) / Math.max(0.3, P.intensity * P.speed));
    };
    return a;
  }
  $('b-sound').addEventListener('click', () => {
    if (!audio) audio = startAudio();
    if (!audio) { $('b-sound').textContent = 'No audio in this browser'; return; }
    audio.on = !audio.on;
    if (audio.on) { audio.ac.resume(); audio.pop(); }
    $('b-sound').setAttribute('aria-pressed', String(audio.on));
    $('b-sound').textContent = 'Crackle sound: ' + (audio.on ? 'on' : 'off');
    setVolume();
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
  if ('IntersectionObserver' in window) { // skip canvases that are scrolled out of view
    const views = new Map([[stage.canvas, stage]].concat(thumbs.map(t => [t.view.canvas, t.view])));
    const io = new IntersectionObserver(es => es.forEach(e => { const v = views.get(e.target); v.visible = e.isIntersecting; if (v.visible) v.dirty = true; }), { rootMargin: '80px' });
    views.forEach((v, c) => io.observe(c));
  }

  select(fromHash()); labels(); resize();
  stage.draw(); thumbs.forEach(t => t.view.draw()); // a complete first frame, even when motion is reduced
  window.addEventListener('hashchange', () => select(fromHash()));
  requestAnimationFrame(frame);
})(window.FL);
