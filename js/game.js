const $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const SAVE = 'irl-save-v1';

export class Game {
  constructor(config, world, jobs, shop) {
    Object.assign(this, { cfg: config, world, jobs, shop });
    this.cv = $('game'); this.ctx = this.cv.getContext('2d');
    this.keys = {}; this.near = null; this.menuOpen = false;
    this.s = { ...config.start, ...config.player, inCar: false };
    this.car = { ...config.car, a: 0, v: 0 };
    this.min = this.s.hour * 60; this.loadSave();
    addEventListener('resize', () => this.resize()); this.resize();
    addEventListener('keydown', e => this.key(e, true));
    addEventListener('keyup', e => this.key(e, false));
    $('menu').hidden = true;
  }
  resize() { this.cv.width = innerWidth; this.cv.height = innerHeight; }
  start() { this.last = performance.now(); setInterval(() => this.save(true), 15000); requestAnimationFrame(t => this.loop(t)); }

  key(e, down) {
    const k = e.key.toLowerCase(); this.keys[k] = down;
    if (k.startsWith('arrow')) e.preventDefault();
    if (!down) return;
    if (k === 'escape') this.closeMenu();
    if (this.menuOpen) return;
    if (k === 'e' && this.near && !this.s.inCar) this.openMenu(this.near);
    if (k === 'f') this.toggleCar();
    if (k === 'm') this.save();
  }
  toast(t) { const el = $('toast'); el.textContent = t; el.classList.add('on'); clearTimeout(this.tt); this.tt = setTimeout(() => el.classList.remove('on'), 2400); }

  toggleCar() {
    const s = this.s, c = this.car;
    if (s.inCar) { s.inCar = false; s.x = c.x + 50; s.y = c.y; c.v = 0; }
    else if (Math.hypot(s.x - c.x, s.y - c.y) < 90) s.inCar = true;
    else this.toast('Get closer to the car and press F');
  }

  get hour() { return Math.floor(this.min / 60) % 24; }
  get day() { return this.s.day + Math.floor(this.min / 1440); }
  tickNeeds(hours) {
    const s = this.s, cfg = this.cfg, prev = this.day;
    s.hunger = clamp(s.hunger - hours * cfg.hungerPerHour, 0, 100);
    s.energy = clamp(s.energy - hours * cfg.energyPerHour, 0, 100);
    return prev;
  }
  advance(hours) { const prev = this.day; this.min += hours * 60; this.tickNeeds(hours); this.checkRent(prev); }
  checkRent(prevDay) {
    const r = this.cfg.rent;
    for (let d = prevDay + 1; d <= this.day; d++) if (d % r.every === 0) { this.s.money -= r.amount; this.toast(`Rent paid: $${r.amount}`); }
  }

  loop(t) {
    const dt = Math.min(0.05, (t - this.last) / 1000); this.last = t;
    if (!this.menuOpen) this.update(dt);
    this.draw(); this.updateHud();
    requestAnimationFrame(t => this.loop(t));
  }

  update(dt) {
    const s = this.s, k = this.keys, c = this.car, cfg = this.cfg;
    const prev = this.day, mins = dt * cfg.minutesPerSecond;
    this.min += mins; this.tickNeeds(mins / 60); this.checkRent(prev);
    if (s.hunger <= 0 || s.energy <= 0) s.health = clamp(s.health - dt * 1.5, 0, 100);
    if (s.health <= 0) return this.faint();

    const ax = (k.d || k.arrowright ? 1 : 0) - (k.a || k.arrowleft ? 1 : 0);
    const ay = (k.s || k.arrowdown ? 1 : 0) - (k.w || k.arrowup ? 1 : 0);
    if (s.inCar) {
      c.a += ax * cfg.car.turn * dt * clamp(Math.abs(c.v) / 200, 0, 1) * (c.v < 0 ? -1 : 1);
      c.v += -ay * cfg.car.accel * dt;
      if (!ay) c.v *= 1 - 1.5 * dt;
      c.v = clamp(c.v, -200, cfg.car.maxSpeed);
      c.x = clamp(c.x + Math.cos(c.a) * c.v * dt, 20, this.world.width - 20);
      c.y = clamp(c.y + Math.sin(c.a) * c.v * dt, 20, this.world.height - 20);
      for (const b of this.world.buildings) if (c.x > b.x - 10 && c.x < b.x + b.w + 10 && c.y > b.y - 10 && c.y < b.y + b.h + 10) {
        c.x -= Math.cos(c.a) * c.v * dt * 2; c.y -= Math.sin(c.a) * c.v * dt * 2; c.v *= -0.3;
      }
      s.x = c.x; s.y = c.y;
    } else {
      const m = Math.hypot(ax, ay) || 1, sp = cfg.player.speed * (s.energy < 10 ? 0.6 : 1);
      const nx = clamp(s.x + ax / m * sp * dt, 10, this.world.width - 10);
      const ny = clamp(s.y + ay / m * sp * dt, 10, this.world.height - 10);
      const hit = (x, y) => this.world.buildings.some(b => x > b.x - 8 && x < b.x + b.w + 8 && y > b.y - 8 && y < b.y + b.h + 8);
      if (!hit(nx, s.y)) s.x = nx;
      if (!hit(s.x, ny)) s.y = ny;
    }
    this.near = null;
    if (!s.inCar) for (const b of this.world.buildings) if (Math.hypot(s.x - (b.x + b.w / 2), s.y - (b.y + b.h + 16)) < 60) this.near = b;
    const hint = $('hint');
    const text = s.inCar ? 'Driving — press F to get out' : this.near ? `E: enter ${this.near.name}` : Math.hypot(s.x - c.x, s.y - c.y) < 90 ? 'F: drive car' : '';
    hint.style.display = text ? 'block' : 'none'; hint.textContent = text;
  }

  faint() {
    const s = this.s; s.health = 40; s.hunger = 40; s.energy = 40; s.money = Math.max(0, s.money - 50);
    this.min += 8 * 60; s.inCar = false; this.car.v = 0; s.x = 230; s.y = 340;
    this.toast('You collapsed. A $50 clinic bill was charged. You wake up at home.');
  }

  openMenu(b) {
    const s = this.s; this.menuOpen = true;
    const btns = []; let info = '';
    const act = (label, fn, ok = true) => btns.push({ label, fn, ok });
    if (b.type === 'home') {
      info = 'Rest at home.';
      act('Sleep until morning', () => { this.advance((32 - this.hour) % 24 || 8); s.energy = 100; s.health = clamp(s.health + 15, 0, 100); this.toast('You slept well.'); });
      act('Take a nap (2 hours)', () => { this.advance(2); s.energy = clamp(s.energy + 15, 0, 100); });
    } else if (b.type === 'work') {
      info = 'Pick up a shift.';
      for (const j of this.jobs[b.name] || []) act(`${j.name} — $${j.pay} (${j.hours}h)`, () => {
        this.advance(j.hours); s.money += j.pay;
        s.energy = clamp(s.energy - j.energy, 0, 100); s.hunger = clamp(s.hunger - j.hunger, 0, 100);
        this.toast(`Earned $${j.pay}`);
      }, s.energy >= j.energy);
    } else if (b.type === 'shop') {
      info = 'Food and supplies.';
      for (const it of this.shop) act(`${it.name} — $${it.price}`, () => {
        s.money -= it.price; s.hunger = clamp(s.hunger + it.hunger, 0, 100);
        s.health = clamp(s.health + it.health, 0, 100); s.energy = clamp(s.energy + it.energy, 0, 100);
      }, s.money >= it.price);
    } else if (b.type === 'hospital') {
      info = 'Get patched up.';
      act('Full checkup — $40', () => { s.money -= 40; s.health = 100; this.advance(1); }, s.money >= 40);
    } else if (b.type === 'gym') {
      info = 'Train for better health.';
      act('Workout — $10 (1h)', () => { s.money -= 10; this.advance(1); s.energy = clamp(s.energy - 15, 0, 100); s.health = clamp(s.health + 8, 0, 100); }, s.money >= 10 && s.energy >= 15);
    } else if (b.type === 'park') {
      info = 'Fresh air is free.';
      act('Relax for an hour', () => { this.advance(1); s.energy = clamp(s.energy + 10, 0, 100); });
    }
    const m = $('menu'); m.hidden = false; m.innerHTML = `<h2>${b.name}</h2><p>${info}</p>`;
    btns.forEach(x => { const el = document.createElement('button'); el.textContent = x.label; el.disabled = !x.ok;
      el.onclick = () => { x.fn(); this.openMenu(b); }; m.appendChild(el); });
    const c = document.createElement('button'); c.className = 'close'; c.textContent = 'Leave'; c.onclick = () => this.closeMenu(); m.appendChild(c);
    (m.querySelector('button:not(:disabled)') || c).focus();
  }
  closeMenu() { this.menuOpen = false; $('menu').hidden = true; }

  save(quiet) { try { localStorage.setItem(SAVE, JSON.stringify({ s: this.s, min: this.min, car: this.car })); if (!quiet) this.toast('Game saved'); } catch {} }
  loadSave() { try { const d = JSON.parse(localStorage.getItem(SAVE)); if (d) { Object.assign(this.s, d.s); Object.assign(this.car, d.car); this.min = d.min; } } catch {} }

  updateHud() {
    const hh = String(this.hour).padStart(2, '0'), mm = String(Math.floor(this.min % 60)).padStart(2, '0');
    $('clock').textContent = `Day ${this.day} · ${hh}:${mm}`;
    $('money').textContent = '$' + Math.floor(this.s.money);
    const bars = [['Health', 'health', '#d9534f'], ['Hunger', 'hunger', '#e0a030'], ['Energy', 'energy', '#4aa0e0']];
    $('bars').innerHTML = bars.map(([n, k, col]) => `<div class="bar"><i style="width:${this.s[k]}%;background:${col}"></i><b>${n}</b></div>`).join('');
  }

  draw() {
    const { ctx, cv, s, world } = this;
    const camX = clamp(s.x - cv.width / 2, 0, Math.max(0, world.width - cv.width));
    const camY = clamp(s.y - cv.height / 2, 0, Math.max(0, world.height - cv.height));
    ctx.fillStyle = '#6f8f5a'; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.save(); ctx.translate(-camX, -camY);
    ctx.fillStyle = '#3b3f40';
    for (const r of world.roads) ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeStyle = '#e9d36a'; ctx.setLineDash([30, 24]); ctx.lineWidth = 4;
    for (const r of world.roads) { ctx.beginPath(); if (r.w > r.h) { ctx.moveTo(r.x, r.y + r.h / 2); ctx.lineTo(r.x + r.w, r.y + r.h / 2); } else { ctx.moveTo(r.x + r.w / 2, r.y); ctx.lineTo(r.x + r.w / 2, r.y + r.h); } ctx.stroke(); }
    ctx.setLineDash([]);
    ctx.textAlign = 'center'; ctx.font = 'bold 16px Georgia';
    for (const b of world.buildings) {
      ctx.fillStyle = '#0003'; ctx.fillRect(b.x + 8, b.y + 8, b.w, b.h);
      ctx.fillStyle = b.color; ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeStyle = '#1d2b2a'; ctx.lineWidth = 3; ctx.strokeRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = '#1d2b2a'; ctx.fillRect(b.x + b.w / 2 - 16, b.y + b.h - 6, 32, 10);
      ctx.fillStyle = '#fff'; ctx.fillText(b.name, b.x + b.w / 2, b.y + b.h / 2 + 5);
    }
    const c = this.car;
    ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.a);
    ctx.fillStyle = '#c4562f'; ctx.fillRect(-26, -14, 52, 28);
    ctx.fillStyle = '#9fd3e6'; ctx.fillRect(4, -11, 12, 22); ctx.restore();
    if (!s.inCar) { ctx.fillStyle = '#efe3c8'; ctx.beginPath(); ctx.arc(s.x, s.y, 10, 0, 7); ctx.fill(); ctx.strokeStyle = '#1d2b2a'; ctx.lineWidth = 2; ctx.stroke(); }
    ctx.restore();
    const dark = clamp((Math.abs((this.min / 60) % 24 - 13) / 11 - 0.55) * 1.4, 0, 0.6);
    if (dark > 0) { ctx.fillStyle = `rgba(10,15,40,${dark})`; ctx.fillRect(0, 0, cv.width, cv.height); }
  }
}
