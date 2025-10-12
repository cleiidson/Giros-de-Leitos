document.getElementById('registroForm').addEventListener('submit', async function(event) {
  event.preventDefault();

  const formData = new FormData(this);
  const data = {};
  formData.forEach((value, key) => { data[key] = value; });

  const requiredFields = ['andar','leito','hora_inicio','hora_termino','colaboradora','encarregada','no_sistema'];
  for (let field of requiredFields) {
    if (!data[field]) {
      showMessage('error','Todos os campos obrigatórios devem ser preenchidos!');
      return;
    }
  }

  try {
    const response = await fetch('https://script.google.com/macros/s/SEU_ID_DO_SCRIPT/exec', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json' }
    });
    const result = await response.json();

    if (result.status === 'success') {
      showMessage('success', result.message);
      this.reset();
    } else {
      showMessage('error', result.message);
    }
  } catch (error) {
    showMessage('error','Erro ao salvar: ' + error.message);
  }
});

function showMessage(type, message){
  const msgDiv = document.getElementById('mensagem');
  msgDiv.textContent = message;
  msgDiv.style.color = type === 'success' ? 'green' : 'red';
}
