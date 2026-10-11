// IRL inventory, gear, stores and NPC belongings.
// game.js passes in an api object (see initShop call); all text and tuning lives in data/items.json and data/stores.json.
let A, D, S;
const TECH = new Set(['phone', 'laptop', 'audio', 'watch', 'reader', 'console']);
const SLOTN = { outfit: 'clothes', shoes: 'shoes', coat: 'coat', rain: 'rain gear', hat: 'hat', bag: 'bag', phone: 'phone', case: 'phone case', laptop: 'laptop', audio: 'headphones', watch: 'watch', reader: 'e-reader', console: 'console', bed: 'bedding', fan: 'fan', heater: 'heater', tools: 'toolkit', weights: 'weights', guitar: 'guitar', cook: 'cookware' };
const SLOTS = Object.keys(SLOTN);
const WET = ['drizzle', 'rain', 'heavy rain', 'thunderstorm', 'tropical storm', 'hail', 'sleet'];
const CATN = { food: 'Food', drink: 'Drinks', pantry: 'Home pantry', care: 'Toiletries', med: 'Medicine', clothes: 'Clothing', tech: 'Tech', service: 'Plans and services', home: 'For the home', book: 'Books', gift: 'Gifts', misc: 'Other' };
const LB = { hunger: 'fed', health: 'health', energy: 'energy', mood: 'mood', stress: 'stress', lonely: 'loneliness' };
const PH = { dress: 'smarter look', warm: 'keeps out the cold', rain: 'keeps out the rain', sun: 'shade from the sun', cap: 'carry more', pay: 'better pay on laptop jobs', slp: 'better sleep', slpc: 'warmer sleep in the cold', slph: 'cooler sleep in the heat', fit: 'faster fitness', mood: 'lifts your mood daily', msg: 'better calls and chats', tough: 'fewer drops', cook: 'tastier home cooking' };
const r1 = v => Math.round(v * 10) / 10;
const I = id => D.items[id];
const an = n => (/^[aeiou]/i.test(n) ? 'an ' : 'a ') + n.toLowerCase();
const anI = id => (I(id).pl ? 'some ' : /^[aeiou]/i.test(nm(id)) ? 'an ' : 'a ') + nm(id).toLowerCase();
const pm = it => (it.glob ? S.kc * (0.5 / D.config.C[S.tier] + 0.5) : S.kc);
const base = it => (it.price || 0) * pm(it);
const nm = id => A.tpl(I(id).name);
const mk = (id, c = 100) => ({ id, c: Math.round(c) });
const gi = g => I(g.id).gear;
const act = slot => S.gear.filter(g => I(g.id) && gi(g).slot === slot && g.c > 0).sort((a, b) => gi(b).t - gi(a).t || b.c - a.c)[0] || null;
const has = slot => S.gear.some(g => I(g.id) && gi(g).slot === slot);
const pas = k => SLOTS.reduce((s, sl) => s + (act(sl) ? gi(act(sl)).pas?.[k] || 0 : 0), 0);
const cw = g => (g.c <= 0 ? (TECH.has(gi(g).slot) ? 'broken' : 'worn out') : g.c < 25 ? 'falling apart' : g.c < 50 ? 'worn' : g.c < 75 ? 'fine' : 'good');
const cap = () => 14 + pas('cap');
const load = () => Object.entries(S.inv).reduce((s, [id, n]) => s + (I(id) ? n * (I(id).w ?? 1) : 0), 0);
const netOK = () => !!S.fl.withFamily || S.net >= A.day();
const simOK = () => (!!S.fl.withFamily && S.age < 18) || S.sim >= A.day();
const smelly = () => A.day() - (S.lw ?? A.day()) >= 3;
const fam = () => !!S.fl.withFamily;
const gname = g => nm(g.id);
const effStr = it => {
  const b = [];
  for (const [k, v] of Object.entries(it.x || {})) { if (LB[k]) b.push((v > 0 ? '+' : '') + v + ' ' + LB[k]); else if (k === 'sk') b.push(Object.entries(v).map(([s]) => s).join(', ') + ' practice'); else if (k === 'ed') b.push('helps your grades'); }
  if (it.sup?.meals) b.push(`${it.sup.meals} meals at home`); if (it.sup?.wash) b.push(`${it.sup.wash} washes at home`);
  if (it.svc?.sim) b.push(`${it.svc.sim} days of phone signal`); if (it.svc?.net) b.push(`${it.svc.net} days of home internet`);
  if (it.gear) { const p = Object.keys(it.gear.pas || {}).filter(k => PH[k]).map(k => PH[k]); if (it.gear.life) b.push(`lasts about ${it.gear.life} days`); b.push(...p); if (it.act) b.push('unlocks: ' + it.act.label.replace(/\s*\(.*?\)/, '').toLowerCase()); }
  if (it.gift && !it.gear) b.push('a gift people remember');
  return b.join(' · ');
};

export function initShop(api) {
  A = api; const get = () => { D = A.getD(); S = A.getS(); };
  const R = () => A.R();
  const sync = f => (...a) => { get(); return f(...a); };

  //// ===== inventory =====
  function add(id, n = 1, c) {
    const it = I(id); if (!it) return;
    if (it.gear) for (let i = 0; i < n; i++) S.gear.push(mk(id, c ?? 100));
    else if (it.sup) for (const [k, v] of Object.entries(it.sup)) S.sup[k] = (S.sup[k] || 0) + v * n;
    else if (it.svc) for (const [k, v] of Object.entries(it.svc)) S[k] = Math.max(S[k] || 0, A.day() - 1) + v * n;
    else S.inv[id] = (S.inv[id] || 0) + n;
  }
  function kit() {
    const a = S.age, t = S.tier, c = () => A.rnd(45, 95);
    S.gear.push(mk('outfit_basic', c()), mk('shoes_basic', c()));
    if (a >= 12) S.gear.push(mk(t >= 4 && R() < 0.5 ? 'phone_mid' : 'phone_basic', c()));
    if (a >= 14 && (S.prof.k === 'w' || S.prof.k === 's' || t >= 3)) S.gear.push(mk('laptop_refurb', c()));
    if (A.cold() ? R() < 0.8 : R() < 0.15) S.gear.push(mk('coat_warm', c()));
    if (R() < 0.4) S.gear.push(mk('umbrella', c()));
    if (a >= 12 && t >= 3 && R() < 0.3) S.gear.push(mk('headphones', c()));
  }
  function startKit() {
    get(); S.gear = []; S.stk = {}; S.hg = {}; S.hgf = {}; S.sup = { meals: A.rnd(3, 6), wash: A.rnd(5, 10) };
    S.sim = A.day() + A.rnd(10, 24); S.net = A.day() + A.rnd(8, 26); S.lw = A.day() - A.rnd(0, 1); kit();
  }
  function migrate() {
    get(); S.stk ??= {}; S.hg ??= {}; S.hgf ??= {}; S.sup ??= { meals: 4, wash: 8 }; S.sim ??= A.day() + 14; S.net ??= A.day() + 14; S.lw ??= A.day();
    if (!S.gear) { S.gear = []; kit(); }
    for (const id of Object.keys(S.inv)) { const it = I(id); if (!it) delete S.inv[id]; else if (it.gear) { const n = S.inv[id]; delete S.inv[id]; for (let i = 0; i < n; i++) S.gear.push(mk(id, 80)); } }
    for (const p of A.people()) p.inv ??= npcInv(p);
  }

  //// ===== NPC belongings =====
  const wpick = (pool, kid) => { const ps = pool.filter(([, it]) => (kid ? true : !it.kid)); let r = R() * ps.reduce((s, [, it]) => s + it.npc, 0); for (const [id, it] of ps) if ((r -= it.npc) < 0) return id; return ps[0][0]; };
  const npcPool = () => Object.entries(D.items).filter(([, it]) => it.npc);
  function npcInv(p) {
    const inv = {}, kid = p.age < 14, pool = npcPool(), n = kid ? A.rnd(2, 4) : A.rnd(3, 6);
    for (let i = 0; i < n; i++) { const id = wpick(pool, kid); inv[id] = (inv[id] || 0) + 1; }
    if (p.age >= 12) { const r = R(); inv[r < 0.7 ? 'phone_basic' : r < 0.95 ? 'phone_mid' : 'phone_pro'] = 1; }
    if (p.age >= 18 && R() < 0.3) inv[R() < 0.7 ? 'laptop_refurb' : 'laptop_mid'] = 1;
    return inv;
  }
  function npcDay() {
    for (const p of A.people()) {
      if (!p.alive || !p.inv || R() > 0.05) continue;
      const ids = Object.keys(p.inv).filter(id => I(id) && !I(id).gear && !I(id).keep);
      if (ids.length && R() < 0.5) { const id = A.pick(ids); if (--p.inv[id] <= 0) delete p.inv[id]; }
      else if (Object.keys(p.inv).length < 12) { const id = wpick(npcPool(), p.age < 14); p.inv[id] = (p.inv[id] || 0) + 1; }
    }
  }
  function belongings(p) {
    if (!p.alive || !p.inv) return '';
    const l = Object.entries(p.inv).filter(([id, n]) => I(id) && n > 0).sort((a, b) => (I(b[0]).gear ? 1 : 0) - (I(a[0]).gear ? 1 : 0)).slice(0, 9).map(([id, n]) => (n > 1 ? `${nm(id)} ×${n}` : nm(id)).toLowerCase());
    return l.length ? `<p class="meta">On them or around them lately: ${l.join(', ')}.</p>` : '';
  }
  const giftable = () => Object.keys(S.inv).filter(id => S.inv[id] > 0 && I(id) && !I(id).keep && !I(id).rm && I(id).price);
  function giveOpts(addB, p) {
    const n = p.name;
    for (const id of giftable()) addB(`Give ${nm(id)} (x${S.inv[id]})`, () => {
      const it = I(id), val = it.gift ?? (it.cat === 'food' || it.cat === 'drink' ? 0.6 : 0.4), hit = it.lk && new RegExp(it.lk, 'i').test(p.like || '');
      S.inv[id]--; p.inv ??= {}; if (Object.keys(p.inv).length < 12 || p.inv[id]) p.inv[id] = (p.inv[id] || 0) + 1;
      p.bond = A.cl(p.bond + Math.round(val * 3 + (hit ? 4 : 0)));
      const line = hit ? `${n} lights up. "How did you know?" It is exactly the sort of thing they love.` : val >= 2 ? A.pick([`${n} holds it carefully and says nothing for a second. That is the best thanks.`, `"You didn't have to," ${n} says, clearly glad you did.`]) : A.pick([`${n} takes it with a smile. "Thanks, that's kind."`, `${n} tucks it away, pleased.`]);
      A.hist(p, `Gave them ${anI(id)}.`); A.setFlash(line); A.log(line, 'good'); A.fx({ time: 0.25, mood: 1 + Math.round(val), lonely: -Math.round(val * 2) }); A.after(0.25, 'person');
    });
    if (!giftable().length) A.log('Your pockets have nothing to give right now. The shops on Shopping Row do.', 'sys');
  }
  function askOpts(addB, p) {
    const n = p.name, ids = Object.keys(p.inv || {}).filter(id => I(id) && !I(id).gear && !I(id).keep && p.inv[id] > 0);
    for (const id of ids) addB(`Ask ${n} for ${anI(id)}`, () => {
      const ok = R() < 0.3 + p.bond / 150 + (p.traits.includes('generous') ? 0.15 : 0);
      if (ok) { p.inv[id]--; if (p.inv[id] <= 0) delete p.inv[id]; add(id); p.bond = A.cl(p.bond - 1); const l = `${n} hands over ${anI(id)} and waves off any thanks.`; A.hist(p, 'Gave you something they could spare.'); A.setFlash(l); A.log(l, 'good'); A.fx({ time: 0.1, mood: 1 }); }
      else { p.bond = A.cl(p.bond - 2); const l = `${n} would rather hold on to it. The air gets a little awkward.`; A.hist(p, 'Turned down a favor.'); A.setFlash(l); A.log(l, 'bad'); A.fx({ time: 0.1, mood: -1 }); }
      A.after(0.1, 'person');
    }, load() + (I(id).w ?? 1) > cap() ? 'Hands full' : p.bond < 25 ? 'Not close enough' : '');
    if (!ids.length) A.log(`${n} has nothing they could spare right now.`, 'sys');
  }
  function bdayGifts(sp) {
    const gs = A.people().filter(p => p.alive && p.kind !== 'local' && p.bond >= 45 && R() < 0.5).sort(() => R() - 0.5).slice(0, 2);
    const pool = Object.entries(D.items).filter(([, it]) => it.gift && it.price).map(([id]) => id);
    for (const p of gs) {
      const hob = S.tk.hobby || '', id = A.pick(pool.filter(i => I(i).lk && new RegExp(I(i).lk, 'i').test(hob)).concat(pool));
      add(id); p.bond = A.cl(p.bond + 1); A.fx({ mood: 2 });
      sp([`${p.kind === 'family' ? `Your ${p.role}, ${p.name},` : `${p.name}`} gives you ${anI(id)}${R() < 0.5 ? ', wrapped in far too much tape' : ''}.`, 'good']);
    }
  }

  //// ===== stores =====
  const clerk = st => (S.know || []).find(p => p.key === D.stores[st].clerk);
  const disc = st => { const c = clerk(st), b = c ? c.bond : 0; return (b >= 80 ? 0.1 : b >= 60 ? 0.06 : b >= 40 ? 0.03 : 0) + (S.hg[st] === A.day() ? 0.08 : 0); };
  function stock(st) {
    const s = D.stores[st], wk = Math.floor((A.day() - 1) / 7), out = [];
    for (const e of s.stock) {
      const id = Array.isArray(e) ? e[0] : e, it = I(id), lim = Array.isArray(e) ? e[1] : s.used ? 1 : 0, key = st + ':' + id; let rec = null, c = 100;
      if (lim) { rec = S.stk[key]; if (!rec || rec.wk !== wk) rec = S.stk[key] = { wk, n: s.used ? (R() < 0.65 ? 1 : 0) : lim, c: s.used ? A.rnd(30, 65) : 100 }; c = rec.c; }
      const pr = r1(s.used ? base(it) * s.uprice * (0.6 + 0.4 * c / 100) : base(it) * s.mult * (1 - disc(st)));
      out.push({ id, it, rec, c, price: Math.max(0.1, pr), left: rec ? rec.n : null });
    }
    return out.filter(r => !r.rec || r.left > 0 || !D.stores[st].used);
  }
  function block(r) {
    const it = r.it;
    if (r.rec && r.left <= 0) return 'Sold out';
    if (it.age && S.age < it.age) return `Age ${it.age}+`;
    if (S.money < r.price) return `Need ${A.fmt(r.price)}`;
    if (!it.gear && !it.sup && !it.svc && load() + (it.w ?? 1) > cap()) return 'Too much to carry';
    return '';
  }
  function buy(r, st) {
    S.money = r1(S.money - r.price); add(r.id, 1, r.c); if (r.rec) r.rec.n--;
    const it = r.it, c = clerk(st); if (c) c.bond = A.cl(c.bond + 0.5);
    let t = `You buy ${anI(r.id)}.`;
    if (it.svc?.sim) t = `You top up your phone plan. Signal until day ${S.sim}.`; else if (it.svc?.net) t = `The router blinks green. Internet until day ${S.net}.`; else if (it.sup) t = `You carry it home and fill the cupboard in your head.`;
    if (st === 'pawn' && R() < 0.12) { A.fx({ heat: 6 }); t += ' Rook does not say where it came from, and you do not ask.'; }
    A.log(t); A.fx({ time: 0.05 }); A.after(0, 'shop');
  }
  function haggle(st) {
    const c = A.local(D.stores[st].clerk), ok = R() < 0.28 + (S.sk.charisma || 0) * 0.07 + c.bond / 400 + (S.mood - 50) * 0.001;
    if (ok) { S.hg[st] = A.day(); A.log(`${c.name} sighs, taps the register, and knocks a little off today's prices.`, 'good'); A.fx({ time: 0.1, stress: -1 }); A.hist(c, 'Haggled a better price.'); }
    else { S.hgf[st] = A.day(); c.bond = A.cl(c.bond - 2); A.log(`${c.name} shakes their head. "Prices are prices."`, 'bad'); A.fx({ time: 0.1, stress: 1 }); A.hist(c, 'Tried to haggle and failed.'); }
    A.after(0, 'shop');
  }
  const sellVal = (st, it, g) => { const s = D.stores[st]; if (!it.price || it.keep || it.rm || it.svc || it.sup) return 0; if (!(s.buys.includes('*') || s.buys.includes(it.cat))) return 0; return r1(base(it) * s.rate * (g ? (g.c > 0 ? 0.2 + 0.8 * g.c / 100 : 0.12) : 0.7)); };
  function sellRows(st) {
    const r = [];
    for (const [id, n] of Object.entries(S.inv)) if (n > 0 && I(id)) { const v = sellVal(st, I(id)); if (v > 0) r.push({ l: `${nm(id)} (x${n})`, v, f: () => { S.inv[id]--; } }); }
    for (const g of S.gear) { const v = sellVal(st, I(g.id), g); if (v > 0) r.push({ l: `${gname(g)} (${cw(g)})`, v, f: () => { S.gear.splice(S.gear.indexOf(g), 1); } }); }
    return r;
  }
  const fixCost = (st, g) => { const f = D.stores[st].fix; return r1(base(I(g.id)) * f.rate * (1 + (1 - g.c / 100) * 0.3)); };
  const fixable = st => { const f = D.stores[st].fix; return f ? S.gear.filter(g => I(g.id) && f.slots.includes(gi(g).slot) && g.c < f.to - 5) : []; };
  const ownLine = st => {
    const sl = [...new Set(D.stores[st].stock.map(e => I(Array.isArray(e) ? e[0] : e)).filter(it => it.gear).map(it => it.gear.slot))];
    const l = sl.map(s => { const g = act(s) || S.gear.find(x => gi(x).slot === s); return g ? `${SLOTN[s]}: ${cw(g)}` : `${SLOTN[s]}: none`; });
    return l.length ? `<p class="meta">What you have now — ${l.join(' · ')}.</p>` : '';
  };
  function shopHTML() {
    get(); const st = S.shp, s = D.stores[st], c = clerk(st), rows = stock(st), d = disc(st);
    let h = `<div class="card"><h2>${A.tpl(s.n)}</h2><div class="meta">${c ? `${c.name} is behind the counter. ` : ''}${d ? `Your price break today: ${Math.round(d * 100)}%. ` : ''}Carrying ${Math.round(load())} of ${cap()}.</div>` + (s.used ? '<p class="meta">Used goods only, and stock changes weekly. Condition is shown; prices follow it.</p>' : '') + ownLine(st);
    const g = {}; for (const r of rows) (g[r.it.cat] ??= []).push(r);
    for (const [k, l] of Object.entries(g)) { h += `<div class="itg"><b>${CATN[k] || k}</b>`; for (const r of l) h += `<div class="itl"><span>${nm(r.id)}${s.used ? ` <em>(${cw({ id: r.id, c: r.c })})</em>` : ''}<small>${effStr(r.it)}</small></span><span class="pr">${A.fmt(r.price)}${r.left != null && !s.used ? `<i>${r.left} left</i>` : ''}</span></div>`; h += '</div>'; }
    return h + '</div>';
  }
  function shopOpts(addB) {
    const st = S.shp, s = D.stores[st], L = D.world[S.loc], open = L?.open ? A.why({ open: L.open }) : '';
    for (const r of stock(st)) addB(`${nm(r.id)} — ${A.fmt(r.price)}`, () => buy(r, st), open || block(r));
    for (const g of fixable(st)) { const cost = fixCost(st, g); addB(`${TECH.has(gi(g).slot) ? 'Repair' : 'Mend'} ${gname(g)} (${cw(g)}) — ${A.fmt(cost)}`, () => { S.money = r1(S.money - cost); g.c = s.fix.to; A.log(`${A.local(s.clerk).name} fixes your ${gname(g).toLowerCase()} while you wait.`, 'good'); A.fx({ time: 0.5 }); A.after(0.5, 'shop'); }, open || (S.money < cost ? `Need ${A.fmt(cost)}` : '')); }
    if (s.buys.length) addB('Sell something…', () => { A.setView('sell'); }, open || (sellRows(st).length ? '' : 'Nothing they want'));
    if (s.rate !== undefined && !s.used) addB('Ask for a better price', () => haggle(st), open || (S.hg[st] === A.day() || S.hgf[st] === A.day() ? 'Already asked today' : ''));
    const c = A.local(s.clerk);
    addB(`Chat with ${c.name} (15m)`, () => { c.bond = A.cl(c.bond + 4); A.hist(c, 'Chatted across the counter.'); A.log(A.pick([`${c.name} tells you which stock moves and which stays on the shelf forever.`, `You and ${c.name} talk about nothing in particular. It is nice to be recognized.`, `${c.name} mentions what is coming in next week.`])); A.fx({ time: 0.25, lonely: -3, mood: 1 }); A.after(0.25, 'shop'); }, open);
    addB('Pockets', () => A.setView('inv'));
    addB('Leave the shop', () => A.setView('main'));
  }
  function sellHTML() {
    get(); const st = S.shp, rows = sellRows(st);
    return `<div class="card"><h2>Sell to ${A.tpl(D.stores[st].n)}</h2><p class="meta">They pay ${Math.round(D.stores[st].rate * 100)}% of the value, less for wear. Pick an item from the list.</p>${rows.map(r => `<div class="itl"><span>${r.l}</span><span class="pr">${A.fmt(r.v)}</span></div>`).join('') || '<p class="meta">Nothing they would buy.</p>'}</div>`;
  }
  function sellOpts(addB) {
    const st = S.shp; for (const r of sellRows(st)) addB(`Sell ${r.l} — ${A.fmt(r.v)}`, () => { r.f(); S.money = r1(S.money + r.v); A.log(`You sell your ${r.l.replace(/\s*\(.*\)/, '').toLowerCase()}.`, 'good'); A.fx({ time: 0.1 }); A.after(0, 'sell'); });
  }

  //// ===== pockets, gear and home =====
  function diy(g) {
    const p = 0.4 + (S.sk.intellect || 0) * 0.07 + (S.tal.intellect - 5) * 0.015, ok = R() < p;
    if (ok) { g.c = Math.min(65, Math.max(g.c, 30) + 35); A.log(`An hour, some tape and a lot of swearing under your breath: your ${gname(g).toLowerCase()} works again.`, 'good'); } else { g.c = Math.max(0, g.c - 6); A.log(`You make it worse. Your ${gname(g).toLowerCase()} gives a sad little click.`, 'bad'); }
    A.fx({ time: 1, sk: { intellect: 0.08 }, stress: ok ? -2 : 3 }); A.after(1, 'inv');
  }
  function invHTML() {
    get(); const inv = Object.entries(S.inv).filter(([id, n]) => n > 0 && I(id) && !I(id).rm), f = fam();
    let h = `<div class="card"><h2>Pockets</h2><div class="meta">Carrying ${Math.round(load())} of ${cap()}${has('bag') ? '' : ' · a backpack would help'}</div>` + (inv.length ? inv.map(([id, n]) => `<div class="itl"><span>${nm(id)}${n > 1 ? ` ×${n}` : ''}<small>${effStr(I(id)) || 'keep it for a gift'}</small></span></div>`).join('') : '<p class="meta">Empty.</p>') + '</div>';
    const gs = S.gear.slice().sort((a, b) => SLOTS.indexOf(gi(a).slot) - SLOTS.indexOf(gi(b).slot));
    h += `<div class="card"><h2>Gear</h2>` + (gs.length ? gs.map(g => `<div class="itl"><span>${gname(g)}<small>${SLOTN[gi(g).slot]} · ${act(gi(g).slot) === g ? 'in use' : g.c <= 0 ? 'unusable' : 'spare'}</small></span><span class="pr">${A.bar(cw(g), Math.max(2, g.c), g.c < 25 ? '#e0705a' : g.c < 50 ? '#e3a857' : '#8fcf9a')}</span></div>`).join('') : '<p class="meta">You own nothing worth listing.</p>') + '</div>';
    const dl = k => { const d = S[k] - A.day() + 1; return d > 0 ? `${d} day${d === 1 ? '' : 's'} left` : 'lapsed'; };
    h += `<div class="card"><h2>At home</h2><p class="meta">Pantry: ${f ? 'the family kitchen is stocked' : (S.sup.meals || 0) + ' meal' + (S.sup.meals === 1 ? '' : 's')}. Toiletries: ${f ? 'shared with the family' : (S.sup.wash || 0) + ' wash' + (S.sup.wash === 1 ? '' : 'es')}. ` +
      `Phone plan: ${S.age < 12 ? 'not needed yet' : simOK() ? (S.fl.withFamily && S.age < 18 ? 'covered by your family' : dl('sim')) : 'lapsed'}. Home internet: ${netOK() ? (f ? 'covered by your family' : dl('net')) : 'lapsed'}. You last washed ${A.day() - S.lw < 1 ? 'today' : A.day() - S.lw + ' days ago'}.</p></div>`;
    return h;
  }
  function invOpts(addB) {
    for (const [id, n] of Object.entries(S.inv)) {
      const it = I(id); if (!(n > 0) || !it || it.rm || !(it.keep || Object.keys(it.x || {}).length)) continue;
      addB(`Use ${nm(id)} (x${n})`, () => { if (!it.keep) S.inv[id]--; A.log(it.text); A.fx(it.x); A.after(it.x?.time || 0, 'inv'); }, it.x?.time && S.energy < 8 ? 'Too tired' : '');
    }
    if (act('tools')) for (const g of S.gear) if (I(g.id) && gi(g).life && g.c < 60 && !['tools'].includes(gi(g).slot)) addB(`Fix ${gname(g)} yourself (${cw(g)}, 1h)`, () => diy(g), S.energy < 8 ? 'Too tired' : '');
  }
  function homeActs(addB) {
    for (const g of S.gear) { const it = I(g.id); if (it?.act && act(gi(g).slot) === g) addB(it.act.label, () => A.act({ ...it.act }), A.why(it.act.req)); }
  }
  function cookOpt(addB) {
    const f = fam(), m = S.sup.meals || 0, q = pas('cook');
    addB(f ? 'Eat from the family kitchen (30m)' : `Cook something at home (30m) · ${m} meal${m === 1 ? '' : 's'} in the pantry`, () => {
      if (!f) S.sup.meals--; A.log(A.pick(q ? ['A proper pan makes a proper dinner. It smells like somewhere you want to be.', 'Onions, garlic, patience. You eat well tonight.'] : ['Boil water, add whatever is left. Salty, hot, fine.', 'You cook the same thing you always cook. It does the job.'])); A.fx({ time: 0.5, hunger: 30 + q * 7, mood: 1 + q, health: 1 }); A.after(0.5);
    }, !f && m < 1 ? 'Pantry empty' : A.why({ energy: 5 }));
  }
  function washOpts(addB) {
    const f = fam(), w = S.sup.wash || 0;
    if (f || w > 0) addB(f ? 'Wash up and change' : `Wash up and change · ${w} wash${w === 1 ? '' : 'es'} of supplies`, () => { if (!f) S.sup.wash--; S.lw = A.day(); A.log('The water pressure is a rumor, but it\'s hot.'); A.fx({ time: 0.4, mood: 4, stress: -5 }); A.after(0.4); });
    else { addB('Wash up and change', () => { }, 'Out of soap'); addB('Rinse off with just water (15m)', () => { S.lw = Math.max(S.lw, A.day() - 2); A.log('Cold water and no soap. Better than nothing, barely.'); A.fx({ time: 0.25, mood: 1 }); A.after(0.25); }); }
  }
  function lapOpt(addB, a, open) {
    const g = act('laptop'); let w = open || '';
    if (!w) w = !g ? (has('laptop') ? 'Laptop is broken' : 'No laptop') : A.why(a.req) || (a.at === 'home' && !netOK() ? 'No internet at home' : a.at === 'cafe' && S.money < 3 * S.kc ? `Need ${A.fmt(3 * S.kc)}` : '');
    const mult = (g ? gi(g).pas.pay : 1) * (a.at === 'cafe' ? 0.92 : 1), sc = o => ({ ...o, text: o.text.replace(/#(\d+)/g, (_, n) => '#' + Math.round(n * mult)), x: { ...o.x, money: Math.round(o.x.money * mult) } });
    const a2 = { ...a, win: sc(a.win), lose: sc(a.lose), x: { ...a.x, ...(a.at === 'cafe' ? { money: -3 } : {}) } };
    addB(a.label, () => A.act(a2), w);
  }

  //// ===== hooks used by the engine =====
  const phoneW = () => { if (S.age < 12) return ''; const g = act('phone'); if (!g) return has('phone') ? 'Phone is broken' : 'No phone'; if (!simOK() && !(S.loc === 'room' && netOK())) return 'No phone plan'; return ''; };
  const shield = (x, w) => {
    if (!x) return x; const co = act('coat'), ra = act('rain'), ht = act('hat'); let k = 1, who = '';
    if (w.feels <= -8 && co) { k *= gi(co).pas.warm; who = gname(co); }
    if (WET.includes(w.cond) && ra) { k *= gi(ra).pas.rain; who = who || gname(ra); }
    if (w.feels >= 34 && ht) { k *= gi(ht).pas.sun; who = who || gname(ht); }
    return k < 1 ? { h: x.h * k, m: x.m * k, e: x.e * k, t: x.t + ` Your ${who.toLowerCase()} takes the worst of it.` } : x;
  };
  const sleepMul = w => { return 1 + pas('slp') + (w && w.feels <= 5 ? pas('slpc') : 0) + (w && w.feels >= 28 ? pas('slph') : 0); };
  const dress = () => { const g = act('outfit'); return !g ? 0.88 : (gi(g).pas.dress || 1) >= 2 ? 1.05 : g.c < 25 ? 0.94 : 1; };
  const social = () => { const g = act('outfit'); return (g ? ((gi(g).pas.dress || 1) - 1) * 0.03 : -0.12) + (smelly() ? -0.1 : 0); };
  const fitMul = () => { return 1 + pas('fit'); };
  const msgB = () => { return pas('msg'); };

  //// ===== daily upkeep =====
  function warn(key, cond, text, cls = 'sys') { S.fl.sw ??= {}; if (cond) { if (!S.fl.sw[key]) { S.fl.sw[key] = 1; A.log(text, cls); } } else S.fl.sw[key] = 0; }
  function daily() {
    get(); if (!S.gear) return; const q = A.quiet(), d = A.day(), wx = A.wx(), wet = WET.includes(wx.cond), wm = wet ? 1.5 : 1, on = new Set(SLOTS.map(s => act(s)).filter(Boolean));
    for (const g of S.gear) {
      const it = I(g.id); if (!it || !on.has(g) || !gi(g).life) continue;
      const sl = gi(g).slot; if ((sl === 'coat' && wx.feels > 8) || (sl === 'rain' && !wet) || (sl === 'hat' && wx.feels < 28)) continue;
      const was = g.c; g.c = Math.max(0, r1(g.c - 100 / gi(g).life * (['outfit', 'shoes', 'coat', 'rain'].includes(gi(g).slot) ? wm : 1)));
      if (TECH.has(gi(g).slot) && g.c > 0 && g.c < 40 && R() < 0.025) g.c = 0;
      if (gi(g).slot === 'phone' && g.c > 0 && R() < 0.004 * (1 - pas('tough'))) { g.c = R() < 0.35 ? 0 : Math.max(0, g.c - 45); A.log(g.c ? 'Your phone slips out of your hand and hits the ground. The screen spiders, but it still works.' : 'Your phone slips out of your hand and does not wake up again.', 'bad'); }
      if (g.c <= 0 && was > 0 && !q) { const t = TECH.has(gi(g).slot) ? `Your ${gname(g).toLowerCase()} has stopped working.` : `Your ${gname(g).toLowerCase()} has finally worn out.`; A.log(t, 'bad'); A.note(t); }
      else if (g.c < 25 && was >= 25 && !q) A.log(`Your ${gname(g).toLowerCase()} is wearing thin.`, 'sys');
    }
    if (q) {
      if (S.money > 0) { S.sup.meals = Math.max(S.sup.meals, 3); S.sup.wash = Math.max(S.sup.wash, 4); S.lw = d; S.sim = Math.max(S.sim, d + 10); S.net = Math.max(S.net, d + 10); }
      for (const sl of ['outfit', 'shoes', 'phone', 'laptop', 'coat']) {
        if (act(sl) || (sl === 'phone' && S.age < 12) || ((sl === 'laptop' || sl === 'coat') && !has(sl))) continue;
        const c = Object.entries(D.items).filter(([, it]) => it.gear?.slot === sl && it.price && !it.lim).sort((a, b) => a[1].price - b[1].price)[0];
        if (c && S.money >= base(c[1]) * 1.2) { S.money = r1(S.money - base(c[1])); S.gear = S.gear.filter(g => !(gi(g).slot === sl && g.c <= 0)); add(c[0]); A.say(`Your old ${SLOTN[sl]} gave out, so you bought ${anI(c[0])}.`, 'sys', 1); }
      }
      npcDay(); return;
    }
    S.mood = A.cl(S.mood + pas('mood'));
    const hy = d - S.lw; if (hy >= 3) { S.mood = A.cl(S.mood - 1.5); S.stress = A.cl(S.stress + 1); if (hy >= 5) S.rep = A.cl(S.rep - 1); }
    warn('hy3', hy >= 3, 'You are starting to feel grimy, and you suspect other people have noticed.');
    warn('hy6', hy >= 6, 'It has been far too long since you properly washed.', 'bad');
    if (!act('outfit')) { S.mood = A.cl(S.mood - 1); S.rep = A.cl(S.rep - 0.5); warn('cl0', 1, 'You have nothing decent to wear, and it shows.', 'bad'); } else S.fl.sw.cl0 = 0;
    const left = k => S[k] - d + 1;
    warn('sim2', S.age >= 12 && !(S.fl.withFamily && S.age < 18) && left('sim') > 0 && left('sim') <= 2, 'Your phone plan is nearly out. Top it up at the electronics shop.');
    warn('sim0', S.age >= 12 && !simOK(), 'Your phone plan has lapsed: no calls, no texts.', 'bad');
    warn('net2', !S.fl.withFamily && left('net') > 0 && left('net') <= 2, 'Your home internet runs out in a day or two.');
    warn('net0', !netOK(), 'The home internet has been cut off. Libraries and cafés have wifi.', 'bad');
    warn('meal', !fam() && (S.sup.meals || 0) <= 1, 'The cupboards are nearly bare.');
    warn('wash', !fam() && (S.sup.wash || 0) <= 1, 'You are almost out of soap and toothpaste.');
    npcDay();
  }

  const ex = { add, startKit, migrate, daily, npcInv, belongings, giftable, giveOpts, askOpts, bdayGifts, shopHTML, shopOpts, sellHTML, sellOpts, invHTML, invOpts, homeActs, cookOpt, washOpts, lapOpt, phoneW, shield, sleepMul, dress, social, fitMul, msgB, load };
  return Object.fromEntries(Object.entries(ex).map(([k, f]) => [k, sync(f)]));
}
