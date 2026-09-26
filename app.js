/*
  Minha Rede · Personal CRM

  Tudo roda no navegador. Os contatos ficam no localStorage desta máquina.
  Nenhum dado é enviado para servidor.

  Mapa do arquivo:
    1. Utilidades (datas, texto, armazenamento, ícones, tema claro e escuro)
    2. Dados e ajustes
    3. Prioridade (a regra da matriz, com cadência)
    4. Interações, linha do tempo e conexões entre pessoas
    5. Telas (Hoje, Funil, Prioridade, Contatos, Conexões, Atividades, Ajustes)
    6. Janelas (ficha, detalhe, trazer da IA)
    7. Pedidos prontos para a IA
    8. Importar e exportar
    9. Contatos de exemplo
   10. Eventos
*/
(function () {
  'use strict';

  const CFG = window.CRM_CONFIG;
  const KEY_DADOS = 'minha-rede:dados:v1';
  const KEY_AJUSTES = 'minha-rede:ajustes:v1';
  const KEY_ABA = 'minha-rede:aba';
  const KEY_TEMA = 'minha-rede:tema';
  const ABAS = ['hoje', 'funil', 'matriz', 'contatos', 'conexoes', 'atividades', 'ajustes'];

  /* 1. Utilidades ------------------------------------------------------ */

  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const semAcento = (s) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const chave = (s) => semAcento(s).toLowerCase().trim();
  const uid = () => 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const pad = (n) => String(n).padStart(2, '0');
  const isoDe = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const hojeISO = () => isoDe(new Date());
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const slug = (s) => chave(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'item';
  const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

  function parseISO(s) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(s || ''))) return null;
    const [y, m, d] = s.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    return dt.getMonth() === m - 1 ? dt : null;
  }
  function somarDias(n, base) {
    const d = parseISO(base) || parseISO(hojeISO());
    d.setDate(d.getDate() + n);
    return isoDe(d);
  }
  function diasAte(s) {
    const d = parseISO(s);
    if (!d) return null;
    return Math.round((d - parseISO(hojeISO())) / 864e5);
  }
  function fmtData(s) {
    const d = parseISO(s);
    return d ? `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}` : '';
  }
  function fmtCurta(s) {
    const d = parseISO(s);
    return d ? `${pad(d.getDate())}/${pad(d.getMonth() + 1)}` : '';
  }
  function relativo(s) {
    const n = -diasAte(s);
    if (Number.isNaN(n)) return '';
    if (n < 0) return n === -1 ? 'amanhã' : `daqui a ${-n} dias`;
    if (n === 0) return 'hoje';
    if (n === 1) return 'ontem';
    if (n < 45) return `há ${n} dias`;
    const m = Math.round(n / 30);
    return `há ${m} ${m === 1 ? 'mês' : 'meses'}`;
  }
  function iniciais(nome) {
    const p = String(nome || '?').trim().split(/\s+/);
    return ((p[0] || '?')[0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
  }

  // Aniversário guardado como "MM-DD" (o ano não importa).
  function lerAniversario(v) {
    const s = String(v || '').trim();
    let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    let mes;
    let dia;
    if (m) { mes = +m[2]; dia = +m[3]; }
    else if ((m = s.match(/^(\d{2})-(\d{2})$/))) { mes = +m[1]; dia = +m[2]; }
    else if ((m = s.match(/^(\d{1,2})\/(\d{1,2})/))) { dia = +m[1]; mes = +m[2]; }
    else return '';
    return mes >= 1 && mes <= 12 && dia >= 1 && dia <= 31 ? `${pad(mes)}-${pad(dia)}` : '';
  }
  function diasAteAniversario(mmdd) {
    if (!mmdd) return null;
    const [mes, dia] = mmdd.split('-').map(Number);
    const hoje = parseISO(hojeISO());
    let d = new Date(hoje.getFullYear(), mes - 1, dia);
    if (d < hoje) d = new Date(hoje.getFullYear() + 1, mes - 1, dia);
    return Math.round((d - hoje) / 864e5);
  }
  const fmtAniv = (mmdd) => (mmdd ? `${mmdd.slice(3)}/${mmdd.slice(0, 2)}` : '');

  const store = {
    get(k, fb) {
      try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch (e) { return fb; }
    },
    set(k, v) {
      try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) {
        toast('Não consegui salvar neste navegador. Baixe um backup na aba Ajustes.');
        return false;
      }
    }
  };

  // Tema: escuro é o padrão; os botões Escuro e Claro ficam no topo de todas as telas.
  function aplicarTema(t) {
    const tema = t === 'claro' ? 'claro' : 'escuro';
    document.documentElement.dataset.tema = tema;
    document.querySelectorAll('.tema-sel [data-tema]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tema === tema)));
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', tema === 'claro' ? '#EEF1F7' : '#060A14');
  }
  aplicarTema(store.get(KEY_TEMA, 'escuro'));

  // Ícones de linha (24x24) para cada tipo de interação.
  const ICONES = {
    reuniao: '<path d="M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1"/><circle cx="9" cy="7" r="3.5"/><path d="M22 19v-1a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
    ligacao: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/>',
    whatsapp: '<path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 21l2.1-5.5A8.4 8.4 0 1 1 21 11.5z"/><path d="M9 10h6M9 13.5h4"/>',
    email: '<rect x="2.5" y="4.5" width="19" height="15" rx="2.5"/><path d="m3 6.5 9 6.5 9-6.5"/>',
    linkedin: '<rect x="3" y="3" width="18" height="18" rx="3.5"/><path d="M8 10.5V17M8 7.2v.1M12 17v-3.8a2.3 2.3 0 0 1 4.6 0V17M12 10.5V17"/>',
    evento: '<rect x="3" y="4.5" width="18" height="16" rx="2.5"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/><path d="m12 12.5.9 1.9 2 .3-1.5 1.4.4 2-1.8-1-1.8 1 .4-2-1.5-1.4 2-.3z"/>',
    cafe: '<path d="M17 8.5h1.5a3.2 3.2 0 0 1 0 6.4H17"/><path d="M3 8.5h14v6a5.5 5.5 0 0 1-5.5 5.5h-3A5.5 5.5 0 0 1 3 14.5z"/><path d="M7 2.5v3M11 2.5v3"/>',
    nota: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    sistema: '<path d="M4 12h12M12 6l6 6-6 6"/>',
    inicio: '<path d="M12 2.5l2.9 5.9 6.6.9-4.8 4.6 1.1 6.5L12 17.3l-5.8 3.1 1.1-6.5L2.5 9.3l6.6-.9z"/>'
  };
  const icone = (t) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONES[t] || ICONES.nota}</svg>`;

  /* 2. Dados e ajustes ------------------------------------------------- */

  const CANAIS = [['', 'Não sei ainda'], ['whatsapp', 'WhatsApp'], ['instagram', 'Instagram'], ['linkedin', 'LinkedIn'], ['email', 'E-mail'], ['telefone', 'Ligação'], ['outro', 'Outro']];
  const CADENCIAS = [[0, 'Sem cadência'], [7, 'Toda semana'], [14, 'A cada 2 semanas'], [30, 'Todo mês'], [60, 'A cada 2 meses'], [90, 'A cada 3 meses'], [180, 'A cada 6 meses']];
  const MESES_NOME = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const nomeCanal = (v) => (CANAIS.find(([k]) => k === v) || ['', ''])[1];
  const nomeCadencia = (n) => (CADENCIAS.find(([v]) => v === Number(n)) || CADENCIAS[0])[1];

  function ajustesPadrao() {
    return clone({
      nomeApp: CFG.nomeApp, seuNome: '', perfil: {}, codigoPais: CFG.codigoPais, tipos: CFG.tipos, potencial: CFG.potencial,
      limiteImportante: CFG.limiteImportante, diasUrgente: CFG.diasUrgente,
      diasEsfriando: CFG.diasEsfriando, etapas: CFG.etapas
    });
  }

  let aj = Object.assign(ajustesPadrao(), store.get(KEY_AJUSTES, {}) || {});
  let contatos = store.get(KEY_DADOS, []);
  contatos = (Array.isArray(contatos) ? contatos : []).filter((c) => c && c.nome).map(carregar);
  let aba = store.get(KEY_ABA, 'hoje');
  const filtro = { q: '', tipo: '', etapa: '', arquivados: false };
  const filtroAt = { tipo: '', dias: '30' };
  let tipoIntAtual = 'reuniao';

  const salvar = () => store.set(KEY_DADOS, contatos);
  const salvarAjustes = () => store.set(KEY_AJUSTES, aj);

  // Perfil da pessoa dona do app. Usado na saudação, na sigla da barra lateral,
  // nos pedidos para a IA e para mostrar quem na rede combina com ela.
  const perfil = () => {
    if (!aj.perfil || typeof aj.perfil !== 'object') aj.perfil = {};
    if (!aj.perfil.nome && aj.seuNome) aj.perfil.nome = aj.seuNome;
    return aj.perfil;
  };
  const nomeDono = () => String(perfil().nome || '').trim();
  const primeiroNome = () => nomeDono().split(/\s+/)[0] || '';
  const interessesDono = () => String(perfil().interesses || '').split(/[;,]/).map((x) => x.trim()).filter(Boolean);
  // Foto do perfil, ou a sigla quando não há foto.
  const avatarDono = (cls) => `<span class="${cls}">${perfil().foto ? `<img src="${esc(perfil().foto)}" alt="">`
    : nomeDono() ? esc(iniciais(nomeDono())) : '?'}</span>`;
  function perfilComoContato() {
    const p = perfil();
    if (!interessesDono().length && !p.oferece && !p.precisa && !p.organizacao) return null;
    return { id: 'voce', nome: 'Você', organizacao: p.organizacao || '', evento: '', precisa: p.precisa || '', oferece: p.oferece || '', tags: interessesDono() };
  }
  const achar = (id) => contatos.find((c) => c.id === id);
  const ativos = () => contatos.filter((c) => !c.arquivado);

  function acharTipo(v) {
    const k = chave(v);
    if (!k) return '';
    const t = aj.tipos.find((x) => x.id === v || chave(x.id) === k || chave(x.nome) === k);
    return t ? t.id : '';
  }
  function acharEtapa(v) {
    const k = chave(v);
    return aj.etapas.find((e) => chave(e) === k) || aj.etapas[0];
  }
  function acharTipoInt(v) {
    const k = chave(v);
    if (k === 'sistema') return 'sistema';
    const t = CFG.tiposInteracao.find((x) => x.id === k || chave(x.nome) === k);
    return t ? t.id : 'nota';
  }
  function acharCanal(v) {
    const k = chave(v);
    const c = CANAIS.find(([id, nome]) => id && (id === k || chave(nome) === k));
    return c ? c[0] : '';
  }

  // Transforma qualquer objeto (formulário, IA, planilha) num contato válido.
  function normalizar(o) {
    o = o || {};
    const t = (v) => (v == null ? '' : String(v)).trim();
    const data = (v) => (parseISO(t(v)) ? t(v) : '');
    const pot = chave(o.potencial);
    const tags = Array.isArray(o.tags) ? o.tags : t(o.tags).split(/[;,]/);
    const cad = Number(o.cadencia);
    return {
      id: t(o.id) || uid(),
      nome: t(o.nome),
      cargo: t(o.cargo),
      organizacao: t(o.organizacao || o.empresa || o.org),
      telefone: t(o.telefone || o.whatsapp || o.celular),
      email: t(o.email),
      linkedin: t(o.linkedin),
      instagram: t(o.instagram).replace(/^@/, ''),
      canal: acharCanal(o.canal),
      evento: t(o.evento),
      conheciEm: data(o.conheciEm),
      tipo: acharTipo(t(o.tipo)),
      potencial: ['alto', 'medio', 'baixo'].includes(pot) ? pot : 'medio',
      etapa: acharEtapa(t(o.etapa)),
      prazoExterno: o.prazoExterno === true || /^(sim|true|1)$/i.test(t(o.prazoExterno)),
      precisa: t(o.precisa),
      oferece: t(o.oferece),
      notas: t(o.notas),
      familia: t(o.familia),
      gosta: t(o.gosta),
      naoGosta: t(o.naoGosta || o.nao_gosta),
      aniversario: lerAniversario(o.aniversario),
      cadencia: CADENCIAS.some(([v]) => v === cad) ? cad : 0,
      proximoPasso: t(o.proximoPasso),
      followUp: data(o.followUp),
      tags: tags.map((x) => String(x).trim()).filter(Boolean),
      arquivado: o.arquivado === true || /^(sim|true|1)$/i.test(t(o.arquivado)),
      interacoes: (Array.isArray(o.interacoes) ? o.interacoes : [])
        .filter((i) => i && (t(i.texto) || chave(i.tipo) === 'sistema'))
        .map((i) => ({ id: t(i.id) || uid(), data: data(i.data) || hojeISO(), tipo: acharTipoInt(i.tipo), texto: t(i.texto) })),
      criadoEm: data(o.criadoEm) || hojeISO()
    };
  }

  // Ao carregar dados salvos, preserva tipo e etapa mesmo que as regras tenham mudado.
  function carregar(o) {
    return Object.assign(normalizar(o), { tipo: String(o.tipo || ''), etapa: String(o.etapa || aj.etapas[0]) });
  }

  /* 3. Prioridade ------------------------------------------------------ */

  const QUAD = {
    agir: { nome: 'Agir hoje', desc: 'Importante e urgente', ordem: 0 },
    rapido: { nome: 'Resolver rápido', desc: 'Urgente, menos importante', ordem: 1 },
    agendar: { nome: 'Agendar', desc: 'Importante, sem pressa', ordem: 2 },
    depois: { nome: 'Deixar para depois', desc: 'Nem urgente nem importante', ordem: 3 }
  };
  const POT_NOME = { alto: 'potencial alto', medio: 'potencial médio', baixo: 'potencial baixo' };

  const tipoDe = (c) => aj.tipos.find((t) => t.id === c.tipo) || { id: '', nome: 'Sem tipo', peso: 1 };

  function ultimoContato(c) {
    const datas = [c.conheciEm, c.criadoEm]
      .concat(c.interacoes.filter((i) => i.tipo !== 'sistema').map((i) => i.data))
      .filter(parseISO).sort();
    return datas[datas.length - 1] || hojeISO();
  }

  // Sem data marcada, a cadência sugere quando retomar: último contato + intervalo escolhido.
  const proximoPelaCadencia = (c) => (c.cadencia ? somarDias(Number(c.cadencia), ultimoContato(c)) : '');
  const followUpEfetivo = (c) => c.followUp || proximoPelaCadencia(c);

  function textoDias(d) {
    if (d < -1) return `follow-up atrasado há ${-d} dias`;
    if (d === -1) return 'follow-up atrasado desde ontem';
    if (d === 0) return 'follow-up é hoje';
    if (d === 1) return 'follow-up amanhã';
    return `follow-up em ${d} dias`;
  }

  // A regra inteira da matriz está aqui. Mude com cuidado e explique a mudança na tela Prioridade.
  function prioridade(c) {
    const tipo = tipoDe(c);
    const imp = Number(tipo.peso) + Number(aj.potencial[c.potencial] ?? 0);
    const importante = imp >= Number(aj.limiteImportante);
    const pausado = c.etapa === CFG.etapaPausada;
    const fu = followUpEfetivo(c);
    const pelaCadencia = !c.followUp && Boolean(fu);
    const dias = fu ? diasAte(fu) : null;
    const semContato = -diasAte(ultimoContato(c));
    const limiteEsfria = c.cadencia ? Number(c.cadencia) : Number(aj.diasEsfriando);
    const esfriando = !pausado && semContato > limiteEsfria;
    // Prazo externo só pesa quando você não falou com a pessoa na última semana.
    const prazoPesa = c.prazoExterno && semContato > 7;

    const motivos = [`${tipo.nome}, ${POT_NOME[c.potencial] || 'potencial médio'}`];
    motivos.push(dias === null ? 'sem data de follow-up' : textoDias(dias) + (pelaCadencia ? ' (pela cadência)' : ''));
    if (c.prazoExterno && !pausado) motivos.push('tem prazo externo');
    if (esfriando) motivos.push(`sem conversa há ${semContato} dias`);
    if (pausado) motivos.push('relação pausada');

    const urgente = !pausado && (
      (dias !== null && dias <= Number(aj.diasUrgente)) ||
      prazoPesa ||
      (esfriando && importante)
    );
    const q = importante && urgente ? 'agir' : importante ? 'agendar' : urgente ? 'rapido' : 'depois';
    return { q, imp, importante, urgente, dias, esfriando, semContato, motivos, pelaCadencia };
  }

  function ordenar(lista) {
    return lista.map((c) => ({ c, p: prioridade(c) })).sort((a, b) =>
      QUAD[a.p.q].ordem - QUAD[b.p.q].ordem ||
      (a.p.dias ?? 9999) - (b.p.dias ?? 9999) ||
      b.p.imp - a.p.imp ||
      a.c.nome.localeCompare(b.c.nome, 'pt-BR'));
  }

  /* 4. Interações, linha do tempo e conexões --------------------------- */

  const nomeInt = (t) => (t === 'sistema' ? 'Atualização' : t === 'inicio' ? 'Primeiro contato'
    : (CFG.tiposInteracao.find((x) => x.id === t) || { nome: 'Anotação' }).nome);

  // Linha do tempo ordenada da mais recente para a mais antiga (no mesmo dia, a última registrada vem primeiro).
  function linhaDoTempo(c) {
    return c.interacoes.map((i, idx) => ({ i, idx }))
      .sort((a, b) => b.i.data.localeCompare(a.i.data) || b.idx - a.idx)
      .map((x) => x.i);
  }
  const ultimaInteracao = (c) => linhaDoTempo(c).find((i) => i.tipo !== 'sistema');
  function registrarSistema(c, texto) {
    c.interacoes.push({ id: uid(), data: hojeISO(), tipo: 'sistema', texto });
  }
  function mudarEtapa(c, nova) {
    if (!c || !nova || c.etapa === nova) return false;
    registrarSistema(c, `Situação: ${c.etapa} → ${nova}`);
    c.etapa = nova;
    return true;
  }
  const etapaDe = (c) => (aj.etapas.includes(c.etapa) ? c.etapa : aj.etapas[0]);

  // Conexões: regras simples e visíveis. Temas em comum, mesma organização, mesmo evento
  // e o que uma pessoa precisa com o que a outra oferece (comparando palavras).
  const STOP = new Set(['para', 'sobre', 'entre', 'ainda', 'mais', 'como', 'quer', 'precisa', 'oferece', 'este', 'esta', 'esse', 'essa',
    'seus', 'suas', 'dela', 'dele', 'pelo', 'pela', 'proximo', 'proxima', 'anual', 'nosso', 'nossa', 'fazer', 'poder', 'pode']);
  const palavras = (txt) => [...new Set(chave(txt).replace(/[^a-z0-9]+/g, ' ').split(' ').filter((w) => w.length >= 5 && !STOP.has(w)))];
  const raiz = (w) => w.slice(0, 6);
  const temasDe = (c) => c.tags.filter((t) => chave(t) !== 'exemplo');

  function relacao(a, b) {
    const motivos = [];
    let pontos = 0;
    const ajuda = [];
    const casa = (quem, outro) => {
      if (!quem.precisa || !outro.oferece) return;
      const r = new Set(palavras(quem.precisa).map(raiz));
      if (palavras(outro.oferece).some((w) => r.has(raiz(w)))) ajuda.push({ de: outro, para: quem });
    };
    casa(a, b);
    casa(b, a);
    ajuda.forEach((x) => { motivos.push(`${x.de.nome} oferece "${x.de.oferece}" e ${x.para.nome} precisa de "${x.para.precisa}"`); pontos += 3; });
    const ta = temasDe(a).map(chave);
    const comuns = temasDe(b).filter((t) => ta.includes(chave(t)));
    if (comuns.length) { motivos.push(`Temas em comum: ${comuns.join(', ')}`); pontos += 2 * comuns.length; }
    if (a.organizacao && chave(a.organizacao) === chave(b.organizacao)) { motivos.push(`Mesma organização: ${a.organizacao}`); pontos += 1; }
    if (a.evento && chave(a.evento) === chave(b.evento)) { motivos.push(`Você conheceu os dois em: ${a.evento}`); pontos += 1; }
    return { a, b, motivos, pontos, ajuda: ajuda.length > 0 };
  }
  function todasConexoes(lista) {
    const out = [];
    for (let i = 0; i < lista.length; i++) {
      for (let j = i + 1; j < lista.length; j++) {
        const r = relacao(lista[i], lista[j]);
        if (r.pontos > 0) out.push(r);
      }
    }
    return out.sort((x, y) => Number(y.ajuda) - Number(x.ajuda) || y.pontos - x.pontos);
  }
  const conexoesDe = (c) => todasConexoes(ativos()).filter((r) => r.a.id === c.id || r.b.id === c.id);

  // A rede que se forma: pessoas ligadas aos temas e eventos que compartilham com alguém,
  // mais uma linha verde quando uma pessoa oferece o que a outra precisa.
  function montarRede(lista) {
    const nos = [];
    const arestas = [];
    const idx = new Map();
    const add = (id, tipo, rot, extra) => {
      if (!idx.has(id)) { idx.set(id, nos.length); nos.push(Object.assign({ id, tipo, rot }, extra)); }
      return idx.get(id);
    };
    lista.forEach((c) => add('p:' + c.id, 'pessoa', c.nome, { c }));
    const contaTema = {};
    const contaEv = {};
    lista.forEach((c) => {
      temasDe(c).forEach((t) => { const k = chave(t); contaTema[k] = contaTema[k] || { rot: t, n: 0 }; contaTema[k].n++; });
      if (c.evento) { const k = chave(c.evento); contaEv[k] = contaEv[k] || { rot: c.evento, n: 0 }; contaEv[k].n++; }
    });
    lista.forEach((c) => {
      const pi = idx.get('p:' + c.id);
      temasDe(c).forEach((t) => {
        const k = chave(t);
        if (contaTema[k].n >= 2) arestas.push({ s: pi, t: add('t:' + k, 'tema', contaTema[k].rot), tipo: 'tema' });
      });
      if (c.evento) {
        const k = chave(c.evento);
        if (contaEv[k].n >= 2) arestas.push({ s: pi, t: add('e:' + k, 'evento', contaEv[k].rot), tipo: 'evento' });
      }
    });
    todasConexoes(lista).filter((r) => r.ajuda)
      .forEach((r) => arestas.push({ s: idx.get('p:' + r.a.id), t: idx.get('p:' + r.b.id), tipo: 'ajuda' }));
    return { nos, arestas };
  }

  // Posiciona os pontos com forças simples: todo mundo se afasta, quem tem ligação se aproxima.
  // mx e my são as margens livres nas bordas, para caber o nome de cada pessoa.
  function forcas(nos, arestas, W, H, mx = 50, my = 36) {
    const n = nos.length;
    nos.forEach((no, i) => {
      const ang = (i / n) * Math.PI * 2;
      const r = no.tipo === 'pessoa' ? 0.36 : 0.14;
      no.x = W / 2 + Math.cos(ang) * W * r;
      no.y = H / 2 + Math.sin(ang) * H * r;
    });
    const k = Math.sqrt((W * H) / Math.max(1, n)) * 0.62;
    const voltas = 320;
    for (let it = 0; it < voltas; it++) {
      const temp = (1 - it / voltas) * 16 + 0.3;
      const dx = new Array(n).fill(0);
      const dy = new Array(n).fill(0);
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          let ex = nos[i].x - nos[j].x;
          let ey = nos[i].y - nos[j].y;
          const d = Math.sqrt(ex * ex + ey * ey) || 0.1;
          const f = (k * k) / d;
          ex = (ex / d) * f;
          ey = (ey / d) * f;
          dx[i] += ex; dy[i] += ey; dx[j] -= ex; dy[j] -= ey;
        }
      }
      arestas.forEach((a) => {
        let ex = nos[a.s].x - nos[a.t].x;
        let ey = nos[a.s].y - nos[a.t].y;
        const d = Math.sqrt(ex * ex + ey * ey) || 0.1;
        const f = ((d * d) / k) * (a.tipo === 'ajuda' ? 1.4 : 1);
        ex = (ex / d) * f;
        ey = (ey / d) * f;
        dx[a.s] -= ex; dy[a.s] -= ey; dx[a.t] += ex; dy[a.t] += ey;
      });
      for (let i = 0; i < n; i++) {
        dx[i] += (W / 2 - nos[i].x) * 0.9;
        dy[i] += (H / 2 - nos[i].y) * 0.9;
        const d = Math.sqrt(dx[i] * dx[i] + dy[i] * dy[i]) || 0.1;
        nos[i].x = Math.max(mx, Math.min(W - mx, nos[i].x + (dx[i] / d) * Math.min(d, temp)));
        nos[i].y = Math.max(my, Math.min(H - my, nos[i].y + (dy[i] / d) * Math.min(d, temp)));
      }
    }
  }

  /* 5. Telas ----------------------------------------------------------- */

  function render() {
    pararRede();
    document.title = `${aj.nomeApp} · Personal CRM`;
    $('#appName').textContent = aj.nomeApp;
    const sigla = $('#sigla');
    if (sigla) {
      sigla.innerHTML = perfil().foto ? `<img src="${esc(perfil().foto)}" alt="">`
        : nomeDono() ? esc(iniciais(nomeDono()))
          : '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 20.5a8 8 0 0 1 16 0"/></svg>';
    }
    document.querySelectorAll('.tabs [data-view]').forEach((b) => {
      if (b.dataset.view === aba) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    const fila = ativos().filter((c) => ['agir', 'rapido'].includes(prioridade(c).q)).length;
    $('#nFila').textContent = fila || '';
    const tela = { hoje: telaHoje, funil: telaFunil, matriz: telaMatriz, contatos: telaContatos, conexoes: telaConexoes, atividades: telaAtividades, ajustes: telaAjustes }[aba] || telaHoje;
    $('#view').innerHTML = tela();
    if (aba === 'conexoes') iniciarRede();
  }

  // Ao mudar o tamanho da janela, o mapa da rede se redesenha.
  let esperaTamanho = 0;
  window.addEventListener('resize', () => {
    clearTimeout(esperaTamanho);
    esperaTamanho = setTimeout(() => { if (aba === 'conexoes') iniciarRede(); }, 180);
  });

  function trocarAba(nova) {
    aba = ABAS.includes(nova) ? nova : 'hoje';
    store.set(KEY_ABA, aba);
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function linkWhats(tel) {
    let d = String(tel || '').replace(/\D/g, '');
    if (d.length < 8) return '';
    if (d.length <= 11) d = String(aj.codigoPais || '') + d;
    return 'https://wa.me/' + d;
  }
  function linkLinkedin(v) {
    v = String(v || '').trim();
    if (!v) return '';
    if (/^https?:\/\//i.test(v)) return /^https?:\/\/([a-z]+\.)?linkedin\.com\//i.test(v) ? v : '';
    if (/^([a-z]+\.)?linkedin\.com\//i.test(v)) return 'https://' + v;
    return 'https://www.linkedin.com/in/' + encodeURIComponent(v.replace(/^@/, ''));
  }
  function linkInstagram(v) {
    v = String(v || '').trim();
    if (!v) return '';
    const m = v.match(/instagram\.com\/([A-Za-z0-9._]+)/i);
    const user = (m ? m[1] : v.replace(/^@/, '')).replace(/[^A-Za-z0-9._]/g, '');
    return user ? `https://www.instagram.com/${user}/` : '';
  }
  function linksRapidos(c) {
    const out = [];
    const w = linkWhats(c.telefone);
    const l = linkLinkedin(c.linkedin);
    const ig = linkInstagram(c.instagram);
    if (w) out.push(`<a class="chip" href="${esc(w)}" target="_blank" rel="noopener">WhatsApp</a>`);
    if (c.email) out.push(`<a class="chip" href="mailto:${esc(c.email)}">E-mail</a>`);
    if (l) out.push(`<a class="chip" href="${esc(l)}" target="_blank" rel="noopener">LinkedIn</a>`);
    if (ig) out.push(`<a class="chip" href="${esc(ig)}" target="_blank" rel="noopener">Instagram</a>`);
    return out.join('');
  }

  function cartao(c, p) {
    const ult = ultimaInteracao(c);
    return `<article class="card q-${p.q}" data-action="abrir" data-id="${esc(c.id)}" tabindex="0">
      <div class="avatar">${esc(iniciais(c.nome))}</div>
      <div class="info">
        <div class="linha1"><h3>${esc(c.nome)}</h3><span class="badge q-${p.q}">${QUAD[p.q].nome}</span></div>
        <p class="meta">${esc([c.cargo, c.organizacao].filter(Boolean).join(' · ') || c.evento)}</p>
        <p class="why">${esc(p.motivos.join(' · '))}</p>
        ${ult ? `<p class="ult ti-${ult.tipo}">${icone(ult.tipo)}<span>${esc(nomeInt(ult.tipo))} ${esc(relativo(ult.data))}: ${esc(ult.texto)}</span></p>` : ''}
        ${c.proximoPasso ? `<p class="next"><span>Próximo passo</span>${esc(c.proximoPasso)}</p>` : ''}
      </div>
      <div class="quick">${linksRapidos(c)}<button class="btn sm" type="button" data-action="feito" data-id="${esc(c.id)}">Registrar interação</button></div>
    </article>`;
  }

  const metrica = (rotulo, n, extra = '') => `<div class="metric ${extra}"><span>${rotulo}</span><b>${n}</b></div>`;

  function telaVazia() {
    return `<section class="vazio">
      <h2>Comece pela última pessoa que você conheceu.</h2>
      <p>Registre quem é, como falar, cada interação e quando retomar. O app mostra quem merece sua atenção primeiro.</p>
      <div class="row">
        <button class="btn primary" type="button" data-open="novo">Adicionar contato</button>
        <button class="btn" type="button" data-open="importar">Trazer da IA</button>
        <button class="btn ghost" type="button" data-action="exemplos">Ver com exemplos fictícios</button>
      </div>
    </section>`;
  }

  const MESES = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
  const DIAS_SEM = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  // Gradientes usados pelos anéis e pela linha do painel.
  const DEFS = `<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>
    <linearGradient id="gSpark" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#60A5FA" stop-opacity=".35"/><stop offset="1" stop-color="#60A5FA" stop-opacity="0"/></linearGradient>
    <linearGradient id="gRing" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#60A5FA"/><stop offset="1" stop-color="#A78BFA"/></linearGradient>
    <linearGradient id="gRingQ" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FDBA74"/><stop offset="1" stop-color="#F97316"/></linearGradient>
  </defs></svg>`;

  const ICONES_ATALHO = {
    novo: '<path d="M12 5v14M5 12h14"/>',
    ia: '<path d="M12 3l1.8 4.9L19 9.7l-5.2 1.8L12 16.5l-1.8-5L5 9.7l5.2-1.8z"/><path d="M19 15l.8 2.2 2.2.8-2.2.8L19 21l-.8-2.2-2.2-.8 2.2-.8z"/>',
    funil: '<rect x="3" y="4" width="5" height="16" rx="1.5"/><rect x="10" y="4" width="5" height="11" rx="1.5"/><rect x="17" y="4" width="4" height="7" rx="1.5"/>',
    conexoes: '<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.2 10.9l7.6-3.8M8.2 13.1l7.6 3.8"/>',
    atividades: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
    backup: '<path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>'
  };
  const svgLinha = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;

  function anel(pct, cls, centro) {
    const r = 58;
    const circ = 2 * Math.PI * r;
    const v = Math.max(0, Math.min(100, pct));
    return `<div class="ring-wrap"><svg class="ring ${cls || ''}" viewBox="0 0 140 140" aria-hidden="true">
      <circle class="trilho" cx="70" cy="70" r="${r}"/>
      <circle class="brilho" cx="70" cy="70" r="${r}" stroke-dasharray="${(circ * v / 100).toFixed(1)} ${circ.toFixed(1)}"/>
      <circle class="valor" cx="70" cy="70" r="${r}" stroke-dasharray="${(circ * v / 100).toFixed(1)} ${circ.toFixed(1)}"/>
    </svg>${centro ? `<div class="centro">${centro}</div>` : ''}</div>`;
  }

  function sparkline(vals) {
    const w = 400;
    const h = 120;
    const max = Math.max(1, ...vals);
    const pts = vals.map((v, i) => [(i * w) / (vals.length - 1), h - 16 - (v / max) * (h - 40)]);
    let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1];
      const [x1, y1] = pts[i];
      const cx = ((x0 + x1) / 2).toFixed(1);
      d += ` C${cx},${y0.toFixed(1)} ${cx},${y1.toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)}`;
    }
    const pontos = pts.filter((p, i) => vals[i] > 0).map(([x, y]) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.2"/>`).join('');
    return `<svg class="spark" viewBox="0 0 ${w} ${h}" aria-hidden="true"><path class="a" d="${d} L${w},${h} L0,${h} Z"/><path class="g" d="${d}"/><path class="l" d="${d}"/>${pontos}</svg>`;
  }

  /* Mapa da rede no jeito do gráfico do Obsidian: um fio fino por ligação, bolinhas pequenas com o nome
     embaixo, nas cores do app (roxo, azul e ciano). Passar o mouse numa pessoa acende ela e as ligações
     dela; o resto apaga. Todo fio é uma ligação de verdade (tema, evento ou ajuda). */
  const PALETA = {
    escuro: { faixa: [[168, 85, 247], [129, 140, 248], [96, 165, 250], [34, 211, 238]], tema: [103, 232, 249], evento: [253, 186, 116],
      ajuda: [74, 222, 128], luz: [255, 255, 255], fio: 0.32, brilho: 0.28 },
    claro: { faixa: [[147, 51, 234], [79, 70, 229], [37, 99, 235], [8, 145, 178]], tema: [8, 145, 178], evento: [234, 88, 12],
      ajuda: [22, 163, 74], luz: [37, 99, 235], fio: 0.28, brilho: 0.1 }
  };
  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  const FONTE_MAPA = '-apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, "Segoe UI", Roboto, sans-serif';
  let redeViva = null;

  function corNaFaixa(faixa, u) {
    const x = Math.max(0, Math.min(1, u)) * (faixa.length - 1);
    const i = Math.min(faixa.length - 2, Math.floor(x));
    const f = x - i;
    return faixa[i].map((v, k) => Math.round(v + (faixa[i + 1][k] - v) * f));
  }

  // Sorteio com semente: o desenho sai igual a cada visita.
  function sorteio(semente) {
    let a = 0;
    for (let i = 0; i < semente.length; i++) a = (Math.imul(31, a) + semente.charCodeAt(i)) | 0;
    return () => {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Nome curto para o mapa: primeiro nome e último sobrenome ("Maria Souza", "João Del Rio").
  function nomeCurto(nome) {
    const p = String(nome || '').trim().split(/\s+/);
    if (p.length <= 2) return p.join(' ');
    let fim = p.length - 1;
    const junto = [p[fim]];
    if (fim > 1 && /^(junior|júnior|filho|neto|sobrinho)$/i.test(p[fim])) junto.unshift(p[--fim]);
    if (fim > 1 && /^(da|de|do|das|dos|del|di|du|van|von)$/i.test(p[fim - 1])) junto.unshift(p[fim - 1]);
    return [p[0]].concat(junto).join(' ');
  }

  // Nome centralizado embaixo da bolinha. A caixa [x, y, largura, altura] é relativa ao ponto.
  const medidorTexto = document.createElement('canvas').getContext('2d');
  function caixaDoNome(no, W) {
    const pessoa = no.tipo === 'pessoa';
    const txt = pessoa ? nomeCurto(no.c.nome) : no.rot;
    medidorTexto.font = `${pessoa ? 500 : 600} 11.5px ${FONTE_MAPA}`;
    const w = medidorTexto.measureText(txt).width;
    const x = Math.max(4, Math.min(W - 4 - w, no.x - w / 2));
    const y = no.y + no.r + 14;
    return { txt, x, y, caixa: [x - no.x - 3, y - 11 - no.y, w + 6, 15] };
  }

  // Empurra pontos cujos nomes (ou bolinhas) ficariam um em cima do outro.
  function afastarNomes(nos, W, H, mx, my) {
    const corpos = nos.map((no) => ({ no, peso: no.tipo === 'pessoa' ? 1 : 0.35 }));
    for (let volta = 0; volta < 90; volta++) {
      let mexeu = false;
      corpos.forEach((c) => {
        c.rs = [caixaDoNome(c.no, W).caixa, [-c.no.r - 4, -c.no.r - 4, 2 * c.no.r + 8, 2 * c.no.r + 8]];
      });
      for (let i = 0; i < corpos.length; i++) {
        for (let j = i + 1; j < corpos.length; j++) {
          const A = corpos[i];
          const B = corpos[j];
          A.rs.forEach((ra) => B.rs.forEach((rb) => {
            const ax = A.no.x + ra[0];
            const ay = A.no.y + ra[1];
            const bx = B.no.x + rb[0];
            const by = B.no.y + rb[1];
            const ox = Math.min(ax + ra[2], bx + rb[2]) - Math.max(ax, bx);
            const oy = Math.min(ay + ra[3], by + rb[3]) - Math.max(ay, by);
            if (ox <= 0 || oy <= 0) return;
            mexeu = true;
            const tot = A.peso + B.peso;
            if (oy < ox) {
              const s = (ay + ra[3] / 2 < by + rb[3] / 2 ? -1 : 1) * (oy + 1);
              A.no.y += s * (B.peso / tot);
              B.no.y -= s * (A.peso / tot);
            } else {
              const s = (ax + ra[2] / 2 < bx + rb[2] / 2 ? -1 : 1) * (ox + 1);
              A.no.x += s * (B.peso / tot);
              B.no.x -= s * (A.peso / tot);
            }
          }));
        }
      }
      corpos.forEach((c) => {
        c.no.x = Math.max(mx, Math.min(W - mx, c.no.x));
        c.no.y = Math.max(my, Math.min(H - my, c.no.y));
      });
      if (!mexeu) break;
    }
  }

  function mapaRede(lista) {
    return `<div class="rede-mapa" id="rede" role="img" aria-label="Mapa da rede com ${plural(lista.length, 'pessoa', 'pessoas')}. As mesmas ligações aparecem em lista logo abaixo."><canvas></canvas></div>
      <div class="legenda-rede"><span><i class="lp"></i>Pessoas</span><span><i class="lt"></i>Temas em comum</span><span><i class="le"></i>Eventos</span><span><i class="la"></i>Uma oferece o que a outra precisa</span><span class="dica">Passe o mouse numa pessoa para ver as ligações dela</span></div>`;
  }

  function pararRede() {
    if (redeViva) cancelAnimationFrame(redeViva.raf);
    redeViva = null;
  }

  function iniciarRede() {
    pararRede();
    const caixa = document.getElementById('rede');
    if (!caixa) return;
    const cv = caixa.querySelector('canvas');
    const W = Math.max(280, caixa.clientWidth);
    const H = Math.round(Math.max(360, Math.min(600, W * 0.54)));
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
    cv.style.height = H + 'px';

    const css = getComputedStyle(document.documentElement);
    const tinta = css.getPropertyValue('--ink').trim() || '#EEF2FF';
    const tinta2 = css.getPropertyValue('--ink2').trim() || '#A3AECB';
    const P = document.documentElement.dataset.tema === 'claro' ? PALETA.claro : PALETA.escuro;

    const { nos, arestas } = montarRede(ativos());
    if (!nos.length) return;
    const mx = W < 560 ? 40 : 70;
    forcas(nos, arestas, W, H, mx, 28);
    const vizinhos = nos.map(() => new Set());
    arestas.forEach((a) => { vizinhos[a.s].add(a.t); vizinhos[a.t].add(a.s); });
    nos.forEach((no, i) => {
      const g = vizinhos[i].size;
      no.cor = no.tipo === 'tema' ? P.tema : no.tipo === 'evento' ? P.evento : corNaFaixa(P.faixa, (no.x - mx) / (W - 2 * mx));
      no.r = no.tipo === 'pessoa' ? 3.2 + Math.min(2.6, g * 0.5) : 4.6 + Math.min(4, g * 0.15);
    });
    afastarNomes(nos, W, H, mx, 28);

    const fios = arestas.map((ar) => {
      const sorte = sorteio(nos[ar.s].id + '>' + nos[ar.t].id);
      const ajuda = ar.tipo === 'ajuda';
      return { s: ar.s, t: ar.t, ajuda, ca: ajuda ? P.ajuda : nos[ar.s].cor, cb: ajuda ? P.ajuda : nos[ar.t].cor,
        w: ajuda ? 1.6 : 0.9, v: (0.04 + sorte() * 0.05) * (sorte() < 0.5 ? 1 : -1), t0: sorte(), luz: sorte() < 0.45 };
    });
    const ponto = (f, t) => [nos[f.s].x + (nos[f.t].x - nos[f.s].x) * t, nos[f.s].y + (nos[f.t].y - nos[f.s].y) * t];
    const tracar = (ctx, f, a) => {
      const A = nos[f.s];
      const B = nos[f.t];
      const gr = ctx.createLinearGradient(A.x, A.y, B.x, B.y);
      gr.addColorStop(0, rgba(f.ca, a));
      gr.addColorStop(1, rgba(f.cb, a));
      ctx.strokeStyle = gr;
      ctx.lineWidth = f.w;
      ctx.beginPath();
      ctx.moveTo(A.x, A.y);
      ctx.lineTo(B.x, B.y);
      ctx.stroke();
    };
    const desenharNo = (ctx, no, forte) => {
      const r = no.r * (forte ? 1.3 : 1);
      if (P.brilho) {
        const rb = r * 3.4;
        const rg = ctx.createRadialGradient(no.x, no.y, 0, no.x, no.y, rb);
        rg.addColorStop(0, rgba(no.cor, forte ? P.brilho * 2 : P.brilho));
        rg.addColorStop(1, rgba(no.cor, 0));
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.arc(no.x, no.y, rb, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = rgba(no.cor, 1);
      ctx.beginPath();
      ctx.arc(no.x, no.y, r, 0, Math.PI * 2);
      ctx.fill();
    };
    const rotular = (ctx, no, forte) => {
      const n = caixaDoNome(no, W);
      const pessoa = no.tipo === 'pessoa';
      ctx.font = `${pessoa && !forte ? 500 : 600} 11.5px ${FONTE_MAPA}`;
      ctx.textAlign = 'left';
      ctx.fillStyle = pessoa ? (forte ? tinta : tinta2) : rgba(no.cor, 1);
      ctx.fillText(n.txt, n.x, n.y);
    };

    // Camada parada (fundo transparente, para aparecer o vidro do cartão): fios, bolinhas e nomes.
    const fundo = document.createElement('canvas');
    fundo.width = cv.width;
    fundo.height = cv.height;
    const g0 = fundo.getContext('2d');
    g0.setTransform(dpr, 0, 0, dpr, 0, 0);
    fios.forEach((f) => tracar(g0, f, f.ajuda ? 0.75 : P.fio));
    nos.forEach((no) => desenharNo(g0, no, false));
    nos.forEach((no) => rotular(g0, no, false));

    const ctx = cv.getContext('2d');
    const parado = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const inicio = performance.now();
    const eu = { raf: 0 };
    let foco = -1;
    redeViva = eu;

    function quadro(agora) {
      if (redeViva !== eu || !cv.isConnected) return;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, cv.width, cv.height);
      const perto = foco >= 0 ? new Set([foco, ...vizinhos[foco]]) : null;
      ctx.globalAlpha = perto ? 0.16 : 1;
      ctx.drawImage(fundo, 0, 0);
      ctx.globalAlpha = 1;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (perto) {
        fios.forEach((f) => { if (f.s === foco || f.t === foco) tracar(ctx, f, 0.9); });
        perto.forEach((i) => desenharNo(ctx, nos[i], i === foco));
        perto.forEach((i) => rotular(ctx, nos[i], i === foco));
      }
      // Poucos pontos de luz correndo devagar pelos fios.
      const tempo = parado ? 0 : (agora - inicio) / 1000;
      ctx.fillStyle = rgba(P.luz, 0.85);
      fios.forEach((f) => {
        if (!f.luz || (perto && f.s !== foco && f.t !== foco)) return;
        let t = (f.t0 + f.v * tempo) % 1;
        if (t < 0) t += 1;
        const [x, y] = ponto(f, t);
        ctx.beginPath();
        ctx.arc(x, y, 1.1, 0, Math.PI * 2);
        ctx.fill();
      });
      if (!parado) eu.raf = requestAnimationFrame(quadro);
    }

    const acharNo = (ev) => {
      const r = cv.getBoundingClientRect();
      const x = ((ev.clientX - r.left) / r.width) * W;
      const y = ((ev.clientY - r.top) / r.height) * H;
      let melhor = -1;
      let dist = 18;
      nos.forEach((no, i) => {
        const d = Math.hypot(no.x - x, no.y - y);
        if (d < dist) { dist = d; melhor = i; }
      });
      return melhor;
    };
    cv.onpointermove = (ev) => {
      const i = acharNo(ev);
      cv.style.cursor = i >= 0 ? 'pointer' : 'default';
      if (i !== foco) { foco = i; if (parado) quadro(performance.now()); }
    };
    cv.onpointerleave = () => { foco = -1; if (parado) quadro(performance.now()); };
    cv.onclick = (ev) => {
      const i = acharNo(ev);
      if (i < 0) return;
      const no = nos[i];
      if (no.tipo === 'pessoa') abrirDetalhe(no.c.id);
      else { filtro.q = no.rot; filtro.arquivados = false; trocarAba('contatos'); }
    };
    eu.raf = requestAnimationFrame(quadro);
  }

  const duo = (a, b) => `<span class="duo"><span class="avatar sm q-${prioridade(a).q}">${esc(iniciais(a.nome))}</span><span class="avatar sm q-${prioridade(b).q}">${esc(iniciais(b.nome))}</span></span>`;
  const itemPar = (r) => `<li>${duo(r.a, r.b)}<div><b>${esc(r.a.nome)} e ${esc(r.b.nome)}</b><small>${esc(r.motivos.join(' · '))}</small></div>
    <button class="btn sm" type="button" data-action="promptApres" data-a="${esc(r.a.id)}" data-b="${esc(r.b.id)}">Pedir apresentação à IA</button></li>`;

  // Painel da tela Hoje. Todo número sai dos contatos e interações registrados.
  function telaHoje() {
    const lista = ativos();
    if (!lista.length) return telaVazia();
    const ord = ordenar(lista);
    const datas = [];
    lista.forEach((c) => c.interacoes.forEach((i) => { if (i.tipo !== 'sistema') datas.push(i.data); }));
    const conta = (d) => datas.filter((x) => x === d).length;
    const ult14 = Array.from({ length: 14 }, (_, k) => conta(somarDias(k - 13)));
    const semana = Array.from({ length: 7 }, (_, k) => { const d = somarDias(k - 6); return { d, n: conta(d) }; });
    const nSemana = semana.reduce((a, b) => a + b.n, 0);
    const maxSem = Math.max(1, ...semana.map((x) => x.n));
    const comFollow = ord.filter((x) => x.p.dias !== null);
    const emDia = comFollow.filter((x) => x.p.dias >= 0).length;
    const pctFollow = comFollow.length ? Math.round((emDia / comFollow.length) * 100) : 0;
    const fila = ord.filter((x) => x.p.q === 'agir' || x.p.q === 'rapido');
    const proximos = ord.filter((x) => x.p.dias !== null && x.p.dias >= 0).sort((a, b) => a.p.dias - b.p.dias).slice(0, 4);
    const total = lista.length;
    const pct = (n) => Math.round((n / total) * 100);
    const esfriando = ord.filter((x) => x.p.esfriando).length;
    const anivs = lista.filter((c) => c.aniversario).map((c) => ({ c, d: diasAteAniversario(c.aniversario) }))
      .filter((x) => x.d <= 30).sort((a, b) => a.d - b.d).slice(0, 4);
    const pares = todasConexoes(lista).filter((r) => r.ajuda).slice(0, 3);
    const agora = new Date();
    const hr = agora.getHours();
    const saud = hr < 5 ? 'Boa noite' : hr < 12 ? 'Bom dia' : hr < 18 ? 'Boa tarde' : 'Boa noite';
    const nivDono = perfil().aniversario && diasAteAniversario(perfil().aniversario) === 0;
    const dataLonga = agora.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
    const hora = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const status = (p) => {
      if (p.dias === null) return p.esfriando ? ['esfria', 'Esfriando'] : ['breve', 'Sem data'];
      if (p.dias < 0) return ['atrasado', `Atrasado ${-p.dias}d`];
      if (p.dias === 0) return ['hoje', 'Hoje'];
      if (p.dias === 1) return ['breve', 'Amanhã'];
      return ['breve', `Em ${p.dias} dias`];
    };
    const medidor = (rot, n) => `<div class="medidor"><span>${rot}</span><div><i style="width:${pct(n)}%"></i></div><b>${pct(n)}%</b></div>`;
    const atalho = (rot, attr, ic) => `<button class="atalho" type="button" ${attr}><i>${svgLinha(ICONES_ATALHO[ic])}</i>${rot}</button>`;
    const legenda = !comFollow.length ? 'Marque datas de retomada' : pctFollow >= 80 ? 'Ótimo ritmo' : pctFollow >= 50 ? 'Dá para melhorar' : 'Hora de colocar em dia';

    return `${DEFS}<section class="dash">
      <article class="gcard saud s7">
        <span class="pill">${hora}</span>
        <small>${esc(dataLonga.charAt(0).toUpperCase() + dataLonga.slice(1))}</small>
        <h2>${nivDono ? `Feliz aniversário${primeiroNome() ? `, ${esc(primeiroNome())}` : ''}!` : `${saud}${primeiroNome() ? `, ${esc(primeiroNome())}` : ''}`}</h2>
        <p>${plural(nSemana, 'interação registrada', 'interações registradas')} nos últimos 7 dias. ${fila.length ? `${plural(fila.length, 'pessoa pede', 'pessoas pedem')} sua atenção agora.` : 'Nada urgente agora.'}</p>
        ${nomeDono() ? '' : '<button class="btn sm" type="button" data-action="perfil" style="margin-top:12px">Criar seu perfil</button>'}
        <span class="spark-leg">Interações nos últimos 14 dias</span>
        ${sparkline(ult14)}
      </article>

      <article class="gcard s5">
        <div class="gc-h"><h2>Follow-ups em dia</h2><span class="pill">${comFollow.length} com data</span></div>
        <div class="anel">
          <div>
            <div class="num">${pctFollow}<small>%</small></div>
            <p class="leg">${legenda}</p>
            <div class="mini-n"><div><span>Em dia</span><b>${emDia}</b></div><div><span>Atrasados</span><b>${comFollow.length - emDia}</b></div></div>
          </div>
          ${anel(pctFollow)}
        </div>
      </article>

      <article class="gcard s7">
        <div class="gc-h"><h2>Sua fila de hoje</h2><span>${fila.length ? 'toque no círculo quando fizer' : ''}</span></div>
        ${fila.length ? `<ul class="tarefas">${fila.slice(0, 5).map((x) => {
          const [cls, txt] = status(x.p);
          return `<li class="q-${x.p.q}" data-action="abrir" data-id="${esc(x.c.id)}">
            <button class="ok" type="button" data-action="concluir" data-id="${esc(x.c.id)}" aria-label="Marcar como feito: ${esc(x.c.nome)}"></button>
            <div><b>${esc(x.c.nome)}</b><small>${esc(x.c.proximoPasso || x.p.motivos.slice(1).join(' · '))}</small></div>
            <span class="st ${cls}">${txt}</span></li>`;
        }).join('')}</ul>${fila.length > 5 ? '<button class="btn sm ghost" type="button" data-go="matriz">Ver todos na Prioridade</button>' : ''}`
          : '<p class="nada">Nada urgente agora. Bom momento para cuidar de quem está esfriando.</p>'}
      </article>

      <article class="gcard s5">
        <div class="gc-h"><h2>Atividade da semana</h2><span class="pill">${plural(nSemana, 'interação', 'interações')}</span></div>
        <div class="barras">${semana.map((x, k) => {
          const hoje = k === 6;
          const px = x.n ? Math.round(10 + (x.n / maxSem) * 110) : 6;
          const dia = hoje ? 'Hoje' : DIAS_SEM[parseISO(x.d).getDay()];
          return `<div class="barra${x.n ? '' : ' zero'}${hoje ? ' hoje' : ''}" title="${plural(x.n, 'interação', 'interações')} em ${fmtData(x.d)}">${x.n && x.n === maxSem ? `<em>${x.n}</em>` : ''}<i style="height:${px}px"></i><span>${dia}</span></div>`;
        }).join('')}</div>
      </article>

      <article class="gcard s5">
        <div class="gc-h"><h2>Próximos follow-ups</h2><button class="btn sm ghost" type="button" data-go="funil">Ver funil</button></div>
        ${proximos.length ? `<ul class="eventos">${proximos.map((x) => {
          const d = parseISO(followUpEfetivo(x.c));
          return `<li class="q-${x.p.q}" data-action="abrir" data-id="${esc(x.c.id)}"><div class="dt"><b>${pad(d.getDate())}</b><span>${MESES[d.getMonth()]}</span></div>
            <div><b class="nm">${esc(x.c.nome)}</b><small>${esc(x.c.proximoPasso || (x.p.pelaCadencia ? 'Retomar pela cadência' : 'Retomar a conversa'))}</small></div><i class="dot"></i></li>`;
        }).join('')}</ul>` : '<p class="nada">Nenhum follow-up marcado para os próximos dias.</p>'}
      </article>

      <article class="gcard s4 saude">
        <div class="gc-h"><h2>Saúde da rede</h2><span>${plural(total, 'contato', 'contatos')}</span></div>
        ${anel(pct(total - esfriando), 'quente', `<b>${pct(total - esfriando)}%</b><span>sem esfriar</span>`)}
        ${medidor('Com follow-up', lista.filter((c) => followUpEfetivo(c)).length)}
        ${medidor('Conversa recente', lista.filter((c) => -diasAte(ultimoContato(c)) <= 14).length)}
        ${medidor('Tipo definido', lista.filter((c) => aj.tipos.some((t) => t.id === c.tipo)).length)}
      </article>

      <article class="gcard s3">
        <div class="gc-h"><h2>Atalhos</h2></div>
        <div class="atalhos-g">
          ${atalho('Novo', 'data-open="novo"', 'novo')}
          ${atalho('Da IA', 'data-open="importar"', 'ia')}
          ${atalho('Funil', 'data-go="funil"', 'funil')}
          ${atalho('Conexões', 'data-go="conexoes"', 'conexoes')}
          ${atalho('Atividades', 'data-go="atividades"', 'atividades')}
          ${atalho('Backup', 'data-action="exportJSON"', 'backup')}
        </div>
      </article>

      <article class="gcard s7">
        <div class="gc-h"><h2>Apresentações que podem fazer sentido</h2><button class="btn sm ghost" type="button" data-go="conexoes">Ver a rede</button></div>
        ${pares.length ? `<ul class="pares">${pares.map(itemPar).join('')}</ul>`
          : '<p class="nada">Preencha o que cada pessoa precisa e oferece para o app sugerir pontes.</p>'}
      </article>

      <article class="gcard s5">
        <div class="gc-h"><h2>Aniversários</h2><span>próximos 30 dias</span></div>
        ${anivs.length ? `<ul class="eventos">${anivs.map((x) => `<li class="q-${prioridade(x.c).q}" data-action="abrir" data-id="${esc(x.c.id)}">
            <div class="dt"><b>${x.c.aniversario.slice(3)}</b><span>${MESES[Number(x.c.aniversario.slice(0, 2)) - 1]}</span></div>
            <div><b class="nm">${esc(x.c.nome)}</b><small>${x.d === 0 ? 'É hoje' : x.d === 1 ? 'Amanhã' : `Daqui a ${x.d} dias`}</small></div><i class="dot"></i></li>`).join('')}</ul>`
          : '<p class="nada">Nenhum aniversário nos próximos 30 dias.</p>'}
      </article>
    </section>`;
  }

  function telaFunil() {
    const lista = ativos();
    if (!lista.length) return telaVazia();
    const ord = ordenar(lista);
    const kcard = (x) => {
      const fu = followUpEfetivo(x.c);
      return `<article class="kcard q-${x.p.q}" draggable="true" data-action="abrir" data-id="${esc(x.c.id)}" tabindex="0">
        <div class="k-top"><span class="avatar sm">${esc(iniciais(x.c.nome))}</span>
          <div><b>${esc(x.c.nome)}</b><small>${esc(x.c.organizacao || x.c.evento)}</small></div></div>
        ${x.c.proximoPasso ? `<p>${esc(x.c.proximoPasso)}</p>` : ''}
        <div class="k-pe"><span class="badge q-${x.p.q}">${QUAD[x.p.q].nome}</span>${fu ? `<small>${fmtCurta(fu)}</small>` : ''}</div>
      </article>`;
    };
    return `<section class="regra"><p>Arraste um contato para outra coluna para mudar a situação. Cada mudança entra na linha do tempo da pessoa.</p></section>
      <section class="funil">${aj.etapas.map((e) => {
        const l = ord.filter((x) => etapaDe(x.c) === e);
        return `<div class="coluna" data-etapa="${esc(e)}"><div class="col-h"><h3>${esc(e)}</h3><b>${l.length}</b></div>
          ${l.map(kcard).join('') || '<p class="vazia">Arraste para cá</p>'}</div>`;
      }).join('')}</section>`;
  }

  function telaMatriz() {
    const ord = ordenar(ativos());
    const mini = (x) => `<button class="mini" type="button" data-action="abrir" data-id="${esc(x.c.id)}">
      <span class="avatar sm">${esc(iniciais(x.c.nome))}</span>
      <span><b>${esc(x.c.nome)}</b><small>${esc(x.p.motivos.slice(1).join(' · '))}</small></span></button>`;
    const caixa = (q) => {
      const l = ord.filter((x) => x.p.q === q);
      return `<div class="quad q-${q}"><div class="quad-h"><h3>${QUAD[q].nome}</h3><span>${QUAD[q].desc}</span><b>${l.length}</b></div>
        ${l.map(mini).join('') || '<p class="nada">Ninguém aqui.</p>'}</div>`;
    };
    return `<section class="regra">
        <p><b>Importante</b> quando o peso do tipo de relação mais o potencial chega a ${aj.limiteImportante}.
        <b>Urgente</b> quando o follow-up (marcado ou pela cadência) é em até ${aj.diasUrgente} dias, existe prazo externo sem conversa na última semana ou um contato importante está esfriando.</p>
        <button class="btn sm" type="button" data-go="ajustes">Mudar as regras</button>
      </section>
      <section class="matriz">${caixa('agir')}${caixa('agendar')}${caixa('rapido')}${caixa('depois')}</section>`;
  }

  function telaContatos() {
    const opts = (lista, atual, todos) => `<option value="">${todos}</option>` +
      lista.map(([v, l]) => `<option value="${esc(v)}"${v === atual ? ' selected' : ''}>${esc(l)}</option>`).join('');
    const nArq = contatos.filter((c) => c.arquivado).length;
    return `<section class="filtros">
        <input id="busca" type="search" placeholder="Buscar por nome, organização, evento ou tema" value="${esc(filtro.q)}" aria-label="Buscar contatos">
        <select id="fTipo" aria-label="Filtrar por tipo">${opts(aj.tipos.map((t) => [t.id, t.nome]), filtro.tipo, 'Todos os tipos')}</select>
        <select id="fEtapa" aria-label="Filtrar por situação">${opts(aj.etapas.map((e) => [e, e]), filtro.etapa, 'Todas as situações')}</select>
        <label class="check-inline"><input type="checkbox" id="fArq"${filtro.arquivados ? ' checked' : ''}> Arquivados (${nArq})</label>
      </section>
      <div id="lista">${linhas()}</div>`;
  }

  function linhas() {
    if (!contatos.length) return telaVazia();
    const q = chave(filtro.q);
    const base = filtro.arquivados ? contatos.filter((c) => c.arquivado) : ativos();
    const l = ordenar(base).filter(({ c }) =>
      (!filtro.tipo || c.tipo === filtro.tipo) &&
      (!filtro.etapa || c.etapa === filtro.etapa) &&
      (!q || chave([c.nome, c.cargo, c.organizacao, c.evento, c.tags.join(' '), c.notas].join(' ')).includes(q)));
    if (!l.length) return `<p class="nada">${filtro.arquivados ? 'Nenhum contato arquivado.' : 'Nenhum contato com esse filtro.'}</p>`;
    return `<div class="tabela"><div class="tr th"><span>Pessoa</span><span>Situação</span><span>Último contato</span><span>Follow-up</span><span>Prioridade</span></div>
      ${l.map(({ c, p }) => {
        const ult = ultimaInteracao(c);
        const fu = followUpEfetivo(c);
        return `<button class="tr q-${p.q}" type="button" data-action="abrir" data-id="${esc(c.id)}">
        <span class="pessoa"><span class="avatar sm">${esc(iniciais(c.nome))}</span><span><b>${esc(c.nome)}${c.arquivado ? '<span class="selo-arq">Arquivado</span>' : ''}</b><small>${esc(c.organizacao || c.evento)}</small></span></span>
        <span>${esc(c.etapa)}</span>
        <span>${ult ? `${esc(nomeInt(ult.tipo))}, ${esc(relativo(ult.data))}` : esc(relativo(ultimoContato(c)))}</span>
        <span>${fu ? fmtData(fu) + (p.pelaCadencia ? ' (cadência)' : '') : 'Sem data'}</span>
        <span><span class="badge q-${p.q}">${QUAD[p.q].nome}</span></span></button>`;
      }).join('')}</div>`;
  }

  function telaConexoes() {
    const lista = ativos();
    if (lista.length < 2) return telaVazia();
    const cx = todasConexoes(lista);
    const ajuda = cx.filter((r) => r.ajuda);
    const voce = perfilComoContato();
    const comVoce = voce ? lista.map((c) => relacao(voce, c)).filter((r) => r.pontos > 0)
      .sort((x, y) => Number(y.ajuda) - Number(x.ajuda) || y.pontos - x.pontos).slice(0, 5) : [];
    return `<section class="dash">
        <article class="gcard s12">
          <div class="gc-h"><h2>A rede que se forma</h2><span class="pill">${plural(lista.length, 'pessoa', 'pessoas')} · ${plural(cx.length, 'ligação', 'ligações')}</span></div>
          ${mapaRede(lista)}
        </article>
        <article class="gcard s12">
          <div class="gc-h"><h2>Quem combina com você</h2><button class="btn sm ghost" type="button" data-action="perfil">${voce ? 'Editar seu perfil' : 'Criar seu perfil'}</button></div>
          ${comVoce.length ? `<ul class="pares">${comVoce.map((r) => `<li><span class="avatar sm q-${prioridade(r.b).q}">${esc(iniciais(r.b.nome))}</span>
            <div><b>${esc(r.b.nome)}</b><small>${esc(r.motivos.join(' · '))}</small></div>
            <button class="btn sm" type="button" data-action="abrir" data-id="${esc(r.b.id)}">Abrir ficha</button></li>`).join('')}</ul>`
            : `<p class="nada">${voce ? 'Ninguém da sua rede tem temas, organização ou trocas em comum com o seu perfil ainda.' : 'Conte no seu perfil seus interesses, o que você oferece e o que está buscando. O app mostra aqui quem da sua rede combina com você.'}</p>`}
        </article>
        <article class="gcard s6">
          <div class="gc-h"><h2>Quem pode ajudar quem</h2></div>
          ${ajuda.length ? `<ul class="pares">${ajuda.slice(0, 5).map(itemPar).join('')}</ul>` : '<p class="nada">Preencha o que cada pessoa precisa e oferece para o app sugerir pontes.</p>'}
        </article>
        <article class="gcard s6">
          <div class="gc-h"><h2>Ligações mais fortes</h2><span>mais motivos em comum</span></div>
          ${cx.length ? `<ul class="pares">${cx.slice(0, 6).map(itemPar).join('')}</ul>` : '<p class="nada">Adicione temas aos contatos para o app encontrar ligações.</p>'}
        </article>
      </section>
      <p class="aviso">As sugestões seguem regras simples e visíveis: temas em comum, mesma organização, mesmo evento e o que uma pessoa precisa com o que a outra oferece. Nenhuma IA decide por você. Antes de apresentar duas pessoas, pergunte se as duas topam.</p>`;
  }

  function telaAtividades() {
    const lista = ativos();
    if (!lista.length) return telaVazia();
    const lim = filtroAt.dias ? somarDias(-Number(filtroAt.dias)) : '';
    const todas = [];
    lista.forEach((c) => c.interacoes.forEach((i, idx) => { if (i.tipo !== 'sistema') todas.push({ c, i, idx }); }));
    const l = todas.filter((x) => (!filtroAt.tipo || x.i.tipo === filtroAt.tipo) && (!lim || x.i.data >= lim))
      .sort((a, b) => b.i.data.localeCompare(a.i.data) || b.idx - a.idx);
    const periodo = filtroAt.dias ? `nos últimos ${filtroAt.dias} dias` : 'no total';
    const mensagens = l.filter((x) => ['whatsapp', 'email', 'linkedin'].includes(x.i.tipo)).length;
    const encontros = l.filter((x) => ['reuniao', 'cafe', 'evento', 'ligacao'].includes(x.i.tipo)).length;
    const opt = (v, t, atual) => `<option value="${esc(v)}"${v === atual ? ' selected' : ''}>${esc(t)}</option>`;
    let dia = '';
    const itens = l.map((x) => {
      const cab = x.i.data !== dia ? `<h3 class="dia">${fmtData(x.i.data)} <span>${relativo(x.i.data)}</span></h3>` : '';
      dia = x.i.data;
      return `${cab}<button class="feed-row ti-${x.i.tipo}" type="button" data-action="abrir" data-id="${esc(x.c.id)}">
        <span class="ico">${icone(x.i.tipo)}</span>
        <span class="f-c"><b>${esc(nomeInt(x.i.tipo))} · ${esc(x.c.nome)}</b><small>${esc(x.c.organizacao || x.c.evento)}</small><span class="f-t">${esc(x.i.texto)}</span></span>
      </button>`;
    }).join('');
    return `<section class="metrics">
        ${metrica(`Interações ${periodo}`, l.length)}
        ${metrica('Pessoas envolvidas', new Set(l.map((x) => x.c.id)).size)}
        ${metrica('Encontros e ligações', encontros)}
        ${metrica('Mensagens', mensagens)}
      </section>
      <section class="filtros f2">
        <select id="fAtTipo" aria-label="Filtrar por tipo de interação">${opt('', 'Todos os tipos de interação', filtroAt.tipo)}${CFG.tiposInteracao.map((t) => opt(t.id, t.nome, filtroAt.tipo)).join('')}</select>
        <select id="fAtDias" aria-label="Período">${[['7', 'Últimos 7 dias'], ['30', 'Últimos 30 dias'], ['90', 'Últimos 90 dias'], ['', 'Todo o histórico']].map(([v, t]) => opt(v, t, filtroAt.dias)).join('')}</select>
      </section>
      ${l.length ? `<section class="feed">${itens}</section>` : '<p class="nada">Nenhuma interação nesse período.</p>'}`;
  }

  function linhaTipo(t) {
    const pesos = [[1, '1 · baixo'], [2, '2 · médio'], [3, '3 · alto']];
    return `<div class="tipo-linha">
      <input name="tipoNome" value="${esc(t.nome)}" aria-label="Nome do tipo de relação">
      <select name="tipoPeso" aria-label="Peso">${pesos.map(([v, l]) => `<option value="${v}"${Number(t.peso) === v ? ' selected' : ''}>Peso ${l}</option>`).join('')}</select>
      <input type="hidden" name="tipoId" value="${esc(t.id)}">
      <button type="button" class="btn sm ghost" data-action="rmTipo">Remover</button>
    </div>`;
  }

  function blocoPerfil() {
    const p = perfil();
    const nome = nomeDono();
    const links = linksRapidos({ telefone: p.telefone, email: p.email, linkedin: p.linkedin, instagram: p.instagram });
    const site = p.site ? `<a class="chip" href="${esc(/^https?:\/\//i.test(p.site) ? p.site : 'https://' + p.site)}" target="_blank" rel="noopener">Site</a>` : '';
    return `<section class="bloco"><div class="bloco-h"><h2>Seu perfil</h2>
        <p>Quem é a pessoa dona deste app. Fica só neste navegador e deixa os pedidos para a IA com a sua cara.</p></div>
        <div class="painel perfil-resumo">
          ${avatarDono('sigla-g')}
          <div class="perfil-txt">
            <b>${nome ? esc(nome) : 'Seu perfil ainda está vazio'}</b>
            ${[p.cargo, p.organizacao].filter(Boolean).length ? `<small>${esc([p.cargo, p.organizacao].filter(Boolean).join(' · '))}</small>` : ''}
            ${p.frase ? `<p>${esc(p.frase)}</p>` : ''}
            ${interessesDono().length ? `<div class="temas">${interessesDono().map((t) => `<span class="chip">${esc(t)}</span>`).join('')}</div>` : ''}
            ${p.aniversario ? `<small>Aniversário: ${fmtAniv(p.aniversario)}</small>` : ''}
            ${links || site ? `<div class="row" style="margin-top:8px">${links}${site}</div>` : ''}
          </div>
          <button class="btn${nome ? '' : ' primary'}" type="button" data-action="perfil">${nome ? 'Editar perfil' : 'Criar perfil'}</button>
        </div>
      </section>`;
  }

  function telaAjustes() {
    const temExemplos = contatos.some((c) => c.tags.includes('exemplo'));
    return `${blocoPerfil()}<section class="bloco"><div class="bloco-h"><h2>A regra é sua</h2>
        <p>Defina quem pesa mais para você. Cada setor tem os próprios tipos de relação.</p></div>
        <div class="presets">${Object.entries(CFG.presets).map(([k, v]) =>
          `<button class="btn sm" type="button" data-action="preset" data-preset="${esc(k)}">${esc(v.nome)}</button>`).join('')}</div>
        <form id="formAjustes" class="painel">
          <h3>Tipos de relação e peso</h3>
          <div id="tipos">${aj.tipos.map(linhaTipo).join('')}</div>
          <button type="button" class="btn sm" data-action="addTipo">Adicionar tipo</button>
          <h3>Regras de prioridade</h3>
          <div class="grid3">
            <label class="campo"><span>Importante a partir de</span><input type="number" name="limiteImportante" min="1" max="6" value="${esc(aj.limiteImportante)}">
              <small>Peso do tipo + potencial (alto soma 1, baixo tira 1).</small></label>
            <label class="campo"><span>Urgente se o follow-up for em até</span><input type="number" name="diasUrgente" min="0" max="60" value="${esc(aj.diasUrgente)}">
              <small>Dias a partir de hoje.</small></label>
            <label class="campo"><span>Esfriando depois de</span><input type="number" name="diasEsfriando" min="1" max="365" value="${esc(aj.diasEsfriando)}">
              <small>Dias sem nenhuma interação. Quem tem cadência usa a própria cadência.</small></label>
          </div>
          <h3>Nome do app</h3>
          <div class="grid2">
            <label class="campo"><span>Como você quer chamar o seu CRM</span><input name="nomeApp" maxlength="40" value="${esc(aj.nomeApp)}"></label>
          </div>
          <div class="row" style="margin-top:18px">
            <button class="btn primary" type="submit">Salvar regras</button>
            <button class="btn ghost" type="button" data-action="restaurar">Voltar ao padrão</button>
          </div>
        </form>
      </section>
      <section class="bloco"><div class="bloco-h"><h2>Seus dados</h2>
        <p>Ficam só neste navegador. Baixe um backup para guardar ou levar para outro computador.</p></div>
        <div class="row">
          <button class="btn" type="button" data-action="exportJSON">Baixar backup</button>
          <button class="btn" type="button" data-action="exportCSV">Planilha de contatos</button>
          <button class="btn" type="button" data-action="exportAtividades">Planilha de interações</button>
          <label class="btn">Restaurar backup<input type="file" id="arquivoBackup" accept=".json,application/json" hidden></label>
          ${temExemplos ? '<button class="btn ghost" type="button" data-action="tirarExemplos">Remover exemplos</button>'
            : '<button class="btn ghost" type="button" data-action="exemplos">Carregar exemplos fictícios</button>'}
          <button class="btn danger" type="button" data-action="apagarTudo">Apagar tudo</button>
        </div>
      </section>
      <section class="bloco"><div class="bloco-h"><h2>Instalar no celular</h2>
        <p>No iPhone: abra o link no Safari, toque em Compartilhar e depois em "Adicionar à Tela de Início". No Android: abra no Chrome, toque nos três pontinhos e depois em "Instalar app" ou "Adicionar à tela inicial". O app ganha ícone próprio e abre como um aplicativo.</p></div>
      </section>`;
  }

  /* 6. Janelas --------------------------------------------------------- */

  const dlg = $('#dlg');
  function abrirJanela(html, foco, largo) {
    $('#dlgBody').innerHTML = html;
    dlg.classList.toggle('largo', Boolean(largo));
    if (!dlg.open) dlg.showModal();
    dlg.scrollTop = 0;
    const alvo = (foco && $(foco, dlg)) || $('.x', dlg);
    if (alvo) alvo.focus();
  }
  const fecharJanela = () => dlg.open && dlg.close();

  const campo = (name, rotulo, val, o = {}) => `<label class="campo"><span>${rotulo}${o.req ? ' <em>*</em>' : ''}</span>
    <input name="${name}" type="${o.type || 'text'}" value="${esc(val || '')}" placeholder="${esc(o.ph || '')}"${o.req ? ' required' : ''}></label>`;
  const area = (name, rotulo, val, ph = '') => `<label class="campo"><span>${rotulo}</span>
    <textarea name="${name}" rows="3" placeholder="${esc(ph)}">${esc(val || '')}</textarea></label>`;
  const escolha = (name, rotulo, lista, val) => `<label class="campo"><span>${rotulo}</span><select name="${name}">${lista
    .map(([v, l]) => `<option value="${esc(v)}"${String(v) === String(val) ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></label>`;
  const atalhosData = (alvo, limpar) => `<div class="atalhos">${[['Amanhã', 1], ['Em 3 dias', 3], ['Em 1 semana', 7], ['Em 2 semanas', 14], ['Em 1 mês', 30]]
    .map(([l, d]) => `<button type="button" class="chip" data-action="dataRapida" data-dias="${d}" data-alvo="${alvo}">${l}</button>`).join('')}
    ${limpar ? `<button type="button" class="chip" data-action="dataRapida" data-dias="" data-alvo="${alvo}">Sem data</button>` : ''}</div>`;
  const cabecalho = (rotulo, titulo) => `<header class="dlg-h"><div><span class="vol">${rotulo}</span><h2>${titulo}</h2></div>
    <button type="button" class="x" data-action="fechar" aria-label="Fechar">×</button></header>`;
  // Dia e mês do aniversário (o ano não importa). Guardado como "MM-DD".
  function seletorAniv(mmdd) {
    const [aMes, aDia] = (mmdd || '-').split('-');
    const dias = [['', 'Dia']].concat(Array.from({ length: 31 }, (_, i) => [String(i + 1), String(i + 1)]));
    const meses = [['', 'Mês']].concat(MESES_NOME.map((m, i) => [String(i + 1), m]));
    const opt = (lista, atual) => lista.map(([v, l]) => `<option value="${v}"${v !== '' && Number(v) === Number(atual) ? ' selected' : ''}>${l}</option>`).join('');
    return `<label class="campo"><span>Aniversário</span><span class="aniv"><select name="anivDia" aria-label="Dia do aniversário">${opt(dias, aDia)}</select><select name="anivMes" aria-label="Mês do aniversário">${opt(meses, aMes)}</select></span></label>`;
  }

  const linhaFoto = () => `<div class="foto-linha">${avatarDono('foto-perfil')}
      <div><div class="row">
        <label class="btn sm">${perfil().foto ? 'Trocar foto' : 'Escolher foto'}<input type="file" id="fotoPerfil" accept="image/*" hidden></label>
        ${perfil().foto ? '<button class="btn sm ghost" type="button" data-action="tirarFoto">Tirar foto</button>' : ''}
      </div><small>A foto aparece no alto da barra lateral e fica só neste navegador.</small></div></div>`;

  function janelaPerfil() {
    const p = perfil();
    return `<form id="formPerfil" novalidate>
      ${cabecalho('Seu perfil', nomeDono() ? esc(nomeDono()) : 'Quem é você?')}
      <div class="dlg-b">
        ${linhaFoto()}
        <p class="aviso" style="margin:0 0 14px">Fica só neste navegador. O app usa o seu perfil na saudação, nos pedidos prontos para a IA e para mostrar quem da sua rede combina com você.</p>
        <fieldset><legend>Quem é você</legend><div class="grid3">
          ${campo('nome', 'Nome', p.nome, { ph: 'Como você quer ser chamada ou chamado' })}
          ${campo('cargo', 'Cargo', p.cargo, { ph: 'Diretora de programas' })}
          ${campo('organizacao', 'Organização', p.organizacao, { ph: 'Instituto Horizonte' })}
        </div>
          ${campo('frase', 'Como você se apresenta em uma frase', p.frase, { ph: 'Conecto educação pública e tecnologia.' })}
        </fieldset>
        <fieldset><legend>Interesses e trocas</legend>
          ${campo('interesses', 'Temas e interesses (separe por vírgula)', p.interesses, { ph: 'educação, dados, inteligência artificial' })}
          <div class="grid2">
            ${area('oferece', 'O que você oferece para a sua rede', p.oferece, 'Mentoria em gestão de projetos')}
            ${area('precisa', 'O que você está buscando agora', p.precisa, 'Parceiros para um piloto em escolas')}
          </div>
        </fieldset>
        <fieldset><legend>Redes e contato</legend><div class="grid3">
          ${campo('instagram', 'Instagram', p.instagram ? '@' + p.instagram : '', { ph: '@usuario' })}
          ${campo('linkedin', 'LinkedIn', p.linkedin, { ph: 'linkedin.com/in/...' })}
          ${campo('email', 'E-mail', p.email, { type: 'email', ph: 'voce@organizacao.org' })}
          ${campo('telefone', 'WhatsApp', p.telefone, { type: 'tel', ph: '(11) 91234-5678' })}
          ${campo('site', 'Site', p.site, { ph: 'seusite.com.br' })}
          ${seletorAniv(p.aniversario)}
        </div></fieldset>
      </div>
      <footer class="dlg-f"><button type="submit" class="btn primary">Salvar perfil</button></footer>
    </form>`;
  }

  // Reduz a foto para 256 pixels (quadrada) antes de guardar no navegador.
  function lerFotoPerfil(arquivo) {
    if (!arquivo || !/^image\//.test(arquivo.type)) { toast('Escolha uma imagem JPG ou PNG.'); return; }
    const url = URL.createObjectURL(arquivo);
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      const lado = Math.min(w, h);
      const cv = document.createElement('canvas');
      cv.width = 256;
      cv.height = 256;
      // Em foto em pé, o rosto costuma ficar mais para cima.
      cv.getContext('2d').drawImage(img, (w - lado) / 2, h > w ? (h - lado) * 0.25 : 0, lado, lado, 0, 0, 256, 256);
      URL.revokeObjectURL(url);
      perfil().foto = cv.toDataURL('image/jpeg', 0.86);
      if (!salvarAjustes()) return;
      render();
      const linha = dlg.querySelector('.foto-linha');
      if (linha) linha.outerHTML = linhaFoto();
      toast('Foto salva. Ela fica só neste navegador.');
    };
    img.onerror = () => { URL.revokeObjectURL(url); toast('Não consegui abrir essa imagem. Tente um JPG ou PNG.'); };
    img.src = url;
  }

  function salvarPerfil(form) {
    const o = Object.fromEntries(new FormData(form));
    const t = (v) => String(v || '').trim();
    aj.perfil = {
      nome: t(o.nome), cargo: t(o.cargo), organizacao: t(o.organizacao), frase: t(o.frase),
      interesses: t(o.interesses), oferece: t(o.oferece), precisa: t(o.precisa),
      instagram: t(o.instagram).replace(/^@/, ''), linkedin: t(o.linkedin), email: t(o.email), telefone: t(o.telefone), site: t(o.site),
      aniversario: o.anivDia && o.anivMes ? `${pad(Number(o.anivMes))}-${pad(Number(o.anivDia))}` : '',
      foto: perfil().foto || ''
    };
    aj.seuNome = aj.perfil.nome;
    salvarAjustes();
    fecharJanela();
    render();
    toast('Perfil salvo.');
  }

  function fichaContato(c) {
    const novo = !c;
    c = c || { tipo: aj.tipos[0] ? aj.tipos[0].id : '', potencial: 'medio', etapa: aj.etapas[0], conheciEm: hojeISO(), tags: [], cadencia: 0 };
    const tipos = aj.tipos.map((t) => [t.id, t.nome]);
    if (c.tipo && !aj.tipos.some((t) => t.id === c.tipo)) tipos.push([c.tipo, 'Tipo antigo (fora das regras atuais)']);
    tipos.push(['', 'Sem tipo']);
    return `<form id="formContato" data-id="${esc(novo ? '' : c.id)}" novalidate>
      ${cabecalho(novo ? 'Novo contato' : 'Editar contato', novo ? 'Quem você conheceu?' : esc(c.nome))}
      <div class="dlg-b">
        <fieldset><legend>Quem é</legend><div class="grid3">
          ${campo('nome', 'Nome', c.nome, { req: true, ph: 'Carla Mendes' })}
          ${campo('cargo', 'Cargo', c.cargo, { ph: 'Diretora de programas' })}
          ${campo('organizacao', 'Organização', c.organizacao, { ph: 'Instituto Horizonte' })}
        </div></fieldset>
        <fieldset><legend>Como falar</legend><div class="grid3">
          ${campo('telefone', 'Telefone ou WhatsApp', c.telefone, { type: 'tel', ph: '(11) 91234-5678' })}
          ${campo('email', 'E-mail', c.email, { type: 'email', ph: 'nome@organizacao.org' })}
          ${campo('linkedin', 'LinkedIn', c.linkedin, { ph: 'linkedin.com/in/...' })}
        </div><div class="grid2" style="margin-top:12px">
          ${campo('instagram', 'Instagram', c.instagram ? '@' + c.instagram : '', { ph: '@usuario' })}
          ${escolha('canal', 'Canal preferido', CANAIS, c.canal || '')}
        </div></fieldset>
        <fieldset><legend>Onde se conheceram</legend><div class="grid2">
          ${campo('evento', 'Evento ou reunião', c.evento, { ph: 'Workshop IA na prática' })}
          ${campo('conheciEm', 'Data', c.conheciEm, { type: 'date' })}
        </div></fieldset>
        <fieldset><legend>Prioridade</legend><div class="grid3">
          ${escolha('tipo', 'Tipo de relação', tipos, c.tipo)}
          ${escolha('potencial', 'Potencial', [['alto', 'Alto'], ['medio', 'Médio'], ['baixo', 'Baixo']], c.potencial)}
          ${escolha('etapa', 'Situação', aj.etapas.map((e) => [e, e]), c.etapa)}
        </div>
        <label class="check"><input type="checkbox" name="prazoExterno"${c.prazoExterno ? ' checked' : ''}> Tem prazo externo (edital, orçamento, janela de decisão)</label>
        </fieldset>
        <fieldset><legend>Contexto</legend><div class="grid2">
          ${area('precisa', 'O que a pessoa precisa', c.precisa, 'Avaliar o impacto do programa')}
          ${area('oferece', 'O que a pessoa oferece ou eu posso oferecer', c.oferece, 'Um modelo de indicadores')}
        </div>
          ${campo('tags', 'Temas, habilidades e interesses (separe por vírgula)', (c.tags || []).join(', '), { ph: 'educação, avaliação, dados' })}
          ${area('notas', 'Anotações gerais', c.notas)}
        </fieldset>
        <fieldset><legend>Pessoal</legend><div class="grid2">
          ${seletorAniv(c.aniversario)}
          ${campo('familia', 'Família', c.familia, { ph: 'Casada, dois filhos' })}
          ${campo('gosta', 'Gosta de', c.gosta, { ph: 'Café coado, corrida' })}
          ${campo('naoGosta', 'Não gosta de', c.naoGosta, { ph: 'Reunião sem pauta' })}
        </div></fieldset>
        ${novo ? `<fieldset><legend>Primeira interação</legend>
          ${area('primeiraInt', 'O que conversaram (opcional, entra na linha do tempo)', '', 'Nos conhecemos no intervalo. Ela quer entender o piloto.')}
        </fieldset>` : ''}
        <fieldset><legend>Follow-up</legend><div class="grid3">
          ${campo('proximoPasso', 'Próximo passo', c.proximoPasso, { ph: 'Mandar a proposta do piloto' })}
          ${campo('followUp', 'Quando retomar', c.followUp, { type: 'date' })}
          ${escolha('cadencia', 'Cadência', CADENCIAS, c.cadencia || 0)}
        </div>${atalhosData('followUp')}
        <p class="aviso" style="margin:10px 0 0">Com cadência e sem data marcada, o app calcula sozinho: último contato mais o intervalo escolhido.</p></fieldset>
        <p class="erro" id="erroForm" role="alert"></p>
      </div>
      <footer class="dlg-f">
        ${novo ? '' : `<button type="button" class="btn ghost" data-action="abrir" data-id="${esc(c.id)}">Voltar</button>`}
        <button type="submit" class="btn primary">${novo ? 'Salvar contato' : 'Salvar alterações'}</button>
      </footer>
    </form>`;
  }

  function itemTempo(c, i, sintetico) {
    const sis = i.tipo === 'sistema';
    return `<li class="ti-${i.tipo}${sis ? ' sis' : ''}">
      <span class="ico">${icone(i.tipo)}</span>
      <div class="t-c">
        <div class="t-h"><b>${esc(sis ? i.texto : nomeInt(i.tipo))}</b><time>${fmtData(i.data)} · ${esc(relativo(i.data))}</time>
          ${sintetico ? '' : `<button type="button" class="lnk" data-action="rmInt" data-id="${esc(c.id)}" data-int="${esc(i.id)}">Excluir</button>`}</div>
        ${!sis && i.texto ? `<p>${esc(i.texto)}</p>` : ''}
      </div>
    </li>`;
  }

  function detalhe(c) {
    const p = prioridade(c);
    const linha = (rotulo, valor, html) => (valor ? `<dt>${rotulo}</dt><dd>${html || esc(valor)}</dd>` : '');
    const li = linkLinkedin(c.linkedin);
    const ig = linkInstagram(c.instagram);
    const tempo = linhaDoTempo(c);
    const nInt = tempo.filter((i) => i.tipo !== 'sistema').length;
    const inicio = { tipo: 'inicio', data: c.conheciEm || c.criadoEm, texto: '' };
    const txtInicio = `Primeiro contato${c.evento ? ` em ${c.evento}` : ''}`;
    const fu = followUpEfetivo(c);
    const dAniv = diasAteAniversario(c.aniversario);
    const temas = temasDe(c);
    const rel = c.arquivado ? [] : conexoesDe(c).slice(0, 4);
    return `<div class="det q-${p.q}">
      <header class="dlg-h"><div class="pessoa-h"><div class="avatar lg">${esc(iniciais(c.nome))}</div>
        <div><span class="badge q-${p.q}">${c.arquivado ? 'Arquivado' : QUAD[p.q].nome}</span><h2>${esc(c.nome)}</h2>
        <p class="meta">${esc([c.cargo, c.organizacao].filter(Boolean).join(' · '))}</p></div></div>
        <button type="button" class="x" data-action="fechar" aria-label="Fechar">×</button></header>
      <div class="det-grid">
        <aside class="det-lado">
          <p class="why big">Por que está aqui: ${esc(p.motivos.join(' · '))}.</p>
          <label class="campo"><span>Situação</span><select id="etapaDet" data-id="${esc(c.id)}">
            ${aj.etapas.map((e) => `<option${e === c.etapa ? ' selected' : ''}>${esc(e)}</option>`).join('')}</select></label>
          <div class="row acoes">${linksRapidos(c)}
            ${fu ? `<button class="chip" type="button" data-action="concluir" data-id="${esc(c.id)}">Follow-up feito</button>` : ''}
            ${fu ? `<button class="chip" type="button" data-action="ics" data-id="${esc(c.id)}">Pôr na agenda</button>` : ''}
            <button class="chip" type="button" data-action="promptFollow" data-id="${esc(c.id)}">Pedir mensagem à IA</button>
          </div>
          <dl class="dados">
            ${linha('Próximo passo', c.proximoPasso)}
            ${linha('Follow-up', fu ? `${fmtData(fu)} (${relativo(fu)})${p.pelaCadencia ? ', pela cadência' : ''}` : '')}
            ${linha('Último contato', `${fmtData(ultimoContato(c))} (${relativo(ultimoContato(c))})`)}
            ${linha('Cadência', c.cadencia ? nomeCadencia(c.cadencia) : '')}
            ${linha('Canal preferido', nomeCanal(c.canal))}
            ${linha('Tipo de relação', tipoDe(c).nome)}
            ${linha('Potencial', POT_NOME[c.potencial])}
            ${linha('Telefone', c.telefone)}
            ${linha('E-mail', c.email)}
            ${linha('LinkedIn', c.linkedin, li ? `<a href="${esc(li)}" target="_blank" rel="noopener">${esc(c.linkedin)}</a>` : '')}
            ${linha('Instagram', c.instagram, ig ? `<a href="${esc(ig)}" target="_blank" rel="noopener">@${esc(c.instagram)}</a>` : '')}
            ${linha('Aniversário', c.aniversario ? `${fmtAniv(c.aniversario)}${dAniv !== null && dAniv <= 30 ? (dAniv === 0 ? ', é hoje' : `, daqui a ${dAniv} dias`) : ''}` : '')}
            ${linha('Onde se conheceram', [c.evento, fmtData(c.conheciEm)].filter(Boolean).join(', '))}
            ${linha('Precisa', c.precisa)}
            ${linha('Oferece', c.oferece)}
            ${linha('Temas', temas.join(', '), `<span class="temas">${temas.map((t) => `<button class="chip" type="button" data-action="tag" data-tag="${esc(t)}">${esc(t)}</button>`).join('')}</span>`)}
            ${linha('Família', c.familia)}
            ${linha('Gosta de', c.gosta)}
            ${linha('Não gosta de', c.naoGosta)}
            ${linha('Prazo externo', c.prazoExterno ? 'Sim' : '')}
            ${linha('Anotações', c.notas)}
          </dl>
          <div class="row">
            <button class="btn sm" type="button" data-action="editar" data-id="${esc(c.id)}">Editar dados</button>
            <button class="btn sm" type="button" data-action="arquivar" data-id="${esc(c.id)}">${c.arquivado ? 'Desarquivar' : 'Arquivar'}</button>
            <button class="btn sm danger" type="button" data-action="excluir" data-id="${esc(c.id)}">Excluir</button>
          </div>
        </aside>
        <div class="det-fluxo">
          <section class="concluir" id="concluir">
            <h3>Registrar interação</h3>
            <div class="seg-int" role="group" aria-label="Tipo de interação">${CFG.tiposInteracao.map((t) =>
              `<button type="button" class="chip-int ti-${t.id}${t.id === tipoIntAtual ? ' on' : ''}" data-action="tipoInt" data-tipo="${t.id}" aria-pressed="${t.id === tipoIntAtual}">${icone(t.id)}${esc(t.nome)}</button>`).join('')}</div>
            <div class="grid-int">
              <textarea id="txtInteracao" rows="3" placeholder="O que aconteceu? O que ficou combinado?" aria-label="Resumo da interação"></textarea>
              <label class="campo"><span>Data</span><input id="dataInt" type="date" value="${hojeISO()}"></label>
            </div>
            <div class="grid2">
              <label class="campo"><span>Próximo passo</span><input id="novoPasso" value="${esc(c.proximoPasso)}" placeholder="Mandar a proposta"></label>
              <label class="campo"><span>Quando retomar</span><input id="novaData" type="date" value="${esc(c.followUp)}"></label>
            </div>
            ${atalhosData('novaData', true)}
            <p class="erro" id="erroReg" role="alert"></p>
            <button class="btn primary" type="button" data-action="registrar" data-id="${esc(c.id)}">Registrar na linha do tempo</button>
          </section>
          <div class="tempo-h"><h3>Linha do tempo</h3><span>${plural(nInt, 'interação', 'interações')}</span></div>
          <ol class="timeline">
            ${tempo.map((i) => itemTempo(c, i)).join('')}
            ${itemTempo(c, inicio, true).replace('<b>Primeiro contato</b>', `<b>${esc(txtInicio)}</b>`)}
          </ol>
          ${c.arquivado ? '' : `<div class="tempo-h"><h3>Conexões na sua rede</h3><span>${plural(rel.length, 'pessoa', 'pessoas')}</span></div>
          ${rel.length ? rel.map((r) => {
            const o = r.a.id === c.id ? r.b : r.a;
            return `<div class="rel"><button class="rel-p q-${prioridade(o).q}" type="button" data-action="abrir" data-id="${esc(o.id)}"><span class="avatar sm">${esc(iniciais(o.nome))}</span>${esc(o.nome)}</button>
              <button class="chip" type="button" data-action="promptApres" data-a="${esc(c.id)}" data-b="${esc(o.id)}">Pedir apresentação à IA</button>
              <small>${esc(r.motivos.join(' · '))}</small></div>`;
          }).join('') : '<p class="nada">Nenhuma conexão ainda. Adicione temas, o que a pessoa precisa e o que oferece.</p>'}`}
        </div>
      </div>
    </div>`;
  }

  function abrirDetalhe(id, destacar) {
    const c = achar(id);
    if (!c) return;
    abrirJanela(detalhe(c), null, true);
    if (destacar) {
      const box = $('#concluir');
      box.classList.add('pulse');
      box.scrollIntoView({ block: 'center' });
      $('#txtInteracao').focus();
    }
  }

  function janelaImportar() {
    return `${cabecalho('Trazer da IA', 'Da anotação bagunçada à ficha pronta')}
      <div class="dlg-b">
        <ol class="passos">
          <li><b>Copie o pedido</b> e cole na IA que você usa (ChatGPT, Claude, Gemini).<br>
            <button class="btn sm" type="button" data-action="copiarPromptImport">Copiar pedido</button></li>
          <li><b>Mande junto</b> sua anotação, o print do LinkedIn, a foto do cartão de visita ou o resumo de uma reunião.</li>
          <li><b>Confira</b> o que voltou. Se a IA completou algo que você não disse, apague.</li>
          <li><b>Cole aqui</b> a resposta e importe. Também aceita planilha CSV com cabeçalho.</li>
        </ol>
        <textarea id="txtImport" rows="9" placeholder='[{"nome": "Carla Mendes", "organizacao": "Instituto Horizonte", ...}]' aria-label="Resposta da IA"></textarea>
        <p class="erro" id="erroImport" role="alert"></p>
      </div>
      <footer class="dlg-f"><button class="btn primary" type="button" data-action="importar">Importar contatos</button></footer>`;
  }

  /* 7. Pedidos prontos para a IA -------------------------------------- */

  function promptImportar() {
    return `Você vai me ajudar a registrar contatos no meu CRM pessoal.

Vou te mandar anotações, prints de LinkedIn, fotos de cartões de visita ou resumos de reuniões. Para cada pessoa, devolva SOMENTE uma lista em JSON, sem nenhum texto antes ou depois, neste formato:

[
  {
    "nome": "",
    "cargo": "",
    "organizacao": "",
    "telefone": "",
    "email": "",
    "linkedin": "",
    "instagram": "",
    "canal": "",
    "evento": "",
    "conheciEm": "AAAA-MM-DD",
    "tipo": "",
    "potencial": "medio",
    "etapa": "${aj.etapas[0]}",
    "precisa": "",
    "oferece": "",
    "notas": "",
    "familia": "",
    "gosta": "",
    "naoGosta": "",
    "aniversario": "DD/MM",
    "cadencia": 0,
    "proximoPasso": "",
    "followUp": "AAAA-MM-DD",
    "prazoExterno": false,
    "tags": [],
    "interacoes": [
      { "data": "AAAA-MM-DD", "tipo": "reuniao", "texto": "" }
    ]
  }
]

Regras:
- Não invente nada. Se uma informação não aparece no material, deixe "".
- "tipo" deve ser exatamente um destes: ${aj.tipos.map((t) => t.nome).join(', ')}. Se não der para saber, deixe "".
- "potencial": alto, medio ou baixo. Se não der para saber, use medio.
- "etapa": uma destas: ${aj.etapas.join(', ')}.
- "canal" (canal preferido): um destes: ${CANAIS.filter(([k]) => k).map(([k]) => k).join(', ')}. Se não souber, deixe "".
- "cadencia": de quantos em quantos dias devo falar com a pessoa. Use 0, 7, 14, 30, 60, 90 ou 180. Se eu não disser, use 0.
- "tags": temas, habilidades e interesses da pessoa que aparecem no material.
- "interacoes": uma entrada para cada conversa que aparecer no material. O "tipo" de cada uma deve ser um destes: ${CFG.tiposInteracao.map((t) => t.id).join(', ')}. Se não houver conversa descrita, deixe a lista vazia.
- Hoje é ${fmtData(hojeISO())}. Converta datas relativas (como "semana que vem") para AAAA-MM-DD.
- "prazoExterno" é true só se eu mencionar edital, orçamento ou prazo de decisão.

Meu material:
`;
  }

  // Contexto de quem está pedindo, tirado do perfil. Vazio se o perfil não foi preenchido.
  function sobreMim() {
    const p = perfil();
    const linhas = [
      nomeDono() ? `Meu nome: ${nomeDono()}` : '',
      [p.cargo, p.organizacao].filter(Boolean).length ? `O que faço: ${[p.cargo, p.organizacao].filter(Boolean).join(', ')}` : '',
      p.frase ? `Como me apresento: ${p.frase}` : '',
      interessesDono().length ? `Meus interesses: ${interessesDono().join(', ')}` : ''
    ].filter(Boolean);
    return linhas.length ? `Sobre mim (quem vai enviar):\n${linhas.join('\n')}\n\n` : '';
  }

  function promptFollow(c) {
    const hist = linhaDoTempo(c).filter((i) => i.tipo !== 'sistema').slice(0, 6)
      .map((i) => `- ${fmtData(i.data)} (${nomeInt(i.tipo)}): ${i.texto}`).join('\n') || '- Ainda não registrei interações.';
    const canal = c.canal ? nomeCanal(c.canal) : linkWhats(c.telefone) ? 'WhatsApp' : c.email ? 'e-mail' : 'LinkedIn';
    const pessoal = [c.gosta ? `Gosta de: ${c.gosta}` : '', c.naoGosta ? `Não gosta de: ${c.naoGosta}` : ''].filter(Boolean).join('\n');
    return `Me ajude a escrever uma mensagem curta de follow-up.

${sobreMim()}Para quem:${[c.nome, c.cargo, c.organizacao].filter(Boolean).join(', ')}
Onde nos conhecemos: ${c.evento || 'não anotei'}${c.conheciEm ? ` (${fmtData(c.conheciEm)})` : ''}
Situação da relação: ${c.etapa}
O que a pessoa precisa: ${c.precisa || 'não anotei'}
O que eu posso oferecer ou a pessoa ofereceu: ${c.oferece || 'não anotei'}
${pessoal ? pessoal + '\n' : ''}Histórico de interações (mais recente primeiro):
${hist}
O que eu quero agora: ${c.proximoPasso || 'retomar a conversa'}
Canal: ${canal}

Regras:
- Use só as informações acima. Não invente fatos, números ou combinados.
- Tom cordial e direto, sem bajulação.
- Termine com um pedido claro e fácil de responder.
- Me dê 2 versões: uma bem curta e uma um pouco mais completa.`;
  }

  function promptApresentacao(a, b, motivos) {
    const perfil = (c) => [
      `Nome: ${c.nome}`,
      [c.cargo, c.organizacao].filter(Boolean).length ? `Quem é: ${[c.cargo, c.organizacao].filter(Boolean).join(', ')}` : '',
      c.precisa ? `O que precisa: ${c.precisa}` : '',
      c.oferece ? `O que oferece: ${c.oferece}` : '',
      temasDe(c).length ? `Temas: ${temasDe(c).join(', ')}` : ''
    ].filter(Boolean).join('\n');
    return `Quero apresentar duas pessoas da minha rede e preciso de ajuda com as mensagens.

${sobreMim()}Pessoa 1
${perfil(a)}

Pessoa 2
${perfil(b)}

Por que acho que faz sentido:
${motivos.map((m) => `- ${m}`).join('\n')}

Regras:
- Primeiro escreva uma mensagem curta para cada pessoa perguntando se ela topa ser apresentada. Ninguém é apresentado sem esse sim.
- Depois escreva a mensagem de apresentação, para quando as duas toparem.
- Use só as informações acima. Não invente fatos nem interesses.
- Tom cordial e direto.`;
  }

  async function copiar(texto, aviso) {
    try {
      await navigator.clipboard.writeText(texto);
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = texto;
      ta.style.cssText = 'position:fixed;opacity:0';
      (dlg.open ? dlg : document.body).appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch (_) { /* sem cópia automática */ }
      ta.remove();
    }
    toast(aviso);
  }

  /* 8. Importar e exportar -------------------------------------------- */

  function parseCSV(t) {
    const primeira = t.split('\n')[0];
    const sep = (primeira.match(/;/g) || []).length > (primeira.match(/,/g) || []).length ? ';' : ',';
    const rows = [];
    let row = [];
    let cur = '';
    let aspas = false;
    for (let i = 0; i < t.length; i++) {
      const ch = t[i];
      if (aspas) {
        if (ch === '"') { if (t[i + 1] === '"') { cur += '"'; i++; } else aspas = false; } else cur += ch;
      } else if (ch === '"') aspas = true;
      else if (ch === sep) { row.push(cur); cur = ''; }
      else if (ch === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
      else if (ch !== '\r') cur += ch;
    }
    row.push(cur);
    rows.push(row);
    return rows;
  }

  function lerImportacao(bruto) {
    let t = String(bruto || '').trim().replace(/^```[a-z]*\s*/i, '').replace(/```\s*$/, '').trim();
    if (!t) throw new Error('Cole aqui o que a IA devolveu.');
    if (!/^[[{]/.test(t) && t.includes('[') && t.lastIndexOf(']') > t.indexOf('[')) {
      t = t.slice(t.indexOf('['), t.lastIndexOf(']') + 1);
    }
    if (/^[[{]/.test(t)) {
      let d;
      try { d = JSON.parse(t); } catch (e) {
        throw new Error('Não consegui ler o JSON. Peça para a IA devolver só o JSON, sem texto em volta.');
      }
      if (d && Array.isArray(d.contatos)) d = d.contatos;
      return Array.isArray(d) ? d : [d];
    }
    const linhasCSV = parseCSV(t);
    if (linhasCSV.length < 2) throw new Error('Não reconheci o formato. Use o JSON do pedido ou uma planilha CSV com cabeçalho.');
    const cab = linhasCSV[0].map((h) => h.trim().replace(/^\ufeff/, ''));
    return linhasCSV.slice(1).filter((l) => l.some((x) => x.trim()))
      .map((l) => Object.fromEntries(cab.map((h, i) => [h, l[i] || ''])));
  }

  function baixar(nome, conteudo, tipo) {
    const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
    const a = document.createElement('a');
    a.href = url;
    a.download = nome;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const cel = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const planilha = (linhasCSV) => '\ufeff' + linhasCSV.map((r) => r.map(cel).join(',')).join('\r\n');

  function exportarCSV() {
    const cols = ['nome', 'cargo', 'organizacao', 'telefone', 'email', 'linkedin', 'instagram', 'canal', 'evento', 'conheciEm', 'tipo', 'potencial',
      'etapa', 'prazoExterno', 'precisa', 'oferece', 'tags', 'notas', 'familia', 'gosta', 'naoGosta', 'aniversario', 'cadencia',
      'proximoPasso', 'followUp', 'ultimoContato', 'totalInteracoes', 'ultimaInteracao', 'prioridade', 'arquivado'];
    const linhasCSV = ordenar(contatos).map(({ c, p }) => {
      const ult = ultimaInteracao(c);
      return cols.map((k) => ({
        tipo: tipoDe(c).nome,
        canal: nomeCanal(c.canal),
        prazoExterno: c.prazoExterno ? 'sim' : 'não',
        tags: c.tags.join('; '),
        aniversario: fmtAniv(c.aniversario),
        cadencia: c.cadencia || '',
        followUp: followUpEfetivo(c),
        ultimoContato: ultimoContato(c),
        totalInteracoes: c.interacoes.filter((i) => i.tipo !== 'sistema').length,
        ultimaInteracao: ult ? `${fmtData(ult.data)} (${nomeInt(ult.tipo)}): ${ult.texto}` : '',
        prioridade: QUAD[p.q].nome,
        arquivado: c.arquivado ? 'sim' : 'não'
      }[k] ?? c[k] ?? ''));
    });
    baixar(`minha-rede-contatos-${hojeISO()}.csv`, planilha([cols].concat(linhasCSV)), 'text/csv;charset=utf-8');
  }

  function exportarAtividades() {
    const linhasCSV = [];
    contatos.forEach((c) => linhaDoTempo(c).forEach((i) =>
      linhasCSV.push([i.data, nomeInt(i.tipo), c.nome, c.organizacao, c.etapa, i.texto])));
    linhasCSV.sort((a, b) => b[0].localeCompare(a[0]));
    baixar(`minha-rede-interacoes-${hojeISO()}.csv`,
      planilha([['data', 'tipo', 'pessoa', 'organizacao', 'situacaoAtual', 'resumo']].concat(linhasCSV)), 'text/csv;charset=utf-8');
  }

  function exportarICS(c) {
    const fu = followUpEfetivo(c);
    if (!fu) return;
    const e = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, (m) => '\\' + m);
    const ini = fu.replace(/-/g, '');
    const fim = somarDias(1, fu).replace(/-/g, '');
    const agora = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const txt = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Minha Rede//Personal CRM//PT', 'BEGIN:VEVENT',
      `UID:${c.id}-${ini}@minha-rede`, `DTSTAMP:${agora}`, `DTSTART;VALUE=DATE:${ini}`, `DTEND;VALUE=DATE:${fim}`,
      `SUMMARY:${e('Follow-up: ' + c.nome)}`, `DESCRIPTION:${e(c.proximoPasso)}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    baixar(`follow-up-${slug(c.nome)}.ics`, txt, 'text/calendar;charset=utf-8');
  }

  /* 9. Contatos de exemplo (todos fictícios) --------------------------- */

  function exemplos() {
    const d = (n) => somarDias(n);
    const aniv = (n) => { const x = parseISO(somarDias(n)); return `${pad(x.getMonth() + 1)}-${pad(x.getDate())}`; };
    return [
      { nome: 'Marina Costa', cargo: 'Coordenadora de avaliação', organizacao: 'Instituto Ponte', email: 'marina@example.org', canal: 'email',
        evento: 'Encontro de lideranças', conheciEm: d(-12), tipo: 'parceiro', potencial: 'alto', etapa: 'Em conversa',
        precisa: 'Entender o desenho do piloto', oferece: 'Modelo de indicadores de avaliação',
        proximoPasso: 'Pedir o modelo de indicadores', followUp: d(-3), cadencia: 14, aniversario: aniv(5),
        tags: ['avaliação', 'educação'], familia: 'Dois filhos', gosta: 'Café coado e dados bem organizados', naoGosta: 'Reunião sem pauta',
        interacoes: [
          { data: d(-12), tipo: 'evento', texto: 'Conversamos no intervalo do encontro. Ofereceu mandar o modelo de indicadores.' },
          { data: d(-9), tipo: 'email', texto: 'Mandei o resumo do piloto e pedi o modelo.' },
          { data: d(-5), tipo: 'whatsapp', texto: 'Disse que manda até sexta.' }] },
      { nome: 'João Nascimento', cargo: 'Articulação territorial', organizacao: 'Rede Cedro', email: 'joao@example.org', canal: 'whatsapp',
        evento: 'Reunião de planejamento', conheciEm: d(-8), tipo: 'decisor', potencial: 'medio', etapa: 'Em conversa',
        precisa: 'Critérios de seleção e indicadores para o piloto', oferece: 'Consultar duas escolas sobre interesse',
        proximoPasso: 'Confirmar se a consulta às escolas aconteceu', followUp: d(1), prazoExterno: true,
        tags: ['educação', 'território'], notas: 'O orçamento do próximo ano fecha no fim do mês.',
        interacoes: [
          { data: d(-8), tipo: 'reuniao', texto: 'Reunião de planejamento. Pode consultar duas escolas sobre interesse.' },
          { data: d(-2), tipo: 'ligacao', texto: 'Avisou que o orçamento do próximo ano fecha no fim do mês.' }] },
      { nome: 'Beatriz Lima', cargo: 'Analista de dados', organizacao: 'Observatório Serra', email: 'beatriz@example.org', canal: 'email',
        evento: 'Reunião de planejamento', conheciEm: d(-8), tipo: 'especialista', potencial: 'medio', etapa: 'Combinado',
        precisa: 'Automatizar a consolidação dos dados de Serra', tags: ['dados', 'avaliação'],
        proximoPasso: 'Receber a base de dados com data de corte', followUp: d(0),
        interacoes: [{ data: d(-8), tipo: 'reuniao', texto: 'Combinamos a base de Serra com data de corte.' }] },
      { nome: 'Camila Rocha', cargo: 'Gerente de parcerias', organizacao: 'Empresa Vértice', email: 'camila@example.org', canal: 'linkedin',
        evento: 'Feira de inovação', conheciEm: d(-60), tipo: 'cliente', potencial: 'alto', etapa: 'Em conversa', cadencia: 30,
        precisa: 'Projeto social de educação para patrocinar no próximo semestre', proximoPasso: 'Retomar a conversa sobre patrocínio',
        tags: ['patrocínio', 'educação'],
        interacoes: [
          { data: d(-60), tipo: 'evento', texto: 'Feira de inovação. Procura um projeto social para patrocinar.' },
          { data: d(-52), tipo: 'cafe', texto: 'Café para apresentar o programa. Gostou do recorte de educação.' },
          { data: d(-45), tipo: 'email', texto: 'Mandei a apresentação. Pediu para retomar depois do fechamento do trimestre.' }] },
      { nome: 'Luiza Prado', cargo: 'Diretora de programas', organizacao: 'Fundo Aurora', email: 'luiza@example.org', canal: 'email',
        evento: 'Workshop IA na prática', conheciEm: d(-2), tipo: 'financiador', potencial: 'alto', etapa: 'Novo contato',
        oferece: 'Edital anual para projetos de educação', proximoPasso: 'Mandar a apresentação do programa', followUp: d(10),
        aniversario: aniv(18), tags: ['financiamento', 'educação'],
        interacoes: [{ data: d(-2), tipo: 'evento', texto: 'Contou do edital anual para projetos de educação.' }] },
      { nome: 'Rafael Souza', cargo: 'Consultor de tecnologia', organizacao: 'Autônomo', evento: 'Workshop IA na prática', canal: 'whatsapp',
        conheciEm: d(-2), tipo: 'rede', potencial: 'baixo', etapa: 'Novo contato',
        oferece: 'Montar painéis de dados e automações', tags: ['tecnologia', 'dados'],
        proximoPasso: 'Mandar o artigo que comentei', followUp: d(20),
        interacoes: [{ data: d(-2), tipo: 'evento', texto: 'Comentei um artigo sobre IA na gestão.' }] }
    ].map((o) => normalizar(Object.assign(o, { tags: (o.tags || []).concat('exemplo'), criadoEm: o.conheciEm })));
  }

  /* 10. Eventos -------------------------------------------------------- */

  function toast(msg) {
    const t = $('#toast');
    (dlg && dlg.open ? dlg : document.body).appendChild(t);
    t.classList.remove('acao');
    t.textContent = msg;
    t.classList.add('on');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => t.classList.remove('on'), 3400);
  }

  // Aviso com um botão (por exemplo, "Desfazer").
  function toastAcao(msg, rotulo, fn) {
    const t = $('#toast');
    (dlg && dlg.open ? dlg : document.body).appendChild(t);
    t.innerHTML = `<span>${esc(msg)}</span><button type="button" class="toast-btn">${esc(rotulo)}</button>`;
    t.classList.add('on', 'acao');
    t.querySelector('.toast-btn').onclick = () => { t.classList.remove('on', 'acao'); fn(); };
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => t.classList.remove('on', 'acao'), 6500);
  }

  function salvarFicha(form) {
    const fd = new FormData(form);
    const o = Object.fromEntries(fd);
    o.prazoExterno = fd.has('prazoExterno');
    o.aniversario = o.anivDia && o.anivMes ? `${pad(Number(o.anivMes))}-${pad(Number(o.anivDia))}` : '';
    if (!String(o.nome || '').trim()) {
      $('#erroForm').textContent = 'Coloque pelo menos o nome da pessoa.';
      form.elements.nome.focus();
      return;
    }
    const id = form.dataset.id;
    let c;
    if (id) {
      const antigo = achar(id);
      c = normalizar(Object.assign({}, antigo, o, { id, interacoes: antigo.interacoes, criadoEm: antigo.criadoEm, arquivado: antigo.arquivado }));
      if (antigo.etapa !== c.etapa) registrarSistema(c, `Situação: ${antigo.etapa} → ${c.etapa}`);
      contatos = contatos.map((x) => (x.id === id ? c : x));
    } else {
      c = normalizar(o);
      const primeira = String(o.primeiraInt || '').trim();
      if (primeira) c.interacoes.push({ id: uid(), data: c.conheciEm || hojeISO(), tipo: 'evento', texto: primeira });
      contatos.unshift(c);
    }
    salvar();
    render();
    abrirDetalhe(c.id);
    toast('Contato salvo.');
  }

  function salvarFormAjustes(form) {
    const usados = new Set();
    const tipos = Array.from(form.querySelectorAll('.tipo-linha')).map((l) => {
      const nome = l.querySelector('[name=tipoNome]').value.trim();
      let id = l.querySelector('[name=tipoId]').value || slug(nome);
      while (usados.has(id)) id += '-2';
      usados.add(id);
      return { id, nome, peso: Number(l.querySelector('[name=tipoPeso]').value) || 1 };
    }).filter((t) => t.nome);
    if (!tipos.length) { toast('Deixe pelo menos um tipo de relação.'); return; }
    const num = (n, min, max, fb) => {
      const v = Math.round(Number(form.elements[n].value));
      return Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fb;
    };
    aj.nomeApp = form.elements.nomeApp.value.trim() || CFG.nomeApp;
    aj.tipos = tipos;
    aj.limiteImportante = num('limiteImportante', 1, 6, CFG.limiteImportante);
    aj.diasUrgente = num('diasUrgente', 0, 60, CFG.diasUrgente);
    aj.diasEsfriando = num('diasEsfriando', 1, 365, CFG.diasEsfriando);
    salvarAjustes();
    render();
    toast('Regras salvas. A prioridade foi recalculada.');
  }

  function restaurarBackup(arquivo) {
    const leitor = new FileReader();
    leitor.onload = () => {
      try {
        const d = JSON.parse(leitor.result);
        const lista = Array.isArray(d) ? d : d && d.contatos;
        if (!Array.isArray(lista)) throw new Error();
        if (!confirm(`Substituir seus ${contatos.length} contatos pelos ${lista.length} do backup?`)) return;
        if (d.ajustes) { aj = Object.assign(ajustesPadrao(), d.ajustes); salvarAjustes(); }
        contatos = lista.filter((x) => x && x.nome).map(carregar);
        salvar();
        render();
        toast('Backup restaurado.');
      } catch (e) {
        toast('Esse arquivo não parece um backup do Minha Rede.');
      }
    };
    leitor.readAsText(arquivo);
  }

  const TIPO_POR_CANAL = { whatsapp: 'whatsapp', email: 'email', linkedin: 'linkedin', telefone: 'ligacao' };

  const acoes = {
    abrir: (el) => abrirDetalhe(el.dataset.id),
    feito: (el) => abrirDetalhe(el.dataset.id, true),
    editar: (el) => abrirJanela(fichaContato(achar(el.dataset.id)), '[name=nome]'),
    fechar: fecharJanela,
    perfil: () => abrirJanela(janelaPerfil(), '[name=nome]', true),
    tirarFoto: () => {
      delete perfil().foto;
      salvarAjustes();
      render();
      const linha = dlg.querySelector('.foto-linha');
      if (linha) linha.outerHTML = linhaFoto();
      toast('Foto removida.');
    },
    tema: (el) => {
      const novo = el.dataset.tema || (document.documentElement.dataset.tema === 'claro' ? 'escuro' : 'claro');
      aplicarTema(novo);
      store.set(KEY_TEMA, novo);
      if (aba === 'conexoes') iniciarRede();
    },
    // Círculo da fila: marca o follow-up como feito, registra na linha do tempo e oferece desfazer.
    concluir: (el) => {
      const c = achar(el.dataset.id);
      if (!c) return;
      const antes = clone(c);
      const passo = c.proximoPasso;
      c.interacoes.push({ id: uid(), data: hojeISO(), tipo: TIPO_POR_CANAL[c.canal] || 'nota', texto: passo ? `Follow-up feito: ${passo}` : 'Contato retomado' });
      c.followUp = '';
      c.proximoPasso = '';
      salvar();
      el.classList.add('feito');
      const estavaAberto = dlg.open;
      setTimeout(() => { render(); if (estavaAberto) abrirDetalhe(c.id); }, estavaAberto ? 0 : 380);
      const volta = c.cadencia ? ` Pela cadência, volta em ${fmtData(proximoPelaCadencia(c))}.` : '';
      toastAcao(`Feito! ${c.nome} saiu da fila.${volta}`, 'Desfazer', () => {
        contatos = contatos.map((x) => (x.id === c.id ? carregar(antes) : x));
        salvar();
        render();
        if (dlg.open) abrirDetalhe(c.id);
        toast('Desfeito.');
      });
    },
    tag: (el) => {
      filtro.q = el.dataset.tag;
      filtro.arquivados = false;
      fecharJanela();
      trocarAba('contatos');
    },
    dataRapida: (el) => {
      const alvo = dlg.querySelector(`[name="${el.dataset.alvo}"], #${el.dataset.alvo}`);
      if (alvo) alvo.value = el.dataset.dias === '' ? '' : somarDias(Number(el.dataset.dias));
    },
    tipoInt: (el) => {
      tipoIntAtual = el.dataset.tipo;
      dlg.querySelectorAll('.chip-int').forEach((b) => {
        const on = b === el;
        b.classList.toggle('on', on);
        b.setAttribute('aria-pressed', on);
      });
    },
    registrar: (el) => {
      const c = achar(el.dataset.id);
      const txt = $('#txtInteracao').value.trim();
      if (!txt) { $('#erroReg').textContent = 'Escreva em uma linha o que aconteceu.'; $('#txtInteracao').focus(); return; }
      const data = parseISO($('#dataInt').value) ? $('#dataInt').value : hojeISO();
      const nova = $('#novaData').value;
      c.interacoes.push({ id: uid(), data, tipo: tipoIntAtual, texto: txt });
      c.proximoPasso = $('#novoPasso').value.trim();
      c.followUp = parseISO(nova) ? nova : '';
      let msg = 'Interação registrada na linha do tempo.';
      if (c.etapa === aj.etapas[0] && aj.etapas[1]) { mudarEtapa(c, aj.etapas[1]); msg += ` Situação agora é "${c.etapa}".`; }
      salvar();
      render();
      abrirDetalhe(c.id);
      toast(msg);
    },
    rmInt: (el) => {
      const c = achar(el.dataset.id);
      if (!confirm('Excluir esta interação da linha do tempo?')) return;
      c.interacoes = c.interacoes.filter((i) => i.id !== el.dataset.int);
      salvar();
      render();
      abrirDetalhe(c.id);
    },
    arquivar: (el) => {
      const c = achar(el.dataset.id);
      c.arquivado = !c.arquivado;
      registrarSistema(c, c.arquivado ? 'Contato arquivado' : 'Contato reativado');
      salvar();
      render();
      if (c.arquivado) { fecharJanela(); toast(`${c.nome} foi arquivado. Para ver de novo, marque "Arquivados" na aba Contatos.`); }
      else { abrirDetalhe(c.id); toast(`${c.nome} voltou para a sua rede.`); }
    },
    excluir: (el) => {
      const c = achar(el.dataset.id);
      if (!confirm(`Excluir ${c.nome} e todo o histórico? Não dá para desfazer. Se quiser só tirar da frente, use Arquivar.`)) return;
      contatos = contatos.filter((x) => x.id !== c.id);
      salvar();
      fecharJanela();
      render();
      toast('Contato excluído.');
    },
    ics: (el) => exportarICS(achar(el.dataset.id)),
    promptFollow: (el) => copiar(promptFollow(achar(el.dataset.id)), 'Pedido copiado. Cole na sua IA e revise antes de enviar.'),
    promptApres: (el) => {
      const a = achar(el.dataset.a);
      const b = achar(el.dataset.b);
      if (!a || !b) return;
      copiar(promptApresentacao(a, b, relacao(a, b).motivos), 'Pedido copiado. Confirme se as duas pessoas topam antes de apresentar.');
    },
    copiarPromptImport: () => copiar(promptImportar(), 'Pedido copiado. Cole na sua IA junto com a anotação.'),
    importar: () => {
      const erro = $('#erroImport');
      try {
        const lista = lerImportacao($('#txtImport').value).map(normalizar).filter((c) => c.nome);
        if (!lista.length) throw new Error('Não achei nenhum contato com nome.');
        contatos = lista.concat(contatos);
        salvar();
        fecharJanela();
        render();
        toast(lista.length === 1 ? '1 contato importado.' : `${lista.length} contatos importados.`);
      } catch (e) {
        erro.textContent = e.message;
      }
    },
    exemplos: () => {
      if (contatos.length && !confirm('Adicionar 6 contatos fictícios aos seus? Dá para remover depois em Ajustes.')) return;
      contatos = exemplos().concat(contatos);
      salvar();
      render();
      toast('Exemplos fictícios carregados.');
    },
    tirarExemplos: () => {
      contatos = contatos.filter((c) => !c.tags.includes('exemplo'));
      salvar();
      render();
      toast('Exemplos removidos.');
    },
    preset: (el) => {
      const p = CFG.presets[el.dataset.preset];
      aj.tipos = clone(p.tipos);
      salvarAjustes();
      render();
      toast(`Tipos de relação trocados para "${p.nome}".`);
    },
    addTipo: () => {
      $('#tipos').insertAdjacentHTML('beforeend', linhaTipo({ id: '', nome: '', peso: 2 }));
      $('#tipos .tipo-linha:last-child input').focus();
    },
    rmTipo: (el) => el.closest('.tipo-linha').remove(),
    restaurar: () => {
      if (!confirm('Voltar todas as regras para o padrão? Seu perfil continua como está.')) return;
      aj = Object.assign(ajustesPadrao(), { perfil: perfil(), seuNome: aj.seuNome });
      salvarAjustes();
      render();
      toast('Regras de volta ao padrão.');
    },
    exportJSON: () => baixar(`minha-rede-backup-${hojeISO()}.json`,
      JSON.stringify({ app: 'minha-rede', versao: 3, exportadoEm: new Date().toISOString(), ajustes: aj, contatos }, null, 2), 'application/json'),
    exportCSV: exportarCSV,
    exportAtividades: exportarAtividades,
    apagarTudo: () => {
      if (!confirm('Apagar todos os contatos deste navegador? Baixe um backup antes se quiser guardar.')) return;
      contatos = [];
      salvar();
      render();
      toast('Tudo apagado.');
    }
  };

  document.addEventListener('click', (e) => {
    const tab = e.target.closest('.tabs [data-view], [data-go]');
    if (tab) { trocarAba(tab.dataset.view || tab.dataset.go); return; }
    const abrir = e.target.closest('[data-open]');
    if (abrir) {
      if (abrir.dataset.open === 'novo') abrirJanela(fichaContato(null), '[name=nome]');
      else abrirJanela(janelaImportar(), '#txtImport');
      return;
    }
    if (e.target.closest('a[href]')) return;
    const el = e.target.closest('[data-action]');
    if (el && acoes[el.dataset.action]) acoes[el.dataset.action](el);
  });

  dlg.addEventListener('click', (e) => { if (e.target === dlg) fecharJanela(); });

  document.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.classList &&
      (e.target.classList.contains('card') || e.target.classList.contains('kcard'))) {
      e.preventDefault();
      abrirDetalhe(e.target.dataset.id);
    }
  });

  document.addEventListener('submit', (e) => {
    e.preventDefault();
    if (e.target.id === 'formContato') salvarFicha(e.target);
    if (e.target.id === 'formAjustes') salvarFormAjustes(e.target);
    if (e.target.id === 'formPerfil') salvarPerfil(e.target);
  });

  document.addEventListener('input', (e) => {
    if (e.target.id === 'busca') { filtro.q = e.target.value; $('#lista').innerHTML = linhas(); }
    if (e.target.name === 'nome') { const er = $('#erroForm'); if (er) er.textContent = ''; }
    if (e.target.id === 'txtInteracao') $('#erroReg').textContent = '';
    if (e.target.id === 'txtImport') $('#erroImport').textContent = '';
  });

  document.addEventListener('change', (e) => {
    const id = e.target.id;
    if (id === 'fTipo') { filtro.tipo = e.target.value; $('#lista').innerHTML = linhas(); }
    if (id === 'fEtapa') { filtro.etapa = e.target.value; $('#lista').innerHTML = linhas(); }
    if (id === 'fArq') { filtro.arquivados = e.target.checked; $('#lista').innerHTML = linhas(); }
    if (id === 'fAtTipo') { filtroAt.tipo = e.target.value; render(); }
    if (id === 'fAtDias') { filtroAt.dias = e.target.value; render(); }
    if (id === 'etapaDet') {
      const c = achar(e.target.dataset.id);
      if (mudarEtapa(c, e.target.value)) { salvar(); render(); abrirDetalhe(c.id); toast(`Situação agora é "${c.etapa}".`); }
    }
    if (id === 'arquivoBackup' && e.target.files[0]) { restaurarBackup(e.target.files[0]); e.target.value = ''; }
    if (id === 'fotoPerfil' && e.target.files[0]) { lerFotoPerfil(e.target.files[0]); e.target.value = ''; }
  });

  // Arrastar e soltar no Funil.
  document.addEventListener('dragstart', (e) => {
    const k = e.target.closest && e.target.closest('.kcard');
    if (!k) return;
    e.dataTransfer.setData('text/plain', k.dataset.id);
    e.dataTransfer.effectAllowed = 'move';
    k.classList.add('arrastando');
  });
  document.addEventListener('dragend', (e) => {
    const k = e.target.closest && e.target.closest('.kcard');
    if (k) k.classList.remove('arrastando');
    document.querySelectorAll('.coluna.alvo').forEach((c) => c.classList.remove('alvo'));
  });
  document.addEventListener('dragover', (e) => {
    const col = e.target.closest && e.target.closest('.coluna');
    if (!col) return;
    e.preventDefault();
    document.querySelectorAll('.coluna.alvo').forEach((c) => { if (c !== col) c.classList.remove('alvo'); });
    col.classList.add('alvo');
  });
  document.addEventListener('drop', (e) => {
    const col = e.target.closest && e.target.closest('.coluna');
    if (!col) return;
    e.preventDefault();
    const c = achar(e.dataTransfer.getData('text/plain'));
    if (mudarEtapa(c, col.dataset.etapa)) { salvar(); render(); toast(`${c.nome} agora está em "${c.etapa}".`); }
    else col.classList.remove('alvo');
  });

  // Atalhos pelo endereço: #exemplos carrega os fictícios numa base vazia; ?aba=funil abre uma aba;
  // ?contato=marina abre a ficha; ?tema=claro troca o tema.
  const params = new URLSearchParams(location.search);
  if (location.hash === '#exemplos' && !contatos.length) { contatos = exemplos(); salvar(); }
  if (ABAS.includes(params.get('aba'))) aba = params.get('aba');
  if (!ABAS.includes(aba)) aba = 'hoje';
  if (['claro', 'escuro'].includes(params.get('tema'))) aplicarTema(params.get('tema'));

  render();

  const alvoUrl = chave(params.get('contato') || '');
  const alvo = alvoUrl && contatos.find((c) => chave(c.nome).includes(alvoUrl));
  if (alvo) abrirDetalhe(alvo.id);

  // App instalável: guarda os arquivos para abrir mesmo sem internet (só funciona em https).
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
})();
