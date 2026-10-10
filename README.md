# IRL: In Remote Life  (text edition)
A text-based life sim. Plain HTML + JS modules + JSON data, no build step.

## Run
JSON loads via fetch, so serve the folder:  python3 -m http.server  ->  http://localhost:8000
(or host on GitHub Pages). Click options or press number keys. Auto-saves in your browser.

## Random lives
Each new game rolls a country (197), an age (5-85) and a profession. Reroll as often as you like before starting.
- data/countries.json  rows: name|region|income tier 1-5|currency|rate per USD (approx)|food|city
- data/regions.json    regional flavor (eatery type, shop type, local names, street atmosphere)
- data/professions.json careers with age and income-tier limits
In data text, @N = a cost and #N = income; both scale by the country's prices, wages and currency. Tokens like {city}, {food}, {cook} are filled per country.

## Backstory
Every character starts with a past: a full name, family (alive or late, with bond levels), friends, how long they've lived in town, education, traits, a hobby, a keepsake and three memories. data/people.json (names per region) and data/backstory.json (traits, memories, hobbies...) drive it. Family events in data/events.json use `has` (parent, sibling, spouse, child).

## Data files (add content without code)
- data/world.json   locations, descriptions by time of day, exits, actions
- data/jobs.json    careers with levels, pay, shifts, promotions
- data/events.json  random encounters with choices and skill-based odds
- data/items.json   items (price = sold at Corner Mart)
- data/config.json  start stats, rent, decay rates, weather

## Effect keys (used by actions, events, items)
time, money, health, hunger, energy, mood, heat, rep, sk:{skill:+n}, item:"id", flag:{k:v}
Actions may have chance:{base,sk,per} with win/lose outcomes; req:{money,energy,sk,open}.

## Code
js/main.js loads data. js/game.js is the engine (time, needs, rent, jobs, events, saving).
