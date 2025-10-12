document.getElementById('registroForm').addEventListener('submit', function(event) {
  event.preventDefault(); // Evita reload da página

  const formData = new FormData(this);
  const data = {};
  formData.forEach((value, key) => { data[key] = value; });

  // Validação frontend
  const requiredFields = ['andar', 'leito', 'hora_inicio', 'hora_termino', 'colaboradora', 'encarregada', 'no_sistema'];
  for (let field of requiredFields) {
    if (!data[field]) {
      showMessage('error', 'Todos os campos obrigatórios devem ser preenchidos!');
      return;
    }
  }

  // Envio para o Google Apps Script com proxy CORS
  fetch('https://cors-anywhere.herokuapp.com/https://script.google.com/macros/s/AKfycbxjaQoyr-iZoK6AEywBkpfmukcVds3PhENUyNEFMXtHD5wkpACvQW0L21pTiJyO_XE4KA/exec', {
    method: 'POST',
    body: JSON.stringify(data),
    headers: {
      'Content-Type': 'application/json'
    }
  })
  .then(response => response.json())
  .then(result => {
    if (result.status === 'success') {
      showMessage('success', result.message);
      this.reset(); // Limpa o formulário
    } else {
      showMessage('error', result.message);
    }
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