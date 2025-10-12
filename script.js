document.getElementById('registroForm').addEventListener('submit', function(event) {
  event.preventDefault(); // Evita reload da página

  const formData = new FormData(this);
  const data = {};
  formData.forEach((value, key) => { data[key] = value; });

  // Validação frontend (redundante, mas boa prática)
  const requiredFields = ['andar', 'leito', 'hora_inicio', 'hora_termino', 'colaboradora', 'encarregada', 'no_sistema'];
  for (let field of requiredFields) {
    if (!data[field]) {
      showMessage('error', 'Todos os campos obrigatórios devem ser preenchidos!');
      return;
    }
  }

  // Envio para o Google Apps Script
  fetch('https://script.google.com/macros/s/AKfycbx-b1_5letooUuQWV8hj_xhK69YYeP2FK9bRsLLTEWorMTu74BCl8_ThjRyBcydq2bnDw/exec', {
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
      this.reset(); // Limpa o form
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
  msgDiv.textContent = message;
  msgDiv.style.color = type === 'success' ? 'green' : 'red';
}