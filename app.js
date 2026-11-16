// Giro · portal web. Todas as permissões são verificadas no banco (RLS + funções); a tela só reflete o resultado.
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm";

// Endereço e chave pública do projeto (não são segredos)
const BASE = "https://qcvjxcxqnqolsmgrbias.supabase.co";
const KEY = "sb_publishable_dUZj4gs7kospzW1nrtmAIQ_Y-Y3tflh";
const sb = createClient(BASE, KEY, { auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });

const $ = (s, r = document) => r.querySelector(s);
const root = $("#root");
const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const dt = (iso, o = { dateStyle: "short", timeStyle: "short" }) => { try { return new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Bahia", ...o }); } catch { return iso || ""; } };
const dia = (iso) => dt(iso, { dateStyle: "short" });
const brl = (n) => (typeof n === "number" && n > 0) ? n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "";
const kv = (pairs) => '<dl class="kv">' + pairs.filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== "")
  .map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("") + "</dl>";

// ---------- ícones (traço simples) ----------
const ICON = {
  home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>', box: '<path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>',
  refresh: '<path d="M21 12a9 9 0 0 1-15.5 6.2L3 16"/><path d="M3 12a9 9 0 0 1 15.5-6.2L21 8"/><path d="M21 3v5h-5"/><path d="M3 21v-5h5"/>',
  alert: '<path d="M12 3l10 18H2L12 3z"/><path d="M12 10v5"/><path d="M12 18h.01"/>', check: '<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>',
  card: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>', users: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-4 3-6 7-6s7 2 7 6"/><path d="M17 4.5a3.5 3.5 0 0 1 0 7"/><path d="M19 14c2 .7 3 2.4 3 5"/>',
  file: '<path d="M6 2h9l5 5v15H6z"/><path d="M14 2v6h6"/>', chart: '<path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-8"/><path d="M22 20H2"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.5 3.5-7 8-7s8 2.5 8 7"/>', bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10 21a2 2 0 0 0 4 0"/>',
  car: '<path d="M5 17h14M4 17v-5l2-5h12l2 5v5"/><circle cx="8" cy="17" r="1.6"/><circle cx="16" cy="17" r="1.6"/>', folder: '<path d="M3 6h7l2 2h9v11H3z"/>',
};
const ico = (n, s = 20) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICON[n] || ""}</svg>`;

// ---------- tema ----------
const getTema = () => { try { return localStorage.getItem("giro_tema") || "escuro"; } catch { return "escuro"; } };
const setTema = (t) => { document.documentElement.dataset.tema = t; try { localStorage.setItem("giro_tema", t); } catch {} };
setTema(getTema());
const alternarTema = () => { setTema(getTema() === "escuro" ? "claro" : "escuro"); rotear(); };

// ---------- estado ----------
let user = null, papeis = [], escritorio = null;
const STATUS = [["recebido", "Recebido", "Documentos recebidos"], ["conferido", "Conferido", "Documentos conferidos"], ["vistoria", "Vistoria", "Vistoria"],
  ["protocolado", "Protocolo", "Protocolado"], ["concluido", "Concluído", "Transferência concluída"]];
const stRot = (s) => (STATUS.find((x) => x[0] === s) || [0, 0, "Enviado"])[2];
const stCor = (s) => ({ concluido: "b-ok", protocolado: "b-ok", vistoria: "b-warn", conferido: "b-ok", recebido: "b-gray" }[s] || "b-gray");

async function carregarPerfil() {
  const { data: { session } } = await sb.auth.getSession();
  user = session?.user || null; papeis = []; escritorio = null;
  if (!user) return null;
  const { data } = await sb.from("papeis").select("papel");
  papeis = (data || []).map((r) => r.papel);
  if (papeis.includes("despachante")) { const { data: e } = await sb.from("escritorios").select("*").maybeSingle(); escritorio = e; }
  return user;
}
const nomeUsuario = () => escritorio?.nome || (user?.email || "").split("@")[0] || "Usuário";

function msg(el, texto, tipo = "err") { el.innerHTML = texto ? `<div class="msg ${tipo === "ok" ? "okm" : "err"}">${esc(texto)}</div>` : ""; }
function modal(html) {
  const d = document.createElement("dialog");
  d.style.cssText = "border:1px solid var(--stroke);border-radius:14px;background:var(--card);color:var(--txt);max-width:520px;width:92vw;padding:18px";
  d.innerHTML = html + '<div style="margin-top:14px;text-align:right"><button class="sec sm" id="mx">Fechar</button></div>';
  document.body.appendChild(d); d.showModal(); $("#mx", d).onclick = () => { d.close(); d.remove(); };
}

// ====================== páginas públicas (QR e link antigo) ======================
async function api(qs) {
  const r = await fetch(`${BASE}/functions/v1/web-publica?${qs}`, { headers: { apikey: KEY, Authorization: "Bearer " + KEY } });
  let j = null; try { j = await r.json(); } catch {} return j || { estado: "indisponivel" };
}
const pubShell = (sub, corpo, rodape = "") => { root.innerHTML = `<div class="cab-pub"><img src="logo.png" alt="GIRO"><span>${esc(sub)}</span></div><div class="pub-main">${corpo}<p class="muted small" style="margin-top:14px">${esc(rodape)}</p></div>`; };
const ESTADOS = {
  autentico: ["b-ok", "Autêntico", "Documento emitido pelo Giro, com registro correspondente localizado."],
  substituido: ["b-warn", "Substituído", "Existe uma versão posterior deste documento. Peça a mais recente ao emissor."],
  cancelado: ["b-bad", "Cancelado", "Esta emissão foi invalidada pelo emissor."],
  nao_localizado: ["b-gray", "Não localizado", "Nenhum documento com este ID foi encontrado. Confira o código ou desconfie do documento."],
  indisponivel: ["b-gray", "Indisponível", "O sistema de validação está temporariamente inacessível. Tente de novo em instantes."],
};
async function pubLaudo(id) {
  pubShell("Verificação de laudo", '<div class="cartao muted">Verificando…</div>');
  const j = await api("laudo=" + encodeURIComponent(id));
  const [cls, titulo, texto] = ESTADOS[j.estado] || ESTADOS.indisponivel;
  let h = `<div class="cartao" style="margin-bottom:14px"><span class="badge-st ${cls}">${titulo}</span><h1 style="margin-top:12px">Laudo cautelar veicular</h1><p class="muted">${texto}</p></div>`;
  if (j.id) h += `<div class="cartao"><h2>Dados da emissão</h2>${kv([["ID do documento", j.id], ["Placa", j.placa], ["Veículo", j.veiculo], ["Emitido em", dt(j.emitidoEm)], ["Responsável pela emissão", j.emissor], ["Versão", j.versao], ["Substituído por", j.substituidoPor], ["Verificado em", dt(j.verificadoEm)]])}</div>`;
  pubShell("Verificação de laudo", h, "A validação comprova que o documento foi emitido pelo Giro e confere com o registro de emissão. Ela não atesta a ausência de defeitos ou restrições do veículo. Por privacidade, a placa é exibida parcialmente.");
}
const MSG_ENVIO = { expirado: "Este link expirou. Peça um novo link ao vendedor.", revogado: "Este link foi cancelado pelo vendedor.", nao_localizado: "Link não encontrado. Confira o endereço recebido.", indisponivel: "Sistema temporariamente indisponível. Tente novamente." };
const vPairs = (f) => { const v = f.veiculo || {}; return [["Placa", v.placa], ["Marca / modelo", [v.marca, v.modelo].filter(Boolean).join(" ")], ["Versão", v.versao], ["Ano", v.ano], ["Cor", v.cor], ["Combustível", v.combustivel], ["Câmbio", v.cambio], ["Quilometragem", v.km ? Number(v.km).toLocaleString("pt-BR") + " km" : ""], ["Chassi", v.chassi], ["Renavam", v.renavam], ["Motor", v.motor], ["Município / UF", v.municipio]]; };
const oPairs = (f) => { const o = f.proprietario || {}; return [["Nome", o.nome], ["CPF", o.cpf], ["Telefone", o.telefone], ["Cidade / UF", o.cidade]]; };
const cPairs = (f) => { const c = f.comprador || {}; return [["Nome", c.nome], ["CPF", c.cpf], ["Telefone", c.telefone]]; };
const nPairs = (f) => { const n = f.negocio || {}; return [["Valor", brl(n.valor)], ["Data", n.data ? dt(n.data) : ""], ["Forma de pagamento", n.pagamento], ["Despachante", n.despachante]]; };
const fichaCards = (f) => `<div class="grid2"><div class="cartao"><h2>Veículo</h2>${kv(vPairs(f))}</div><div><div class="cartao" style="margin-bottom:14px"><h2>Proprietário atual (vendedor)</h2>${kv(oPairs(f)) || '<p class="muted">Não informado.</p>'}</div><div class="cartao"><h2>Comprador</h2>${kv(cPairs(f)) || '<p class="muted">Ainda não informado.</p>'}</div></div></div><div class="cartao" style="margin-bottom:14px"><h2>Negócio</h2>${kv(nPairs(f)) || '<p class="muted">Ainda não informado.</p>'}</div>`;
const fichaTexto = (f) => { const L = []; const add = (t, p) => { L.push(t.toUpperCase()); p.forEach(([k, v]) => v && L.push(`${k}: ${v}`)); L.push(""); }; add("Veículo", vPairs(f)); add("Proprietário atual (vendedor)", oPairs(f)); add("Comprador", cPairs(f)); add("Negócio", nPairs(f)); return L.join("\n"); };
async function pubFicha(token) {
  pubShell("Ficha de transferência", '<div class="cartao muted">Carregando…</div>');
  const j = await api("envio=" + encodeURIComponent(token));
  if (j.estado !== "ok") { pubShell("Ficha de transferência", `<div class="cartao"><h1>Ficha indisponível</h1><p class="muted">${esc(MSG_ENVIO[j.estado] || MSG_ENVIO.indisponivel)}</p></div>`); return; }
  const f = j.ficha || {}, v = f.veiculo || {};
  const fotos = (j.fotos || []).map((u, i) => `<a href="${esc(u)}" target="_blank" rel="noopener"><img src="${esc(u)}" alt="Foto ${i + 1}" loading="lazy"></a>`).join("");
  pubShell("Ficha de transferência", `<div class="cartao" style="margin-bottom:14px"><h1>${esc([v.marca, v.modelo].filter(Boolean).join(" ") || "Veículo")} · ${esc(v.placa || "")}</h1>
    <p class="muted">Enviada por ${esc((f.emissor || {}).nome || "vendedor")}${(f.emissor || {}).telefone ? " · " + esc(f.emissor.telefone) : ""}. Link válido até ${dt(j.expiraEm)}.</p>
    <div class="acoes noprint" style="display:flex;gap:8px;margin-top:10px"><button id="pr">Imprimir / salvar em PDF</button><button class="sec" id="cp">Copiar dados</button><a class="btn sec" id="rcv" href="#/despachante/fila">Sou despachante: receber no meu painel</a></div></div>
    ${fichaCards(f)}${fotos ? `<div class="cartao"><h2>Fotos</h2><div class="fotos">${fotos}</div></div>` : ""}`,
    "Documento de uso restrito ao despachante contratado, para a finalidade de transferência do veículo. Contém dados pessoais (LGPD): não compartilhe nem guarde além do necessário. O link expira e pode ser cancelado pelo vendedor.");
  $("#pr").onclick = () => window.print();
  $("#rcv").onclick = () => { try { sessionStorage.setItem("giro_pacote", token); } catch {} history.replaceState(null, "", location.pathname); };
  $("#cp").onclick = async (e) => { try { await navigator.clipboard.writeText(fichaTexto(f)); e.target.textContent = "Copiado!"; } catch { e.target.textContent = "Não foi possível copiar"; } };
}

// ====================== entrada e login ======================
function landing() {
  root.innerHTML = `<div class="centro"><img class="logo" src="logo.png" alt="GIRO">
    <div class="hero"><h1>Sua operação automotiva, em um só lugar.</h1><p>Consulte veículos, gerencie negócios e acompanhe transferências com uma plataforma feita para quem vive do mercado automotivo.</p></div>
    <div class="escolhas">
      <div class="escolha"><div class="ico">${ico("car", 32)}</div><h2>Sou vendedor</h2><p>Controle seu estoque, consulte placas, anuncie veículos, registre vendas e acompanhe seus resultados.</p><a class="btn" href="#/entrar/vendedor">Acessar como vendedor</a></div>
      <div class="escolha"><div class="ico">${ico("folder", 32)}</div><h2>Sou despachante</h2><p>Receba documentos, acompanhe transferências, gerencie pendências e organize seus clientes.</p><a class="btn" href="#/entrar/despachante">Acessar como despachante</a></div>
    </div>
    <div class="rodape-pub">Validar um laudo? Escaneie o QR Code do PDF com a câmera do celular.<br><button class="linkbtn" id="tm">Alternar tema claro/escuro</button></div></div>`;
  $("#tm").onclick = alternarTema;
}

function telaLogin(papel, modo = "entrar") {
  const nomePapel = papel === "despachante" ? "despachante" : "vendedor";
  const cad = modo === "cadastrar";
  root.innerHTML = `<div class="centro"><img class="logo" src="logo.png" alt="GIRO">
    <div class="caixa"><h1>${cad ? (papel === "despachante" ? "Cadastrar escritório" : "Criar conta") : "Acesso do " + nomePapel}</h1>
    <p class="muted small">${cad ? "Informe seus dados para criar o acesso." : "Entre com seu e-mail e senha."}</p>
    <form id="f">
      ${cad ? `<label>${papel === "despachante" ? "Nome do escritório" : "Seu nome"}</label><input name="nome" required maxlength="80" autocomplete="organization">` : ""}
      <label>E-mail</label><input name="email" type="email" required autocomplete="email">
      <label>Senha</label><input name="senha" type="password" required minlength="8" autocomplete="${cad ? "new-password" : "current-password"}" placeholder="${cad ? "Mínimo de 8 caracteres" : ""}">
      <div style="margin-top:16px;display:grid;gap:8px"><button type="submit" id="ok">${cad ? "Cadastrar" : "Entrar"}</button></div>
      <div id="aviso"></div>
    </form>
    <div class="linha-links">${cad ? '<button class="linkbtn" id="alt">Já tenho conta</button>' : `<button class="linkbtn" id="esq">Esqueci minha senha</button><button class="linkbtn" id="alt">${papel === "despachante" ? "Cadastrar escritório" : "Criar conta"}</button>`}
      <a href="#/">Voltar</a></div></div></div>`;
  const aviso = $("#aviso");
  $("#alt").onclick = () => telaLogin(papel, cad ? "entrar" : "cadastrar");
  if ($("#esq")) $("#esq").onclick = async () => {
    const email = $("#f").email.value.trim(); if (!email) return msg(aviso, "Digite seu e-mail acima e toque de novo.");
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
    msg(aviso, error ? "Não foi possível enviar agora. Tente de novo em instantes." : "Se o e-mail existir, enviamos um link para redefinir a senha.", error ? "err" : "ok");
  };
  $("#f").onsubmit = async (ev) => {
    ev.preventDefault(); const f = ev.target; const btn = $("#ok"); btn.disabled = true; msg(aviso, "");
    const email = f.email.value.trim(), senha = f.senha.value;
    try {
      if (cad) {
        const { data, error } = await sb.auth.signUp({ email, password: senha, options: { data: { papel, escritorio: f.nome.value.trim() }, emailRedirectTo: location.origin + location.pathname } });
        if (error) throw error;
        if (!data.session) { msg(aviso, "Enviamos um e-mail de confirmação. Abra o link para ativar a conta e depois entre.", "ok"); btn.disabled = false; return; }
      } else {
        const { error } = await sb.auth.signInWithPassword({ email, password: senha });
        if (error) throw error;
      }
      await entrarNoPortal(papel);
    } catch (e) {
      const m = String(e?.message || "");
      msg(aviso, /Invalid login/i.test(m) ? "E-mail ou senha incorretos." : /already registered/i.test(m) ? "Este e-mail já tem cadastro. Use Entrar." : /confirm/i.test(m) ? "Confirme o e-mail antes de entrar." : /rate|limit/i.test(m) ? "Muitas tentativas. Aguarde alguns minutos." : "Não foi possível concluir. Confira os dados e tente de novo.");
      btn.disabled = false;
    }
  };
}

async function acessoDireto(papel) {
  root.innerHTML = '<div class="centro"><p class="muted">Entrando…</p></div>';
  await carregarPerfil();
  if (!user) {
    const { error } = await sb.auth.signInAnonymously();
    if (error) return telaLogin(papel);
    await carregarPerfil();
  }
  if (!user) return telaLogin(papel);
  if (!papeis.includes(papel)) {
    const { error } = await sb.from("papeis").insert({ papel });
    if (error) return telaLogin(papel);
    if (papel === "despachante") await sb.from("escritorios").upsert({ nome: "Despachante Bahia" });
  }
  if (papel === "despachante" && (!escritorio || escritorio.nome === "Meu escritório")) {
    await sb.from("escritorios").upsert({ nome: "Despachante Bahia" }); await carregarPerfil();
  }
  await entrarNoPortal(papel);
}

async function entrarNoPortal(papelPedido) {
  await carregarPerfil();
  if (!user) return (location.hash = "#/");
  if (papeis.includes(papelPedido)) return (location.hash = papelPedido === "despachante" ? "#/despachante/painel" : "#/vendedor");
  // conta sem este perfil: oferece ativar (o servidor só reconhece o perfil que a conta realmente tem)
  root.innerHTML = `<div class="centro"><img class="logo" src="logo.png" alt="GIRO"><div class="caixa"><h1>Perfil não ativo</h1>
    <p class="muted">Esta conta ainda não tem o perfil de ${papelPedido}. Deseja ativá-lo agora?</p>
    ${papelPedido === "despachante" ? '<label>Nome do escritório</label><input id="nm" maxlength="80">' : ""}
    <div style="margin-top:14px;display:grid;gap:8px"><button id="at">Ativar perfil de ${papelPedido}</button><button class="sec" id="sa">Sair</button></div><div id="aviso"></div></div></div>`;
  $("#sa").onclick = sair;
  $("#at").onclick = async () => {
    const { error } = await sb.from("papeis").insert({ papel: papelPedido });
    if (error) return msg($("#aviso"), "Não foi possível ativar o perfil agora.");
    if (papelPedido === "despachante") await sb.from("escritorios").upsert({ nome: ($("#nm").value || "").trim() || "Meu escritório" });
    await entrarNoPortal(papelPedido);
  };
}
async function sair() { await sb.auth.signOut(); user = null; papeis = []; escritorio = null; location.hash = "#/"; rotear(); }

// ====================== estrutura do portal ======================
function portal({ perfil, nav, ativo, titulo, sub, corpo }) {
  const nome = nomeUsuario(), ini = (nome[0] || "U").toUpperCase();
  const link = ([id, rot, ic, soon, badge]) => `<a href="#/${perfil}/${id}" class="${ativo === id ? "ativo" : ""} ${soon ? "soon" : ""}">${ico(ic)}<span>${rot}</span>${badge ? `<span class="badge">${badge}</span>` : ""}</a>`;
  const outro = papeis.length > 1 ? `<a href="#/${perfil === "despachante" ? "vendedor" : "despachante/painel"}">${ico("refresh")}<span>Alternar para ${perfil === "despachante" ? "vendedor" : "despachante"}</span></a>` : "";
  root.innerHTML = `<div class="shell"><aside class="side"><img class="logo" src="logo.png" alt="GIRO"><div class="perfil">${ico("user", 18)} ${perfil === "despachante" ? "Despachante" : "Vendedor"}</div>
    <nav class="nav">${nav.map(link).join("")}${outro}</nav></aside>
    <div class="main"><div class="topo"><div class="tit"><h1>${esc(titulo)}</h1><p>${esc(sub || "")}</p></div>
      <div class="tools"><button class="icobtn" id="tm" title="Alternar tema">${getTema() === "escuro" ? "☀" : "☾"}</button><span class="usuario"><span class="avatar">${esc(ini)}</span><span class="nome">Olá, ${esc(nome)}</span></span><button class="sec sm" id="sair">Sair</button></div></div>
      <div class="conteudo">${corpo}</div></div></div>
    <nav class="tabbar">${nav.filter((n) => ["painel", "fila", "andamento", "pendencias", "perfil", "inicio"].includes(n[0])).map(([id, rot, ic]) => `<a href="#/${perfil}/${id}" class="${ativo === id ? "ativo" : ""}"><span class="i">${ico(ic, 20)}</span>${rot.split(" ")[0]}</a>`).join("")}</nav>`;
  $("#tm").onclick = alternarTema; $("#sair").onclick = sair;
}

// ====================== portal do vendedor (próxima etapa) ======================
function vendedor() {
  portal({ perfil: "vendedor", ativo: "inicio", titulo: "Portal do vendedor", sub: "Em construção",
    nav: [["inicio", "Início", "home"]],
    corpo: `<div class="cartao"><h2>Em breve</h2><p class="muted">O portal do vendedor (consulta de placas, estoque, anúncios, financeiro e vendas) está na próxima etapa.<br>Por enquanto, use o aplicativo Giro no iPhone. Os pacotes enviados ao despachante já podem ser recebidos pelo portal do despachante.</p></div>` });
}

// ====================== portal do despachante ======================
const NAV_D = [["painel", "Painel", "home"], ["fila", "Fila de pacotes", "box"], ["andamento", "Em andamento", "refresh"], ["pendencias", "Pendências", "alert"],
  ["concluidas", "Transferências concluídas", "check"], ["cobrancas", "Cobranças", "card", true], ["clientes", "Clientes", "users", true],
  ["documentos", "Documentos", "file", true], ["relatorios", "Relatórios", "chart", true], ["perfil", "Perfil e configurações", "user"]];
let pacotes = [], fotoUrl = {};

async function carregarPacotes() {
  try { await sb.rpc("receber_do_escritorio"); } catch {}
  const { data, error } = await sb.from("envios_despachante")
    .select("token, ficha, fotos, criado_em, expira_em, status, recebido_em, prazo, concluido_em, historico, pendencias")
    .eq("despachante_id", user.id).order("recebido_em", { ascending: false });
  pacotes = error ? [] : data || [];
  const paths = pacotes.map((p) => (p.fotos || [])[0]).filter((x) => x && !fotoUrl[x]);
  if (paths.length) { const { data: u } = await sb.storage.from("perfil").createSignedUrls(paths, 3600); (u || []).forEach((x) => { if (x.signedUrl) fotoUrl[x.path] = x.signedUrl; }); }
  return !error;
}
const abertas = (p) => (p.pendencias || []).filter((x) => x.aberta);
const titPacote = (p) => [p.ficha?.veiculo?.marca, p.ficha?.veiculo?.modelo].filter(Boolean).join(" ") || "Veículo";
const mesmoDia = (iso) => iso && new Date(iso).toDateString() === new Date().toDateString();

function etapas(status) {
  const i = STATUS.findIndex((s) => s[0] === status);
  return `<div class="etapas">${STATUS.map((s, k) => `<div class="etapa ${k < i || status === "concluido" ? "feito" : k === i ? "atual" : ""}"><span class="c">${k < i || status === "concluido" ? "✓" : ""}</span>${s[1]}</div>`).join("")}</div>`;
}
function cartaoPacote(p) {
  const v = p.ficha?.veiculo || {}, c = p.ficha?.comprador || {}, f = (p.fotos || [])[0];
  const pend = abertas(p).length;
  return `<div class="pacote"><div class="corpo"><div class="foto">${f && fotoUrl[f] ? `<img src="${esc(fotoUrl[f])}" alt="">` : "Sem foto"}</div>
    <div class="info"><b>${esc(titPacote(p))}</b><div>${esc(v.placa || "")}</div><div class="muted">Vendedor: ${esc(p.ficha?.emissor?.nome || "—")}</div><div class="muted">Comprador: ${esc(c.nome || "—")}</div>
    <div style="margin-top:6px"><span class="badge-st ${stCor(p.status)}" style="font-size:12px;padding:3px 10px">${stRot(p.status)}</span></div>
    <div class="muted" style="margin-top:4px">Prazo: ${p.prazo ? dia(p.prazo) : "não definido"}</div></div></div>
    <div class="acoes"><a class="btn sec sm" href="#/despachante/pacote/${p.token}">Abrir pacote</a><a class="btn sec sm" href="#/despachante/pacote/${p.token}">Pendências${pend ? " (" + pend + ")" : ""}</a></div></div>`;
}

async function despachante(sub, arg) {
  if (!papeis.includes("despachante")) return entrarNoPortal("despachante");
  await carregarPacotes();
  const emAnd = pacotes.filter((p) => p.status !== "concluido"), conc = pacotes.filter((p) => p.status === "concluido");
  const pendAll = pacotes.flatMap((p) => abertas(p).map((x) => ({ ...x, p })));
  const nav = NAV_D.map((n) => { const m = [...n]; if (n[0] === "fila") m[4] = pacotes.length || ""; if (n[0] === "pendencias") m[4] = pendAll.length || ""; return m; });
  const P = (o) => portal({ perfil: "despachante", nav, ...o });
  if (sub === "painel") {
    const hoje = pacotes.filter((p) => mesmoDia(p.recebido_em)), hojeOk = hoje.filter((p) => p.status === "concluido").length;
    const mes = conc.filter((p) => p.concluido_em && new Date(p.concluido_em).getMonth() === new Date().getMonth() && new Date(p.concluido_em).getFullYear() === new Date().getFullYear());
    const urg = pendAll.filter((x) => x.urgente).length, aguard = pacotes.filter((p) => p.status === "recebido").length;
    pendAll.sort((a, b) => new Date(b.em) - new Date(a.em));
    P({ ativo: "painel", titulo: "Painel do despachante", sub: "Acompanhe transferências, pacotes e pendências.", corpo: `
      <div class="banner"><span class="ico">${ico("box", 34)}</span><div class="t"><b>Fila de pacotes</b><span class="muted">Pacotes recebidos e documentação pendente.</span></div><a class="btn" href="#/despachante/fila">Ver fila completa</a></div>
      <div class="kpis">
        <div class="kpi"><div class="l">Pacotes hoje</div><div class="v">${hoje.length}</div><div class="s ok">${hojeOk} completos</div></div>
        <div class="kpi"><div class="l">Em andamento</div><div class="v">${emAnd.length}</div><div class="s">${aguard} aguardando conferência</div></div>
        <div class="kpi"><div class="l">Pendências</div><div class="v">${pendAll.length}</div><div class="s ${urg ? "bad" : ""}">${urg} urgentes</div></div>
        <div class="kpi"><div class="l">Concluídas no mês</div><div class="v">${mes.length}</div><div class="s">${conc.length} no total</div></div></div>
      <div class="cards3">
        <div class="cartao"><div class="cab"><h2>Pendências recentes</h2><a href="#/despachante/pendencias">Ver todas →</a></div>${pendAll.slice(0, 4).map((x) => `<a class="item" style="color:inherit;text-decoration:none" href="#/despachante/pacote/${x.p.token}"><span class="dot ${x.urgente ? "r" : "a"}"></span><b>${esc(titPacote(x.p))}</b><span class="muted" style="flex:1">${esc(x.texto)}</span><span class="muted small">${dt(x.em, { timeStyle: "short" })}</span></a>`).join("") || '<p class="muted">Nenhuma pendência aberta.</p>'}</div>
        <div class="cartao"><div class="cab"><h2>Nova cobrança</h2></div><p class="muted">Gerar cobrança de serviço e taxas.</p><button class="sec" disabled>Em breve</button></div>
        <div class="cartao"><div class="cab"><h2>Checklist</h2></div><p class="muted">Conferir documentos e etapas da transferência.</p><button class="sec" id="ck">Abrir checklist</button></div></div>
      <div class="cartao"><div class="cab"><h2>Pacotes em andamento <span class="pill">${emAnd.length} processos</span></h2><a href="#/despachante/andamento">Ver todos →</a></div>
        <div class="pacotes">${emAnd.slice(0, 3).map(cartaoPacote).join("") || '<p class="muted">Nenhum pacote em andamento. Em “Fila de pacotes”, cole o link recebido do vendedor.</p>'}</div></div>
      <div class="cartao" style="margin-top:16px"><div style="display:flex;align-items:center;gap:20px;flex-wrap:wrap"><h2 style="margin:0">Etapas da transferência</h2>${etapas("conferido")}</div></div>` });
    $("#ck").onclick = () => modal(`<h2>Checklist da transferência</h2><ul style="line-height:1.9;padding-left:18px"><li>CNH do vendedor e do comprador</li><li>Comprovante de endereço do comprador</li><li>CRV / ATPV-e assinado</li><li>Dados do veículo conferidos (placa, chassi, Renavam)</li><li>Débitos e multas verificados</li><li>Vistoria, quando exigida</li><li>Taxas e comprovantes de pagamento</li><li>Protocolo registrado</li></ul>`);
    return;
  }
  if (sub === "fila" || sub === "andamento" || sub === "concluidas") {
    const lista = sub === "fila" ? pacotes : sub === "andamento" ? emAnd : conc;
    const tit = { fila: "Fila de pacotes", andamento: "Em andamento", concluidas: "Transferências concluídas" }[sub];
    P({ ativo: sub, titulo: tit, sub: `${lista.length} pacote(s)`, corpo: `
      ${sub === "fila" ? `<div class="cartao" style="margin-bottom:16px"><h2>Receber pacote</h2><p class="muted small">Cole o link ou o código enviado pelo vendedor.</p><div style="display:flex;gap:8px;flex-wrap:wrap"><input id="lk" style="flex:1;min-width:220px" placeholder="https://…?d=… ou código"><button id="rc">Receber</button></div><div id="aviso"></div></div>` : ""}
      <div class="pacotes">${lista.map(cartaoPacote).join("") || '<div class="cartao muted">Nada por aqui ainda.</div>'}</div>` });
    if (sub === "fila") { $("#rc").onclick = () => receber($("#lk").value); try { const t = sessionStorage.getItem("giro_pacote"); if (t) { $("#lk").value = t; sessionStorage.removeItem("giro_pacote"); } } catch {} }
    return;
  }
  if (sub === "pendencias") {
    pendAll.sort((a, b) => new Date(b.em) - new Date(a.em));
    P({ ativo: "pendencias", titulo: "Pendências", sub: `${pendAll.length} em aberto`, corpo: `<div class="cartao">${pendAll.map((x) => `<a class="item" style="color:inherit;text-decoration:none" href="#/despachante/pacote/${x.p.token}"><span class="dot ${x.urgente ? "r" : "a"}"></span><b>${esc(titPacote(x.p))}</b><span class="muted">${esc(x.p.ficha?.veiculo?.placa || "")}</span><span style="flex:1">${esc(x.texto)}</span><span class="muted small">${dt(x.em)}</span></a>`).join("") || '<p class="muted">Nenhuma pendência aberta.</p>'}</div>` });
    return;
  }
  if (sub === "pacote") return paginaPacote(arg, P);
  if (sub === "perfil") return paginaPerfil(P);
  const t = (NAV_D.find((n) => n[0] === sub) || [0, "Em breve"])[1];
  P({ ativo: sub, titulo: t, sub: "Em breve", corpo: '<div class="cartao"><h2>Em breve</h2><p class="muted">Esta área entra nas próximas etapas.</p></div>' });
}

async function receber(texto) {
  const aviso = $("#aviso"); const m = String(texto || "").match(/[0-9a-f]{32}/i);
  if (!m) return msg(aviso, "Não encontrei o código do pacote. Cole o link completo recebido.");
  const { error } = await sb.rpc("receber_pacote", { p_token: m[0] });
  if (error) {
    const e = error.message || "";
    return msg(aviso, /expirado/.test(e) ? "O link expirou. Peça um novo ao vendedor." : /revogado/.test(e) ? "O vendedor cancelou este link." : /ja_recebido/.test(e) ? "Este pacote já foi recebido por outro despachante." : /nao_encontrado/.test(e) ? "Pacote não encontrado." : /sem_permissao/.test(e) ? "Esta conta não tem perfil de despachante." : "Não foi possível receber agora.");
  }
  location.hash = "#/despachante/pacote/" + m[0].toLowerCase(); rotear();
}

async function paginaPacote(token, P) {
  const p = pacotes.find((x) => x.token === token);
  if (!p) return P({ ativo: "fila", titulo: "Pacote", sub: "", corpo: '<div class="cartao"><h2>Pacote não encontrado</h2><p class="muted">Ele pode ter sido cancelado pelo vendedor.</p><a class="btn" href="#/despachante/fila">Voltar à fila</a></div>' });
  let fotos = [], docs = [];
  if ((p.fotos || []).length) {
    const { data } = await sb.storage.from("perfil").createSignedUrls(p.fotos, 3600);
    const url = {}; (data || []).forEach((x) => { if (x.signedUrl) url[x.path] = x.signedUrl; });
    fotos = p.fotos.filter((c) => !c.includes("/docs/")).map((c) => url[c]).filter(Boolean);
    docs = ((p.ficha || {}).documentos || []).map((d) => ({ nome: d.nome, tipo: d.tipo, url: url[d.arquivo] })).filter((d) => d.url);
  }
  const f = p.ficha || {}, pend = p.pendencias || [], idx = STATUS.findIndex((s) => s[0] === p.status), prox = STATUS[idx + 1];
  P({ ativo: "fila", titulo: `${titPacote(p)} · ${f.veiculo?.placa || ""}`, sub: `Recebido em ${dt(p.recebido_em)} · vendedor ${f.emissor?.nome || "—"}`, corpo: `
    <div class="cartao" style="margin-bottom:14px"><div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap"><span class="badge-st ${stCor(p.status)}">${stRot(p.status)}</span>${etapas(p.status)}</div>
      <div class="acoes" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px;align-items:end">
        <div style="flex:1;min-width:200px"><label style="margin-top:0">Observação (opcional)</label><input id="nota" maxlength="200" placeholder="Ex.: documentos conferidos"></div>
        ${prox ? `<button id="av">Avançar para: ${prox[2]}</button>` : ""}
        <div><label style="margin-top:0">Prazo</label><input id="prazo" type="date" value="${p.prazo || ""}"></div><button class="sec" id="spz">Salvar prazo</button>
        <button class="sec noprint" id="pr">Imprimir</button><button class="sec noprint" id="cp">Copiar dados</button></div><div id="aviso"></div></div>
    <div class="cartao" style="margin-bottom:14px"><div class="cab"><h2>Pendências (${abertas(p).length} em aberto)</h2></div>
      ${pend.map((x) => `<div class="item"><span class="dot ${x.aberta ? (x.urgente ? "r" : "a") : "g"}"></span><span style="flex:1;${x.aberta ? "" : "text-decoration:line-through;opacity:.6"}">${esc(x.texto)}</span><span class="muted small">${dt(x.em)}</span>${x.aberta ? `<button class="ok sm" data-res="${esc(x.id)}">Resolver</button>` : ""}</div>`).join("") || '<p class="muted">Nenhuma pendência.</p>'}
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px"><input id="pt" style="flex:1;min-width:200px" maxlength="300" placeholder="Nova pendência (ex.: comprador sem comprovante de endereço)"><label style="display:flex;align-items:center;gap:6px;margin:0"><input type="checkbox" id="pu" style="width:auto"> urgente</label><button id="pa">Adicionar</button></div></div>
    ${fichaCards(f)}
    ${(f.documentos || []).length ? `<div class="cartao" style="margin-bottom:14px"><h2>Documentos do comprador</h2>${(f.documentos || []).map((d) => { const x = docs.find((y) => y.nome === d.nome); return `<div class="item"><span class="dot ${x ? "g" : "a"}"></span><span style="flex:1">${esc(d.nome)}</span>${x ? `<a class="btn sec sm" href="${esc(x.url)}" target="_blank" rel="noopener">Abrir ${esc((d.tipo || "").toUpperCase())}</a>` : '<span class="muted small">arquivo indisponível</span>'}</div>`; }).join("")}</div>` : ""}
    ${fotos.length ? `<div class="cartao" style="margin-bottom:14px"><h2>Fotos</h2><div class="fotos">${fotos.map((u, i) => `<a href="${esc(u)}" target="_blank" rel="noopener"><img src="${esc(u)}" alt="Foto ${i + 1}" loading="lazy"></a>`).join("")}</div></div>` : ""}
    <div class="cartao"><h2>Histórico</h2>${[...(p.historico || [])].reverse().map((h) => `<div class="item"><span class="dot g"></span><b>${esc(stRot(h.status))}</b><span style="flex:1" class="muted">${esc(h.nota || "")}</span><span class="muted small">${dt(h.em)} · ${esc(h.por || "")}</span></div>`).join("") || '<p class="muted">Sem registros.</p>'}</div>` });
  const rec = async (fn, args) => { const { error } = await sb.rpc(fn, { p_token: token, ...args }); if (error) return msg($("#aviso"), "Não foi possível salvar agora."); rotear(); };
  if ($("#av")) $("#av").onclick = () => rec("atualizar_pacote", { p_status: prox[0], p_nota: $("#nota").value || null });
  $("#spz").onclick = () => $("#prazo").value ? rec("atualizar_pacote", { p_prazo: $("#prazo").value }) : msg($("#aviso"), "Escolha uma data.");
  $("#pa").onclick = () => $("#pt").value.trim() ? rec("adicionar_pendencia", { p_texto: $("#pt").value, p_urgente: $("#pu").checked }) : msg($("#aviso"), "Descreva a pendência.");
  document.querySelectorAll("[data-res]").forEach((b) => (b.onclick = () => rec("resolver_pendencia", { p_id: b.dataset.res })));
  $("#pr").onclick = () => window.print();
  $("#cp").onclick = async (e) => { try { await navigator.clipboard.writeText(fichaTexto(f)); e.target.textContent = "Copiado!"; } catch { e.target.textContent = "Não foi possível copiar"; } };
}

function paginaPerfil(P) {
  const e = escritorio || {};
  P({ ativo: "perfil", titulo: "Perfil e configurações", sub: user.email || "", corpo: `<div class="cartao" style="max-width:520px"><h2>Escritório</h2>
    <form id="pf"><label>Nome do escritório</label><input name="nome" required maxlength="80" value="${esc(e.nome || "")}"><label>Telefone</label><input name="tel" maxlength="30" value="${esc(e.telefone || "")}">
    <div style="display:grid;grid-template-columns:1fr 90px;gap:10px"><div><label>Cidade</label><input name="cid" maxlength="60" value="${esc(e.cidade || "")}"></div><div><label>UF</label><input name="uf" maxlength="2" value="${esc(e.uf || "")}"></div></div>
    <div style="margin-top:14px"><button type="submit">Salvar</button></div><div id="aviso"></div></form>
    <h2 style="margin-top:22px">Aparência</h2><button class="sec" id="tm2">Alternar tema claro/escuro</button></div>` });
  $("#tm2").onclick = alternarTema;
  $("#pf").onsubmit = async (ev) => { ev.preventDefault(); const f = ev.target;
    const { error } = await sb.from("escritorios").upsert({ nome: f.nome.value.trim(), telefone: f.tel.value.trim(), cidade: f.cid.value.trim(), uf: f.uf.value.trim().toUpperCase() });
    if (error) return msg($("#aviso"), "Não foi possível salvar agora.");
    await carregarPerfil(); msg($("#aviso"), "Salvo.", "ok"); };
}

// ====================== roteador ======================
async function rotear() {
  const q = new URLSearchParams(location.search);
  if (q.get("l")) return pubLaudo(q.get("l").trim().toUpperCase());
  if (q.get("d")) return pubFicha(q.get("d").trim());
  const h = (location.hash || "#/").replace(/^#\/?/, "").split("?")[0].split("/");
  await carregarPerfil();
  // TEMPORÁRIO: "Entrar" abre direto com sessão anônima (sem e-mail/senha). Tela de login completa: #/login/<perfil>
  if (h[0] === "login") return telaLogin(h[1] === "despachante" ? "despachante" : "vendedor");
  if (h[0] === "entrar") return acessoDireto(h[1] === "despachante" ? "despachante" : "vendedor");
  if (h[0] === "vendedor") return user ? (papeis.includes("vendedor") ? vendedor() : entrarNoPortal("vendedor")) : (location.hash = "#/entrar/vendedor");
  if (h[0] === "despachante") return user ? despachante(h[1] || "painel", h[2]) : (location.hash = "#/entrar/despachante");
  if (user && papeis.length === 1) return (location.hash = papeis[0] === "despachante" ? "#/despachante/painel" : "#/vendedor");
  landing();
}
window.addEventListener("hashchange", rotear);
sb.auth.onAuthStateChange((ev) => { if (ev === "PASSWORD_RECOVERY") novaSenha(); });
function novaSenha() {
  root.innerHTML = `<div class="centro"><img class="logo" src="logo.png" alt="GIRO"><div class="caixa"><h1>Nova senha</h1><form id="f"><label>Nova senha</label><input name="s" type="password" minlength="8" required autocomplete="new-password"><div style="margin-top:14px"><button type="submit">Salvar senha</button></div><div id="aviso"></div></form></div></div>`;
  $("#f").onsubmit = async (e) => { e.preventDefault(); const { error } = await sb.auth.updateUser({ password: e.target.s.value }); if (error) return msg($("#aviso"), "Não foi possível alterar a senha."); history.replaceState(null, "", location.pathname + "#/"); rotear(); };
}
if (new URLSearchParams(location.search).get("code")) { /* retorno do e-mail: o supabase-js troca o código; depois limpamos a URL */
  setTimeout(() => { if (!document.querySelector(".caixa")) history.replaceState(null, "", location.pathname + (location.hash || "#/")); }, 1500);
}
rotear();
