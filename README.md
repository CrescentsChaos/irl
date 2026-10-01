# IRL: In Remote Life  (text edition)
A text-based life sim. Plain HTML + JS modules + JSON data, no build step.

## Run
JSON loads via fetch, so serve the folder:  python3 -m http.server  ->  http://localhost:8000
(or host on GitHub Pages). Click options or press number keys. Auto-saves in your browser.

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
