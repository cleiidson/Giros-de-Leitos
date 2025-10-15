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
          <p class="status-time">${bed.status}: <span class="time-elapsed" data-start="${bed.hora_inicio}">00:00</span></p>
          <button class="btn btn-success btn-sm btn-complete" data-key="${key}">Completar</button>
          <button class="btn btn-danger btn-sm btn-cancel" data-key="${key}">Cancelar</button>
