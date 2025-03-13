import { classSpecs } from './wow_config/classSpecs.js';
import { fetchAndSaveBossData, BOSS_DATA_KEY } from './controllers/blizzardJournalController.js';

// Array to store players
let players = [];

// Load players from localStorage on page load
if (localStorage.getItem('players')) {
  players = JSON.parse(localStorage.getItem('players'));
  renderPlayerTable();
}

// Function to save players to localStorage
function savePlayers() {
  localStorage.setItem('players', JSON.stringify(players));
}

// Function to render the player table
function renderPlayerTable() {
  const playerList = document.getElementById('player-list');
  playerList.innerHTML = '';

  const totalPlayers = document.getElementById('total-players');
  totalPlayers.textContent = `(${players.length})`;

  players.forEach((player, index) => {
    const row = document.createElement('tr');
    const playerClass = classSpecs[player.class];
    const playerSpec = playerClass?.specs.find(spec => spec.name === player.spec);
    const playerRole = playerSpec ? playerSpec.role : 'Unknown';
    const playerTierToken = playerClass?.tierToken;
    const playerArmorType = playerClass?.armorType;

    row.innerHTML = `
      <td>
        <div class="player-name ${player.class.toLowerCase().replace(' ', '-')}">
          <span>${player.name}</span>
          <button onclick="editName(${index})">Edit</button>
        </div>
      </td>
      <td>
        <div class="player-class">
          <span>${player.class}</span>
        </div>
      </td>
      <td>
        <div class="player-spec">
          <span>${player.spec}</span>
          <button onclick="editSpec(${index})">Edit</button>
        </div>
      </td>
      <td>${playerRole}</td>
      <td>${playerTierToken}</td>
      <td>${playerArmorType}</td>
      <td>
        <div class="player-weighting">
          <span>${player.weighting}</span>
          <button onclick="editWeighting(${index})">Edit</button>
        </div>
      </td>
      <td class="actions">
        <button onclick="removePlayer(${index})">Remove</button>
      </td>
    `;
    playerList.appendChild(row);
  });

  savePlayers();
}

document.getElementById('add-player-button').addEventListener('click', () => {
  const name = document.getElementById('player-name').value;
  const playerClass = document.getElementById('player-class').value;
  const spec = document.getElementById('player-spec').value;
  const weighting = parseFloat(document.getElementById('player-weighting').value);

  const player = { name, class: playerClass, spec, weighting };
  players.push(player);
  document.getElementById('player-name').value = '';
  document.getElementById('player-weighting').value = 1.0;
  renderPlayerTable();
});

document.getElementById('player-class').addEventListener('change', () => {
  const selectedClass = document.getElementById('player-class').value;
  const specDropdown = document.getElementById('player-spec');
  specDropdown.innerHTML = '<option value="">Select Spec</option>';

  if (classSpecs[selectedClass]) {
    classSpecs[selectedClass].specs.forEach(spec => {
      const option = document.createElement('option');
      option.value = spec.name;
      option.textContent = spec.name;
      specDropdown.appendChild(option);
    });
  } else {
    console.error(`Class "${selectedClass}" not found in classSpecs.`);
  }
});

window.editName = function(index) {
  const nameCell = document.querySelectorAll('.player-name')[index];
  const currentName = players[index].name;
  const input = document.createElement('input');
  input.type = 'text';
  input.value = currentName;
  input.className = 'edit-input';
  nameCell.innerHTML = '';
  nameCell.appendChild(input);
  input.focus();
  input.addEventListener('keyup', (event) => {
    if (event.key === 'Enter') {
      players[index].name = input.value;
      renderPlayerTable();
    }
  });
};

window.editSpec = function(index) {
  const specCell = document.querySelectorAll('.player-spec')[index];
  const currentSpec = players[index].spec;
  const playerClass = players[index].class;
  const container = document.createElement('div');
  container.className = 'spec-edit-container';
  const select = document.createElement('select');
  select.className = 'edit-input';

  classSpecs[playerClass].specs.forEach(spec => {
    const option = document.createElement('option');
    option.value = spec.name;
    option.textContent = spec.name;
    select.appendChild(option);
  });

  select.value = currentSpec;
  const saveButton = document.createElement('button');
  saveButton.textContent = 'Save';
  saveButton.className = 'save-spec-button';
  specCell.innerHTML = '';
  container.appendChild(select);
  container.appendChild(saveButton);
  specCell.appendChild(container);
  saveButton.addEventListener('click', () => {
    players[index].spec = select.value;
    renderPlayerTable();
  });
};

window.editWeighting = function(index) {
  const weightingCell = document.querySelectorAll('.player-weighting')[index];
  const currentWeighting = players[index].weighting;
  const input = document.createElement('input');
  input.type = 'number';
  input.value = currentWeighting;
  input.className = 'edit-input';
  weightingCell.innerHTML = '';
  weightingCell.appendChild(input);
  input.focus();
  input.addEventListener('keyup', (event) => {
    if (event.key === 'Enter') {
      players[index].weighting = parseFloat(input.value);
      renderPlayerTable();
    }
  });
};

window.removePlayer = function(index) {
  if (confirm(`Are you sure you want to remove ${players[index].name}?`)) {
    players.splice(index, 1);
    savePlayers();
    renderPlayerTable();
  }
};

document.getElementById('save-roster-button').addEventListener('click', () => {
  const roster = JSON.stringify(players, null, 2);
  const blob = new Blob([roster], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'roster.json';
  a.click();
  URL.revokeObjectURL(url);
});

document.getElementById('load-roster-button').addEventListener('click', () => {
  document.getElementById('roster-file').click();
});

document.getElementById('roster-file').addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const newPlayers = JSON.parse(e.target.result);
      players.length = 0;
      players.push(...newPlayers);
      renderPlayerTable();
      event.target.value = '';
    };
    reader.readAsText(file);
  }
});

let currentSortColumn = null;
let isAscending = true;

function sortTable(columnIndex, isNumeric = false) {
  players.sort((a, b) => {
    let keyA, keyB;
    switch (columnIndex) {
      case 0:
        keyA = a.name;
        keyB = b.name;
        break;
      case 1:
        keyA = a.class;
        keyB = b.class;
        break;
      case 3:
        keyA = classSpecs[a.class].specs.find(s => s.name === a.spec)?.role || '';
        keyB = classSpecs[b.class].specs.find(s => s.name === b.spec)?.role || '';
        break;
      case 4:
        keyA = classSpecs[a.class].tierToken;
        keyB = classSpecs[b.class].tierToken;
        break;
      case 5:
        keyA = classSpecs[a.class].armorType;
        keyB = classSpecs[b.class].armorType;
        break;
      case 6:
        keyA = a.weighting;
        keyB = b.weighting;
        break;
      default:
        return 0;
    }
    if (isNumeric) {
      return isAscending ? parseFloat(keyA) - parseFloat(keyB) : parseFloat(keyB) - parseFloat(keyA);
    } else {
      return isAscending ? keyA.localeCompare(keyB) : keyB.localeCompare(keyA);
    }
  });
  renderPlayerTable();
}

function updateSortIcons(columnIndex) {
  const headers = document.querySelectorAll('#player-table th');
  headers.forEach((header, index) => {
    header.innerHTML = header.textContent.replace(/ [▲▼]/g, '');
    if (index === columnIndex && [0, 1, 3, 4, 5, 6].includes(index)) {
      header.innerHTML += isAscending ? ' ▲' : ' ▼';
    }
  });
}

document.querySelectorAll('#player-table th').forEach((header, index) => {
  header.addEventListener('click', () => {
    if ([0, 1, 3, 4, 5, 6].includes(index)) {
      if (currentSortColumn === index) {
        isAscending = !isAscending;
      } else {
        currentSortColumn = index;
        isAscending = true;
      }
      switch (index) {
        case 0:
        case 1:
        case 3:
        case 4:
        case 5:
          sortTable(index);
          break;
        case 6:
          sortTable(index, true);
          break;
      }
      updateSortIcons(index);
    }
  });
});

function clearRoster() {
  if (confirm("Are you sure you want to clear the entire roster? This cannot be undone.")) {
    players = [];
    savePlayers();
    renderPlayerTable();
  }
}

document.getElementById('clear-roster-button').addEventListener('click', clearRoster);

function switchTab(event) {
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');
  tabButtons.forEach(button => button.classList.remove('active'));
  tabContents.forEach(content => content.classList.remove('active'));
  const targetTab = event.target.getAttribute('data-tab');
  document.getElementById(targetTab).classList.add('active');
  event.target.classList.add('active');
  if (targetTab === 'player-table') {
    renderPlayerTable();
  } else if (targetTab === 'second-table') {
    populateBossCategories();
  } else if (targetTab === 'boss-info') {
    renderBossInfo();
  }
}

document.querySelectorAll('.tab-button').forEach(button => {
  button.addEventListener('click', switchTab);
});

function populateBossCategories() {
  const bosses = document.querySelectorAll('.boss');
  const bossData = JSON.parse(localStorage.getItem(BOSS_DATA_KEY)) || {};
  const currentBosses = bossData.encounters || [];

  bosses.forEach((boss, index) => {
    const bossName = currentBosses[index]?.name || `Boss ${index + 1}`;
    boss.querySelector('h4').textContent = bossName;
    const categories = boss.querySelector('.categories');
    const meleeCategory = categories.children[0];
    const rangedCategory = categories.children[1];
    const healersCategory = categories.children[2];
    const tanksCategory = categories.children[3];
    meleeCategory.innerHTML = 'Melee';
    rangedCategory.innerHTML = 'Ranged';
    healersCategory.innerHTML = 'Healers';
    tanksCategory.innerHTML = 'Tanks';
    players.forEach(player => {
      const playerElement = document.createElement('div');
      playerElement.textContent = player.name;
      playerElement.className = `player-assignment ${player.class.toLowerCase().replace(' ', '-')}`;
      const pClass = classSpecs[player.class];
      const pSpec = pClass.specs.find(spec => spec.name === player.spec);
      const pRole = pSpec ? pSpec.role : 'Unknown';
      switch (pRole) {
        case 'Melee':
          meleeCategory.appendChild(playerElement);
          break;
        case 'Ranged':
          rangedCategory.appendChild(playerElement);
          break;
        case 'Healer':
          healersCategory.appendChild(playerElement);
          break;
        case 'Tank':
          tanksCategory.appendChild(playerElement);
          break;
      }
    });
  });
}

function renderBossInfo() {
  const bossLootContainer = document.getElementById('boss-loot-container');
  bossLootContainer.innerHTML = '';
  const bossData = JSON.parse(localStorage.getItem(BOSS_DATA_KEY)) || [];
  bossData.forEach(boss => {
    const bossSection = document.createElement('div');
    bossSection.className = 'boss-section';
    const bossHeader = document.createElement('div');
    bossHeader.className = 'boss-header';
    bossHeader.innerHTML = `<h4>${boss.name}</h4>`;
    bossSection.appendChild(bossHeader);
    const bossLoot = document.createElement('div');
    bossLoot.className = 'boss-loot';
    if (boss.loot && boss.loot.length > 0) {
      const table = document.createElement('table');
      table.innerHTML = `
        <thead>
          <tr>
            <th>Loot</th>
            <th>Item Type</th>
            <th>BiS For</th>
          </tr>
        </thead>
        <tbody>
          ${boss.loot.map(item => `
            <tr>
              <td>${item.item?.name || 'Unknown Item'}</td>
              <td>${item.item?.type || 'N/A'}</td>
              <td>${item.bisFor?.join(', ') || 'N/A'}</td>
            </tr>
          `).join('')}
        </tbody>
      `;
      bossLoot.appendChild(table);
    } else {
      bossLoot.innerHTML = '<p>No loot data available.</p>';
    }
    bossSection.appendChild(bossLoot);
    bossLootContainer.appendChild(bossSection);
  });
  document.querySelectorAll('.boss-header').forEach(header => {
    header.addEventListener('click', () => {
      const bossSection = header.parentElement;
      bossSection.classList.toggle('expanded');
    });
  });
}

document.getElementById('fetch-boss-data-button').addEventListener('click', fetchAndSaveBossData);

document.addEventListener('DOMContentLoaded', () => {
  renderBossInfo();
});
