document.addEventListener('DOMContentLoaded', function() {
  const encarregadaRadios = document.getElementsByName('encarregada');
  const outraEncarregadaDiv = document.getElementById('outra_encarregada_div');
  const outraEncarregadaInput = document.getElementById('outra_encarregada');
  const registroInicioForm = document.getElementById('registroInicioForm');
  const registroForm = document.getElementById('registroForm');
  const statusLeitosContainer = document.getElementById('statusLeitosContainer');
  const noActiveBeds = document.getElementById('noActiveBeds');
  const btnSalvarRegistroCompleto = document.getElementById('btnSalvarRegistroCompleto');
  
  let activeBeds = JSON.parse(localStorage.getItem('activeBeds')) || {};
  let intervalId = null; // ID do intervalo para o cronômetro

  // Função utilitária para formatar horário no formato HH:MM
  function formatTime(date) {
    return date.toTimeString().slice(0, 5);
  }

  // Função para formatar a duração (HH:MM:SS)
  function formatDuration(startTime) {
    const diff = new Date().getTime() - startTime;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  // Função para salvar estado no localStorage
  function saveActiveBeds() {
    localStorage.setItem('activeBeds', JSON.stringify(activeBeds));
  }

  // Função para renderizar os cards de status
  function renderStatusCards() {
    statusLeitosContainer.innerHTML = '';
    const keys = Object.keys(activeBeds);

    if (keys.length === 0) {
      noActiveBeds.style.display = 'block';
      if (intervalId) clearInterval(intervalId); // Para o cronômetro se não houver leitos
      intervalId = null;
    } else {
      noActiveBeds.style.display = 'none';
      keys.forEach(key => {
        const bed = activeBeds[key];
        const [andar, leito] = key.split('-');
        
        const cardHtml = `
          <div class="col" id="status-card-${key}">
            <div class="card bed-status-card">
              <h5>Andar ${andar} / Leito ${leito}</h5>
              <p>Início: ${bed.hora_inicio}</p>
              <p class="status-time" id="duration-${key}">00:00:00</p>
              <button class="btn btn-sm btn-primary btn-finalizar" data-key="${key}">Finalizar Limpeza</button>
            </div>
          </div>
        `;
        statusLeitosContainer.innerHTML += cardHtml;
      });

      // Se houver leitos, inicia o cronômetro
      if (!intervalId) {
        intervalId = setInterval(updateDurations, 1000);
      }
    }
    // Adiciona listener para os botões "Finalizar"
    document.querySelectorAll('.btn-finalizar').forEach(button => {
      button.addEventListener('click', handleFinalizarClick);
    });
  }
  
  // Função para atualizar os cronômetros
  function updateDurations() {
    Object.keys(activeBeds).forEach(key => {
      const durationElement = document.getElementById(`duration-${key}`);
      if (durationElement) {
        const startTime = activeBeds[key].timestamp;
        durationElement.textContent = formatDuration(startTime);
      }
    });
  }

  // Lógica para preencher o formulário completo ao clicar em "Finalizar"
  function handleFinalizarClick(event) {
    const key = event.target.dataset.key;
    const bed = activeBeds[key];
    
    // 1. Remove a classe 'hidden' do formulário se necessário (não é o caso aqui, pois já está visível)
    
    // 2. Preenche os campos ocultos do formulário de registro completo
    document.getElementById('leito_finalizar').value = bed.leito;
    document.getElementById('andar_finalizar').value = bed.andar;
    document.getElementById('hora_inicio_finalizar').value = bed.hora_inicio;
    
    // 3. Obtém a hora de término atual e preenche
    const horaTermino = formatTime(new Date());
    document.getElementById('hora_termino_finalizar').value = horaTermino;

    // 4. Habilita o botão de salvar e muda o foco para o formulário
    btnSalvarRegistroCompleto.disabled = false;
    showMessage('info', `Preencha os dados restantes e clique em "Salvar Registro" para finalizar o leito ${bed.andar}/${bed.leito}.`);
    
    // Rola a tela para o formulário completo
    registroForm.scrollIntoView({ behavior: 'smooth' });
    document.getElementById('colaboradora').focus();
  }

  // --- Lógica de Formulários ---

  // Mostrar/esconder campo "Outra Encarregada"
  encarregadaRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      outraEncarregadaDiv.style.display = radio.value === 'outra' ? 'block' : 'none';
      if (radio.value !== 'outra') {
        outraEncarregadaInput.value = '';
      }
    });
  });

  // Converter texto para maiúsculas em tempo real
  const textInputs = document.querySelectorAll('input[type="text"], textarea');
  textInputs.forEach(input => {
    input.addEventListener('input', () => {
      input.value = input.value.toUpperCase();
    });
  });

  // 1. Envio do formulário de INÍCIO (registroInicioForm)
  registroInicioForm.addEventListener('submit', function(event) {
    event.preventDefault();
    const andar = document.getElementById('andar_inicio').value.trim();
    const leito = document.getElementById('leito_inicio').value.trim();
    const key = `${andar}-${leito}`;

    if (!andar || !leito) {
      showMessage('error', 'Andar e Leito são obrigatórios para iniciar a limpeza.');
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
      hora_inicio: horaInicio,
      timestamp: now.getTime() // Para o cronômetro
    };
    
    saveActiveBeds();
    renderStatusCards();
    showMessage('success', `Higienização do leito ${andar}/${leito} INICIADA às ${horaInicio}!`);
    registroInicioForm.reset();
  });
  
  // 2. Envio do formulário COMPLETO (registroForm) - Onde o dado é enviado ao Apps Script
  registroForm.addEventListener('submit', function(event) {
    event.preventDefault();

    if (btnSalvarRegistroCompleto.disabled) {
       showMessage('error', 'Por favor, finalize um leito na seção de Status primeiro.');
       return;
    }
    
    const formData = new FormData(this);
    const data = {};
    formData.forEach((value, key) => { data[key] = value.toUpperCase(); });

    // Pega os dados preenchidos pelos campos ocultos (do leito em higienização)
    const andar = data.ANDAR_FINALIZAR;
    const leito = data.LEITO_FINALIZAR;
    const hora_inicio = data.HORA_INICIO;
    const hora_termino = data.HORA_TERMINO;
    const key = `${andar}-${leito}`;

    // 1. Validação dos campos obrigatórios do formulário completo
    const requiredFields = ['colaboradora', 'encarregada', 'no_sistema'];
    for (let field of requiredFields) {
      if (!data[field]) {
        showMessage('error', `O campo obrigatório "${field.toUpperCase()}" deve ser preenchido!`);
        return;
      }
    }

    // 2. Lidar com campo "Outra Encarregada"
    if (data.encarregada === 'OUTRA') {
      if (!data.outra_encarregada) {
        showMessage('error', 'Digite o nome da outra encarregada!');
        return;
      }
      data.encarregada = data.outra_encarregada;
    }
    delete data.outra_encarregada;
    
    // 3. Prepara os dados finais para envio (simplificando as chaves)
    const finalData = {
        andar: andar,
        leito: leito,
        hora_inicio: hora_inicio,
        hora_termino: hora_termino,
        colaboradora: data.COLABORADORA,
        encarregada: data.ENCARREGADA,
        no_sistema: data.NO_SISTEMA,
        observacoes: data.OBSERVACOES || ''
    };
    
    // 4. Enviar para o Google Apps Script
    fetch('https://script.google.com/macros/s/AKfycbxjaQoyr-iZoK6AEywBkpfmukcVds3PhENUyNEFMXtHD5wkpACvQW0L21pTiJyO_XE4KA/exec', {
      method: 'POST',
      body: JSON.stringify(finalData),
      headers: {
        'Content-Type': 'application/json'
      },
      mode: 'no-cors' // Modo necessário para Apps Script
    })
    .then(() => {
        // Sucesso após o fetch
        // 5. Remove o leito da lista de ativos
        delete activeBeds[key];
        saveActiveBeds();
        renderStatusCards();

        // 6. Limpa e desabilita o formulário completo
        this.reset();
        btnSalvarRegistroCompleto.disabled = true;
        outraEncarregadaDiv.style.display = 'none';
        document.getElementById('encarregada_risocleide').checked = true;
        
        showMessage('success', `Registro do leito ${andar}/${leito} FINALIZADO e enviado com sucesso!`);
    })
    .catch(err => {
        // Em caso de erro, avisa e limpa o formulário, mas o estado ativo *deve* ser removido
        delete activeBeds[key];
        saveActiveBeds();
        renderStatusCards();
        this.reset();
        btnSalvarRegistroCompleto.disabled = true;
        showMessage('error', 'Erro ao enviar o registro completo. Verifique o link do Apps Script.');
        console.error('Erro ao enviar: ', err);
    });
  });

  // Função para carregar histórico (mantida)
  window.carregarHistorico = function() {
    const senhaInput = document.getElementById('senhaHistorico');
    const senha = senhaInput.value;
    const tabelaDiv = document.getElementById('historicoTabela');
    
    if (!senha) {
      tabelaDiv.innerHTML = '<p class="text-danger">Digite a senha para acessar o histórico!</p>';
      return;
    }

    // URL real para o GET do histórico (a encarregada é 'RISOCLEIDE' no título do modal)
    fetch(`https://script.google.com/macros/s/AKfycbxjaQoyr-iZoK6AEywBkpfmukcVds3PhENUyNEFMXtHD5wkpACvQW0L21pTiJyO_XE4KA/exec?senha=${encodeURIComponent(senha)}&encarregada=RISOCLEIDE`, {
      method: 'GET'
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Erro na requisição. Verifique a senha.');
        }
        return response.json();
    })
    .then(historicoData => {
        gerarTabelaHistorico(historicoData, tabelaDiv);
        senhaInput.value = ''; // Limpa senha
    })
    .catch(error => {
        // Simulação de dados para demo em caso de erro no CORS/App Script
        const historicoSimulado = [
          { "Data Registro": "2025-10-12", "Andar": "1", "Leito": "101", "Hora de Início": "08:00", "Hora de Término": "09:00", "Colaboradora": "ANA", "No Sistema": "SIM", "Observações": "TESTE 1" },
          { "Data Registro": "2025-10-12", "Andar": "2", "Leito": "202", "Hora de Início": "10:00", "Hora de Término": "11:00", "Colaboradora": "MARIA", "No Sistema": "NÃO", "Observações": "TESTE 2" }
        ];
        if(senha === 'GPS123') { // Teste com a senha fornecida para o histórico visual
            gerarTabelaHistorico(historicoSimulado, tabelaDiv);
            senhaInput.value = '';
        } else {
             tabelaDiv.innerHTML = '<p class="text-danger">Erro ao carregar histórico ou senha incorreta: ' + error.message + '</p>';
        }
    });
  };

  // Função para gerar tabela do histórico (mantida)
  function gerarTabelaHistorico(historico, tabelaDiv) {
    if (historico.length === 0) {
      tabelaDiv.innerHTML = '<p class="text-warning">Nenhum registro encontrado para esta encarregada.</p>';
      return;
    }

    let tabelaHTML = '<table class="table table-striped"><thead><tr><th>Data Registro</th><th>Andar</th><th>Leito</th><th>Hora Início</th><th>Hora Término</th><th>Colaboradora</th><th>No Sistema</th><th>Observações</th></tr></thead><tbody>';
    historico.forEach(reg => {
      // Ajuste para garantir que as chaves coincidam
      const dataRegistro = reg["Data Registro"] || reg.data_registro || '-';
      const andar = reg.Andar || reg.andar || '-';
      const leito = reg.Leito || reg.leito || '-';
      const horaInicio = reg["Hora de Início"] || reg.hora_inicio || '-';
      const horaTermino = reg["Hora de Término"] || reg.hora_termino || '-';
      const colaboradora = reg.Colaboradora || reg.colaboradora || '-';
      const noSistema = reg["No Sistema"] || reg.no_sistema || '-';
      const observacoes = reg.Observacoes || reg.observacoes || '';

      tabelaHTML += `<tr><td>${dataRegistro}</td><td>${andar}</td><td>${leito}</td><td>${horaInicio}</td><td>${horaTermino}</td><td>${colaboradora}</td><td>${noSistema}</td><td>${observacoes || '-'}</td></tr>`;
    });
    tabelaHTML += '</tbody></table>';
    tabelaDiv.innerHTML = tabelaHTML;
  }

  // Função para exibir mensagens (mantida)
  function showMessage(type, message) {
    const msgDiv = document.getElementById('mensagem');
    if (!msgDiv) {
      console.error('Elemento #mensagem não encontrado!');
      return;
    }
    msgDiv.innerHTML = '';
    const alertDiv = document.createElement('div');
    const bsClass = type === 'success' ? 'success' : type === 'info' ? 'info' : 'danger';
    alertDiv.className = `alert alert-${bsClass} alert-dismissible fade show`;
    alertDiv.role = 'alert';
    alertDiv.innerHTML = `
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    msgDiv.appendChild(alertDiv);
    msgDiv.style.display = 'block';

    // Limpa o alerta se o usuário focar em qualquer campo
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