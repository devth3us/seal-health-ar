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
    
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.style.backgroundColor = corSidebar;

    const h2s = document.querySelectorAll('h2, h3');
    h2s.forEach(h => h.style.color = corHeader);
   
    const btns = document.querySelectorAll('#btnEnviar, .btn-primary, .chat-header, .chat-fab');
    btns.forEach(b => b.style.backgroundColor = corHeader);
}

function verificarAlertasDoServidor() {
    const flashMessages = document.querySelectorAll('.flash-message');
    flashMessages.forEach(msg => {
        const categoria = msg.getAttribute('data-category');
        const texto = msg.innerText;
        
        if (categoria === 'success') {
            Swal.fire({ icon: 'success', title: 'Sucesso!', text: texto, confirmButtonColor: '#007b8f' });
        } else if (categoria === 'error') {
            Swal.fire({ icon: 'error', title: 'Ops! Algo deu errado', text: texto, confirmButtonColor: '#d33' });
        }
    });
}

document.addEventListener("DOMContentLoaded", function() {
    verificarAlertasDoServidor();

    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const menuToggle = document.getElementById('menuToggle');
    
    const atestadosSection = document.getElementById('atestadosSection');
    const settingsSection = document.getElementById('settingsSection');
    
    const btnHome = document.getElementById('btnHome');
    const showAtestadosLink = document.getElementById('showAtestados');
    const btnConfig = document.getElementById('btnConfig');

    function toggleSidebar() {
        if(sidebar) sidebar.classList.toggle('open');
        if(overlay) overlay.classList.toggle('active');
    }

    function showSection(sectionId) {
        if(atestadosSection) atestadosSection.style.display = 'none';
        if(settingsSection) settingsSection.style.display = 'none';

        const section = document.getElementById(sectionId);
        if(section) {
            section.style.display = 'block';
            section.style.animation = 'fadeIn 0.5s';
        }

        // FECHA A SIDEBAR SEMPRE QUE MUDAR DE SEÇÃO (Importante para Mobile)
        if(sidebar && sidebar.classList.contains('open')) {
            toggleSidebar();
        }
    }

    if(menuToggle) menuToggle.addEventListener('click', toggleSidebar);
    if(overlay) overlay.addEventListener('click', toggleSidebar);

    if(btnHome) {
        btnHome.addEventListener('click', (e) => {
            e.preventDefault();
            showSection('atestadosSection'); 
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

    // Modal logic
    const modal = document.getElementById('uploadModal');
    const openBtn = document.getElementById('cameraButton');
    const openBtnSidebar = document.getElementById('openModalSidebar');
    const closeBtn = document.getElementById('closeBtn');

    function openModal() {
        if(!modal) return;
        modal.classList.add("show");
        if (sidebar && sidebar.classList.contains('open')) toggleSidebar();
    }

    if(openBtn) openBtn.addEventListener("click", openModal);
    if(openBtnSidebar) openBtnSidebar.addEventListener("click", (e) => {
        e.preventDefault();
        openModal();
    });

    if(closeBtn) closeBtn.addEventListener("click", () => modal.classList.remove("show"));

    window.onclick = (event) => {
        if (event.target === modal) modal.classList.remove("show");
    };

    // Previa logic
    const uploadArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('file');
    const uploadPrompt = document.getElementById('upload-prompt');
    const uploadPreview = document.getElementById('upload-preview');
    const imagePreview = document.getElementById('image-preview');
    const fileNameDisplay = document.getElementById('file-name');
    const removeBtn = document.getElementById('remove-file');

    if (uploadArea && fileInput) {
        uploadArea.addEventListener('click', (e) => { if (e.target !== removeBtn) fileInput.click(); });
        fileInput.addEventListener('change', function() { if (this.files.length > 0) mostrarPrevia(this.files[0]); });
        
        function mostrarPrevia(file) {
            fileNameDisplay.textContent = file.name;
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = e => { imagePreview.src = e.target.result; imagePreview.style.display = 'block'; };
                reader.readAsDataURL(file);
            } else { imagePreview.style.display = 'none'; }
            uploadPrompt.classList.add('hidden');
            uploadPreview.classList.remove('hidden');
        }

        removeBtn.addEventListener('click', () => {
            fileInput.value = ''; uploadPrompt.classList.remove('hidden'); uploadPreview.classList.add('hidden'); 
        });
    }

    showSection('atestadosSection');
});