// IRL: In Remote Life - relationship engine (adults only).
// Attraction, dating, love, intimacy, protection and sexual health, pregnancy and children,
// engagement, marriage, conflict, cheating, breakups, separation, divorce and safety.
// Text and tuning live in data/romance.json. Everything is consensual and non-explicit.
const cl = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
const M = ['attr', 'love', 'pas', 'trust', 'com', 'res', 'cmf'];
const MN = { attr: 'Chemistry', love: 'Love', pas: 'Passion', trust: 'Trust', com: 'Commitment', res: 'Resentment', cmf: 'Comfort' };
const MC = { attr: '#e08fb0', love: '#e0705a', pas: '#e3a857', trust: '#6fb0d8', com: '#8fcf9a', res: '#8a6fd0', cmf: '#b79fe0' };
const ACT = ['dating', 'together', 'engaged', 'married', 'separated'];
const COMM = ['together', 'engaged', 'married'];
const ST = { friend: 'friend', flirt: 'flirting', dating: 'dating', together: 'in a relationship', engaged: 'engaged', married: 'married', separated: 'separated', ex: 'ex', widowed: 'widowed' };
const ROLE = { flirt: { f: 'woman you are flirting with', m: 'man you are flirting with' }, dating: { f: 'woman you are dating', m: 'man you are dating' }, together: { f: 'girlfriend', m: 'boyfriend' }, engaged: { f: 'fianc\u00e9e', m: 'fianc\u00e9' }, married: { f: 'wife', m: 'husband' }, separated: { f: 'estranged wife', m: 'estranged husband' }, ex: { f: 'ex', m: 'ex' } };
const PR = { f: { he: 'she', him: 'her', his: 'her', He: 'She', His: 'Her' }, m: { he: 'he', him: 'him', his: 'his', He: 'He', His: 'His' } };
const FAIL = { none: 1, withdrawal: 0.22, pill: 0.07, iud: 0.01, implant: 0.005 };
const MTH = { none: 'no contraception', withdrawal: 'withdrawal', pill: 'the pill', iud: 'an IUD', implant: 'an implant' };
const W = (v, a) => a[Math.min(a.length - 1, Math.floor(cl(v, 0, 99.9) / (100 / a.length)))];
const WD = {
  love: ['no real feelings', 'fond of you', 'smitten', 'in love with you', 'deeply in love with you', 'devoted to you'],
  attr: ['little spark', 'a pleasant spark', 'real chemistry', 'magnetic chemistry'],
  pas: ['dormant', 'a flicker', 'warm', 'hot', 'burning'],
  trust: ['wary', 'cautious', 'trusting', 'completely trusting'],
  com: ['uncommitted', 'leaning in', 'committed', 'all in'],
  res: ['no grudges', 'a little tense', 'bitter', 'deeply resentful'],
  cmf: ['guarded', 'shy', 'at ease', 'completely at ease']
};

export function initRomance(api) {
  const { R, pick, rnd, fx, hist, after, people, byId, norm, why, day, hr, luckF, getS, getD } = api;
  const S = new Proxy({}, { get: (_, k) => getS()[k], set: (_, k, v) => { getS()[k] = v; return true; } });
  const RD = () => getD().rom;
  const live = () => !api.quiet();

  // ---------- text helpers ----------
  function gdOf(p) {
    if (p.gd) return p.gd;
    const ro = (p.role || '').toLowerCase(); let g = /mother|sister|daughter|wife|girlfriend|fianc\u00e9e|aunt/.test(ro) ? 'f' : /father|brother|\bson\b|husband|boyfriend|fianc\u00e9\b|uncle/.test(ro) ? 'm' : null;
    if (!g) { const pn = getD().people[S.rgn || 0]; if (pn?.f.includes(p.name)) g = 'f'; else if (pn?.m.includes(p.name)) g = 'm'; }
    return p.gd = g || (R() < 0.5 ? 'f' : 'm');
  }
  function fill(t, p) {
    t = String(t); if (p) { const g = PR[gdOf(p)]; t = t.replace(/\{n\}/g, p.name).replace(/\{(he|him|his|He|His)\}/g, (m, k) => g[k]); }
    return t.replace(/\{topic\}/g, S.rm?.topic || 'something small').replace(/\{place\}/g, api.place());
  }
  const say = (t, c = '', p, j = false) => api.say(fill(t, p), c, j);
  function chron(t) { const m = S.rm; m.hist.push(`Age ${S.age}: ${t}`); if (m.hist.length > 40) m.hist.shift(); }
  const wm = n => why({ money: n });
  const tired = (n = 15) => S.energy < n ? 'Too tired' : '';
  const win = (a, b) => { const h = hr(); return h < a || h >= b ? `Only ${a}:00\u2013${b}:00` : ''; };

  // ---------- profile data per person ----------
  function ensure(p) {
    if (p.r) return p.r;
    const g = gdOf(p), mg = S.gd, fit = mg === 'x' ? 0.5 : g !== mg ? 0.9 : 0.14, V = RD();
    const r = p.r = { st: 'friend', open: R() < fit, attr: 0, love: 0, pas: 0, trust: 0, com: 0, res: 0, cmf: rnd(5, 25), att: pick(['secure', 'secure', 'anxious', 'avoidant']), ll: pick(Object.keys(V.ll)), llk: 0, val: pick(Object.keys(V.vals)),
      kids: pick(['yes', 'yes', 'maybe', 'no']), mar: pick(['yes', 'yes', 'yes', 'maybe', 'maybe', 'no']), drv: rnd(2, 9), jl: rnd(5, 75), red: R() < 0.09 ? 1 : 0, fid: rnd(0, 100), inc: Math.round((0.5 + R() * 1.1) * 100) / 100, cx: rnd(-10, 10), pro: 'none', n: 0, sti: R() < 0.03 ? 1 : 0, dc: 0 };
    if (p.k === 'spouse') {
      Object.assign(r, { st: p.alive ? 'married' : 'widowed', open: true, a0: 1, attr: rnd(40, 70), love: cl(p.bond * 0.9), pas: rnd(25, 55), trust: cl(p.bond), com: rnd(75, 95), res: rnd(0, 15), cmf: rnd(80, 98), llk: 1, kk: 1, mk: 1, inl: rnd(40, 80), dM: day() - rnd(300, 7000), dT: day() - rnd(400, 7500), lq: day() });
      if (!p.alive) r.dd = 1; if (r.st === 'married') r.red = 0;
    }
    return r;
  }
  const okP = p => S.age >= 18 && p.alive !== false && p.age >= 18 && !['parent', 'sibling', 'child'].includes(p.k);
  const mine = () => people().filter(p => p.alive && p.r && COMM.includes(p.r.st));
  const elsewhere = p => mine().find(q => q !== p);
  const partners = (st = ACT) => people().filter(p => p.alive && p.r && st.includes(p.r.st));
  function setRole(p) { const r = p.r, g = gdOf(p); if (ROLE[r.st]) p.role = ROLE[r.st][g]; else if (r.st === 'widowed') p.role = g === 'f' ? 'late wife' : 'late husband'; if (r.st === 'ex') p.role = r.dv ? 'ex-' + (g === 'f' ? 'wife' : 'husband') : 'ex'; }
  const yrs = p => Math.max(0, (day() - (p.r.dM || p.r.dT || p.r.d0 || day())) / 365);
  const together = p => Math.max(0, day() - (p.r.dT || p.r.d0 || day()));

  // mutate meters; closeness (bond) follows the romance
  function mv(p, d) { const r = ensure(p); for (const k of M) if (d[k]) r[k] = cl(r[k] + d[k]); if (d.love) p.bond = cl(p.bond + d.love * 0.4); if (d.trust) p.bond = cl(p.bond + d.trust * 0.3); if (d.res) p.bond = cl(p.bond - d.res * 0.25); }
  const healthIdx = p => { const r = p.r; return r.love * 0.35 + r.trust * 0.25 + r.pas * 0.12 + r.com * 0.1 + r.cmf * 0.05 + r.attr * 0.1 - r.res * 0.5; };
  function initAttr(p) {
    const r = ensure(p); if (r.a0) return; r.a0 = 1;
    r.attr = cl(rnd(18, 48) + (S.sk.charisma || 0) * 3 + (S.rep - 20) * 0.12 + (S.mood - 50) * 0.12 + (p.like === S.tk.hobby ? 9 : 0) + (p.traits || []).filter(t => (S.traits || []).includes(t)).length * 5 - Math.abs(p.age - S.age) * 0.6 + Math.max(0, p.bond - 50) * 0.2 + (r.open ? 0 : -15), 5, 90);
    r.love = cl(p.bond * 0.12); r.trust = cl(p.bond * 0.5); r.cmf = cl(r.cmf + p.bond * 0.1);
  }
  function compat(p) {
    const r = ensure(p), m = S.rm; let c = 50 + r.cx; c += (p.traits || []).filter(t => (S.traits || []).includes(t)).length * 7; if (p.like === S.tk.hobby) c += 8;
    if (m.kids !== 'maybe' && r.kids !== 'maybe') c += m.kids === r.kids ? 8 : -16; else if (m.kids !== r.kids) c -= 3;
    const gap = Math.abs(p.age - S.age); c -= gap > 20 ? 18 : gap > 12 ? 9 : gap > 7 ? 3 : 0;
    const a = m.att + '/' + r.att; c += a === 'secure/secure' ? 8 : /secure/.test(a) ? 3 : a === 'anxious/avoidant' || a === 'avoidant/anxious' ? -13 : -3;
    return cl(c);
  }
  const compW = c => W(c, ['a poor match', 'a difficult match', 'a decent match', 'a good match', 'a natural match']);

  // ---------- homes and lists ----------
  function homeSet() {
    if (S.fl.withFamily) return;
    const sp = S.fam.find(p => p.k === 'spouse' && p.alive && p.lives), liv = S.fam.some(p => p.alive && p.lives);
    S.tk.homeName = sp || liv ? 'Home' : 'Your place';
    S.tk.homeDesc = sp ? `Home with ${sp.name}: two mugs on the counter, one still warm.` : liv ? 'Home: a small, busy life with a lot of kitchen noise.' : 'Your place in {city}: a bed, a desk, and the quiet of your own routine.';
  }
  function toFam(p) {
    if (S.fam.includes(p)) return;
    for (const L of [S.fr, S.know]) { const i = L.indexOf(p); if (i >= 0) L.splice(i, 1); }
    p.k = 'spouse'; p.kind = 'family'; S.fam.push(p); S.tk.spouse = p.name; if (S.tk.friend === p.name) S.tk.friend = S.fr[0]?.name || S.tk.friend;
  }
  function toKnow(p) {
    const i = S.fam.indexOf(p); if (i >= 0) S.fam.splice(i, 1); if (!S.know.includes(p)) S.know.push(p);
    delete p.k; p.kind = 'local'; p.lives = false; S.tk.spouse = S.fam.find(x => x.k === 'spouse' && x.alive)?.name; homeSet();
  }
  function moveIn(p) {
    if (S.fl.withFamily) { S.fl.withFamily = 0; S.fam.forEach(f => { if (f.k !== 'spouse') f.lives = false; }); }
    toFam(p); p.lives = true; p.r.mi = day(); setRole(p); homeSet();
  }

  // ---------- migration ----------
  function migrate() {
    const defInto = () => { if (S.gd === 'x') return 'a'; const q = R(); return q < 0.84 ? (S.gd === 'f' ? 'm' : 'f') : q < 0.92 ? S.gd : 'a'; };
    S.rm ??= {}; const m = S.rm; m.into ??= defInto(); m.kids ??= pick(['yes', 'yes', 'maybe', 'no']); m.drv ??= rnd(3, 8); m.att ??= pick(['secure', 'secure', 'anxious', 'avoidant']); m.pro ??= 'none';
    m.hist ??= []; m.sec ??= []; for (const k of ['exes', 'marr', 'divs', 'cdl', 'n', 'lastEv', 'tested', 'births', 'pillD']) m[k] ??= 0;
    m.sti ??= 0; m.preg ??= null; m.div ??= null; m.alim ??= null; m.ev ??= null; S.rmv ??= 'main'; S.know ??= [];
    for (const p of people()) if (p.k === 'spouse' || p.r) { ensure(p); if (p.r) setRole(p); }
    for (const p of S.fam) if (p.k === 'child' && p.alive) { p.gd ??= gdOf(p); p.cust ??= 'you'; }
  }

  // ---------- daily simulation (runs every day, also while time is skipped) ----------
  function touch(p) { const r = p.r; if (!r || !ACT.includes(r.st)) return; r.lq = day(); r.res = cl(r.res - 0.4); r.love = cl(r.love + 0.1); }
  function tickP(p) {
    const r = p.r, st = r.st, d = day();
    if (!p.alive) return;
    if (st === 'dating' || COMM.includes(st)) {
      const cohab = p.lives; if (cohab) { p.lastc = d; r.lq = d; }
      const gap = d - (p.lastc || p.since || d), need = { secure: 7, anxious: 3, avoidant: 14 }[r.att];
      if (!cohab && gap > need) { r.res += 0.5; r.love -= 0.12; r.trust -= COMM.includes(st) ? 0.1 : 0.04; r.pas -= 0.15; }
      r.pas -= st === 'married' ? 0.025 : 0.04;
      const gi = d - (r.lastI ?? r.dT ?? r.d0 ?? d); if (COMM.includes(st) && gi > 75 - r.drv * 5) { r.res += 0.1; r.pas -= 0.1; }
      if (r.trust > 55 && r.res < 35 && d - (r.lq || 0) < 14) r.love += 0.05;
      r.res -= 0.07 * (r.att === 'secure' ? 1.5 : 1); if (r.res < 20 && cohab) r.trust += 0.03; if (gap < 30) r.cmf += 0.05;
      r.pas = Math.max(8, r.pas);
      if (COMM.includes(st) && r.fid > 65 && !r.aff && (r.love < 50 || r.com < 50 || r.res > 40) && R() < 0.0012) r.aff = d;
      if (r.aff && R() < 0.03 && r.fid > 65) r.res += 0.2;
    } else if (st === 'separated') r.res += 0.05;
    else if (st === 'ex') { r.love -= 0.05; r.pas -= 0.1; r.res -= 0.05; if (r.hx && !r.blocked && !r.order && R() < 0.01) r.hxq = 1; }
    for (const k of M) r[k] = cl(r[k]);
  }
  function grief(p, mult = 1) {
    const r = p.r, g = cl((r.love * 0.5 + r.com * 0.2 + yrs(p) * 4) * mult * 0.5, 4, 40);
    S.mood = cl(S.mood - g * 0.7); S.stress = cl(S.stress + g * 0.5); S.lonely = cl(S.lonely + g * 0.6);
    return g;
  }
  function deadCheck() {
    for (const p of people()) if (p.r && !p.alive && !p.r.dd) {
      p.r.dd = 1; if (ACT.includes(p.r.st)) { p.r.st = 'widowed'; p.lives = false; setRole(p); S.tk.spouse = S.fam.find(x => x.k === 'spouse' && x.alive)?.name; homeSet();
        S.rm.hist.push(`Age ${S.age}: ${p.name} died.`); if (S.rm.div?.pid === p.id) S.rm.div = null; if (S.rm.preg?.pid === p.id) S.rm.preg.pid = null; }
    }
  }
  function upkeep() {
    const m = S.rm, d = day();
    for (const c of S.fam) if (c.k === 'child' && c.alive && c.age < 18 && c.cust !== 'them') S.money = Math.max(0, Math.round((S.money - (c.cust === 'shared' ? 0.5 : 1) * 0.9 * S.kc * (c.age < 5 ? 1.4 : 1)) * 100) / 100);
    if (d % 30 === 0) {
      if (m.pro === 'pill' && S.age >= 18) { if (S.money >= 15 * S.kc) S.money = Math.round((S.money - 15 * S.kc) * 10) / 10; else { m.pro = 'none'; say('You cannot afford your monthly prescription and stop taking it.', 'bad'); } }
      if (m.sti?.tx && m.sti.k === 'c') S.money = Math.max(0, Math.round((S.money - 25 * S.kc) * 10) / 10);
      if (m.alim) { const a = m.alim; if (d > a.until) m.alim = null; else if (a.dir === 'pay') S.money = Math.max(0, Math.round((S.money - a.amt) * 10) / 10); else S.money = Math.round((S.money + a.amt) * 10) / 10; }
      for (const c of S.fam) if (c.k === 'child' && c.cust === 'them' && c.age < 18 && c.alive) S.money = Math.max(0, Math.round((S.money - 40 * S.kw) * 10) / 10);
    }
    const s = m.sti; if (s && !s.known && d - s.d === 9) say('Something feels wrong, and it will not go away. It would be wise to get a sexual health check at the clinic.', 'bad');
    if (s && !s.tx && s.k === 'c' && d % 5 === 0) S.health = cl(S.health - 0.15);
  }
  function secCheck() {
    const m = S.rm; for (let i = m.sec.length - 1; i >= 0; i--) {
      const e = m.sec[i], q = byId(e.a); if (!q || !q.alive || !q.r || !COMM.includes(q.r.st)) { m.sec.splice(i, 1); continue; }
      if (R() < (e.lite ? 0.0012 : 0.0045) * (1 + (e.n || 0))) { m.sec.splice(i, 1); trigger('caught', q); }
    }
  }
  function anniv(p) {
    const r = p.r, d = day(), base = r.st === 'married' ? r.dM : r.st === 'dating' || r.st === 'together' || r.st === 'engaged' ? (r.dT || r.d0) : null;
    if (base && d > base + 300 && (d - base) % 365 === 0) { if (live()) trigger('anniv', p); else { mv(p, { love: 2, trust: 1 }); } }
  }
  function daily() {
    if (!S.rm) return; const m = S.rm; deadCheck();
    for (const p of people()) if (p.r) { tickP(p); if (p.alive && ACT.includes(p.r.st)) anniv(p); }
    pregTick(); divTick(); upkeep(); secCheck();
    if (S.age >= 18) spawn();
  }

  // ---------- yearly ----------
  function yearly(sp) {
    const m = S.rm; if (!m) return;
    if (S.age > 50) m.drv = Math.max(1, m.drv - 0.2);
    for (const p of people()) if (p.r && p.alive) { if (p.age > 50) p.r.drv = Math.max(1, p.r.drv - 0.2); if (p.r.inl != null && p.r.inl < 30 && COMM.includes(p.r.st)) mv(p, { res: 3 }); }
    for (const c of S.fam) if (c.k === 'child' && c.alive && c.age >= 18 && c.lives && R() < 0.3) { c.lives = false; sp([`${c.name} has moved out into a place of ${gdOf(c) === 'f' ? 'her' : 'his'} own. The house is quieter and your heart is fuller and emptier at the same time.`, '']); homeSet(); }
  }

  // ---------- meeting people ----------
  function mkCand(g, role, how) {
    const nm = getD().people[S.rgn || 0][g], used = new Set(people().map(p => p.name)); let name; for (let i = 0; i < 14; i++) { name = pick(nm); if (!used.has(name)) break; }
    const a = cl(S.age + rnd(...(S.age < 30 ? [-3, 7] : S.age < 55 ? [-8, 8] : [-9, 7])), 18, 88);
    const p = { name, role, age: a, bond: rnd(12, 24), kind: 'local', how, since: day(), gd: g }; norm(p, 'local'); S.know.push(p);
    const r = ensure(p); r.open = R() < 0.96; initAttr(p); r.attr = cl(r.attr + rnd(0, 12)); api.note(`Met ${name}, ${role}.`); return p;
  }
  function mingle(kind, v) {
    const m = S.rm, g = m.into === 'a' ? (R() < 0.5 ? 'f' : 'm') : m.into, f = S.fr.length ? pick(S.fr) : null;
    const spec = { app: ['a match from a dating app', 'you matched online', 1], out: [`someone you met at ${api.place()}`, `you got talking at ${api.place()}`, 1], set: [f ? `a friend of ${f.name}` : 'a friend of a friend', f ? `${f.name} set you up` : 'a friend set you up', 1.5] }[kind];
    if (R() < 0.78 + (S.sk.charisma || 0) * 0.02 + (S.mood - 50) * 0.002) {
      const p = mkCand(g, spec[0], spec[1]); S.pv = p.id;
      say(`${pick(kind === 'app' ? ['A match turns into a long chat, then a plan.', 'A message arrives that is actually interesting.'] : ['Eye contact becomes a conversation.', 'A shared joke becomes an introduction.'])} You meet ${p.name}, ${p.age}, ${spec[0]}. You can find ${gdOf(p) === 'f' ? 'her' : 'him'} in the People tab or on the Love page.`, 'good');
      fx({ time: spec[2], mood: 3, lonely: -5 }); hist(p, 'You met.');
    } else { say(pick(['You swipe and talk and nothing sparks.', 'It is a pleasant, uneventful hour with nobody who clicks.', 'You look around hopefully, and people look back politely, and that is all.']), ''); fx({ time: spec[2], mood: -1 }); }
    after(spec[2], v);
  }
  function cheatLog(p) { const q = elsewhere(p); if (!q) return; const m = S.rm, e = m.sec.find(x => x.a === q.id); if (e) e.n = (e.n || 0) + 1; else m.sec.push({ a: q.id, d: day(), n: 0 }); S.stress = cl(S.stress + 2); }

  function flirt(p) {
    const r = ensure(p); initAttr(p); cheatLog(p);
    if (!r.open) { r.no = day(); say(pick(RD().flirt.no), '', p); fx({ time: 0.5, mood: -4, stress: 2 }); hist(p, 'Flirted. It was not returned.'); return after(0.5, 'rom'); }
    const pc = cl(0.3 + r.attr / 180 + (S.sk.charisma || 0) * 0.04 + (S.mood - 50) * 0.002 + luckF() * 0.1, 0.08, 0.92);
    if (R() < pc) { if (r.st === 'friend') r.st = 'flirt'; setRole(p); mv(p, { attr: 6, love: 2, pas: 3 }); say(pick(RD().flirt.yes), 'good', p); fx({ time: 0.5, mood: 4, lonely: -5 }); hist(p, 'Flirted. It was returned.'); }
    else { mv(p, { attr: -2 }); say(pick(RD().flirt.meh), '', p); fx({ time: 0.5, mood: -1 }); hist(p, 'Flirted. It fell flat.'); }
    after(0.5, 'rom');
  }
  function askOut(p) {
    const r = ensure(p), pc = cl(0.2 + r.attr / 220 + r.love / 250 + r.trust / 400 + (S.sk.charisma || 0) * 0.03 + luckF() * 0.1 + (compat(p) - 50) / 300, 0.06, 0.94); cheatLog(p);
    if (R() < pc) { r.st = 'dating'; r.d0 = day(); mv(p, { attr: 5, love: 4, pas: 4, trust: 3, com: 8 }); setRole(p); S.rm.n++; say(pick(RD().askout.yes), 'good', p); fx({ time: 0.5, mood: 8, lonely: -8 }); chron(`Started dating ${p.name}.`); api.note(`Started dating ${p.name}.`); hist(p, 'Started dating.'); }
    else { mv(p, { attr: -4, trust: -2 }); say(pick(RD().askout.no), 'bad', p); fx({ time: 0.5, mood: -5, stress: 3 }); hist(p, 'Asked them out. They said no.'); }
    after(0.5, 'rom');
  }

  // ---------- dates and gestures ----------
  function doDate(p, d) {
    const r = ensure(p); cheatLog(p); initAttr(p); const mt = r.ll === d.ll;
    const q = 0.32 + compat(p) / 260 + (S.sk.charisma || 0) * 0.025 + (S.mood - 50) * 0.002 - (S.stress > 70 ? 0.06 : 0) + luckF() * 0.1 + r.attr / 700 + r.love / 800 + R() * 0.32 - r.res / 450 + (mt ? 0.08 : 0);
    const t = q > 0.8 ? 'great' : q > 0.57 ? 'good' : q > 0.38 ? 'meh' : 'bad', k = { great: 1.5, good: 1, meh: 0.35, bad: -0.4 }[t] * (mt ? 1.35 : 1), s = { great: 1.2, good: 1, meh: 0.5, bad: -0.25 }[t];
    const dd = {}; for (const [a, v] of Object.entries(d.b)) dd[a] = v * k; mv(p, dd); r.dc++; r.lastD = day(); r.lq = day();
    const x = {}; for (const [a, v] of Object.entries(d.mx)) x[a] = a === 'hunger' || a === 'energy' ? v : v * s; if (d.cost) x.money = -d.cost; x.time = d.h;
    say(pick(d.t[t]), t === 'bad' ? 'bad' : t === 'meh' ? '' : 'good', p);
    if (mt && !r.llk && t !== 'bad' && R() < 0.5 || r.dc >= 6 && !r.llk) { r.llk = 1; say(`You notice that ${p.name} lights up most with ${RD().llh[r.ll]}. That is worth remembering.`, 'sys', p); }
    hist(p, d.l.replace(/\s*\(.*?\)/g, '').replace('{n}', p.name) + (t === 'great' ? ' It was wonderful.' : t === 'bad' ? ' It went badly.' : '')); fx(x); after(d.h, 'rom');
  }
  function compliment(p) {
    const r = ensure(p), ok = R() < 0.55 + (S.sk.charisma || 0) * 0.04 + (r.ll === 'words' ? 0.15 : 0);
    mv(p, ok ? { attr: 2, love: 1.5, pas: 1 } : { attr: 0 }); say(pick(RD().compliment[ok ? 'yes' : 'meh']), ok ? 'good' : '', p); fx({ time: 0.1, mood: ok ? 2 : 0 }); hist(p, 'Paid a compliment.'); after(0.1, 'rom');
  }
  function sayLove(p) {
    const r = ensure(p), ok = r.love >= 45 || (r.love >= 30 && R() < 0.4); r.said = 1; say(pick(RD().ilu), 'good', p);
    if (ok) { mv(p, { love: 6, trust: 3, com: 6 }); say(pick(RD().ilu_ok), 'good', p, true); fx({ time: 0.25, mood: 10, lonely: -10 }); chron(`Told ${p.name} you love ${gdOf(p) === 'f' ? 'her' : 'him'}.`); hist(p, 'Said I love you, and heard it back.'); }
    else { mv(p, { com: -3, trust: -1 }); say(pick(RD().ilu_no), 'bad', p); fx({ time: 0.25, mood: -5, stress: 3 }); hist(p, 'Said I love you. It was not returned.'); }
    after(0.25, 'rom');
  }
  function kiss(p) {
    const r = ensure(p); cheatLog(p);
    if (r.cmf < 12 || R() < 0.1 && r.attr < 40) { say(RD().kiss.no[0], '', p); mv(p, { cmf: 2 }); fx({ time: 0.1, mood: -1 }); }
    else { mv(p, { pas: 4, love: 2, attr: 2, cmf: 3 }); r.kissed = 1; say(pick(RD().kiss.yes), 'good', p); fx({ time: 0.1, mood: 5, lonely: -4 }); }
    hist(p, 'Shared a kiss.'); after(0.1, 'rom');
  }

  // ---------- intimacy, protection and sexual health ----------
  const repro = g => g === 'x' ? (S.rm.xr ??= pick(['f', 'm'])) : g;
  const canConceive = p => repro(S.gd) !== repro(gdOf(p)) && !(repro(S.gd) === 'f' ? S.age > 52 : p.age > 52);
  const carrierOf = () => repro(S.gd) === 'f' ? 'you' : 'them';
  const methodNow = p => canConceive(p) ? (carrierOf() === 'you' ? S.rm.pro : p.r.pro) : 'n/a';
  const condoms = () => (S.rm.cdl || 0) + (S.inv.condoms || 0) * 3;
  function useCondom() { if (S.rm.cdl > 0) { S.rm.cdl--; return true; } if (S.inv.condoms > 0) { S.inv.condoms--; S.rm.cdl = 2; return true; } return false; }
  function protOptions(p, kind) {
    const mth = methodNow(p), has = condoms() > 0, o = [];
    o.push({ l: has ? `Use a condom (${condoms()} left)` : 'Use a condom (you have none)', a: `int:condom:${kind}`, dis: has ? '' : 'None in your pockets' });
    o.push({ l: mth === 'n/a' ? 'No barrier (infection risk remains)' : mth === 'none' ? 'No protection (risk of pregnancy and infection)' : `Rely on ${MTH[mth]} alone (no barrier)`, a: `int:none:${kind}` });
    o.push({ l: 'Not tonight', a: 'int:no:' + kind }); return o;
  }
  const intimReason = (p, need) => { const r = p.r; if (S.age < 18 || p.age < 18) return 'Adults only'; if (r.cmf < need) return 'Not comfortable enough yet'; if (S.energy < 20) return 'Too tired'; if (r.lastIt != null && S.t - r.lastIt < 360) return 'Give it some time'; return ''; };
  function intimate(p, how, kind, noAfter) {
    const r = ensure(p), m = S.rm, T = RD().intim; cheatLog(p);
    if (how === 'no') { say(pick(T.decline), '', p); mv(p, { cmf: 1, trust: 1 }); fx({ time: 0.5, mood: 1 }); hist(p, 'Decided to wait.'); return noAfter ? 0 : after(0.5, 'rom'); }
    const cd = how === 'condom' && useCondom(), first = !r.n;
    let q = 0.3 + r.love / 260 + r.trust / 300 + r.cmf / 320 + r.attr / 500 + (S.mood - 50) * 0.002 - S.stress * 0.0015 + (S.energy < 30 ? -0.1 : 0) + R() * 0.3 - Math.abs(r.drv - m.drv) * 0.012 + (kind === 'new' ? (r.val === 'adventurous' ? 0.07 : -0.02) : 0) + (cd ? -0.01 : 0);
    const t = q > 0.78 ? 'great' : q > 0.55 ? 'good' : q > 0.36 ? 'ok' : 'awkward';
    const E = { great: [{ pas: 7, love: 3, trust: 2, cmf: 3, attr: 2 }, { mood: 9, stress: -8, lonely: -14 }], good: [{ pas: 4, love: 2, trust: 1, cmf: 2, attr: 1 }, { mood: 6, stress: -5, lonely: -10 }], ok: [{ pas: 1, love: 1, cmf: 1 }, { mood: 2, stress: -2, lonely: -5 }], awkward: [{ pas: -1, cmf: -1, res: 1 }, { mood: -2, stress: 1, lonely: -1 }] }[t];
    say(pick(first ? T.first[t] : T[kind === 'new' ? 'new' : 'night'][t]) + (cd ? ' You were careful.' : ''), t === 'awkward' ? '' : 'good', p); if (R() < 0.6) say(pick(T.after), 'sys', p);
    mv(p, E[0]); r.n++; r.lastI = day(); r.lastIt = S.t; r.lq = day(); if (first) chron(`First night with ${p.name}.`);
    risks(p, cd ? 'condom' : 'none'); hist(p, 'Spent the night together.'); fx({ time: 2.5, ...E[1], energy: -10 }); if (!noAfter) after(2.5, 'rom');
  }
  function risks(p, how) {
    const r = p.r, m = S.rm, cd = how === 'condom', c = cd ? 0.06 : 0.28;
    if (r.sti && !m.sti && R() < c * (r.stiTx ? 0.1 : 1)) m.sti = { k: R() < 0.7 ? 't' : 'c', d: day(), known: 0, tx: 0 };
    else if (m.sti && !r.sti && R() < c * (m.sti.tx ? 0.1 : 1)) { r.sti = 1; r.infByYou = 1; }
    if (m.preg || !canConceive(p)) return;
    const carrier = carrierOf(), age = carrier === 'you' ? S.age : p.age, fert = age < 20 ? 0.85 : age < 30 ? 1 : age < 35 ? 0.85 : age < 40 ? 0.55 : age < 45 ? 0.2 : age < 50 ? 0.04 : 0.005;
    let fail = FAIL[carrier === 'you' ? m.pro : r.pro] ?? 1; if (cd) fail *= 0.13;
    if (!cd && fail > 0.2) m.lastUnp = day();
    m.risk = { d: day(), pid: p.id };
    if (R() < 0.085 * fert * fail * (r.try ? 2.2 : 1)) m.preg = { pid: p.id, who: carrier, d0: day(), known: 0, prep: 0, apt: 0 };
  }
  function checkup(p) {
    const m = S.rm; fx({ time: 2, money: -30 }); m.tested = day();
    if (m.sti) { m.sti.known = 1; say(m.sti.k === 't' ? 'The test comes back positive for an infection that is easily treated. The doctor is calm and practical about it.' : 'The test finds a lifelong infection. It is manageable with ongoing treatment, and the doctor explains how, patiently.', 'bad'); S.stress = cl(S.stress + 8); }
    else say('All clear. The relief is physical.', 'good');
    after(2, p ? 'rom' : 'love');
  }
  function treat() { const s = S.rm.sti; if (!s) return; if (s.k === 't') { S.rm.sti = 0; say('A short course of treatment, and you are cured.', 'good'); fx({ time: 1, money: -45, stress: -4 }); } else { s.tx = 1; say('You start ongoing treatment. With it, life goes on normally and the risk to others drops sharply.', 'good'); fx({ time: 1, money: -25, stress: -3 }); } after(1, 'love'); }
  function testTogether(p) {
    const r = p.r; fx({ time: 2, money: -30 }); S.rm.tested = day(); r.stk = 1;
    if (S.rm.sti) { S.rm.sti.known = 1; say('Your result is positive. You have to tell {n} what it means, and for now you sit with it.', 'bad', p); }
    if (r.sti) { r.stiTx = 1; mv(p, { trust: -2 }); say('{n}\'s result is positive for an infection. It is treatable, and {he} is shaken. You decide to face it together.', 'bad', p); r.sti = 0; mv(p, { trust: 4, love: 2 }); }
    else if (!S.rm.sti) { mv(p, { trust: 5, love: 2, cmf: 3 }); say('You both come back clear. Asking was a quiet form of care, and {n} knows it.', 'good', p); }
    hist(p, 'Got tested together.'); after(2, 'rom');
  }
  function tellSti(p) { const r = p.r; if (r.stiTold) return; r.stiTold = 1; if (r.infByYou) { r.infByYou = 0; r.stiTx = 1; mv(p, { trust: -8, res: 8 }); say('You tell {n} what you have learned. {He} is hurt, and also grateful you were honest. {He} gets tested.', 'bad', p); } else { mv(p, { trust: 6, love: 2 }); say('{n} appreciates your honesty. {He} gets tested, and it comes back fine.', 'good', p); } fx({ time: 1, stress: 3 }); after(1, 'rom'); }
  function pickPro(p, meth) {
    const own = carrierOf() === 'you'; fx({ time: 1, money: meth === 'iud' ? -120 : meth === 'implant' ? -150 : meth === 'pill' ? -15 : 0 });
    if (own) { S.rm.pro = meth; say(`You settle on ${MTH[meth]}. ${meth === 'none' ? '' : 'It is a weight off your mind.'}`, 'good'); } else { p.r.pro = meth; mv(p, { trust: 2, cmf: 2 }); say(`{n} agrees to use ${MTH[meth]}. It is a conversation that makes you closer.`, 'good', p); }
    after(1, 'rom');
  }
  function takeEC(p) {
    fx({ time: 0.5, money: -25 }); const m = S.rm; const P = m.preg;
    if (P && P.d0 === m.risk?.d && !P.known && R() < 0.75) { m.preg = null; say('You take the emergency pill as soon as you can. In the days that follow, nothing happens, which is the point.', 'good'); } else say('You take the emergency pill, just to be safe.', '');
    m.risk = null; after(0.5, 'rom');
  }
  function pregTest() {
    fx({ time: 0.25, money: -12 }); const P = S.rm.preg;
    if (P && !P.known && day() - P.d0 >= 10) { P.known = 1; trigger('pnews', P.pid ? byId(P.pid) : null); return after(0.25, 'rom'); }
    say(P && !P.known ? 'The test shows negative, though it may be too early to say.' : P ? 'You already know the answer.' : 'Negative. You let out a long breath.', P ? 'sys' : 'good'); after(0.25, 'rom');
  }

  // ---------- pregnancy and children ----------
  function pregTick() {
    const P = S.rm.preg; if (!P) return; const a = day() - P.d0, p = P.pid ? byId(P.pid) : null;
    if (!P.known && a >= 24) { P.known = 1; if (live()) { if (!trigger('pnews', p)) P.known = 0; } else autoEv({ k: 'pnews' }, dynDef({ k: 'pnews' }, p), p); }
    if (!S.rm.preg) return;
    if (a >= 42 && a <= 84 && !P.lost && R() < 0.0028) { P.lost = 1; S.rm.preg = null; S.mood = cl(S.mood - 18); S.stress = cl(S.stress + 12); say(pick(RD().preg.lost), 'bad', p, true); if (p?.r) mv(p, { trust: 3, love: 1 }); return; }
    if (a >= 280 && P.known) birth(p);
  }
  function mkKid(p, g, name) {
    const m = S.rm, P = m.preg; const kid = { role: g === 'f' ? 'daughter' : 'son', k: 'child', name, age: 0, bond: 70, alive: true, lives: true, gd: g, par: p ? [p.id] : [], cust: 'you', since: day() }; norm(kid, 'family');
    if (p && !p.lives && P.who === 'them' && p.r.st !== 'married') { kid.cust = 'them'; kid.lives = false; }
    S.fam.push(kid); S.tk.child = kid.name; m.births++; m.preg = null;
    const bill = P?.prep ? 120 : 300; S.money = Math.max(0, Math.round((S.money - bill * S.kc) * 10) / 10);
    if (P.who === 'you') { S.health = cl(S.health - 12); S.energy = cl(S.energy - 25); } S.mood = cl(S.mood + 14); S.stress = cl(S.stress + 6); S.lonely = cl(S.lonely - 14);
    say(`${pick(RD().preg.birth)} You name ${gdOf(kid) === 'f' ? 'her' : 'him'} ${name}. The hospital bill is @${bill}${P.prep ? ', softened by the preparations you made' : ''}.`, 'good', p, true); chron(`${name} was born.`);
    if (p?.r && ACT.includes(p.r.st)) mv(p, { love: 6, trust: 4, com: 6, pas: -3 }); homeSet();
  }
  function birth(p) {
    const g = R() < 0.5 ? 'f' : 'm', nm = getD().people[S.rgn || 0][g], n1 = pick(nm); let n2 = pick(nm); for (let i = 0; i < 5 && n2 === n1; i++) n2 = pick(nm);
    if (live()) { if (!trigger('baby', p, { g, names: [n1, n2] })) return; } else mkKid(p, g, n1);
  }
  function endPregnancy(p) {
    const P = S.rm.preg; S.rm.preg = null; S.mood = cl(S.mood - 10); S.stress = cl(S.stress + 8);
    say('It is a private, difficult decision, made with care. The days afterward are quiet.', 'sys'); chron('Ended a pregnancy.');
    if (p?.r) { const want = p.r.kids === 'yes' ? -1 : p.r.kids === 'no' ? 1 : 0; mv(p, { love: want * 3, trust: want * 2, res: want < 0 ? 12 : 0 }); }
  }
  const kidsOf = p => S.fam.filter(c => c.k === 'child' && c.alive && c.age < 18 && (!c.par || !c.par.length || c.par.includes(p.id) || p.k === 'spouse'));

  // ---------- commitment ladder ----------
  function official(p) {
    const r = p.r, pc = cl(0.15 + r.love / 160 + r.trust / 250 + r.com / 300 + compat(p) / 400 - r.res / 200 - (r.att === 'avoidant' ? 0.1 : 0), 0.05, 0.95);
    if (R() < pc) { r.st = 'together'; r.dT = day(); mv(p, { com: 15, love: 3, trust: 2 }); setRole(p); say("{n} says yes. You are officially together, and both of you grin like fools.", 'good', p, true); fx({ time: 0.5, mood: 8, lonely: -8 }); chron(`Became official with ${p.name}.`); }
    else { mv(p, { com: -2, trust: -1 }); say("{n} says {he} is not ready to label it yet. You can wait, or not.", 'bad', p); fx({ time: 0.5, mood: -3, stress: 2 }); }
    hist(p, 'Talked about making it official.'); after(0.5, 'rom');
  }
  function movein(p) {
    const r = p.r, pc = cl(0.2 + r.love / 150 + r.trust / 200 + r.com / 250 - r.res / 200, 0.05, 0.95);
    if (R() < pc) { moveIn(p); mv(p, { com: 12, love: 3 }); say("{n} moves in. The apartment shrinks and fills with things that are not yours, and that is the best part.", 'good', p, true); fx({ time: 4, mood: 8, lonely: -12, energy: -10 }); chron(`Moved in with ${p.name}.`); }
    else { mv(p, { com: -3 }); say("{n} wants to wait a little longer before sharing a home.", 'bad', p); fx({ time: 0.5, mood: -2 }); }
    after(0.5, 'rom');
  }
  function talkFuture(p) {
    const r = p.r; r.kk = 1; r.mk = 1; const mm = S.rm.kids === r.kids || S.rm.kids === 'maybe' || r.kids === 'maybe';
    say(`You talk about the future for hours. {n} ${r.kids === 'yes' ? 'wants children' : r.kids === 'no' ? 'does not want children' : 'is unsure about children'}, and ${r.mar === 'yes' ? 'sees marriage in the picture' : r.mar === 'no' ? 'is not sure marriage is for {him}' : 'is open to marriage, in no hurry'}. ${mm ? 'You are broadly on the same page.' : 'You see it quite differently, and neither of you pretends otherwise.'}`, mm ? 'good' : 'bad', p);
    mv(p, { trust: 3, com: mm ? 4 : -2, res: mm ? 0 : 3 }); hist(p, 'Talked about the future.'); fx({ time: 1.5, mood: mm ? 2 : -1, stress: mm ? -2 : 3 }); after(1.5, 'rom');
  }
  function meetTheirs(p) {
    const r = p.r, a = cl(40 + (S.sk.charisma || 0) * 4 + (compat(p) - 50) * 0.3 + rnd(-18, 18) + (S.rep - 20) * 0.1); r.inl = a;
    say(a > 70 ? "{n}'s family takes to you immediately. By the end of dinner someone is already talking about holidays." : a > 45 ? "{n}'s family is polite and a little reserved. You get through the evening, and that counts." : "{n}'s family is cold. Nobody says anything cruel; they just never quite let you in.", a > 45 ? 'good' : 'bad', p);
    mv(p, { com: 4, trust: a > 45 ? 3 : 0, res: a < 30 ? 4 : 0 }); fx({ time: 3, mood: a > 45 ? 4 : -3, stress: a > 45 ? -2 : 5, energy: -6 }); hist(p, 'Met their family.'); after(3, 'rom');
  }
  function introduceMine(p) {
    const r = p.r, kin = S.fam.filter(f => f.alive && f.k !== 'spouse' && f.k !== 'child'), fa = kin.length ? kin.reduce((s, f) => s + f.bond, 0) / kin.length : 50, a = cl(40 + (fa - 50) * 0.2 + (compat(p) - 50) * 0.3 + rnd(-15, 15)); r.fa = a;
    say(a > 60 ? 'Your family likes {n} at once, which is a small miracle. Someone slips {him} a second helping.' : a > 40 ? 'Your family is cautious but kind to {n}. The questions are many and the verdict is pending.' : 'Your family reserves judgment, loudly. {n} handles it with admirable calm.', a > 40 ? 'good' : 'bad', p);
    mv(p, { trust: 3, com: 3, love: a > 50 ? 2 : -1 }); fx({ time: 3, mood: 2, stress: a > 40 ? -1 : 4 }); hist(p, 'Introduced them to your family.'); after(3, 'rom');
  }
  function propose(p, ring) {
    const r = p.r, rg = RD().rings[ring], d = together(p);
    const pc = cl(0.3 + r.love / 220 + r.trust / 300 + r.com / 300 + compat(p) / 500 + rg.q + (d > 200 ? 0.08 : 0) - r.res / 150 + (r.mar === 'no' ? -0.35 : r.mar === 'yes' ? 0.1 : 0) + ((r.inl ?? 50) - 50) / 400 + (r.kids !== S.rm.kids && r.kids !== 'maybe' && S.rm.kids !== 'maybe' ? -0.12 : 0), 0.03, 0.97);
    if (rg.c) fx({ money: -rg.c }); r.mk = 1; if (R() < pc) { r.st = 'engaged'; r.dE = day(); r.ring = rg.n; r.mar = 'yes'; mv(p, { love: 8, com: 20, trust: 4, pas: 6 }); setRole(p); say("{n} says yes. You are engaged, and the future suddenly has a date in it.", 'good', p, true); fx({ time: 1, mood: 14, lonely: -12 }); chron(`Got engaged to ${p.name}.`); }
    else { mv(p, { com: -6, trust: -3, love: -3, res: 3 }); say(r.mar === 'no' ? "{n} says no, kindly. Marriage is not something {he} wants, and it hurts that you did not know." : "{n} says not yet. It is a gentler answer than no, and a harder one to live with.", 'bad', p); fx({ time: 1, mood: -8, stress: 6 }); }
    hist(p, 'Proposed.'); after(1, 'rom');
  }
  function prenup(p) {
    const r = p.r, pc = cl(0.5 + r.trust / 200 + r.love / 300 - r.res / 200, 0.1, 0.9); fx({ time: 1, money: -60 }); r.preAsk = 1;
    if (R() < pc) { r.pre = 1; mv(p, { trust: -2 }); say('{n} understands. Both of you sign. It protects what each of you brought into the marriage.', 'good', p); } else { mv(p, { trust: -8, love: -3, res: 5 }); say('{n} is hurt that you asked. {He} signs, eventually, but not without a long silence first.', 'bad', p); r.pre = 1; }
    hist(p, 'Prenuptial agreement.'); after(1, 'rom');
  }
  function wedding(p, wi) {
    const r = p.r, w = RD().weddings[wi], guests = S.fam.filter(f => f.alive && f.bond > 40 && f.k !== 'spouse').length + S.fr.length, luck = R() + luckF() * 0.3;
    const gifts = Math.round(w.g * (3 + guests) * (0.5 + R()) / 3), mood = w.mood + (luck > 0.8 ? 4 : luck < 0.2 ? -6 : 0);
    r.st = 'married'; r.dM = day(); r.mar = 'yes'; r.wed = w.id; S.rm.marr++; if (!p.lives) moveIn(p); else { toFam(p); setRole(p); }
    mv(p, { love: 8, com: 20, trust: 4, pas: 5 }); say(`${w.line} ${luck > 0.8 ? 'Everything goes perfectly.' : luck < 0.2 ? 'Something goes comically wrong and becomes the story people tell for years.' : ''} You are married.`, 'good', p, true);
    fx({ time: w.h, money: gifts - 0, mood, stress: luck < 0.2 ? 4 : -5, lonely: -15, energy: -10 }); if (w.c) fx({ money: -w.c }); chron(`Married ${p.name}.`); hist(p, 'Got married.'); S.tk.spouse = p.name; after(w.h, 'rom');
  }
  function honeymoon(p) { const r = p.r; r.hm = 1; mv(p, { pas: 10, love: 6, trust: 3, res: -6, cmf: 3 }); say(pick(RD().honeymoon), 'good', p); fx({ time: 24, money: -600, mood: 12, stress: -14, lonely: -10, hunger: 20, energy: 6 }); hist(p, 'Honeymoon.'); after(24, 'rom'); }
  function tryBaby(p, on) { p.r.try = on ? 1 : 0; say(on ? "You and {n} decide to stop preventing pregnancy and see what happens. It feels both enormous and ordinary." : "You and {n} decide to stop trying for now.", 'sys', p); after(0, 'rom'); }

  // ---------- conflict repair and care ----------
  function repair(p, kind) {
    const r = p.r, ch = (S.sk.charisma || 0) * 0.04;
    if (kind === 'apologize') { const ok = R() < 0.55 + ch + (r.res < 40 ? 0.2 : 0) - (r.att === 'avoidant' ? 0.05 : 0); if (ok) { mv(p, { res: -12, trust: 3, love: 1 }); say('You apologize properly, without the "but". {n} lets some of it go.', 'good', p); } else { mv(p, { res: 3 }); say('The apology comes out wrong. {n} says it is too soon.', 'bad', p); } fx({ time: 0.5, stress: ok ? -4 : 3 }); }
    else if (kind === 'talk') { const ok = R() < 0.5 + ch + r.trust / 400; if (ok) { mv(p, { res: -10, trust: 4, love: 2, cmf: 2 }); say('You talk it through, listening more than defending. By the end you are on the same side again.', 'good', p); } else { mv(p, { res: 4 }); say('It goes in circles. Nobody wins.', 'bad', p); } fx({ time: 1.5, stress: ok ? -5 : 4 }); }
    else if (kind === 'space') { mv(p, { res: -4, love: -0.5 }); say('You each take a few days. Distance helps some things and hurts others.', '', p); fx({ time: 0.25, stress: -3 }); }
    else if (kind === 'counsel') { mv(p, { res: -12, trust: 6, com: 3, love: 2, cmf: 2 }); r.cn = (r.cn || 0) + 1; say('The counselor gives you both language for things you could never say. It is slow, honest work.', 'good', p); fx({ time: 1.5, money: -60, stress: -3 }); }
    else if (kind === 'comfort') { mv(p, { trust: 4, love: 3, res: -3 }); say('You listen to {n} for as long as {he} needs. Sometimes presence is the whole job.', 'good', p); fx({ time: 1, stress: -2, mood: 2 }); }
    else if (kind === 'safe') { mv(p, { trust: 6, love: 3, attr: 2 }); say('You walk {n} all the way home, and wait until the light in the window comes on.', 'good', p); fx({ time: 0.75, energy: -3, mood: 2 }); }
    else if (kind === 'confess') { const q = elsewhere(p) || p, e = S.rm.sec.findIndex(x => x.a === p.id); if (e >= 0) S.rm.sec.splice(e, 1); mv(p, { trust: -18, res: 14, love: -4 }); say('You tell {n} the truth. It is the worst conversation of your life, and the beginning of whatever comes next.', 'bad', p, true); fx({ time: 1.5, stress: 10, mood: -6 }); if (R() < 0.35 + p.r.love / 300) { say('{n} is devastated, but willing to talk about what comes next.', '', p); } else doAct('theyleave', p); }
    hist(p, 'Worked on things: ' + kind + '.'); after(1, 'rom');
  }

  // ---------- endings: breakup, separation, divorce ----------
  function end(p, style, they) {
    const r = p.r, was = r.st, g = grief(p, they ? 1.1 : 0.7), lives = p.lives;
    r.st = 'ex'; r.dX = day(); r.how = they ? 'them' : 'you'; r.why = style; S.rm.exes++; r.hxq = 0;
    const eff = { kind: [5, 8, 0], blunt: [25, 25, 0], ghost: [45, 40, 1], safe: [0, 5, 0], hard: [30, 20, 0], brk: [8, 5, 0], they: [15, 10, 0] }[style] || [10, 10, 0];
    mv(p, { res: eff[0] + r.res * 0.1, love: -r.love * 0.3, pas: -r.pas * 0.5, com: -r.com * 0.9, trust: -eff[1] }); p.bond = cl(p.bond - eff[1] - 5);
    if (eff[2] || (r.jl > 60 && r.att === 'anxious' && style !== 'kind' && style !== 'safe' && !they)) r.hx = 1;
    if (style === 'safe') { r.hx = r.red >= 2 ? 1 : 0; S.stress = cl(S.stress - 6); S.mood = cl(S.mood + 3); }
    if (COMM.includes(was) || lives) { toKnow(p); } p.lives = false; setRole(p); S.rm.reb = day(); S.rm.sec = S.rm.sec.filter(e => e.a !== p.id);
    if (S.rm.preg && S.rm.preg.pid === p.id) { /* pregnancy continues */ }
    if (was === 'engaged') { r.ring = null; } if (S.rm.div?.pid === p.id) S.rm.div = null;
    chron(`${they ? p.name + ' ended things' : 'Ended things with ' + p.name}.`); hist(p, they ? 'They ended it.' : 'You ended it.'); homeSet();
  }
  function breakup(p, style) {
    const T = RD().breakup, r = p.r;
    say(pick(T[style] || T.kind), 'bad', p, true); end(p, style === 'brk' ? 'brk' : style, false); fx({ time: 1, stress: 6, mood: -6, lonely: 5 });
    if (r.pre) r.pre = 0; after(1, 'rom');
  }
  function theyLeave(p) {
    const r = p.r; if (r.st === 'married') { separate(p, 'them'); return; }
    say(pick(RD().theyleave), 'bad', p, true); end(p, 'they', true);
  }
  function separate(p, who) {
    const r = p.r; r.st = 'separated'; r.dS = day(); r.res += 8; const gone = who === 'you'; p.lives = false; setRole(p); homeSet();
    say(pick(RD().sep), 'bad', p, true); S.stress = cl(S.stress + 8); S.mood = cl(S.mood - 8); S.lonely = cl(S.lonely + 10); chron(`Separated from ${p.name}.`); hist(p, 'Separated.');
    if (gone) after(2, 'rom');
  }
  function reconcile(p) {
    const r = p.r, ok = R() < cl(0.2 + r.love / 200 + r.trust / 300 - r.res / 150 + (r.cn ? 0.1 : 0), 0.05, 0.9);
    if (ok) { if (r.st === 'separated') { r.st = 'married'; p.lives = true; homeSet(); if (S.rm.div?.pid === p.id) S.rm.div = null; } mv(p, { res: -15, trust: 4, love: 3 }); say("You and {n} agree to try again, with open eyes this time.", 'good', p, true); chron(`Reconciled with ${p.name}.`); setRole(p); }
    else { mv(p, { res: 4 }); say("{n} is not ready. {He} says maybe someday, but not today.", 'bad', p); fx({ stress: 4, mood: -3 }); }
    fx({ time: 1.5 }); after(1.5, 'rom');
  }
  const DV = { fast: [200, 0], med: [350, 1], fight: [900, 0] };
  function fileDivorce(p, kind, filer) {
    const m = S.rm; if (m.div) return; const d = day(), len = kind === 'fast' ? rnd(25, 45) : kind === 'med' ? rnd(45, 90) : rnd(100, 260);
    m.div = { pid: p.id, d0: d, end: d + len, kind, lw: 0, filer }; if (p.r.st === 'married') { p.r.st = 'separated'; p.r.dS ||= d; setRole(p); }
    if (filer === 'you') fx({ money: -DV[kind][0] }); S.stress = cl(S.stress + 8); chron(`Divorce proceedings began with ${p.name} (${RD().div[kind === 'fight' ? 'fight' : kind]}).`);
  }
  function divTick() {
    const dv = S.rm.div; if (!dv) return; const p = byId(dv.pid); if (!p || !p.alive) { S.rm.div = null; return; }
    if (dv.kind === 'fight' && R() < 0.05) S.stress = cl(S.stress + 1.5); if (day() >= dv.end) finalize(p, dv);
  }
  function finalize(p, dv) {
    const r = p.r, m = S.rm, y = yrs(p), D_ = RD().div, adj = (dv.lw ? 0.06 : 0) + (m.sec.some(e => e.a === p.id) ? -0.1 : 0) - (r.aff ? -0.08 : 0) + (dv.kind === 'fight' ? R() * 0.1 - 0.05 : 0) + (dv.med ? 0.02 : 0), share = cl(0.5 + adj, 0.3, 0.7);
    let line = '';
    if (r.pre) { S.money = Math.round(S.money * 0.95 * 10) / 10; line = 'Your prenuptial agreement keeps the settlement simple.'; }
    else { const theirs = r.inc * 150 * S.kw * Math.min(y, 20), pool = S.money + theirs; S.money = Math.max(0, Math.round(pool * share * 10) / 10); line = D_.settle + (pool * share > S.money * 1 ? '' : ''); }
    const youEarn = (S.prof.k === 'w' ? S.prof.pay * (1 + 0.18 * (S.rk || 0)) : 5), them = r.inc * 45, diff = youEarn - them;
    if (y >= 5 && Math.abs(diff) > 12 && R() < 0.55) { m.alim = { pid: p.id, dir: diff > 0 ? 'pay' : 'recv', amt: Math.round(Math.abs(diff) * 2.2 * S.kw), until: day() + Math.round(y * 60) }; line += diff > 0 ? ' You are ordered to pay spousal support for a time.' : ' You are awarded spousal support for a time.'; }
    const ks = kidsOf(p); if (ks.length) { const q = R() + (dv.lw ? 0.15 : 0) + (m.sec.some(e => e.a === p.id) ? -0.15 : 0), cu = q > 0.62 ? 'you' : q > 0.2 ? 'shared' : 'them'; ks.forEach(c => { c.cust = cu; c.lives = cu !== 'them'; }); line += ' ' + D_.cust[cu].replace('{n}', p.name); }
    r.st = 'ex'; r.dv = 1; r.dX = day(); r.how = dv.filer; r.why = 'divorce'; m.divs++; toKnow(p); p.lives = false; setRole(p); m.div = null; r.hx = r.hx || 0;
    S.mood = cl(S.mood - 8); S.stress = cl(S.stress + 6); S.lonely = cl(S.lonely + 12); S.fl.withFamily = 0; homeSet();
    say(pick(D_.done) + ' ' + line, 'bad', p, true); chron(`Divorced ${p.name}.`);
  }
  function protect(p) { const r = p.r; fx({ time: 2, money: -70 }); r.order = 1; r.hx = 0; r.blocked = 1; say('A court grants a protective order. {n} is legally required to stay away from you, and you finally sleep.', 'good', p, true); S.stress = cl(S.stress - 10); chron('Obtained a protective order.'); after(2, 'rom'); }
  function exAct(p, kind) {
    const r = p.r;
    if (kind === 'text') { const ok = R() < 0.5 + (r.res < 30 ? 0.2 : 0) - (r.blocked ? 1 : 0); say(ok ? 'You text {n}. The reply is careful and civil.' : '{n} does not reply.', ok ? '' : 'bad', p); if (ok) { mv(p, { love: 1, res: -2 }); fx({ time: 0.25, mood: 1 }); } else fx({ time: 0.25, mood: -3 }); }
    else if (kind === 'friends') { const ok = r.res < 35 && R() < 0.65; r.fr = ok ? 1 : 0; say(pick(RD()[ok ? 'friends_yes' : 'friends_no']), ok ? 'good' : 'bad', p); if (ok) mv(p, { res: -10, trust: 3 }); fx({ time: 0.5, mood: ok ? 3 : -2 }); }
    else if (kind === 'back') { const pc = cl(0.15 + r.love / 200 + (r.fr ? 0.1 : 0) - r.res / 150 - (r.red >= 2 ? 0.3 : 0), 0.03, 0.85); if (R() < pc) { r.st = 'dating'; r.d0 = day(); r.dT = null; r.dv = 0; r.res = r.res / 2; mv(p, { com: 10, love: 4 }); setRole(p); say(pick(RD().reunite), 'good', p, true); chron(`Got back together with ${p.name}.`); fx({ time: 1, mood: 8, lonely: -8 }); } else { say(pick(RD().reunite_no), 'bad', p); fx({ time: 1, mood: -4, stress: 3 }); } }
    else if (kind === 'block') { r.blocked = 1; r.hx = 0; say('You block {n} everywhere. The silence is deafening, and a relief.', 'sys', p); fx({ time: 0.25, stress: -3 }); }
    hist(p, 'Ex contact: ' + kind + '.'); after(0.5, 'rom');
  }

  // ---------- events: random decisions and auto-resolution while time is skipped ----------
  const O = (t, e = {}) => ({ t, ...e });
  const evJ = k => RD().ev.find(e => e.id === k);
  function dynDef(E, p) {
    const P = S.rm.preg, T = RD().preg;
    if (E.k === 'pnews') {
      const you = P?.who === 'you', can = P && day() - P.d0 <= 84;
      return { text: (you || !p ? T.news_you : T.news_them) + ' What do you want to do?', ch: [
        { l: 'We will have this baby', aw: 8, win: O('Fear and joy arrive together. You decide to do this.', { r: { love: 5, com: 8, trust: 3 }, x: { mood: 8, stress: 4 }, j: 1 }) },
        { l: 'I am not ready to be a parent (@120)', aw: 1, req: { money: 120 }, dis: can ? '' : 'Too late', win: O('', { x: { money: -120 }, a: ['preg_end'] }) },
        { l: 'I need time to think', aw: 1, win: O('The days that follow are long and quiet. Nothing is decided and everything is changing.', { x: { stress: 5 } }) }] };
    }
    if (E.k === 'baby') return { text: 'The baby is here. Now for the question that will follow this child for life: what is the name?', ch: E.names.map(n => ({ l: n, aw: 1, win: O('', { a: ['name:' + n] }) })) };
    if (E.k === 'prot') return { text: 'The evening has turned quietly toward the bedroom. Before it goes any further, there is a moment to decide how you will look after each other.', ch: protOptions(p, E.kind).map(c => ({ l: c.l, dis: c.dis, aw: c.dis ? 0 : c.a.startsWith('int:condom') ? 5 : c.a.startsWith('int:none') ? 2 : 1, win: O('', { a: [c.a] }) })) };
    return evJ(E.k);
  }
  function eligible(e, p) {
    const w = e.when || {}, r = p?.r;
    if (e.kid) return p && p.k === 'child' && p.alive && p.lives && p.age < 18 && (e.min_age == null || p.age >= e.min_age) && (e.max_age == null || p.age <= e.max_age);
    if (!r || !e.st.includes(r.st) || !p.alive || S.age < 18 || p.age < 18) return false;
    if (r.st === 'ex' && (r.blocked || r.order)) return false;
    for (const [k, f] of [['minLove', 'love'], ['minTrust', 'trust'], ['minPas', 'pas'], ['minCom', 'com'], ['minCmf', 'cmf'], ['minAttr', 'attr'], ['minJl', 'jl'], ['minRed', 'red']]) if (w[k] != null && r[f] < w[k]) return false;
    if (w.maxRed != null && r.red > w.maxRed) return false; if (w.minDays && together(p) < w.minDays) return false; if (w.minYears && yrs(p) < w.minYears) return false;
    if (w.noIly && r.said) return false; if (w.apart && p.lives) return false; if (w.aff && !r.aff) return false; if (w.young && (p.age >= 65 || S.age >= 70)) return false;
    if (e.id === 'invite' && intimReason(p, 40)) return false;
    return true;
  }
  function trigger(k, p, extra = {}) {
    const def = dynDef({ k, ...extra }, p); if (!def) return false;
    if (!live()) { autoEv({ k, ...extra }, def, p); return true; }
    if (S.pend || S.rm.ev) return false;
    S.rm.topic = pick(RD().topics); S.rm.bg = extra.g; S.rm.ev = { k, pid: p?.id || null, ...extra }; S.pend = 'rom'; S.rm.lastEv = day(); return true;
  }
  function spawn() {
    const m = S.rm; if (live() && (S.pend || m.ev || day() - m.lastEv < 3)) return;
    const ps = people().filter(p => p.r && p.alive && (ACT.includes(p.r.st) || (p.r.st === 'ex' && day() - (p.r.dX || 0) < 500))), kids = S.fam.filter(c => c.k === 'child' && c.alive && c.lives && c.age < 18);
    if ((!ps.length && !kids.length) || R() > 0.035) return;
    const c = [], E = RD().ev;
    for (const p of ps) {
      for (const e of E) if (e.w > 0 && !e.kid && eligible(e, p)) c.push([e, p, e.w]);
      const r = p.r;
      if (ACT.includes(r.st) && r.st !== 'separated' && healthIdx(p) < 12 && r.love < 35) c.push([evJ('breakup_they'), p, r.res > 60 ? 9 : 4]);
      if ((r.st === 'married' || r.st === 'separated') && r.res > 65 && r.love < 25 && !m.div) c.push([evJ('div_filed'), p, 5]);
      if (r.st === 'ex' && r.hxq) c.push([evJ('ex_haunt'), p, 8]);
    }
    for (const k of kids) for (const e of E) if (e.kid && e.w > 0 && eligible(e, k)) c.push([e, k, e.w]);
    if (!c.length) return; let x = R() * c.reduce((s, q) => s + q[2], 0), q = c[0]; for (const v of c) if ((x -= v[2]) < 0) { q = v; break; }
    trigger(q[0].id, q[1]);
  }
  function chanceOf(c, p) {
    const r = p?.r || {}; let v = c.b; if (c.sk) v += (S.sk[c.sk] || 0) * (c.pc || 0.04); for (const [k, w] of Object.entries(c.m || {})) v += (r[k] || 0) * w;
    if (c.att && r.att) v += c.att[r.att] || 0; return cl(v + (S.mood - 50) * 0.001 + luckF() * 0.05, 0.05, 0.95);
  }
  function outcome(c, p) {
    let ok = true, o = c.win; if (c.chance) { ok = R() < chanceOf(c.chance, p); o = ok ? c.win : (c.lose || c.win); } if (!o) return;
    const major = (o.a && o.a.length) || o.j;
    if (o.t && (live() || major)) say(o.t, (o.x?.mood || 0) > 0 || ((o.r?.love || 0) + (o.r?.trust || 0)) > 3 ? 'good' : (o.x?.stress || 0) > 5 || (o.r?.res || 0) > 8 ? 'bad' : '', p, !!o.j);
    if (o.r && p?.r) mv(p, o.r); if (o.x) fx(o.x); for (const a of o.a || []) doAct(a, p);
    if (p) hist(p, (c.l || '').replace(/\s*\(.*?\)/g, '').replace(/\{n\}|\{him\}|\{his\}|\{he\}/g, 'them').slice(0, 60));
  }
  function autoEv(E, def, p) {
    const ch = def.ch.filter(c => (!c.req?.money || S.money >= c.req.money * S.kc) && !c.dis && (c.aw ?? 1) > 0); if (!ch.length) return;
    let x = R() * ch.reduce((s, c) => s + (c.aw ?? 1), 0), c = ch[0]; for (const q of ch) if ((x -= (q.aw ?? 1)) < 0) { c = q; break; }
    S.rm.topic = pick(RD().topics); outcome(c, p);
  }
  function mkEvent() {
    const E = S.rm?.ev; if (!E) return null; const p = E.pid ? byId(E.pid) : null, def = dynDef(E, p);
    if (!def || (E.pid && !p)) { S.rm.ev = null; return null; }
    return { id: 'rom-' + E.k, text: fill(def.text, p), choices: def.ch.map((c, i) => ({ label: fill(c.l, p), fn: 'rom', arg: i, req: c.req ? { money: c.req.money } : undefined, dis: c.dis || '' })) };
  }
  function resolve(i) {
    const E = S.rm.ev; if (!E) { S.pend = null; return; } const p = E.pid ? byId(E.pid) : null, def = dynDef(E, p); S.pend = null; S.rm.ev = null;
    const c = def?.ch[i]; if (c) outcome(c, p);
  }
  function doAct(a, p) {
    const r = p?.r; if (/^kb\+/.test(a)) { if (p) p.bond = cl(p.bond + +a.slice(3)); return; }
    const [k, x, y] = a.split(':');
    switch (k) {
      case 'ily': r.said = 1; break; case 'ilyback': r.mysaid = 1; break;
      case 'official': r.st = 'together'; r.dT = day(); setRole(p); chron(`Became official with ${p.name}.`); break;
      case 'movein': moveIn(p); chron(`Moved in with ${p.name}.`); break;
      case 'engage': r.st = 'engaged'; r.dE = day(); r.ring = 'a ring'; r.mar = 'yes'; setRole(p); chron(`Got engaged to ${p.name}.`); break;
      case 'theyleave': theyLeave(p); break;
      case 'breakup_kind': end(p, 'kind', false); break; case 'breakup_hard': end(p, 'hard', false); break; case 'breakup_safe': end(p, 'safe', false); break;
      case 'intim': trigger('prot', p, { kind: 'night' }); break;
      case 'int': intimate(p, x, y, true); break;
      case 'flirtother': { const e = S.rm.sec.find(q => q.a === p.id); if (!e) S.rm.sec.push({ a: p.id, d: day(), n: 0, lite: 1 }); break; }
      case 'cheat': { const e = S.rm.sec.find(q => q.a === p.id); if (e) { e.n = (e.n || 0) + 1; e.lite = 0; } else S.rm.sec.push({ a: p.id, d: day(), n: 0 }); break; }
      case 'uncovered': r.cheatBy = (r.cheatBy || 0) + 1; r.aff = 0; trigger('cheated', p); break;
      case 'redup': r.red = Math.min(3, r.red + 1); break; case 'redwatch': r.rn = 1; break;
      case 'block': r.blocked = 1; r.hx = 0; r.hxq = 0; break;
      case 'order': r.order = 1; r.blocked = 1; r.hx = 0; r.hxq = 0; break;
      case 'div_fast': fileDivorce(p, 'fast', 'them'); break; case 'div_contest': fileDivorce(p, 'fight', 'you'); break;
      case 'preg_end': endPregnancy(p); break;
      case 'name': mkKid(p, S.rm.bg || 'f', x); break;
    }
  }

  // ---------- views ----------
  const statusLine = p => { const r = p.r, st = r.st; if (st === 'married') return `Married ${yrs(p) < 1 ? Math.max(1, Math.round(yrs(p) * 12)) + ' months' : Math.round(yrs(p)) + ' years'}`; if (st === 'ex') return r.dv ? 'Divorced' : 'Your ex' + (r.fr ? ', on friendly terms' : ''); if (st === 'widowed') return 'Widowed'; if (st === 'friend') return 'Friend'; return `${ST[st][0].toUpperCase() + ST[st].slice(1)}${r.d0 ? ', ' + Math.max(1, together(p)) + ' days' : ''}`; };
  function card(p) {
    if (!p.r && !okP(p)) return ''; const r = ensure(p), st = r.st, g = gdOf(p); if (!okP(p) && st !== 'widowed') return '';
    let h = `<div class="card"><h2>Romance</h2><div class="meta">${statusLine(p)}${st === 'friend' && !r.a0 ? '' : ' \u00b7 ' + compW(compat(p))}</div>`;
    if (st === 'friend' && !r.a0) return h + `<p class="meta">Nothing romantic has happened between you and ${p.name}. Open the romance menu to flirt.</p></div>`;
    if (r.no) h += `<p class="meta">${p.name} is not interested in you that way.</p>`;
    if (p.alive && st !== 'widowed') {
      const show = st === 'ex' ? ['love', 'res'] : st === 'friend' || st === 'flirt' ? ['attr', 'love', 'trust'] : M;
      h += show.map(k => `<div>${api.bar(MN[k], Math.round(r[k]), MC[k])} ${W(r[k], WD[k])}</div>`).join('');
      if (ACT.includes(st)) { const hi = healthIdx(p); h += `<p>${hi > 55 ? 'You two are thriving.' : hi > 35 ? 'Things are steady.' : hi > 18 ? 'There are cracks showing.' : 'The relationship is in real trouble.'}</p>`; }
      const bits = [`${p.name} seems ${RD().att[r.att]}`, r.llk ? `feels most loved through ${RD().llh[r.ll]}` : 'and you have not yet worked out how ' + (g === 'f' ? 'she' : 'he') + ' likes to be loved'];
      h += `<p class="meta">${bits.join(', ')}.${r.kk ? ' Wants children: ' + r.kids + '.' : ''}${r.mk ? ' On marriage: ' + (r.mar === 'yes' ? 'open to it' : r.mar === 'no' ? 'not for ' + (g === 'f' ? 'her' : 'him') : 'in no hurry') + '.' : ''}${r.inl != null ? ' Their family: ' + W(r.inl, ['cold', 'reserved', 'warm', 'delighted']) + ' toward you.' : ''}${r.fa != null ? ' Your family: ' + W(r.fa, ['wary', 'cautious', 'warm', 'delighted']) + ' toward them.' : ''}</p>`;
      if (ACT.includes(st)) h += `<p class="meta">Protection: ${canConceive(p) ? MTH[methodNow(p)] : 'no pregnancy risk'}${r.stk ? '; tested together' : ''}. ${r.try ? 'You are trying for a baby. ' : ''}${r.lastI != null ? (day() - r.lastI < 4 ? 'Physically close recently.' : day() - r.lastI < 40 ? 'Closeness a while ago.' : 'It has been a long while since you were intimate.') : ''}</p>`;
      if (r.rn || r.red >= 2) h += `<p class="bad">Something about how ${p.name} treats you worries you.</p>`;
      if (st === 'ex' && r.order) h += `<p class="meta">A protective order is in place.</p>`; else if (st === 'ex' && r.hx) h += `<p class="bad">${p.name} has not let go.</p>`;
      const P = S.rm.preg; if (P && P.pid === p.id && P.known) h += `<p class="good">Expecting a baby in about ${Math.max(1, Math.round((280 - (day() - P.d0)) / 7))} weeks.</p>`;
      const ks = kidsOf(p).filter(c => c.par?.includes(p.id)); if (ks.length) h += `<p class="meta">Children together: ${ks.map(c => c.name).join(', ')}.</p>`;
      if (S.rm.div?.pid === p.id) h += `<p class="bad">Divorce proceedings are under way (${RD().div[S.rm.div.kind]}).</p>`;
    }
    return h + '</div>';
  }
  function loveHTML() {
    const m = S.rm; if (S.age < 18) return `<div class="card"><h2>Love</h2><p>Romance opens at 18. For now, friendships and family are what matter, and they are plenty.</p></div>`;
    const sp = partners(COMM)[0], ds = partners(['dating']), IN = { f: 'women', m: 'men', a: 'anyone' }, own = canConceive({ gd: m.into === 'a' ? 'f' : m.into, role: '' }) || repro(S.gd) === 'f';
    let h = `<div class="card"><h2>Your love life</h2><p>${sp ? `You are ${sp.r.st === 'married' ? 'married to' : sp.r.st === 'engaged' ? 'engaged to' : 'with'} ${sp.name}.` : ds.length ? `You are dating ${ds.map(p => p.name).join(' and ')}.` : partners(['separated'])[0] ? `You are separated from ${partners(['separated'])[0].name}.` : 'You are single.'}</p>` +
      `<p class="meta">Interested in: ${IN[m.into]}. Wants children: ${m.kids}. Attachment: ${RD().att[m.att]}. ${m.marr ? 'Marriages: ' + m.marr + '. ' : ''}${m.divs ? 'Divorces: ' + m.divs + '. ' : ''}${m.exes ? 'Past relationships ended: ' + m.exes + '.' : ''}</p>`;
    h += `<p class="meta">Sexual health: ${m.sti?.known ? (m.sti.k === 't' ? 'a treatable infection (diagnosed)' : 'a lifelong, manageable infection' + (m.sti.tx ? ', in treatment' : '')) : m.tested ? `last checked ${Math.max(0, day() - m.tested)} days ago` : 'never tested'}. Your contraception: ${canConceive({ gd: S.gd === 'f' ? 'm' : 'f' }) && repro(S.gd) === 'f' ? MTH[m.pro] : 'not applicable'}. Condoms: ${condoms()}.</p>`;
    const P = m.preg; if (P?.known) h += `<p class="good">${P.who === 'you' ? 'You are' : (byId(P.pid)?.name || 'Your partner') + ' is'} expecting a baby in about ${Math.max(1, Math.round((280 - (day() - P.d0)) / 7))} weeks.</p>`;
    if (m.div) { const d = byId(m.div.pid); h += `<p class="bad">Divorce from ${d?.name} (${RD().div[m.div.kind]}): about ${Math.max(1, m.div.end - day())} days remain.</p>`; }
    if (m.alim) h += `<p class="meta">Spousal support: you ${m.alim.dir === 'pay' ? 'pay' : 'receive'} ${Math.round(m.alim.amt)} a month for a while.</p>`;
    if (m.sec.length) h += `<p class="meta">You are carrying a secret.</p>`;
    h += '</div>';
    for (const p of [...partners(), ...partners(['flirt']).filter(p => !p.r.no)]) h += `<div class="card"><h2>${p.name}</h2><div class="meta">${p.role}, ${p.age} \u00b7 ${statusLine(p)}</div>` + ['love', 'trust', 'pas'].map(k => `<div>${api.bar(MN[k], Math.round(p.r[k]), MC[k])}</div>`).join('') + '</div>';
    if (m.hist.length) h += `<div class="card"><h2>Timeline</h2><p class="meta">${m.hist.slice(-12).reverse().join('<br>')}</p></div>`;
    return h;
  }
  function meCard() {
    const m = S.rm; if (!m || S.age < 18) return ''; const sp = partners(COMM)[0];
    return `<div class="card"><h2>Love life</h2><p class="meta">${sp ? `${sp.r.st === 'married' ? 'Married to' : sp.r.st === 'engaged' ? 'Engaged to' : 'In a relationship with'} ${sp.name}.` : 'Single or casually dating.'}${m.marr ? ` Marriages: ${m.marr}.` : ''}${m.divs ? ` Divorces: ${m.divs}.` : ''} Open the Love tab for details.</p></div>`;
  }

  // ---------- option builders ----------
  function buildRom(add) {
    const p = byId(S.pv), sc = S.rmv || 'main'; if (!p) { add('Back', () => api.go('people')); return; }
    const r = ensure(p), st = r.st, nm = p.name, g = gdOf(p);
    const A = (l, f, w = '') => add(fill(l, p), f, w), nav = (l, s, w = '') => add(l, () => { S.rmv = s; api.render(); }, w);
    const leave = () => { S.rmv = 'main'; api.go(S.rmo === 'love' ? 'love' : 'person'); }, up = () => { S.rmv = 'main'; api.render(); };
    const adult = okP(p), late = !p.lives && (hr() < 7 || hr() >= 23) ? 'Too late to call' : '';
    if (!adult && st !== 'widowed') { add('Back', leave); return; }
    if (sc === 'main') {
      if (st === 'friend' || st === 'flirt') {
        if (r.no) add(`${nm} is not interested in you that way`, () => {}, 'Friends only');
        else { A('Flirt with {n} (30m)', () => flirt(p), tired() || late); A('Ask {n} out (30m)', () => askOut(p), st === 'flirt' ? tired() || late : 'Flirt first'); }
      } else if (ACT.includes(st)) {
        nav('Go on a date, or do something romantic\u2026', 'dates', late); nav('Be close\u2026', 'intim', st === 'separated' ? 'You are separated' : ''); nav('Commitment and the future\u2026', 'commit'); nav('Conflict, care and support\u2026', 'care');
        nav('Protection and sexual health\u2026', 'health'); nav('Children and family\u2026', 'kids'); nav('End or change things\u2026', 'end');
      } else if (st === 'ex') {
        A('Text {n} (15m)', () => exAct(p, 'text'), r.blocked ? 'Blocked' : r.order ? 'Protective order in place' : tired()); A('Ask {n} to stay friends', () => exAct(p, 'friends'), r.fr ? 'Already friendly' : r.blocked || r.order ? 'No contact' : '');
        A('Ask {n} to give it another try (1h)', () => exAct(p, 'back'), r.blocked || r.order ? 'No contact' : r.red >= 2 ? 'This would not be safe' : ''); A('Block {n}', () => exAct(p, 'block'), r.blocked ? 'Already blocked' : '');
        if (r.hx || r.red >= 2) A('Get a protective order (@70)', () => protect(p), r.order ? 'Already in place' : wm(70));
      } else add('A life remembered', () => {}, 'Gone but not forgotten');
      add('Back', leave); return;
    }
    if (sc === 'dates') {
      for (const d of RD().dates) { if (!d.st.includes(st) || st === 'separated' || r.cmf < d.cmf) continue; const w = d.hrs[0] > 0 || d.hrs[1] < 24 ? win(d.hrs[0], d.hrs[1]) : ''; A(d.l + (d.h >= 1 ? ` (${d.h}h)` : ''), () => doDate(p, d), w || wm(d.cost) || tired(d.id === 'adventure' ? 30 : 10) || late); }
      A('Pay {n} a compliment (6m)', () => compliment(p), tired(5)); A("Tell {n} 'I love you' (15m)", () => sayLove(p), r.mysaid ? 'You already have' : tired(5));
      nav('Back', 'main'); return;
    }
    if (sc === 'intim') {
      A('Kiss {n} (5m)', () => kiss(p), r.cmf < 8 ? 'Not comfortable yet' : st === 'separated' || st === 'flirt' ? 'Not yet' : ''); A('Spend the night together (2h)', () => { S.rmx = 'night'; S.rmv = 'prot'; api.render(); }, st === 'flirt' ? 'Not yet' : intimReason(p, 45));
      A('Try something new together (2h)', () => { S.rmx = 'new'; S.rmv = 'prot'; api.render(); }, st === 'flirt' ? 'Not yet' : intimReason(p, 65));
      A('Talk about comfort and boundaries (1h)', () => { mv(p, { cmf: 6, trust: 3 }); say('You talk honestly about what you each like, want and do not. It makes the next time easier, and the time after.', 'good', p); fx({ time: 1, mood: 2, stress: -2 }); hist(p, 'Talked about boundaries.'); after(1, 'rom'); });
      A('Talk about desire and how often (1h)', () => { const d = Math.abs(r.drv - S.rm.drv); mv(p, { res: -3, trust: 2, cmf: 3 }); say(d > 4 ? 'Your appetites are quite different, and you both say so, laughing nervously. Naming it takes the sting out.' : 'You are well matched, it turns out, and a bit relieved to know it.', 'good', p); fx({ time: 1, mood: 2 }); hist(p, 'Talked about desire.'); after(1, 'rom'); });
      nav('Back', 'main'); return;
    }
    if (sc === 'prot') {
      for (const c of protOptions(p, S.rmx || 'night')) A(c.l, () => { S.rmv = 'main'; intimate(p, c.a.split(':')[1], S.rmx || 'night'); }, c.dis || '');
      nav('Back', 'intim'); return;
    }
    if (sc === 'commit') {
      A('Talk about the future (1.5h)', () => talkFuture(p), tired()); if (st === 'dating') A('Make it official (30m)', () => official(p), elsewhere(p) ? `You are with ${elsewhere(p).name}` : '');
      if (st === 'together') A('Move in together (4h)', () => movein(p), p.lives ? 'Already living together' : S.fam.some(f => f.k === 'spouse' && f.lives) ? 'You live with someone' : '');
      if (st !== 'separated') { A('Meet {n}\'s family (3h)', () => meetTheirs(p), r.inl != null ? 'Already met' : st === 'dating' ? 'Not yet' : tired()); A('Introduce {n} to your family (3h)', () => introduceMine(p), r.fa != null ? 'Already done' : st === 'dating' ? 'Not yet' : tired()); }
      if (st === 'together') for (let i = 0; i < RD().rings.length; i++) { const rg = RD().rings[i]; A(`Propose with ${rg.n}${rg.c ? ` (@${rg.c})` : ''}`, () => propose(p, i), (rg.c ? wm(rg.c) : '') || (together(p) < 20 ? 'Too early' : '')); }
      if (st === 'engaged') { A('Ask for a prenuptial agreement (@60)', () => prenup(p), r.preAsk ? 'Already discussed' : wm(60)); RD().weddings.forEach((w, i) => A(`Marry {n}: ${w.n} (@${w.c})`, () => wedding(p, i), wm(w.c) || (day() - r.dE < 2 ? 'Give it a couple of days' : ''))); }
      if (st === 'married') A('Take a honeymoon (@600)', () => honeymoon(p), r.hm ? 'Already taken' : wm(600) || (day() - r.dM > 400 ? 'Too long ago' : ''));
      nav('Back', 'main'); return;
    }
    if (sc === 'care') {
      A('Apologize (30m)', () => repair(p, 'apologize'), r.res < 8 ? 'Nothing to apologize for' : late); A('Talk it through (1.5h)', () => repair(p, 'talk'), tired() || late); A('Give each other space', () => repair(p, 'space'));
      A('Couples counseling session (@60)', () => repair(p, 'counsel'), st === 'dating' ? 'Not for casual dating' : wm(60) || win(9, 19)); A('Comfort {n} (1h)', () => repair(p, 'comfort'), tired() || late); A('Walk {n} home safely (45m)', () => repair(p, 'safe'), win(17, 24) && !p.lives ? win(17, 24) : tired());
      if (S.rm.sec.some(e => e.a === p.id)) A('Come clean about what you did (1.5h)', () => repair(p, 'confess'));
      if (S.rm.sti && S.rm.sti.known && !r.stiTold) A('Tell {n} about your diagnosis (1h)', () => tellSti(p));
      if (r.rn || r.red >= 1) A('Talk to a friend about how {n} treats you (1h)', () => { r.rn = 1; say("Your friend listens, and then says plainly that what you described is not okay. You are not imagining it, and you are not alone.", 'sys', p); fx({ time: 1, stress: -6, mood: 2, lonely: -8 }); after(1, 'rom'); });
      nav('Back', 'main'); return;
    }
    if (sc === 'health') {
      const mth = methodNow(p); if (canConceive(p)) { for (const x of ['pill', 'iud', 'implant', 'none']) A(`${carrierOf() === 'you' ? 'Use' : 'Ask {n} to use'} ${MTH[x]}${x === 'pill' ? ' (@15)' : x === 'iud' ? ' (@120)' : x === 'implant' ? ' (@150)' : ''}`, () => pickPro(p, x), mth === x ? 'Current method' : x === 'none' ? '' : wm(x === 'pill' ? 15 : x === 'iud' ? 120 : 150)); }
      A('Suggest getting tested together (@30)', () => testTogether(p), r.stk && day() - (S.rm.tested || 0) < 120 ? 'Recently tested' : wm(30) || win(8, 20));
      A('Buy condoms (@5)', () => { S.inv.condoms = (S.inv.condoms || 0) + 1; fx({ time: 0.25, money: -5 }); say('You pick up a pack of condoms from the pharmacy.', ''); after(0.25, 'rom'); }, wm(5) || win(7, 23));
      A('Get emergency contraception (@25)', () => takeEC(p), S.rm.risk && day() - S.rm.risk.d <= 3 ? wm(25) : 'Only within 3 days of a risk'); A('Take a pregnancy test (@12)', () => pregTest(), wm(12));
      A('Get a sexual health check (@30)', () => checkup(p), wm(30) || win(8, 20)); if (S.rm.sti) A('Start treatment' + (S.rm.sti.k === 't' ? ' (@45)' : ' (@25 a month)'), treat, S.rm.sti.known ? wm(45) : 'Get tested first');
      nav('Back', 'main'); return;
    }
    if (sc === 'kids') {
      const P = S.rm.preg, mine_ = P && P.pid === p.id && P.known;
      if (mine_) { A('Go to a prenatal appointment together (@30)', () => { P.apt++; mv(p, { trust: 3, love: 2 }); say('You sit through the scan together, holding hands. The picture on the screen is small, grey and utterly convincing.', 'good', p); fx({ time: 2, money: -30, mood: 5 }); after(2, 'rom'); }, wm(30) || win(8, 18));
        A('Prepare the nursery and supplies (@60)', () => { P.prep = 1; say('You assemble a cot, sort tiny clothes and argue amiably about names.', 'good', p); mv(p, { love: 2, com: 3 }); fx({ time: 3, money: -60, mood: 4, energy: -8 }); after(3, 'rom'); }, P.prep ? 'Already prepared' : wm(60)); }
      if (st !== 'dating' && st !== 'separated' && canConceive(p)) { if (r.try) A('Stop trying for a baby', () => tryBaby(p, 0)); else A('Start trying for a baby', () => tryBaby(p, 1), P ? 'Already expecting' : r.kids === 'no' || (S.rm.kids === 'no') ? 'One of you does not want children' : ''); }
      for (const c of kidsOf(p)) add(`Spend time with ${c.name}, your ${c.role}`, () => { S.pv = c.id; S.rmv = 'main'; api.go('person'); }, '');
      nav('Back', 'main'); return;
    }
    if (sc === 'end') {
      if (st === 'dating' || st === 'together' || st === 'engaged') { A('Break up kindly (1h)', () => { breakup(p, 'kind'); }); A('Break up bluntly (30m)', () => breakup(p, 'blunt')); if (st === 'dating') A('Stop answering (ghost {n})', () => breakup(p, 'ghost')); }
      if (st === 'married') A('Suggest a separation', () => separate(p, 'you'));
      if (st === 'separated') { A('Try to reconcile (1.5h)', () => reconcile(p), tired()); }
      if ((st === 'married' || st === 'separated') && !S.rm.div) nav('Start divorce proceedings\u2026', 'div');
      if (S.rm.div?.pid === p.id) nav('Manage the divorce\u2026', 'div');
      if (r.red >= 1 || r.rn) A('Leave {n} for your own safety', () => { say('You quietly gather what matters and go. It takes courage, and it works.', 'good', p, true); end(p, 'safe', false); fx({ time: 1, stress: -4, mood: 2 }); after(1, 'rom'); });
      if (r.red >= 2 && !r.order) A('Get a protective order (@70)', () => protect(p), wm(70));
      nav('Back', 'main'); return;
    }
    if (sc === 'div') {
      const dv = S.rm.div;
      if (!dv) for (const k of ['fast', 'med', 'fight']) A(`File for ${RD().div[k]} (@${DV[k][0]})`, () => { fileDivorce(p, k, 'you'); say('The papers are filed. Now the waiting begins.', 'sys', p); fx({ time: 1.5, stress: 4 }); after(1.5, 'rom'); }, wm(DV[k][0]));
      else { A('Withdraw the petition', () => { S.rm.div = null; mv(p, { res: -8, trust: 2 }); say('You withdraw the petition. It is not a reconciliation, but it is a pause.', 'sys', p); after(0.5, 'rom'); });
        A('Hire a sharper lawyer (@600)', () => { dv.lw = 1; fx({ money: -600, time: 1 }); say('A better lawyer takes the case, expensive and confident.', 'sys'); after(1, 'rom'); }, dv.lw ? 'Already done' : wm(600));
        A('Settle now and end it early', () => { dv.end = day() + 1; say('You agree to the terms on the table. It will be over tomorrow.', 'sys'); after(0.5, 'rom'); }); }
      nav('Back', 'end'); return;
    }
    add('Back', leave);
  }
  function buildLove(add) {
    const m = S.rm; if (S.age < 18) { add('Back to life', () => { location.href = 'play.html'; }); return; }
    const back = () => { location.href = 'play.html'; }, sc = S.rmv === 'lhealth' ? 'lhealth' : 'main';
    if (sc === 'lhealth') {
      const can = repro(S.gd) === 'f';
      if (can) for (const x of ['pill', 'iud', 'implant', 'none']) add(`Your contraception: ${MTH[x]}${x === 'pill' ? ' (@15 a month)' : x === 'iud' ? ' (@120)' : x === 'implant' ? ' (@150)' : ''}`, () => { fx({ time: 1, money: x === 'iud' ? -120 : x === 'implant' ? -150 : x === 'pill' ? -15 : 0 }); m.pro = x; say(`You settle on ${MTH[x]}.`, 'good'); after(1, 'love'); }, m.pro === x ? 'Current' : x === 'none' ? '' : wm(x === 'pill' ? 15 : x === 'iud' ? 120 : 150) || win(8, 20));
      add('Get a sexual health check (@30)', () => checkup(null), wm(30) || win(8, 20)); if (m.sti) add('Start treatment' + (m.sti.k === 't' ? ' (@45)' : ' (@25 a month)'), treat, m.sti.known ? wm(45) : 'Get tested first');
      add('Buy condoms (@5)', () => { S.inv.condoms = (S.inv.condoms || 0) + 1; fx({ time: 0.25, money: -5 }); say('You pick up a pack of condoms from the pharmacy.', ''); after(0.25, 'love'); }, wm(5) || win(7, 23));
      add('Take a pregnancy test (@12)', () => pregTest(), wm(12)); add('Get emergency contraception (@25)', () => takeEC(null), m.risk && day() - m.risk.d <= 3 ? wm(25) : 'Only within 3 days of a risk');
      add('Back', () => { S.rmv = 'main'; api.render(); }); return;
    }
    const IN = { f: 'women', m: 'men', a: 'anyone' }, cyc = ['f', 'm', 'a'];
    add(`Interested in: ${IN[m.into]} (tap to change)`, () => { m.into = cyc[(cyc.indexOf(m.into) + 1) % 3]; api.render(); });
    add(`Wants children: ${m.kids} (tap to change)`, () => { const k = ['yes', 'maybe', 'no']; m.kids = k[(k.indexOf(m.kids) + 1) % 3]; api.render(); });
    add('Browse a dating app (1h)', () => mingle('app', 'love'), tired()); add('Ask a friend to set you up (1h)', () => mingle('set', 'love'), S.fr.length ? tired() : 'No friends to ask');
    for (const p of [...partners(), ...partners(['flirt'])].slice(0, 4)) add(`${p.name} \u2014 ${p.role}\u2026`, () => { S.pv = p.id; S.rmv = 'main'; S.rmo = 'love'; api.go('rom'); });
    const cand = people().filter(p => p.alive && okP(p) && p.r?.st !== 'ex' && (!p.r || (p.r.st === 'friend' && !p.r.no)) && p.kind !== 'family' && !ACT.includes(p.r?.st)).sort((a, b) => b.bond - a.bond).slice(0, 3);
    for (const p of cand) add(`${p.name} \u2014 ${p.role}, ${p.age}\u2026`, () => { S.pv = p.id; S.rmv = 'main'; S.rmo = 'love'; api.go('rom'); });
    for (const p of people().filter(p => p.r?.st === 'ex' && p.alive).sort((a, b) => (b.r.dX || 0) - (a.r.dX || 0)).slice(0, 3)) add(`${p.name} (ex)\u2026`, () => { S.pv = p.id; S.rmv = 'main'; S.rmo = 'love'; api.go('rom'); });
    add('Protection and sexual health\u2026', () => { S.rmv = 'lhealth'; api.render(); });
    add('Talk to a counselor about relationships (@45)', () => { fx({ time: 1.5, money: -45, stress: -8, mood: 3 }); if (m.att !== 'secure' && R() < 0.2) { m.att = 'secure'; say('Over time, counseling helps you feel steadier about closeness. You notice it in how you love.', 'good'); } else say('You talk through what you want from love, and what you tend to do when you are scared.', 'sys'); after(1.5, 'love'); }, wm(45) || win(9, 19));
    add('Back to life', back);
  }
  function lifeOpts(add, loc) {
    if (!S.rm || S.age < 18) return;
    if (loc === 'room') add('Browse a dating app (1h)', () => mingle('app'), tired());
    else if (!['alley', 'clinic'].includes(loc)) add('Look for someone to chat up (1h)', () => mingle('out'), tired());
  }
  const rentF = () => { const sp = S.fam.find(p => p.k === 'spouse' && p.alive && p.lives); return sp && sp.age >= 18 && sp.age < 66 ? 0.55 : 1; };

  return { ok: okP, migrate, daily, yearly, touch, mkEvent, resolve, card, loveHTML, meCard, buildRom, buildLove, lifeOpts, rentF, ensure };
}
