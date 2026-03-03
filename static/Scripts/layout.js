// --- VARIÁVEIS GLOBAIS DE CONFIGURAÇÃO ---
let tamanhoAtualFonte = 16; 

// --- FUNÇÕES DE ACESSIBILIDADE E TEMA ---
function mudarTamanhoFonte(direcao) {
    if ((direcao === 1 && tamanhoAtualFonte >= 24) || (direcao === -1 && tamanhoAtualFonte <= 12)) {
        return;
    }
    tamanhoAtualFonte += direcao * 2;
    document.body.style.fontSize = tamanhoAtualFonte + "px";
}

function resetarFonte() {
    tamanhoAtualFonte = 16;
    document.body.style.fontSize = "16px";
}

function mudarTema(corHeader, corSidebar) {
    const header = document.querySelector('header');
    if (header) header.style.backgroundColor = corHeader;
    
    // Muda sidebar
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.style.backgroundColor = corSidebar;

    const h2s = document.querySelectorAll('h2, h3');
    h2s.forEach(h => h.style.color = corHeader);
   
    const btns = document.querySelectorAll('#btnEnviar, .btn-primary, .chat-header, .chat-fab');
    btns.forEach(b => b.style.backgroundColor = corHeader);
}

function carregarDadosDashboard() {
    const dias6Meses = Math.floor(Math.random() * 8); 
    const dias1Ano = dias6Meses + Math.floor(Math.random() * 5); 

    const el6Meses = document.getElementById('kpi-6-months');
    const el1Ano = document.getElementById('kpi-1-year');

    if(el6Meses) el6Meses.innerText = dias6Meses + " Dias";
    if(el1Ano) el1Ano.innerText = dias1Ano + " Dias";
}

function updateFileName(input) {
    const fileName = input.files[0].name;
    document.getElementById('uploadText').innerText = fileName;
    document.getElementById('uploadIcon').className = "fas fa-check-circle";
    document.getElementById('uploadIcon').style.color = "green";
}

function handleSubmit(event) {
    event.preventDefault(); 
  
    const sucesso = Math.random() > 0.3; 

    if (sucesso) {
        Swal.fire({
            icon: 'success',
            title: 'Enviado com Sucesso!',
            text: 'Seu atestado foi enviado e está em análise.',
            confirmButtonColor: '#007b8f'
        }).then(() => {
            document.getElementById('uploadModal').classList.remove("show");
            document.getElementById('uploadForm').reset();
            resetUploadVisual();
        });
    } else {
        Swal.fire({
            icon: 'error',
            title: 'Falha no Envio',
            text: 'O servidor não respondeu. Deseja abrir um chamado técnico?',
            showCancelButton: true,
            confirmButtonText: 'Abrir Chamado',
            cancelButtonText: 'Tentar Novamente',
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6'
        }).then((result) => {
            if (result.isConfirmed) {
                openTicketAction();
                document.getElementById('uploadModal').classList.remove("show");
            }
        });
    }
}

function resetUploadVisual() {
    // Mantido para compatibilidade com partes antigas, caso precise
    const uploadText = document.getElementById('uploadText');
    const uploadIcon = document.getElementById('uploadIcon');
    if(uploadText) uploadText.innerText = "Clique para selecionar ou arraste o arquivo";
    if(uploadIcon) {
        uploadIcon.className = "fas fa-cloud-upload-alt";
        uploadIcon.style.color = "#ccc";
    }
}

function toggleChat() {
    const chat = document.getElementById('chatWindow');
    if(chat) chat.style.display = (chat.style.display === 'flex') ? 'none' : 'flex';
}

function sendReply(type) {
    const body = document.getElementById('chatBody');
    if(!body) return;

    let text = "";
    if(type === 'como_enviar') text = "No menu, clique em 'Enviar Atestado'. Preencha seu CPF e anexe a foto ou PDF.";
    if(type === 'prazo') text = "O prazo legal para envio é de até 48 horas úteis após a emissão.";
    if(type === 'erro') text = "Caso persista o erro, clique no botão 'Abrir Chamado' aqui embaixo.";

    const msgDiv = document.createElement('div');
    msgDiv.className = 'bot-msg';
    msgDiv.style.background = "#e1f5fe"; 
    msgDiv.style.marginTop = "10px";
    msgDiv.innerText = text;
    
    body.appendChild(msgDiv);
    body.scrollTop = body.scrollHeight; 
}

function openTicketAction() {
    Swal.fire({
        title: 'Abrir Chamado',
        input: 'textarea',
        inputLabel: 'Descreva o problema detalhadamente',
        inputPlaceholder: 'Ex: Tentei enviar meu atestado 3 vezes e deu erro...',
        showCancelButton: true,
        confirmButtonText: 'Enviar Solicitação',
        confirmButtonColor: '#007b8f'
    }).then((result) => {
        if (result.isConfirmed) {
            Swal.fire('Chamado Aberto!', 'Nossa equipe de suporte entrará em contato.', 'success');
        }
    });
}


// --- LÓGICA DE INICIALIZAÇÃO E EVENTOS DA PÁGINA ---
document.addEventListener("DOMContentLoaded", function() {
    
    // --- Referências do Menu e Seções ---
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const menuToggle = document.getElementById('menuToggle');
    
    const dashboardSection = document.getElementById('dashboardSection');
    const atestadosSection = document.getElementById('atestadosSection');
    const settingsSection = document.getElementById('settingsSection');
    
    const btnDashboard = document.getElementById('btnDashboard');
    const showAtestadosLink = document.getElementById('showAtestados');
    const btnConfig = document.getElementById('btnConfig');

    // --- Navegação entre Telas ---
    function showSection(sectionId) {
        if(dashboardSection) dashboardSection.style.display = 'none';
        if(atestadosSection) atestadosSection.style.display = 'none';
        if(settingsSection) settingsSection.style.display = 'none';

        const section = document.getElementById(sectionId);
        if(section) {
            section.style.display = 'block';
            section.style.animation = 'fadeIn 0.5s';
            
            if(sectionId === 'dashboardSection') {
                carregarDadosDashboard();
            }
        }

        if(window.innerWidth < 992 && sidebar && sidebar.classList.contains('open')) {
            toggleSidebar();
        }
    }

    function toggleSidebar() {
        if(sidebar) sidebar.classList.toggle('open');
        if(overlay) overlay.classList.toggle('active');
    }

    if(menuToggle) menuToggle.addEventListener('click', toggleSidebar);
    if(overlay) overlay.addEventListener('click', toggleSidebar);

    if(btnDashboard) {
        btnDashboard.addEventListener('click', (e) => {
            e.preventDefault();
            showSection('dashboardSection');
        });
    }

    if(showAtestadosLink) {
        showAtestadosLink.addEventListener('click', (e) => {
            e.preventDefault();
            showSection('atestadosSection');
        });
    }

    if(btnConfig) {
        btnConfig.addEventListener('click', (e) => {
            e.preventDefault();
            showSection('settingsSection');
        });
    }

    // --- Lógica do Modal ---
    const modal = document.getElementById('uploadModal');
    const openBtn = document.getElementById('cameraButton');
    const openBtnSidebar = document.getElementById('openModalSidebar');
    const closeBtn = document.getElementById('closeBtn');

    function openModal() {
        if(!modal) return;
        modal.classList.add("show");
        modal.setAttribute("aria-hidden", "false");
        if (sidebar && sidebar.classList.contains('open')) toggleSidebar();
    }

    if(openBtn) openBtn.addEventListener("click", openModal);
    if(openBtnSidebar) openBtnSidebar.addEventListener("click", (e) => {
        e.preventDefault();
        openModal();
    });

    if(closeBtn) {
        closeBtn.addEventListener("click", () => {
            modal.classList.remove("show");
            modal.setAttribute("aria-hidden", "true");
        });
    }

    window.onclick = (event) => {
        if (event.target === modal) {
            modal.classList.remove("show");
            modal.setAttribute("aria-hidden", "true");
        }
    };

    // --- NOVA Lógica de Drag & Drop e Prévia do Atestado ---
    const uploadArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('file');
    const uploadPrompt = document.getElementById('upload-prompt');
    const uploadPreview = document.getElementById('upload-preview');
    const imagePreview = document.getElementById('image-preview');
    const fileNameDisplay = document.getElementById('file-name');
    const removeBtn = document.getElementById('remove-file');

    // Verifica se os elementos do novo modal existem antes de aplicar os eventos
    if (uploadArea && fileInput) {
        
        uploadArea.addEventListener('click', (e) => {
            if (e.target !== removeBtn) {
                fileInput.click();
            }
        });

        fileInput.addEventListener('change', function() {
            if (this.files.length > 0) {
                mostrarPrevia(this.files[0]);
            }
        });

        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault(); 
            uploadArea.classList.add('dragover'); 
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                fileInput.files = e.dataTransfer.files; 
                mostrarPrevia(e.dataTransfer.files[0]);
            }
        });

        function mostrarPrevia(file) {
            fileNameDisplay.textContent = file.name;
            
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    imagePreview.src = e.target.result;
                    imagePreview.style.display = 'block';
                }
                reader.readAsDataURL(file);
            } else {
                imagePreview.style.display = 'none'; 
            }

            uploadPrompt.classList.add('hidden');
            uploadPreview.classList.remove('hidden');
        }

        removeBtn.addEventListener('click', () => {
            fileInput.value = ''; 
            uploadPrompt.classList.remove('hidden'); 
            uploadPreview.classList.add('hidden'); 
        });
    }

    // Inicia a tela principal
    showSection('dashboardSection');
});