document.addEventListener('DOMContentLoaded', function() {
  const statusLeitosContainer = document.getElementById('statusLeitosContainer');
  const noActiveBeds = document.getElementById('noActiveBeds');
  const registroStatusForm = document.getElementById('registroStatusForm');
  const registroManualForm = document.getElementById('registroManualForm');
  const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxjaQoyr-iZoK6AEywBkpfmukcVds3PhENUyNEFMXtHD5wkpACvQW0L21pTiJyO_XE4KA/exec';

  let activeBeds = JSON.parse(localStorage.getItem('activeBeds')) || {};
  let intervalId = null;

  // ========== FUNÇÕES AUXILIARES ==========
  function formatTime(date) {
    return date.toTimeString().slice(0, 5);
  }

  function formatDuration(startTime) {
    const diff = new Date().getTime() - startTime;
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`;
  }

  function getEncarregada(suffix) {
    const checked = document.querySelector(`input[name="encarregada_${suffix}"]:checked`);
    if (!checked) return null;
    if (checked.value.toUpperCase() === 'OUTRA') {
      const outra = document.getElementById(`outra_encarregada_${suffix}`);
      return outra && outra.value.trim() ? outra.value.toUpperCase() : null;
    }
    return checked.value.toUpperCase();
  }

  function saveActiveBeds() {
    localStorage.setItem('activeBeds', JSON.stringify(activeBeds));
  }

  // ========== ENVIO PARA PLANILHA ==========
  function sendDataToAppsScript(data, key) {
    fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json' },
      mode: 'no-cors'
    })
    .then(() => {
      if (key && activeBeds[key]) {
        delete activeBeds[key];
        saveActiveBeds();
        renderStatusCards();
      }
      showMessage('success', `Registro do leito ${data.andar}/${data.leito} ENVIADO com sucesso!`);
    })
    .catch(err => {
      console.error('Erro ao enviar: ', err);
      showMessage('error', 'Erro ao enviar o registro. Verifique o link do Apps Script e tente novamente.');
    });
  }

  // ========== STATUS EM TEMPO REAL ==========
  function renderStatusCards() {
    statusLeitosContainer.innerHTML = '';
    const keys = Object.keys(activeBeds);

    if (keys.length === 0) {
      noActiveBeds.style.display = 'block';
      if (intervalId) clearInterval(intervalId);
      intervalId = null;
      return;
    }

    noActiveBeds.style.display = 'none';
    keys.forEach(key => {
      const bed = activeBeds[key];
      const card = `
        <div class="col" id="status-card-${key}">
          <div class="card bed-status-card">
            <h5>Andar ${bed.andar} / Leito ${bed.leito}</h5>
            <p>Colaboradora: ${bed.colaboradora}</p>
            <p>Início: ${bed.hora_inicio}</p>
            <p class="status-time" id="duration-${key}">00:00:00</p>
            <button class="btn btn-sm btn-primary btn-finalizar" data-key="${key}">Finalizar Limpeza</button>
          </div>
        </div>`;
      statusLeitosContainer.innerHTML += card;
    });

    document.querySelectorAll('.btn-finalizar').forEach(btn => {
      btn.addEventListener('click', handleFinalizarClick);
    });

    if (!intervalId) intervalId = setInterval(updateDurations, 1000);
  }

  function updateDurations() {
    Object.keys(activeBeds).forEach(key => {
      const el = document.getElementById(`duration-${key}`);
      if (el) el.textContent = formatDuration(activeBeds[key].timestamp);
    });
  }

  function handleFinalizarClick(e) {
    const key = e.target.dataset.key;
    const bed = activeBeds[key];
    const horaTermino = formatTime(new Date());
    const finalData = {
      andar: bed.andar,
      leito: bed.leito,
      hora_inicio: bed.hora_inicio,
      hora_termino: horaTermino,
      colaboradora: bed.colaboradora,
      encarregada: bed.encarregada,
      no_sistema: bed.no_sistema,
      observacoes: bed.observacoes || ''
    };
    sendDataToAppsScript(finalData, key);
  }

  // ========== FORMULÁRIOS ==========
  function setupEncarregadaToggle(prefix) {
    const radios = document.getElementsByName(`encarregada_${prefix}`);
    const div = document.getElementById(`outra_encarregada_div_${prefix}`);
    const input = document.getElementById(`outra_encarregada_${prefix}`);
    radios.forEach(r => {
      r.addEventListener('change', () => {
        div.style.display = r.value === 'outra' ? 'block' : 'none';
        if (r.value !== 'outra') input.value = '';
      });
    });
  }

  registroStatusForm.addEventListener('submit', e => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {};
    formData.forEach((v, k) => data[k] = v.toUpperCase());
    const andar = data.ANDAR;
    const leito = data.LEITO;
    const key = `${andar}-${leito}`;
    const encarregada = getEncarregada('status');
    if (!andar || !leito || !data.COLABORADORA || !encarregada || !data.NO_SISTEMA) {
      showMessage('error', 'Preencha todos os campos obrigatórios.');
      return;
    }
    if (activeBeds[key]) {
      showMessage('error', `O leito ${andar}/${leito} já está ativo.`);
      return;
    }

    const now = new Date();
    activeBeds[key] = {
      andar, leito,
      colaboradora: data.COLABORADORA,
      encarregada,
      no_sistema: data.NO_SISTEMA,
      observacoes: data.OBSERVACOES || '',
      hora_inicio: formatTime(now),
      timestamp: now.getTime()
    };
    saveActiveBeds();
    renderStatusCards();
    showMessage('info', `Higienização do leito ${andar}/${leito} iniciada.`);
    e.target.reset();
  });

  registroManualForm.addEventListener('submit', e => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {};
    formData.forEach((v, k) => data[k] = v.toUpperCase());
    const encarregada = getEncarregada('manual');
    const required = ['ANDAR','LEITO','HORA_INICIO','HORA_TERMINO','COLABORADORA','NO_SISTEMA'];
    for (let f of required) if (!data[f]) return showMessage('error', `Campo obrigatório: ${f}`);
    if (!encarregada) return showMessage('error', 'Informe a encarregada.');

    const base = '1970-01-01T';
    let inicio = new Date(`${base}${data.HORA_INICIO}:00`).getTime();
    let fim = new Date(`${base}${data.HORA_TERMINO}:00`).getTime();
    if (fim <= inicio) fim += 86400000;
    if (isNaN(inicio) || isNaN(fim)) return showMessage('error','Horas inválidas.');

    const finalData = {
      andar: data.ANDAR,
      leito: data.LEITO,
      hora_inicio: data.HORA_INICIO,
      hora_termino: data.HORA_TERMINO,
      colaboradora: data.COLABORADORA,
      encarregada,
      no_sistema: data.NO_SISTEMA,
      observacoes: data.OBSERVACOES || ''
    };
    sendDataToAppsScript(finalData);
    e.target.reset();
  });

  // ========== HISTÓRICO (SEM SENHA) ==========
  function carregarHistorico() {
    const tabelaDiv = document.getElementById('historicoTabela');
    tabelaDiv.innerHTML = '<p>Carregando histórico...</p>';
    fetch(`${APPS_SCRIPT_URL}?encarregada=RISOCLEIDE`)
      .then(res => res.json())
      .then(data => gerarTabelaHistorico(data, tabelaDiv))
      .catch(() => {
        const fake = [
          { "Data Registro": "2025-10-14", "Andar": "1", "Leito": "101", "Hora de Início": "08:00", "Hora de Término": "09:00", "Colaboradora": "ANA", "Encarregada": "RISOCLEIDE", "No Sistema": "SIM", "Observações": "Teste local" }
        ];
        gerarTabelaHistorico(fake, tabelaDiv);
      });
  }

  function gerarTabelaHistorico(data, tabelaDiv) {
    if (!data || !data.length) {
      tabelaDiv.innerHTML = '<p class="text-warning">Nenhum registro encontrado.</p>';
      return;
    }
    let html = '<table class="table table-striped"><thead><tr><th>Data Registro</th><th>Andar</th><th>Leito</th><th>Hora Início</th><th>Hora Término</th><th>Colaboradora</th><th>Encarregada</th><th>No Sistema</th><th>Observações</th></tr></thead><tbody>';
    data.forEach(r => {
      html += `<tr><td>${r["Data Registro"]||'-'}</td><td>${r["Andar"]||'-'}</td><td>${r["Leito"]||'-'}</td><td>${r["Hora de Início"]||'-'}</td><td>${r["Hora de Término"]||'-'}</td><td>${r["Colaboradora"]||'-'}</td><td>${r["Encarregada"]||'-'}</td><td>${r["No Sistema"]||'-'}</td><td>${r["Observações"]||'-'}</td></tr>`;
    });
    html += '</tbody></table>';
    tabelaDiv.innerHTML = html;
  }

  // ========== MENSAGENS ==========
  function showMessage(type, message) {
    const msgDiv = document.getElementById('mensagem');
    msgDiv.innerHTML = `<div class="alert alert-${type === 'success' ? 'success' : type === 'info' ? 'info' : 'danger'} alert-dismissible fade show">
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>`;
  }

  // ========== TABS ==========
  document.getElementById('tabRegistro').addEventListener('click', () => {
    document.getElementById('registroContainer').style.display = 'block';
    document.getElementById('historicoContainer').style.display = 'none';
  });

  document.getElementById('tabHistorico').addEventListener('click', () => {
    document.getElementById('registroContainer').style.display = 'none';
    document.getElementById('historicoContainer').style.display = 'block';
    carregarHistorico();
  });

  // ========== INICIALIZA ==========
  setupEncarregadaToggle('status');
  setupEncarregadaToggle('manual');
  renderStatusCards();
});
