export const MON = ['January','February','March','April','May','June','July','August','September','October','November','December'];
export const WDN = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
export const DIM = [31,28,31,30,31,30,31,31,30,31,30,31];
export const CUM = DIM.map((_, i) => DIM.slice(0, i).reduce((a, b) => a + b, 0));
const set = s => new Set(s.split('|'));
const SOUTH = set('Australia|New Zealand|South Africa|Argentina|Chile|Uruguay|Lesotho|Eswatini|Paraguay|Botswana|Namibia');
const TROP_S = set('Brazil|Peru|Bolivia|Angola|Zambia|Malawi|Mozambique|Madagascar|Tanzania|Fiji|Papua New Guinea|Timor-Leste|Mauritius|Seychelles|Rwanda|Burundi|Zimbabwe|Samoa|Tonga|Vanuatu');
const TROP_N = set('India|Bangladesh|Sri Lanka|Thailand|Vietnam|Cambodia|Laos|Myanmar|Malaysia|Singapore|Indonesia|Philippines|Brunei|Nigeria|Ghana|Kenya|Uganda|Ethiopia|Somalia|Congo (DR)|Congo (Republic)|Colombia|Venezuela|Ecuador|Panama|Costa Rica|Nicaragua|Honduras|Guatemala|El Salvador|Cuba|Jamaica|Haiti|Dominican Republic|Maldives|Senegal|Mali|Niger|Chad|Sudan|South Sudan|Cameroon|Gabon|Benin|Togo|Côte d\'Ivoire|Liberia|Sierra Leone|Guinea|Burkina Faso|Gambia|Nepal|Trinidad and Tobago|Barbados|Bahamas|Belize|Guyana|Suriname');
const HOT = set('Egypt|Saudi Arabia|United Arab Emirates|Qatar|Kuwait|Bahrain|Oman|Libya|Algeria|Iraq|Jordan|Yemen|Djibouti|Mauritania|Tunisia|Pakistan|Iran|Syria|Israel|Lebanon|Turkmenistan|Uzbekistan');
export const climate = c => TROP_S.has(c) ? 'trop-s' : TROP_N.has(c) ? 'trop-n' : SOUTH.has(c) ? 'south' : 'north';
export const isArid = c => HOT.has(c);
export const isHot = c => HOT.has(c) || TROP_N.has(c) || TROP_S.has(c);
const NORTH_S = ['Winter','Winter','Spring','Spring','Spring','Summer','Summer','Summer','Autumn','Autumn','Autumn','Winter'];
const FLIP = { Winter: 'Summer', Summer: 'Winter', Spring: 'Autumn', Autumn: 'Spring' };
export function seasonOf(m, cl) {
  if (cl === 'trop-n') return m >= 4 && m <= 9 ? 'Wet season' : 'Dry season';
  if (cl === 'trop-s') return m >= 10 || m <= 3 ? 'Wet season' : 'Dry season';
  return cl === 'south' ? FLIP[NORTH_S[m]] : NORTH_S[m];
}
export const SEASON_TEXT = { Winter: 'Short, cold days and long nights.', Spring: 'Things thaw, bloom and start over.', Summer: 'Long, warm days.', Autumn: 'Cooling air and falling leaves.', 'Wet season': 'Heavy rain and humid air.', 'Dry season': 'Dry, bright days.' };
const W = { Winter: { clear: 3, rain: 3, fog: 3, windy: 2, snow: 4 }, Spring: { clear: 4, rain: 4, fog: 2, windy: 3 }, Summer: { clear: 6, rain: 2, fog: .5, windy: 1, heatwave: 2 }, Autumn: { clear: 3, rain: 4, fog: 3, windy: 4 }, 'Wet season': { clear: 2, rain: 8, fog: 1, windy: 2 }, 'Dry season': { clear: 8, rain: .5, windy: 2, heatwave: 1.5 } };
export function wxPick(names, season, country, r = Math.random()) {
  const hot = isHot(country) || HOT.has(country), w = names.map(n => { let v = (W[season] || {})[n] ?? 0.2; if (n === 'snow' && (hot || climate(country) !== 'north')) v = 0; if (hot && n === 'rain') v *= .15; if (hot && n === 'heatwave') v *= 2.5; return v; });
  let t = r * w.reduce((a, b) => a + b, 0); for (let i = 0; i < w.length; i++) { t -= w[i]; if (t <= 0) return i; } return 0;
}
export function seasonFx(season, wxName) { let mood = 0, stress = 0, energy = 0; if (season === 'Winter') { mood -= .25; stress += .1; } if (season === 'Summer' || season === 'Spring') mood += .2; if (wxName === 'snow') stress += .3; if (wxName === 'heatwave') { energy -= 2; mood -= .3; } return { mood, stress, energy }; }
export const isLeap = y => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
export const dimOf = y => isLeap(y) ? [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] : DIM;
export const cumOf = y => { const d = dimOf(y); return d.map((_, i) => d.slice(0, i).reduce((a, b) => a + b, 0)); };
const yl = y => isLeap(y) ? 366 : 365, dBefore = y => 365 * y + Math.floor((y - 1) / 4) - Math.floor((y - 1) / 100) + Math.floor((y - 1) / 400);
export const dateOf = (day, c0, y0) => { let n = c0 + day - 1, y = y0; while (n >= yl(y)) { n -= yl(y); y++; } const cu = cumOf(y); let m = 11; while (cu[m] > n) m--; return { m, d: n - cu[m] + 1, doy: n, y, wd: (((day - 1) % 7) + 7) % 7 }; };
export const wdOf = (y, doy, c0, y0) => ((((dBefore(y) - dBefore(y0)) + doy - c0) % 7) + 7) % 7;
const nth = (y, m, wd, n, c0, y0) => { const dm = dimOf(y), cu = cumOf(y); let k = 0; for (let d = 0; d < dm[m]; d++) if (wdOf(y, cu[m] + d, c0, y0) === wd && ++k === n) return cu[m] + d; };
export function holidays(y, c0, y0, country) {
  const h = {}, cu = cumOf(y), add = (m, d, n, t, f) => h[cu[m] + d - 1] = { n, t, f };
  add(0, 1, "New Year's Day", 'A fresh year, and everyone is making promises.'); add(1, 14, "Valentine's Day", 'Couples are out, and flowers are on sale.');
  if (isLeap(y)) add(1, 29, 'Leap Day', 'A day that only comes around once every four years.');
  add(3, 1, "April Fools' Day", 'People are trying to fool each other all day.'); add(4, 1, 'Labour Day', 'Workers get a day to breathe.');
  add(9, 31, 'Halloween', 'Costumes and sweets everywhere.'); add(11, 24, 'Christmas Eve', 'The streets feel warm and busy.', 1);
  add(11, 25, 'Christmas Day', 'Houses are lit up and full.', 1); add(11, 31, "New Year's Eve", 'The whole world is waiting for midnight.');
  let d = nth(y, 4, 6, 2, c0, y0); if (d != null) h[d] = { n: "Mother's Day", t: 'Phone lines to mothers are busy.', f: 1 };
  d = nth(y, 5, 6, 3, c0, y0); if (d != null) h[d] = { n: "Father's Day", t: 'A day for dads and bad ties.', f: 1 };
  if (country === 'United States') { d = nth(y, 10, 3, 4, c0, y0); if (d != null) h[d] = { n: 'Thanksgiving', t: 'The smell of roast fills the neighborhood.', f: 1 }; }
  return h;
}
export const bdayMD = p => { let h = 7; for (const c of String(p.id ?? p.name ?? '')) h = (h * 31 + c.charCodeAt(0)) % 365; let m = 11; while (CUM[m] > h) m--; return { m, d: h - CUM[m] + 1 }; };
export const bdayIn = (S, y) => ({ m: S.bdm, d: S.bdm === 1 && S.bdd === 29 && !isLeap(y) ? 28 : S.bdd });
export const isMyBday = (S, dt) => { const b = bdayIn(S, dt.y); return dt.m === b.m && dt.d === b.d; };
export function initCal(S) {
  const day = Math.floor(S.t / 1440) + 1; let ch = 0;
  if (S.cal0 == null) { S.cal0 = Math.floor(Math.random() * 365); ch = 1; }
  if (S.wseed == null) { S.wseed = Math.floor(Math.random() * 2147483647); ch = 1; }
  if (S.yr0 == null) { S.yr0 = new Date().getFullYear(); ch = 1; }
  if (S.bdm == null) {
    if (day <= 1) { if (Math.random() < 1 / 1461) { S.bdm = 1; S.bdd = 29; } else { const h = Math.floor(Math.random() * 365); let m = 11; while (CUM[m] > h) m--; S.bdm = m; S.bdd = h - CUM[m] + 1; } S.agedY = S.yr0 - 1; }
    else { const b = dateOf(365, S.cal0, S.yr0), last = Math.floor((day - 1) / 365) * 365; S.bdm = b.m; S.bdd = b.d; S.agedY = last >= 365 ? dateOf(last, S.cal0, S.yr0).y : S.yr0 - 1; }
    ch = 1;
  }
  return ch;
}
