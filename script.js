document.addEventListener('DOMContentLoaded', function() {
  const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxjaQoyr-iZoK6AEywBkpfmukcVds3PhENUyNEFMXtHD5wkpACvQW0L21pTiJyO_XE4KA/exec';
  
  const registroStatusForm = document.getElementById('registroStatusForm');
  const registroManualForm = document.getElementById('registroManualForm');
  const statusLeitosContainer = document.getElementById('statusLeitosContainer');
  const noActiveBeds = document.getElementById('noActiveBeds');
  
  let activeBeds = JSON.parse(localStorage.getItem('activeBeds')) || {};

  function formatTime(date) {
    return date.toTimeString().slice(0,5);
  }

  function showMessage(type, message) {
    const msgDiv = document.getElementById('mensagem');
    msgDiv.innerHTML = `<div class="alert alert-${type}" role="alert">${message}</div>`;
    setTimeout(()=>{ msgDiv.innerHTML=''; }, 4000);
  }

  function saveActiveBeds() {
    localStorage.setItem('activeBeds', JSON.stringify(activeBeds));
  }

  function renderStatusCards() {
    statusLeitosContainer.innerHTML = '';
    const keys = Object.keys(activeBeds);
    if(keys.length===0) {
      noActiveBeds.style.display='block';
      return;
    } else {
      noActiveBeds.style.display='none';
    }
    keys.forEach(key => {
      const bed = activeBeds[key];
      const card = document.createElement('div');
      card.className = 'col';
      card.innerHTML = `
        <div class="card bed-status-card">
          <h5>Andar ${bed.andar} / Leito ${bed.leito}</h5>
          <p>Colaboradora: ${bed.colaboradora}</p>
          <p>Início: ${bed.hora_inicio}</p>
          <p class="status-time">${formatTime(new Date())}</p>
        </div>`;
      statusLeitosContainer.appendChild(card);
    });
  }

  // Toggle campo "outra encarregada" - Status
  document.getElementById('encarregada_outra_status').addEventListener('change', () => {
    document.getElementById('outra_encarregada_div_status').style.display = 
      document.getElementById('encarregada_outra_status').checked ? 'block' : 'none';
  });

  registroStatusForm.addEventListener('submit', function(e){
    e.preventDefault();
    const formData = new FormData(registroStatusForm);
    if(formData.get('encarregada_status') === 'outra') {
      formData.set('encarregada_status', formData.get('outra_encarregada'));
    }
    formData.set('hora_inicio', new Date().toLocaleTimeString().slice(0,5));
    fetch(APPS_SCRIPT_URL, { method:'POST', body: formData })
      .then(res=>res.json())
      .then(data=>{
        showMessage('success','Registro iniciado com sucesso!');
        const key = formData.get('andar')+'_'+formData.get('leito');
        activeBeds[key] = Object.fromEntries(formData.entries());
        renderStatusCards();
        saveActiveBeds();
        registroStatusForm.reset();
      })
      .catch(err=>showMessage('danger','Erro ao enviar registro.'));
  });

  registroManualForm.addEventListener('submit', function(e){
    e.preventDefault();
    const formData = new FormData(registroManualForm);
    if(formData.get('encarregada_manual') === 'outra') {
      formData.set('encarregada_manual', formData.get('outra_encarregada_manual'));
    }
    fetch(APPS_SCRIPT_URL, { method:'POST', body: formData })
      .then(res=>res.json())
      .then(data=>{
        showMessage('success','Registro manual salvo!');
        registroManualForm.reset();
      })
      .catch(err=>showMessage('danger','Erro ao salvar registro manual.'));
  });

  // Tabs
  document.getElementById('tabRegistro').addEventListener('click',()=>{
    document.getElementById('registroContainer').style.display='block';
    document.getElementById('historicoContainer').style.display='none';
    document.getElementById('tabRegistro').classList.add('active');
    document.getElementById('tabHistorico').classList.remove('active');
  });

  document.getElementById('tabHistorico').addEventListener('click',()=>{
    document.getElementById('registroContainer').style.display='none';
    document.getElementById('historicoContainer').style.display='block';
    document.getElementById('tabRegistro').classList.remove('active');
    document.getElementById('tabHistorico').classList.add('active');
    carregarHistorico();
  });

  function carregarHistorico() {
    fetch(APPS_SCRIPT_URL)
      .then(res=>res.json())
      .then(data=>{
        if(!data || data.length===0) { document.getElementById('historicoTabela').innerHTML='<p>Nenhum registro.</p>'; return; }
        let html = `<table class="table table-bordered table-striped"><thead><tr>
                    <th>Andar</th><th>Leito</th><th>Colaboradora</th><th>Encarregada</th><th>Hora Início</th><th>No Sistema?</th><th>Observações</th></tr></thead><tbody>`;
        data.forEach(row=>{
          html += `<tr>
            <td>${row.andar || ''}</td>
            <td>${row.leito || ''}</td>
            <td>${row.colaboradora || ''}</td>
            <td>${row.encarregada_status || row.encarregada_manual || ''}</td>
            <td>${row.hora_inicio || row.hora_inicio_manual || ''}</td>
            <td>${row.no_sistema_status || row.no_sistema_manual || ''}</td>
            <td>${row.observacoes || row.observacoes_manual || ''}</td>
          </tr>`;
        });
        html += '</tbody></table>';
        document.getElementById('historicoTabela').innerHTML = html;
      });
  }

  renderStatusCards();
});
