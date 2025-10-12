document.addEventListener('DOMContentLoaded', function() {
  // Mostrar/esconder campo "Outra Encarregada"
  const encarregadaRadios = document.getElementsByName('encarregada');
  const outraEncarregadaDiv = document.getElementById('outra_encarregada_div');
  const outraEncarregadaInput = document.getElementById('outra_encarregada');

  encarregadaRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      outraEncarregadaDiv.style.display = radio.value === 'outra' ? 'block' : 'none';
      if (radio.value !== 'outra') {
        outraEncarregadaInput.value = ''; // Limpa o campo se "Risocléide" for selecionado
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

  document.getElementById('registroForm').addEventListener('submit', function(event) {
    event.preventDefault(); // Evita reload da página

    const formData = new FormData(this);
    const data = {};
    formData.forEach((value, key) => { data[key] = value.toUpperCase(); });

    // Validação frontend
    const requiredFields = ['andar', 'leito', 'hora_inicio', 'hora_termino', 'colaboradora', 'encarregada', 'no_sistema'];
    for (let field of requiredFields) {
      if (!data[field]) {
        showMessage('error', 'Todos os campos obrigatórios devem ser preenchidos!');
        return;
      }
    }

    // Lidar com o campo "Encarregada"
    if (data.encarregada === 'OUTRA') {
      if (!data.outra_encarregada) {
        showMessage('error', 'Digite o nome da outra encarregada!');
        return;
      }
      data.encarregada = data.outra_encarregada; // Usa o valor digitado
    }
    delete data.outra_encarregada; // Remove campo auxiliar

    // Envio para o Google Apps Script
    fetch('https://script.google.com/macros/s/AKfycbxjaQoyr-iZoK6AEywBkpfmukcVds3PhENUyNEFMXtHD5wkpACvQW0L21pTiJyO_XE4KA/exec', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json'
      },
      mode: 'no-cors' // Mantém no-cors
    })
    .then(() => {
      showMessage('success', 'Registro salvo com sucesso!');
      this.reset(); // Limpa o formulário
      outraEncarregadaDiv.style.display = 'none'; // Esconde o campo "Outra Encarregada"
      document.getElementById('encarregada_risocleide').checked = true; // Reseta para Risocleide
    })
    .catch(error => {
      showMessage('error', 'Erro ao salvar: ' + error.message);
    });
  });

  function showMessage(type, message) {
    const msgDiv = document.getElementById('mensagem');
    // Remove alertas anteriores
    msgDiv.innerHTML = '';
    // Cria novo alerta Bootstrap
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type === 'success' ? 'success' : 'danger'} alert-dismissible fade show`;
    alertDiv.role = 'alert';
    alertDiv.innerHTML = `
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    msgDiv.appendChild(alertDiv);

    // Limpa a mensagem quando qualquer campo do formulário recebe foco
    const inputs = document.querySelectorAll('#registroForm input, #registroForm textarea');
    inputs.forEach(input => {
      input.addEventListener('focus', () => {
        msgDiv.innerHTML = '';
      }, { once: true }); // Executa apenas uma vez por input
    });
  }
});