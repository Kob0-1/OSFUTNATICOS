// Estado simples em localStorage
const STORE_KEY = 'futnaticos_store_v1';
const initialStore = {
  user: null,
  matches: [],           // começa vazio: "Nenhuma partida registrada"
  notifications: []
};

let store = loadStore();

// Utilitários de Store
function loadStore(){
  try{
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? JSON.parse(raw) : structuredClone(initialStore);
  }catch(e){
    return structuredClone(initialStore);
  }
}
function saveStore(){
  localStorage.setItem(STORE_KEY, JSON.stringify(store));
}

// Navegação SPA
const screens = Array.from(document.querySelectorAll('.screen'));
function showScreen(hash){
  const target = hash || '#home';
  screens.forEach(s => s.classList.toggle('show', '#'+s.id === target));
  // menu ativo
  document.querySelectorAll('.nav-link').forEach(a => {
    a.classList.toggle('active', a.getAttribute('href') === target);
  });
}
window.addEventListener('hashchange', () => showScreen(location.hash));
document.querySelectorAll('[data-nav]').forEach(el=>{
  el.addEventListener('click', (e)=>{
    const to = el.getAttribute('data-nav');
    if(to){ location.hash = to; }
  });
});

// Header ações
document.getElementById('header-criar').addEventListener('click', ()=> location.hash = '#criar');

// Home botões "Criar Partida"
['home-criar','empty-criar'].forEach(id=>{
  const el = document.getElementById(id);
  if(el) el.addEventListener('click', ()=> location.hash = '#criar');
});

// Geolocalização simples
document.getElementById('btnGeo').addEventListener('click', ()=>{
  if(!navigator.geolocation){
    alert('Geolocalização indisponível no seu navegador.');
    return;
  }
  navigator.geolocation.getCurrentPosition((pos)=>{
    const {latitude, longitude} = pos.coords;
    document.getElementById('inputLocal').value = `Minha localização (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
  }, ()=>{
    alert('Não foi possível obter sua localização.');
  });
});

// Busca
document.getElementById('buscaForm').addEventListener('submit', (e)=>{
  e.preventDefault();
  renderMatches(); // com filtros já aplicados
});

// Filtros
document.getElementById('btnAplicarFiltros').addEventListener('click', renderMatches);

// Render inicial
renderHeaderByAuth();
renderMatches();
renderNotificacoes();

// Mostrar tela inicial
showScreen(location.hash || '#home');

/* ------------------ MATCHES LIST ------------------ */
function renderMatches(){
  const list = document.getElementById('matchesList');
  const empty = document.getElementById('emptyState');

  const filtroBairro = document.getElementById('filtroBairro').value.trim().toLowerCase();
  const filtroHorario = document.getElementById('filtroHorario').value;
  const filtroCampo = document.getElementById('filtroCampo').value;
  const filtroNivel = document.getElementById('filtroNivel').value;

  let items = [...store.matches];

  // Aplicar filtros
  items = items.filter(m=>{
    let ok = true;
    if(filtroBairro && !(m.local||'').toLowerCase().includes(filtroBairro)) ok=false;
    if(filtroCampo && m.campo !== filtroCampo) ok=false;
    if(filtroNivel && m.nivel !== filtroNivel) ok=false;
    if(filtroHorario){
      const hora = m.hora || '00:00';
      const h = parseInt(hora.split(':')[0],10);
      if(filtroHorario==='manha' && !(h>=6 && h<12)) ok=false;
      if(filtroHorario==='tarde' && !(h>=12 && h<18)) ok=false;
      if(filtroHorario==='noite' && !(h>=18 || h<6)) ok=false;
    }
    return ok;
  });

  list.innerHTML = '';
  if(items.length===0){
    empty.style.display = 'block';
  }else{
    empty.style.display = 'none';
    items.forEach(m=>{
      const card = document.createElement('div');
      card.className = 'card';

      const title = document.createElement('div');
      title.className = 'title';
      title.textContent = m.nome;

      const meta = document.createElement('div');
      meta.className = 'meta';
      meta.innerHTML = `
        <span class="badge">📍 ${m.local || 'A definir'}</span>
        <span class="badge">🗓️ ${formatDate(m.data)} ${m.hora ? 'às '+m.hora : ''}</span>
        <span class="badge">👥 ${Math.max(0, m.vagas - (m.jogadores?.length||0))} vagas</span>
        <span class="badge">🏟️ ${labelCampo(m.campo)}</span>
        ${m.nivel ? `<span class="badge">🎯 ${labelNivel(m.nivel)}</span>`:''}
        ${m.valor ? `<span class="badge">💵 R$ ${Number(m.valor).toFixed(2)}</span>`:''}
        <span class="badge">⚧ ${m.genero || 'Misto'}</span>
      `;

      const miniMap = document.createElement('div');
      miniMap.className = 'mini-map';
      if(m.lat && m.lng){
        const pin = document.createElement('div');
        pin.className = 'mini-pin';
        pin.style.left = (50 + (m.lng % 1)*30)+'%';
        pin.style.top = (50 + (m.lat % 1)*20)+'%';
        miniMap.appendChild(pin);
      }

      const footer = document.createElement('div');
      footer.className = 'footer';
      const btnJoin = document.createElement('button');
      btnJoin.className = 'btn btn-primary btn-small';
      btnJoin.textContent = 'Participar';
      btnJoin.addEventListener('click', ()=>{
        openPartida(m.id);
      });

      const btnVer = document.createElement('button');
      btnVer.className = 'btn btn-outline btn-small';
      btnVer.textContent = 'Ver detalhes';
      btnVer.addEventListener('click', ()=> openPartida(m.id));

      footer.appendChild(btnJoin);
      footer.appendChild(btnVer);

      card.appendChild(title);
      card.appendChild(meta);
      card.appendChild(miniMap);
      card.appendChild(footer);
      list.appendChild(card);
    });
  }

  // Sugestões automáticas baseadas no perfil (simples)
  const sugWrap = document.getElementById('sugestoes');
  const sugList = document.getElementById('sugestoesList');
  if(store.user && store.matches.length>0){
    const nivel = store.user.nivel || '';
    const bairro = ''; // poderia inferir do nome do local
    const sugestoes = store.matches.filter(m=>{
      let ok = true;
      if(nivel && m.nivel && m.nivel!==nivel) ok=false;
      return ok;
    }).slice(0,3);
    if(sugestoes.length){
      sugWrap.style.display = 'block';
      sugList.innerHTML = '';
      sugestoes.forEach(m=>{
        const c = document.createElement('div');
        c.className='card';
        c.innerHTML = `
          <div class="title">${m.nome}</div>
          <div class="meta">
            <span class="badge">📍 ${m.local||'A definir'}</span>
            <span class="badge">🗓️ ${formatDate(m.data)} ${m.hora?'às '+m.hora:''}</span>
          </div>
          <div class="footer">
            <button class="btn btn-primary btn-small" data-id="${m.id}">Participar</button>
          </div>
        `;
        c.querySelector('button').addEventListener('click', ()=> openPartida(m.id));
        sugList.appendChild(c);
      });
    }else{
      sugWrap.style.display = 'none';
    }
  }else{
    sugWrap.style.display = 'none';
  }
}

/* ------------------ CRIAR PARTIDA ------------------ */
document.getElementById('criarForm').addEventListener('submit', (e)=>{
  e.preventDefault();
  const nome = document.getElementById('jogoNome').value.trim();
  const campo = document.getElementById('jogoCampo').value;
  const data = document.getElementById('jogoData').value;
  const hora = document.getElementById('jogoHora').value;
  const vagas = parseInt(document.getElementById('jogoVagas').value,10)||0;
  const valor = document.getElementById('jogoValor').value;
  const genero = document.getElementById('jogoGenero').value;
  const nivel = document.getElementById('jogoNivel').value;
  const local = document.getElementById('jogoLocal').value.trim();
  const lat = parseFloat(document.getElementById('jogoLat').value) || null;
  const lng = parseFloat(document.getElementById('jogoLng').value) || null;
  const obs = document.getElementById('jogoObs').value.trim();
  const dividir = document.getElementById('jogoDividir').checked;

  const id = 'm_'+Date.now();
  const owner = store.user ? store.user.id : null;

  const match = {
    id, nome, campo, data, hora, vagas, valor, genero, nivel, local, lat, lng, obs, dividir,
    owner,
    jogadores: [],
    chat: []
  };
  store.matches.unshift(match);
  saveStore();

  // Notificação
  pushNotif('Partida publicada', `“${nome}” foi publicada para ${formatDate(data)} ${hora? 'às '+hora:''}.`);

  // Vai para a tela da partida
  openPartida(id);
});

// Mapa (mock): clique para posicionar
const mapCriar = document.getElementById('mapCriar');
const mapCriarPin = document.getElementById('mapCriarPin');
mapCriar.addEventListener('click', (e)=>{
  const rect = mapCriar.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const pctX = x / rect.width;
  const pctY = y / rect.height;

  // Converter posição clicada em coordenadas simuladas
  const lat = (-23.43 + (pctY-0.5)*0.2).toFixed(6);
  const lng = (-48.17 + (pctX-0.5)*0.2).toFixed(6);

  mapCriarPin.style.left = (pctX*100)+'%';
  mapCriarPin.style.top = (pctY*100)+'%';
  mapCriarPin.style.display = 'block';

  document.getElementById('jogoLat').value = lat;
  document.getElementById('jogoLng').value = lng;
});

/* ------------------ PARTIDA ------------------ */
function openPartida(id){
  const m = store.matches.find(x=>x.id===id);
  if(!m){ alert('Partida não encontrada.'); return; }

  // Popular campos
  document.getElementById('partidaTitulo').textContent = m.nome;
  document.getElementById('partidaLocal').textContent = m.local || 'Local a definir';
  document.getElementById('partidaDataHora').textContent = `${formatDate(m.data)} ${m.hora? 'às '+m.hora:''}`;
  document.getElementById('partidaCampo').textContent = labelCampo(m.campo);
  document.getElementById('partidaNivel').textContent = labelNivel(m.nivel);
  document.getElementById('partidaValor').textContent = m.valor ? `R$ ${Number(m.valor).toFixed(2)}` : 'Gratuito';
  document.getElementById('partidaGenero').textContent = (m.genero||'Misto');

  // Detalhes
  const detalhes = document.getElementById('partidaDetalhes');
  detalhes.innerHTML = '';
  addDetail(detalhes, 'Vagas', `${Math.max(0, m.vagas - (m.jogadores?.length||0))} de ${m.vagas}`);
  if(m.obs) addDetail(detalhes, 'Observações', m.obs);
  addDetail(detalhes, 'Dividir custo', m.dividir ? 'Ativado (simulado)' : 'Não');
  if(m.owner && store.user && m.owner===store.user.id) addDetail(detalhes, 'Você é o organizador', 'Sim');

  // Jogadores
  const lista = document.getElementById('listaJogadores');
  lista.innerHTML = '';
  (m.jogadores||[]).forEach(u=>{
    lista.appendChild(avatarEl(u));
  });

  // Mapa da partida (mock)
  const pin = document.getElementById('mapPartidaPin');
  if(m.lat && m.lng){
    pin.style.left = (50 + (m.lng % 1)*30)+'%';
    pin.style.top = (50 + (m.lat % 1)*20)+'%';
    pin.style.display = 'block';
  }else{
    pin.style.display = 'none';
  }

  // Botões
  const btnConfirmar = document.getElementById('btnConfirmar');
  btnConfirmar.onclick = ()=>{
    if(!store.user){ return goLogin('Entre para confirmar presença.'); }
    const ja = (m.jogadores||[]).some(j=> j.id === store.user.id);
    if(ja){
      alert('Você já está confirmado nesta partida.');
      return;
    }
    if((m.jogadores?.length||0) >= m.vagas){
      alert('Não há vagas disponíveis.');
      return;
    }
    m.jogadores.push(minUser(store.user));
    saveStore();
    pushNotif('Confirmação de presença', `Você confirmou presença em “${m.nome}”.`);
    // ranking de presença
    store.user.ranking = (store.user.ranking||0) + 1;
    saveStore();
    // atualizar UI
    openPartida(m.id);
  };

  document.getElementById('btnAbrirChat').onclick = ()=>{
    if(!store.user){ return goLogin('Entre para participar do chat.'); }
    openChat(m.id);
  };

  // Navega
  location.hash = '#partida';
}

function addDetail(list, label, value){
  const li = document.createElement('li');
  li.innerHTML = `<strong>${label}:</strong> ${value}`;
  list.appendChild(li);
}

function labelCampo(c){
  if(c==='grama') return 'Grama';
  if(c==='society') return 'Society';
  if(c==='futsal') return 'Futsal';
  return 'Campo';
}
function labelNivel(n){
  if(n==='iniciante') return 'Iniciante';
  if(n==='intermediario') return 'Intermediário';
  if(n==='avancado') return 'Avançado';
  return 'Nível';
}
function formatDate(iso){
  if(!iso) return 'Data a definir';
  const [y,m,d] = iso.split('-').map(Number);
  if(!y||!m||!d) return iso;
  return `${d.toString().padStart(2,'0')}/${m.toString().padStart(2,'0')}/${y}`;
}

/* ------------------ CHAT ------------------ */
const chatModal = document.getElementById('chatModal');
document.getElementById('chatClose').addEventListener('click', ()=> chatModal.classList.remove('show'));

function openChat(matchId){
  chatModal.dataset.matchId = matchId;
  renderChat();
  chatModal.classList.add('show');
}

function renderChat(){
  const matchId = chatModal.dataset.matchId;
  const m = store.matches.find(x=>x.id===matchId);
  const box = document.getElementById('chatMensagens');
  box.innerHTML = '';
  (m.chat||[]).forEach(msg=>{
    const div = document.createElement('div');
    div.className = 'msg' + (store.user && msg.userId===store.user.id ? ' me' : '');
    div.innerHTML = `<strong>${msg.userName}:</strong> ${escapeHTML(msg.text)} <div style="font-size:11px;color:#888;">${new Date(msg.ts).toLocaleString()}</div>`;
    box.appendChild(div);
  });
  box.scrollTop = box.scrollHeight;
}

document.getElementById('chatForm').addEventListener('submit', (e)=>{
  e.preventDefault();
  const matchId = chatModal.dataset.matchId;
  const m = store.matches.find(x=>x.id===matchId);
  if(!m){ return; }
  const text = document.getElementById('chatTexto').value.trim();
  if(!text) return;
  if(!store.user){ return goLogin('Entre para enviar mensagens.'); }

  m.chat = m.chat || [];
  m.chat.push({
    userId: store.user.id,
    userName: store.user.nome || 'Você',
    text,
    ts: Date.now()
  });
  saveStore();
  document.getElementById('chatTexto').value = '';
  renderChat();
});

/* ------------------ PERFIL ------------------ */
function avatarEl(user){
  const d = document.createElement('div');
  d.className = 'avatar';
  d.title = user.nome || 'Jogador';
  d.textContent = initials(user.nome || '?');
  return d;
}
function initials(name){
  return name.split(' ').slice(0,2).map(p=>p[0]||'').join('').toUpperCase();
}
function minUser(u){ return { id:u.id, nome:u.nome, posicao:u.posicao || '', nivel:u.nivel || '' }; }

function renderPerfil(){
  if(!store.user) return;
  document.getElementById('perfilNome').value = store.user.nome || '';
  document.getElementById('perfilPosicao').value = store.user.posicao || '';
  document.getElementById('perfilNivel').value = store.user.nivel || 'iniciante';
  document.getElementById('perfilAvaliacoes').value = store.user.avaliacoes || '';
  document.getElementById('statPartidas').textContent = store.user.partidas || 0;
  document.getElementById('statGols').textContent = store.user.gols || 0;
  document.getElementById('statRanking').textContent = store.user.ranking || 0;

  const hist = document.getElementById('perfilHistorico');
  hist.innerHTML = '';
  const played = store.matches.filter(m => (m.jogadores||[]).some(j=>j.id===store.user.id));
  played.forEach(m=>{
    const c = document.createElement('div');
    c.className='card';
    c.innerHTML = `
      <div class="title">${m.nome}</div>
      <div class="meta">
        <span class="badge">📍 ${m.local||'A definir'}</span>
        <span class="badge">🗓️ ${formatDate(m.data)} ${m.hora? 'às '+m.hora:''}</span>
      </div>
    `;
    hist.appendChild(c);
  });
}

document.getElementById('perfilSalvar').addEventListener('click', ()=>{
  if(!store.user) return;
  store.user.nome = document.getElementById('perfilNome').value.trim() || store.user.nome;
  store.user.posicao = document.getElementById('perfilPosicao').value;
  store.user.nivel = document.getElementById('perfilNivel').value;
  store.user.avaliacoes = document.getElementById('perfilAvaliacoes').value.trim();
  saveStore();
  renderHeaderByAuth();
  alert('Perfil salvo!');
});

document.getElementById('perfilSair').addEventListener('click', ()=>{
  store.user = null;
  saveStore();
  renderHeaderByAuth();
  location.hash = '#home';
});

document.getElementById('perfilTrocarAvatar').addEventListener('click', ()=>{
  alert('Use sua criatividade: este demo usa iniciais como avatar 😉');
});

/* ------------------ NOTIFICAÇÕES ------------------ */
function pushNotif(title, text){
  store.notifications.unshift({ id:'n_'+Date.now(), title, text, ts: Date.now(), read:false });
  saveStore();
  renderNotificacoes();
}
function renderNotificacoes(){
  const wrap = document.getElementById('notificacoesLista');
  if(!wrap) return;
  wrap.innerHTML = '';
  if((store.notifications||[]).length===0){
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.innerHTML = '<h4>Sem notificações</h4><p>Você verá lembretes, convites e alterações aqui.</p>';
    wrap.appendChild(empty);
    return;
  }
  store.notifications.forEach(n=>{
    const row = document.createElement('div');
    row.className = 'notification';
    row.innerHTML = `
      <div>
        <div><strong>${n.title}</strong></div>
        <div style="color:#666; font-size:13px;">${n.text}</div>
      </div>
      <div style="font-size:12px; color:#888;">${new Date(n.ts).toLocaleString()}</div>
    `;
    wrap.appendChild(row);
  });
}

/* ------------------ LOGIN ------------------ */
function renderHeaderByAuth(){
  const perfil = document.getElementById('menu-perfil');
  const login = document.getElementById('menu-login');
  if(store.user){
    perfil.style.display = '';
    login.textContent = 'Sair';
    login.href = '#home';
    login.onclick = (e)=>{
      e.preventDefault();
      store.user = null;
      saveStore();
      renderHeaderByAuth();
      location.hash = '#home';
    };
  }else{
    perfil.style.display = 'none';
    login.textContent = 'Login/Registrar';
    login.href = '#login';
    login.onclick = null;
  }
}
function goLogin(msg){
  if(msg) alert(msg);
  location.hash = '#login';
}

// Login formulário
document.getElementById('loginForm').addEventListener('submit', (e)=>{
  e.preventDefault();
  const nome = document.getElementById('loginNome').value.trim();
  const email = document.getElementById('loginEmail').value.trim();
  if(!nome || !email) return;
  store.user = { id: 'u_'+Date.now(), nome, email, nivel:'intermediario', partidas:0, gols:0, ranking:0 };
  saveStore();
  renderHeaderByAuth();
  renderPerfil();
  pushNotif('Bem-vindo!', `Olá, ${nome}! Explore partidas ou crie a sua.`);
  location.hash = '#home';
});

// Login social (simulado)
document.getElementById('loginGoogle').addEventListener('click', ()=>{
  store.user = { id: 'u_'+Date.now(), nome:'Jogador Google', email:'google@exemplo.com', nivel:'iniciante', partidas:0, gols:0, ranking:0 };
  saveStore(); renderHeaderByAuth(); renderPerfil(); pushNotif('Login', 'Você entrou com Google (simulado).'); location.hash = '#home';
});
document.getElementById('loginFacebook').addEventListener('click', ()=>{
  store.user = { id: 'u_'+Date.now(), nome:'Jogador Facebook', email:'facebook@exemplo.com', nivel:'intermediario', partidas:0, gols:0, ranking:0 };
  saveStore(); renderHeaderByAuth(); renderPerfil(); pushNotif('Login', 'Você entrou com Facebook (simulado).'); location.hash = '#home';
});

/* ------------------ EVENTOS DIVERSOS ------------------ */
document.querySelectorAll('a.nav-link[href="#perfil"]').forEach(a => {
  a.addEventListener('click', ()=>{
    if(!store.user){ goLogin('Entre para acessar o seu perfil.'); }
    else renderPerfil();
  });
});

document.querySelectorAll('a.nav-link[href="#home"]').forEach(a=>{
  a.addEventListener('click', ()=> renderMatches());
});

document.querySelector('.brand').addEventListener('click', ()=> location.hash = '#home');

/* ------------------ HELPERS ------------------ */
function escapeHTML(str){
  return str.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
}
```
