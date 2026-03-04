let tamanhoAtualFonte = 16; 

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
// Esta função procura por mensagens geradas pelo Python e as transforma em pop-ups
function verificarAlertasDoServidor() {
    // Procura divs escondidas que o HTML gera quando há um 'flash'
    const flashMessages = document.querySelectorAll('.flash-message');
    
    flashMessages.forEach(msg => {
        const categoria = msg.getAttribute('data-category');
        const texto = msg.innerText;
        
        if (categoria === 'success') {
            Swal.fire({
                icon: 'success',
                title: 'Sucesso!',
                text: texto,
                confirmButtonColor: '#007b8f'
            });
        } else if (categoria === 'error') {
            Swal.fire({
                icon: 'error',
                title: 'Ops! Algo deu errado',
                text: texto,
                confirmButtonColor: '#d33'
            });
        }
    });
}

document.addEventListener("DOMContentLoaded", function() {
    
    // Dispara a verificação de alertas assim que a página carrega
    verificarAlertasDoServidor();

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
        }

        // Fecha a sidebar no celular quando clica em um link
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
            if(dashboardSection) showSection('dashboardSection');
            else showSection('atestadosSection'); // Fallback se não tiver dashboard
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

    // --- Modal ---
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

    // --- Previa do Atestado ---
    const uploadArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('file');
    const uploadPrompt = document.getElementById('upload-prompt');
    const uploadPreview = document.getElementById('upload-preview');
    const imagePreview = document.getElementById('image-preview');
    const fileNameDisplay = document.getElementById('file-name');
    const removeBtn = document.getElementById('remove-file');

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

    // Inicia a tela principal exibindo os atestados
    showSection('atestadosSection');
});