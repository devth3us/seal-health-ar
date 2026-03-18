let tamanhoAtualFonte = 16; 

function mudarTamanhoFonte(direcao) {
    if ((direcao === 1 && tamanhoAtualFonte >= 24) || (direcao === -1 && tamanhoAtualFonte <= 12)) return;
    tamanhoAtualFonte += direcao * 2;
    document.body.style.fontSize = tamanhoAtualFonte + "px";
}

function resetarFonte() {
    tamanhoAtualFonte = 16;
    document.body.style.fontSize = "16px";
}

function mudarTema(corHeader, corSidebar) {
    const header = document.querySelector('header');
    const sidebar = document.getElementById('sidebar');
    if (header) header.style.backgroundColor = corHeader;
    if (sidebar) sidebar.style.backgroundColor = corSidebar;
}

function verificarAlertasDoServidor() {
    const flashMessages = document.querySelectorAll('.flash-message');
    flashMessages.forEach(msg => {
        const categoria = msg.getAttribute('data-category');
        Swal.fire({
            icon: categoria === 'success' ? 'success' : 'error',
            title: categoria === 'success' ? 'Sucesso!' : 'Erro',
            text: msg.innerText,
            confirmButtonColor: '#007b8f',
            scrollbarPadding: false 
        });
    });
}

document.addEventListener("DOMContentLoaded", function() {
    verificarAlertasDoServidor();

    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const menuToggle = document.getElementById('menuToggle');
    
    // Seções
    const homeSection = document.getElementById('homeSection');
    const dashboardSection = document.getElementById('dashboardSection');
    const atestadosSection = document.getElementById('atestadosSection');
    const settingsSection = document.getElementById('settingsSection');
    
    // Botões
    const btnHome = document.getElementById('btnHome');
    const btnDashboard = document.getElementById('btnDashboard');
    const showAtestadosLink = document.getElementById('showAtestados');
    const btnConfig = document.getElementById('btnConfig');

    function toggleSidebar() {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('active');
    }

    function showSection(sectionId) {
        // Esconde todas as seções
        [homeSection, dashboardSection, atestadosSection, settingsSection].forEach(s => {
            if(s) s.style.display = 'none';
        });

        // Mostra a seção desejada
        const target = document.getElementById(sectionId);
        if(target) target.style.display = 'block';

        // Fecha menu no mobile
        if(sidebar.classList.contains('open')) toggleSidebar();
    }

    // Listeners de Navegação
    if(menuToggle) menuToggle.addEventListener('click', toggleSidebar);
    if(overlay) overlay.addEventListener('click', toggleSidebar);

    if(btnHome) btnHome.addEventListener('click', (e) => { e.preventDefault(); showSection('homeSection'); });
    if(btnDashboard) btnDashboard.addEventListener('click', (e) => { e.preventDefault(); showSection('dashboardSection'); });
    if(showAtestadosLink) showAtestadosLink.addEventListener('click', (e) => { e.preventDefault(); showSection('atestadosSection'); });
    if(btnConfig) btnConfig.addEventListener('click', (e) => { e.preventDefault(); showSection('settingsSection'); });

    // Lógica do Modal
    const modal = document.getElementById('uploadModal');
    const openBtn = document.getElementById('cameraButton');
    const closeBtn = document.getElementById('closeBtn');

    if(openBtn) openBtn.onclick = () => modal.classList.add("show");
    if(closeBtn) closeBtn.onclick = () => modal.classList.remove("show");

    // Lógica de arquivo
    const fileInput = document.getElementById('file');
    const fileNameDisplay = document.getElementById('file-name-display');
    if(fileInput) {
        fileInput.onchange = function() {
            if(this.files.length > 0) fileNameDisplay.innerText = this.files[0].name;
        };
    }

    // INICIALIZAÇÃO: Mostra apenas a HOME
    showSection('homeSection');
});