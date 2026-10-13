import { dayWx, wxAt, wxLine, fmtT, exposure, wxFx, wxSummary, SEVERE } from './weather.js';
import { initRomance } from './romance.js';
import { initDisasters } from './disasters.js';
import { dateOf, MON, climate, seasonOf, holidays, bdayMD, isMyBday, initCal, wxPick, seasonFx } from './calendar.js';
const $ = i => document.getElementById(i), R = Math.random;
const cl = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
const pick = t => Array.isArray(t) ? t[Math.floor(R() * t.length)] : t;
const KEY = 'irl-text-v1', WD = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
let D, S, view = window.IRL_VIEW || 'main', opts = [], ev = null, quiet = false, RM, DZ, SPF = null, slp = false;

const day = () => Math.floor(S.t / 1440) + 1, hr = () => (S.t / 60) % 24;
const per = h => h < 5 ? 'night' : h < 12 ? 'morning' : h < 18 ? 'day' : h < 22 ? 'evening' : 'night';
const clock = () => String(Math.floor(hr())).padStart(2, '0') + ':' + String(Math.floor(S.t % 60)).padStart(2, '0');
const log = (t, c = '') => { if (quiet) return; S.log.push([S.tk ? tpl(t) : t, c]); if (S.log.length > 120) S.log.shift(); };
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} };
const fmt = v => { const n = v < 100 ? String(+v.toFixed(1)) : Math.round(v).toLocaleString('en-US'), y = S.tk.cur; return y.length > 2 ? `${n} ${y}` : y + n; };
const kcx = () => S.kc * DZ.priceF();
const tpl = t => [0, 1].reduce(x => x.replace(/@(\d+)/g, (m, n) => fmt(n * kcx())).replace(/#(\d+)/g, (m, n) => fmt(n * S.kw)).replace(/\{(\w+)\}/g, (m, k) => DZ.tk(k) ?? S.tk[k] ?? m), String(t));
const pr = c => typeof c === 'number' ? c : Math.max(0.05, Math.min(0.95, c.base + (S.sk[c.sk] || 0) * (c.per || 0.05) + (S.mood - 50) * 0.002 - (S.stress > 70 ? 0.05 : 0) + ((S.tal?.[c.sk] ?? 5) - 5) * 0.012 + ((S.ded ?? 50) - 50) * 0.0006 + luckF() * 0.12 + bodyBonus(c.sk)));

//// ===== talent, dedication, luck, body, education =====
const TALK = ['fitness', 'charisma', 'intellect', 'street'];
const MAJORS = [{ id: 'health', n: 'Medicine and health' }, { id: 'tech', n: 'Engineering and science' }, { id: 'biz', n: 'Business and law' }, { id: 'edu', n: 'Teaching and social work' }, { id: 'media', n: 'Media and design' }];
const RK = ['', 'experienced ', 'senior ', 'lead ', 'head '];
const LK = ['life keeps finding ways to trip you up', 'you tend to catch a little bad luck', 'your luck has been ordinary', 'you tend to catch lucky breaks', 'luck seems to follow you around'];
const tw = v => v < 3 ? 'little aptitude' : v < 5 ? 'modest' : v < 7 ? 'decent' : v < 9 ? 'gifted' : 'prodigious';
const dw = v => v < 25 ? 'drifting' : v < 45 ? 'casual' : v < 65 ? 'steady' : v < 85 ? 'driven' : 'relentless';
const gw = v => v < 30 ? 'struggling' : v < 45 ? 'below average' : v < 60 ? 'average' : v < 75 ? 'good' : v < 90 ? 'excellent' : 'top of the class';
const lkIdx = v => v < 30 ? 0 : v < 42 ? 1 : v < 58 ? 2 : v < 70 ? 3 : 4;
const luckF = () => ((S.lk ?? 50) - 50 + (S.fort || 0)) / 100;
const avgTal = () => TALK.reduce((s, k) => s + (S.tal?.[k] ?? 5), 0) / 4;
const lwt = e => e.w * (e.lk ? Math.max(0.2, 1 + e.lk * luckF() * 2.5) : 1);
const ptOf = p => cl(Math.round(p.pay / 20), 1, 5);
const rsp = x => { log(x[0], x[1]); note(x[0]); };
const GROW = [[5, 0.64], [8, 0.73], [10, 0.79], [12, 0.86], [14, 0.93], [16, 0.98], [18, 1]];
const grow = a => { if (a >= 18) return 1 - Math.max(0, a - 55) * 0.0008; for (let i = 1; i < GROW.length; i++) if (a <= GROW[i][0]) { const [a0, v0] = GROW[i - 1], [a1, v1] = GROW[i]; return v0 + (v1 - v0) * Math.max(0, a - a0) / (a1 - a0); } return 1; };
const bmiAge = a => a < 18 ? -(18 - a) * 0.4 : a > 30 ? Math.min(3, (a - 30) * 0.06) : 0;
const bodyOf = (adH, bmi0, bo, a) => { const ht = adH * grow(a), bmi = cl(bmi0 + bmiAge(a) + bo, 13, 48); return { ht, bmi, wt: bmi * (ht / 100) ** 2 }; };
const body = () => bodyOf(S.adH, S.bmi0, S.bo || 0, S.age);
const avgH = () => D.config.body.h[S.rgn ?? 0] * (S.gd === 'f' ? 0.925 : S.gd === 'x' ? 0.96 : 1);
const ftin = cm => { let i = Math.round(cm / 2.54); const f = Math.floor(i / 12); i -= f * 12; return `${f}\u2032${i}\u2033`; };
const bodyStr = b => `${Math.round(b.ht)} cm (${ftin(b.ht)}), ${Math.round(b.wt)} kg (${Math.round(b.wt * 2.2046)} lb)`;
const buildW = (bmi, a) => { const e = bmi - bmiAge(a); return e < 17 ? 'very slim' : e < 18.5 ? 'slim' : e < 25 ? 'an average build' : e < 30 ? 'a little heavy' : e < 35 ? 'heavy' : 'very heavy'; };
const bodyEf = () => { if (!S.adH || S.age < 12) return 1; const e = body().bmi - bmiAge(S.age); return e >= 35 ? 1.2 : e >= 30 ? 1.1 : e < 17 ? 1.08 : 1; };
const bodyBonus = k => { if (!S.adH || (k !== 'fitness' && k !== 'street')) return 0; const b = body(), tl = cl((b.ht - avgH() * grow(S.age)) * 0.0015, -0.03, 0.03), e = b.bmi - bmiAge(S.age); return tl - (k === 'fitness' && e >= 32 ? 0.04 : 0) - (e < 16.5 ? 0.02 : 0); };
function bodyLine(L, b) {
  const bd = bodyOf(L.adH, L.bmi0, 0, L.age), top = TALK.slice().sort((x, y) => L.tal[y] - L.tal[x])[0];
  return `You stand ${Math.round(bd.ht)} cm (${ftin(bd.ht)}) and weigh ${Math.round(bd.wt)} kg (${Math.round(bd.wt * 2.2046)} lb): ${buildW(bd.bmi, L.age)}. Your strongest natural gift is ${top} (${tw(L.tal[top])}). Your drive is ${dw(b.ded)}, and ${LK[lkIdx(L.lk)]}.`;
}
// skills: talent and dedication set how fast you learn, levels slow you down, repeated practice builds momentum
const learn = k => (0.55 + (S.tal[k] ?? 5) * 0.09) * (0.7 + (S.ded ?? 50) / 100 * 0.6) / (1 + (S.sk[k] || 0) * 0.3) * (k === 'fitness' && bodyEf() >= 1.1 ? 0.85 : 1);
function gainSk(e) {
  const dl = (e.time || 0) >= 0.25;
  if (e.ed) { S.gp = cl(S.gp + e.ed * (0.4 + S.tal.intellect * 0.05 + S.ded * 0.004) * (1 - S.gp / 110)); S.eff = 1; }
  for (const [k, v] of Object.entries(e.sk || {})) {
    let m = learn(k); (S.lp ??= {})[k] = day();
    if (dl) { S.eff = 1; const g = (S.gm ??= {})[k], st = g && day() - g.d <= 3 ? g.n : 0; m *= 1 + Math.min(st, 5) * 0.08; S.gm[k] = { n: st + 1, d: day() }; if (st + 1 === 3) log(`You find a groove with your ${k}. Practice comes easier now.`, 'sys'); if (k === 'fitness') S.xr = (S.xr || 0) + 1; }
    const b = Math.floor(S.sk[k] || 0); S.sk[k] = (S.sk[k] || 0) + v * m; if (Math.floor(S.sk[k]) > b) log(`Your ${k} improved to ${Math.floor(S.sk[k])}.`, 'good');
  }
}
function skillDay() {
  const act = S.prof.k === 'w' ? Object.keys(S.prof.sk || {}) : S.prof.k === 's' ? ['intellect'] : [];
  for (const k of act) if (S.sk[k] != null) S.sk[k] += 0.0009 * learn(k);
  for (const k of Object.keys(S.sk)) if (S.sk[k] > 1 && !act.includes(k) && day() - (S.lp?.[k] ?? day()) > 45) S.sk[k] = Math.max(Math.floor(S.sk[k]), S.sk[k] - 0.0007);
}
function dailyTrends() {
  S.fort = Math.abs(S.fort || 0) < 0.5 ? 0 : S.fort * 0.92;
  S.ded = cl(S.ded + (S.ded0 - S.ded) * 0.0015);
  if (S.eff) S.ded = cl(S.ded + 0.1 * (1 - S.ded / 100)); else S.ded = Math.max(5, S.ded - 0.04);
  S.eff = 0;
  if (S.prof.k === 's' && (((day() - 2) % 7) + 7) % 7 < 5) S.gp = cl(S.gp - (S.att ? 0 : 0.25));
  S.att = 0;
  const avg = S.hn > 2 ? S.hs / S.hn : S.hunger; S.hs = 0; S.hn = 0;
  S.bo = cl(S.bo + (avg - 52) * 0.0004 - (S.xr || 0) * 0.04 - S.bo * 0.002, -8, 14); S.xr = 0;
  skillDay();
}
// education and career: school -> (university | apprenticeship | work); education level, grades, talent, drive and luck decide where you land
const gpTarget = () => cl(15 + S.tal.intellect * 4.5 + S.ded * 0.3 + (S.sk.intellect || 0) * 3, 5, 98);
const meritNow = () => cl(S.gp * 0.4 + S.ded * 0.25 + avgTal() * 3 + ((S.lk ?? 50) + (S.fort || 0)) * 0.15 + rnd(-6, 6), 0, 100);
function choose(c, o) {
  const m = o.merit / 20, w = c.map(p => {
    if (p.k === 's') return p.u ? (o.ei === 1 && o.age <= 30 ? (p.u === 'uni' ? 3 : 2) : 0) : 8;
    if (p.k === 'r') return o.age >= 68 ? 6 : 1.5;
    const ex = o.ei - (p.ed || 0), ks = Object.keys(p.sk || {}), sm = ks.length ? ks.reduce((s, k) => s + Math.max(0, (o.tal[k] ?? 5) - 3) / 6, 0) / ks.length : 0.5;
    return Math.exp(-((ptOf(p) - m) ** 2) / 2.2) * (ex >= 2 ? 0.12 : ex === 1 ? 0.45 : 1) * (0.4 + sm) * (o.major && p.f === o.major && (p.ed || 0) >= 2 ? 4 : 1) * (o.age < 18 ? 0.25 : 1);
  });
  let r = R() * w.reduce((a, b) => a + b, 0); for (let i = 0; i < c.length; i++) if ((r -= w[i]) < 0) return c[i];
  return c[c.length - 1];
}
function pickCareer() {
  const ei = S.edl ?? 1, ok = (p, tier) => p.k === 'w' && (p.ed || 0) <= ei && S.age >= p.a[0] && S.age <= p.a[1] && (!tier || (S.tier + 1 >= p.tr[0] && S.tier + 1 <= p.tr[1]));
  let c = D.profs.filter(p => ok(p, 1)); if (!c.length) c = D.profs.filter(p => ok(p)); if (!c.length) c = D.profs.filter(p => p.k === 'w' && (p.ed || 0) <= ei); if (!c.length) return null;
  return choose(c, { ei, age: S.age, tal: S.tal, merit: meritNow(), major: S.major });
}
function setProf(np) { S.prof = np; S.rk = 0; S.wy = 0; Object.assign(S.tk, { title: np.t, workplace: np.wp, Workplace: np.wp[0].toUpperCase() + np.wp.slice(1) }); }
function startCareer(sp) {
  const np = pickCareer(); if (!np) return;
  setProf(np); for (const [k, v] of Object.entries(np.sk || {})) S.sk[k] = (S.sk[k] || 0) + v / 2;
  const lf = luckF(), n = np.t.toLowerCase();
  sp([(S.edl >= 3 ? `Your degree opened doors, and you found work as ${n}.` : S.edl === 2 ? `Your training paid off. You found work as ${n}.` : `You found work as ${n}.`) + (lf > 0.15 && R() < 0.5 ? ' A bit of luck on the right day helped.' : lf < -0.15 && R() < 0.5 ? ' It took longer than it should have; the timing was against you.' : ''), 'good']);
}
function endSchool(sp) {
  const pass = S.gp + luckF() * 18 + rnd(-5, 5) >= 35;
  S.edl = pass ? 1 : 0; S.edu = pass ? 'finished secondary school' : 'left school without a diploma'; S.pend = 'grad';
  sp([pass ? `You finished school${S.gp >= 80 ? ' with excellent marks' : ''}. A decision is waiting for you.` : 'Your final exams did not go your way. There is no diploma to show for it.', pass ? 'good' : 'bad']);
}
function tuition(kind) {
  const c = kind === 'uni' ? 900 : 350, aid = S.gp >= 85 ? 1 : S.gp >= 70 ? 0.5 : 0, fam = S.fam.some(p => p.k === 'parent' && p.alive) && (S.tier >= 2 || R() < 0.4);
  const rem = c * (1 - aid) * (fam ? 0.5 : 1);
  S.loan = Math.round((S.loan + rem * S.kc) * 10) / 10;
  log(`Tuition for the year: @${c}${aid ? (aid === 1 ? ', covered by a full scholarship' : ', eased by a partial scholarship') : ''}${fam ? ', with your family helping' : ''}. What is left goes on your student loan.`, 'sys');
}
function repay(x) { if (!S.loan || x <= 0) return; const p = Math.min(S.loan, Math.round(x * 0.1 * 10) / 10, S.money); if (p > 0) { S.loan = Math.round((S.loan - p) * 10) / 10; S.money = Math.round((S.money - p) * 10) / 10; } }
function enroll(kind) {
  const uni = kind === 'uni';
  S.stu = { u: kind, yr: 0, len: uni ? (S.tier >= 3 && R() < 0.4 ? 3 : 4) : 2 };
  setProf(D.profs.find(p => p.u === kind)); S.edu = uni ? 'are studying at university' : 'are training as an apprentice';
  log(uni ? 'The acceptance letter arrives. You read it twice.' : 'A workshop has taken you on as an apprentice.', 'good'); fx({ mood: 8, stress: -3 }); note(uni ? 'Started university.' : 'Started an apprenticeship.');
  tuition(kind); S.pend = uni ? 'major' : null; if (!uni) S.major = null;
}
function studyYear(sp) {
  const st = S.stu, uni = st.u === 'uni'; st.yr++;
  if ((S.gp < 30 && R() < 0.5) || (S.ded < 20 && R() < 0.25) || (S.stress > 85 && R() < 0.1)) { S.stu = null; S.edu = 'left your studies early'; S.mood = cl(S.mood - 6); sp([`You dropped out of ${uni ? 'university' : 'your apprenticeship'}. It was a hard decision, and it still stings.`, 'bad']); startCareer(sp); return; }
  if (st.yr >= st.len) {
    S.stu = null;
    if (S.gp + luckF() * 10 >= 38) {
      const h = S.gp >= 80 ? 'first-class honours' : S.gp >= 65 ? 'upper second-class honours' : 'a solid pass';
      S.edl = uni ? 3 : 2; S.edu = uni ? `graduated with ${h}` : 'qualified in your trade'; S.mood = cl(S.mood + 8);
      sp([uni ? `You graduated with ${h}. The ceremony is a blur of gowns and photographs.` : 'You finished your apprenticeship and qualified in your trade.', 'good']);
    } else { S.edu = 'left your studies without a qualification'; S.mood = cl(S.mood - 8); sp(['You did not quite make it through the final assessments. There is no qualification to show for the years.', 'bad']); }
    startCareer(sp); return;
  }
  sp([`Another year of study behind you. ${S.gp >= 70 ? 'Your results are strong.' : S.gp < 45 ? 'Your results are slipping.' : 'Your results are steady.'}`, '']); tuition(st.u);
}
function promo(sp, m) {
  if (S.prof.k !== 'w' || (S.rk || 0) >= 4) return;
  if (R() < cl((0.1 + S.ded / 400 + (avgTal() - 5) / 40 + luckF() * 0.15 + (S.edl || 0) * 0.02) * m, 0.02, 0.6)) { S.rk = (S.rk || 0) + 1; sp([`Your work got noticed. You moved up and now work as ${RK[S.rk]}${S.prof.t.toLowerCase()}.`, 'good']); }
}
function shiftPay(base, ks) {
  const tl = ks.length ? ks.reduce((s, k) => s + (S.tal[k] ?? 5), 0) / ks.length : avgTal(), perf = R() * 0.8 + 0.1 + (S.ded - 50) / 250 + (tl - 5) / 25 + luckF() * 0.15;
  if (perf > 1.05) return { pay: Math.round(base * 1.25), msg: 'You do excellent work today, and it gets noticed.', good: 1 };
  if (perf < 0.15) return { pay: Math.round(base * 0.85), msg: 'Distracted and sloppy, you make mistakes you have to fix.', good: 0 };
  return { pay: Math.round(base), msg: '', good: 1 };
}
const admit = k => k === 'uni' ? cl((S.gp - 35) / 50 + luckF() * 0.25 + (S.tal.intellect - 5) * 0.01, 0.05, 0.97) : cl((S.gp - 18) / 45 + luckF() * 0.2, 0.1, 0.97);
const FN = {
  apply(a) { const uni = a.arg === 'uni'; if (R() < admit(a.arg)) enroll(a.arg); else { (S.rej ??= {})[a.arg] = 1; log(uni ? 'The letter is thin and polite. There is no place for you this year.' : 'The workshop has no apprenticeship place for you this year.', 'bad'); fx({ mood: -5, stress: 4 }); note(uni ? 'Turned down by university.' : 'Turned down for an apprenticeship.'); } },
  work() { S.pend = null; startCareer(rsp); },
  major(a) { const n = MAJORS.find(m => m.id === a.arg).n.toLowerCase(); S.major = a.arg; S.pend = null; log(`You will study ${n}.`, 'good'); note(`Chose to study ${n}.`); },
  drop() { const u = S.stu; S.pend = null; if (u) { S.stu = null; S.edu = 'left your studies early'; } else { S.edl = 0; S.edu = 'left school early'; } log('You close one door and open another.', 'sys'); note(u ? 'Left your studies.' : 'Left school.'); startCareer(rsp); },
  rom(a) { RM.resolve(a.arg); },
  dz(a) { DZ.pickChoice(a); },
  keep() { S.pend = null; log('You decide to stay the course.', 'sys'); }
};
function mkEv() {
  if (S.pend === 'rom') return RM.mkEvent();
  if (S.pend === 'dz') return DZ.mkEvent();
  const rj = S.rej || {};
  if (S.pend === 'grad') { const ok = S.edl >= 1; return { id: 'grad', text: `School is finished. Your record is ${gw(S.gp)}${ok ? '' : ', and you left without a diploma'}. What comes next?`, choices: [
    { label: `Apply to university (about ${Math.round(admit('uni') * 100)}% chance)`, fn: 'apply', arg: 'uni', dis: !ok ? 'Needs a diploma' : S.gp < 35 ? 'Grades too low' : rj.uni ? 'Turned down' : '' },
    { label: `Apply for a trade apprenticeship (about ${Math.round(admit('trade') * 100)}% chance)`, fn: 'apply', arg: 'trade', dis: S.gp < 18 ? 'Grades too low' : rj.trade ? 'Turned down' : '' },
    { label: 'Start looking for work', fn: 'work' }] }; }
  if (S.pend === 'major') return { id: 'major', text: 'Which subject will you study?', choices: MAJORS.map(m => ({ label: m.n, fn: 'major', arg: m.id })) };
  if (S.pend === 'drop') return { id: 'drop', text: S.stu ? 'Are you sure you want to give up your studies?' : 'Are you sure you want to leave school and find work?', choices: [{ label: 'Yes, leave', fn: 'drop' }, { label: 'No, stay', fn: 'keep' }] };
  return null;
}
function initPersonal(L, b) {
  const p = L.p, a = L.age;
  S.edl = p.u ? 1 : a >= 18 ? L.ei : 0; S.tal = { ...L.tal }; S.lk = cl(L.lk + (/lucky/.test(b.keep) ? 4 : 0), 15, 95); S.fort = 0; S.ded = S.ded0 = b.ded;
  S.gp = cl(15 + L.tal.intellect * 4.5 + b.ded * 0.3 + L.ei * 5 + rnd(-6, 6), 5, 98);
  S.loan = S.hs = S.hn = S.xr = S.bo = S.eff = S.att = S.sh = 0; S.gm = {}; S.rej = {}; S.pend = null; S.stu = null; S.adH = L.adH; S.bmi0 = L.bmi0;
  S.lp = Object.fromEntries(Object.keys(S.sk).map(k => [k, 1]));
  S.major = MAJORS.some(m => m.id === p.f) && p.ed >= 2 ? p.f : null;
  S.wy = p.k === 'w' ? Math.max(0, Math.min(a - 20, 35)) : 0; S.rk = p.k === 'w' ? cl(Math.floor(S.wy / 7 * (0.5 + b.ded / 100) + (L.lk - 50) / 60), 0, 4) : 0;
  if (p.u) { S.stu = { u: p.u, yr: rnd(0, p.u === 'uni' ? 2 : 1), len: p.u === 'uni' ? 4 : 2 }; S.major = p.u === 'uni' ? pick(MAJORS).id : null; }
}
function migrate() {
  const e = S.edu || '', z = () => (R() + R() + R() - 1.5) * 2;
  S.edl ??= /university/.test(e) ? 3 : /trade/.test(e) ? 2 : /finished/.test(e) ? 1 : 0;
  S.tal ??= Object.fromEntries(TALK.map(k => [k, cl(Math.round(5.5 + z() * 1.7), 1, 10)]));
  S.lk ??= cl(Math.round(50 + z() * 14), 15, 88); S.fort ??= 0; S.ded ??= rnd(35, 65); S.ded0 ??= S.ded;
  S.gp ??= cl(15 + S.tal.intellect * 4.5 + S.ded * 0.3 + S.edl * 5, 5, 98);
  for (const k of ['rk', 'wy', 'loan', 'hs', 'hn', 'xr', 'bo', 'eff', 'att', 'sh']) S[k] ??= 0;
  S.gm ??= {}; S.rej ??= {}; S.lp ??= Object.fromEntries(Object.keys(S.sk).map(k => [k, day()]));
  if (!S.adH) { S.adH = avgH() + z() * 6.5; S.bmi0 = 21 + S.tier * 0.35 + z() * 2.4; }
  if (S.prof.k === 's' && !S.stu && S.age >= 18 && !S.pend) endSchool(() => {});
}
function famRefresh() { const ft = k => S.fam.find(x => x.k === k && x.alive && (k !== 'child' || x.lives))?.name; ['parent', 'sibling', 'spouse', 'child'].forEach(k => S.tk[k] = ft(k)); }
function bday(sp) {
  S.ef = S.age >= 65 ? 1.3 : 1;
  const ft = k => S.fam.find(x => x.k === k && x.alive && (k !== 'child' || x.lives))?.name;
  const leave = w => { S.fl.withFamily = 0; S.fam.forEach(p => p.lives = false); S.tk.homeName = 'Your place'; S.tk.homeDesc = 'Your place in {city}: a bed, a desk, and the quiet of your own routine.'; sp(w); };
  for (const p of people()) { p.age++; if (p.alive && R() < (p.age < 40 ? 0.001 : p.age < 60 ? 0.004 : p.age < 75 ? 0.02 : p.age < 90 ? 0.08 : 0.2)) { p.alive = false; p.lives = false; const g = 3 + p.bond / 8; S.mood = cl(S.mood - g); S.stress = cl(S.stress + g * 0.7); S.lonely = cl(S.lonely + g * 0.5); sp([p.k ? `Your ${p.role}, ${p.name}, died. The grief arrives in waves, usually at ordinary moments.` : `${p.name}, ${p.role}, died. The news lands harder than you expected.`, 'bad']); } }
  ['parent', 'sibling', 'spouse', 'child'].forEach(k => S.tk[k] = ft(k));
  if (S.prof.k === 's') { if (S.stu) studyYear(sp); else if (S.age >= 18) endSchool(sp); }
  else if (S.prof.k === 'w') {
    S.wy = (S.wy || 0) + 1;
    if (S.age >= 66 && R() < 0.5) { setProf(D.profs.find(q => q.k === 'r')); sp(['You worked your last shift. The mornings feel strange and wide.', 'good']); }
    else {
      promo(sp, 1); const lf = luckF();
      if (R() < 0.06 + lf * 0.1) { fx({ money: 60, mood: 4, luck: 3 }); sp(['A chance meeting turned into a better contract this year. Call it luck.', 'good']); }
      else if (R() < 0.05 - lf * 0.08) { fx({ money: -40, stress: 5, luck: -3 }); sp(['A run of bad luck cost you this year: a repair, a missed payment, a lost deposit.', 'bad']); }
    }
  }
  if (S.fl.withFamily && S.age >= 22 && S.age <= 32 && R() < 0.2) leave(['You moved into a place of your own. The quiet takes some getting used to.', '']);
  else if (S.fl.withFamily && S.age >= 18 && !S.fam.some(p => p.alive && p.lives)) leave(['The family home is empty now. You are on your own.', '']);
  if (RM) RM.yearly(sp);
}
//// ===== end of new systems =====

export function start(data) {
  D = data;
  RM = initRomance({ R, pick, rnd, fx, hist, after, people, byId, norm, why, day, hr, luckF, getS: () => S, getD: () => D, note, bar, render, quiet: () => quiet, go: v => { view = v; render(); }, place: () => D.world[S.loc]?.name || 'the street', say: (t, c = '', j) => { if (SPF) SPF([t, c]); else { log(t, c); if (j) note(t); } } });
  const sayF = (t, c = '', j) => { if (SPF) SPF([t, c]); else { log(t, c); if (j) note(t); } };
  DZ = initDisasters({ R, pick, rnd, cl, fx, hist, people, day, hr, note, say: sayF, getS: () => S, getD: () => D, quiet: () => quiet, ssn: () => ssnNow(), luckF, newPerson, famRefresh, nextDay: () => { S.t += 1440; newDay(); }, asleep: () => slp, after, bar, tpl, pr });
  let saved = null; try { saved = JSON.parse(localStorage.getItem(KEY)); } catch {}
  document.addEventListener('keydown', e => { const n = +e.key; if (n >= 1 && n <= 9 && opts[n - 1] && !opts[n - 1].w && !['INPUT', 'SELECT'].includes(e.target.tagName)) opts[n - 1].f(); });
  if (saved && saved.tk) { S = saved; S.know ??= []; S.jn ??= []; S.nid ??= 0; S.rgn ??= 0; S.fam.forEach(p => norm(p, 'family')); S.fr.forEach(f => { f.age ??= Math.max(5, S.age + rnd(-6, 6)); norm(f, 'friend'); }); S.know.forEach(p => norm(p, 'local')); S.stress ??= 25; S.lonely ??= 25; S.fl.in ??= {}; migrate(); RM.migrate(); DZ.migrate(); if (S.pend) ev = mkEv(); log('— Welcome back. —', 'sys'); render(); } else if (view === 'new') intro(); else location.replace('new.html');
}

let LIFE;
const TIER = ['Money is scarce here', 'Life here is modest', 'Life here is middling', 'Life here is comfortable', 'This is one of the wealthiest places on Earth'];
const RGN = ['Western Europe', 'Eastern Europe', 'North America', 'Latin America', 'Middle East & North Africa', 'Sub-Saharan Africa', 'South Asia', 'East Asia', 'Southeast Asia', 'Oceania', 'Nordic countries'];
function genLife(c = {}) {
  let rows = D.countries.filter(r => c.country ? r.startsWith(c.country + '|') : c.region ? r.split('|')[1] === c.region : true); if (!rows.length) rows = D.countries;
  const [country, rg, tr, cur, rate, food, city] = pick(rows).split('|'), T = +tr - 1, rt = +rate, g = D.regions[+rg];
  const q = R(), age = c.age ? Math.max(5, Math.min(90, c.age)) : Math.floor(q < 0.12 ? 5 + R() * 13 : q < 0.3 ? 65 + R() * 21 : 18 + R() * 47);
  const gd = c.gender || (R() < 0.5 ? 'f' : 'm'), z = () => (R() + R() + R() - 1.5) * 2, tal = Object.fromEntries(TALK.map(k => [k, cl(Math.round(5.5 + z() * 1.7), 1, 10)])), lk = cl(Math.round(50 + z() * 14), 15, 88);
  const ei = age < 12 ? 0 : age < 18 ? 1 : (() => { const e = R() + T * 0.12; return e < 0.35 ? 0 : e < 0.7 ? 1 : e < 0.95 ? 2 : 3; })();
  const edl = age < 18 ? 0 : ei, avT = TALK.reduce((s, k) => s + tal[k], 0) / 4;
  const cand = D.profs.filter(p => age >= p.a[0] && age <= p.a[1] && T + 1 >= p.tr[0] && T + 1 <= p.tr[1]), p = choose(cand.length ? cand : D.profs, { ei: edl, age, tal, merit: cl(avT * 3 + edl * 8 + 20 + rnd(-12, 12), 0, 100) });
  let adH = D.config.body.h[+rg] * (gd === 'f' ? 0.925 : gd === 'x' ? 0.96 : 1) + z() * 6.5, bmi0 = 21 + T * 0.35 + z() * 2.4;
  if (c.height) adH = cl(c.height, 80, 230) / grow(age);
  if (c.weight) bmi0 = cl(c.weight, 12, 250) / (adH * grow(age) / 100) ** 2 - bmiAge(age);
  return { age, p, rg: +rg, gd, ei, tal, lk, adH, bmi0, tier: T, kw: D.config.W[T] * rt, kc: D.config.C[T] * rt, tk: { country, city, food, cur, eatery: g.eatery, shop: g.shop, cook: g.cook, clerk: g.clerk, friend: g.friend, air: g.air, title: p.t, workplace: p.wp, Workplace: p.wp[0].toUpperCase() + p.wp.slice(1) } };
}
const rnd = (a, b) => a + Math.floor(R() * (b - a + 1));
function genBio(L) {
  const gn = L.gd === 'x' ? '' : L.gd, B = D.back, g = D.people[L.rg], a = L.age, T = L.tier, used = new Set(), fn = f => { let n; for (let i = 0; i < 15; i++) { n = pick(g[f || (R() < 0.5 ? 'f' : 'm')]); if (!used.has(n)) break; } used.add(n); return n; }, first = fn(gn), sur = pick(g.last), fam = [];
  const add = (role, k, age, lives = false, alive = true) => fam.push({ role, k, name: fn(['mother', 'sister', 'daughter', 'wife'].includes(role) ? 'f' : ['father', 'brother', 'son', 'husband'].includes(role) ? 'm' : ''), age, bond: rnd(30, 85), alive, lives });
  let pa = a + rnd(22, 34); add('mother', 'parent', pa, false, R() < (pa < 75 ? 0.95 : pa < 90 ? 0.55 : 0.12));
  pa = a + rnd(24, 38); add('father', 'parent', pa, false, R() < (pa < 75 ? 0.93 : pa < 90 ? 0.5 : 0.1));
  for (let i = rnd(0, 3); i > 0; i--) add(R() < 0.5 ? 'brother' : 'sister', 'sibling', Math.max(1, a + rnd(-8, 8)));
  let home = 'alone';
  if (a < 18 || (a < 31 && R() < (T < 2 ? 0.75 : 0.5))) { home = 'family'; fam.forEach(p => { if (p.alive && (p.k === 'parent' || (p.k === 'sibling' && (a < 18 || p.age < a + 3)))) p.lives = true; }); }
  else if (a >= 24 && R() < (a < 30 ? 0.35 : 0.65)) { add(L.gd === 'm' ? 'wife' : L.gd === 'f' ? 'husband' : 'partner', 'spouse', Math.max(18, a + rnd(-5, 5)), true); home = 'spouse'; }
  else if (a >= 62 && R() < 0.4) add(L.gd === 'm' ? 'wife' : L.gd === 'f' ? 'husband' : 'partner', 'spouse', a, false, false);
  const sp = fam.find(p => p.k === 'spouse' && p.alive);
  if (a >= 26 && home !== 'family' && (sp || R() < 0.25)) for (let i = rnd(0, 3); i > 0; i--) { const ca = a - rnd(22, 34); if (ca >= 0) add(R() < 0.5 ? 'son' : 'daughter', 'child', ca, !!sp && ca < 18); }
  const livers = fam.filter(p => p.lives); if (!livers.length) home = 'alone';
  const born = R() < 0.7, ts = [...B.traits].sort(() => R() - 0.5).slice(0, 2);
  const ei = L.ei;
  const eduT = L.p.u ? (L.p.u === 'uni' ? 'are studying at university' : 'are training as an apprentice') : a < 12 ? 'are in primary school' : a < 18 ? 'are in secondary school' : ['left school early', 'finished secondary school', 'trained in a trade', 'went to university'][ei];
  const homeDesc = home === 'alone' ? 'Your place in {city}: a bed, a desk, a laptop, and the quiet of your own routine.' : home === 'spouse' ? `Home with ${sp.name}: two mugs on the counter, one still warm.` : `Home is crowded and warm. ${livers[0].name} is already up and the kitchen smells of {food}.`;
  return { sur: ((q) => q[L.gd === 'f' && q[1] ? 1 : 0])(sur.split('/')), first, fam, ts, ei, eduT, ded: cl(35 + rnd(0, 30) + ts.reduce((s, x) => s + (x.ded || 0), 0), 5, 95), born, home, homeDesc, homeName: home === 'alone' ? 'Your place' : home === 'spouse' ? 'Home' : 'Family home', years: born ? a : rnd(2, Math.max(2, a - 16)), moved: pick(B.moved),
    fr: [0, 1].map(() => ({ name: fn(R() < 0.75 ? gn : gn === 'm' ? 'f' : gn === 'f' ? 'm' : ''), tie: pick(B.ties) })), keep: pick(B.keepsakes), hobby: pick(B.hobbies), mem: [pick(B.child), pick(B.turn), pick(B.regret)] };
}
const story = (L, b) => [
  `${b.born ? 'Born and raised in {city}, {country}.' : `You moved to {city}, {country}, ${b.years} years ago ${b.moved}.`} ${TIER[L.tier]}. You are ${/^[aeiou]/i.test(L.p.t) ? 'an' : 'a'} ${L.p.t.toLowerCase()}.`,
  `You ${b.eduT}. People call you ${b.ts[0].n} and ${b.ts[1].n}. You love ${b.hobby}.`,
  `${b.home === 'alone' ? 'You live alone.' : 'You live with ' + b.fam.filter(p => p.lives).map(p => `${p.name} (${p.role})`).join(', ') + '.'} Family: ${b.fam.map(p => p.alive ? `${p.role} ${p.name} (${p.age})` : `late ${p.role} ${p.name}`).join(', ')}.`,
  `Friends: ${b.fr.map(f => `${f.name} (${f.tie})`).join(', ')}.`,
  bodyLine(L, b)];
let C = { name: '', gender: '', age: '', country: '', region: '', height: '', weight: '' };
function roll() {
  C = { name: $('nm').value.trim(), gender: $('gd').value, age: +$('ag').value || 0, country: $('ct').value, region: $('rg').value, height: +$('ht').value || 0, weight: +$('wt').value || 0 };
  LIFE = genLife(C); const L = LIFE, b = L.bio = genBio(L); S = { log: [], kw: L.kw, kc: L.kc, tk: { ...L.tk, friend: b.fr[0].name } };
  log(`${C.name || b.first} ${b.sur}, ${L.age}.`, 'place'); story(L, b).forEach(t => log(t, 'sys'));
  $('log').innerHTML = S.log.slice(innerWidth <= 1000 ? -30 : -120).map(l => `<p class="${l[1]}">${l[0]}</p>`).join('');
}
export function intro() {
  opts = []; $('status').textContent = '';
  const rows = D.countries.map(r => r.split('|')), o = (v, t) => `<option value="${v}">${t}</option>`;
  const cs = o('', 'Random') + RGN.map((n, i) => `<optgroup label="${n}">` + rows.filter(r => +r[1] === i).map(r => o(r[0], r[0])).join('') + '</optgroup>').join('');
  $('opts').innerHTML = `<div class="form"><label class="f">Name<input id="nm" placeholder="Random" maxlength="20"></label><label class="f">Age<input id="ag" type="number" min="5" max="90" placeholder="Random"></label>` +
    `<label class="f">Gender<select id="gd">${o('', 'Random') + o('f', 'Woman') + o('m', 'Man') + o('x', 'Non-binary')}</select></label><label class="f">Region<select id="rg">${o('', 'Anywhere') + RGN.map((n, i) => o(i, n)).join('')}</select></label>` +
    `<label class="f" style="grid-column:1/3">Country<select id="ct">${cs}</select></label><label class="f">Height (cm)<input id="ht" type="number" min="80" max="230" placeholder="Random"></label><label class="f">Weight (kg)<input id="wt" type="number" min="12" max="250" placeholder="Random"></label></div><button id="go">Begin this life</button><button id="rr">Roll a new past</button><button id="rz">Randomize everything</button>`;
  $('nm').value = C.name; $('ag').value = C.age || ''; $('gd').value = C.gender; $('rg').value = C.region; $('ct').value = C.country; $('ht').value = C.height || ''; $('wt').value = C.weight || '';
  const go = () => newGame($('nm').value.trim());
  $('go').onclick = go; $('rr').onclick = roll; $('nm').onkeydown = e => { if (e.key === 'Enter') go(); };
  $('rz').onclick = () => { ['nm', 'ag', 'gd', 'rg', 'ct', 'ht', 'wt'].forEach(i => $(i).value = ''); roll(); };
  $('rg').onchange = () => { $('ct').value = ''; roll(); };
  $('ct').onchange = () => { const r = rows.find(r => r[0] === $('ct').value); $('rg').value = r ? r[1] : ''; roll(); };
  $('gd').onchange = $('ag').onchange = $('ht').onchange = $('wt').onchange = roll; roll();
}
export const dbg = () => ({ opts, S, view, ev, DZ, set: v => { view = v; render(); } });
export function newGame(typed) {
  const c = D.config.start, L = LIFE, b = L.bio, a = L.age, p = L.p, fam = b.fam, fit = a < 13 ? 0.5 : a < 18 ? 1 : a < 50 ? 1.5 : a < 65 ? 1 : 0.5;
  const ft = k => fam.find(x => x.k === k && x.alive && (k !== 'child' || x.lives))?.name, name = `${typed || b.first} ${b.sur}`;
  const tr = f => b.ts.reduce((s, t) => s + (t[f] || 0), 0);
  S = { name, age: a, t: c.hour * 60, loc: 'room', money: Math.round((a < 13 ? 15 : 60 + R() * 180) * L.kw * 10) / 10, health: a >= 65 ? 70 : 100, hunger: c.hunger, energy: c.energy, mood: cl(c.mood + tr('mood')), rep: Math.min(60, 10 + Math.round(b.years * 1.2)) + tr('rep'), heat: 0, gd: L.gd, stress: a < 13 ? 10 : 25 + (p.k === 'w' ? 5 : 0), lonely: b.home === 'alone' ? 35 : 12, mb: tr('mood'),
    sk: { fitness: fit, charisma: 1, intellect: (a < 13 ? 0.5 : 1) + [0, 0.2, 0.4, 0.8][b.ei], street: 0 }, inv: { keepsake: 1 }, fl: { withFamily: b.home === 'family' ? 1 : 0, in: {} }, job: null, owed: 0, wx: 0, log: [],
    fam, fr: b.fr, mem: b.mem, memi: 0, traits: b.ts.map(t => t.n), kw: L.kw, kc: L.kc, ef: a >= 65 ? 1.3 : 1, prof: p, tier: L.tier,
    tk: { ...L.tk, name, friend: b.fr[0].name, keepsake: b.keep, hobby: b.hobby, homeName: b.homeName, homeDesc: b.homeDesc, parent: ft('parent'), sibling: ft('sibling'), spouse: ft('spouse'), child: ft('child') } };
  S.nid = 0; S.know = []; S.jn = []; S.rgn = L.rg;  S.edu = b.eduT; initPersonal(L, b); S.fam.forEach(p => norm(p, 'family')); S.fr.forEach(f => { f.age = Math.max(5, a + rnd(-6, 6)); f.bond = rnd(35, 75); norm(f, 'friend'); });
  RM.migrate(); DZ.migrate(); for (const t of b.ts) for (const [k, v] of Object.entries(t.sk || {})) S.sk[k] += v;
  for (const [k, v] of Object.entries(p.sk || {})) S.sk[k] += v;
  view = 'main'; ev = null; log(`${name}, ${a}.`, 'place'); story(L, b).forEach(t => log(t, 'sys'));
  note('Your story begins.'); log('It is an ordinary morning. Life was already going on before you opened your eyes.', 'sys'); place(); render(); save();
}
function famAct(p) {
  log(pick(p.lives ? [`You sit with ${p.name} and talk about small things.`, `${p.name} tells a story you've heard before. You listen anyway.`, `You and ${p.name} share a quiet meal.`] : [`You call ${p.name}. The line crackles, then settles into familiar talk.`, `${p.name} fills you in on everyone you both know.`]));
  hist(p, p.lives ? 'Spent time together.' : 'Phoned.'); p.bond = cl(p.bond + 4); fx({ time: p.lives ? 1 : 0.33, mood: p.bond > 60 ? 5 : 3, lonely: p.lives ? -14 : -9, stress: -4 }); after(p.lives ? 1 : 0.33);
}
function thinkBack() { const i = S.memi++ % S.mem.length; log(`You think back. ${S.mem[i]}`, 'sys'); fx({ time: 0.25, mood: [4, -2, -3][i], stress: [-3, 2, 3][i] }); after(0.25); }

function place() { const L = D.world[S.loc]; if (S.loc === 'diner') local('cook'); else if (S.loc === 'mart') local('clerk'); else if (S.loc === 'alley') local('rook'); log(`${L.name}`, 'place'); log(L.desc[per(hr())] + (L.outside ? ' ' + outsideWx() + ' ' + S.tk.air : '')); }

function adv(h) {
  let left = h * 60, el = 0;
  while (left > 0) {
    const s = Math.min(60, left), f = s / 60, d0 = day(); left -= s; S.t += s; el += f;
    S.hunger = cl(S.hunger - f * D.config.hungerPerHour); S.energy = cl(S.energy - f * D.config.energyPerHour * S.ef * bodyEf()); S.hs = (S.hs || 0) + S.hunger * f; S.hn = (S.hn || 0) + f;
    if (S.hunger <= 0 || S.energy <= 0) S.health = cl(S.health - f * 4);
    S.heat = cl(S.heat - f * D.config.heatDecay);
    const al = !(S.fl.withFamily || S.fam.some(p => p.k === 'spouse' && p.alive && p.lives));
    S.lonely = cl(S.lonely + f * (al ? 1.2 : 0.4));
    S.stress = cl(S.stress + f * ((S.owed > 0 ? 1.6 : 0) + (S.money < 8 * S.kc ? 0.7 : 0) + (S.hunger < 20 || S.energy < 15 ? 1 : 0) - 0.9));
    const tg = 72 + (S.mb || 0) - S.stress * 0.35 - S.lonely * 0.3 - (S.hunger < 25 ? 12 : 0) - (S.energy < 20 ? 12 : 0) - (S.health < 40 ? 10 : 0);
    S.mood = cl(S.mood + (tg - S.mood) * Math.min(1, f * 0.08));
    if (day() > d0) newDay();
    if (!quiet && DZ.tick(false)) break;
  }
  inner();
  return el;
}

const INNER = [['h', s => s.hunger < 25, ['Your stomach growls loudly enough that you notice.', "You realize you haven't really eaten in hours."]], ['e', s => s.energy < 20, ['Your eyelids are heavy. Everything takes effort now.']], ['s', s => s.stress > 70, ['Your shoulders are up around your ears. The pressure keeps building.']], ['l', s => s.lonely > 65, ["It hits you that you haven't talked to anyone properly in a while."]], ['m', s => s.mood < 25, ['A gray mood settles over you and will not lift.']], ['j', s => s.mood > 80, ['You notice you are smiling for no particular reason.']]];
function inner() { S.fl.in ??= {}; for (const [k, t, l] of INNER) { if (t(S)) { if (!S.fl.in[k]) { S.fl.in[k] = 1; log(pick(l), 'sys'); } } else S.fl.in[k] = 0; } }
function feel() {
  const w = [], m = S.mood > 80 ? 'happy' : S.mood > 60 ? 'content' : S.mood > 40 ? 'okay' : S.mood > 22 ? 'low' : 'miserable';
  if (S.health < 35) w.push('unwell'); if (S.hunger < 25) w.push('hungry'); else if (S.hunger > 85) w.push('full');
  if (S.energy < 20) w.push('exhausted'); else if (S.energy < 45) w.push('tired');
  if (S.stress > 70) w.push('overwhelmed'); else if (S.stress > 45) w.push('tense');
  if (S.lonely > 65) w.push('lonely'); else if (S.lonely > 45) w.push('a little isolated');
  return [m, ...w].join(', ');
}
function drift() {
  const h = per(hr()), L = S.lonely > 60 ? ['You scroll through old messages and send none of them.', 'The quiet has a weight to it today.'] : S.stress > 60 ? ['You stare at nothing while your thoughts race in loops.', 'You try to breathe slower and mostly manage it.'] : S.mood > 70 ? ['You catch yourself humming without noticing.', 'Nothing happens, and it feels pleasantly like life.'] : h === 'night' ? ['Somewhere a door closes. The night is very still.'] : ['You watch the light move across the wall.', 'Someone laughs nearby, then it is quiet again.', 'You think about nothing in particular, which is its own kind of rest.'];
  log(pick(L)); fx({ time: 1, stress: -3, energy: 2 }); after(1);
}
function msgFriend() {
  const f = pick(S.fr.length ? S.fr : people().filter(p => p.alive && p.kind !== 'family'));
  if (!f) { log('There is nobody to message right now.', 'sys'); return done(); }
  log(pick([`You text ${f.name}. The reply comes within minutes, and soon you are both laughing.`, `${f.name} sends a voice note that is mostly background noise and gossip. It's perfect.`, `You and ${f.name} trade messages about nothing. It helps more than you expected.`]));
  fx({ time: 0.25, lonely: -14, mood: 4, stress: -3 }); after(0.25);
}
const SK = [['A few hours', 0, 'A few hours slip by.'], ['A day', 1, 'A day goes by, much like the others.'], ['A week', 7, 'A week goes by.'], ['A month', 30, 'A month slips past.'], ['A year', 365, 'A year goes by in ordinary days.'], ['A decade', 3650, 'Ten years pass, mostly in small moments you will only half remember.']];
function skip(d, label) {
  if (d < 1) { log(pick(['You let the hours go. Light moves across the room and the day softens.', 'Time passes quietly while you do very little and think a lot.'])); fx({ time: 3, stress: -4 }); return after(3); }
  const m0 = S.mood, $0 = S.money, a0 = S.age, st = [], ev0 = S.fl.evicted;
  const sp = x => { st.push(x); note(Array.isArray(x) ? x[0] : x); };
  quiet = true; SPF = sp; let n = 0, stop = '';
  for (; n < d; n++) {
    const a = S.age; S.att = 1; S.eff = (S.prof.k === 'w' || S.prof.k === 's' || S.job) ? 1 : 0; S.t += 1440; newDay();
    const inc = (S.prof.k === 'w' ? S.prof.pay * (1 + 0.18 * (S.rk || 0)) * 5 / 7 : S.prof.k === 'r' ? 12 : S.prof.k === 's' && S.age >= 18 ? (S.fl.withFamily ? 5 : 14) : 0) * S.kw + (S.job ? D.jobs[S.job.id].levels[S.job.lvl].pay * 3 / 7 * S.kw : 0);
    const rd = S.age < 18 || S.fl.withFamily || DZ.noRent() ? 0 : D.config.rent.amount / D.config.rent.every * S.kc * RM.rentF(), net = inc - (S.age < 18 ? 0 : S.fl.withFamily ? 3 : 7) * Math.min(S.kc, S.kw) - rd; S.money = Math.round((S.money + (net > 0 ? net * 0.35 : net) + rd) * 10) / 10; repay(inc);
    const broke = S.money < 0; if (broke) { S.money = 0; S.hunger = 30; S.health = cl(S.health - 2); S.stress = cl(S.stress + 3); } else { S.hunger = 60; S.energy = 70; }
    const al = S.age >= 18 && !(S.fl.withFamily || S.fam.some(p => p.k === 'spouse' && p.alive && p.lives));
    S.stress = cl(S.stress + (22 + (S.owed > 0 ? 30 : 0) + (broke ? 20 : 0) + (S.prof.k === 'w' ? 6 : 0) - S.stress) * 0.12);
    S.lonely = cl(S.lonely + ((al ? 42 : 16) - S.lonely) * 0.1);
    S.mood = cl(S.mood + (72 + (S.mb || 0) - S.stress * 0.35 - S.lonely * 0.3 - (broke ? 10 : 0) - S.mood) * 0.2);
    if (!broke && S.health < 100 - Math.max(0, S.age - 50) * 0.6) S.health = cl(S.health + 0.5);
    for (const p of people()) if (p.alive) p.bond = cl(p.bond + (p.lives ? 0.01 : p.kind === 'family' ? -0.008 : -0.012));
    if (S.prof.k === 's') S.gp = cl(S.gp + (gpTarget() - S.gp) * 0.012);
    if (S.age > a) { bday(sp); if (S.pend) { stop = 'School is behind you, and a big decision is waiting.'; n++; break; } }
    if (DZ.live()) { stop = 'Something serious is happening, and your attention snaps back to the present.'; n++; break; }
    if (S.health <= 15) { stop = 'Your body is telling you something is wrong. You stop and take stock.'; n++; break; }
    if (S.fl.evicted && !ev0) { stop = 'Rent went unpaid too long, and now your lock has been changed.'; n++; break; }
  }
  quiet = false; SPF = null; S.heat = 0;
  { const lh = DZ.lh(); S.t = Math.floor(S.t / 1440) * 1440 + (lh != null ? lh * 60 : 480); } S.loc = S.fl.evicted ? 'street' : 'room';
  log(d === n ? label : `${n} days pass.`, 'place'); st.forEach(x => Array.isArray(x) ? log(x[0], x[1]) : log(x));
  const e = n / 365 * 3, cnt = e < 1 ? (R() < e ? 1 : 0) : Math.min(7, Math.round(e + R() * 2 - 1));
  for (let i = 0; i < cnt; i++) {
    const c = D.life.filter(v => (!v.min || Object.entries(v.min).every(([k, x]) => S[k] >= x)) && (!v.max || Object.entries(v.max).every(([k, x]) => S[k] <= x)) && (!v.age || (S.age >= v.age[0] && S.age <= v.age[1])) && (!v.has || S.tk[v.has]) && (!v.fade || people().some(p => p.alive && p.kind !== 'family' && p.bond > 20)) && (!v.text.includes('{hobby}') || S.tk.hobby));
    let r = R() * c.reduce((q, v) => q + lwt(v), 0), v = c[0]; for (const w of c) if ((r -= lwt(w)) < 0) { v = w; break; }
    const net = (v.x.mood || 0) - (v.x.stress || 0) + (v.x.money || 0) / 20; if (v.meet) S.tk.new = newPerson({ role: pick(['a neighbor', 'someone from work', 'a friend of a friend']), how: 'you kept running into each other', bond: rnd(35, 50), age: S.age < 18 ? [Math.max(5, S.age - 2), S.age + 3] : [Math.max(18, S.age - 10), S.age + 12] }).name;
    if (v.fade) { const q = pick(people().filter(p => p.alive && p.kind !== 'family' && p.bond > 20)); q.bond = cl(q.bond - 25); S.tk.fade = q.name; hist(q, 'You drifted apart.'); }
    log(v.text, net > 2 ? 'good' : net < -2 ? 'bad' : ''); fx(v.x); note(v.text);
  }
  if (stop) log(stop, S.pend ? 'place' : 'bad');
  const dm = S.mood - m0; log((S.age > a0 ? `You are ${S.age} now. ` : '') + (dm > 8 ? 'These days have been kinder to you than the ones before.' : dm < -8 ? 'It has taken something out of you.' : 'Life settled into its own rhythm.') + (S.money > $0 * 1.3 + 5 ? ' You have a little more put by.' : S.money < $0 * 0.6 ? ' Money is thinner than it was.' : ''), 'sys');
  place(); after(0);
}
const people = () => [...S.fam, ...S.fr, ...(S.know || [])];
const byId = id => people().find(p => p.id === id);
const bw = b => b < 20 ? 'barely know each other' : b < 40 ? 'acquaintances' : b < 60 ? 'friendly' : b < 80 ? 'close' : 'inseparable';
const lvl = v => v < 1 ? 'novice' : v < 2 ? 'capable' : v < 3 ? 'skilled' : v < 5 ? 'expert' : 'master';
const FL = { stubborn: 'They dig in on an opinion and refuse to budge, which somehow makes you smile.', generous: 'They will not let you leave without something to take with you.', anxious: 'They worry out loud about everything, and it makes you feel oddly less alone.', curious: 'They ask three questions for every one of yours.', loyal: 'They remember every detail of what you said last time.', restless: 'They cannot sit still and pace while they talk.', patient: 'They let the silences breathe, and it feels restful.', impulsive: 'They suggest something reckless and you laugh.', proud: 'They mention a small victory with quiet pride.', 'dry-humored': 'One deadpan line has you laughing.', dreamy: 'They drift off mid-sentence into a daydream.', careful: 'They double-check every detail aloud.' };
function note(t) { S.jn ??= []; S.jn.push(`Age ${S.age}: ${tpl(t)}`); if (S.jn.length > 60) S.jn.shift(); }
function hist(p, t) { p.hist.push(`Day ${day()} · ${tpl(t)}`); if (p.hist.length > 8) p.hist.shift(); p.lastc = day(); if (p.r && RM) RM.touch(p); }
function norm(p, kind) {
  S.nid ??= 0; p.kind ??= kind; p.id ??= ++S.nid; p.alive ??= true; p.lives ??= false; p.bond ??= rnd(30, 60); p.hist ??= []; p.since ??= 1; p.role ??= p.tie || 'acquaintance'; p.age ??= rnd(20, 60);
  p.how ??= p.tie || (p.kind === 'family' ? `your ${p.role}` : 'around town');
  p.traits ??= [...D.back.traits].sort(() => R() - 0.5).slice(0, 2).map(t => t.n); p.like ??= pick(D.back.hobbies);
  p.job ??= p.age < 5 ? 'too young for school' : p.age < 18 ? 'in school' : p.age >= 65 ? 'retired' : pick(D.profs.filter(q => q.k === 'w')).t.toLowerCase();
}
function newPerson(o) {
  const g = D.people[S.rgn || 0], f = R() < 0.5 ? 'f' : 'm', used = new Set(people().map(p => p.name)); let name;
  for (let i = 0; i < 12; i++) { name = pick(g[f]); if (!used.has(name)) break; }
  const p = { name, role: o.role, age: rnd(...(o.age || [18, 65])), bond: o.bond ?? rnd(12, 24), kind: 'local', how: o.how, since: day() };
  norm(p, 'local'); S.know ??= []; S.know.push(p); note(`Met ${name}, ${o.role}.`); return p;
}
const LOC = { cook: () => ({ name: S.tk.cook, role: `runs the ${S.tk.eatery}`, age: rnd(38, 64), how: 'you got to know them across the counter', job: 'cook and owner' }), clerk: () => ({ name: S.tk.clerk, role: `works at the ${S.tk.shop}`, age: rnd(22, 55), how: 'they watch the door and know everyone', job: 'shop clerk' }), rook: () => ({ name: 'Rook', role: 'hangs around the back alley', age: rnd(28, 45), how: 'he found you before you found him', job: 'does favors nobody asks about' }) };
function local(k) { S.know ??= []; let p = S.know.find(x => x.key === k); if (!p) { p = { ...LOC[k](), key: k, kind: 'local', bond: 18, since: day() }; norm(p, 'local'); S.know.push(p); note(`Got to know ${p.name}, who ${p.role}.`); } return p; }
const evRef = e => e.has ? S.fam.find(p => p.k === e.has && p.alive && (e.has !== 'child' || p.lives)) : e.text.includes('{friend}') ? S.fr[0] : e.text.includes('{cook}') ? local('cook') : null;
function meet(a) {
  const kid = S.age < 18, st = S.prof.k, w = a.at === 'work', roles = kid ? ['a kid from the neighborhood', 'someone from school'] : w ? (st === 's' ? ['a classmate'] : st === 'r' ? ['someone from the park'] : ['a coworker']) : a.roles;
  if (R() < 0.55 + (S.sk.charisma || 0) * 0.06 + (S.mood - 50) * 0.003) {
    const p = newPerson({ role: pick(roles), how: `you got talking ${w ? (st === 's' ? 'at school' : 'at work') : a.at}`, age: kid || (w && st === 's') ? [Math.max(5, S.age - 2), S.age + 3] : [18, 70] });
    log(`You end up talking with ${p.name}, ${p.role}. ${pick(['Easy laughter, easy silences.', 'It starts awkward and ends warmer.', 'You swap names and a little of your day.'])}`, 'good'); fx({ time: 0.5, lonely: -6, mood: 3 }); hist(p, 'You met.');
  } else { log(pick(['You open your mouth, but the moment passes.', 'A polite smile, a short answer, and the conversation fizzles.'])); fx({ time: 0.25, mood: -1 }); }
  after(0.5);
}
function pAct(p) {
  const n = p.name, h = hr(), o = [], lab = l => l.replace(/\s*\(.*?\)/g, '');
  if (!p.alive) return [{ l: `Remember ${n}`, w: '', f: () => { const t = pick([`You think of ${n}: the way they laughed, something they once said. It aches, and it helps.`, `You go quiet for a while, holding a memory of ${n}.`]); log(t, 'sys'); S.flash = t; hist(p, 'You remembered them.'); fx({ time: 0.25, mood: -1, stress: -4, lonely: -3 }); after(0.25, 'person'); } }];
  const late = (h < 7 || h >= 22) && !p.lives ? 'Too late to call' : '', tired = S.energy < 15 ? 'Too tired' : '';
  const run = (ht, t, x, text, bd, ch) => () => {
    let ok = true, line = pick(text), xx = x, b = bd;
    if (ch) { ok = R() < ch.p; const r = ok ? ch.win : ch.lose; line += ' ' + r.t; xx = { ...x, ...r.x }; b = r.bd; }
    const fl = FL[p.traits[0]]; if (fl && R() < 0.4) line += ' ' + fl;
    p.bond = cl(p.bond + b); hist(p, ht + (ch ? (ok ? ' It went well.' : ' It went badly.') : '')); S.flash = line; log(line, ok ? '' : 'bad'); fx({ time: t, ...xx }); after(t, 'person');
  };
  o.push({ l: `Catch up with ${n}`, w: late, f: run('Caught up.', 0.5, { lonely: -8, mood: 3, stress: -2 }, [`You catch up with ${n}, trading news and small complaints.`, `${n} asks how you have really been, and waits for the answer.`], 3) });
  o.push({ l: p.lives ? `Spend the evening with ${n}` : `Spend a few hours with ${n}`, w: late || tired, f: run('Spent time together.', p.lives ? 2 : 3, { lonely: -18, mood: 6, stress: -5, energy: -6 }, [`You and ${n} lose track of time.`, `The hours with ${n} pass easily, the way they only do with some people.`], 6) });
  o.push({ l: `Share a meal with ${n} (@8)`, w: late || why({ money: 8 }), f: run('Shared a meal.', 1.5, { money: -8, hunger: 35, lonely: -10, mood: 4 }, [`You and ${n} split a meal and the last of the good bread.`, `${n} insists on seconds for both of you.`], 5) });
  o.push({ l: `Help ${n} out with something`, w: late || tired, f: run('Helped them out.', 1.5, { energy: -8, hunger: -3, mood: 3, lonely: -6, rep: 1 }, [`You help ${n} with ${pick(['moving some boxes', 'a stack of paperwork', 'a broken shelf', 'a tedious errand'])}. It is the kind of thing that gets remembered.`], 5) });
  if (p.age >= 16) {
    o.push({ l: `Ask ${n} for a little money`, w: late || (p.bond < 35 ? 'Not close enough' : ''), f: run('Asked for money.', 0.5, {}, [`You ask ${n} for a favor, and it costs you some pride.`], 0, { p: 0.25 + p.bond / 130 + (p.traits.includes('generous') ? 0.15 : 0), win: { t: `${n} quietly hands you some money and will not talk about repaying it.`, x: { money: 25, stress: -6, mood: 1 }, bd: -2 }, lose: { t: `${n} can't, or won't. The air between you gets heavier.`, x: { mood: -3, stress: 3 }, bd: -4 } }) });
    o.push({ l: `Ask ${n} for advice`, w: late, f: run('Asked for advice.', 0.5, p.bond >= 40 ? { stress: -8, mood: 3, sk: { intellect: 0.05 } } : { stress: -2, mood: 1 }, [`You lay out what is on your mind. ${n} listens, then says something that actually helps.`], 2) });
  }
  o.push({ l: `Get ${n} a small gift (@10)`, w: late ? '' : why({ money: 10 }), f: run('Gave a gift.', 0.25, { money: -10, mood: 3, lonely: -3 }, [`You give ${n} something small and thoughtful. Their face does the rest.`], 6) });
  if (p.bond < 50) o.push({ l: `Clear the air with ${n}`, w: late, f: run('Tried to clear the air.', 1, {}, [`You ask ${n} to talk, really talk.`], 0, { p: 0.4 + (S.sk.charisma || 0) * 0.08, win: { t: 'Some of the tension drains out of the room.', x: { stress: -6, mood: 3 }, bd: 12 }, lose: { t: 'It goes in circles and ends badly.', x: { stress: 5, mood: -3 }, bd: -4 } }) });
  return o;
}
function cardP(p) {
  const d = day() - p.since, kn = p.since <= 1 ? (p.kind === 'family' && p.k !== 'spouse' ? 'for as long as you can remember' : 'for years') : d < 30 ? 'a few days' : d < 365 ? Math.round(d / 30) + ' months' : Math.round(d / 365) + ' years';
  const ago = p.lastc ? (day() - p.lastc < 1 ? 'today' : `${day() - p.lastc} days ago`) : 'not lately';
  return `<div class="card"><h2>${p.name}</h2><div class="meta">${p.role}${p.alive ? ', ' + p.age : ' (passed away)'}</div>` + (S.flash && S.pv === p.id ? `<p class="good">${S.flash}</p>` : '') +
    DZ.pNote(p) + `<p>${p.alive ? (p.lives ? 'Lives with you.' : 'Lives nearby in {city}.') : 'Remembered.'} Works as: ${p.job}. Into ${p.like}. Personality: ${p.traits.join(', ')}.</p>` +
    `<p class="meta">How you know them: ${p.how}. Known ${kn}. Last time you were in touch: ${ago}.</p>` + (p.alive ? `<div>${bar('Bond', p.bond, '#8fcf9a')} ${bw(p.bond)}</div>` : '') +
    (p.hist.length ? `<p class="meta">${p.hist.slice().reverse().slice(0, 5).join('<br>')}</p>` : '') + '</div>';
}
function meHTML() {
  const pp = people(), cp = pp.filter(p => p.alive && p.bond >= 60), j = S.job ? D.jobs[S.job.id].levels[S.job.lvl].title : '', rep = S.rep < 20 ? 'a stranger' : S.rep < 50 ? 'a familiar face' : 'a local name';
  const home = S.fl.withFamily ? 'with your family' : S.fam.some(p => p.k === 'spouse' && p.alive && p.lives) ? 'with your partner' : 'on your own', GW = { f: 'woman', m: 'man', x: 'non-binary person' };
  const wk = S.prof.k === 'w', tt = (wk ? RK[S.rk || 0] : '') + S.prof.t.toLowerCase(), title = tt[0].toUpperCase() + tt.slice(1), b = body(), st = S.stu, mj = MAJORS.find(m => m.id === S.major);
  const gm = Object.entries(S.gm || {}).filter(([k, g]) => day() - g.d <= 3 && g.n >= 3).map(([k]) => k);
  return `<div class="card"><h2>${S.name}</h2><div class="meta">${S.age}${S.gd ? ', ' + GW[S.gd] : ''} · {city}, {country}</div><p>${title}${j ? ` (side job: ${j})` : ''}. You live ${home}. ${S.edu ? 'You ' + S.edu + '.' : ''}</p><p>You are ${S.traits.join(' and ')}. You love ${S.tk.hobby || 'quiet evenings'}. You keep ${S.tk.keepsake}.</p></div>` +
    `<div class="card"><h2>Body</h2><p>${bodyStr(b)}.</p><p class="meta">${buildW(b.bmi, S.age)}${S.age < 18 ? ', still growing' : ''}.</p></div>` +
    `<div class="card"><h2>How you are</h2><p>You feel ${feel()}.</p>` + [['Mood', S.mood, '#8fcf9a'], ['Stress', S.stress, '#e0705a'], ['Loneliness', S.lonely, '#6fb0d8'], ['Health', S.health, '#e3a857']].map(x => `<div>${bar(...x)}</div>`).join('') +
    `<p class="meta">Around town you are ${rep}. Money: ${fmt(S.money)}.</p></div>` +
    `<div class="card"><h2>Skills and drive</h2>` + Object.entries(S.sk).map(([k, v]) => `<div>${bar(`${k} ${v.toFixed(1)} · ${lvl(v)}`, (v % 1) * 100, '#8fb7e0')}<span class="meta">talent: ${tw(S.tal[k] ?? 5)}</span></div>`).join('') +
    `<div>${bar('Dedication', S.ded, '#e3a857')} ${dw(S.ded)}</div><p class="meta">${LK[lkIdx(S.lk + (S.fort || 0) * 0.5)][0].toUpperCase() + LK[lkIdx(S.lk + (S.fort || 0) * 0.5)].slice(1)}.${gm.length ? ` You are in a groove with ${gm.join(' and ')}.` : ''}</p></div>` +
    `<div class="card"><h2>Education and career</h2><div>${bar('Academic record', S.gp, '#b79fe0')} ${gw(S.gp)}</div><p class="meta">${st ? `${st.u === 'uni' ? 'University' : 'Apprenticeship'}, year ${st.yr + 1} of ${st.len}${mj && st.u === 'uni' ? ': ' + mj.n.toLowerCase() : ''}. ` : mj && S.edl >= 2 ? `Field: ${mj.n.toLowerCase()}. ` : ''}${wk ? `${Math.floor(S.wy || 0)} years in this line of work. ` : ''}${S.loan > 0 ? `Student loan: ${fmt(S.loan)}.` : ''}</p></div>` +
    `<div class="card"><h2>People</h2><p class="meta">${pp.filter(p => p.alive).length} people in your life, ${cp.length} close${cp.length ? ': ' + cp.sort((a, b) => b.bond - a.bond).slice(0, 3).map(p => p.name).join(', ') : ''}.</p></div>` +
    RM.meCard() + `<div class="card"><h2>Life so far</h2><p class="meta">${(S.jn || []).slice(-14).reverse().join('<br>') || 'Your story is just beginning.'}</p></div>`;
}

function profile() {
  if (view === 'me') return tpl(meHTML());
  if (view === 'person') { const p = byId(S.pv); return p ? tpl(cardP(p) + RM.card(p)) : ''; }
  if (view === 'rom') { const p = byId(S.pv); return p ? tpl(cardP(p) + RM.card(p)) : ''; }
  if (view === 'love') return tpl(RM.loveHTML());
  if (view === 'dz') return tpl(DZ.pageHTML());
  const pp = people(); return `<div class="card"><h2>People in your life</h2><p class="meta">${pp.filter(p => p.alive).length} known · ${pp.filter(p => p.alive && p.bond >= 60).length} close · ${pp.filter(p => !p.alive).length} remembered. Choose someone to see their profile and spend time with them.</p></div>`;
}
function newDay() {
  const r = D.config.rent; ensureCal(); const dt = dateOf(day(), S.cal0, S.yr0), ssn = seasonOf(dt.m, climate(S.tk.country)); const sf = seasonFx(ssn), w14 = wxAt(S, day(), 14), wf = wxFx(w14); S.mood = cl(S.mood + sf.mood + wf.mood); S.stress = cl(S.stress + sf.stress + wf.stress); S.energy = cl(S.energy + sf.energy + wf.energy); S.health = cl(S.health + wf.health);
  { const a = dayWx(S, day()), pv = dayWx(S, day() - 1); if (SEVERE.has(a.kind) || Math.abs(a.mean - pv.mean) > 7) log(wxSummary(S, a), 'sys'); }
  { const hd = holidays(dt.y, S.cal0, S.yr0, S.tk.country)[dt.doy]; if (hd) { const kin = S.fam.some(p => p.alive && p.bond > 40); if (hd.f && !kin) { S.mood = cl(S.mood - 3); S.lonely = cl(S.lonely + 5); log(`${hd.n}. The day is quiet, and you feel how few people are in it.`, 'sys'); } else { S.mood = cl(S.mood + 3); log(`${hd.n}. ${hd.t}`, 'good'); } }
    for (const p of [...S.fam, ...S.fr]) if (p.name && p.alive !== false && ((x) => x.m === dt.m && x.d === dt.d)(bdayMD(p))) { log(`It's ${p.name}'s birthday today.`); S.mood = cl(S.mood + 1); } }
  dailyTrends(); DZ.daily(); RM.daily();
  if (day() > 1 && isMyBday(S, dt) && S.agedY !== dt.y) { S.agedY = dt.y; S.age++; log(`It's your birthday. You turn ${S.age}.`, 'good'); note(`Turned ${S.age}.`); if (!quiet) bday(rsp); }
  if (day() % r.every) return;
  if (S.prof.k === 'r') { const p = S.prof.pay * S.kw; S.money += p; log(`Your pension arrives: +${fmt(p)}.`, 'good'); }
  if (S.age < 18 || S.fl.withFamily || DZ.noRent()) return;
  S.owed += Math.round(r.amount * S.kc * RM.rentF() * 10) / 10;
  if (S.money >= S.owed) { S.money -= S.owed; log(`Rent day. ${fmt(S.owed)} leaves your pocket.`, 'sys'); S.owed = 0; }
  else { S.stress = cl(S.stress + 12); log(`Rent day, and you can't cover it. The landlord leaves a note under your door.`, 'bad'); if (S.owed >= r.amount * S.kc * 2 && !S.fl.evicted) { S.fl.evicted = 1; log('Your lock has been changed. Pay what you owe to get back in.', 'bad'); } }
}

function fx(e) {
  if (!e) return;
  for (const k of ['health', 'hunger', 'energy', 'mood', 'stress', 'lonely', 'heat', 'rep']) if (e[k]) S[k] = cl(S[k] + e[k]);
  if (e.money) S.money = Math.max(0, Math.round((S.money + e.money * (e.money > 0 ? S.kw : kcx())) * 10) / 10);
  if (e.luck) S.fort = cl((S.fort || 0) + e.luck, -30, 30);
  gainSk(e);
  for (const [k, v] of Object.entries(e.bond || {})) { const p = S.fam.find(p => p.k === k && p.alive); if (p) { p.bond = cl(p.bond + v); if (v > 0) S.lonely = cl(S.lonely - v * 1.5); else S.stress = cl(S.stress - v); } }
  if (e.item) S.inv[e.item] = (S.inv[e.item] || 0) + 1;
  if (e.flag) Object.assign(S.fl, e.flag);
  if (e.time) adv(e.time);
}

function why(r) {
  if (!r) return '';
  if (r.money && S.money < r.money * kcx()) return `Need ${fmt(r.money * kcx())}`;
  if (r.age && (S.age < r.age[0] || S.age > r.age[1])) return `Age ${r.age[0]}+`;
  if (r.energy && S.energy < r.energy) return 'Too tired';
  if (r.open) { const h = hr(); if (h < r.open[0] || h >= r.open[1]) return `Closed (${r.open[0]}:00–${r.open[1]}:00)`; }
  for (const [k, v] of Object.entries(r.sk || {})) if ((S.sk[k] || 0) < v) return `Needs ${k} ${v}`;
  return '';
}

function act(a, chain = true) {
  if (a.fn) FN[a.fn](a);
  if (a.text) log(pick(a.text));
  fx(a.x);
  let ok = true; if (a.chance != null) { ok = R() < pr(a.chance); const o = ok ? a.win : a.lose; if (o) { log(pick(o.text), ok ? 'good' : 'bad'); fx(o.x); } }
  if (a.with) { const q = local(a.with), bd = a.bd || {}; q.bond = cl(q.bond + (ok ? (bd.w ?? (a.chance == null ? 4 : 3)) : (bd.l ?? -3))); hist(q, a.label.replace(/\s*\(.*?\)/g, '')); }
  after(chain ? (a.x?.time || 0) : 0);
}

function after(h, v) {
  if (S.health <= 0) { faint(); return done(); }
  DZ.poke();
  if (S.pend && !ev) { ev = mkEv(); if (!ev) S.pend = null; } else if (h > 0 && !ev && !DZ.hush() && R() < D.config.eventChance * Math.min(2, h / 1.5 + 0.3)) ev = pickEvent();
  done(v);
}
function done(v) { view = ev ? 'event' : v || 'main'; save(); render(); }

function pickEvent() {
  const h = hr(), c = D.events.filter(e => (!e.at || e.at.includes(S.loc)) && (!e.has || S.tk[e.has]) && (!e.heatMin || S.heat >= e.heatMin) && (!e.min || Object.entries(e.min).every(([k, v]) => S[k] >= v)) &&
    (!e.hours || (e.hours[0] <= e.hours[1] ? h >= e.hours[0] && h < e.hours[1] : h >= e.hours[0] || h < e.hours[1])));
  const tot = c.reduce((s, e) => s + lwt(e), 0); let r = R() * tot;
  for (const e of c) if ((r -= lwt(e)) < 0) return e;
  return null;
}

function faint() {
  log('Your vision narrows to a tunnel, then nothing. You come to under fluorescent lights. A nurse says you collapsed in the street.', 'bad');
  S.stress = cl(S.stress + 20); S.mood = cl(S.mood - 10); S.health = 40; S.hunger = 40; S.energy = 40; S.money = Math.max(0, Math.round(S.money - 60 * S.kc)); S.t += 600; S.loc = 'clinic';
  log('The bill is @60. They tell you to eat and sleep like a person.', 'bad');
}

function go(id) {
  const m = D.world[S.loc].exits[id] * DZ.travelF(); S.loc = id; adv(m / 60); view = 'main'; place(); after(m / 60);
}

function jobOpts(L) {
  const o = [];
  for (const [id, j] of Object.entries(D.jobs)) {
    if (j.loc !== S.loc) continue;
    const cur = S.job?.id === id, lv = cur ? j.levels[S.job.lvl] : j.levels[0];
    const shiftWhy = (() => { const h = hr(); return h < j.shift[0] || h >= j.shift[1] ? `Shifts ${j.shift[0]}:00–${j.shift[1]}:00` : ''; })();
    if (cur) {
      o.push({ l: `Head in for your shift as ${lv.title}`, w: shiftWhy || (S.energy < lv.energy ? 'Too tired' : ''), f: () => work(j, lv) });
      o.push({ l: 'Quit this job', f: () => { S.job = null; note('Left your job.'); log(`You hand in your apron. You're out of work.`, 'sys'); done(); } });
    } else o.push({ l: `Ask about work as ${lv.title} at ${j.name}`, w: why(lv.req), f: () => { S.job = { id, lvl: 0, shifts: 0 }; log(`You're hired as ${lv.title} at ${j.name}.`, 'good'); note(`Started work as ${lv.title} at ${j.name}.`); done(); } });
  }
  return o;
}

function work(j, lv) {
  log(`You clock in as ${lv.title}. ${pick(['The hours drag.', 'Time melts into the rhythm.', 'Your back complains by midday.'])}`);
  const sh = shiftPay(lv.pay, []); S.eff = 1;
  fx({ time: lv.hours, money: sh.pay, energy: -lv.energy, hunger: -lv.hunger, stress: lv.hours * 1.6, lonely: -4, mood: R() < 0.5 ? 2 : -2 }); S.job.shifts++;
  if (sh.msg) log(sh.msg, sh.good ? 'good' : 'bad'); log(`Shift done. +#${sh.pay}`, 'good'); repay(sh.pay * S.kw);
  const nx = j.levels[S.job.lvl + 1];
  if (nx && lv.promote && S.job.shifts >= lv.promote && !why(nx.req)) { S.job.lvl++; S.job.shifts = 0; note(`Promoted to ${nx.title}.`); log(`The boss calls you over. You're promoted to ${nx.title}!`, 'good'); }
  after(lv.hours);
}

function sleep() {
  let h = (7 - hr() + 24) % 24; h = Math.min(Math.max(h, 6), 10);
  log(`You turn off the light and sleep.`); slp = true; const el = adv(h); slp = false; const cut = el < h - 0.01; h = el;
  const bad = S.stress > 65 || S.lonely > 70; S.energy = cl(S.energy + h * (bad ? 10 : 13)); S.health = cl(S.health + h * 1.5); S.stress = cl(S.stress - h * (bad ? 1.5 : 3)); S.lonely = cl(S.lonely - h * 1.1);
  if (cut) log('You are jolted awake.', 'bad'); else { DZ.sleep(h); log(bad ? `You wake at ${clock()}. You slept, but your mind never fully switched off.` : `You wake at ${clock()}, rested.`, bad ? 'sys' : 'good'); } after(h);
}

function build() {
  opts = [];
  const L = D.world[S.loc], add = (l, f, w = '') => opts.push({ l, f, w });
  if (view === 'event') { for (const c of ev.choices) add(c.label, () => { const e = ev, r = evRef(e); ev = null; if (r) { hist(r, c.label.replace(/\s*\(.*?\)/g, '')); if (r.kind !== 'family' && !c.x?.bond) r.bond = cl(r.bond + Math.sign(c.x?.mood || 0) * 3); } act(c, false); }, why(c.req) || c.dis || ''); return; }
  if (view === 'people') { const od = p => !p.alive ? 4 : p.lives ? 0 : p.kind === 'family' ? 1 : p.kind === 'friend' ? 2 : 3; for (const p of people().sort((a, b) => od(a) - od(b) || b.bond - a.bond)) add(`${p.name} — ${p.alive ? p.role : p.role + ', late'} · ${p.alive ? bw(p.bond) : 'remembered'}`, () => { S.pv = p.id; S.flash = ''; view = 'person'; render(); }); add('Back to life', () => { location.href = 'play.html'; }); return; }
  if (view === 'rom') { RM.buildRom(add); return; }
  if (view === 'dz') { DZ.buildPage(add); return; }
  if (view === 'love') { RM.buildLove(add); return; }
  if (view === 'person') { const p = byId(S.pv); if (p) { pAct(p).forEach(a => add(a.l, a.f, a.w)); DZ.pOpts(p).forEach(a => add(a.l, a.f, a.w)); if (p.alive && RM.ok(p)) add('Romance and relationship…', () => { S.rmv = 'main'; S.rmo = 'person'; view = 'rom'; render(); }); } add('Back to people', () => { view = 'people'; render(); }); return; }
  if (view === 'me') { add('Back to life', () => { location.href = 'play.html'; }); add('Erase save and restart', () => { localStorage.removeItem(KEY); location.href = 'new.html'; }); return; }
  if (view === 'skip') { for (const [l, d, t] of SK) add(l, () => skip(d, t)); add('Back', () => { location.href = 'play.html'; }); return; }
  if (view === 'travel') { for (const [id, m] of Object.entries(L.exits)) add(`${D.world[id].name} (${m} min)`, () => go(id)); add('Back', () => { location.href = 'play.html'; }); return; }
  if (view === 'shop') { for (const [id, it] of Object.entries(D.items)) if (it.price) add(`${it.name} — @${it.price}`, () => { S.money -= Math.round(it.price * kcx() * 10) / 10; S.inv[id] = (S.inv[id] || 0) + 1; log(`You buy a ${it.name.toLowerCase()}.`); render(); save(); }, S.money < Math.round(it.price * kcx() * 10) / 10 ? `Need @${it.price}` : ''); add('Back', () => { location.href = 'play.html'; }); return; }
  if (view === 'inv') {
    const ids = Object.keys(S.inv).filter(i => S.inv[i] > 0 && !D.items[i].rm);
    for (const id of ids) add(`Use ${D.items[id].name} (x${S.inv[id]})`, () => { if (!D.items[id].keep) S.inv[id]--; log(D.items[id].text); fx(D.items[id].x); view = 'main'; save(); render(); });
    if (!ids.length) log('Your pockets are empty.', 'sys');
    add('Back', () => { location.href = 'play.html'; }); return;
  }
  if (view === 'char') {
    add('Back', () => { location.href = 'play.html'; });
    add('Erase save and restart', () => { localStorage.removeItem(KEY); location.href = 'new.html'; }); return;
  }
  const locked = L === D.world.room && S.fl.evicted, open = (L.open ? why({ open: L.open }) : '') || DZ.closed(S.loc);
  for (const a of L.actions) {
    if (locked && a.type !== 'rent') continue;
    if (a.type === 'rent') { if (S.owed > 0) add(`Pay the landlord — ${fmt(S.owed)}`, () => { S.money -= S.owed; S.owed = 0; S.fl.evicted = 0; log('You pay what you owe. The landlord gives your key back.', 'good'); done(); }, S.money < S.owed ? `Need ${fmt(S.owed)}` : ''); continue; }
    if (a.type === 'prof') { profOpt(add); continue; }
    if (a.type === 'meet') { add(a.label, () => meet(a), open || (S.energy < 8 ? 'Too tired' : '')); continue; }
    const w = open || why(a.req);
    add(a.label, a.type === 'sleep' ? sleep : a.type === 'shop' ? () => { view = 'shop'; render(); } : () => act(a), w);
  }
  if (S.loc === 'room' && !locked) { for (const p of [...S.fam.filter(p => p.alive)].sort((x, y) => y.lives - x.lives).slice(0, 4)) add(p.lives ? `Spend time with ${p.name}, your ${p.role} (1h)` : `Phone ${p.name}, your ${p.role} (20m)`, () => famAct(p), !p.lives && DZ.noSignal() ? 'No signal' : ''); add('Think back on your life', thinkBack); add('Message a friend', msgFriend, DZ.noSignal() ? 'No signal' : ''); }
  if (!locked) for (const o of jobOpts(L)) add(o.l, o.f, open ? open : o.w || '');
  RM.lifeOpts(add, S.loc); DZ.opts(add, S.loc);
  add('Let time pass…', () => { view = 'skip'; render(); });
  add(S.loc === 'room' ? 'Lie around and let the hour slip by' : 'Linger a while and let time pass', drift);
  add('Go somewhere', () => { view = 'travel'; render(); });
  add('Pockets', () => { view = 'inv'; render(); });
  add(DZ.banner() ? 'Alerts and preparedness  ⚠' : 'Alerts and preparedness', () => { location.href = 'hazards.html'; });
  add('Character', () => { view = 'char'; charInfo(); render(); });
}

const nat = l => l.replace(/\s*\((?:[^)]*[@#]\d+[^)]*|\d+(?:\.\d+)?\s?[hm])\)/g, m => /@\d+/.test(m) ? `<small>${m.match(/@\d+/)[0]}</small>` : '');
function charInfo() {
  log(`${bodyStr(body())}. Dedication: ${dw(S.ded)}. Grades: ${gw(S.gp)}.`, 'sys');
  log(`Mood ${Math.round(S.mood)}, stress ${Math.round(S.stress)}, loneliness ${Math.round(S.lonely)}, health ${Math.round(S.health)}.`, 'sys');
  const j = S.job ? D.jobs[S.job.id] : null, rep = S.rep < 20 ? 'a stranger' : S.rep < 50 ? 'a familiar face' : 'a local name', heat = S.heat < 10 ? 'clean' : S.heat < 30 ? 'noticed' : S.heat < 60 ? 'watched' : 'wanted';
  log(`${S.name}, ${S.age}: ${S.prof.t.toLowerCase()} in {city}, {country}${j ? '; side job: ' + j.levels[S.job.lvl].title : ''}. Around town you are ${rep}; with the law you are ${heat}. Skills: ` + Object.entries(S.sk).map(([k, v]) => `${k} ${v.toFixed(1)}`).join(', ') + '.', 'sys');
  log(`You are ${S.traits.join(' and ')}. Family: ` + S.fam.map(p => p.alive ? `${p.role} ${p.name} (${p.bond > 69 ? 'close' : p.bond > 44 ? 'warm' : 'distant'})` : `late ${p.role} ${p.name}`).join(', ') + '. Friends: ' + S.fr.map(f => f.name).join(', ') + '.', 'sys');
}
function profOpt(add) {
  const p = S.prof, h = hr();
  if (p.k === 'w') add(`Put in a shift at ${p.wp}`, () => {
    log(pick(['The hours drag.', 'You settle into the rhythm.', 'The work is hard but familiar.']));
    const s = shiftPay(p.pay * (1 + 0.18 * (S.rk || 0)), Object.keys(p.sk || {})); S.eff = 1;
    fx({ time: p.h, money: s.pay, energy: -p.e, hunger: -p.hu, stress: p.h * 1.5, lonely: -4 });
    if (s.msg) log(s.msg, s.good ? 'good' : 'bad'); log(`Shift done. +#${s.pay}`, 'good'); repay(s.pay * S.kw);
    S.sh = (S.sh || 0) + 1; if (S.sh % 25 === 0) promo(rsp, 2);
    after(p.h);
  }, DZ.closed('work') || (h < 6 || h >= 20 ? 'Off hours (6:00–20:00)' : S.energy < p.e ? 'Too tired' : ''));
  else if (p.k === 's') {
    const u = p.u, hh = u === 'uni' ? [8, 18] : u === 'trade' ? [7, 17] : [7, 15];
    add(u === 'uni' ? 'Go to lectures' : u === 'trade' ? 'Train at the workshop' : 'Go to class', () => {
      log(u === 'trade' ? 'You spend the day with tools in your hands, learning by doing.' : u === 'uni' ? 'You sit through lectures, taking notes and losing the thread now and then.' : 'You sit through lessons, half listening, half daydreaming.');
      S.att = 1;
      fx({ time: 6, energy: -10, hunger: -8, mood: -2, stress: 3, lonely: -8, ed: u === 'trade' ? 1.2 : 1.5, sk: u === 'trade' ? { fitness: 0.12, intellect: 0.12 } : { intellect: 0.3 } });
      after(6);
    }, DZ.schoolClosed() || (h < hh[0] || h >= hh[1] ? (u ? 'Not in session' : 'School is closed') : ''));
    if (S.age >= 14 || u) add(u ? 'Drop out and look for work' : 'Leave school and look for work', () => { S.pend = 'drop'; ev = mkEv(); done(); });
  }
  else add(`Spend a while at ${p.wp}`, () => { log('You spend a gentle afternoon among familiar faces.'); fx({ time: 2, mood: 4, lonely: -8, stress: -4, sk: { charisma: 0.1 } }); after(2); });
}

function bar(n, v, col) { return `${n}<span class="bar"><i style="width:${v}%;background:${col}"></i></span>`; }

function mScroll(pv) { if (!matchMedia('(max-width:1000px)').matches) return; requestAnimationFrame(() => { if (pv) return scrollTo(0, 0); const o = $('opts'); scrollTo(0, Math.max(0, o.getBoundingClientRect().top + scrollY - innerHeight * 0.5)); }); }
const ensureCal = () => initCal(S);
const wxStr = () => { ensureCal(); const w = wxAt(S, day(), hr()); return `${w.cond} ${fmtT(w.temp, S.tk.country)}`; };
function outsideWx() { ensureCal(); const w = wxAt(S, day(), hr()), x = exposure(w); let t = wxLine(w); if (x) { S.health = cl(S.health + x.h); S.mood = cl(S.mood + x.m); S.energy = cl(S.energy + x.e); t += ' ' + x.t; } const ox = DZ.outside(); if (ox) t += ' ' + ox; return t; }
const dstr = () => { ensureCal(); const d = dateOf(day(), S.cal0, S.yr0); return `${d.d} ${MON[d.m].slice(0, 3)} ${d.y}`; };
const ssnNow = () => { ensureCal(); return seasonOf(dateOf(day(), S.cal0, S.yr0).m, climate(S.tk.country)); };
function hud() { const h = $('hud'); if (!h) return; h.innerHTML = [['Health', S.health, 1], ['Energy', S.energy, 1], ['Fed', S.hunger, 1], ['Mood', S.mood, 1], ['Stress', S.stress, 0], ['Lonely', S.lonely, 0]].map(([n, v, g]) => { v = Math.round(cl(v)); const c = g ? v : 100 - v; return `<div class="m"><span>${n}<b>${v}</b></span><i><u style="width:${v}%;background:var(--${c < 30 ? 'bad' : c < 55 ? 'hi' : 'good'})"></u></i></div>`; }).join(''); }
function render() {
  if (view === 'new' && S && S.name) { location.href = 'play.html'; return; }
  $('status').innerHTML = `<div class="clk"><b>${WD[(day() - 1) % 7]}</b> ${dstr()} · ${clock()}<span>${ssnNow()} · ${wxStr()} · ${S.tk.city}, age ${S.age}</span></div><div class="mny">${fmt(S.money)}${S.owed ? `<em>owe ${fmt(S.owed)}</em>` : ''}</div><div class="fl">You feel ${feel()}.</div>${DZ.banner()}`; hud();
  if (ev) { if (S.log[S.log.length - 1]?.[0] !== tpl(ev.text)) log(ev.text, 'place'); }
  const lg = $('log'), pv = ['people', 'person', 'me', 'love', 'rom', 'dz'].includes(view);
  lg.innerHTML = pv ? profile() : S.log.slice(innerWidth <= 1000 ? -30 : -120).map(l => `<p class="${l[1]}">${l[0]}</p>`).join(''); lg.scrollTop = pv ? 0 : lg.scrollHeight; mScroll(pv);

  build();
  const o = $('opts'); o.innerHTML = '';
  opts.forEach((x, i) => { const b = document.createElement('button'); b.innerHTML = `<kbd>${i + 1}</kbd><span>${tpl(nat(x.l))}</span>${x.w ? `<small>${tpl(x.w)}</small>` : ''}`; b.disabled = !!x.w; b.onclick = x.f; o.appendChild(b); });
}
