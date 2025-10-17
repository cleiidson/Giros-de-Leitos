document.addEventListener('DOMContentLoaded', function() {
    // 1. Definição de Constantes e Elementos DOM
    const REGISTRO_FORM_ID = 'registroForm';
    const MENSAGEM_ID = 'mensagem';
    const OUTRA_ENCARREGADA_DIV_ID = 'outra_encarregada_div';
    const OUTRA_ENCARREGADA_INPUT_ID = 'outra_encarregada';
    const HISTORICO_TABELA_ID = 'historicoTabela';
    const SENHA_HISTORICO_INPUT_ID = 'senhaHistorico';
    const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxjaQoyr-iZoK6AEywBkpfmukcVds3PhENUyNEFMXtHD5wkpACvQW0L2L21pTiJyO_XE4KA/exec'; // URL fictícia para segurança/exemplo. Mantenha a sua real.

    const registroForm = document.getElementById(REGISTRO_FORM_ID);
    const encarregadaRadios = document.getElementsByName('encarregada');
    const outraEncarregadaDiv = document.getElementById(OUTRA_ENCARREGADA_DIV_ID);
    const outraEncarregadaInput = document.getElementById(OUTRA_ENCARREGADA_INPUT_ID);
    const mensagemDiv = document.getElementById(MENSAGEM_ID);

    if (!registroForm || !outraEncarregadaDiv || !outraEncarregadaInput || !mensagemDiv) {
        console.error('Um ou mais elementos DOM necessários não foram encontrados.');
        return; // Sai se faltar algum elemento crucial
    }
    
    // Lista de campos obrigatórios (move para o topo para fácil manutenção)
    const REQUIRED_FIELDS = ['andar', 'leito', 'hora_inicio', 'hora_termino', 'colaboradora', 'encarregada', 'no_sistema'];

    // 2. Função para exibir mensagens (Refatorada)
    function showMessage(type, message) {
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

        // Melhoria: Adiciona um listener para esconder a mensagem ao interagir com o form
        // Usamos delegação ou simplesmente resetamos o listener
        const inputs = registroForm.querySelectorAll('input, textarea');
        inputs.forEach(input => {
            input.addEventListener('focus', () => {
                mensagemDiv.innerHTML = '';
                mensagemDiv.style.display = 'none';
            }, { once: true });
        });
    }

    // 3. Mostrar/esconder campo "Outra Encarregada"
    const toggleOutraEncarregada = (radio) => {
        const isOutra = radio.value === 'outra';
        outraEncarregadaDiv.style.display = isOutra ? 'block' : 'none';
        
        // Melhoria: Limpar valor apenas quando muda para não-outra
        if (!isOutra) {
            outraEncarregadaInput.value = '';
        }
        // Melhoria: Adicionar atributo 'required' dinamicamente (ajuda na validação nativa do HTML)
        outraEncarregadaInput.required = isOutra;
    };

    encarregadaRadios.forEach(radio => {
        radio.addEventListener('change', () => toggleOutraEncarregada(radio));
    });
    
    // Inicializar o estado ao carregar a página (caso algum radio esteja checked no HTML)
    // Encontra o radio checked ou usa o primeiro como fallback para inicialização
    const initialCheckedRadio = Array.from(encarregadaRadios).find(radio => radio.checked) || encarregadaRadios[0];
    if (initialCheckedRadio) {
        toggleOutraEncarregada(initialCheckedRadio);
    }


    // 4. Converter texto para maiúsculas em tempo real (Mantido)
    const toUpperCase = (input) => {
        // Evita que o cursor pule para o final em campos que não sejam text/textarea
        input.value = input.value.toUpperCase();
    };

    const textInputs = registroForm.querySelectorAll('input[type="text"], textarea');
    textInputs.forEach(input => {
        input.addEventListener('input', () => toUpperCase(input));
    });

    // 5. Envio do formulário
    registroForm.addEventListener('submit', async function(event) { // Usamos async
        event.preventDefault();

        const formData = new FormData(this);
        const data = {};
        
        // Processar os dados e converter para maiúsculas (Melhoria: usar um objeto temporário)
        formData.forEach((value, key) => { 
             // O toUpperCase deve ser aplicado apenas a strings
             data[key] = (typeof value === 'string') ? value.toUpperCase().trim() : value; 
        });
        
        // --- 5.1 Validação dos campos obrigatórios ---
        for (let field of REQUIRED_FIELDS) {
            if (!data[field] || data[field] === '') {
                // Adicionalmente, verifica o campo 'outra_encarregada' se 'encarregada' for 'OUTRA'
                if (field === 'encarregada' && data.encarregada === 'OUTRA' && (!data.outra_encarregada || data.outra_encarregada === '')) {
                     showMessage('error', 'Digite o nome da outra encarregada!');
                     console.log('Campo obrigatório ausente: outra_encarregada');
                     // Adicional: Foca no campo que precisa de atenção
                     outraEncarregadaInput.focus();
                     return;
                }
                
                if (field === 'encarregada' && data.encarregada === 'OUTRA') {
                    // Já tratamos acima, podemos pular esta iteração
                    continue;
                }

                // Se o campo estiver vazio ou não definido
                showMessage('error', 'Todos os campos obrigatórios devem ser preenchidos!');
                console.log(`Campo obrigatório ausente: ${field}`);
                
                // Tenta focar no campo ausente (se existir)
                const missingInput = this.elements[field];
                if (missingInput && missingInput.focus) {
                    missingInput.focus();
                }
                return;
            }
        }
        
        // --- 5.2 Validação de horário ---
        const horaInicioStr = data.hora_inicio;
        const horaTerminoStr = data.hora_termino;
        
        // Usar strings e comparação direta pode ser mais simples e menos propenso a erros de data
        // assumindo que os inputs são sempre HH:MM
        if (horaTerminoStr <= horaInicioStr) {
             showMessage('error', 'O horário de término deve ser **maior** que o horário de início!');
             console.log('Validação de horário falhou: Término <= Início');
             this.elements.hora_termino.focus(); // Foca no campo de término
             return;
        }

        // --- 5.3 Lidar com campo "Outra Encarregada" (Melhoria na lógica) ---
        if (data.encarregada === 'OUTRA') {
            // O campo 'outra_encarregada' já foi validado acima
            data.encarregada = data.outra_encarregada;
        }
        delete data.outra_encarregada; // Remove o campo extra antes do envio

        // --- 5.4 Enviar para o Google Apps Script ---
        showMessage('success', 'Enviando registro...');

        try {
            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify(data),
                headers: {
                    'Content-Type': 'application/json'
                },
                mode: 'no-cors'
            });

            // Melhoria: Como estamos usando 'no-cors', não podemos ler a resposta.
            // Assumimos sucesso aqui, mas idealmente o Apps Script deveria retornar um JSONP ou usar CORS
            // e um `try-catch` mais robusto.

            showMessage('success', 'Registro enviado com sucesso!');
            console.log('Registro enviado com sucesso, dados:', data);

            // --- 5.5 Limpar formulário ---
            this.reset();
            outraEncarregadaDiv.style.display = 'none';
            // Re-checar o radio padrão e re-executar o toggle
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

    // 6. Função para carregar histórico (Mantido e melhorado)
    window.carregarHistorico = function() {
        const senhaInput = document.getElementById(SENHA_HISTORICO_INPUT_ID);
        const senha = senhaInput.value;
        const tabelaDiv = document.getElementById(HISTORICO_TABELA_ID);
        
        tabelaDiv.innerHTML = ''; // Limpa antes de carregar

        if (!senha) {
            tabelaDiv.innerHTML = '<p class="text-danger">Digite a senha para acessar o histórico!</p>';
            senhaInput.focus();
            return;
        }

        tabelaDiv.innerHTML = '<p class="text-info">Carregando histórico...</p>';

        // MELHORIA CRÍTICA: O modo 'no-cors' BLOQUEIA a leitura da resposta, impedindo de ver o JSON real.
        // É essencial usar 'cors' se o Apps Script estiver configurado para CORS (e não 'no-cors' se esperar ler o JSON).
        // Se a chamada for APENAS para o Apps Script e ele for o destino final, use 'no-cors' para evitar o erro CORS.
        // No entanto, para fins de demonstração, manteremos a SIMULAÇÃO.

        fetch(`${SCRIPT_URL}?senha=${encodeURIComponent(senha)}&encarregada=RISOCLÉIA`, {
            method: 'GET',
            // Mantenha 'no-cors' se o seu Apps Script não tiver CORS configurado, mas lembre-se que você não receberá os dados.
            // Para receber os dados, o modo DEVE ser 'cors' e o Apps Script DEVE permitir o seu domínio.
            mode: 'no-cors' 
        })
        .then(() => {
            // SIMULAÇÃO DE DADOS devido ao 'no-cors'.
            if (senha.toLowerCase() === 'gps123') { // Verifica a senha para a demo
                const historicoSimulado = [
                    { "Data Registro": "2025-10-12", "Andar": "1", "Leito": "101", "Hora de Início": "08:00", "Hora de Término": "09:00", "Colaboradora": "ANA", "No Sistema": "SIM", "Observações": "TESTE 1" },
                    { "Data Registro": "2025-10-12", "Andar": "2", "Leito": "202", "Hora de Início": "10:00", "Hora de Término": "11:00", "Colaboradora": "MARIA", "No Sistema": "NÃO", "Observações": "TESTE 2" },
                    { "Data Registro": "2025-10-13", "Andar": "3", "Leito": "303", "Hora de Início": "11:30", "Hora de Término": "12:30", "Colaboradora": "JOANA", "No Sistema": "SIM", "Observações": "" }
                ];
                gerarTabelaHistorico(historicoSimulado, tabelaDiv);
            } else {
                 tabelaDiv.innerHTML = '<p class="text-danger">Senha incorreta ou histórico não encontrado.</p>';
            }

            senhaInput.value = ''; // Limpa senha
        })
        .catch(error => {
            tabelaDiv.innerHTML = '<p class="text-danger">Erro ao carregar histórico (Falha de Rede ou CORS): ' + error.message + '</p>';
        });
    };

    // 7. Função para gerar tabela do histórico (Mantida)
    function gerarTabelaHistorico(historico, tabelaDiv) {
        if (!historico || historico.length === 0) {
            tabelaDiv.innerHTML = '<p class="text-warning">Nenhum registro encontrado para esta encarregada.</p>';
            return;
        }

        // Melhoria: Usar Array.prototype.map e Array.prototype.join para construir HTML
        const headers = Object.keys(historico[0]); // Pega as chaves do primeiro objeto para os cabeçalhos
        
        const thead = `<thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>`;
        
        const tbody = `<tbody>${historico.map(reg => 
            `<tr>${headers.map(h => `<td>${reg[h] || '-'}</td>`).join('')}</tr>`
        ).join('')}</tbody>`;

        tabelaDiv.innerHTML = `<table class="table table-striped table-hover table-sm">${thead}${tbody}</table>`;
    }
});