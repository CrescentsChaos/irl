import { climate, isArid, seasonOf, dateOf, isLeap } from './calendar.js';
const set = s => new Set(s.split('|'));
const COLD = set('Russia|Canada|Finland|Norway|Sweden|Iceland|Mongolia|Kazakhstan|Belarus|Estonia|Latvia|Lithuania|Greenland');
const MED = set('Spain|Portugal|Italy|Greece|Cyprus|Malta|Turkey|Morocco|Albania|Croatia|Montenegro|Lebanon');
const OCEAN = set('United Kingdom|Ireland|Netherlands|Belgium|Denmark|New Zealand|France|Luxembourg|Chile');
const FAHR = set('United States|Liberia|Bahamas|Belize|Palau');
export const fmtT = (c, country, unit) => { const f = FAHR.has(country); return Math.round(f ? c * 9 / 5 + 32 : c) + (unit ? (f ? '°F' : '°C') : '°'); };
export function profile(country) {
  const cl = climate(country), trop = cl.startsWith('trop'), arid = isArid(country), cold = COLD.has(country), med = MED.has(country), ocean = OCEAN.has(country);
  const o = trop ? { mean: 27, amp: 1.8, sd: 1.4, lat: cl === 'trop-n' ? 10 : -10 } : arid ? { mean: 25, amp: 10, sd: 3, lat: 30 } : cold ? { mean: 2, amp: 13, sd: 4.2, lat: 60 } : med ? { mean: 17, amp: 8, sd: 2.8, lat: 39 } : ocean ? { mean: 10.5, amp: 6.5, sd: 2.8, lat: cl === 'south' ? -42 : 52 } : cl === 'south' ? { mean: 15, amp: 6.5, sd: 3, lat: -34 } : { mean: 10, amp: 10, sd: 3.4, lat: 47 };
  return { ...o, cl, trop, arid, cold, med, hot: arid ? 42 : trop ? 35.5 : med ? 36 : cold ? 27 : 32 };
}
const h32 = (a, b, c = 0) => { let x = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263) + Math.imul(c | 0, 1274126177)) | 0; x = Math.imul(x ^ (x >>> 15), 2246822519); x = Math.imul(x ^ (x >>> 13), 3266489917); x ^= x >>> 16; return (x >>> 0) / 4294967296; };
const sm = t => t * t * (3 - 2 * t), vn = (sd, t, salt, per) => { const x = t / per, i = Math.floor(x), f = sm(x - i); return h32(sd, i, salt) * (1 - f) + h32(sd, i + 1, salt) * f; };
const nz = (sd, t, salt) => .6 * vn(sd, t, salt, 5) + .4 * vn(sd, t, salt + 101, 17), u = n => 1 / (1 + Math.exp(-(n - .5) * 11)), clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const PP = { Winter: .36, Spring: .34, Summer: .2, Autumn: .38, 'Wet season': .62, 'Dry season': .05 };
const RNG = { clear: 11, 'partly cloudy': 9, overcast: 6, fog: 5, haze: 9, frost: 12, 'cold snap': 8, heatwave: 12, windy: 8, sandstorm: 10, drizzle: 4, rain: 4, 'heavy rain': 3, thunderstorm: 6, hail: 6, sleet: 3, snow: 4, 'heavy snow': 3, blizzard: 3, 'tropical storm': 3 };
export const COND = { clear: ['☀️', 'sun'], 'clear night': ['🌙', 'sun'], 'partly cloudy': ['⛅', 'cloud'], overcast: ['☁️', 'cloud'], fog: ['🌫️', 'fog'], haze: ['🌫️', 'fog'], drizzle: ['🌦️', 'rain'], rain: ['🌧️', 'rain'], 'heavy rain': ['🌧️', 'rain'], thunderstorm: ['⛈️', 'storm'], hail: ['🌨️', 'storm'], sleet: ['🌨️', 'snow'], snow: ['❄️', 'snow'], 'heavy snow': ['❄️', 'snow'], blizzard: ['🌨️', 'storm'], windy: ['💨', 'wind'], heatwave: ['🔥', 'heat'], frost: ['🥶', 'cold'], 'cold snap': ['🥶', 'cold'], sandstorm: ['🏜️', 'wind'], 'tropical storm': ['🌀', 'storm'] };
export const SEVERE = set('blizzard|tropical storm|hail|heatwave|cold snap|sandstorm|thunderstorm|heavy snow');
export const DIRS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
const cache = new Map();
export function dayWx(S, day) {
  day = Math.max(1, day); const key = [S.wseed, S.cal0, S.yr0, S.tk.country, day].join('|'); if (cache.has(key)) return cache.get(key);
  const dt = dateOf(day, S.cal0, S.yr0), pr = profile(S.tk.country), sd = S.wseed, yl = isLeap(dt.y) ? 366 : 365, ssn = seasonOf(dt.m, pr.cl), south = pr.cl === 'south' || pr.cl === 'trop-s';
  const base = pr.mean + (south ? 1 : -1) * pr.amp * Math.cos(2 * Math.PI * (dt.doy - 20) / yl), an = (nz(sd, day, 1) - .5) * 6.5 * pr.sd; let mean = base + an;
  const wet = u(nz(sd, day, 2)), cloud = u(nz(sd, day, 3)) * (pr.arid ? .55 : 1), wind = u(nz(sd, day, 4)), r = h32(sd, day, 5), r2 = h32(sd, day, 6), r3 = h32(sd, day, 7), sev = h32(sd, Math.floor(day / 3), 8);
  let pp = PP[ssn] ?? .3; if (pr.arid) pp = Math.max(.02, pp * .12); if (pr.cold && ssn === 'Winter') pp = .4;
  const prec = wet < pp, z = prec ? (pp - wet) / pp : 0; let kind;
  if (prec) {
    if (pr.trop && ssn === 'Wet season' && sev < .03) kind = 'tropical storm';
    else if (mean < .5) kind = z > .8 && wind > .55 ? 'blizzard' : z > .55 ? 'heavy snow' : 'snow';
    else if (mean < 3 && r < .7) kind = 'sleet';
    else if (z > .5 && mean > 14 && ['Summer', 'Wet season', 'Spring'].includes(ssn) && r < (ssn === 'Wet season' ? .55 : .4)) kind = r2 < .08 && !pr.trop && mean < 28 ? 'hail' : 'thunderstorm';
    else kind = z < .35 ? 'drizzle' : z < .86 ? 'rain' : 'heavy rain';
    if (ssn === 'Wet season' && kind === 'rain' && z > .45) kind = 'heavy rain';
    mean -= kind === 'drizzle' ? .5 : 1.5;
  } else if (mean + 5 > pr.hot && cloud < .6) kind = 'heatwave';
  else if (an < -1.3 * pr.sd && mean < 2) kind = 'cold snap';
  else if (mean < 2.5 && cloud < .45) kind = 'frost';
  else if (pr.arid && wind > .88 && wet > .5) kind = 'sandstorm';
  else if (wind > .96) kind = 'windy';
  else if (!pr.arid && cloud > .45 && wind < .4 && r < (mean < 16 ? .3 : .08)) kind = 'fog';
  else if ((pr.arid || (pr.trop && ssn === 'Dry season')) && r < .12) kind = 'haze';
  else kind = cloud < .32 ? 'clear' : cloud < .62 ? 'partly cloudy' : 'overcast';
  const rng = (RNG[kind] + (pr.arid ? 4 : 0)) * (.9 + r3 * .3); let pt = null;
  if (prec) pt = kind === 'tropical storm' ? { st: 0, du: 24 } : kind === 'thunderstorm' || kind === 'hail' ? { st: 13 + r2 * 7, du: 1.5 + r3 * 2.5 } : kind === 'drizzle' ? { st: r * 14, du: 5 + r3 * 6 } : kind === 'heavy rain' ? { st: 1 + r * 13, du: 2 + r3 * 4 } : kind === 'blizzard' ? { st: r * 10, du: 8 + r3 * 10 } : { st: r * 14, du: 3 + r3 * 7 };
  const ws = 4 + wind * 26 + ({ 'tropical storm': 70 + r * 35, blizzard: 50 + r * 25, windy: 38 + r * 20, sandstorm: 44 + r * 25, thunderstorm: 14, hail: 10, 'heavy rain': 8 }[kind] || 0);
  const decl = 23.44 * Math.sin(2 * Math.PI * (dt.doy - 80) / yl), rad = Math.PI / 180, cosw = clamp(-Math.tan(pr.lat * rad) * Math.tan(decl * rad), -1, 1), dl = 24 * Math.acos(cosw) / Math.PI, elev = 90 - Math.abs(pr.lat - decl);
  const uv0 = Math.max(0, 12 * Math.pow(Math.sin(elev * rad), 1.2)) * ({ clear: 1, frost: 1, heatwave: 1.05, 'partly cloudy': .8 }[kind] ?? .35);
  const pop = prec || kind === 'tropical storm' ? Math.round(55 + z * 40) : Math.round(3 + clamp(1 - (wet - pp) / (1 - pp), 0, 1) ** 2 * 45);
  const o = { day, dt, ssn, kind, mean, rng, pt, ws, dir: DIRS[Math.floor(u(nz(sd, day, 9)) * 8) % 8], cloud, wet, r, pop, uv: uv0, rise: 12 - dl / 2, set: 12 + dl / 2, dl, lat: pr.lat,
    hum: clamp(42 + cloud * 22 + (prec ? 24 : 0) + (pr.trop ? 18 : 0) - (pr.arid ? 28 : 0) + (kind === 'fog' ? 30 : 0), 12, 100), pres: 1013 + (.5 - wet) * 16 - (prec ? z * 9 : 0) - (kind === 'tropical storm' ? 30 : 0) };
  if (cache.size > 3000) cache.clear(); cache.set(key, o); return o;
}
const feelsLike = (T, v, h) => { if (T >= 26) { const e = h / 100 * 6.105 * Math.exp(17.27 * T / (237.7 + T)); return T + .33 * e - 4; } if (T <= 10 && v >= 5) { const p = Math.pow(v, .16); return 13.12 + .6215 * T - 11.37 * p + .3965 * T * p; } return T; };
export function wxAt(S, day, hour) {
  const a = dayWx(S, day), b = dayWx(S, day + 1), f = hour / 24, base = a.mean + (b.mean - a.mean) * f, rng = a.rng + (b.rng - a.rng) * f;
  let T = base + rng / 2 * Math.cos(2 * Math.PI * (hour - 15) / 24), cond = a.kind; const night = hour < a.rise || hour > a.set, k = a.kind, on = a.pt && hour >= a.pt.st && hour <= a.pt.st + a.pt.du;
  if (a.pt) { if (k !== 'tropical storm' && !on) cond = hour < a.pt.st ? 'overcast' : 'partly cloudy'; if (on) T -= 1.2; }
  else if (k === 'fog') cond = hour < 9 + a.r * 2 ? 'fog' : a.cloud > .6 ? 'overcast' : 'partly cloudy';
  else if (k === 'heatwave') cond = hour >= 10 && hour <= 20 ? 'heatwave' : 'clear';
  else if (k === 'frost') cond = hour < 10 || hour > 19 ? 'frost' : 'clear';
  if (night && cond === 'clear') cond = 'clear night';
  const hum = on ? Math.max(a.hum, 90) : clamp(a.hum - (T - base) * 1.2, 10, 100), ws = a.ws * (a.pt && !on ? .7 : 1), ic = COND[cond] || COND.clear;
  const vis = { fog: .3, blizzard: .2, sandstorm: .5, 'heavy rain': 3, 'tropical storm': 1.5, haze: 4, thunderstorm: 4, 'heavy snow': 1, snow: 3, hail: 5 }[cond] ?? 10;
  const sun = night ? 0 : a.uv * Math.max(0, Math.sin(Math.PI * (hour - a.rise) / (a.set - a.rise)));
  return { day, hour, cond, icon: ic[0], tone: ic[1], temp: T, feels: feelsLike(T, ws, hum), wind: ws, dir: a.dir, hum, pres: a.pres, uv: sun, vis, night, rise: a.rise, set: a.set, d: a };
}
const LINES = {
  clear: ['The sky is wide and pale.', 'Not a cloud anywhere, and the light is sharp.', 'The sun sits in a clean blue sky.'], 'clear night': ['The sky is clear and the stars are out.', 'The night is still and open.'],
  'partly cloudy': ['Clouds drift past, breaking the sunlight into patches.', 'Light and shadow move across the street.'], overcast: ['A flat grey ceiling of cloud hangs overhead.', 'The sky is heavy and colorless.'],
  fog: ['Fog sits low over the town and swallows the distance.', 'Everything beyond a few streets has disappeared into white.'], haze: ['A dull haze blurs the horizon.', 'The air looks thick and dusty.'],
  drizzle: ['A fine drizzle settles on your hair and sleeves.', 'It is not quite rain, but everything is damp.'], rain: ['Rain ticks against everything.', 'Steady rain runs down the gutters.'],
  'heavy rain': ['Rain hammers down and the gutters overflow.', 'The rain is relentless, and the street is turning to a stream.'], thunderstorm: ['Thunder rolls overhead and the rain comes in sheets.', 'Lightning flickers over the rooftops.'],
  hail: ['Hail rattles off roofs and cars like thrown gravel.', 'Ice stones bounce off the pavement.'], sleet: ['Sleet stings your face, half rain and half ice.', 'The ground is slick with freezing slush.'],
  snow: ['Snow muffles the street.', 'Flakes drift down slowly and settle on everything.'], 'heavy snow': ['Thick snow falls fast and buries the street.', 'Snow piles up on every ledge.'],
  blizzard: ['A blizzard howls and you can barely see across the street.', 'Wind drives snow sideways in white sheets.'], windy: ['Wind pushes loose trash down the road.', 'Gusts tug at your clothes and bang shutters.'],
  heatwave: ['The heat presses down on everything.', 'The air shimmers above the pavement.'], frost: ['Frost glitters on every surface.', 'The ground is stiff and white with frost.'],
  'cold snap': ['A hard cold has settled over the town.', 'Every breath turns to smoke.'], sandstorm: ['A wall of sand blows through, and everything tastes of grit.', 'Dust fills the air and hides the sun.'], 'tropical storm': ['A tropical storm lashes the town with wind and rain.', 'Palms bend, and the sky is the color of slate.']
};
export const tempWord = f => f <= -15 ? 'The cold is brutal.' : f <= -5 ? 'It is bitterly cold.' : f <= 3 ? 'It is cold enough to see your breath.' : f <= 10 ? 'It is chilly.' : f <= 17 ? 'The air is cool.' : f <= 24 ? 'It is pleasantly mild.' : f <= 29 ? 'It is warm.' : f <= 34 ? 'It is hot.' : f <= 40 ? 'The heat is heavy.' : 'The heat is dangerous.';
export const wxLine = w => { const L = LINES[w.cond] || LINES.clear; return L[Math.floor(h32(w.d.day, Math.floor(w.hour / 6), 3) * L.length)] + ' ' + tempWord(w.feels); };
export function exposure(w) {
  const f = w.feels, c = w.cond; let h = 0, m = 0, e = 0, t = '', wet = ['drizzle', 'rain', 'heavy rain', 'thunderstorm', 'tropical storm', 'hail', 'sleet'].includes(c);
  if (f <= -20) { h = -1.2; e = -3; t = 'The cold hurts your face and fingers.'; } else if (f <= -8) { h = -.4; e = -1.5; t = 'The cold gets under your clothes.'; }
  if (f >= 40) { h = -1.2; e = -3; t = 'The heat makes you dizzy.'; } else if (f >= 34) { h = -.3; e = -1.5; t = 'Sweat runs down your back.'; }
  if (wet && f < 14) { m -= .8; e -= .8; t = t || 'You get wet and cold.'; } else if (wet) { m -= .4; t = t || 'You get rained on.'; }
  if (c === 'blizzard' || c === 'tropical storm') { h -= .8; e -= 2; t = 'The wind nearly knocks you over.'; } if (c === 'sandstorm') { h -= .5; t = 'Sand stings your skin and eyes.'; }
  return h || m || e ? { h, m, e, t } : null;
}
export function wxFx(w) {
  const f = w.feels, c = w.cond; let mood = 0, stress = 0, energy = 0, health = 0;
  if ((c === 'clear' || c === 'partly cloudy') && f >= 15 && f <= 27) mood += .35;
  if (f >= 33) { energy -= 2; mood -= .3; } if (f >= 38) { health -= .6; energy -= 2; } if (f >= 44) health -= 1.5;
  if (f <= -5) { energy -= 1.5; mood -= .3; } if (f <= -15) { health -= .8; energy -= 2; } if (f <= -28) health -= 2;
  if (c === 'drizzle' || c === 'rain') mood -= .15; if (c === 'heavy rain') { mood -= .3; stress += .2; } if (c === 'thunderstorm') { stress += .4; mood -= .3; } if (c === 'hail') stress += .5;
  if (c === 'blizzard' || c === 'tropical storm') { stress += 1; mood -= .5; energy -= 1; } if (c === 'fog') mood -= .1; if (c === 'sandstorm') { health -= .4; stress += .5; }
  return { mood, stress, energy, health };
}
const cap = s => s[0].toUpperCase() + s.slice(1), hh = h => String(Math.floor(h % 24)).padStart(2, '0') + ':00';
export const wxSummary = (S, a) => `${cap(a.kind)} today, high ${fmtT(a.mean + a.rng / 2, S.tk.country)}, low ${fmtT(a.mean - a.rng / 2, S.tk.country)}${a.pt && a.pt.du < 24 ? ', from about ' + hh(a.pt.st) : ''}.`;
export function forecastDay(S, day, lead) {
  let a = dayWx(S, day); if (lead >= 3 && h32(S.wseed, day, 90 + lead) < .12 * (lead - 2)) a = dayWx({ ...S, wseed: S.wseed + lead * 7919 }, day);
  const e = (h32(S.wseed, day, 70 + lead) - .5) * lead * 1.4; return { a, hi: a.mean + a.rng / 2 + e, lo: a.mean - a.rng / 2 + e, pop: a.pop, cond: a.kind, icon: (COND[a.kind] || COND.clear)[0], tone: (COND[a.kind] || COND.clear)[1] };
}
