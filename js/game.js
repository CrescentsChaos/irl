const $ = i => document.getElementById(i), R = Math.random;
const cl = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
const pick = t => Array.isArray(t) ? t[Math.floor(R() * t.length)] : t;
const KEY = 'irl-text-v1', WD = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
let D, S, view = 'main', opts = [], ev = null;

const day = () => Math.floor(S.t / 1440) + 1, hr = () => (S.t / 60) % 24;
const per = h => h < 5 ? 'night' : h < 12 ? 'morning' : h < 18 ? 'day' : h < 22 ? 'evening' : 'night';
const clock = () => String(Math.floor(hr())).padStart(2, '0') + ':' + String(Math.floor(S.t % 60)).padStart(2, '0');
const log = (t, c = '') => { S.log.push([t, c]); if (S.log.length > 120) S.log.shift(); };
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} };
const pr = c => typeof c === 'number' ? c : Math.min(0.95, c.base + (S.sk[c.sk] || 0) * (c.per || 0.05));

export function start(data) {
  D = data;
  let saved = null; try { saved = JSON.parse(localStorage.getItem(KEY)); } catch {}
  document.addEventListener('keydown', e => { const n = +e.key; if (n >= 1 && n <= 9 && opts[n - 1] && !opts[n - 1].w && e.target.tagName !== 'INPUT') opts[n - 1].f(); });
  if (saved) { S = saved; log('— Welcome back. —', 'sys'); render(); } else intro();
}

function intro() {
  S = { log: [] }; $('status').textContent = '';
  log(D.config.intro, 'sys');
  $('log').innerHTML = S.log.map(l => `<p class="${l[1]}">${l[0]}</p>`).join('');
  $('opts').innerHTML = '<input id="nm" placeholder="Your name" maxlength="20"><button id="go">Begin</button>';
  const go = () => newGame($('nm').value.trim() || 'Alex');
  $('go').onclick = go; $('nm').onkeydown = e => { if (e.key === 'Enter') go(); };
}

function newGame(name) {
  const c = D.config.start;
  S = { name, t: c.hour * 60, loc: c.loc, money: c.money, health: c.health, hunger: c.hunger, energy: c.energy, mood: c.mood, rep: c.rep, heat: c.heat, sk: { ...c.sk }, inv: {}, fl: {}, job: null, owed: 0, wx: 0, log: [] };
  log(D.config.intro, 'sys'); log(`You're ${name}. This is your room on Mill Lane.`, 'sys');
  place(); render(); save();
}

function place() { const L = D.world[S.loc]; log(`${L.name}`, 'place'); log(L.desc[per(hr())] + (L.outside ? ' ' + D.config.weather[S.wx].line : '')); }

function adv(h) {
  let left = h * 60;
  while (left > 0) {
    const s = Math.min(60, left), f = s / 60, d0 = day(); left -= s; S.t += s;
    S.hunger = cl(S.hunger - f * D.config.hungerPerHour); S.energy = cl(S.energy - f * D.config.energyPerHour);
    if (S.hunger <= 0 || S.energy <= 0) S.health = cl(S.health - f * 4);
    S.heat = cl(S.heat - f * D.config.heatDecay);
    if (day() > d0) newDay();
  }
}

function newDay() {
  const r = D.config.rent; S.wx = Math.floor(R() * D.config.weather.length);
  if (day() % r.every) return;
  S.owed += r.amount;
  if (S.money >= S.owed) { S.money -= S.owed; log(`Rent day. $${S.owed} leaves your account.`, 'sys'); S.owed = 0; }
  else { log(`Rent day, and you can't cover it. The landlord leaves a note under your door.`, 'bad'); if (S.owed >= r.amount * 2 && !S.fl.evicted) { S.fl.evicted = 1; log('Your lock has been changed. Pay what you owe to get back in.', 'bad'); } }
}

function fx(e) {
  if (!e) return;
  for (const k of ['health', 'hunger', 'energy', 'mood', 'heat', 'rep']) if (e[k]) S[k] = cl(S[k] + e[k]);
  if (e.money) S.money = Math.max(0, S.money + e.money);
  for (const [k, v] of Object.entries(e.sk || {})) { const b = Math.floor(S.sk[k]); S.sk[k] += v; if (Math.floor(S.sk[k]) > b) log(`Your ${k} improved to ${Math.floor(S.sk[k])}.`, 'good'); }
  if (e.item) S.inv[e.item] = (S.inv[e.item] || 0) + 1;
  if (e.flag) Object.assign(S.fl, e.flag);
  if (e.time) adv(e.time);
}

function why(r) {
  if (!r) return '';
  if (r.money && S.money < r.money) return `Need $${r.money}`;
  if (r.energy && S.energy < r.energy) return 'Too tired';
  if (r.open) { const h = hr(); if (h < r.open[0] || h >= r.open[1]) return `Closed (${r.open[0]}:00–${r.open[1]}:00)`; }
  for (const [k, v] of Object.entries(r.sk || {})) if ((S.sk[k] || 0) < v) return `Needs ${k} ${v}`;
  return '';
}

function act(a, chain = true) {
  if (a.text) log(pick(a.text));
  fx(a.x);
  if (a.chance != null) { const ok = R() < pr(a.chance), o = ok ? a.win : a.lose; if (o) { log(pick(o.text), ok ? 'good' : 'bad'); fx(o.x); } }
  after(chain ? (a.x?.time || 0) : 0);
}

function after(h) {
  if (S.health <= 0) { faint(); return done(); }
  if (h > 0 && !ev && R() < D.config.eventChance * Math.min(2, h / 1.5 + 0.3)) ev = pickEvent();
  done();
}
function done() { view = ev ? 'event' : 'main'; save(); render(); }

function pickEvent() {
  const h = hr(), c = D.events.filter(e => (!e.at || e.at.includes(S.loc)) && (!e.heatMin || S.heat >= e.heatMin) &&
    (!e.hours || (e.hours[0] <= e.hours[1] ? h >= e.hours[0] && h < e.hours[1] : h >= e.hours[0] || h < e.hours[1])));
  const tot = c.reduce((s, e) => s + e.w, 0); let r = R() * tot;
  for (const e of c) if ((r -= e.w) < 0) return e;
  return null;
}

function faint() {
  log('Your vision narrows to a tunnel, then nothing. You come to under fluorescent lights. A nurse says you collapsed in the street.', 'bad');
  S.health = 40; S.hunger = 40; S.energy = 40; S.money = Math.max(0, S.money - 60); S.t += 600; S.loc = 'clinic';
  log('The bill is $60. They tell you to eat and sleep like a person.', 'bad');
}

function go(id) {
  const m = D.world[S.loc].exits[id]; S.loc = id; adv(m / 60); view = 'main'; place(); after(m / 60);
}

function jobOpts(L) {
  const o = [];
  for (const [id, j] of Object.entries(D.jobs)) {
    if (j.loc !== S.loc) continue;
    const cur = S.job?.id === id, lv = cur ? j.levels[S.job.lvl] : j.levels[0];
    const shiftWhy = (() => { const h = hr(); return h < j.shift[0] || h >= j.shift[1] ? `Shifts ${j.shift[0]}:00–${j.shift[1]}:00` : ''; })();
    if (cur) {
      o.push({ l: `Work a shift as ${lv.title} ($${lv.pay}, ${lv.hours}h)`, w: shiftWhy || (S.energy < lv.energy ? 'Too tired' : ''), f: () => work(j, lv) });
      o.push({ l: 'Quit this job', f: () => { S.job = null; log(`You hand in your apron. You're out of work.`, 'sys'); done(); } });
    } else o.push({ l: `Apply for ${lv.title} at ${j.name} ($${lv.pay}/shift)`, w: why(lv.req), f: () => { S.job = { id, lvl: 0, shifts: 0 }; log(`You're hired as ${lv.title} at ${j.name}.`, 'good'); done(); } });
  }
  return o;
}

function work(j, lv) {
  log(`You clock in as ${lv.title}. ${pick(['The hours drag.', 'Time melts into the rhythm.', 'Your back complains by midday.'])}`);
  fx({ time: lv.hours, money: lv.pay, energy: -lv.energy, hunger: -lv.hunger }); S.job.shifts++;
  log(`Shift done. +$${lv.pay}`, 'good');
  const nx = j.levels[S.job.lvl + 1];
  if (nx && lv.promote && S.job.shifts >= lv.promote && !why(nx.req)) { S.job.lvl++; S.job.shifts = 0; log(`The boss calls you over. You're promoted to ${nx.title}!`, 'good'); }
  after(lv.hours);
}

function sleep() {
  let h = (7 - hr() + 24) % 24; h = Math.min(Math.max(h, 6), 10);
  log(`You turn off the light and sleep.`); adv(h);
  S.energy = cl(S.energy + h * 13); S.health = cl(S.health + h * 1.5); S.mood = cl(S.mood + 3);
  log(`You wake at ${clock()}, rested.`, 'good'); after(h);
}

function build() {
  opts = [];
  const L = D.world[S.loc], add = (l, f, w = '') => opts.push({ l, f, w });
  if (view === 'event') { for (const c of ev.choices) add(c.label, () => { const e = ev; ev = null; act(c, false); }, why(c.req)); return; }
  if (view === 'travel') { for (const [id, m] of Object.entries(L.exits)) add(`${D.world[id].name} (${m} min)`, () => go(id)); add('Back', () => { view = 'main'; render(); }); return; }
  if (view === 'shop') { for (const [id, it] of Object.entries(D.items)) if (it.price) add(`${it.name} — $${it.price}`, () => { S.money -= it.price; S.inv[id] = (S.inv[id] || 0) + 1; log(`You buy a ${it.name.toLowerCase()}.`); render(); save(); }, S.money < it.price ? `Need $${it.price}` : ''); add('Back', () => { view = 'main'; render(); }); return; }
  if (view === 'inv') {
    const ids = Object.keys(S.inv).filter(i => S.inv[i] > 0);
    for (const id of ids) add(`Use ${D.items[id].name} (x${S.inv[id]})`, () => { S.inv[id]--; log(D.items[id].text); fx(D.items[id].x); view = 'main'; save(); render(); });
    if (!ids.length) log('Your pockets are empty.', 'sys');
    add('Back', () => { view = 'main'; render(); }); return;
  }
  if (view === 'char') {
    add('Back', () => { view = 'main'; render(); });
    add('Erase save and restart', () => { localStorage.removeItem(KEY); intro(); }); return;
  }
  const locked = L === D.world.room && S.fl.evicted, open = L.open ? why({ open: L.open }) : '';
  for (const a of L.actions) {
    if (locked && a.type !== 'rent') continue;
    if (a.type === 'rent') { if (S.owed > 0) add(`Pay the landlord ($${S.owed})`, () => { S.money -= S.owed; S.owed = 0; S.fl.evicted = 0; log('You pay what you owe. The landlord gives your key back.', 'good'); done(); }, S.money < S.owed ? `Need $${S.owed}` : ''); continue; }
    const w = open || why(a.req);
    add(a.label, a.type === 'sleep' ? sleep : a.type === 'shop' ? () => { view = 'shop'; render(); } : () => act(a), w);
  }
  if (!locked) for (const o of jobOpts(L)) add(o.l, o.f, open ? open : o.w || '');
  add('Go somewhere', () => { view = 'travel'; render(); });
  add('Pockets', () => { view = 'inv'; render(); });
  add('Character', () => { view = 'char'; charInfo(); render(); });
}

function charInfo() {
  const j = S.job ? D.jobs[S.job.id] : null, rep = S.rep < 20 ? 'a stranger' : S.rep < 50 ? 'a familiar face' : 'a local name', heat = S.heat < 10 ? 'clean' : S.heat < 30 ? 'noticed' : S.heat < 60 ? 'watched' : 'wanted';
  log(`${S.name}: ${j ? j.levels[S.job.lvl].title + ' at ' + j.name : 'unemployed'}. Around town you are ${rep}; with the law you are ${heat}. Skills: ` + Object.entries(S.sk).map(([k, v]) => `${k} ${v.toFixed(1)}`).join(', ') + '.', 'sys');
}

function bar(n, v, col) { return `${n}<span class="bar"><i style="width:${v}%;background:${col}"></i></span>`; }

function render() {
  $('status').innerHTML = `<b>${WD[(day() - 1) % 7]} · Day ${day()} · ${clock()}</b> · ${D.config.weather[S.wx].name} · <b>$${S.money}</b>${S.owed ? ` · <span style="color:var(--bad)">owe $${S.owed}</span>` : ''}<br>` +
    bar('Health', S.health, '#e0705a') + bar('Hunger', S.hunger, '#e3a857') + bar('Energy', S.energy, '#6fb0d8') + bar('Mood', S.mood, '#8fcf9a');
  if (ev) { if (S.log[S.log.length - 1]?.[0] !== ev.text) log(ev.text, 'place'); }
  const lg = $('log'); lg.innerHTML = S.log.map(l => `<p class="${l[1]}">${l[0]}</p>`).join(''); lg.scrollTop = lg.scrollHeight;
  build();
  const o = $('opts'); o.innerHTML = '';
  opts.forEach((x, i) => { const b = document.createElement('button'); b.innerHTML = `${i + 1}. ${x.l}${x.w ? `<small>${x.w}</small>` : ''}`; b.disabled = !!x.w; b.onclick = x.f; o.appendChild(b); });
}
