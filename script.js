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
        return;
      }
    }

    // Validar horário de término (deve ser maior que o início)
    const horaInicio = new Date(`1970-01-01T${data.hora_inicio}:00`);
    const horaTermino = new Date(`1970-01-01T${data.hora_termino}:00`);
    if (horaTermino <= horaInicio) {
      showMessage('error', 'O horário de término deve ser maior que o horário de início!');
      return;
    }

    // Lidar com campo "Outra Encarregada"
    if (data.encarregada === 'OUTRA') {
      if (!data.outra_encarregada) {
        showMessage('error', 'Digite o nome da outra encarregada!');
        return;
      }
      data.encarregada = data.outra_encarregada;
    }
    delete data.outra_encarregada;

    // Mostrar popup imediatamente
    showMessage('success', 'Registro enviado!');

    // Limpar formulário
    this.reset();
    outraEncarregadaDiv.style.display = 'none';
    document.getElementById('encarregada_risocleide').checked = true;

    // Enviar para o Google Apps Script (sem esperar resposta)
    fetch('https://script.google.com/macros/s/AKfycbxjaQoyr-iZoK6AEywBkpfmukcVds3PhENUyNEFMXtHD5wkpACvQW0L21pTiJyO_XE4KA/exec', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json'
      },
      mode: 'no-cors'
    }).catch(err => console.log('Erro ao enviar: ', err));
  });

  // Função para exibir mensagens
  function showMessage(type, message) {
    const msgDiv = document.getElementById('mensagem');
    msgDiv.innerHTML = '';
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type === 'success' ? 'success' : 'danger'} alert-dismissible fade show`;
    alertDiv.role = 'alert';
    alertDiv.innerHTML = `
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    msgDiv.appendChild(alertDiv);

    // Limpa o alerta se o usuário focar em qualquer campo
    const inputs = document.querySelectorAll('#registroForm input, #registroForm textarea');
    inputs.forEach(input => {
      input.addEventListener('focus', () => { msgDiv.innerHTML = ''; }, { once: true });
    });
  }
});