// State
const state = {
  user: null,
  matches: [], // starts empty as requested
  currentMatchId: null
};

// Helpers
const qs = (sel) => document.querySelector(sel);
const qsa = (sel) => Array.from(document.querySelectorAll(sel));

function showView(id) {
  ['homeView', 'authView', 'profileView', 'matchView'].forEach(v => qs('#' + v).classList.add('hidden'));
  qs('#' + id).classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateHeaderForAuth() {
  const loginLink = qs('#loginLink');
  const profileLink = qs('#profileLink');
  if (state.user) {
    loginLink.classList.add('hidden');
    profileLink.classList.remove('hidden');
  } else {
    loginLink.classList.remove('hidden');
    profileLink.classList.add('hidden');
  }
}

function renderMatches() {
  const container = qs('#matchesContainer');
  const empty = qs('#emptyState');
  container.innerHTML = '';

  if (state.matches.length === 0) {
    empty.classList.remove('hidden');
    return;
  } else {
    empty.classList.add('hidden');
  }

  state.matches.forEach(match => {
    const card = document.createElement('div');
    card.className = 'card';

    const info = document.createElement('div');
    info.innerHTML = `
      <h4 class="card-title">${match.name}</h4>
      <div class="card-meta">
        ${match.place} • ${match.date} ${match.time} • Vagas: ${match.players - match.confirmed.length}
      </div>
      <div class="map-placeholder">
        <span class="material-symbols-rounded">map</span>
        <span>Mini mapa (futuro)</span>
      </div>
    `;

    const actions = document.createElement('div');
    actions.className = 'card-actions';

    const btnParticipar = document.createElement('button');
    btnParticipar.className = 'btn btn-primary';
    btnParticipar.innerHTML = `<span class="material-symbols-rounded">event_available</span> Participar`;
    btnParticipar.addEventListener('click', () => openMatch(match.id));

    actions.appendChild(btnParticipar);

    card.appendChild(info);
    card.appendChild(actions);
    container.appendChild(card);
  });
}

function openCreateModal() {
  qs('#createModal').classList.remove('hidden');
}
function closeCreateModal() {
  qs('#createModal').classList.add('hidden');
}

// Create match submit
qs('#createMatchForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = qs('#matchName').value.trim();
  const date = qs('#matchDate').value;
  const time = qs('#matchTime').value;
  const place = qs('#matchPlace').value.trim();
  const players = parseInt(qs('#matchPlayers').value, 10);
  const fieldType = qs('#matchFieldType').value;
  const fee = qs('#matchFee').value ? parseFloat(qs('#matchFee').value) : null;
  const gender = qs('#matchGender').value;
  const chatEnabled = qs('#matchChat').value === 'on';

  const id = Date.now().toString();
  const match = {
    id,
    name,
    date,
    time,
    place,
    players,
    fieldType,
    fee,
    gender,
    chatEnabled,
    confirmed: [],
    photo: '',
    chat: []
  };

  state.matches.push(match);
  closeCreateModal();
  renderMatches();
});

// Open match view
function openMatch(id) {
  const match = state.matches.find(m => m.id === id);
  if (!match) return;

  state.currentMatchId = id;
  showView('matchView');

  qs('#matchTitle').textContent = match.name;
  qs('#matchDateTime').textContent = `${match.date} ${match.time}`;
  qs('#matchPlaceText').textContent = match.place;
  qs('#matchTypeText').textContent = `${match.fieldType} • ${match.gender}`;
  qs('#matchPhoto').src = match.photo || 'https://images.unsplash.com/photo-1519680772-8b7b8d1cd9f3?q=80&w=1400&auto=format&fit=crop';

  renderPlayers(match);
  renderChat(match);
}

function renderPlayers(match) {
  const list = qs('#playersList');
  list.innerHTML = '';
  match.confirmed.forEach(p => {
    const li = document.createElement('li');
    li.className = 'player-item';
    li.innerHTML = `
      <div class="player-avatar">${(p.name || '?').slice(0,1).toUpperCase()}</div>
      <div>
        <div><strong>${p.name}</strong></div>
        <div class="card-meta">${p.pos || '—'}</div>
      </div>
    `;
    list.appendChild(li);
  });
}

// Confirm presence
qs('#confirmPresence').addEventListener('click', () => {
  const match = state.matches.find(m => m.id === state.currentMatchId);
  if (!match) return;

  if (!state.user) {
    alert('Faça login para confirmar presença.');
    showView('authView');
    return;
  }

  const already = match.confirmed.find(p => p.email === state.user.email);
  if (already) {
    alert('Você já confirmou presença.');
    return;
  }

  if (match.confirmed.length >= match.players) {
    alert('Partida lotada.');
    return;
  }

  match.confirmed.push({
    name: state.user.name,
    email: state.user.email,
    pos: state.user.favPos || ''
  });

  renderPlayers(match);
  alert('Presença confirmada!');
});

// Chat
function renderChat(match) {
  const box = qs('#chatMessages');
  box.innerHTML = '';

  if (!match.chatEnabled) {
    box.innerHTML = '<div class="chat-message">Chat desativado para esta partida.</div>';
    qs('#chatForm').classList.add('hidden');
    return;
  } else {
    qs('#chatForm').classList.remove('hidden');
  }

  match.chat.forEach(msg => {
    const div = document.createElement('div');
    div.className = 'chat-message';
    div.innerHTML = `<strong>${msg.author}:</strong> ${msg.text}`;
    box.appendChild(div);
  });
}

qs('#chatForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const match = state.matches.find(m => m.id === state.currentMatchId);
  if (!match || !match.chatEnabled) return;

  if (!state.user) {
    alert('Faça login para enviar mensagens.');
    showView('authView');
    return;
  }

  const text = qs('#chatMessageInput').value.trim();
  if (!text) return;
  match.chat.push({ author: state.user.name, text });
  qs('#chatMessageInput').value = '';
  renderChat(match);
});

// Auth
qs('#authForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = qs('#authName').value.trim();
  const email = qs('#authEmail').value.trim();
  const level = qs('#authLevel').value;

  state.user = { name, email, level, favPos: '', photoUrl: '' };
  localStorage.setItem('futn_user', JSON.stringify(state.user));

  updateHeaderForAuth();
  showView('homeView');
  alert(`Bem-vindo(a), ${name}!`);
});

qs('#googleLogin').addEventListener('click', () => {
  alert('Integração de login Google será adicionada futuramente.');
});
qs('#facebookLogin').addEventListener('click', () => {
  alert('Integração de login Facebook será adicionada futuramente.');
});

function loadUser() {
  const raw = localStorage.getItem('futn_user');
  if (raw) {
    state.user = JSON.parse(raw);
  }
  updateHeaderForAuth();
}

// Profile
qs('#profileLink').addEventListener('click', (e) => {
  e.preventDefault();
  if (!state.user) return;
  populateProfile();
  showView('profileView');
});

function populateProfile() {
  qs('#profileName').textContent = state.user.name || '—';
  qs('#profileLevel').textContent = `Nível: ${state.user.level || '—'}`;
  qs('#profileFavPos').textContent = `Posição favorita: ${state.user.favPos || '—'}`;
  qs('#profileAvatar').textContent = (state.user.name || 'F').slice(0,1).toUpperCase();

  if (state.user.photoUrl) {
    qs('#profileAvatar').style.backgroundImage = `url(${state.user.photoUrl})`;
    qs('#profileAvatar').style.backgroundSize = 'cover';
    qs('#profileAvatar').style.color = 'transparent';
  } else {
    qs('#profileAvatar').style.backgroundImage = '';
    qs('#profileAvatar').style.color = 'var(--green)';
  }

  // Stats and history mock from confirmed matches
  const played = state.matches.filter(m => m.confirmed.find(p => p.email === state.user.email));
  qs('#statsMatches').textContent = played.length.toString();
  qs('#statsGoals').textContent = (state.user.goals || 0).toString();
  qs('#statsRating').textContent = (state.user.rating || '—');

  const historyList = qs('#historyList');
  historyList.innerHTML = '';
  played.forEach(m => {
    const li = document.createElement('li');
    li.className = 'history-item';
    li.textContent = `${m.name} • ${m.date} ${m.time} • ${m.place}`;
    historyList.appendChild(li);
  });
}

qs('#saveProfile').addEventListener('click', () => {
  const favPos = qs('#favPos').value;
  const photoUrl = qs('#profilePhotoUrl').value.trim();
  state.user.favPos = favPos;
  state.user.photoUrl = photoUrl;
  localStorage.setItem('futn_user', JSON.stringify(state.user));
  populateProfile();
  alert('Perfil atualizado!');
});

qs('#logoutBtn').addEventListener('click', () => {
  localStorage.removeItem('futn_user');
  state.user = null;
  updateHeaderForAuth();
  showView('homeView');
});

// Navigation
qsa('.nav-link').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const view = link.dataset.view;
    if (view === 'home') showView('homeView');
    if (view === 'login') showView('authView');
  });
});

qs('#createMatchHeader').addEventListener('click', openCreateModal);
qs('#createMatchList').addEventListener('click', openCreateModal);
qs('#closeCreateModal').addEventListener('click', closeCreateModal);

qs('#backToHome').addEventListener('click', () => showView('homeView'));

// Search + filters (basic placeholder)
qs('#searchForm').addEventListener('submit', (e) => {
  e.preventDefault();
  alert('Busca aplicada (funcionalidade completa futura).');
});

['filterFieldType', 'filterLevel', 'filterTime'].forEach(id => {
  qs('#' + id).addEventListener('change', () => {
    alert('Filtro aplicado (funcionalidade completa futura).');
  });
});

// Geolocation
qs('#geoBtn').addEventListener('click', () => {
  if (!navigator.geolocation) {
    alert('Geolocalização não suportada.');
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;
      qs('#locationInput').value = `Lat ${latitude.toFixed(4)}, Lng ${longitude.toFixed(4)}`;
    },
    () => alert('Não foi possível obter sua localização.')
  );
});

// Init
loadUser();
renderMatches();
showView('homeView');

