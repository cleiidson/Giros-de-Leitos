document.addEventListener('DOMContentLoaded', function() {
    // 1. Definição de Constantes e Elementos DOM
    const REGISTRO_FORM_ID = 'registroForm';
    // Mantenha sua URL REAL aqui
    const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz0XwANB0bq3z6WDisgRXYxpcgVHThlCLeJK1VRsFs9cb365zpnL1XxbEq25XhYVovKOg/exec'; 
    const LEITO_EM_ANDAMENTO_KEY = 'leitosEmAndamento'; // CHAVE PARA O ARRAY DE LEITOS ATIVOS
    const MODO_ATUAL_KEY = 'modoRegistro'; 

    // Elementos da Interface
    const registroForm = document.getElementById(REGISTRO_FORM_ID);
    const formCard = document.getElementById('formCard');
    const encarregadaRadios = document.getElementsByName('encarregada');
    const outraEncarregadaDiv = document.getElementById('outra_encarregada_div');
    const outraEncarregadaInput = document.getElementById('outra_encarregada');
    const mensagemDiv = document.getElementById('mensagem');
    const submitBtn = document.getElementById('submitBtn');

    // Elementos do Modo Tempo Real (Múltiplos Leitos)
    const STATUS_DIV = document.getElementById('statusEmAndamento');
    const LEITOS_ATIVOS_CONTAINER = document.getElementById('leitosAtivosContainer');
    const COUNT_LEITOS_ATIVOS = document.getElementById('countLeitosAtivos');
    
    // Elementos do Modo Manual/Noturno
    const alternarModoBtn = document.getElementById('alternarModoBtn');
    const horariosManualDiv = document.getElementById('horariosManual');
    const horaInicioInput = document.getElementById('hora_inicio');
    const horaTerminoInput = document.getElementById('hora_termino');
    
    // Lista de campos obrigatórios
    const REQUIRED_FIELDS_MANUAL = ['andar', 'leito', 'hora_inicio', 'hora_termino', 'colaboradora', 'encarregada', 'no_sistema'];
    const REQUIRED_FIELDS_REALTIME = ['andar', 'leito', 'colaboradora', 'encarregada', 'no_sistema'];

    if (!registroForm || !mensagemDiv || !STATUS_DIV || !alternarModoBtn || !horariosManualDiv) {
        console.error('Um ou mais elementos DOM essenciais não foram encontrados. Verifique o HTML.');
        return; 
    }
    
    // VARIÁVEL DE ESTADO
    let modoAtual = localStorage.getItem(MODO_ATUAL_KEY) || 'realtime'; 

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
        alertDiv.innerHTML = `${message}<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>`;
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

    // FUNÇÕES DE HISTÓRICO REMOVIDAS
    
    // --------------------------------------------------------------------------------
    // LÓGICA DE MÚLTIPLOS LEITOS
    // --------------------------------------------------------------------------------

    /** Carrega a lista de leitos ativos do localStorage */
    function getLeitosAtivos() {
        const estadoJSON = localStorage.getItem(LEITO_EM_ANDAMENTO_KEY);
        return estadoJSON ? JSON.parse(estadoJSON) : [];
    }

    /** Salva a lista de leitos ativos no localStorage */
    function saveLeitosAtivos(leitos) {
        localStorage.setItem(LEITO_EM_ANDAMENTO_KEY, JSON.stringify(leitos));
    }

    /** Renderiza a lista de leitos ativos na UI. */
    function renderLeitosAtivos(leitos) {
        LEITOS_ATIVOS_CONTAINER.innerHTML = '';
        COUNT_LEITOS_ATIVOS.textContent = leitos.length;

        if (leitos.length === 0) {
            STATUS_DIV.style.display = 'none';
            LEITOS_ATIVOS_CONTAINER.innerHTML = '<p class="text-center text-muted p-3 mb-0">Nenhuma higienização ativa.</p>';
            return;
        }

        STATUS_DIV.style.display = 'block';
        
        leitos.forEach(estado => {
            const item = document.createElement('div');
            item.className = 'list-group-item d-flex justify-content-between align-items-center';
            item.innerHTML = `
                <div>
                    <span class="badge bg-primary me-2">${estado.andar}-${estado.leito}</span>
                    <span class="text-muted small">Início: ${estado.hora_inicio}</span>
                    <br>
                    <span class="small text-secondary">Colab.: ${estado.colaboradora.slice(0, 15)}...</span>
                </div>
                <button class="btn btn-sm btn-danger finalizar-leito-btn" 
                        data-id="${estado.leitoID}"
                        title="Finalizar agora (Tempo atual)">
                    <i class="bi bi-stop-circle"></i> Finalizar
                </button>
            `;
            LEITOS_ATIVOS_CONTAINER.appendChild(item);
        });
        
        // Adiciona listeners para os novos botões de finalizar
        document.querySelectorAll('.finalizar-leito-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const leitoID = e.currentTarget.getAttribute('data-id');
                finalizarHigienizacao(leitoID);
            });
        });
    }

    /** Carrega o estado do leito em higienização e atualiza a UI (principal dispatcher). */
    function carregarEstado() {
        const leitosAtivos = getLeitosAtivos();
        renderLeitosAtivos(leitosAtivos);
        
        // Garante que a visibilidade do formulário está correta com base no modo
        alternarModo(modoAtual, false); 
    }

    /** Lógica para finalizar a higienização e enviar os dados (Modo Tempo Real) */
    async function finalizarHigienizacao(leitoID) {
        const leitosAtivos = getLeitosAtivos();
        const index = leitosAtivos.findIndex(l => l.leitoID === leitoID);

        if (index === -1) {
            showMessage('error', 'Leito não encontrado na lista ativa. Recarregue a página.');
            carregarEstado();
            return;
        }
        
        const estadoAnterior = leitosAtivos[index];
        showMessage('info', `Enviando registro de finalização para ${estadoAnterior.andar}-${estadoAnterior.leito}...`);

        const horaTermino = new Date();
        const horaTerminoStr = horaTermino.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        
        const horaInicio = new Date(estadoAnterior.hora_inicio_timestamp);
        
        const diferencaMs = horaTermino.getTime() - horaInicio.getTime();
        const duracaoMinutos = Math.round(diferencaMs / (1000 * 60));

        if (duracaoMinutos < 1) {
             showMessage('error', 'A duração da higienização foi muito curta. O registro não será enviado.');
             return;
        }

        const dadosCompletos = {
            ...estadoAnterior,
            hora_termino: horaTerminoStr,
            duracao_minutos: duracaoMinutos,
            data_registro: horaTermino.toLocaleDateString('pt-BR'),
            leitoID: undefined, 
            hora_inicio_timestamp: undefined
        };

        try {
            await fetch(SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify(dadosCompletos),
                headers: { 'Content-Type': 'application/json' },
                mode: 'no-cors'
            });

            leitosAtivos.splice(index, 1);
            saveLeitosAtivos(leitosAtivos);
            
            showMessage('success', `Leito - ${estadoAnterior.leito} FINALIZADO e HIGIENIZADO em ${duracaoMinutos} minutos.`);
            carregarEstado();

        } catch (error) {
            showMessage('error', 'Erro ao enviar o registro final. Tente novamente.');
            console.error('Erro ao finalizar e enviar:', error);
        }
    }


    // --------------------------------------------------------------------------------
    // ALTERNÂNCIA DE MODOS
    // --------------------------------------------------------------------------------

    function alternarModo(novoModo, updateStorage = true) {
        modoAtual = novoModo;
        if (updateStorage) {
            localStorage.setItem(MODO_ATUAL_KEY, novoModo);
        }
        
        const requiredFields = novoModo === 'manual' ? REQUIRED_FIELDS_MANUAL : REQUIRED_FIELDS_REALTIME;
        
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
        
        horaInicioInput.required = novoModo === 'manual';
        horaTerminoInput.required = novoModo === 'manual';
        
        return requiredFields;
    }

    // --------------------------------------------------------------------------------
    // LÓGICA DE ENVIO E SUBMISSÃO
    // --------------------------------------------------------------------------------

    /** Lógica para iniciar a higienização (Modo Tempo Real) */
    function iniciarHigienizacao(data) {
        const leitosAtivos = getLeitosAtivos();
        
        // Verifica se o leito já está ativo (para evitar duplicidade)
        const isAlreadyActive = leitosAtivos.some(l => 
            l.andar === data.andar && l.leito === data.leito
        );
        
        if (isAlreadyActive) {
            showMessage('error', `O Leito - ${data.leito} já está ativo!`);
            return;
        }

        const now = new Date();
        const horaInicioStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        const novoEstado = {
            andar: data.andar,
            leito: data.leito,
            encarregada: data.encarregada,
            colaboradora: data.colaboradora,
            no_sistema: data.no_sistema,
            observacoes: data.observacoes,
            hora_inicio_timestamp: now.toISOString(),
            hora_inicio: horaInicioStr,
            leitoID: Date.now().toString() // ID único para fácil remoção
        };

        leitosAtivos.push(novoEstado);
        saveLeitosAtivos(leitosAtivos);
        
        showMessage('success', `Higienização do Leito ${novoEstado.leito} INICIADA.`);
        
        registroForm.reset();
        carregarEstado();
    }

    /** Lógica para enviar dados no Modo Manual (Com validação Noturna) */
    async function enviarRegistroManual(data, requiredFields) {
        
        // 1. Validação de campos obrigatórios
        for (let field of requiredFields) {
            if (!data[field] || data[field] === '') {
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
        
        if (terminoMinutes <= inicioMinutes) {
            terminoMinutes += 1440; // 1440 minutos = 24 horas
        }

        if (terminoMinutes <= inicioMinutes) { 
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

            // MENSAGEM DE SUCESSO AJUSTADA: Remove a duração do display
            showMessage('success', 'Registro manual enviado com sucesso!'); 
            
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
    // EVENT LISTENERS DE INICIALIZAÇÃO
    // --------------------------------------------------------------------------------

    // 4. Listener do Botão Alternar Modo
    alternarModoBtn.addEventListener('click', () => {
        const novoModo = modoAtual === 'realtime' ? 'manual' : 'realtime';
        alternarModo(novoModo);
        
        horaInicioInput.value = '';
        horaTerminoInput.value = '';
    });

    // 5. Listener do Formulário (Dispatcher)
    registroForm.addEventListener('submit', function(event) {
        event.preventDefault();

        const requiredFields = alternarModo(modoAtual, false);

        const formData = new FormData(this);
        const data = {};
        
        formData.forEach((value, key) => { 
             data[key] = (typeof value === 'string') ? value.toUpperCase().trim() : value; 
        });

        if (data.encarregada === 'OUTRA') {
            if (!data.outra_encarregada || data.outra_encarregada === '') {
                 showMessage('error', 'Digite o nome da outra encarregada!');
                 outraEncarregadaInput.focus();
                 return;
            }
            data.encarregada = data.outra_encarregada;
        }
        delete data.outra_encarregada;
        
        if (modoAtual === 'realtime') {
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

    // 6. Inicialização
    
    // Configura listeners para maiúsculas
    const textInputs = registroForm.querySelectorAll('input[type="text"], textarea');
    textInputs.forEach(input => {
        input.addEventListener('input', () => toUpperCase(input));
    });
    
    // Configura listeners para o radio button Encarregada
    encarregadaRadios.forEach(radio => {
        radio.addEventListener('change', () => toggleOutraEncarregada(radio));
    });

    // Estado inicial
    carregarEstado(); 
});