import { MON, WDN, climate, seasonOf, SEASON_TEXT, dateOf, wdOf, holidays, bdayMD, bdayIn, initCal, dimOf, cumOf, isLeap } from './calendar.js';
const KEY = 'irl-text-v1', root = document.getElementById('cal'), raw = localStorage.getItem(KEY);
if (!raw) root.innerHTML = '<section class="hero"><h1>No <em>calendar</em> yet</h1><p>Start a life and your calendar begins.</p><a class="btn p" href="new.html">Begin a new life</a></section>';
else {
  const S = JSON.parse(raw); if (initCal(S)) localStorage.setItem(KEY, JSON.stringify(S));
  const day = Math.floor(S.t / 1440) + 1, c0 = S.cal0, y0 = S.yr0, now = dateOf(day, c0, y0), cl = climate(S.tk.country), ppl = [...(S.fam || []), ...(S.fr || [])].filter(p => p.name && p.alive !== false);
  let vy = now.y, vm = now.m;
  const ev = y => { const e = {}, cu = cumOf(y), add = (doy, o) => (e[doy] ||= []).push(o), h = holidays(y, c0, y0, S.tk.country); for (const k in h) add(+k, { c: 'h', n: h[k].n }); const b = bdayIn(S, y); add(cu[b.m] + b.d - 1, { c: 'me', n: 'Your birthday' }); for (const p of ppl) { const x = bdayMD(p); add(cu[x.m] + x.d - 1, { c: 'b', n: p.name + "'s birthday" }); } return e; };
  const sn = m => seasonOf(m, cl), cls = s => s.split(' ')[0].toLowerCase();
  function draw() {
    const e = ev(vy), dm = dimOf(vy), cu = cumOf(vy), first = wdOf(vy, cu[vm], c0, y0), s = sn(now.m);
    let cells = '<i></i>'.repeat(first);
    for (let d = 1; d <= dm[vm]; d++) { const doy = cu[vm] + d - 1, es = e[doy] || [], today = vy === now.y && doy === now.doy; cells += `<b class="${today ? 'today' : ''}" title="${es.map(x => x.n).join(', ')}">${d}<span>${es.map(x => `<u class="${x.c}"></u>`).join('')}</span></b>`; }
    const up = []; for (let k = 0; k < 60; k++) { const dd = dateOf(day + k, c0, y0), es = ev(dd.y)[dd.doy] || []; es.forEach(x => up.push([k, dd, x])); if (k && sn(dd.m) !== sn(dateOf(day + k - 1, c0, y0).m)) up.push([k, dd, { c: 's', n: sn(dd.m) + ' begins' }]); }
    root.innerHTML = `<section class="hero" style="padding-top:8px"><div class="meta">${WDN[now.wd]}</div><h1>${now.d} <em>${MON[now.m]}</em> ${now.y}</h1><p><span class="pill ${cls(s)}">${s}</span> ${SEASON_TEXT[s]} Age ${S.age}. ${S.tk.city}, ${S.tk.country}.</p></section>
<div class="calbox"><div class="calnav"><button id="pv" aria-label="Previous month">‹</button><h2>${MON[vm]} ${vy}${isLeap(vy) ? ' <span class="pill summer">Leap year</span>' : ''}</h2><button id="nx" aria-label="Next month">›</button><button id="td">Today</button></div>
<div class="calgrid">${WDN.map(w => `<em>${w.slice(0, 3)}</em>`).join('')}${cells}</div>
<div class="legend"><span><u class="h"></u>Holiday</span><span><u class="me"></u>Your birthday</span><span><u class="b"></u>Family & friends</span></div></div>
<h2>Year at a glance</h2><div class="year">${MON.map((m, i) => `<button data-m="${i}" class="pill ${cls(sn(i))} ${i === vm ? 'sel' : ''}">${m.slice(0, 3)}<small>${sn(i)}</small></button>`).join('')}</div>
<h2>Coming up (60 days)</h2><div class="up">${up.length ? up.map(([k, dd, x]) => `<div class="tile"><b>${k ? (k === 1 ? 'Tomorrow' : 'In ' + k + ' days') : 'Today'}</b> · ${dd.d} ${MON[dd.m].slice(0, 3)}<p><u class="${x.c}"></u> ${x.n}</p></div>`).join('') : '<p class="meta">Nothing in the next 60 days.</p>'}</div>
<p class="meta" style="margin-top:22px">Leap years follow the real rule (every 4 years, except century years not divisible by 400), adding 29 February. A birthday on 29 February is celebrated on 28 February in other years. Seasons follow your country's hemisphere, and tropical countries have wet and dry seasons.</p>`;
    pv.onclick = () => { vm--; if (vm < 0) { vm = 11; vy--; } draw(); }; nx.onclick = () => { vm++; if (vm > 11) { vm = 0; vy++; } draw(); }; td.onclick = () => { vy = now.y; vm = now.m; draw(); };
    root.querySelectorAll('.year button').forEach(b => b.onclick = () => { vm = +b.dataset.m; draw(); });
  }
  draw();
}
