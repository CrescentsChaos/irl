const $ = i => document.getElementById(i), R = Math.random;
const cl = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
const pick = t => Array.isArray(t) ? t[Math.floor(R() * t.length)] : t;
const KEY = 'irl-text-v1', WD = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
let D, S, view = 'main', opts = [], ev = null;

const day = () => Math.floor(S.t / 1440) + 1, hr = () => (S.t / 60) % 24;
const per = h => h < 5 ? 'night' : h < 12 ? 'morning' : h < 18 ? 'day' : h < 22 ? 'evening' : 'night';
const clock = () => String(Math.floor(hr())).padStart(2, '0') + ':' + String(Math.floor(S.t % 60)).padStart(2, '0');
const log = (t, c = '') => { S.log.push([S.tk ? tpl(t) : t, c]); if (S.log.length > 120) S.log.shift(); };
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} };
const fmt = v => { const n = v < 100 ? String(+v.toFixed(1)) : Math.round(v).toLocaleString('en-US'), y = S.tk.cur; return y.length > 2 ? `${n} ${y}` : y + n; };
const tpl = t => [0, 1].reduce(x => x.replace(/@(\d+)/g, (m, n) => fmt(n * S.kc)).replace(/#(\d+)/g, (m, n) => fmt(n * S.kw)).replace(/\{(\w+)\}/g, (m, k) => S.tk[k] ?? m), String(t));
const pr = c => typeof c === 'number' ? c : Math.min(0.95, c.base + (S.sk[c.sk] || 0) * (c.per || 0.05));

export function start(data) {
  D = data;
  let saved = null; try { saved = JSON.parse(localStorage.getItem(KEY)); } catch {}
  document.addEventListener('keydown', e => { const n = +e.key; if (n >= 1 && n <= 9 && opts[n - 1] && !opts[n - 1].w && e.target.tagName !== 'INPUT') opts[n - 1].f(); });
  if (saved && saved.tk) { S = saved; log('— Welcome back. —', 'sys'); render(); } else intro();
}

let LIFE;
const TIER = ['Money is scarce here', 'Life here is modest', 'Life here is middling', 'Life here is comfortable', 'This is one of the wealthiest places on Earth'];
function genLife() {
  const [country, rg, tr, cur, rate, food, city] = D.countries[Math.floor(R() * D.countries.length)].split('|'), T = +tr - 1, rt = +rate, g = D.regions[+rg];
  const q = R(), age = Math.floor(q < 0.12 ? 5 + R() * 13 : q < 0.3 ? 65 + R() * 21 : 18 + R() * 47);
  const ps = D.profs.filter(p => age >= p.a[0] && age <= p.a[1] && T + 1 >= p.tr[0] && T + 1 <= p.tr[1]), p = ps[Math.floor(R() * ps.length)];
  return { age, p, rg: +rg, gd: R() < 0.5 ? 'f' : 'm', tier: T, kw: D.config.W[T] * rt, kc: D.config.C[T] * rt, tk: { country, city, food, cur, eatery: g.eatery, shop: g.shop, cook: g.cook, clerk: g.clerk, friend: g.friend, air: g.air, title: p.t, workplace: p.wp, Workplace: p.wp[0].toUpperCase() + p.wp.slice(1) } };
}
const rnd = (a, b) => a + Math.floor(R() * (b - a + 1));
function genBio(L) {
  const B = D.back, g = D.people[L.rg], a = L.age, T = L.tier, used = new Set(), fn = f => { let n; for (let i = 0; i < 15; i++) { n = pick(g[f || (R() < 0.5 ? 'f' : 'm')]); if (!used.has(n)) break; } used.add(n); return n; }, first = fn(L.gd), sur = pick(g.last), fam = [];
  const add = (role, k, age, lives = false, alive = true) => fam.push({ role, k, name: fn(['mother', 'sister', 'daughter', 'wife'].includes(role) ? 'f' : ['father', 'brother', 'son', 'husband'].includes(role) ? 'm' : ''), age, bond: rnd(30, 85), alive, lives });
  let pa = a + rnd(22, 34); add('mother', 'parent', pa, false, R() < (pa < 75 ? 0.95 : pa < 90 ? 0.55 : 0.12));
  pa = a + rnd(24, 38); add('father', 'parent', pa, false, R() < (pa < 75 ? 0.93 : pa < 90 ? 0.5 : 0.1));
  for (let i = rnd(0, 3); i > 0; i--) add(R() < 0.5 ? 'brother' : 'sister', 'sibling', Math.max(1, a + rnd(-8, 8)));
  let home = 'alone';
  if (a < 18 || (a < 31 && R() < (T < 2 ? 0.75 : 0.5))) { home = 'family'; fam.forEach(p => { if (p.alive && (p.k === 'parent' || (p.k === 'sibling' && (a < 18 || p.age < a + 3)))) p.lives = true; }); }
  else if (a >= 24 && R() < (a < 30 ? 0.35 : 0.65)) { add(L.gd === 'm' ? 'wife' : 'husband', 'spouse', Math.max(18, a + rnd(-5, 5)), true); home = 'spouse'; }
  else if (a >= 62 && R() < 0.4) add(L.gd === 'm' ? 'wife' : 'husband', 'spouse', a, false, false);
  const sp = fam.find(p => p.k === 'spouse' && p.alive);
  if (a >= 26 && home !== 'family' && (sp || R() < 0.25)) for (let i = rnd(0, 3); i > 0; i--) { const ca = a - rnd(22, 34); if (ca >= 0) add(R() < 0.5 ? 'son' : 'daughter', 'child', ca, !!sp && ca < 18); }
  const livers = fam.filter(p => p.lives); if (!livers.length) home = 'alone';
  const born = R() < 0.7, ts = [...B.traits].sort(() => R() - 0.5).slice(0, 2);
  const ei = a < 12 ? 0 : a < 18 ? 1 : (() => { const e = R() + T * 0.12; return e < 0.35 ? 0 : e < 0.7 ? 1 : e < 0.95 ? 2 : 3; })();
  const eduT = a < 12 ? 'are in primary school' : a < 18 ? 'are in secondary school' : ['left school early', 'finished secondary school', 'trained in a trade', 'went to university'][ei];
  const homeDesc = home === 'alone' ? 'Your place in {city}: a bed, a desk, a laptop, and the quiet of your own routine.' : home === 'spouse' ? `Home with ${sp.name}: two mugs on the counter, one still warm.` : `Home is crowded and warm. ${livers[0].name} is already up and the kitchen smells of {food}.`;
  return { sur: ((q) => q[L.gd === 'f' && q[1] ? 1 : 0])(sur.split('/')), first, fam, ts, ei, eduT, born, home, homeDesc, homeName: home === 'alone' ? 'Your place' : home === 'spouse' ? 'Home' : 'Family home', years: born ? a : rnd(2, Math.max(2, a - 16)), moved: pick(B.moved),
    fr: [0, 1].map(() => ({ name: fn(R() < 0.75 ? L.gd : L.gd === 'm' ? 'f' : 'm'), tie: pick(B.ties) })), keep: pick(B.keepsakes), hobby: pick(B.hobbies), mem: [pick(B.child), pick(B.turn), pick(B.regret)] };
}
const story = (L, b) => [
  `${b.born ? 'Born and raised in {city}, {country}.' : `You moved to {city}, {country}, ${b.years} years ago ${b.moved}.`} ${TIER[L.tier]}. You are ${L.p.t.toLowerCase()}.`,
  `You ${b.eduT}. People call you ${b.ts[0].n} and ${b.ts[1].n}. You love ${b.hobby}.`,
  `${b.home === 'alone' ? 'You live alone.' : 'You live with ' + b.fam.filter(p => p.lives).map(p => `${p.name} (${p.role})`).join(', ') + '.'} Family: ${b.fam.map(p => p.alive ? `${p.role} ${p.name} (${p.age})` : `late ${p.role} ${p.name}`).join(', ')}.`,
  `Friends: ${b.fr.map(f => `${f.name} (${f.tie})`).join(', ')}.`];
export function intro() {
  LIFE = genLife(); const L = LIFE, b = L.bio = genBio(L); S = { log: [], kw: L.kw, kc: L.kc, tk: { ...L.tk, friend: b.fr[0].name } };
  $('status').textContent = ''; log(`${b.first} ${b.sur}, ${L.age}.`, 'place'); story(L, b).forEach(t => log(t, 'sys'));
  $('log').innerHTML = S.log.map(l => `<p class="${l[1]}">${l[0]}</p>`).join('');
  $('opts').innerHTML = '<input id="nm" placeholder="Your first name (optional)" maxlength="20"><button id="go">Begin this life</button><button id="rr">Reroll (new person)</button>';
  const go = () => newGame($('nm').value.trim());
  $('go').onclick = go; $('rr').onclick = intro; $('nm').onkeydown = e => { if (e.key === 'Enter') go(); };
}
export const dbg = () => ({ opts, S, view, ev });
export function newGame(typed) {
  const c = D.config.start, L = LIFE, b = L.bio, a = L.age, p = L.p, fam = b.fam, fit = a < 13 ? 0.5 : a < 18 ? 1 : a < 50 ? 1.5 : a < 65 ? 1 : 0.5;
  const ft = k => fam.find(x => x.k === k && x.alive && (k !== 'child' || x.lives))?.name, name = `${typed || b.first} ${b.sur}`;
  const tr = f => b.ts.reduce((s, t) => s + (t[f] || 0), 0);
  S = { name, age: a, t: c.hour * 60, loc: 'room', money: Math.round((a < 13 ? 15 : 60 + R() * 180) * L.kw * 10) / 10, health: a >= 65 ? 70 : 100, hunger: c.hunger, energy: c.energy, mood: cl(c.mood + tr('mood')), rep: Math.min(60, 10 + Math.round(b.years * 1.2)) + tr('rep'), heat: 0,
    sk: { fitness: fit, charisma: 1, intellect: (a < 13 ? 0.5 : 1) + [0, 0.2, 0.4, 0.8][b.ei], street: 0 }, inv: { keepsake: 1 }, fl: { withFamily: b.home === 'family' ? 1 : 0 }, job: null, owed: 0, wx: 0, log: [],
    fam, fr: b.fr, mem: b.mem, memi: 0, traits: b.ts.map(t => t.n), kw: L.kw, kc: L.kc, ef: a >= 65 ? 1.3 : 1, prof: p, tier: L.tier,
    tk: { ...L.tk, name, friend: b.fr[0].name, keepsake: b.keep, homeName: b.homeName, homeDesc: b.homeDesc, parent: ft('parent'), sibling: ft('sibling'), spouse: ft('spouse'), child: ft('child') } };
  for (const t of b.ts) for (const [k, v] of Object.entries(t.sk || {})) S.sk[k] += v;
  for (const [k, v] of Object.entries(p.sk || {})) S.sk[k] += v;
  view = 'main'; ev = null; log(`${name}, ${a}.`, 'place'); story(L, b).forEach(t => log(t, 'sys'));
  log('It is an ordinary morning. Life was already going on before you opened your eyes.', 'sys'); place(); render(); save();
}
function famAct(p) {
  log(pick(p.lives ? [`You sit with ${p.name} and talk about small things.`, `${p.name} tells a story you've heard before. You listen anyway.`, `You and ${p.name} share a quiet meal.`] : [`You call ${p.name}. The line crackles, then settles into familiar talk.`, `${p.name} fills you in on everyone you both know.`]));
  p.bond = cl(p.bond + 4); fx({ time: p.lives ? 1 : 0.33, mood: p.bond > 60 ? 5 : 3 }); after(p.lives ? 1 : 0.33);
}
function thinkBack() { const i = S.memi++ % S.mem.length; log(`You think back. ${S.mem[i]}`, 'sys'); fx({ time: 0.25, mood: [4, -2, -3][i] }); after(0.25); }

function place() { const L = D.world[S.loc]; log(`${L.name}`, 'place'); log(L.desc[per(hr())] + (L.outside ? ' ' + D.config.weather[S.wx].line + ' ' + S.tk.air : '')); }

function adv(h) {
  let left = h * 60;
  while (left > 0) {
    const s = Math.min(60, left), f = s / 60, d0 = day(); left -= s; S.t += s;
    S.hunger = cl(S.hunger - f * D.config.hungerPerHour); S.energy = cl(S.energy - f * D.config.energyPerHour * S.ef);
    if (S.hunger <= 0 || S.energy <= 0) S.health = cl(S.health - f * 4);
    S.heat = cl(S.heat - f * D.config.heatDecay);
    if (day() > d0) newDay();
  }
}

function newDay() {
  const r = D.config.rent; S.wx = Math.floor(R() * D.config.weather.length);
  if (day() % 365 === 0) { S.age++; log(`It's your birthday. You turn ${S.age}.`, 'good'); }
  if (day() % r.every) return;
  if (S.prof.k === 'r') { const p = S.prof.pay * S.kw; S.money += p; log(`Your pension arrives: +${fmt(p)}.`, 'good'); }
  if (S.age < 18 || S.fl.withFamily) return;
  S.owed += Math.round(r.amount * S.kc * 10) / 10;
  if (S.money >= S.owed) { S.money -= S.owed; log(`Rent day. ${fmt(S.owed)} leaves your pocket.`, 'sys'); S.owed = 0; }
  else { log(`Rent day, and you can't cover it. The landlord leaves a note under your door.`, 'bad'); if (S.owed >= r.amount * S.kc * 2 && !S.fl.evicted) { S.fl.evicted = 1; log('Your lock has been changed. Pay what you owe to get back in.', 'bad'); } }
}

function fx(e) {
  if (!e) return;
  for (const k of ['health', 'hunger', 'energy', 'mood', 'heat', 'rep']) if (e[k]) S[k] = cl(S[k] + e[k]);
  if (e.money) S.money = Math.max(0, Math.round((S.money + e.money * (e.money > 0 ? S.kw : S.kc)) * 10) / 10);
  for (const [k, v] of Object.entries(e.sk || {})) { const b = Math.floor(S.sk[k]); S.sk[k] += v; if (Math.floor(S.sk[k]) > b) log(`Your ${k} improved to ${Math.floor(S.sk[k])}.`, 'good'); }
  for (const [k, v] of Object.entries(e.bond || {})) { const p = S.fam.find(p => p.k === k && p.alive); if (p) p.bond = cl(p.bond + v); }
  if (e.item) S.inv[e.item] = (S.inv[e.item] || 0) + 1;
  if (e.flag) Object.assign(S.fl, e.flag);
  if (e.time) adv(e.time);
}

function why(r) {
  if (!r) return '';
  if (r.money && S.money < r.money * S.kc) return `Need ${fmt(r.money * S.kc)}`;
  if (r.age && (S.age < r.age[0] || S.age > r.age[1])) return `Age ${r.age[0]}+`;
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
  const h = hr(), c = D.events.filter(e => (!e.at || e.at.includes(S.loc)) && (!e.has || S.tk[e.has]) && (!e.heatMin || S.heat >= e.heatMin) &&
    (!e.hours || (e.hours[0] <= e.hours[1] ? h >= e.hours[0] && h < e.hours[1] : h >= e.hours[0] || h < e.hours[1])));
  const tot = c.reduce((s, e) => s + e.w, 0); let r = R() * tot;
  for (const e of c) if ((r -= e.w) < 0) return e;
  return null;
}

function faint() {
  log('Your vision narrows to a tunnel, then nothing. You come to under fluorescent lights. A nurse says you collapsed in the street.', 'bad');
  S.health = 40; S.hunger = 40; S.energy = 40; S.money = Math.max(0, Math.round(S.money - 60 * S.kc)); S.t += 600; S.loc = 'clinic';
  log('The bill is @60. They tell you to eat and sleep like a person.', 'bad');
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
      o.push({ l: `Work a shift as ${lv.title} (#${lv.pay}, ${lv.hours}h)`, w: shiftWhy || (S.energy < lv.energy ? 'Too tired' : ''), f: () => work(j, lv) });
      o.push({ l: 'Quit this job', f: () => { S.job = null; log(`You hand in your apron. You're out of work.`, 'sys'); done(); } });
    } else o.push({ l: `Apply for ${lv.title} at ${j.name} (#${lv.pay}/shift)`, w: why(lv.req), f: () => { S.job = { id, lvl: 0, shifts: 0 }; log(`You're hired as ${lv.title} at ${j.name}.`, 'good'); done(); } });
  }
  return o;
}

function work(j, lv) {
  log(`You clock in as ${lv.title}. ${pick(['The hours drag.', 'Time melts into the rhythm.', 'Your back complains by midday.'])}`);
  fx({ time: lv.hours, money: lv.pay, energy: -lv.energy, hunger: -lv.hunger }); S.job.shifts++;
  log(`Shift done. +#${lv.pay}`, 'good');
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
  if (view === 'shop') { for (const [id, it] of Object.entries(D.items)) if (it.price) add(`${it.name} — @${it.price}`, () => { S.money -= Math.round(it.price * S.kc * 10) / 10; S.inv[id] = (S.inv[id] || 0) + 1; log(`You buy a ${it.name.toLowerCase()}.`); render(); save(); }, S.money < Math.round(it.price * S.kc * 10) / 10 ? `Need @${it.price}` : ''); add('Back', () => { view = 'main'; render(); }); return; }
  if (view === 'inv') {
    const ids = Object.keys(S.inv).filter(i => S.inv[i] > 0);
    for (const id of ids) add(`Use ${D.items[id].name} (x${S.inv[id]})`, () => { if (!D.items[id].keep) S.inv[id]--; log(D.items[id].text); fx(D.items[id].x); view = 'main'; save(); render(); });
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
    if (a.type === 'rent') { if (S.owed > 0) add(`Pay the landlord (${fmt(S.owed)})`, () => { S.money -= S.owed; S.owed = 0; S.fl.evicted = 0; log('You pay what you owe. The landlord gives your key back.', 'good'); done(); }, S.money < S.owed ? `Need ${fmt(S.owed)}` : ''); continue; }
    if (a.type === 'prof') { profOpt(add); continue; }
    const w = open || why(a.req);
    add(a.label, a.type === 'sleep' ? sleep : a.type === 'shop' ? () => { view = 'shop'; render(); } : () => act(a), w);
  }
  if (S.loc === 'room' && !locked) { for (const p of [...S.fam.filter(p => p.alive)].sort((x, y) => y.lives - x.lives).slice(0, 4)) add(p.lives ? `Spend time with ${p.name}, your ${p.role} (1h)` : `Phone ${p.name}, your ${p.role} (20m)`, () => famAct(p)); add('Think back on your life (15m)', thinkBack); }
  if (!locked) for (const o of jobOpts(L)) add(o.l, o.f, open ? open : o.w || '');
  add('Go somewhere', () => { view = 'travel'; render(); });
  add('Pockets', () => { view = 'inv'; render(); });
  add('Character', () => { view = 'char'; charInfo(); render(); });
}

function charInfo() {
  const j = S.job ? D.jobs[S.job.id] : null, rep = S.rep < 20 ? 'a stranger' : S.rep < 50 ? 'a familiar face' : 'a local name', heat = S.heat < 10 ? 'clean' : S.heat < 30 ? 'noticed' : S.heat < 60 ? 'watched' : 'wanted';
  log(`${S.name}, ${S.age}: ${S.prof.t.toLowerCase()} in {city}, {country}${j ? '; side job: ' + j.levels[S.job.lvl].title : ''}. Around town you are ${rep}; with the law you are ${heat}. Skills: ` + Object.entries(S.sk).map(([k, v]) => `${k} ${v.toFixed(1)}`).join(', ') + '.', 'sys');
  log(`You are ${S.traits.join(' and ')}. Family: ` + S.fam.map(p => p.alive ? `${p.role} ${p.name} (${p.bond > 69 ? 'close' : p.bond > 44 ? 'warm' : 'distant'})` : `late ${p.role} ${p.name}`).join(', ') + '. Friends: ' + S.fr.map(f => f.name).join(', ') + '.', 'sys');
}
function profOpt(add) {
  const p = S.prof, h = hr();
  if (p.k === 'w') add(`Work a shift as ${p.t.toLowerCase()} (#${p.pay}, ${p.h}h)`, () => { log(pick(['The hours drag.', 'You settle into the rhythm.', 'The work is hard but familiar.'])); fx({ time: p.h, money: p.pay, energy: -p.e, hunger: -p.hu }); log(`Shift done. +#${p.pay}`, 'good'); after(p.h); }, h < 6 || h >= 20 ? 'Off hours (6:00–20:00)' : S.energy < p.e ? 'Too tired' : '');
  else if (p.k === 's') add('Attend school (6h)', () => { log('You sit through lessons, half listening, half daydreaming.'); fx({ time: 6, energy: -10, hunger: -8, mood: -2, sk: { intellect: 0.3 } }); after(6); }, h < 7 || h >= 15 ? 'School is closed' : '');
  else add(`Spend time at ${p.wp} (2h)`, () => { log('You spend a gentle afternoon among familiar faces.'); fx({ time: 2, mood: 4, sk: { charisma: 0.1 } }); after(2); });
}

function bar(n, v, col) { return `${n}<span class="bar"><i style="width:${v}%;background:${col}"></i></span>`; }

function render() {
  $('status').innerHTML = `<b>${WD[(day() - 1) % 7]} · Day ${day()} · ${clock()}</b> · ${D.config.weather[S.wx].name} · ${S.tk.city}, age ${S.age} · <b>${fmt(S.money)}</b>${S.owed ? ` · <span style="color:var(--bad)">owe ${fmt(S.owed)}</span>` : ''}<br>` +
    bar('Health', S.health, '#e0705a') + bar('Hunger', S.hunger, '#e3a857') + bar('Energy', S.energy, '#6fb0d8') + bar('Mood', S.mood, '#8fcf9a');
  if (ev) { if (S.log[S.log.length - 1]?.[0] !== tpl(ev.text)) log(ev.text, 'place'); }
  const lg = $('log'); lg.innerHTML = S.log.map(l => `<p class="${l[1]}">${l[0]}</p>`).join(''); lg.scrollTop = lg.scrollHeight;
  build();
  const o = $('opts'); o.innerHTML = '';
  opts.forEach((x, i) => { const b = document.createElement('button'); b.innerHTML = `${i + 1}. ${tpl(x.l)}${x.w ? `<small>${tpl(x.w)}</small>` : ''}`; b.disabled = !!x.w; b.onclick = x.f; o.appendChild(b); });
}
