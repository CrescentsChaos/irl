// Natural disasters: geography-aware hazards, warnings, impact, aftermath, recovery.
// All text and tuning live in data/disasters.json. The engine hooks are in game.js (search "DZ.").
import { profile, dayWx } from './weather.js';
import { climate, seasonOf, dateOf } from './calendar.js';

const LOCK = new Set('Afghanistan|Andorra|Armenia|Austria|Azerbaijan|Belarus|Bhutan|Bolivia|Botswana|Burkina Faso|Burundi|Central African Republic|Chad|Czechia|Eswatini|Ethiopia|Hungary|Kazakhstan|Kosovo|Kyrgyzstan|Laos|Lesotho|Liechtenstein|Luxembourg|Malawi|Mali|Moldova|Mongolia|Nepal|Niger|North Macedonia|Paraguay|Rwanda|San Marino|Serbia|Slovakia|South Sudan|Switzerland|Tajikistan|Turkmenistan|Uganda|Uzbekistan|Vatican City|Zambia|Zimbabwe'.split('|'));
const HURR = new Set('Bahamas|Cuba|Haiti|Dominican Republic|Jamaica|Belize|Honduras|Nicaragua|Mexico|United States|Antigua and Barbuda|Barbados|Dominica|Grenada|Saint Kitts and Nevis|Saint Lucia|Saint Vincent and the Grenadines|Guatemala|El Salvador|Trinidad and Tobago|Costa Rica|Panama|Venezuela|Canada|Portugal|Ireland|United Kingdom'.split('|'));
const TYPH = new Set('Philippines|Taiwan|Japan|China|Vietnam|South Korea|North Korea|Palau|Micronesia|Marshall Islands|Thailand|Laos|Cambodia'.split('|'));
const INTER = 2, STOP = 3, CONDS = ['pw', 'wt', 'fd', 'rd', 'sh', 'wk', 'sc', 'net', 'air'];
const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const isOut = l => l === 'street' || l === 'alley' || l === 'docks';

export function initDisasters(api) {
  const { R, pick, rnd, cl, say, note, fx, people, day, hr } = api;
  const S = () => api.getS(), DD = () => api.getD().dz, CF = () => DD().cfg, TX = () => DD().txt;
  let HM = null, GC = null;
  const H = () => { if (!HM) { HM = new Map(); for (const h of DD().haz) { for (const k of ['hi', 'mid', 'lo']) h['_' + k] = new Set(h[k] ? h[k].split('|') : []); HM.set(h.id, h); } } return HM; };
  const hz = id => H().get(id), HL = () => [...H().values()], rn = (a, b) => a + R() * (b - a);

  const blank = () => ({ f: DD().cfg.fdef, prep: {}, sched: [], act: [], q: [], c: {}, cm: {}, dm: 0, disp: null, inj: [], tr: 0, pf: 1, hist: [], cool: 0, big: 0, seen: {}, ins: 0, insD: 0, claim: 0, wat: 0, sd: 0, nb: 0, news: '', pd: 0, fl: '', uid: 0, wxo: {}, lh: null, ap: 0, hosp: 0 });
  function migrate() { const s = S(); s.dz = Object.assign(blank(), s.dz || {}); return s.dz; }
  const Z = () => { const s = S(); return s.dz && s.dz.q ? s.dz : migrate(); };

  //// ===== geography and risk =====
  function geo() {
    const s = S(), c = s.tk.country; if (GC && GC.c === c) return GC;
    const pr = profile(c), z = {};
    for (const h of HL()) {
      let v = h._hi.has(c) ? 1 : h._mid.has(c) ? 0.5 : h._lo.has(c) ? 0.2 : (h.zd || 0);
      if (h.clim) for (const k of ['arid', 'trop', 'cold', 'med']) if (pr[k] && h.clim[k] != null) v *= h.clim[k];
      if (h.coast && LOCK.has(c)) v = 0; z[h.id] = v;
    }
    return GC = { c, z, coast: !LOCK.has(c), pr };
  }
  const freq = () => DD().cfg.freq[Z().f][1];
  function rates(f = freq()) {
    const s = S(), g = geo(), ss = api.ssn();
    return HL().map(h => ({ h, p: h.rate * g.z[h.id] * (h.ssn?.[ss] ?? 1) * (h.tierM ? h.tierM[s.tier] : 1) * f })).filter(x => x.p > 0.002);
  }
  const cycName = () => { const c = S().tk.country; return HURR.has(c) ? 'hurricane' : TYPH.has(c) ? 'typhoon' : 'cyclone'; };
  const famName = () => { const p = people().filter(x => x.alive && x.kind === 'family').sort((a, b) => b.bond - a.bond)[0] || people().find(x => x.alive); return p ? p.name : 'someone close'; };
  function neighbor() {
    const s = S(); let p = (s.know || []).find(x => x.key === 'neighbor');
    if (!p) { p = api.newPerson({ role: 'your neighbor', how: 'you live next door to each other', bond: 25, age: [28, 72] }); p.key = 'neighbor'; }
    return p;
  }
  function fill(t, o = {}) {
    if (t == null) return '';
    t = String(t);
    if (t.includes('{cyc}')) t = t.replace(/\{cyc\}/g, cycName());
    if (t.includes('{neigh}')) t = t.replace(/\{neigh\}/g, neighbor().name);
    if (t.includes('{kin}')) t = t.replace(/\{kin\}/g, famName());
    if (o.inj) t = t.replace(/\{inj\}/g, o.inj);
    return t;
  }
  const ageF = (a, h) => a < 12 ? (h?.af?.[0] ?? 1.3) : a >= 65 ? (h?.af?.[1] ?? 1.5) : 1;
  const vul = (age, h, health = 100) => CF().tierV[S().tier] * ageF(age, h) * (1 + Math.max(0, 60 - health) * 0.005);
  function prepVal() {
    const Zz = Z(), d = day(); let v = 0;
    for (const p of DD().prep) { const t = Zz.prep[p.id]; if (t == null || (p.fresh && d - t > p.fresh)) continue; v += p.v; }
    return Math.min(100, v + Math.min(10, Zz.hist.length * 2));
  }
  const pprot = () => prepVal() * 0.0045;
  const fresh = id => { const p = DD().prep.find(x => x.id === id), t = Z().prep[id]; return t != null && (!p.fresh || day() - t <= p.fresh); };
  const free = () => S().age < 18 || S().fl.withFamily;

  //// ===== weather imprint (disasters show up in the forecast) =====
  function wxSet(h, e) {
    const w = h.wx, Zz = Z(), s = S(); if (!w) return;
    const put = (d, kind, ws, dT, pt) => { delete Zz.wxo[d]; const b = dayWx(s, d); Zz.wxo[d] = { kind, mean: b.mean + (dT || 0), ws: Math.max(b.ws, ws || 0), pop: 95, pt: pt || null }; };
    const kind = w.k[e.sev - 1], rainy = /rain|snow|sleet|thunder|hail/.test(kind);
    put(e.day, kind, w.ws?.[e.sev - 1], w.dT, w.du ? { st: Math.max(0, e.hour - 1), du: w.du[e.sev - 1] } : (rainy ? { st: Math.max(0, e.hour - 1), du: 3 + e.sev } : null));
    if (w.pre && e.day - 1 > day()) put(e.day - 1, w.pre, 0, w.dT / 2, { st: 8, du: 8 });
  }

  //// ===== scheduling =====
  function pickSev(h) {
    const w = (h.sw || CF().sev).slice(), lf = api.luckF(); let big = Z().big > day();
    for (let i = 0; i < 5; i++) w[i] *= Math.max(0.2, 1 - (i - 1.5) * lf * 1.2);
    let r = R() * w.reduce((a, b) => a + b, 0), sev = 5; for (let i = 0; i < 5; i++) if ((r -= w[i]) < 0) { sev = i + 1; break; }
    return big && sev >= 4 ? 3 : sev;
  }
  function spawn(h, sev, o = {}) {
    const Zz = Z(), d = day(), nowH = Math.floor(hr()), gap = h.gap ?? 2;
    const e = { id: ++Zz.uid, k: h.id, sev, nm: fill(h.nm[sev - 1]), ic: h.ic, day: d, hour: 0, wd: null, wh: 0, ws: 0, fired: 0, resp: {} };
    if (o.sec) {
      const lag = rnd(o.lag?.[0] ?? 0, o.lag?.[1] ?? 0);
      if (lag > 0) { e.day = d + lag; e.hour = rnd(8, 20); if (h.warn) { e.wd = e.day - 1; e.wh = 0; } }
      else if (h.warn) { e.wd = d; e.wh = nowH; e.hour = nowH + gap; if (e.hour > 23) { e.day = d + 1; e.hour -= 24; } }
      else { e.hour = nowH + 1; if (e.hour > 23) { e.day = d + 1; e.hour = 0; } }
    } else if (h.warn) {
      const lead = rnd(h.warn[0], h.warn[1]);
      if (lead >= 1) { e.wd = d; e.wh = 0; e.day = d + lead; e.hour = rnd(8, 20); }
      else { e.wd = d; e.wh = rnd(5, 15); e.hour = Math.min(23, e.wh + gap); }
    } else e.hour = h.sudden ? rnd(0, 23) : rnd(8, 18);
    if (h.wx) wxSet(h, e);
    if (!o.sec) { Zz.cool = d + CF().gap; if (sev >= 4) Zz.big = d + CF().bigGap; }
    Zz.sched.push(e); return e;
  }
  function roll() {
    const Zz = Z(), d = day(); if (!freq() || d <= CF().grace || Zz.cool > d || Zz.act.length + Zz.sched.length >= 3) return;
    const rt = rates(), tot = rt.reduce((a, x) => a + x.p, 0); if (!tot || R() >= tot / 365) return;
    let r = R() * tot, h = rt[0].h; for (const x of rt) if ((r -= x.p) < 0) { h = x.h; break; }
    spawn(h, pickSev(h));
  }
  const when = e => { const n = e.day - day(); return n <= 0 ? `today around ${String(e.hour).padStart(2, '0')}:00` : n === 1 ? 'tomorrow' : `in ${n} days`; };

  // Called every hour of live play (and once a day in quiet skips). Returns true if a scene was queued.
  function tick(q) {
    const Zz = Z(), d = day(), h = q ? 99 : Math.floor(hr()); let hit = false;
    for (const e of Zz.sched.slice()) {
      const hh = hz(e.k);
      if (!e.ws && e.wd != null && (d > e.wd || (d === e.wd && h >= e.wh))) { e.ws = 1; if (queueWarn(e, hh, q)) hit = true; }
      if (!e.fired && (d > e.day || (d === e.day && h >= e.hour))) { e.fired = 1; if (queueImpact(e, hh, q)) hit = true; }
    }
    Zz.sched = Zz.sched.filter(e => !e.fired);
    if (hit) poke(); return hit;
  }
  function queueWarn(e, h, q) {
    const Zz = Z(); if (!h.warn) return false;
    if (e.sev <= 1 || (q && e.sev < STOP)) { autoWarn(e, h); return false; }
    Zz.q.push({ t: 'warn', id: e.id }); return true;
  }
  function queueImpact(e, h, q) {
    const Zz = Z(), cp = JSON.parse(JSON.stringify(e)), wonder = h.wonder && e.sev <= h.wonder;
    if (q) { if (e.sev < STOP || (e.sev < INTER)) { autoImpact(cp, h); return false; } cp.ctx = { loc: 'room', hr: e.hour, asleep: e.hour < 6 || e.hour >= 23 }; Zz.lh = e.hour; }
    else { cp.ctx = { loc: S().loc, hr: Math.floor(hr()), asleep: !!api.asleep() }; if (e.sev < INTER && !wonder) { autoImpact(cp, h); return false; } }
    Zz.q.push({ t: 'imp', e: cp }); return true;
  }
  function autoWarn(e, h) {
    const s = S(); e.resp = e.resp || {};
    if (R() < 0.4) e.resp.prep = 1; if (R() < 0.3) e.resp.fam = 1;
    if (h.evac && e.sev >= 4 && R() < 0.6 && s.money >= 18 * s.kc) { e.resp.evac = 1; s.money = Math.round((s.money - 18 * s.kc) * 10) / 10; startDisp('evac', e.day + 2 + Math.ceil(e.sev * 0.8)); }
    if (e.sev >= 2) say(`⚠ ${cap(e.nm)} warning: expected ${when(e)}.`, 'sys');
  }
  function autoImpact(e, h) {
    const a = h.acts.slice().sort((x, y) => y.p - x.p)[R() < 0.6 ? 0 : Math.min(1, h.acts.length - 1)];
    resolveImpact(e, a.id, true);
  }

  //// ===== queue and scenes =====
  const has = () => Z().q.length > 0;
  function poke() { const s = S(); if (!s.pend && Z().q.length) s.pend = 'dz'; }
  const drop = it => { const q = Z().q, i = q.indexOf(it); if (i >= 0) q.splice(i, 1); };
  function mkEvent() { const Zz = Z(); while (Zz.q.length) { const ev = build(Zz.q[0]); if (ev) return ev; Zz.q.shift(); } return null; }
  function wchFor(h) {
    return DD().wch.filter(w => w.id !== 'evac' || h.evac).map(w => ({ ...w, l: h.wl?.[w.id] || w.l }));
  }
  function build(it) {
    const Zz = Z(), s = S();
    if (it.t === 'warn') {
      const e = Zz.sched.find(x => x.id === it.id); if (!e || e.fired) return null;
      const h = hz(e.k); it.done ??= [];
      if (!it.shown) { it.shown = 1; say(`⚠ ${cap(e.nm).toUpperCase()}: WARNING`, 'bad'); say(fill(pick(h.warnT)), ''); say(`Expected ${when(e)}. You have some time to get ready.`, 'sys'); }
      const ch = wchFor(h).filter(w => !it.done.includes(w.id)).map(w => {
        const cost = free() ? 0 : (w.c || 0), x = { ...w.x }; if (free()) delete x.money;
        const evac = w.id === 'evac', block = it.done.length >= 3 && w.id !== 'end';
        return { label: w.l, fn: 'dz', arg: `w:${e.id}:${w.id}`, x, req: cost ? { money: cost } : undefined, dis: block ? 'No more time' : (w.x.energy && s.energy < 10 && !evac ? 'Too tired' : '') };
      });
      return { id: 'dz-warn', text: 'How do you get ready?', choices: ch };
    }
    if (it.t === 'imp') {
      const e = it.e, h = hz(e.k), c = e.ctx || {};
      if (!it.shown) {
        it.shown = 1; say(`⚠ ${cap(e.nm).toUpperCase()}`, 'bad'); say(fill(pick(h.hit[e.sev - 1])), '');
        if (!e.resp?.evac) { const w = TX().where[c.loc] || 'nearby', tod = TX().tod[c.hr < 5 ? 0 : c.hr < 8 ? 1 : c.hr < 11 ? 2 : c.hr < 14 ? 3 : c.hr < 18 ? 4 : c.hr < 22 ? 5 : 6];
          say(c.asleep ? `It is ${tod}, and you were asleep.` : `It is ${tod}, and you are ${w}.`, 'sys'); }
      }
      if (e.resp?.evac) return { id: 'dz-imp', text: 'You are well away from it.', choices: [{ label: 'Wait it out at the shelter', fn: 'dz', arg: `i:${e.id}:__evac` }] };
      return { id: 'dz-imp', text: h.wonder && e.sev <= h.wonder ? 'What do you do?' : 'What do you do?', choices: h.acts.map(a => ({ label: a.l, fn: 'dz', arg: `i:${e.id}:${a.id}`, x: a.x ? { ...a.x } : undefined, req: a.c ? { money: a.c } : undefined })) };
    }
    if (it.t === 'ev') {
      const ev = DD().ev.find(x => x.id === it.id); if (!ev) return null;
      return { id: 'dz-ev', text: fill(ev.text), choices: ev.choices.map(c => ({ ...c, label: fill(c.label), text: c.text && !Array.isArray(c.text) ? fill(c.text) : c.text, fn: 'dz', arg: 'p' })) };
    }
    return null;
  }

  // Called from FN.dz(choice) in game.js
  function pickChoice(a) {
    const Zz = Z(), arg = a.arg || '', head = Zz.q[0];
    if (arg === 'p') { if (head && head.t === 'ev') drop(head); if (a.nb) { const p = neighbor(); p.bond = cl(p.bond + a.nb); api.hist(p, a.nb > 0 ? 'Helped each other through the disaster.' : 'Turned them away in the crisis.'); } if (a.tr) Zz.tr = clamp(Zz.tr + a.tr, 0, 100); return; }
    const [t, id, w] = arg.split(':'), it = Zz.q.find(x => (t === 'w' ? x.t === 'warn' && x.id === +id : x.t === 'imp' && x.e.id === +id));
    if (!it) return;
    if (t === 'w') {
      const e = Zz.sched.find(x => x.id === +id); if (!e) { drop(it); return; }
      const wc = DD().wch.find(x => x.id === w); say(fill(wc.t), ''); e.resp ??= {}; it.done ??= []; it.done.push(w);
      if (w === 'prep') e.resp.prep = 1; if (w === 'fam') e.resp.fam = 1; if (w === 'help') { e.resp.help = 1; const p = neighbor(); p.bond = cl(p.bond + 5); }
      if (w === 'evac') { e.resp.evac = 1; startDisp('evac', e.day + 2 + Math.ceil(e.sev * 0.8)); }
      if (w === 'end' || w === 'evac' || it.done.length >= 4) drop(it);
      return;
    }
    drop(it); resolveImpact(it.e, w, false);
  }

  //// ===== impact resolution =====
  function addInj(n, sv, src) { Z().inj.push({ n, s: sv, until: day() + Math.round((sv === 3 ? 28 : sv === 2 ? 18 : 9) * rn(0.7, 1.3)), tx: 0, src }); }
  function setC(k, v) { const Zz = Z(); Zz.c[k] = Math.max(Zz.c[k] || 0, v); Zz.cm[k] = Math.max(Zz.cm[k] || 0, Zz.c[k]); }
  const homeFix = () => 1.6;
  function startDisp(kind, until) {
    const s = S(), Zz = Z(); if (Zz.disp && Zz.disp.k === 'home') return;
    const kin = people().filter(x => x.alive && !x.lives && x.bond >= 45 && (x.kind === 'family' || x.bond >= 55)).sort((a, b) => b.bond - a.bond)[0];
    const at = kin ? 'relatives' : (s.tier >= 3 && s.money > 40 * s.kc ? 'hotel' : 'shelter');
    Zz.disp = { k: kind, at, who: kin ? kin.name : '', until: until || 0 };
    if (kin) api.hist(kin, 'Took you in during the disaster.');
  }
  function fates(h, e, auto) {
    const s = S(), cf = CF(), sev = e.sev, lines = []; let dead = 0, miss = 0;
    const area = Math.min(1, cf.area[sev - 1] * (h.area ?? 1)), r0 = e.resp || {};
    const base = (Z().prep.plan != null ? 0.88 : 1) * (1 - pprot() * 0.5) * (r0.fam ? 0.65 : 1) * (r0.evac ? 0.55 : 1) * (r0.help ? 0.92 : 1);
    const noDie = p => p.k === 'child' && p.age < 18, who = p => p.kind === 'family' ? `your ${p.role}, ${p.name},` : p.name;
    for (const p of people().filter(x => x.alive).sort(() => R() - 0.5)) {
      if (p.dz && p.dz.st === 'missing') continue;
      if (R() > (p.lives ? Math.min(1, area * 1.3) : area)) continue;
      const V = vul(p.age, h), m = base * (p.lives && r0.evac ? 0.6 : 1), pk = h.leth * cf.leth[sev - 1] * V * m, pi = h.injure * cf.inj[sev - 1] * V * m, r = R();
      if (r < pk && dead < (sev >= 5 ? 3 : 2) && !noDie(p)) { dead++; kill(p, e); }
      else if (r < pk * 2.4 && sev >= 3 && miss < 2 && !p.lives) { miss++; p.dz = { st: 'missing', until: day() + rnd(1, 4), sev, src: e.nm }; api.hist(p, 'Went missing in the disaster.'); lines.push([`${cap(who(p))} is missing. The line rings out, and out again.`, 'bad']); fx({ stress: 6 + sev, mood: -3 }); }
      else if (r < pk * 3 + pi) { p.dz = { st: 'hurt', until: day() + rnd(5, 28), sev, src: e.nm }; api.hist(p, 'Hurt in the disaster.'); lines.push([`${cap(who(p))} was hurt and is recovering${p.lives ? ' at home' : ' in the care of doctors'}.`, 'bad']); fx({ stress: 3 + sev, mood: -2 }); Z().tr += 2; }
      else if (sev >= 3 && h.prop >= 0.5 && !p.lives && R() < 0.25 * area) { p.dz = { st: 'displaced', until: day() + rnd(10, 45), sev, src: e.nm }; api.hist(p, 'Lost their home in the disaster.'); lines.push([`${cap(who(p))} has lost their home.`, 'bad']); }
    }
    return { lines, dead };
  }
  function kill(p, e) {
    const Zz = Z(), g = 3 + p.bond / 8 + (e.sev >= 4 ? 3 : 0);
    p.alive = false; p.lives = false; p.dz = null; api.hist(p, `Died in ${e.nm}.`);
    fx({ mood: -g, stress: g * 0.7, lonely: g * 0.5 }); Zz.tr = clamp(Zz.tr + 8 + p.bond / 10, 0, 100);
    note(`Lost ${p.name}, ${p.role}, to ${e.nm}.`); api.famRefresh();
    say(p.kind === 'family' ? `Your ${p.role}, ${p.name}, did not survive. The grief arrives like a second disaster.` : `${p.name} did not survive. The news lands hard.`, 'bad');
  }
  function resolveImpact(e, actId, auto) {
    const s = S(), Zz = Z(), h = hz(e.k), sev = e.sev, cf = CF(), c = e.ctx || {}, evac = !!(e.resp && e.resp.evac);
    const a = h.acts.find(x => x.id === actId) || h.acts[0];
    if (auto) { say(`⚠ ${cap(e.nm).toUpperCase()}`, 'bad'); say(fill(pick(h.hit[sev - 1])), ''); }
    else if (evac) say('You hear it on the radio from a safe distance, with strangers whose faces you will remember.', ''); else say(fill(a.t), '');
    if (h.wonder && sev <= h.wonder) { say(TX().wonder, 'good'); fx({ mood: auto ? 4 : 2, lonely: -3 }); Zz.hist.push({ k: h.id, sev, d: day(), age: s.age, nm: e.nm }); note(`Witnessed ${e.nm}.`); return; }
    // --- your fate
    const loc = c.loc || 'room', lt = isOut(loc) ? 'out' : 'in';
    let cm = (h.lc?.[lt] ?? 1) * (h.lc?.[loc] ?? 1); if (c.asleep && h.sudden) cm *= 1.35;
    const V = vul(s.age, h, s.health), ap = evac ? 0.8 : (lt === 'out' && a.po != null ? a.po : a.p);
    const mult = Math.max(0.05, (1 - ap) * (1 - pprot()) * (e.resp?.prep ? 0.8 : 1));
    const pc = clamp(h.leth * cf.leth[sev - 1] * V * cm * mult * 3.5, 0, 0.6), ph = clamp(h.injure * cf.inj[sev - 1] * V * cm * mult, 0, 0.92);
    const r = R() - api.luckF() * 0.06, res = r < pc ? 'crit' : r < pc + ph ? 'hurt' : 'safe', inj = pick(h.inj);
    if (res === 'safe') { say(fill(pick(h.safe)), 'good'); fx({ stress: 1 + sev * 2.5, mood: -sev * 0.8 }); Zz.tr += [0, 2, 5, 9, 14][sev - 1]; }
    else if (res === 'hurt') { say(fill(pick(h.hurt), { inj }), 'bad'); addInj(inj, sev >= 4 ? 2 : 1, e.k); fx({ health: -(6 + sev * 4 + rnd(0, 6)), stress: 6 + sev * 3, mood: -4 - sev }); Zz.tr += [0, 4, 9, 14, 20][sev - 1]; }
    else { say(fill(pick(h.crit)), 'bad'); addInj(inj, 3, e.k); fx({ health: -(s.health - rnd(8, 18)), stress: 10 + sev * 3, mood: -8 }); Zz.tr += [0, 8, 14, 20, 28][sev - 1]; }
    // --- property
    const P = DD().prof[h.prof], hp = Math.min(0.7, (fresh('home') ? 0.25 : 0) + (e.resp?.prep ? 0.18 : 0) + (a.hp || 0));
    const dmg = Math.round((P.dm[sev - 1] || 0) * h.prop * cf.tierB[s.tier] * rn(0.6, 1.4) * (1 - hp));
    if (dmg > 0) {
      Zz.dm = Math.min(100, Zz.dm + dmg); const loss = Math.round(dmg * 0.3); if (loss) fx({ money: -loss });
      if (dmg >= 60) say('Your home is no longer safe to live in. You stand in front of it with whatever you could carry.', 'bad');
      else if (dmg >= 25) say('Your home is badly damaged: broken windows, cracked walls and a roof that will need real work.', 'bad');
      else if (dmg >= 8) say('Your home has taken damage: cracks, leaks and a mess that will take time to put right.', '');
      if (Zz.dm >= 90 && s.inv.keepsake && R() < 0.3) { s.inv.keepsake = 0; say(`In the wreckage, ${s.tk.keepsake} is gone. Of everything, that is the thing that stings.`, 'bad'); fx({ mood: -8 }); Zz.tr += 6; }
      if (Zz.ins && dmg >= 8) { const amt = Math.round(dmg * homeFix() * 0.8); if (auto) { s.money = Math.round((s.money + amt * s.kc) * 10) / 10; } else { Zz.claim += amt; say('You are insured. You will need to file a claim.', 'sys'); } }
    }
    // --- conditions
    const tf = cf.tierT[s.tier], set = {};
    for (const k of CONDS) { const v = P[k]?.[sev - 1] || 0; if (v > 0) { set[k] = Math.max(1, Math.round(v * tf * rn(0.7, 1.4))); setC(k, set[k]); } }
    if (P.pf[sev - 1] > Zz.pf) Zz.pf = P.pf[sev - 1];
    if (Zz.dm >= 60) startDisp('home'); else if (evac && !Zz.disp) startDisp('evac', day() + 2);
    if (Zz.dm >= 60 && Zz.disp && Zz.disp.k === 'evac') Zz.disp.k = 'home';
    const lost = Object.entries(set).filter(([k]) => k !== 'sc' && k !== 'wk').map(([k, v]) => `${CF().condl[k].toLowerCase()} for about ${v} day${v > 1 ? 's' : ''}`);
    if (lost.length && sev >= 2) say(`Expect: ${lost.slice(0, 4).join(', ')}.`, 'sys');
    // --- others
    const f = fates(h, e, auto), fl = auto ? f.lines.slice(0, 3) : f.lines; fl.forEach(l => say(l[0], l[1]));
    if (sev >= 2 && !f.lines.length && !f.dead) { say(TX().nobody, 'good'); fx({ mood: 2, stress: -2 }); }
    const toll = Math.round(cf.toll[sev - 1] * h.leth * cf.tierV[s.tier] * Math.sqrt(h.area ?? 1) * rn(0.6, 1.5));
    if (sev >= 2) { Zz.news = toll < 1 ? 'No deaths have been reported.' : toll < 10 ? `Officials confirm ${toll} dead so far.` : `The death toll stands at ${toll.toLocaleString('en-US')} and is expected to rise.`; say(Zz.news, 'sys'); }
    // --- record, chain, hospital
    Zz.hist.push({ k: h.id, sev, d: day(), age: s.age, nm: e.nm, lost: f.dead }); if (Zz.hist.length > 40) Zz.hist.shift();
    note(`Lived through ${e.nm}.`); Zz.ap = 0;
    const lenD = Math.max(0, ...Object.values(set)); if (sev >= 2 || lenD > 0) Zz.act.push({ id: e.id, k: h.id, sev, d0: day(), nm: e.nm, ic: h.ic, tags: h.tags, len: Math.min(90, Math.max(3, lenD + 3)), aid: Math.ceil(cf.aid[sev - 1] * cf.tierAid[s.tier]) });
    const g = geo();
    for (const t of h.then || []) { const h2 = hz(t.k); if (!h2 || sev < (t.min || 1) || R() > t.p || (t.coast && !g.coast) || g.z[t.k] <= 0) continue; spawn(h2, clamp(sev + (t.adj || 0), 1, 5), { sec: 1, lag: t.lag }); }
    if (res === 'crit') hospital(sev);
  }
  function hospital(sev) {
    const s = S(), Zz = Z(), stay = rnd(2, 4) + (sev >= 4 ? 2 : 0), bill = Math.round([14, 12, 10, 6, 3][s.tier] * stay * 1.4);
    Zz.hosp = 1; fx({ money: -bill }); Zz.inj.forEach(i => i.tx = 1);
    for (let i = 0; i < stay; i++) api.nextDay();
    Zz.hosp = 0; s.hunger = Math.max(s.hunger, 55); s.energy = Math.max(s.energy, 55); s.health = Math.max(s.health, 30);
    say(`You come round in a hospital ward. ${stay} days have gone. The bill is @${bill}, and a nurse tells you how lucky you are.`, 'bad');
  }

  //// ===== daily processing =====
  function daily() {
    const s = S(), Zz = Z(), d = day(), q = api.quiet(); if (Zz.pd === d) return; Zz.pd = d;
    insurance();
    for (const k of Object.keys(Zz.c)) {
      const t = Zz.c[k];
      if (!Zz.hosp) {
        if (k === 'pw') fx({ stress: fresh('light') ? 0.6 : 1.1, mood: -0.7 });
        if (k === 'wt') { if (Zz.sd > 0) Zz.sd--; else if (Zz.wat > 0) Zz.wat--; else fx({ health: -2.2, stress: 1.8, mood: -1 }); }
        if (k === 'fd') { if (Zz.sd > 0) Zz.sd--; else fx({ hunger: -10, stress: 1, health: -0.4 }); }
        if (k === 'net') fx({ lonely: 1.2 });
        if (k === 'air') fx({ health: fresh('kit') ? -0.4 : -0.8, mood: -0.4 });
      }
      Zz.c[k] = t - 1; if (Zz.c[k] <= 0) { delete Zz.c[k]; if (!q && DD().cfg.condEnd[k]) say(DD().cfg.condEnd[k], 'good'); }
    }
    if (Zz.disp && !Zz.hosp) fx({ stress: 1.4, mood: -0.8 });
    else if (Zz.dm >= 25 && !Zz.hosp) fx({ stress: 0.4 });
    for (let i = Zz.inj.length - 1; i >= 0; i--) { const j = Zz.inj[i]; if (j.until <= d) { Zz.inj.splice(i, 1); if (!q) say(`Your ${j.n.replace(/^an? /, '')} has healed.`, 'good'); } else if (!j.tx && j.s >= 2) fx({ health: -0.5 * j.s, mood: -0.3 }); }
    for (const p of people()) if (p.dz && p.dz.until <= d) {
      if (p.dz.st === 'missing') missing(p, q); else { if (!q) say(p.dz.st === 'hurt' ? `${p.name} has recovered and is back on their feet.` : `${p.name} has found somewhere to live again.`, 'good'); p.dz = null; }
    }
    if (Zz.tr > 1) { fx({ stress: Zz.tr * 0.012, mood: -Zz.tr * 0.01 }); Zz.tr *= 0.988; if (!q && Zz.tr > 25 && R() < Zz.tr / 500) say(pick(TX().trauma), 'sys'); }
    if (Zz.pf > 1) { Zz.pf = 1 + (Zz.pf - 1) * 0.965; if (Zz.pf < 1.02) Zz.pf = 1; }
    if (Zz.dm > 0) { Zz.dm = Math.max(0, Zz.dm - [0.8, 1.4, 2.2, 3.2, 4.5][s.tier]); }
    if (Zz.disp) { const D0 = Zz.disp;
      if (D0.k === 'evac' && d >= D0.until) { if (Zz.dm >= 60) D0.k = 'home'; else { Zz.disp = null; if (!q) say('It is safe to go back. You head home, tired, and more grateful than you expected for your own front door.', 'good'); } }
      else if (D0.k === 'home' && Zz.dm < 60) { Zz.disp = null; if (!q) say('Your home is livable again. You carry your things back, one box at a time.', 'good'); } }
    for (let i = Zz.act.length - 1; i >= 0; i--) { const a = Zz.act[i]; if (d - a.d0 >= a.len) { Zz.act.splice(i, 1); if (!q || a.sev >= 3) say(`The ${a.nm.replace(/^an? /, '')} is behind you now. Life is mostly back to its usual shape.`, 'sys'); if (a.sev >= 3) fx({ mood: 3 }); } }
    for (const k of Object.keys(Zz.wxo)) if (+k < d - 1) delete Zz.wxo[k];
    roll(); tick(q);
    if (!q) maybeEvent();
  }
  function insurance() {
    const s = S(), Zz = Z(), d = day(); if (!Zz.ins || d < Zz.insD) return;
    if (s.money >= 8 * s.kc) { s.money = Math.round((s.money - 8 * s.kc) * 10) / 10; Zz.insD = d + 30; }
    else { Zz.ins = 0; say('You could not pay the premium, and your disaster insurance has lapsed.', 'bad'); }
  }
  function missing(p, q) {
    const Zz = Z(), sev = p.dz.sev || 3, r = R(), nd = p.k === 'child' && p.age < 18;
    if (!nd && r < 0.1 + sev * 0.04) { kill(p, { sev, nm: p.dz.src || 'the disaster' }); }
    else if (r < 0.5) { p.dz = { st: 'hurt', until: day() + rnd(5, 18), sev, src: p.dz.src }; say(`News about ${p.name} at last: found alive, hurt, in a crowded hospital.`, ''); fx({ stress: -6, mood: 4 }); api.hist(p, 'Found alive, injured.'); }
    else { p.dz = null; say(`${p.name} is safe! The phone buzzes at last, and you sit down hard on the nearest thing and cry with relief.`, 'good'); fx({ stress: -12, mood: 8, lonely: -6 }); api.hist(p, 'Found safe.'); p.bond = cl(p.bond + 4); }
  }
  const aidReady = a => day() - a.d0 >= a.aid;
  function maybeEvent() {
    const Zz = Z(), d = day(); if (Zz.q.length || !Zz.act.length) return;
    const crisis = Zz.act.slice().sort((a, b) => b.sev - a.sev), s = S(), c = [];
    for (const ev of DD().ev) {
      if (Zz.seen[ev.id] && d - Zz.seen[ev.id] < 9) continue;
      const a = crisis.find(x => ev.tags.includes('all') || ev.tags.some(t => x.tags.includes(t))); if (!a) continue;
      const age = d - a.d0, n = ev.need || {};
      if (ev.st === 'early' && age > 3) continue; if (ev.st === 'mid' && (age < 1 || age > a.len)) continue; if (ev.st === 'late' && age < Math.max(4, a.len * 0.5)) continue;
      if (ev.min?.sev && a.sev < ev.min.sev) continue;
      if (n.c && !(Zz.c[n.c] > 0)) continue; if (n.pf && Zz.pf < n.pf) continue; if (n.tr && Zz.tr < n.tr) continue; if (n.dm && Zz.dm < n.dm) continue; if (n.ins && !Zz.ins) continue; if (n.aid && !aidReady(a)) continue; if (n.sev && a.sev < n.sev) continue;
      if (ev.id === 'looting' && s.age < 14) continue;
      c.push([ev, ev.w]);
    }
    if (!c.length || R() > (crisis[0].sev >= 3 ? 0.5 : 0.22)) return;
    let r = R() * c.reduce((a, x) => a + x[1], 0), ev = c[0][0]; for (const x of c) if ((r -= x[1]) < 0) { ev = x[0]; break; }
    Zz.seen[ev.id] = d; Zz.q.push({ t: 'ev', id: ev.id }); poke();
  }

  //// ===== hooks used by the engine =====
  const hush = () => Z().act.some(a => a.sev >= 3 && day() - a.d0 <= 5);
  const priceF = () => { const s = S(); return s.dz && s.dz.pf > 1 ? s.dz.pf : 1; };
  const noRent = () => { const s = S(); return !!(s.dz && s.dz.disp); };
  const noSignal = () => { const s = S(); return !!(s.dz && s.dz.c && s.dz.c.net > 0); };
  const travelF = () => { const s = S(); return s.dz && s.dz.c && s.dz.c.rd > 0 ? 2 : 1; };
  const schoolClosed = () => { const s = S(); return s.dz && s.dz.c && s.dz.c.sc > 0 ? 'Schools are closed' : ''; };
  function closed(loc) {
    const s = S(), Zz = s.dz; if (!Zz || !Zz.c) return '';
    const a = Zz.act[0], nm = a ? a.nm.replace(/^an? /, '') : 'the disaster';
    if ((loc === 'mart' || loc === 'diner') && Zz.c.sh > 0) return `Closed (${nm})`;
    if (loc === 'work' && Zz.c.wk > 0) return 'Work is shut down';
    if ((loc === 'library' || loc === 'gym') && (Zz.c.sh > 0 || Zz.c.pw > 1)) return 'Closed';
    if (loc === 'docks' && Zz.act.some(x => x.sev >= 3 && day() - x.d0 < 4 && ['tsunami', 'cyclone', 'flood', 'storm', 'monsoon', 'flashflood'].includes(x.k))) return 'Closed (dangerous)';
    return '';
  }
  const tk = k => {
    const s = S(), D0 = s.dz && s.dz.disp; if (!D0) return;
    if (k === 'homeName') return TX().dispNames[D0.at]; if (k === 'homeDesc') return TX().dispDesc[D0.at].replace('{who}', D0.who || 'a friend');
  };
  const lh = () => { const Zz = Z(), h = Zz.lh; Zz.lh = null; return h; };
  function sleep(h) {
    const s = S(), Zz = Z(); if (!(Zz.disp || Zz.dm >= 25 || Zz.c.pw)) return;
    const bad = (Zz.disp ? 0.35 : 0) + (Zz.dm >= 25 ? 0.15 : 0) + (Zz.c.pw ? 0.1 : 0);
    s.energy = cl(s.energy - h * 13 * bad); s.stress = cl(s.stress + h * 1.2 * bad);
    api.say(Zz.disp ? 'You sleep badly, in a place that is not yours, with other people breathing in the dark.' : 'You sleep badly, with one ear on the night.', 'sys');
    if (Zz.act.some(a => a.k === 'quake' && day() - a.d0 <= 4) && R() < 0.2 && !Zz.q.length) { Zz.seen.aftershock = day(); Zz.q.push({ t: 'ev', id: 'aftershock' }); poke(); }
  }
  function outside() {
    const s = S(), Zz = s.dz; if (!Zz || !Zz.c || !Zz.c.air) return '';
    s.health = cl(s.health - (fresh('kit') ? 0.3 : 0.8)); return 'The air is thick and bitter. Every breath scratches.';
  }
  function banner() {
    const Zz = S().dz; if (!Zz || !Zz.q) return '';
    const parts = [];
    for (const e of Zz.sched) if (e.ws && !e.fired) parts.push(`${hz(e.k).ic} <b>${cap(e.nm)} warning</b>: ${when(e)}`);
    for (const a of Zz.act) { const cs = Object.keys(Zz.c).slice(0, 3).map(k => `${CF().condl[k].toLowerCase()} ${Zz.c[k]}d`); parts.push(`${a.ic} <b>${cap(a.nm)}</b> aftermath${cs.length ? ': ' + cs.join(', ') : ''}`); break; }
    return parts.length ? `<a class="dzb" href="hazards.html">${parts.join(' · ')}</a>` : '';
  }

  //// ===== actions available during a crisis =====
  function opts(add, loc) {
    const s = S(), Zz = Z(), d = day(), A0 = Zz.act, cf = CF(); if (!A0.length && !Zz.sched.some(e => e.ws) && !Zz.claim && !Zz.inj.length && !(Zz.tr > 18)) return;
    const top = A0.slice().sort((a, b) => b.sev - a.sev)[0], out = isOut(loc) || loc === 'street';
    const go = (t, x, f) => () => { if (t) say(t, ''); if (f) f(); fx(x); api.after(x.time || 0); };
    if (A0.length || Zz.sched.some(e => e.ws)) add('Check the news and emergency radio (30m)', go('', { time: 0.5 }, () => {
      const l = Object.keys(Zz.c).map(k => `${cf.condl[k].toLowerCase()} (${Zz.c[k]}d)`);
      for (const e of Zz.sched) if (e.ws) say(`${hz(e.k).ic} Warning: ${e.nm} ${when(e)}.`, 'bad');
      if (top) say(`${top.nm.replace(/^an? /, '')}: ${Zz.news || 'the picture is still unclear.'} ${l.length ? 'Still: ' + l.join(', ') + '.' : 'Services are mostly back.'} ${aidReady(top) ? 'Relief is being handed out.' : 'Aid is on the way.'}`.trim(), 'sys');
      fx({ stress: fresh('light') ? -3 : 0.5 });
    }), '');
    if (top && loc === 'street') {
      const need = Zz.c.sh > 0 || Zz.c.wt > 0 || Zz.c.fd > 0 || Zz.disp, ok = aidReady(top);
      if (need) add('Queue at the relief point for food and water (2h)', go('You wait in a long, patient line. Volunteers hand out food, water and blankets.', { time: 2, hunger: 35, mood: 1, stress: -1, energy: -3 }, () => { Zz.sd = Math.max(Zz.sd, 2); }), ok ? (s.energy < 5 ? 'Too tired' : '') : `Aid not here yet (about ${Math.max(1, top.aid - (d - top.d0))}d)`);
      if (top.sev >= 2 && (Zz.dm > 5 || top.tags.some(t => ['rubble', 'flood', 'mud', 'ash', 'snow'].includes(t)))) add('Help clear debris and clean up (3h)', go('You haul, shovel and sweep alongside neighbors you barely knew yesterday.', { time: 3, energy: -14, hunger: -6, rep: 2, mood: 3, lonely: -6, sk: { fitness: 0.2 } }), s.energy < 20 ? 'Too tired' : '');
      if (top.sev >= 3 && d - top.d0 >= 1 && s.age >= 16) add('Join the paid recovery crew (4h, #12)', go('You pull on gloves and work the shift with a crew of strangers.', { time: 4, energy: -18, hunger: -8, money: 12, sk: { fitness: 0.15 }, rep: 1 }), s.energy < 25 ? 'Too tired' : '');
      if (top.sev >= 3 && d - top.d0 <= 2 && top.tags.some(t => ['rubble', 'flood', 'slide', 'snow', 'mud'].includes(t)) && s.age >= 16) add('Join the search and rescue effort (3h)', () => {
        say('You join the line of volunteers, calling out and listening for answers.', ''); fx({ time: 3, energy: -16, hunger: -6 });
        if (R() < api.pr({ base: 0.3, sk: 'fitness', per: 0.05 })) { const p = api.newPerson({ role: 'someone you pulled out', how: 'you found them in the wreckage', bond: 35, age: [16, 70] }); say(`You find ${p.name}, alive and gray with dust. They hold onto your sleeve and do not let go until the medics arrive.`, 'good'); fx({ rep: 7, mood: 9, stress: -4 }); Zz.tr = Math.max(0, Zz.tr - 4); }
        else { say('You find nothing, and it is the hardest thing you have done in a long time.', 'bad'); fx({ mood: -4, stress: 5 }); if (R() < 0.12) { fx({ health: -10 }); say('A shifting beam clips you on the way out.', 'bad'); } }
        api.after(0);
      }, s.energy < 25 ? 'Too tired' : '');
      if (top.sev >= 3) add('Volunteer at the shelter (3h)', go('You hand out soup, fold blankets and listen to people who need someone to listen.', { time: 3, energy: -8, rep: 3, lonely: -9, mood: 4, hunger: 10, sk: { charisma: 0.12 } }), s.energy < 15 ? 'Too tired' : '');
      if (Zz.c.wt > 0) add('Fetch water from the standpipe (1h)', go('You queue with a bucket and carry it home, arm by arm.', { time: 1, energy: -5 }, () => { Zz.wat = Math.min(3, Zz.wat + 2); }), '');
      if (top.sev >= 3 && !Zz.ap) add('Apply for disaster relief (1h)', go('You fill in the forms, and sit in the queue, and hand them over.', { time: 1, stress: 1 }, () => { Zz.ap = 1; if (R() < 0.35 + s.tier * 0.12) { const amt = Math.round(18 * top.sev); s.money = Math.round((s.money + amt * s.kc) * 10) / 10; say(`The grant comes through: @${amt}. It is not much and it is something.`, 'good'); } else say('Your application is "under review". You are not sure what that means.', ''); }), '');
    }
    if (Zz.claim > 0 && out) add(`File your insurance claim (1h)`, go('You gather photographs and receipts and sit in front of a patient adjuster.', { time: 1 }, () => { if (R() < 0.85) { s.money = Math.round((s.money + Zz.claim * s.kc) * 10) / 10; say(`The claim is approved: @${Zz.claim} paid out.`, 'good'); } else say('The claim is rejected for missing paperwork. You will have to try again.', 'bad'); if (R() < 0.85) Zz.claim = 0; }), '');
    if (Zz.dm >= 8 && (loc === 'room' || loc === 'street')) {
      const c1 = free() ? 0 : Math.round(12 * homeFix());
      add(`Repair your home${c1 ? ` (@${c1}, 3h)` : ' (3h)'}`, go('You patch, nail, caulk and mop. By evening, something looks a little more like home.', { time: 3, energy: -10, money: -c1, sk: { fitness: 0.1 } }, () => { Zz.dm = Math.max(0, Zz.dm - 12); }), c1 && s.money < c1 * s.kc * priceF() ? `Need @${c1}` : s.energy < 18 ? 'Too tired' : '');
      add('Patch the damage yourself (4h)', go('You do what you can with the tools you have and a lot of stubbornness.', { time: 4, energy: -12, sk: { fitness: 0.1 } }, () => { Zz.dm = Math.max(0, Zz.dm - (R() < api.pr({ base: 0.5, sk: 'intellect', per: 0.05 }) ? 8 : 4)); }), s.energy < 20 ? 'Too tired' : '');
    }
    if (loc === 'clinic') for (const j of Zz.inj.filter(x => !x.tx)) { const c1 = 8 * j.s; add(`Get ${j.n} treated (@${c1})`, go(`A doctor examines your ${j.n.replace(/^an? /, '')}, cleans, wraps and prescribes rest.`, { time: 1, money: -c1, health: 5 }, () => { j.tx = 1; j.until = d + Math.ceil((j.until - d) / 2); }), s.money < c1 * s.kc * priceF() ? `Need @${c1}` : ''); }
    if (Zz.tr > 18 && (loc === 'room' || loc === 'clinic')) add('Talk through what happened (1h)', go(S().lonely > 40 ? 'You sit with your thoughts and write them down. It helps a little.' : 'You talk it through with someone who listens. It helps more than you expected.', { time: 1, stress: -8, lonely: -6, mood: 3 }, () => { Zz.tr = Math.max(0, Zz.tr - (S().lonely > 40 ? 5 : 10)); }), '');
  }
  function pOpts(p) {
    const o = [], Zz = Z(), n = p.name; if (!p.alive || !p.dz) return o;
    const go = (t, x, f) => () => { say(t, ''); if (f) f(); api.hist(p, t.split('. ')[0]); fx(x); api.after(x.time || 0); };
    if (p.dz.st === 'hurt') o.push({ l: `Visit ${n} while they recover (2h)`, w: S().energy < 10 ? 'Too tired' : '', f: go(`You sit with ${n} for a couple of hours. They are glad you came.`, { time: 2, mood: 4, lonely: -10, stress: -3, energy: -3 }, () => { p.bond = cl(p.bond + 6); }) });
    if (p.dz.st === 'missing') o.push({ l: `Search for ${n} and call the hospitals (2h)`, w: S().energy < 10 ? 'Too tired' : '', f: go(`You call hospital after hospital and walk the lists on the walls.`, { time: 2, stress: 3, energy: -5 }, () => { if (R() < 0.45) { p.dz.until = day(); say(`A volunteer looks up from a list and says ${n}'s name.`, 'good'); } }) });
    if (p.dz.st === 'displaced') o.push({ l: `Let ${n} stay with you for a while`, w: '', f: go(`You make room for ${n}. It is crowded, and it is good.`, { time: 0.5, mood: 3, stress: 2, lonely: -8 }, () => { p.bond = cl(p.bond + 8); p.dz = null; }) });
    return o;
  }
  const pNote = p => !p.dz || !p.alive ? '' : `<p class="bad">${{ hurt: 'Recovering from injuries after the disaster.', missing: 'Missing since the disaster. Nobody has heard anything.', displaced: 'Lost their home in the disaster.' }[p.dz.st]}</p>`;

  //// ===== preparedness and the Hazards page =====
  function doPrep(id) {
    const s = S(), Zz = Z(), p = DD().prep.find(x => x.id === id), cost = free() ? 0 : p.c;
    if (cost && s.money < cost * s.kc * priceF()) return;
    Zz.prep[id] = day(); if (id === 'stock') Zz.sd = 5;
    if (cost) fx({ money: -cost }); fx({ ...p.x, time: p.t }); Zz.fl = p.txt; say(p.txt, 'good');
  }
  const rw = p => p < 0.05 ? 'negligible' : p < 0.3 ? 'low' : p < 1 ? 'moderate' : p < 2.2 ? 'high' : 'very high';
  function pageHTML() {
    const s = S(), Zz = Z(), cf = CF(), pv = prepVal(), bar = api.bar, hist = Zz.hist.slice().reverse().slice(0, 12), rt = rates().sort((a, b) => b.p - a.p);
    let h = '';
    if (Zz.fl) h += `<div class="card"><p class="good">${api.tpl(Zz.fl)}</p></div>`;
    const al = []; for (const e of Zz.sched) if (e.ws) al.push(`<p class="bad">${hz(e.k).ic} ${cap(e.nm)} warning: expected ${when(e)}.</p>`);
    for (const a of Zz.act) al.push(`<p>${a.ic} <b>${cap(a.nm)}</b>, day ${day() - a.d0 + 1}. ${aidReady(a) ? 'Relief supplies are being handed out.' : 'Aid is on its way.'}</p>`);
    const cs = Object.keys(Zz.c).map(k => `${cf.condl[k]}: ${Zz.c[k]} day${Zz.c[k] > 1 ? 's' : ''}`);
    if (cs.length) al.push(`<p class="meta">${cs.join(' · ')}</p>`);
    if (Zz.dm >= 8) al.push(`<p class="meta">Home damage: ${Math.round(Zz.dm)}%${Zz.disp ? ' (you are staying elsewhere)' : ''}.${Zz.claim ? ' An insurance claim is waiting.' : ''}</p>`);
    if (Zz.pf > 1.05) al.push(`<p class="meta">Prices are up about ${Math.round((Zz.pf - 1) * 100)}%.</p>`);
    if (Zz.inj.length) al.push(`<p class="meta">Injuries: ${Zz.inj.map(i => i.n + (i.tx ? ' (treated)' : '')).join(', ')}.</p>`);
    h += `<div class="card"><h2>Alerts and status</h2>${al.join('') || '<p class="meta">No active alerts. Stay aware: nothing here announces itself.</p>'}</div>`;
    h += `<div class="card"><h2>Preparedness</h2><div>${bar('Ready', pv, '#8fcf9a')} ${pv < 25 ? 'exposed' : pv < 50 ? 'some cover' : pv < 75 ? 'well prepared' : 'very well prepared'}</div>` +
      DD().prep.map(p => { const ok = fresh(p.id), st = Zz.prep[p.id] != null && !ok; return `<p class="meta">${ok ? '✓' : st ? '↻' : '·'} ${p.l.replace(/\s*\(.*?\)/g, '')}${st ? ' (expired)' : ''}</p>`; }).join('') + `<p class="meta">${Zz.ins ? '✓ Disaster insurance' : '· Disaster insurance'}. Each disaster you live through also teaches you something.</p></div>`;
    h += `<div class="card"><h2>Hazards in {country}</h2><p class="meta">Risk this season (${api.ssn().toLowerCase()}), at the current frequency setting.</p>` + rt.slice(0, 12).map(x => `<div>${bar(`${x.h.ic} ${x.h.n}`, Math.min(100, x.p * 40), '#e3a857')} ${rw(x.p)}</div>`).join('') + (rt.length ? '' : '<p class="meta">Nothing notable. Disasters are switched off.</p>') + `</div>`;
    h += `<div class="card"><h2>Disasters you have lived through</h2>` + (hist.length ? hist.map(x => `<p class="meta">Age ${x.age}: ${cap(x.nm)}${x.lost ? ` (lost ${x.lost})` : ''}</p>`).join('') : '<p class="meta">None yet.</p>') + `</div>`;
    return h;
  }
  function buildPage(add) {
    const s = S(), Zz = Z(), cf = CF(), lowE = s.energy < 5;
    for (const p of DD().prep) {
      const cost = free() ? 0 : p.c, ok = fresh(p.id), done = p.once && ok;
      add(p.l + (ok && !p.once ? ' — refresh' : ok ? ' — done' : ''), () => { doPrep(p.id); api.after(0); }, done ? 'Already done' : cost && s.money < cost * s.kc * priceF() ? `Need @${cost}` : lowE ? 'Too tired' : '');
    }
    add(Zz.ins ? 'Cancel disaster insurance' : 'Take out disaster insurance (@8 a month)', () => { Zz.ins = Zz.ins ? 0 : 1; Zz.insD = day() + 30; if (Zz.ins) { s.money = Math.round((s.money - 8 * s.kc) * 10) / 10; Zz.fl = 'You are covered. If the worst happens, a good part of the repair bill is not yours to carry.'; } else Zz.fl = 'You cancel the policy.'; api.after(0); }, !Zz.ins && s.money < 8 * s.kc ? 'Need @8' : '');
    add(`Disaster frequency: ${cf.freq[Zz.f][0]} (tap to change)`, () => { Zz.f = (Zz.f + 1) % cf.freq.length; Zz.fl = `Disaster frequency is now ${cf.freq[Zz.f][0].toLowerCase()}.`; api.after(0); }, '');
    add('Back to life', () => { Zz.fl = ''; location.href = 'play.html'; });
  }
  const debug = { spawn: (id, sev, o) => spawn(hz(id), sev, o), rates, geo, prepVal, hz, H: HL, resolve: resolveImpact, tick, roll };
  return { migrate, daily, tick, has, poke, mkEvent, pickChoice, hush, priceF, noRent, noSignal, travelF, schoolClosed, closed, tk, lh, sleep, outside, banner, opts, pOpts, pNote, pageHTML, buildPage, live: has, debug, fresh, fillTxt: fill };
}
