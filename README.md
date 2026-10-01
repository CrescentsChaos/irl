# IRL: In Remote Life
Top-down life simulator. Plain HTML + JS modules + JSON data, no build step.

## Run
JSON loads via fetch, so serve the folder (opening index.html from disk won't work):
    python3 -m http.server   ->  http://localhost:8000
Or push to GitHub Pages.

## Controls
WASD/arrows move · E enter building · F enter/exit car · M save (auto-saves every 15s)

## Add content (no code needed)
- data/world.json  buildings & roads (types: home, work, shop, hospital, gym, park)
- data/jobs.json   shifts per work building name
- data/shop.json   items sold at Corner Mart
- data/config.json start stats, speed, time rate, rent

## Code
- js/main.js loads JSON, js/game.js holds the Game class (update, draw, menus, save)
