import { Game } from './game.js';
const load = f => fetch('data/' + f).then(r => r.json());
Promise.all(['config.json','world.json','jobs.json','shop.json'].map(load))
  .then(([config, world, jobs, shop]) => new Game(config, world, jobs, shop).start())
  .catch(() => {
    const m = document.getElementById('menu');
    m.hidden = false;
    m.innerHTML = '<h2>Can\'t load game data</h2><p>Browsers block JSON files opened directly from disk. Run <code>python3 -m http.server</code> in this folder and open http://localhost:8000, or host it on GitHub Pages.</p>';
  });
