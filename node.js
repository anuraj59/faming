const cropDefs = {
  carrot: { name: 'Carrot', emoji: '🥕', cost: 8, grow: 12, value: 18, desc: 'A cheerful little crunch.' },
  tomato: { name: 'Tomato', emoji: '🍅', cost: 12, grow: 18, value: 26, desc: 'Bright, juicy and sun-kissed.' },
  corn: { name: 'Sweet corn', emoji: '🌽', cost: 18, grow: 25, value: 38, desc: 'Golden kernels, happy days.' },
  strawberry: { name: 'Strawberry', emoji: '🍓', cost: 24, grow: 32, value: 52, desc: 'A tiny taste of summer.' },
  pumpkin: { name: 'Pumpkin', emoji: '🎃', cost: 30, grow: 42, value: 68, desc: 'A big orange autumn treat.' },
  blueberry: { name: 'Blueberry', emoji: '🫐', cost: 38, grow: 48, value: 82, desc: 'Little berries, big magic.' }
};

const animalDefs = {
  chicken: { name: 'Chicken', emoji: '🐔', cost: 55, desc: 'Lays a fresh egg every so often.' },
  cow: { name: 'Happy cow', emoji: '🐮', cost: 120, desc: 'A gentle friend with fresh milk.' },
  sheep: { name: 'Fluffy sheep', emoji: '🐑', cost: 95, desc: 'Soft wool, softer personality.' },
  duck: { name: 'Duckling', emoji: '🦆', cost: 72, desc: 'Waddles around and finds shiny things.' }
};

const findDefs = {
  rainbow: { name: 'Rainbow seed', emoji: '🌈', cost: 45, desc: 'Plants a surprise crop!' },
  mystery: { name: 'Mystery parcel', emoji: '🎁', cost: 35, desc: 'Could be coins, seeds, or a surprise friend.' },
  golden: { name: 'Golden watering can', emoji: '✨', cost: 65, desc: 'A little extra growing magic.' }
};

let state = {
  coins: 120,
  day: 1,
  harvests: 0,
  plots: Array(8).fill(null),
  inventory: {},
  animals: [],
  journal: [],
  tab: 'seeds',
  goldenCan: false
};

const $ = selector => document.querySelector(selector);

function toast(message) {
  const element = $('#toast');
  element.textContent = message;
  element.classList.add('show');
  setTimeout(() => element.classList.remove('show'), 2200);
}

function log(emoji, text) {
  state.journal.unshift({ emoji, text, time: `Day ${state.day}` });
  state.journal = state.journal.slice(0, 4);
  renderJournal();
}

function render() {
  $('#coins').textContent = state.coins;
  $('#day').textContent = `Day ${state.day}`;
  $('#date').textContent =
    ['Spring', 'Summer', 'Autumn', 'Winter'][Math.floor((state.day - 1) / 12) % 4] +
    ' ' + (((state.day - 1) % 12) + 1);
  $('#bedCount').textContent = `${state.plots.filter(Boolean).length} / 8`;

  renderPlot();
  renderInventory();
  renderAnimals();
  renderShop();
  renderQuest();
  renderJournal();
}

function renderPlot() {
  const plot = $('#plot');
  plot.innerHTML = '';

  state.plots.forEach((crop, index) => {
    const tile = document.createElement('button');
    tile.className = 'tile ' + (crop ? (Date.now() >= crop.ready ? 'ready' : '') : 'empty');

    if (!crop) {
      tile.innerHTML = `
        <span class="empty-mark">＋</span>
        <span class="tile-name">Empty bed</span>
        <span class="tile-state">Plant something lovely</span>
        <div class="tile-action"><span>🌱 Choose seed</span></div>
      `;
      tile.onclick = () => {
        state.tab = 'seeds';
        renderShop();
        toast('Choose a seed from the market, then tap a garden bed.');
      };
    } else {
      const definition = cropDefs[crop.type];
      const ready = Date.now() >= crop.ready;
      const seconds = Math.max(0, Math.ceil((crop.ready - Date.now()) / 1000));

      tile.innerHTML = `
        <span class="crop-emoji">${ready ? '✨' : ''}${definition.emoji}</span>
        <span class="tile-name">${definition.name}</span>
        <span class="tile-state">${ready ? 'Ready to harvest!' : `Growing · ${seconds}s`}</span>
        <div class="tile-action"><span>${ready ? '🧺 Harvest' : '💧 Water'}</span></div>
      `;
      tile.onclick = () => ready ? harvest(index) : water(index);
    }

    plot.append(tile);
  });
}

function renderInventory() {
  const element = $('#harvest');
  const entries = Object.entries(state.inventory).filter(([, count]) => count > 0);

  element.innerHTML = entries.length
    ? entries.map(([type, count]) => `
        <div class="item-row">
          <div class="item-icon">${cropDefs[type].emoji}</div>
          <div class="item-info">
            <b>${cropDefs[type].name}</b>
            <small>Freshly picked · 🪙 ${cropDefs[type].value} each</small>
          </div>
          <span class="count">×${count}</span>
          <button class="action-btn" data-sell="${type}">Sell</button>
        </div>
      `).join('')
    : '<div class="empty-note">Your basket is waiting for its first harvest. 🌱</div>';

  element.querySelectorAll('[data-sell]').forEach(button => {
    button.onclick = () => sell(button.dataset.sell);
  });
}

function renderAnimals() {
  const element = $('#animals');

  element.innerHTML = state.animals.length
    ? state.animals.map((animal, index) => `
        <div class="item-row">
          <div class="item-icon">${animal.emoji}</div>
          <div class="item-info">
            <b>${animal.name}</b>
            <small>
              ${animal.product
                ? `Found ${animal.product} · ready in ${Math.max(1, Math.ceil((animal.ready - Date.now()) / 1000))}s`
                : 'Your newest farm friend!'}
            </small>
          </div>
          <button class="action-btn" data-care="${index}">
            ${animal.product && Date.now() >= animal.ready ? 'Collect' : 'Pet'}
          </button>
        </div>
      `).join('')
    : '<div class="empty-note">The barn is quiet… maybe a new friend is waiting? 🐔</div>';

  element.querySelectorAll('[data-care]').forEach(button => {
    button.onclick = () => care(Number(button.dataset.care));
  });
}

function renderShop() {
  const definitions =
    state.tab === 'seeds' ? cropDefs :
    state.tab === 'animals' ? animalDefs :
    findDefs;

  $('#shop').innerHTML = Object.entries(definitions).map(([id, item]) => `
    <div class="shop-item">
      <div class="shop-emoji">${item.emoji}</div>
      <div class="shop-info">
        <b>${item.name}</b>
        <small>${item.grow ? `${item.grow}s to grow · ` : ''}${item.desc}</small>
      </div>
      <button class="buy" data-buy="${id}" ${state.coins < item.cost ? 'disabled' : ''}>
        🪙 ${item.cost}
      </button>
    </div>
  `).join('');

  $('#shop').querySelectorAll('[data-buy]').forEach(button => {
    button.onclick = () => buy(button.dataset.buy);
  });
}

function renderQuest() {
  const count = Math.min(3, state.harvests);
  $('#questCount').textContent = `${count} / 3 harvested`;
  $('#questBar').style.width = `${count / 3 * 100}%`;

  if (count >= 3 && !state.questDone) {
    state.questDone = true;
    state.coins += 35;
    toast('Goal complete! +35 coins 🌟');
    log('🌟', 'Completed today’s little goal!');
    render();
  }
}

function renderJournal() {
  const element = $('#journal');

  element.innerHTML = state.journal.length
    ? state.journal.map(entry => `
        <div class="log-row">
          <span class="log-ico">${entry.emoji}</span>
          <span>${entry.text}</span>
          <time>${entry.time}</time>
        </div>
      `).join('')
    : '<div class="log-row"><span class="log-ico">🌱</span><span>Your story starts today.</span><time>Day 1</time></div>';
}

function buy(id) {
  if (state.tab === 'seeds') {
    const bed = state.plots.findIndex(plot => !plot);
    if (bed < 0) {
      toast('All your garden beds are growing something!');
      return;
    }

    const item = cropDefs[id];
    if (state.coins < item.cost) return;

    state.coins -= item.cost;
    state.plots[bed] = {
      type: id,
      ready: Date.now() + Math.max(5, item.grow - (state.goldenCan ? 8 : 0)) * 1000
    };
    log(item.emoji, `Planted a ${item.name.toLowerCase()} seed.`);
    toast(`${item.name} seed planted! 🌱`);
  } else if (state.tab === 'animals') {
    const item = animalDefs[id];
    if (state.coins < item.cost) return;

    state.coins -= item.cost;
    state.animals.push({
      ...item,
      ready: Date.now() + 18000,
      product:
        id === 'chicken' ? '🥚 egg' :
        id === 'cow' ? '🥛 milk' :
        id === 'sheep' ? '🧶 wool' :
        '✨ shiny pebble'
    });
    log(item.emoji, `Welcomed ${item.name.toLowerCase()} to the farm!`);
    toast(`${item.name} joined your farm! 🐾`);
  } else {
    const item = findDefs[id];
    if (state.coins < item.cost) return;
    state.coins -= item.cost;

    if (id === 'rainbow') {
      const freeBed = state.plots.findIndex(plot => !plot);

      if (freeBed >= 0) {
        const types = Object.keys(cropDefs);
        const type = types[Math.floor(Math.random() * types.length)];
        state.plots[freeBed] = { type, ready: Date.now() + 7000 };
        toast(`Surprise! A ${cropDefs[type].name} is growing 🌈`);
        log('🌈', 'Found a surprise crop!');
      } else {
        state.coins += item.cost;
        toast('Make room in your garden first!');
      }
    }

    if (id === 'mystery') {
      const result = Math.random();

      if (result < 0.4) {
        state.coins += 55;
        toast('Parcel surprise: 55 shiny coins! 🪙');
        log('🎁', 'A mystery parcel had coins inside!');
      } else if (result < 0.8) {
        const type = Object.keys(cropDefs)[Math.floor(Math.random() * 4)];
        state.inventory[type] = (state.inventory[type] || 0) + 1;
        toast(`Parcel surprise: ${cropDefs[type].emoji} ${cropDefs[type].name}!`);
        log('🎁', 'Unwrapped a mystery crop!');
      } else {
        state.coins += 15;
        toast('A lovely surprise and 15 coins! 🎁');
      }
    }

    if (id === 'golden') {
      state.goldenCan = true;
      toast('Golden can magic! Future crops grow faster ✨');
      log('✨', 'Found a golden watering can.');
    }
  }

  render();
}

function harvest(index) {
  const crop = state.plots[index];
  if (!crop || Date.now() < crop.ready) return;

  const item = cropDefs[crop.type];
  state.inventory[crop.type] = (state.inventory[crop.type] || 0) + 1;
  state.harvests++;
  state.plots[index] = null;

  log(item.emoji, `Harvested a lovely ${item.name.toLowerCase()}.`);
  toast(`${item.name} picked and tucked in your basket! 🧺`);
  render();
}

function sell(type) {
  if (!state.inventory[type]) return;

  state.inventory[type]--;
  state.coins += cropDefs[type].value;
  log('🪙', `Sold a ${cropDefs[type].name.toLowerCase()} for ${cropDefs[type].value} coins.`);
  toast(`+${cropDefs[type].value} coins!`);
  render();
}

function water(index) {
  const crop = state.plots[index];
  if (!crop) return;

  crop.ready = Math.max(Date.now(), crop.ready - 5000);
  toast('A refreshing drink! Grew 5 seconds faster 💧');
  renderPlot();
}

function care(index) {
  const animal = state.animals[index];

  if (animal.product && Date.now() >= animal.ready) {
    state.coins += 18;
    toast(`${animal.product} collected! +18 coins`);
    log(animal.emoji, `Collected ${animal.product} from ${animal.name.toLowerCase()}.`);
    animal.ready = Date.now() + 22000;
  } else {
    toast(`A happy little pat for ${animal.name.toLowerCase()} 💛`);
  }

  render();
}

$('#shop').addEventListener('click', event => {
  const button = event.target.closest('[data-buy]');
  if (button) buy(button.dataset.buy);
});

document.querySelectorAll('.shop-tabs button').forEach(button => {
  button.onclick = () => {
    state.tab = button.dataset.tab;
    document.querySelectorAll('.shop-tabs button').forEach(tab => {
      tab.classList.toggle('active', tab === button);
    });
    renderShop();
  };
});

$('#waterAll').onclick = () => {
  const crops = state.plots.filter(Boolean);
  if (!crops.length) {
    toast('Plant a seed first, then water it 💧');
    return;
  }

  state.plots.forEach(crop => {
    if (crop) crop.ready = Math.max(Date.now(), crop.ready - 5000);
  });

  toast('A little rain for every bed! 💧');
  renderPlot();
};

$('#modalClose').onclick = () => $('#modal').classList.remove('show');

// Restore the farm from the last visit.
try {
  const saved = localStorage.getItem('littleAcreSave');
  if (saved) {
    const data = JSON.parse(saved);
    state = { ...state, ...data };
    state.plots = state.plots.map(crop =>
      crop && typeof crop.ready === 'string'
        ? { ...crop, ready: Date.parse(crop.ready) }
        : crop
    );
  }
} catch (error) {}

setInterval(() => {
  renderPlot();
  renderAnimals();
}, 1000);

setInterval(() => {
  state.day++;
  state.questDone = false;
  state.harvests = 0;
  state.plots.forEach(crop => {
    if (crop) crop.ready = Math.max(Date.now(), crop.ready - 2500);
  });
  log('☀️', 'A fresh farm day begins!');
  render();
}, 45000);

setInterval(() => {
  try {
    localStorage.setItem('littleAcreSave', JSON.stringify(state));
  } catch (error) {}
}, 3000);

render();
log('🌱', 'Your little farm is ready to grow.');