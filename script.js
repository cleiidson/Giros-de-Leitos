document.addEventListener('DOMContentLoaded', function() {
  const encarregadaRadios = document.getElementsByName('encarregada');
  const outraEncarregadaDiv = document.getElementById('outra_encarregada_div');
  const outraEncarregadaInput = document.getElementById('outra_encarregada');

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
  const textInputs = document.querySelectorAll('#registroForm input[type="text"], #registroForm textarea');
  textInputs.forEach(input => {
    input.addEventListener('input', () => {
      input.value = input.value.toUpperCase();
    });
  });

  // Envio do formulário
  document.getElementById('registroForm').addEventListener('submit', function(event) {
    event.preventDefault();

    const formData = new FormData(this);
    const data = {};
    formData.forEach((value, key) => { data[key] = value.toUpperCase(); });

    // Validação dos campos obrigatórios
    const requiredFields = ['andar', 'leito', 'hora_inicio', 'hora_termino', 'colaboradora', 'encarregada', 'no_sistema'];
    for (let field of requiredFields) {
      if (!data[field]) {
        showMessage('error', 'Todos os campos obrigatórios devem ser preenchidos!');
        console.log(`Campo obrigatório ausente: ${field}`);
        return;
      }
    }

    // Validar horário de término (deve ser maior que o início)
    const horaInicio = new Date(`1970-01-01T${data.hora_inicio}:00`);
    const horaTermino = new Date(`1970-01-01T${data.hora_termino}:00`);
    console.log(`Hora Início: ${data.hora_inicio}, Hora Término: ${data.hora_termino}`);
    if (isNaN(horaTermino) || isNaN(horaInicio) || horaTermino <= horaInicio) {
      showMessage('error', 'O horário de término deve ser maior que o horário de início!');
      console.log('Validação de horário falhou');
      return;
    }

    // Lidar com campo "Outra Encarregada"
    if (data.encarregada === 'OUTRA') {
      if (!data.outra_encarregada) {
        showMessage('error', 'Digite o nome da outra encarregada!');
        console.log('Campo "Outra Encarregada" ausente');
        return;
      }
      data.encarregada = data.outra_encarregada;
    }
    delete data.outra_encarregada;

    // Mostrar popup de sucesso
    showMessage('success', 'Registro enviado!');
    console.log('Registro enviado com sucesso, dados:', data);

    // Limpar formulário
    this.reset();
    outraEncarregadaDiv.style.display = 'none';
    document.getElementById('encarregada_risocleide').checked = true;

    // Enviar para o Google Apps Script
    fetch('https://script.google.com/macros/s/AKfycbxjaQoyr-iZoK6AEywBkpfmukcVds3PhENUyNEFMXtHD5wkpACvQW0L21pTiJyO_XE4KA/exec', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json'
      },
      mode: 'no-cors'
    }).catch(err => console.log('Erro ao enviar: ', err));
  });

  // Função para carregar histórico
  window.carregarHistorico = function() {
    const senhaInput = document.getElementById('senhaHistorico');
    const senha = senhaInput.value;
    const tabelaDiv = document.getElementById('historicoTabela');
    
    if (!senha) {
      tabelaDiv.innerHTML = '<p class="text-danger">Digite a senha para acessar o histórico!</p>';
      return;
    }

    // Simulação de dados devido ao modo no-cors (substitua por fetch real com proxy se necessário)
    fetch(`https://script.google.com/macros/s/AKfycbxjaQoyr-iZoK6AEywBkpfmukcVds3PhENUyNEFMXtHD5wkpACvQW0L21pTiJyO_XE4KA/exec?senha=${encodeURIComponent(senha)}&encarregada=RISOCLÉIA`, {
      method: 'GET',
      mode: 'no-cors'
    })
    .then(() => {
      // Dados simulados para demo
      const historicoSimulado = [
        { "Data Registro": "2025-10-12", "Andar": "1", "Leito": "101", "Hora de Início": "08:00", "Hora de Término": "09:00", "Colaboradora": "ANA", "No Sistema": "SIM", "Observações": "TESTE 1" },
        { "Data Registro": "2025-10-12", "Andar": "2", "Leito": "202", "Hora de Início": "10:00", "Hora de Término": "11:00", "Colaboradora": "MARIA", "No Sistema": "NÃO", "Observações": "TESTE 2" }
      ];
      gerarTabelaHistorico(historicoSimulado, tabelaDiv);
      senhaInput.value = ''; // Limpa senha
    })
    .catch(error => {
      tabelaDiv.innerHTML = '<p class="text-danger">Erro ao carregar histórico: ' + error.message + '</p>';
    });
  };

  // Função para gerar tabela do histórico
  function gerarTabelaHistorico(historico, tabelaDiv) {
    if (historico.length === 0) {
      tabelaDiv.innerHTML = '<p class="text-warning">Nenhum registro encontrado para esta encarregada.</p>';
      return;
    }

    let tabelaHTML = '<table class="table table-striped"><thead><tr><th>Data Registro</th><th>Andar</th><th>Leito</th><th>Hora Início</th><th>Hora Término</th><th>Colaboradora</th><th>No Sistema</th><th>Observações</th></tr></thead><tbody>';
    historico.forEach(reg => {
      tabelaHTML += `<tr><td>${reg["Data Registro"]}</td><td>${reg["Andar"]}</td><td>${reg["Leito"]}</td><td>${reg["Hora de Início"]}</td><td>${reg["Hora de Término"]}</td><td>${reg["Colaboradora"]}</td><td>${reg["No Sistema"]}</td><td>${reg["Observações"] || '-'}</td></tr>`;
    });
    tabelaHTML += '</tbody></table>';
    tabelaDiv.innerHTML = tabelaHTML;
  }

  // Função para exibir mensagens
  function showMessage(type, message) {
    const msgDiv = document.getElementById('mensagem');
    if (!msgDiv) {
      console.error('Elemento #mensagem não encontrado!');
      return;
    }
    msgDiv.innerHTML = '';
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type === 'success' ? 'success' : 'danger'} alert-dismissible fade show`;
    alertDiv.role = 'alert';
    alertDiv.innerHTML = `
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    msgDiv.appendChild(alertDiv);
    msgDiv.style.display = 'block';

    // Limpa o alerta se o usuário focar em qualquer campo
    const inputs = document.querySelectorAll('#registroForm input, #registroForm textarea');
    inputs.forEach(input => {
      input.addEventListener('focus', () => {
        msgDiv.innerHTML = '';
        msgDiv.style.display = 'none';
      }, { once: true });
    });
  }
});