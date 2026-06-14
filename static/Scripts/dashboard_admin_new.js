(function () {
  "use strict";

  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebar-overlay");
  const btnOpen =
    document.getElementById("sidebar-toggle") ||
    document.getElementById("menuToggle");
  const btnClose = document.getElementById("sidebar-close");

  const dynamicContent =
    document.getElementById("conteudo") ||
    document.getElementById("dynamic-content") ||
    document.querySelector(".content");
  const defaultContentHtml = dynamicContent ? dynamicContent.innerHTML : "";

  const fab = document.getElementById("lux-fab");
  const modal = document.getElementById("lux-modal");
  const messagesEl = document.getElementById("lux-messages");
  const form = document.getElementById("lux-form");
  const input = document.getElementById("lux-input");
  const sendBtn = document.getElementById("lux-send");
  const suggestionsWrap = document.getElementById("lux-suggestions");
  const clearBtn = document.getElementById("lux-clear");
  const ctxIndicator = document.getElementById("lux-ctx-indicator");
  const ctxCount = document.getElementById("lux-ctx-count");
  const metaTime = document.getElementById("lux-meta-time");
  const lastTime = document.getElementById("lux-last-time");

  const API_UPDATE_URL =
    window.API_UPDATE_URL ||
    document.body?.dataset?.apiUpdateUrl ||
    document.documentElement?.dataset?.apiUpdateUrl ||
    null;

  const MOCK_USER_ID = "00000000-0000-0000-0000-000000000001";
  const CONTEXT_LIMIT = 12;

  let conversationContext = [];
  let interactions = [];
  let isThinking = false;
  let lastFocus = null;
  let lastLoadedPage = null;

  function setSidebarState(isOpen) {
    if (sidebar) {
      sidebar.classList.toggle("is-open", isOpen);
      sidebar.classList.toggle("open", isOpen);
    }

    if (overlay) {
      overlay.classList.toggle("is-open", isOpen);
      overlay.classList.toggle("active", isOpen);
      overlay.setAttribute("aria-hidden", isOpen ? "false" : "true");
    }
  }

  function openSidebar() {
    setSidebarState(true);
  }

  function closeSidebar() {
    setSidebarState(false);
  }

  function toggleSidebar() {
    const isOpen =
      sidebar?.classList.contains("is-open") ||
      sidebar?.classList.contains("open");
    setSidebarState(!isOpen);
  }

  btnOpen?.addEventListener("click", toggleSidebar);
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

  function normalizeText(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function initDataTables() {
    if (!window.jQuery || !window.jQuery.fn?.DataTable) return;
    if (!window.jQuery("#tabelaAtestados").length) return;

    if (window.jQuery.fn.DataTable.isDataTable("#tabelaAtestados")) {
      window.jQuery("#tabelaAtestados").DataTable().destroy();
    }

    window.jQuery("#tabelaAtestados").DataTable({
      language: {
        url: "//cdn.datatables.net/plug-ins/1.13.6/i18n/pt-BR.json",
      },
      order: [[0, "desc"]],
    });
  }

  function restoreDashboardContent() {
    if (!dynamicContent) return;
    dynamicContent.innerHTML = defaultContentHtml;
  }

  async function loadPage(url, options = {}) {
    if (!dynamicContent || !url) return;

    const isAtestados = Boolean(options.isAtestados);
    lastLoadedPage = { url, isAtestados };
    dynamicContent.innerHTML =
      '<p style="text-align:center">Carregando...</p>';

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Falha ao carregar: " + response.status);
      }

      const html = await response.text();
      dynamicContent.innerHTML = html;

      if (isAtestados) {
        initDataTables();
      }
    } catch (error) {
      dynamicContent.innerHTML =
        "<p style='color:red'>Erro ao carregar conteudo.</p>";
      console.error("Erro ao carregar pagina:", error);
    }
  }

  function resolveActionFromElement(element) {
    if (!element) return null;

    const explicitAction = element.dataset.action;
    if (explicitAction) return explicitAction;

    switch (element.id) {
      case "loadDashboard":
        return "dashboard";

      case "loadBusca":
        return "buscar";

      case "loadCadastro":
        return "cadastrar";

      case "loadAtestados":
        return "atestados";

      case "loadConfig":
        return "config";

      default:
        break;
    }

    const label = normalizeText(element.textContent);

    if (label.includes("visao geral")) return "dashboard";
    if (label.includes("busca")) return "buscar";
    if (label.includes("usuario")) return "cadastrar";
    if (label.includes("atestado")) return "atestados";
    if (label.includes("config")) return "config";

    return null;
  }


  async function handleDashboardAction(action) {
  if (!action) return;

  if (action === "dashboard") {
    restoreDashboardContent();
    return;
  }

  if (action === "atestados") {
    await loadPage("/admin/gestao_atestados");
    return;
  }

  if (action === "buscar") {
    await loadPage("/admin/busca");
    return;
  }

  if (action === "cadastrar") {
    await loadPage("/admin/usuarios");
    return;
  }

  if (action === "config") {
    if (!dynamicContent) return;
    dynamicContent.innerHTML =
      "<h2>Configuracoes</h2><p>Opcoes administrativas em construcao.</p>";
  }
}

document.addEventListener("click", (event) => {
  const trigger = event.target.closest(
    ".menu-btn, .sidebar .nav-item, #loadDashboard, #loadBusca, #loadCadastro, #loadConfig, [data-action]"
  );

  if (!trigger) return;

  const action = resolveActionFromElement(trigger);
  if (!action) return;

  event.preventDefault();
  handleDashboardAction(action);
});

window.loadPage = loadPage;

function openModal() {
  if (!modal) return;
  lastFocus = document.activeElement;
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  setTimeout(() => input?.focus(), 200);

  console.log(lastFocus)
}

function closeModal() {
  if (!modal) return;
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  if (lastFocus && typeof lastFocus.focus === "function") {
    lastFocus.focus();
  }
}

fab?.addEventListener("click", openModal);
modal?.querySelectorAll("[data-close]").forEach((el) => {
  el.addEventListener("click", closeModal);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && modal?.classList.contains("is-open")) {
    closeModal();
  }
});

function autoResize() {
  if (!input || !sendBtn) return;
  input.style.height = "auto";
  input.style.height = Math.min(input.scrollHeight, 120) + "px";
  sendBtn.disabled = !input.value.trim() || isThinking;
}

input?.addEventListener("input", autoResize);
input?.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    form?.requestSubmit();
  }
});

if (sendBtn) {
  sendBtn.disabled = true;
}

suggestionsWrap?.querySelectorAll("[data-suggest]").forEach((btn) => {
  btn.addEventListener("click", () =>
    sendMessage(btn.getAttribute("data-suggest"))
  );
});

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!input) return;

  const text = input.value.trim();
  if (!text || isThinking) return;

  sendMessage(text);
  input.value = "";
  autoResize();
});

clearBtn?.addEventListener("click", () => {
  if (!conversationContext.length) return;
  if (!confirm("Limpar o contexto da conversa? A Lux vai esquecer o que foi dito.")) {
    return;
  }

  conversationContext = [];

  if (messagesEl) {
    messagesEl.innerHTML = "";
    renderEmptyState();
  }

  if (metaTime) {
    metaTime.hidden = true;
  }

  updateContextUI();
});

function escapeHtml(value) {
  return String(value)
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
      const items = block
        .trim()
        .split("\n")
        .map((line) => "<li>" + line.replace(/^- /, "") + "</li>")
        .join("");
      return (
        '<ul style="margin:6px 0;padding-left:18px">' + items + "</ul>"
      );
    });
  }

  safe = safe.replace(/\n/g, "<br>");
  return safe;
}

function clearEmptyState() {
  const empty = messagesEl?.querySelector(".lux-empty");
  if (empty) empty.remove();
}

function renderEmptyState() {
  if (!messagesEl) return;

  messagesEl.innerHTML = `
      <div class="lux-empty">
        <div class="lux-empty__icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/></svg>
        </div>
        <p class="lux-empty__title">Ola! Sou a Lux.</p>
        <p class="lux-empty__sub">Posso te ajudar a navegar e entender o painel.</p>
        <div class="lux-suggestions">
          <button type="button" class="lux-suggestion" data-suggest="Quantos atestados estao pendentes?">Quantos atestados estao pendentes?</button>
          <button type="button" class="lux-suggestion" data-suggest="Como aprovar um atestado?">Como aprovar um atestado?</button>
          <button type="button" class="lux-suggestion" data-suggest="Resumo do dia">Resumo do dia</button>
        </div>
      </div>`;

  messagesEl.querySelectorAll("[data-suggest]").forEach((btn) => {
    btn.addEventListener("click", () =>
      sendMessage(btn.getAttribute("data-suggest"))
    );
  });
}

function appendMessage(role, text, options = {}) {
  if (!messagesEl) return;

  clearEmptyState();

  const wrap = document.createElement("div");
  wrap.className = "msg msg--" + role;

  const bubble = document.createElement("div");
  bubble.className = "msg__bubble";
  bubble.innerHTML = role === "bot" ? tinyMarkdown(text) : escapeHtml(text);

  if (role === "bot" && typeof options.thinkingMs === "number") {
    const meta = document.createElement("div");
    meta.className = "msg__meta";
    meta.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' +
      "<span>Raciocinou em <strong>" +
      formatTime(options.thinkingMs) +
      "</strong></span>";
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
  if (!messagesEl) return;

  const wrap = document.createElement("div");
  wrap.className = "msg msg--bot";
  wrap.id = "lux-typing";
  wrap.innerHTML = '<div class="typing"><span></span><span></span><span></span></div>';
  messagesEl.appendChild(wrap);
  scrollToBottom();
}

function hideTyping() {
  document.getElementById("lux-typing")?.remove();
}

function scrollToBottom() {
  if (!messagesEl) return;
  requestAnimationFrame(() => {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  });
}

function updateContextUI() {
  const total = conversationContext.length;

  if (ctxCount) {
    ctxCount.textContent = total;
  }

  if (!ctxIndicator) return;

  if (total === 0) {
    ctxIndicator.textContent = "contexto vazio";
    ctxIndicator.removeAttribute("data-state");
    return;
  }

  ctxIndicator.textContent =
    "lembrando " + total + (total === 1 ? " msg" : " msgs");
  ctxIndicator.setAttribute("data-state", "active");
}

const RESPONSES = [
  {
    keys: ["pendente", "pendentes", "pendencia"],
    reply:
      "No momento ha **0 atestados pendentes** aguardando analise.\n\nSempre que um novo atestado chegar, ele aparecera aqui e em **Gerenciar Atestados**.",
  },
  {
    keys: ["total", "quantos atestado", "quantos no total"],
    reply:
      "O sistema possui hoje:\n- **23** atestados no total\n- **21** aprovados\n- **2** rejeitados\n- **0** pendentes",
  },
  {
    keys: ["aprovar", "como aprovar", "aprovacao"],
    reply:
      "Para aprovar um atestado:\n1. Va em **Gerenciar Atestados** no menu lateral.\n2. Clique no atestado pendente que deseja revisar.\n3. Confira data, CID e arquivo enviado.\n4. Clique em **Aprovar** (ou **Rejeitar** com justificativa).",
  },
  {
    keys: ["rejeitar", "negar", "recusar"],
    reply:
      "Ao **rejeitar** um atestado, sempre informe a justificativa. O colaborador recebera uma notificacao e podera reenviar a documentacao corrigida.",
  },
  {
    keys: ["resumo", "visao geral", "overview", "dia"],
    reply:
      "**Resumo do dia**\n- 23 atestados registrados no historico\n- 0 aguardando analise\n- 21 aprovados (91%)\n- 2 rejeitados\n\nTudo sob controle por aqui.",
  },
  {
    keys: ["relatorio", "exportar", "csv", "pdf"],
    reply:
      "Voce pode gerar relatorios em **Relatorios** no menu lateral. E possivel filtrar por periodo, status (aprovado/rejeitado/pendente) e exportar em **CSV** ou **PDF**.",
  },
  {
    keys: ["usuario", "colaborador", "funcionario"],
    reply:
      "A aba **Usuarios** lista todos os colaboradores cadastrados. La voce pode editar dados, redefinir senha ou desativar acesso.",
  },
  {
    keys: ["quem e voce", "o que voce faz", "ajuda", "help"],
    reply:
      "Sou a **Lux**, assistente de IA do Seal Health. Posso te ajudar a:\n- Entender metricas do painel\n- Explicar fluxos (aprovacao, rejeicao, relatorios)\n- Sugerir boas praticas de gestao de atestados\n\nE so perguntar!",
  },
  {
    keys: ["oi", "ola", "bom dia", "boa tarde", "boa noite", "hello"],
    reply: "Ola! Sou a **Lux**. Em que posso te ajudar com o painel hoje?",
  },
  {
    keys: ["obrigad", "valeu", "thanks"],
    reply: "Por nada! Estou por aqui sempre que precisar.",
  },
];

const FOLLOWUPS = [
  "Quer que eu detalhe esse ultimo ponto?",
  "Posso aprofundar nesse assunto se quiser.",
  "Se precisar, te explico passo a passo.",
];

const FALLBACKS = [
  "Hmm, ainda nao tenho essa informacao especifica. Tenta perguntar sobre **atestados**, **aprovacoes** ou **relatorios**?",
  "Boa pergunta! Posso te ajudar com **gestao de atestados**, **usuarios** e **relatorios**. Quer que eu detalhe algum desses?",
  "Nao captei direito. Voce pode reformular? Por exemplo: *como aprovar um atestado?* ou *quantos estao pendentes?*.",
];

function findReply(text, contextSnapshot) {
  const normalized = normalizeText(text);

  for (const item of RESPONSES) {
    if (item.keys.some((key) => normalized.includes(key))) {
      if (contextSnapshot.length >= 2) {
        return (
          item.reply +
          "\n\n" +
          FOLLOWUPS[Math.floor(Math.random() * FOLLOWUPS.length)]
        );
      }

      return item.reply;
    }
  }

  if (contextSnapshot.length) {
    const lastUser = [...contextSnapshot]
      .reverse()
      .find((message) => message.role === "user");

    if (lastUser) {
      return (
        "Continuando a partir do que voce disse antes (*" +
        lastUser.content.slice(0, 60) +
        (lastUser.content.length > 60 ? "..." : "") +
        "*): " +
        FALLBACKS[Math.floor(Math.random() * FALLBACKS.length)]
      );
    }
  }

  return FALLBACKS[Math.floor(Math.random() * FALLBACKS.length)];
}

function sendMessage(text) {
  if (!text || isThinking) return;

  appendMessage("user", text);

  const contextSnapshot = conversationContext.slice(-CONTEXT_LIMIT);

  conversationContext.push({ role: "user", content: text });
  if (conversationContext.length > CONTEXT_LIMIT) {
    conversationContext = conversationContext.slice(-CONTEXT_LIMIT);
  }
  updateContextUI();

  isThinking = true;
  if (sendBtn) {
    sendBtn.disabled = true;
  }
  showTyping();

  const startedAt = performance.now();
  const delay = 600 + Math.random() * 1400;

  setTimeout(() => {
    hideTyping();

    const reply = findReply(text, contextSnapshot);
    const thinkingMs = Math.round(performance.now() - startedAt);

    appendMessage("bot", reply, { thinkingMs });

    conversationContext.push({ role: "assistant", content: reply });
    if (conversationContext.length > CONTEXT_LIMIT) {
      conversationContext = conversationContext.slice(-CONTEXT_LIMIT);
    }

    const record = {
      user_id: MOCK_USER_ID,
      prompt: text,
      response: reply,
      context: contextSnapshot,
      thinking_time_ms: thinkingMs,
      created_at: new Date().toISOString(),
    };

    interactions.push(record);
    console.debug("[lux_interactions] novo registro:", record);

    if (lastTime) {
      lastTime.textContent = formatTime(thinkingMs);
    }
    if (metaTime) {
      metaTime.hidden = false;
    }

    updateContextUI();
    isThinking = false;
    autoResize();
  }, delay);
}

function refreshAtestadosView() {
  const trigger = document.getElementById("loadAtestados");
  if (trigger) {
    trigger.click();
    return;
  }

  if (lastLoadedPage?.isAtestados) {
    loadPage(lastLoadedPage.url, { isAtestados: true });
  }
}

function enviarDecisao(id, status, motivo) {
  if (!API_UPDATE_URL) {
    console.warn("API_UPDATE_URL nao foi definido no HTML.");
    return Promise.resolve(null);
  }

  return fetch(API_UPDATE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, status, motivo }),
  }).then((response) => response.json());
}

window.abrirModalAnalisar = function (
  urlArquivo,
  descricao,
  nomeUsuario,
  atestadoId,
  statusAtual
) {
  const previewModal = document.getElementById("previewModal");
  const previewBody = document.getElementById("previewBody");
  const previewFooter = document.getElementById("previewFooter");
  const previewDesc = document.getElementById("previewDesc");
  const previewUser = document.getElementById("previewUser");

  if (
    !previewModal ||
    !previewBody ||
    !previewFooter ||
    !previewDesc ||
    !previewUser
  ) {
    return;
  }

  previewDesc.innerText = descricao;
  previewUser.innerText = "Enviado por: " + nomeUsuario;
  previewBody.innerHTML = "";

  const extensao = String(urlArquivo).split(".").pop().toLowerCase();

  if (["jpg", "jpeg", "png", "gif"].includes(extensao)) {
    previewBody.innerHTML = `<img src="${urlArquivo}">`;
  } else if (extensao === "pdf") {
    previewBody.innerHTML = `<iframe src="${urlArquivo}"></iframe>`;
  } else {
    previewBody.innerHTML =
      `<div style="padding:20px;">Preview indisponivel. <a href="${urlArquivo}" target="_blank">Baixar</a></div>`;
  }

  if (parseInt(statusAtual, 10) === 0) {
    previewFooter.innerHTML = `
        <button class="btn-modal btn-modal-reject" onclick="solicitarMotivoRejeicao(${atestadoId})">Rejeitar</button>
        <button class="btn-modal btn-modal-approve" onclick="confirmarAprovacao(${atestadoId})">Aprovar</button>
      `;
  } else {
    previewFooter.innerHTML = `<span style="color:#666;">Ja avaliado.</span>`;
  }

  previewModal.classList.add("show");
};

window.fecharPreview = function () {
  document.getElementById("previewModal")?.classList.remove("show");
};

window.solicitarMotivoRejeicao = function (id) {
  window.fecharPreview();

  if (!window.Swal) {
    console.warn("SweetAlert nao esta disponivel.");
    return;
  }

  window.Swal.fire({
    title: "Motivo da Rejeicao",
    input: "textarea",
    inputPlaceholder: "Por que este atestado foi recusado?",
    showCancelButton: true,
    confirmButtonText: "Confirmar Rejeicao",
    confirmButtonColor: "#dc3545",
    preConfirm: (motivo) => {
      if (!motivo) {
        window.Swal.showValidationMessage("O motivo e obrigatorio!");
      }
      return motivo;
    },
  }).then((result) => {
    if (!result.isConfirmed) return;

    enviarDecisao(id, 2, result.value).then((data) => {
      if (!data) return;

      if (data.success) {
        window.Swal.fire("Sucesso!", data.message, "success").then(() => {
          refreshAtestadosView();
        });
        return;
      }

      window.Swal.fire("Erro", data.message, "error");
    });
  });
};

window.confirmarAprovacao = function (id) {
  window.fecharPreview();

  if (!window.Swal) {
    console.warn("SweetAlert nao esta disponivel.");
    return;
  }

  window.Swal.fire({
    title: "Confirmar Aprovacao?",
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "Sim, aprovar",
    confirmButtonColor: "#28a745",
  }).then((result) => {
    if (!result.isConfirmed) return;

    enviarDecisao(id, 1, "").then((data) => {
      if (!data) return;

      if (data.success) {
        window.Swal.fire("Sucesso!", data.message, "success").then(() => {
          refreshAtestadosView();
        });
        return;
      }

      window.Swal.fire("Erro", data.message, "error");
    });
  });
};

window.__lux = {
  getInteractions: () => interactions,
  getContext: () => conversationContext,
  clear: () => clearBtn?.click(),
};

updateContextUI();
autoResize();
}) ();
