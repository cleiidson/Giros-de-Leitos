document.getElementById('registroForm').addEventListener('submit', async function(event) {
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

  // Upload da foto para ImgBB (se presente)
  let fotoLink = '';
  if (formData.get('foto')) {
    const imgbbFormData = new FormData();
    imgbbFormData.append('image', formData.get('foto'));
    try {
      const response = await fetch('https://api.imgbb.com/1/upload?key=SUA_CHAVE_API_IMGBB', {
        method: 'POST',
        body: imgbbFormData
      });
      const result = await response.json();
      if (result.success) {
        fotoLink = result.data.url;
      } else {
        showMessage('error', 'Erro ao fazer upload da foto!');
        return;
      }
    } catch (error) {
      showMessage('error', 'Erro ao fazer upload da foto: ' + error.message);
      return;
    }
  }

  // Adiciona o link da foto aos dados
  data.foto = fotoLink;

  // Envio para o Google Apps Script
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
      this.reset();
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