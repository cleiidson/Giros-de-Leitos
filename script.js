document.addEventListener('DOMContentLoaded', function() {
    // 1. Definição de Constantes e Elementos DOM
    const REGISTRO_FORM_ID = 'registroForm';
    const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxjaQoyr-iZoK6AEywBkpfmukcVds3PhENUyNEFMXtHD5wkpACvQW0L21pTiJyO_XE4KA/exec'; // URL REAL do Google Apps Script
    const LEITO_EM_ANDAMENTO_KEY = 'leitoEmAndamento'; // Chave para o localStorage
    const MODO_ATUAL_KEY = 'modoRegistro'; // Chave para o modo (realtime ou manual)

    // Elementos da Interface
    const registroForm = document.getElementById(REGISTRO_FORM_ID);
    const formCard = document.getElementById('formCard');
    const encarregadaRadios = document.getElementsByName('encarregada');
    const outraEncarregadaDiv = document.getElementById('outra_encarregada_div');
    const outraEncarregadaInput = document.getElementById('outra_encarregada');
    const mensagemDiv = document.getElementById('mensagem');
    const submitBtn = document.getElementById('submitBtn');

    // Elementos do Modo Tempo Real
    const STATUS_DIV = document.getElementById('statusEmAndamento');
    const FINALIZAR_BTN = document.getElementById('finalizarLeitoBtn');
    const LEITO_ANDAR_DISPLAY = document.getElementById('leitoAtualAndar');
    const LEITO_NUMERO_DISPLAY = document.getElementById('leitoAtualNumero');
    const LEITO_INICIO_DISPLAY = document.getElementById('leitoAtualInicio');
    
    // Elementos do Modo Manual/Noturno
    const alternarModoBtn = document.getElementById('alternarModoBtn');
    const horariosManualDiv = document.getElementById('horariosManual');
    const horaInicioInput = document.getElementById('hora_inicio');
    const horaTerminoInput = document.getElementById('hora_termino');
    
    // Lista de campos obrigatórios
    const REQUIRED_FIELDS_MANUAL = ['andar', 'leito', 'hora_inicio', 'hora_termino', 'colaboradora', 'encarregada', 'no_sistema'];
    const REQUIRED_FIELDS_REALTIME = ['andar', 'leito', 'colaboradora', 'encarregada', 'no_sistema'];

    if (!registroForm || !mensagemDiv || !STATUS_DIV || !FINALIZAR_BTN || !alternarModoBtn || !horariosManualDiv) {
        console.error('Um ou mais elementos DOM essenciais não foram encontrados. Verifique o HTML.');
        return; 
    }
    
    // VARIÁVEL DE ESTADO
    let modoAtual = localStorage.getItem(MODO_ATUAL_KEY) || 'realtime'; // Padrão: tempo real

    // --------------------------------------------------------------------------------
    // FUNÇÕES AUXILIARES
    // --------------------------------------------------------------------------------

    /** Converte HH:MM para o total de minutos desde 00:00 */
    const timeToMinutes = (timeStr) => {
        if (!timeStr) return 0;
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
    };

    /** Exibe alertas para o usuário */
    function showMessage(type, message) {
        mensagemDiv.innerHTML = '';
        const alertDiv = document.createElement('div');
        const alertType = type === 'success' ? 'success' : (type === 'info' ? 'info' : 'danger');
        alertDiv.className = `alert alert-${alertType} alert-dismissible fade show`;
        alertDiv.role = 'alert';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        mensagemDiv.appendChild(alertDiv);
        mensagemDiv.style.display = 'block';

        // Esconde a mensagem ao interagir com o form
        const inputs = registroForm.querySelectorAll('input, textarea');
        inputs.forEach(input => {
            input.addEventListener('focus', () => {
                mensagemDiv.innerHTML = '';
                mensagemDiv.style.display = 'none';
            }, { once: true });
        });
    }

    /** Mostrar/esconder campo "Outra Encarregada" */
    const toggleOutraEncarregada = (radio) => {
        const isOutra = radio.value === 'outra';
        outraEncarregadaDiv.style.display = isOutra ? 'block' : 'none';
        
        if (!isOutra) {
            outraEncarregadaInput.value = '';
        }
        outraEncarregadaInput.required = isOutra;
    };

    /** Converte texto para maiúsculas em tempo real */
    const toUpperCase = (input) => {
        input.value = input.value.toUpperCase();
    };

    /** Função para carregar histórico (Mantida) */
    window.carregarHistorico = function() {
        // ... (A lógica da sua função carregarHistorico deve ser mantida aqui) ...
        const senhaInput = document.getElementById('senhaHistorico');
        const senha = senhaInput.value;
        const tabelaDiv = document.getElementById('historicoTabela');
        
        tabelaDiv.innerHTML = '';

        if (!senha) {
            tabelaDiv.innerHTML = '<p class="text-danger">Digite a senha para acessar o histórico!</p>';
            senhaInput.focus();
            return;
        }

        tabelaDiv.innerHTML = '<p class="text-info">Carregando histórico...</p>';
        
        // Simulação de dados:
        fetch(`${SCRIPT_URL}?senha=${encodeURIComponent(senha)}&encarregada=RISOCLÉIA`, {
            method: 'GET',
            mode: 'no-cors' 
        })
        .then(() => {
            if (senha.toLowerCase() === 'gps123') { 
                const historicoSimulado = [
                    { "Data Registro": "2025-10-12", "Andar": "1", "Leito": "101", "Hora de Início": "23:30", "Hora de Término": "00:45", "Colaboradora": "ANA", "No Sistema": "SIM", "Observações": "LIMPEZA NOTURNA OK" },
                    { "Data Registro": "2025-10-12", "Andar": "2", "Leito": "202", "Hora de Início": "10:00", "Hora de Término": "11:00", "Colaboradora": "MARIA", "No Sistema": "NÃO", "Observações": "TESTE DIURNO" }
                ];
                gerarTabelaHistorico(historicoSimulado, tabelaDiv);
            } else {
                 tabelaDiv.innerHTML = '<p class="text-danger">Senha incorreta ou histórico não encontrado.</p>';
            }

            senhaInput.value = '';
        })
        .catch(error => {
            tabelaDiv.innerHTML = '<p class="text-danger">Erro ao carregar histórico: ' + error.message + '</p>';
        });
    };
    
    /** Função para gerar tabela do histórico (Mantida) */
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

    // --------------------------------------------------------------------------------
    // LÓGICA DE GERENCIAMENTO DE ESTADO (LOCALSTORAGE)
    // --------------------------------------------------------------------------------

    /**
     * Carrega o estado do leito em higienização e atualiza a UI (principal dispatcher).
     */
    function carregarEstado() {
        const estadoJSON = localStorage.getItem(LEITO_EM_ANDAMENTO_KEY);
        
        if (estadoJSON) {
            const estado = JSON.parse(estadoJSON);
            
            // MODO: TEMPO REAL (Cronômetro ativo)
            STATUS_DIV.style.display = 'block';
            formCard.style.display = 'none'; // Esconde o formulário
            
            LEITO_ANDAR_DISPLAY.textContent = estado.andar;
            LEITO_NUMERO_DISPLAY.textContent = estado.leito;
            LEITO_INICIO_DISPLAY.textContent = estado.hora_inicio;

            return estado;

        } else {
            // MODO: Lançamento (Tempo Real Inativo)
            STATUS_DIV.style.display = 'none';
            formCard.style.display = 'block'; // Mostra o formulário
            
            // Configura o formulário de acordo com o MODO ATUAL
            alternarModo(modoAtual, false); // Aplica as regras do modo atual

            return null;
        }
    }

    // --------------------------------------------------------------------------------
    // ALTERNÂNCIA DE MODOS
    // --------------------------------------------------------------------------------

    /**
     * Alterna entre o modo 'realtime' (iniciar/parar) e 'manual' (noite).
     * @param {string} novoModo - 'realtime' ou 'manual'.
     * @param {boolean} updateStorage - Se deve salvar no localStorage (true para clique).
     */
    function alternarModo(novoModo, updateStorage = true) {
        modoAtual = novoModo;
        if (updateStorage) {
            localStorage.setItem(MODO_ATUAL_KEY, novoModo);
        }
        
        // Define quais campos são obrigatórios para a validação
        const requiredFields = novoModo === 'manual' ? REQUIRED_FIELDS_MANUAL : REQUIRED_FIELDS_REALTIME;
        
        // Atualiza a UI
        if (novoModo === 'manual') {
            horariosManualDiv.style.display = 'block';
            submitBtn.innerHTML = 'Salvar Registro Completo <i class="bi bi-send-fill"></i>';
            submitBtn.className = 'btn btn-danger btn-lg';
            alternarModoBtn.innerHTML = '<i class="bi bi-shuffle"></i> Alternar para Modo TEMPO REAL (Dia)';
        } else { // 'realtime'
            horariosManualDiv.style.display = 'none';
            submitBtn.innerHTML = '<i class="bi bi-play-circle"></i> Iniciar Higienização Agora';
            submitBtn.className = 'btn btn-success btn-lg';
            alternarModoBtn.innerHTML = '<i class="bi bi-shuffle"></i> Alternar para Modo Lançamento MANUAL (Noite)';
        }
        
        // Aplica/Remove o atributo 'required' nos campos de hora
        horaInicioInput.required = novoModo === 'manual';
        horaTerminoInput.required = novoModo === 'manual';
        
        return requiredFields;
    }

    // --------------------------------------------------------------------------------
    // LÓGICA DE ENVIO (INICIAR/FINALIZAR)
    // --------------------------------------------------------------------------------

    /** Lógica para iniciar a higienização (Modo Tempo Real) */
    function iniciarHigienizacao(data) {
        // Validação Mínima para Início (já tratada pelo REQUIRED_FIELDS_REALTIME no submit listener)

        const now = new Date();
        const horaInicioStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        const novoEstado = {
            andar: data.andar,
            leito: data.leito,
            encarregada: data.encarregada,
            colaboradora: data.colaboradora,
            no_sistema: data.no_sistema,
            observacoes: data.observacoes,
            hora_inicio_timestamp: now.toISOString(), // Salva o timestamp completo
            hora_inicio: horaInicioStr // Salva o horário formatado para o display
        };

        localStorage.setItem(LEITO_EM_ANDAMENTO_KEY, JSON.stringify(novoEstado));
        showMessage('info', `Higienização do Leito ${novoEstado.andar}-${novoEstado.leito} INICIADA às ${horaInicioStr}.`);
        
        registroForm.reset();
        carregarEstado(); // Atualiza a tela para o status
    }

    /** Lógica para finalizar a higienização e enviar os dados (Modo Tempo Real) */
    async function finalizarHigienizacao(estadoAnterior) {
        showMessage('info', 'Finalizando, aguarde...');

        const horaTermino = new Date();
        const horaTerminoStr = horaTermino.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        
        const horaInicio = new Date(estadoAnterior.hora_inicio_timestamp);
        
        // Calcular a duração em minutos
        const diferencaMs = horaTermino.getTime() - horaInicio.getTime();
        const duracaoMinutos = Math.round(diferencaMs / (1000 * 60));

        if (duracaoMinutos < 1) {
             showMessage('error', 'A duração da higienização foi muito curta. Verifique o relógio.');
             return;
        }

        const dadosCompletos = {
            ...estadoAnterior,
            hora_termino: horaTerminoStr,
            duracao_minutos: duracaoMinutos, // Inclui a duração
            data_registro: horaTermino.toLocaleDateString('pt-BR'),
            hora_inicio_timestamp: undefined // Remove o campo técnico
        };

        try {
            await fetch(SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify(dadosCompletos),
                headers: { 'Content-Type': 'application/json' },
                mode: 'no-cors'
            });

            localStorage.removeItem(LEITO_EM_ANDAMENTO_KEY); // Limpa o estado
            showMessage('success', `Leito ${dadosCompletos.andar}-${dadosCompletos.leito} FINALIZADO e registrado em ${duracaoMinutos} minutos.`);
            carregarEstado(); // Atualiza a UI para o modo de início

        } catch (error) {
            showMessage('error', 'Erro ao enviar o registro final. Tente novamente.');
            console.error('Erro ao finalizar e enviar:', error);
        }
    }
    
    /** Lógica para enviar dados no Modo Manual (Com validação Noturna) */
    async function enviarRegistroManual(data, requiredFields) {
        
        // 1. Validação de campos obrigatórios
        for (let field of requiredFields) {
            if (!data[field] || data[field] === '') {
                // Validação de Outra Encarregada já está no campo 'encarregada'
                showMessage('error', 'Todos os campos obrigatórios devem ser preenchidos!');
                console.log(`Campo obrigatório ausente: ${field}`);
                const missingInput = document.getElementById(field);
                if (missingInput && missingInput.focus) { missingInput.focus(); }
                return;
            }
        }

        // 2. Validação de horário (CORREÇÃO NOTURNA)
        const inicioMinutes = timeToMinutes(data.hora_inicio);
        let terminoMinutes = timeToMinutes(data.hora_termino);
        
        // Se Término <= Início, assume que cruzou a meia-noite (+24 horas)
        if (terminoMinutes <= inicioMinutes) {
            terminoMinutes += 1440; // 1440 minutos = 24 horas
        }

        if (terminoMinutes <= inicioMinutes) { // Se ainda for menor (duração zero)
             showMessage('error', 'O horário de término deve ser **maior** que o horário de início!');
             horaTerminoInput.focus();
             return;
        }
        
        const duracaoMinutos = terminoMinutes - inicioMinutes;
        data.duracao_minutos = duracaoMinutos;
        data.data_registro = new Date().toLocaleDateString('pt-BR');

        // 3. Envio
        showMessage('info', 'Enviando registro manual...');

        try {
            await fetch(SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify(data),
                headers: { 'Content-Type': 'application/json' },
                mode: 'no-cors'
            });

            showMessage('success', `Registro manual enviado com sucesso! Duração calculada: ${duracaoMinutos} minutos.`);
            
            // Limpa o formulário
            registroForm.reset();
            const defaultRadio = document.getElementById('encarregada_risocleide');
            if (defaultRadio) {
                defaultRadio.checked = true;
                toggleOutraEncarregada(defaultRadio);
            }

        } catch (error) {
            showMessage('error', 'Erro ao enviar o registro manual. Verifique a conexão.');
            console.error('Erro ao enviar registro manual: ', error);
        }
    }


    // --------------------------------------------------------------------------------
    // EVENT LISTENERS
    // --------------------------------------------------------------------------------

    // 3. Listener do Botão FINALIZAR (Modo Tempo Real)
    FINALIZAR_BTN.addEventListener('click', () => {
        const estadoAtual = carregarEstado();
        if (estadoAtual) {
            finalizarHigienizacao(estadoAtual);
        }
    });
    
    // 4. Listener do Botão Alternar Modo
    alternarModoBtn.addEventListener('click', () => {
        const novoModo = modoAtual === 'realtime' ? 'manual' : 'realtime';
        alternarModo(novoModo);
        
        // Reseta os campos que podem ter sido preenchidos
        horaInicioInput.value = '';
        horaTerminoInput.value = '';
    });


    // 5. Listener do Formulário (Dispatcher: Realtime INICIAR ou Manual ENVIAR)
    registroForm.addEventListener('submit', function(event) {
        event.preventDefault();

        const requiredFields = alternarModo(modoAtual, false); // Garante a lista de campos

        const formData = new FormData(this);
        const data = {};
        
        formData.forEach((value, key) => { 
             data[key] = (typeof value === 'string') ? value.toUpperCase().trim() : value; 
        });

        // Lidar com campo "Outra Encarregada" antes de qualquer validação
        if (data.encarregada === 'OUTRA') {
            if (!data.outra_encarregada || data.outra_encarregada === '') {
                 showMessage('error', 'Digite o nome da outra encarregada!');
                 outraEncarregadaInput.focus();
                 return;
            }
            data.encarregada = data.outra_encarregada;
        }
        delete data.outra_encarregada;
        
        // DISPATCHER:
        if (modoAtual === 'realtime') {
            // Validação Mínima para Realtime
            for (let field of requiredFields) {
                if (!data[field] || data[field] === '') {
                    showMessage('error', 'Preencha todos os campos obrigatórios para INICIAR a higienização.');
                    return;
                }
            }
            iniciarHigienizacao(data);
        } else { // modoManual
            enviarRegistroManual(data, requiredFields);
        }
    });

    // 6. Inicialização de Eventos
    
    // Configura listeners para maiúsculas
    const textInputs = registroForm.querySelectorAll('input[type="text"], textarea');
    textInputs.forEach(input => {
        input.addEventListener('input', () => toUpperCase(input));
    });
    
    // Configura listeners para o radio button Encarregada
    encarregadaRadios.forEach(radio => {
        radio.addEventListener('change', () => toggleOutraEncarregada(radio));
    });

    // Estado inicial (exibe o que for necessário)
    carregarEstado(); 
});