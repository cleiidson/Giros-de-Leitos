document.addEventListener('DOMContentLoaded', () => {

  // Inicializa Supabase
  const supabaseUrl = 'https://tmgzfzhfepouswnudqsd.supabase.co';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRtZ3pmemhmZXBvdXN3bnVkcXNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyNjcwMTEsImV4cCI6MjA3NTg0MzAxMX0.2ftTiOv3ed916LBk81Y_q4UDByAoF5vq30QqtnL3bG0';
  const supabase = supabase.createClient(supabaseUrl, supabaseKey);
  const bucket = 'giro-de-leito';

  document.getElementById('registroForm').addEventListener('submit', async function(event) {
    event.preventDefault();

    const formData = new FormData(this);
    const data = {};
    formData.forEach((value, key) => { data[key] = value; });

    // Validação dos campos obrigatórios
    const requiredFields = ['andar','leito','hora_inicio','hora_termino','colaboradora','encarregada','no_sistema'];
    for (let field of requiredFields) {
      if (!data[field]) {
        showMessage('error','Todos os campos obrigatórios devem ser preenchidos!');
        return;
      }
    }

    // Upload da foto para Supabase
    let fotoLink = '';
    const foto = formData.get('foto');
    if (foto && foto.name) {
      const fileName = `${Date.now()}_${foto.name}`;
      const { data: uploadData, error } = await supabase.storage.from(bucket).upload(fileName, foto);
      if (error) {
        showMessage('error','Erro ao enviar a imagem: ' + error.message);
        return;
      }
      fotoLink = supabase.storage.from(bucket).getPublicUrl(fileName).data.publicUrl;
    }

    data.foto = fotoLink;

    // Envio para Google Apps Script
    fetch('https://script.google.com/macros/s/AKfycbxjaQoyr-iZoK6AEywBkpfmukcVds3PhENUyNEFMXtHD5wkpACvQW0L21pTiJyO_XE4KA/exec', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json' }
    })
    .then(res => res.json())
    .then(result => {
      if (result.status === 'success') {
        showMessage('success', result.message);
        this.reset();
      } else {
        showMessage('error', result.message);
      }
    })
    .catch(error => showMessage('error','Erro ao salvar: '+error.message));
  });

  function showMessage(type,message){
    const msgDiv = document.getElementById('mensagem');
    msgDiv.textContent = message;
    msgDiv.style.color = type==='success'?'green':'red';
  }

});
