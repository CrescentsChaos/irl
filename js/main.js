import { start } from './game.js';
const f = n => fetch('data/' + n + '.json').then(r => r.json());
Promise.all(['config', 'world', 'jobs', 'items', 'events'].map(f))
  .then(([config, world, jobs, items, events]) => start({ config, world, jobs, items, events }))
  .catch(() => {
    document.getElementById('log').innerHTML = '<p class="bad">Could not load game data. Browsers block JSON from file:// pages. Run <code>python3 -m http.server</code> in this folder and open http://localhost:8000, or host on GitHub Pages.</p>';
  });
