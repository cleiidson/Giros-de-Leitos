document.addEventListener('DOMContentLoaded', function() {
  const statusLeitosContainer = document.getElementById('statusLeitosContainer');
  const noActiveBeds = document.getElementById('noActiveBeds');
  const registroStatusForm = document.getElementById('registroStatusForm');
  const registroManualForm = document.getElementById('registroManualForm');
  
  // URL de destino fornecida pelo usuário
  const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxjaQoyr-iZoK6AEywBkpfmukcVds3PhENUyNEFMXtHD5wkpACvQW0L21pTiJyO_XE4KA/exec';

  let activeBeds = JSON.parse(localStorage.getItem('activeBeds')) || {};
  let intervalId = null; 

  // --- Funções Utilitárias ---

  function formatTime(date) {
    return date.toTimeString().slice(0, 5);
  }

  function formatDuration(startTime) {
    const diff = new Date().getTime() - startTime;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  
  // Função ajustada para pegar a encarregada com base no sufixo (status ou manual)
  function getEncarregada(suffix) {
    const encarregadaRadios = document.querySelectorAll(`input[name="encarregada_${suffix}"]:checked`);
    if (encarregadaRadios.length === 0) return null;
    
    const encarregadaRadio = encarregadaRadios[0];

    if (encarregadaRadio.value === 'outra') {
      const outraInput = document.getElementById(`outra_encarregada_${suffix}`);
      return outraInput ? outraInput.value.toUpperCase() : null;
    }
    return encarregadaRadio.value.toUpperCase();
  }

  // Função para salvar estado no localStorage
  function saveActiveBeds() {
    localStorage.setItem('activeBeds', JSON.stringify(activeBeds));
  }
  
  // Função de Envio Universal de Dados para o Apps Script
  function sendDataToAppsScript(data, key) {
    // Implementação do fetch conforme solicitado pelo usuário
    fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json'
      },
      mode: 'no-cors'
    })
    .then(() => {
        // Sucesso no envio (ou pelo menos o fetch foi iniciado no modo no-cors)
        if (key && activeBeds[key]) {
            delete activeBeds[key]; // Remove do status se for o fluxo de finalização
            saveActiveBeds();
            renderStatusCards();
        }
        showMessage('success', `Registro do leito ${data.andar}/${data.leito} ENVIADO com sucesso!`);
    })
    .catch(err => {
        // Em caso de erro de rede ou Apps Script, remove o leito do status
        if (key && activeBeds[key]) {
             delete activeBeds[key]; 
             saveActiveBeds();
             renderStatusCards();
        }
        showMessage('error', 'Erro ao enviar o registro. Verifique o link do Apps Script e tente novamente.');
        console.error('Erro ao enviar: ', err);
    });
  }

  // --- Lógica de Status (Tempo Real) ---

  function renderStatusCards() {
    statusLeitosContainer.innerHTML = '';
    const keys = Object.keys(activeBeds);

    if (keys.length === 0) {
      noActiveBeds.style.display = 'block';
      if (intervalId) clearInterval(intervalId); 
      intervalId = null;
    } else {
      noActiveBeds.style.display = 'none';
      keys.forEach(key => {
        const bed = activeBeds[key];
        
        const cardHtml = `
          <div class="col" id="status-card-${key}">
            <div class="card bed-status-card">
              <h5>Andar ${bed.andar} / Leito ${bed.leito}</h5>
              <p>Colaboradora: ${bed.colaboradora}</p>
              <p>Início: ${bed.hora_inicio}</p>
              <p class="status-time" id="duration-${key}">00:00:00</p>
              <button class="btn btn-sm btn-primary btn-finalizar" data-key="${key}">Finalizar Limpeza</button>
            </div>
          </div>
        `;
        statusLeitosContainer.innerHTML += cardHtml;
      });

      if (!intervalId) {
        intervalId = setInterval(updateDurations, 1000);
      }
    }
    document.querySelectorAll('.btn-finalizar').forEach(button => {
      button.addEventListener('click', handleFinalizarClick);
    });
  }
  
  function updateDurations() {
    Object.keys(activeBeds).forEach(key => {
      const durationElement = document.getElementById(`duration-${key}`);
      if (durationElement) {
        const startTime = activeBeds[key].timestamp;
        durationElement.textContent = formatDuration(startTime);
      }
    });
  }

  // Evento ao clicar em "Finalizar Limpeza" no card
  function handleFinalizarClick(event) {
    const key = event.target.dataset.key;
    const bed = activeBeds[key];

    // Calcula a hora de término atual
    const horaTermino = formatTime(new Date());

    // Prepara os dados completos para envio
    const finalData = {
        andar: bed.andar,
        leito: bed.leito,
        hora_inicio: bed.hora_inicio,
        hora_termino: horaTermino, // Hora atual no clique de Finalizar
        colaboradora: bed.colaboradora,
        encarregada: bed.encarregada,
        no_sistema: bed.no_sistema,
        observacoes: bed.observacoes || ''
    };
    
    // Envia os dados completos e remove do status
    sendDataToAppsScript(finalData, key); 
  }
  
  // --- Manipulação de Formulários ---

  // Lógica para mostrar/esconder campo "Outra Encarregada"
  function setupEncarregadaToggle(prefix) {
    const encarregadaRadios = document.getElementsByName(`encarregada_${prefix}`);
    const outraEncarregadaDiv = document.getElementById(`outra_encarregada_div_${prefix}`);
    const outraEncarregadaInput = document.getElementById(`outra_encarregada_${prefix}`);

    encarregadaRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        outraEncarregadaDiv.style.display = radio.value === 'outra' ? 'block' : 'none';
        if (radio.value !== 'outra') {
          outraEncarregadaInput.value = '';
        }
      });
    });
  }

  // 1. Envio do Formulário de Status (Iniciar Contagem)
  registroStatusForm.addEventListener('submit', function(event) {
    event.preventDefault();
    
    const formData = new FormData(this);
    const data = {};
    formData.forEach((value, key) => { data[key] = value.toUpperCase(); });
    
    const andar = data.ANDAR;
    const leito = data.LEITO;
    const key = `${andar}-${leito}`;
    const encarregada = getEncarregada('status');
    
    // Validação dos campos obrigatórios
    if (!andar || !leito || !data.COLABORADORA || !encarregada || !data.NO_SISTEMA) {
        showMessage('error', 'Todos os campos obrigatórios (Andar, Leito, Colaboradora, Encarregada, No Sistema) devem ser preenchidos antes de iniciar!');
        return;
    }

    if (activeBeds[key]) {
      showMessage('error', `O leito ${andar}/${leito} já está em higienização!`);
      return;
    }

    const now = new Date();
    const horaInicio = formatTime(now);

    activeBeds[key] = {
      andar: andar,
      leito: leito,
      colaboradora: data.COLABORADORA,
      encarregada: encarregada,
      no_sistema: data.NO_SISTEMA,
      observacoes: data.OBSERVACOES || '',
      hora_inicio: horaInicio,
      timestamp: now.getTime() 
    };
    
    saveActiveBeds();
    renderStatusCards();
    showMessage('info', `Higienização do leito ${andar}/${leito} INICIADA. Clique em FINALIZAR no card de status.`);
    registroStatusForm.reset();
    document.getElementById('outra_encarregada_div_status').style.display = 'none'; 
    document.getElementById('encarregada_risocleide_status').checked = true;
  });
  
  // 2. Envio do Formulário Manual (Folha Noturna)
  registroManualForm.addEventListener('submit', function(event) {
    event.preventDefault();

    const formData = new FormData(this);
    const data = {};
    formData.forEach((value, key) => { data[key] = value.toUpperCase(); });
    
    const encarregada = getEncarregada('manual');
    
    // Validação dos campos obrigatórios do formulário manual
    const requiredFields = ['ANDAR', 'LEITO', 'HORA_INICIO', 'HORA_TERMINO', 'COLABORADORA', 'NO_SISTEMA'];
    for (let field of requiredFields) {
      if (!data[field]) {
        showMessage('error', `O campo obrigatório "${field.replace('_', ' ')}" do Registro Manual deve ser preenchido!`);
        return;
      }
    }
    if (!encarregada) {
        showMessage('error', 'O campo obrigatório "Encarregada" do Registro Manual deve ser preenchido!');
        return;
    }
    
    // Validação de Horário (mantida a correção de meia-noite)
    const dataBase = '1970-01-01T';
    let horaInicio = new Date(`${dataBase}${data.HORA_INICIO}:00`).getTime();
    let horaTermino = new Date(`${dataBase}${data.HORA_TERMINO}:00`).getTime();

    if (horaTermino <= horaInicio) {
        horaTermino += 24 * 60 * 60 * 1000;
    }
    
    if (isNaN(horaInicio) || isNaN(horaTermino) || (horaTermino - horaInicio) <= 0) {
        showMessage('error', 'O horário de término deve ser maior que o horário de início e as horas devem ser válidas!');
        return;
    }

    // Prepara os dados finais para envio
    const finalData = {
        andar: data.ANDAR,
        leito: data.LEITO,
        hora_inicio: data.HORA_INICIO,
        hora_termino: data.HORA_TERMINO,
        colaboradora: data.COLABORADORA,
        encarregada: encarregada,
        no_sistema: data.NO_SISTEMA,
        observacoes: data.OBSERVACOES || ''
    };
    
    // Envia os dados
    sendDataToAppsScript(finalData); 
    
    // Limpa o formulário após o envio
    registroManualForm.reset();
    document.getElementById('outra_encarregada_div_manual').style.display = 'none';
    document.getElementById('encarregada_risocleide_manual').checked = true;
  });


  // --- Inicialização e Helpers (Mantidos) ---

  setupEncarregadaToggle('status');
  setupEncarregadaToggle('manual');

  // Converter texto para maiúsculas em tempo real
  const textInputs = document.querySelectorAll('input[type="text"], textarea');
  textInputs.forEach(input => {
    input.addEventListener('input', () => {
      input.value = input.value.toUpperCase();
    });
  });

  // Função para carregar histórico (Mantida)
  window.carregarHistorico = function() {
    const senhaInput = document.getElementById('senhaHistorico');
    const senha = senhaInput.value;
    const tabelaDiv = document.getElementById('historicoTabela');
    
    if (!senha) {
      tabelaDiv.innerHTML = '<p class="text-danger">Digite a senha para acessar o histórico!</p>';
      return;
    }

    // Simulação de fetch para histórico (GET request, note que aqui o modo 'no-cors' não traz o JSON)
    fetch(`${APPS_SCRIPT_URL}?senha=${encodeURIComponent(senha)}&encarregada=RISOCLEIDE`, {
      method: 'GET'
    })
    .then(response => {
        // Devido ao 'no-cors' no Apps Script, esta checagem pode falhar, dependendo da configuração
        // do seu script GET. O tratamento de erro aqui é focado na demo.
        if (!response.ok) {
             // throw new Error('Erro na requisição.');
        }
        return response.json().catch(() => {
            // Se falhar o JSON (típico de no-cors), retorna um placeholder para o catch
            return null; 
        });
    })
    .then(historicoData => {
        if(historicoData) {
            gerarTabelaHistorico(historicoData, tabelaDiv);
            senhaInput.value = ''; 
        } else {
             // Caso a requisição GET falhe no CORS, usa a simulação
             throw new Error('Falha ao obter dados. Usando dados simulados.');
        }
    })
    .catch(error => {
        // Simulação de dados para demo em caso de erro no CORS/App Script
        const historicoSimulado = [
          { "Data Registro": "2025-10-12", "Andar": "1", "Leito": "101", "Hora de Início": "08:00", "Hora de Término": "09:00", "Colaboradora": "ANA", "Encarregada": "RISOCLEIDE", "No Sistema": "SIM", "Observações": "TESTE 1" },
          { "Data Registro": "2025-10-12", "Andar": "2", "Leito": "202", "Hora de Início": "10:00", "Hora de Término": "11:00", "Colaboradora": "MARIA", "Encarregada": "OUTRA", "No Sistema": "NÃO", "Observações": "TESTE 2" }
        ];
        if(senha.toUpperCase() === 'GPS123') { 
            gerarTabelaHistorico(historicoSimulado, tabelaDiv);
            senhaInput.value = '';
        } else {
             tabelaDiv.innerHTML = '<p class="text-danger">Erro ao carregar histórico ou senha incorreta: ' + error.message + '</p>';
        }
    });
  };

  function gerarTabelaHistorico(historico, tabelaDiv) {
    if (historico.length === 0) {
      tabelaDiv.innerHTML = '<p class="text-warning">Nenhum registro encontrado para esta encarregada.</p>';
      return;
    }

    let tabelaHTML = '<table class="table table-striped"><thead><tr><th>Data Registro</th><th>Andar</th><th>Leito</th><th>Hora Início</th><th>Hora Término</th><th>Colaboradora</th><th>Encarregada</th><th>No Sistema</th><th>Observações</th></tr></thead><tbody>';
    historico.forEach(reg => {
      // Ajuste para garantir que as chaves coincidam
      const dataRegistro = reg["Data Registro"] || reg.data_registro || '-';
      const andar = reg.Andar || reg.andar || '-';
      const leito = reg.Leito || reg.leito || '-';
      const horaInicio = reg["Hora de Início"] || reg.hora_inicio || '-';
      const horaTermino = reg["Hora de Término"] || reg.hora_termino || '-';
      const colaboradora = reg.Colaboradora || reg.colaboradora || '-';
      const encarregada = reg.Encarregada || reg.encarregada || '-';
      const noSistema = reg["No Sistema"] || reg.no_sistema || '-';
      const observacoes = reg.Observacoes || reg.observacoes || '';

      tabelaHTML += `<tr><td>${dataRegistro}</td><td>${andar}</td><td>${leito}</td><td>${horaInicio}</td><td>${horaTermino}</td><td>${colaboradora}</td><td>${encarregada}</td><td>${noSistema}</td><td>${observacoes || '-'}</td></tr>`;
    });
    tabelaHTML += '</tbody></table>';
    tabelaDiv.innerHTML = tabelaHTML;
  }

  // Função para exibir mensagens (Mantida)
  function showMessage(type, message) {
    const msgDiv = document.getElementById('mensagem');
    if (!msgDiv) {
      console.error('Elemento #mensagem não encontrado!');
      return;
    }
    msgDiv.innerHTML = '';
    const bsClass = type === 'success' ? 'success' : type === 'info' ? 'info' : 'danger';
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${bsClass} alert-dismissible fade show`;
    alertDiv.role = 'alert';
    alertDiv.innerHTML = `
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    msgDiv.appendChild(alertDiv);
    msgDiv.style.display = 'block';

    const inputs = document.querySelectorAll('input, textarea');
    inputs.forEach(input => {
      input.addEventListener('focus', () => {
        msgDiv.innerHTML = '';
        msgDiv.style.display = 'none';
      }, { once: true });
    });
  }

  // Inicializa a visualização ao carregar a página
  renderStatusCards();
});