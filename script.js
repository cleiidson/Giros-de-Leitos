document.addEventListener('DOMContentLoaded', function() {
  // Mostrar/esconder campo "Outra Encarregada"
  const encarregadaRadios = document.getElementsByName('encarregada');
  const outraEncarregadaDiv = document.getElementById('outra_encarregada_div');
  const outraEncarregadaInput = document.getElementById('outra_encarregada');

  encarregadaRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      if (radio.value === 'outra') {
        outraEncarregadaDiv.style.display = 'block';
      } else {
        outraEncarregadaDiv.style.display = 'none';
        outraEncarregadaInput.value = ''; // Limpa o campo se "Risocleide" for selecionado
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

    // Campo "Outra Encarregada"
    if (data.encarregada === 'OUTRA') {
      if (!data.outra_encarregada) {
        showMessage('error', 'Digite o nome da outra encarregada!');
        return;
      }
      data.encarregada = data.outra_encarregada; // Substitui pelo valor digitado
    }
    delete data.outra_encarregada; // Remove campo auxiliar

    // Envio para Google Apps Script
    fetch('https://script.google.com/macros/s/AKfycbxjaQoyr-iZoK6AEywBkpfmukcVds3PhENUyNEFMXtHD5wkpACvQW0L21pTiJyO_XE4KA/exec', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(data),
      mode: 'no-cors'
    })
    .then(() => {
      showMessage('success', 'Registro salvo com sucesso!');
      this.reset();
      outraEncarregadaDiv.style.display = 'none';
      document.getElementById('encarregada_risocleide').checked = true;
    })
    .catch(error => {
      showMessage('error', 'Erro ao salvar: ' + error.message);
    });
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

    // Limpa a mensagem quando qualquer input recebe foco
    const inputs = document.querySelectorAll('#registroForm input, #registroForm textarea');
    inputs.forEach(input => {
      input.addEventListener('focus', () => { msgDiv.innerHTML = ''; }, { once: true });
    });
  }
});
