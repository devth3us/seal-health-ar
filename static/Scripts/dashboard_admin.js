// Enquanto o backend com IA não funciona, este JS pode ficar ativo

/*
document.addEventListener("DOMContentLoaded", function() {
  const menuToggle = document.getElementById("menuToggle");
  const sidebar = document.getElementById("sidebar");
  const conteudo = document.getElementById("conteudo");

  // // toggle sidebar --- Não é necessario

  // menuToggle.addEventListener("click", () => {
  //   sidebar.classList.toggle("hidden");
  // });



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
}); */



/* JavaScript Dashboard */

/* =====================================================
   Seal Health — Painel Administrativo
   JS puro: sidebar, modal Lux, chat com mock de IA
   Espelha a tabela `lux_interactions` do banco:
     - user_id (FK)        → MOCK_USER_ID
     - prompt              → texto do usuário
     - response            → texto da Lux
     - context (JSONB)     → histórico que a Lux "lembra"
     - thinking_time_ms    → tempo de raciocínio
     - created_at          → timestamp local
   ===================================================== */

(function () {
  "use strict";

  /* ============== SIDEBAR (mobile drawer) ============== */
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebar-overlay");
  const btnOpen = document.getElementById("sidebar-toggle");
  const btnClose = document.getElementById("sidebar-close");

  function openSidebar() {
    sidebar.classList.add("is-open");
    overlay.classList.add("is-open");
    overlay.setAttribute("aria-hidden", "false");
  }
  function closeSidebar() {
    sidebar.classList.remove("is-open");
    overlay.classList.remove("is-open");
    overlay.setAttribute("aria-hidden", "true");
  }

  btnOpen?.addEventListener("click", openSidebar);
  btnClose?.addEventListener("click", closeSidebar);
  overlay?.addEventListener("click", closeSidebar);

  document.querySelectorAll(".sidebar .nav-item").forEach((el) => {
    el.addEventListener("click", () => {
      if (window.matchMedia("(max-width: 900px)").matches) closeSidebar();
    });
  });
  window.addEventListener("resize", () => {
    if (!window.matchMedia("(max-width: 900px)").matches) closeSidebar();
  });

  /* ============== LUX MODAL ============== */
  const fab = document.getElementById("lux-fab");
  const modal = document.getElementById("lux-modal");
  const messagesEl = document.getElementById("lux-messages");
  const form = document.getElementById("lux-form");
  const input = document.getElementById("lux-input");
  const sendBtn = document.getElementById("lux-send");
  const suggestionsWrap = document.getElementById("lux-suggestions");
  const clearBtn = document.getElementById("lux-clear");

  // Meta UI (refletem os campos da tabela)
  const ctxIndicator = document.getElementById("lux-ctx-indicator");
  const ctxCount = document.getElementById("lux-ctx-count");
  const metaTime = document.getElementById("lux-meta-time");
  const lastTime = document.getElementById("lux-last-time");

  /* ============== ESTADO (espelho da tabela lux_interactions) ============== */
  // Em produção: viria do auth; aqui simulamos.
  const MOCK_USER_ID = "00000000-0000-0000-0000-000000000001";
  const CONTEXT_LIMIT = 12; // últimas N mensagens que a IA "lembra"

  // Histórico de contexto: array de { role: 'user'|'assistant', content: string }
  let conversationContext = [];
  // Histórico bruto de interações (1 linha = 1 registro pronto pra ir ao banco)
  let interactions = [];

  let isThinking = false;
  let lastFocus = null;

  function openModal() {
    lastFocus = document.activeElement;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    setTimeout(() => input?.focus(), 200);
  }
  function closeModal() {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  fab?.addEventListener("click", openModal);
  modal?.querySelectorAll("[data-close]").forEach((el) => {
    el.addEventListener("click", closeModal);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("is-open")) closeModal();
  });

  /* ============== INPUT BEHAVIOR ============== */
  function autoResize() {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 120) + "px";
    sendBtn.disabled = !input.value.trim() || isThinking;
  }
  
  input?.addEventListener("input", autoResize);
  input?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      form.requestSubmit();
    }
  });
  sendBtn.disabled = true;

  /* ============== SUGGESTIONS ============== */
  suggestionsWrap?.querySelectorAll("[data-suggest]").forEach((btn) => {
    btn.addEventListener("click", () => sendMessage(btn.getAttribute("data-suggest")));
  });

  /* ============== FORM SUBMIT ============== */
  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text || isThinking) return;
    sendMessage(text);
    input.value = "";
    autoResize();
  });

  /* ============== LIMPAR CONTEXTO ============== */
  clearBtn?.addEventListener("click", () => {
    if (!conversationContext.length) return;
    if (!confirm("Limpar o contexto da conversa? A Lux vai esquecer o que foi dito.")) return;
    conversationContext = [];
    messagesEl.innerHTML = "";
    renderEmptyState();
    metaTime.hidden = true;
    updateContextUI();
  });

  /* ============== RENDER HELPERS ============== */
  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function tinyMarkdown(text) {
    let safe = escapeHtml(text);
    safe = safe.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    safe = safe.replace(/(^|[^*])\*(?!\s)([^*]+?)\*(?!\*)/g, "$1<em>$2</em>");
    safe = safe.replace(/`([^`]+)`/g, "<code>$1</code>");
    if (/^- /m.test(safe)) {
      safe = safe.replace(/(?:^|\n)((?:- .+(?:\n|$))+)/g, (_, block) => {
        const items = block.trim().split("\n")
          .map((l) => "<li>" + l.replace(/^- /, "") + "</li>").join("");
        return "<ul style=\"margin:6px 0;padding-left:18px\">" + items + "</ul>";
      });
    }
    safe = safe.replace(/\n/g, "<br>");
    return safe;
  }

  function clearEmptyState() {
    const empty = messagesEl.querySelector(".lux-empty");
    if (empty) empty.remove();
  }

  function renderEmptyState() {
    messagesEl.innerHTML = `
      <div class="lux-empty">
        <div class="lux-empty__icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/></svg>
        </div>
        <p class="lux-empty__title">Olá! Sou a Lux.</p>
        <p class="lux-empty__sub">Posso te ajudar a navegar e entender o painel.</p>
        <div class="lux-suggestions">
          <button type="button" class="lux-suggestion" data-suggest="Quantos atestados estão pendentes?">Quantos atestados estão pendentes?</button>
          <button type="button" class="lux-suggestion" data-suggest="Como aprovar um atestado?">Como aprovar um atestado?</button>
          <button type="button" class="lux-suggestion" data-suggest="Resumo do dia">Resumo do dia</button>
        </div>
      </div>`;
    messagesEl.querySelectorAll("[data-suggest]").forEach((btn) => {
      btn.addEventListener("click", () => sendMessage(btn.getAttribute("data-suggest")));
    });
  }

  function appendMessage(role, text, opts = {}) {
    clearEmptyState();
    const wrap = document.createElement("div");
    wrap.className = "msg msg--" + role;
    const bubble = document.createElement("div");
    bubble.className = "msg__bubble";
    bubble.innerHTML = role === "bot" ? tinyMarkdown(text) : escapeHtml(text);

    // Badge de tempo de raciocínio (só na resposta da Lux)
    if (role === "bot" && typeof opts.thinkingMs === "number") {
      const meta = document.createElement("div");
      meta.className = "msg__meta";
      meta.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' +
        '<span>Raciocinou em <strong>' + formatTime(opts.thinkingMs) + '</strong></span>';
      bubble.appendChild(meta);
    }
    wrap.appendChild(bubble);
    messagesEl.appendChild(wrap);
    scrollToBottom();
  }

  function formatTime(ms) {
    if (ms < 1000) return Math.round(ms) + " ms";
    return (ms / 1000).toFixed(2) + " s";
  }

  function showTyping() {
    const wrap = document.createElement("div");
    wrap.className = "msg msg--bot";
    wrap.id = "lux-typing";
    wrap.innerHTML = '<div class="typing"><span></span><span></span><span></span></div>';
    messagesEl.appendChild(wrap);
    scrollToBottom();
  }
  function hideTyping() { document.getElementById("lux-typing")?.remove(); }
  function scrollToBottom() {
    requestAnimationFrame(() => { messagesEl.scrollTop = messagesEl.scrollHeight; });
  }

  function updateContextUI() {
    const n = conversationContext.length;
    ctxCount.textContent = n;
    if (n === 0) {
      ctxIndicator.textContent = "contexto vazio";
      ctxIndicator.removeAttribute("data-state");
    } else {
      ctxIndicator.textContent = "lembrando " + n + (n === 1 ? " msg" : " msgs");
      ctxIndicator.setAttribute("data-state", "active");
    }
  }

  /* ============== MOCK AI BRAIN ============== */
  const RESPONSES = [
    { keys: ["pendente", "pendentes", "pendência", "pendencia"],
      reply: "No momento há **0 atestados pendentes** aguardando análise. 🎉\n\nSempre que um novo atestado chegar, ele aparecerá aqui e em **Gerenciar Atestados**." },
    { keys: ["total", "quantos atestado", "quantos no total"],
      reply: "O sistema possui hoje:\n- **23** atestados no total\n- **21** aprovados\n- **2** rejeitados\n- **0** pendentes" },
    { keys: ["aprovar", "como aprovar", "aprovação"],
      reply: "Para aprovar um atestado:\n1. Vá em **Gerenciar Atestados** no menu lateral.\n2. Clique no atestado pendente que deseja revisar.\n3. Confira data, CID e arquivo enviado.\n4. Clique em **Aprovar** (ou **Rejeitar** com justificativa)." },
    { keys: ["rejeitar", "negar", "recusar"],
      reply: "Ao **rejeitar** um atestado, sempre informe a justificativa. O colaborador receberá uma notificação e poderá reenviar a documentação corrigida." },
    { keys: ["resumo", "visão geral", "visao geral", "overview", "dia"],
      reply: "**Resumo do dia**\n- 23 atestados registrados no histórico\n- 0 aguardando análise\n- 21 aprovados (91%)\n- 2 rejeitados\n\nTudo sob controle por aqui. ✅" },
    { keys: ["relatório", "relatorio", "exportar", "csv", "pdf"],
      reply: "Você pode gerar relatórios em **Relatórios** no menu lateral. É possível filtrar por período, status (aprovado/rejeitado/pendente) e exportar em **CSV** ou **PDF**." },
    { keys: ["usuário", "usuario", "colaborador", "funcionário", "funcionario"],
      reply: "A aba **Usuários** lista todos os colaboradores cadastrados. Lá você pode editar dados, redefinir senha ou desativar acesso." },
    { keys: ["quem é você", "quem e voce", "o que você faz", "ajuda", "help"],
      reply: "Sou a **Lux**, assistente de IA do Seal Health. Posso te ajudar a:\n- Entender métricas do painel\n- Explicar fluxos (aprovação, rejeição, relatórios)\n- Sugerir boas práticas de gestão de atestados\n\nÉ só perguntar! 💜" },
    { keys: ["oi", "olá", "ola", "bom dia", "boa tarde", "boa noite", "hello"],
      reply: "Olá! 👋 Sou a **Lux**. Em que posso te ajudar com o painel hoje?" },
    { keys: ["obrigad", "valeu", "thanks"],
      reply: "Por nada! Estou por aqui sempre que precisar. ✨" },
  ];

  const FOLLOWUPS = [
    "Quer que eu detalhe esse último ponto?",
    "Posso aprofundar nesse assunto se quiser.",
    "Se precisar, te explico passo a passo.",
  ];

  const FALLBACKS = [
    "Hmm, ainda não tenho essa informação específica. Tenta perguntar sobre **atestados**, **aprovações** ou **relatórios**?",
    "Boa pergunta! Posso te ajudar com **gestão de atestados**, **usuários** e **relatórios**. Quer que eu detalhe algum desses?",
    "Não captei direito. Você pode reformular? Por exemplo: *“como aprovar um atestado?”* ou *“quantos estão pendentes?”*.",
  ];

  function findReply(text, ctx) {
    const t = text.toLowerCase();
    for (const item of RESPONSES) {
      if (item.keys.some((k) => t.includes(k))) {
        // Usa o contexto: se já houve interação recente, adiciona um follow-up
        if (ctx.length >= 2) {
          return item.reply + "\n\n" + FOLLOWUPS[Math.floor(Math.random() * FOLLOWUPS.length)];
        }
        return item.reply;
      }
    }
    // Fallback contextual: cita o último tópico se houver
    if (ctx.length) {
      const lastUser = [...ctx].reverse().find((m) => m.role === "user");
      if (lastUser) {
        return "Continuando a partir do que você disse antes (*“" +
          lastUser.content.slice(0, 60) + (lastUser.content.length > 60 ? "…" : "") +
          "”*): " + FALLBACKS[Math.floor(Math.random() * FALLBACKS.length)];
      }
    }
    return FALLBACKS[Math.floor(Math.random() * FALLBACKS.length)];
  }

  /* ============== SEND FLOW ============== */
  function sendMessage(text) {
    if (!text || isThinking) return;

    // 1) Mostra a pergunta do usuário
    appendMessage("user", text);

    // 2) Snapshot do contexto que será "lembrado" ao gerar a resposta
    const contextSnapshot = conversationContext.slice(-CONTEXT_LIMIT);

    // 3) Atualiza contexto com a nova pergunta
    conversationContext.push({ role: "user", content: text });
    if (conversationContext.length > CONTEXT_LIMIT) {
      conversationContext = conversationContext.slice(-CONTEXT_LIMIT);
    }
    updateContextUI();

    isThinking = true;
    sendBtn.disabled = true;
    showTyping();

    // 4) Mede o tempo de raciocínio (thinking_time_ms)
    const startedAt = performance.now();
    const delay = 600 + Math.random() * 1400;

    setTimeout(() => {
      hideTyping();
      const reply = findReply(text, contextSnapshot);
      const thinkingMs = Math.round(performance.now() - startedAt);

      appendMessage("bot", reply, { thinkingMs });

      // 5) Atualiza contexto com a resposta
      conversationContext.push({ role: "assistant", content: reply });
      if (conversationContext.length > CONTEXT_LIMIT) {
        conversationContext = conversationContext.slice(-CONTEXT_LIMIT);
      }

      // 6) Registra a interação (1:1 com a tabela `lux_interactions`)
      const record = {
        user_id: MOCK_USER_ID,
        prompt: text,
        response: reply,
        context: contextSnapshot,
        thinking_time_ms: thinkingMs,
        created_at: new Date().toISOString(),
      };
      interactions.push(record);
      // Para depuração: inspecionar no console o "registro pronto pro banco"
      console.debug("[lux_interactions] novo registro:", record);

      // 7) Atualiza meta UI
      lastTime.textContent = formatTime(thinkingMs);
      metaTime.hidden = false;
      updateContextUI();

      isThinking = false;
      autoResize();
    }, delay);
  }

  // Expor para depuração no console do browser
  window.__lux = {
    getInteractions: () => interactions,
    getContext: () => conversationContext,
    clear: () => clearBtn?.click(),
  };
})();
