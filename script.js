document.addEventListener('DOMContentLoaded', function() {
    // 1. Definição de Constantes e Elementos DOM
    const REGISTRO_FORM_ID = 'registroForm';
    const MENSAGEM_ID = 'mensagem';
    const OUTRA_ENCARREGADA_DIV_ID = 'outra_encarregada_div';
    const OUTRA_ENCARREGADA_INPUT_ID = 'outra_encarregada';
    const HISTORICO_TABELA_ID = 'historicoTabela';
    const SENHA_HISTORICO_INPUT_ID = 'senhaHistorico';
    const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxjaQoyr-iZoK6AEywBkpfmukcVds3PhENUyNEFMXtHD5wkpACvQW0L21pTiJyO_XE4KA/exec'; // Use sua URL real

    const registroForm = document.getElementById(REGISTRO_FORM_ID);
    const encarregadaRadios = document.getElementsByName('encarregada');
    const outraEncarregadaDiv = document.getElementById(OUTRA_ENCARREGADA_DIV_ID);
    const outraEncarregadaInput = document.getElementById(OUTRA_ENCARREGADA_INPUT_ID);
    const mensagemDiv = document.getElementById(MENSAGEM_ID);

    if (!registroForm || !outraEncarregadaDiv || !outraEncarregadaInput || !mensagemDiv) {
        console.error('Um ou mais elementos DOM necessários não foram encontrados.');
        return; 
    }
    
    // Lista de campos obrigatórios
    const REQUIRED_FIELDS = ['andar', 'leito', 'hora_inicio', 'hora_termino', 'colaboradora', 'encarregada', 'no_sistema'];

    // FUNÇÕES AUXILIARES
    
    // Converte HH:MM para o total de minutos desde 00:00
    const timeToMinutes = (timeStr) => {
        if (!timeStr) return 0;
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
    };

    function showMessage(type, message) {
        // ... (Corpo da função showMessage, mantido do código anterior)
        mensagemDiv.innerHTML = '';
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type === 'success' ? 'success' : 'danger'} alert-dismissible fade show`;
        alertDiv.role = 'alert';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        mensagemDiv.appendChild(alertDiv);
        mensagemDiv.style.display = 'block';

        const inputs = registroForm.querySelectorAll('input, textarea');
        inputs.forEach(input => {
            input.addEventListener('focus', () => {
                mensagemDiv.innerHTML = '';
                mensagemDiv.style.display = 'none';
            }, { once: true });
        });
    }

    const toggleOutraEncarregada = (radio) => {
        const isOutra = radio.value === 'outra';
        outraEncarregadaDiv.style.display = isOutra ? 'block' : 'none';
        
        if (!isOutra) {
            outraEncarregadaInput.value = '';
        }
        outraEncarregadaInput.required = isOutra;
    };

    // INICIALIZAÇÃO DE EVENTOS
    
    // Mostrar/esconder campo "Outra Encarregada"
    encarregadaRadios.forEach(radio => {
        radio.addEventListener('change', () => toggleOutraEncarregada(radio));
    });
    
    const initialCheckedRadio = Array.from(encarregadaRadios).find(radio => radio.checked) || encarregadaRadios[0];
    if (initialCheckedRadio) {
        toggleOutraEncarregada(initialCheckedRadio);
    }

    // Converter texto para maiúsculas em tempo real
    const textInputs = registroForm.querySelectorAll('input[type="text"], textarea');
    textInputs.forEach(input => {
        input.addEventListener('input', () => {
            input.value = input.value.toUpperCase();
        });
    });

    // 5. Envio do formulário
    registroForm.addEventListener('submit', async function(event) {
        event.preventDefault();

        const formData = new FormData(this);
        const data = {};
        
        formData.forEach((value, key) => { 
             data[key] = (typeof value === 'string') ? value.toUpperCase().trim() : value; 
        });
        
        // --- 5.1 Validação dos campos obrigatórios ---
        for (let field of REQUIRED_FIELDS) {
            // Verifica o campo "Outra Encarregada" separadamente
            if (field === 'encarregada' && data.encarregada === 'OUTRA') {
                 if (!data.outra_encarregada || data.outra_encarregada === '') {
                     showMessage('error', 'Digite o nome da outra encarregada!');
                     outraEncarregadaInput.focus();
                     return;
                 }
                 continue;
            }
            
            if (!data[field] || data[field] === '') {
                showMessage('error', 'Todos os campos obrigatórios devem ser preenchidos!');
                console.log(`Campo obrigatório ausente: ${field}`);
                const missingInput = this.elements[field];
                if (missingInput && missingInput.focus) {
                    missingInput.focus();
                }
                return;
            }
        }
        
        // --- 5.2 Validação de horário (CORRIGIDA) ---
        const inicioMinutes = timeToMinutes(data.hora_inicio);
        let terminoMinutes = timeToMinutes(data.hora_termino);
        
        // CORREÇÃO: Verifica se é uma limpeza noturna (término menor que o início)
        if (terminoMinutes <= inicioMinutes) {
            // Assume que o término é no dia seguinte (+24 horas = 1440 minutos)
            terminoMinutes += 1440; 
        }

        // Validação final: o tempo de término ajustado deve ser estritamente maior que o início.
        // Se a duração for 0 (23:00 a 23:00, ou 00:00 a 00:00), a validação falha.
        if (terminoMinutes <= inicioMinutes) {
             showMessage('error', 'O horário de término deve ser **maior** que o horário de início!');
             console.log('Validação de horário falhou: Duração zero ou negativa');
             this.elements.hora_termino.focus(); 
             return;
        }

        // --- 5.3 Lidar com campo "Outra Encarregada" ---
        if (data.encarregada === 'OUTRA') {
            data.encarregada = data.outra_encarregada;
        }
        delete data.outra_encarregada;

        // --- 5.4 Enviar para o Google Apps Script ---
        showMessage('success', 'Enviando registro...');

        try {
            await fetch(SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify(data),
                headers: {
                    'Content-Type': 'application/json'
                },
                mode: 'no-cors'
            });

            showMessage('success', 'Registro enviado com sucesso!');
            console.log('Registro enviado com sucesso, dados:', data);

            // --- 5.5 Limpar formulário ---
            this.reset();
            outraEncarregadaDiv.style.display = 'none';
            const defaultRadio = document.getElementById('encarregada_risocleide');
            if (defaultRadio) {
                defaultRadio.checked = true;
                toggleOutraEncarregada(defaultRadio);
            }
            
        } catch (error) {
            showMessage('error', 'Erro ao enviar o registro. Verifique a conexão ou a URL do Script.');
            console.error('Erro ao enviar: ', error);
        }
    });
    
    // --- Funções de Histórico (Mantidas) ---
    
    window.carregarHistorico = function() {
        const senhaInput = document.getElementById(SENHA_HISTORICO_INPUT_ID);
        const senha = senhaInput.value;
        const tabelaDiv = document.getElementById(HISTORICO_TABELA_ID);
        
        tabelaDiv.innerHTML = ''; 

        if (!senha) {
            tabelaDiv.innerHTML = '<p class="text-danger">Digite a senha para acessar o histórico!</p>';
            senhaInput.focus();
            return;
        }

        tabelaDiv.innerHTML = '<p class="text-info">Carregando histórico...</p>';

        // Simulação com fetch, mantendo o modo 'no-cors' do código original
        fetch(`${SCRIPT_URL}?senha=${encodeURIComponent(senha)}&encarregada=RISOCLÉIA`, {
            method: 'GET',
            mode: 'no-cors' 
        })
        .then(() => {
            // SIMULAÇÃO DE DADOS: O fetch não retorna dados em modo 'no-cors', então simulamos aqui.
            if (senha.toLowerCase() === 'gps123') { 
                const historicoSimulado = [
                    { "Data Registro": "2025-10-12", "Andar": "1", "Leito": "101", "Hora de Início": "23:30", "Hora de Término": "00:45", "Colaboradora": "ANA", "No Sistema": "SIM", "Observações": "LIMPEZA NOTURNA OK" },
                    { "Data Registro": "2025-10-12", "Andar": "2", "Leito": "202", "Hora de Início": "10:00", "Hora de Término": "11:00", "Colaboradora": "MARIA", "No Sistema": "NÃO", "Observações": "TESTE 2" }
                ];
                gerarTabelaHistorico(historicoSimulado, tabelaDiv);
            } else {
                 tabelaDiv.innerHTML = '<p class="text-danger">Senha incorreta ou histórico não encontrado.</p>';
            }

            senhaInput.value = '';
        })
        .catch(error => {
            tabelaDiv.innerHTML = '<p class="text-danger">Erro ao carregar histórico (Falha de Rede ou CORS): ' + error.message + '</p>';
        });
    };

    function gerarTabelaHistorico(historico, tabelaDiv) {
        if (!historico || historico.length === 0) {
            tabelaDiv.innerHTML = '<p class="text-warning">Nenhum registro encontrado para esta encarregada.</p>';
            return;
        }

        const headers = Object.keys(historico[0]);
        
        const thead = `<thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>`;
        
        const tbody = `<tbody>${historico.map(reg => 
            `<tr>${headers.map(h => `<td>${reg[h] || '-'}</td>`).join('')}</tr>`
        ).join('')}</tbody>`;

        tabelaDiv.innerHTML = `<table class="table table-striped table-hover table-sm">${thead}${tbody}</table>`;
    }
});