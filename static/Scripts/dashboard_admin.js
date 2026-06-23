document.addEventListener("DOMContentLoaded", function() {
  const menuToggle = document.getElementById("menuToggle");
  const sidebar = document.getElementById("sidebar");
  const conteudo = document.getElementById("conteudo");

  // toggle sidebar
  menuToggle.addEventListener("click", () => {
    sidebar.classList.toggle("hidden");
  });

  // clicar nos botoes do menu
  document.querySelectorAll(".menu-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const action = btn.dataset.action;
      if (action === "buscar") {
        fetch("/admin/busca")
          .then(r => r.text())
          .then(html => conteudo.innerHTML = html)
          .catch(e => conteudo.innerHTML = "<p style='color:red'>Erro ao carregar busca.</p>");
      } else if (action === "cadastrar") {
        fetch("/admin/usuarios")   // rota que retorna o form admin cadastro1.html
          .then(r => r.text())
          .then(html => conteudo.innerHTML = html)
          .catch(e => conteudo.innerHTML = "<p style='color:red'>Erro ao carregar cadastro.</p>");
      } else if (action === "config") {
        // para agora simplesmente mostrar um placeholder
        conteudo.innerHTML = "<h2>Configurações</h2><p>Opções administrativas (em construção).</p>";
      }
      // esconder sidebar em telas pequenas automaticamente
      if (window.innerWidth <= 900) sidebar.classList.add("hidden");
    });
  });
});