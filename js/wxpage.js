import { initCal, dateOf, MON, WDN } from './calendar.js';
import { wxAt, wxLine, fmtT, forecastDay, COND, tempWord } from './weather.js';
const KEY = 'irl-text-v1', root = document.getElementById('wx'), raw = localStorage.getItem(KEY);
if (!raw) root.innerHTML = '<section class="hero"><h1>No <em>weather</em> yet</h1><p>Start a life to see the sky above it.</p><a class="btn p" href="new.html">Begin a new life</a></section>';
else {
  const S = JSON.parse(raw); if (initCal(S)) localStorage.setItem(KEY, JSON.stringify(S));
  const c = S.tk.country, day = Math.floor(S.t / 1440) + 1, hr = (S.t / 60) % 24, w = wxAt(S, day, hr), a = w.d, T = (v, u) => fmtT(v, c, u), hm = h => String(Math.floor(h)).padStart(2, '0') + ':' + String(Math.floor(h % 1 * 60)).padStart(2, '0');
  const uvl = v => v < 3 ? 'Low' : v < 6 ? 'Moderate' : v < 8 ? 'High' : v < 11 ? 'Very high' : 'Extreme', hrs = Array.from({ length: 24 }, (_, h) => wxAt(S, day, h)), lo = Math.min(...hrs.map(x => x.temp)), hi = Math.max(...hrs.map(x => x.temp));
  const fc = Array.from({ length: 7 }, (_, i) => { const d = day + i + 1, f = forecastDay(S, d, i + 1), dt = dateOf(d, S.cal0, S.yr0); return `<div><small>${i ? WDN[dt.wd].slice(0, 3) : 'Tomorrow'} ${dt.d} ${MON[dt.m].slice(0, 3)}</small><div class="ic">${f.icon}</div><b>${T(f.hi)} / ${T(f.lo)}</b><small>${f.cond}</small><small>${f.pop}% precip.</small></div>`; }).join('');
  root.innerHTML = `<section class="hero" style="padding-top:8px"><h1>The <em>weather</em> in ${S.tk.city}</h1></section>
<div class="wxnow ${w.tone}"><div class="big"><span>${w.icon}</span><b>${T(w.temp, 1)}</b><div><b style="font-size:22px;display:block;text-transform:capitalize">${w.cond}</b>Feels like ${T(w.feels, 1)}. Today ${T(a.mean + a.rng / 2)} / ${T(a.mean - a.rng / 2)}</div></div><p>${wxLine(w)}</p>
<div class="stats"><div>Wind<b>${Math.round(w.wind)} km/h ${w.dir}</b></div><div>Humidity<b>${Math.round(w.hum)}%</b></div><div>Pressure<b>${Math.round(w.pres)} hPa</b></div><div>UV index<b>${w.uv.toFixed(0)} · ${uvl(w.uv)}</b></div><div>Visibility<b>${w.vis} km</b></div><div>Sunrise<b>${hm(w.rise)}</b></div><div>Sunset<b>${hm(w.set)}</b></div><div>Daylight<b>${Math.floor(a.dl)} h ${Math.round(a.dl % 1 * 60)} m</b></div></div></div>
<h2>Today, hour by hour</h2><div class="hours">${hrs.map((x, h) => `<div class="${h === Math.floor(hr) ? 'nowh' : ''}" title="${x.cond}">${h % 3 === 0 ? x.icon : ''}<span>${T(x.temp)}</span><i style="height:${20 + (x.temp - lo) / Math.max(1, hi - lo) * 70}px"></i><span>${h % 3 === 0 ? String(h).padStart(2, '0') : ''}</span></div>`).join('')}</div>
<h2>Next 7 days</h2><div class="fc">${fc}</div>
<p class="meta" style="margin-top:22px">Forecasts are good for the next two days and get less certain after that, so a far-off forecast can be wrong. Temperatures show in ${['United States', 'Liberia', 'Bahamas', 'Belize', 'Palau'].includes(c) ? '°F' : '°C'} for your country.</p>`;
}
