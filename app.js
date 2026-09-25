/*
  Minha Rede · CRM pessoal

  Tudo roda no navegador. Os contatos ficam no localStorage desta máquina.
  Nenhum dado é enviado para servidor.

  Mapa do arquivo:
    1. Utilidades (datas, texto, armazenamento, ícones)
    2. Dados e ajustes
    3. Prioridade (a regra da matriz)
    4. Interações e linha do tempo
    5. Telas (Hoje, Funil, Prioridade, Contatos, Atividades, Ajustes)
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
  const ABAS = ['hoje', 'funil', 'matriz', 'contatos', 'atividades', 'ajustes'];

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

  function ajustesPadrao() {
    return clone({
      nomeApp: CFG.nomeApp, codigoPais: CFG.codigoPais, tipos: CFG.tipos, potencial: CFG.potencial,
      limiteImportante: CFG.limiteImportante, diasUrgente: CFG.diasUrgente,
      diasEsfriando: CFG.diasEsfriando, etapas: CFG.etapas
    });
  }

  let aj = Object.assign(ajustesPadrao(), store.get(KEY_AJUSTES, {}) || {});
  let contatos = store.get(KEY_DADOS, []);
  contatos = (Array.isArray(contatos) ? contatos : []).filter((c) => c && c.nome).map(carregar);
  let aba = store.get(KEY_ABA, 'hoje');
  const filtro = { q: '', tipo: '', etapa: '' };
  const filtroAt = { tipo: '', dias: '30' };
  let tipoIntAtual = 'reuniao';

  const salvar = () => store.set(KEY_DADOS, contatos);
  const salvarAjustes = () => store.set(KEY_AJUSTES, aj);
  const achar = (id) => contatos.find((c) => c.id === id);

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

  // Transforma qualquer objeto (formulário, IA, planilha) num contato válido.
  function normalizar(o) {
    o = o || {};
    const t = (v) => (v == null ? '' : String(v)).trim();
    const data = (v) => (parseISO(t(v)) ? t(v) : '');
    const pot = chave(o.potencial);
    const tags = Array.isArray(o.tags) ? o.tags : t(o.tags).split(/[;,]/);
    return {
      id: t(o.id) || uid(),
      nome: t(o.nome),
      cargo: t(o.cargo),
      organizacao: t(o.organizacao || o.empresa || o.org),
      telefone: t(o.telefone || o.whatsapp || o.celular),
      email: t(o.email),
      linkedin: t(o.linkedin),
      evento: t(o.evento),
      conheciEm: data(o.conheciEm),
      tipo: acharTipo(t(o.tipo)),
      potencial: ['alto', 'medio', 'baixo'].includes(pot) ? pot : 'medio',
      etapa: acharEtapa(t(o.etapa)),
      prazoExterno: o.prazoExterno === true || /^(sim|true|1)$/i.test(t(o.prazoExterno)),
      precisa: t(o.precisa),
      oferece: t(o.oferece),
      notas: t(o.notas),
      proximoPasso: t(o.proximoPasso),
      followUp: data(o.followUp),
      tags: tags.map((x) => String(x).trim()).filter(Boolean),
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
    const dias = c.followUp ? diasAte(c.followUp) : null;
    const semContato = -diasAte(ultimoContato(c));
    const esfriando = !pausado && semContato > Number(aj.diasEsfriando);

    const motivos = [`${tipo.nome}, ${POT_NOME[c.potencial] || 'potencial médio'}`];
    motivos.push(dias === null ? 'sem data de follow-up' : textoDias(dias));
    if (c.prazoExterno && !pausado) motivos.push('tem prazo externo');
    if (esfriando) motivos.push(`sem conversa há ${semContato} dias`);
    if (pausado) motivos.push('relação pausada');

    const urgente = !pausado && (
      (dias !== null && dias <= Number(aj.diasUrgente)) ||
      c.prazoExterno ||
      (esfriando && importante)
    );
    const q = importante && urgente ? 'agir' : importante ? 'agendar' : urgente ? 'rapido' : 'depois';
    return { q, imp, importante, urgente, dias, esfriando, semContato, motivos };
  }

  function ordenar(lista) {
    return lista.map((c) => ({ c, p: prioridade(c) })).sort((a, b) =>
      QUAD[a.p.q].ordem - QUAD[b.p.q].ordem ||
      (a.p.dias ?? 9999) - (b.p.dias ?? 9999) ||
      b.p.imp - a.p.imp ||
      a.c.nome.localeCompare(b.c.nome, 'pt-BR'));
  }

  /* 4. Interações e linha do tempo ------------------------------------ */

  const nomeInt = (t) => (t === 'sistema' ? 'Atualização' : t === 'inicio' ? 'Primeiro contato'
    : (CFG.tiposInteracao.find((x) => x.id === t) || { nome: 'Anotação' }).nome);

  // Linha do tempo ordenada da mais recente para a mais antiga (no mesmo dia, a última registrada vem primeiro).
  function linhaDoTempo(c) {
    return c.interacoes.map((i, idx) => ({ i, idx }))
      .sort((a, b) => b.i.data.localeCompare(a.i.data) || b.idx - a.idx)
      .map((x) => x.i);
  }
  function ultimaInteracao(c) {
    return linhaDoTempo(c).find((i) => i.tipo !== 'sistema');
  }
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

  /* 5. Telas ----------------------------------------------------------- */

  function render() {
    document.title = `${aj.nomeApp} · CRM pessoal`;
    $('#appName').textContent = aj.nomeApp;
    document.querySelectorAll('.tabs [data-view]').forEach((b) => {
      if (b.dataset.view === aba) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    const fila = contatos.filter((c) => ['agir', 'rapido'].includes(prioridade(c).q)).length;
    $('#nFila').textContent = fila || '';
    const tela = { hoje: telaHoje, funil: telaFunil, matriz: telaMatriz, contatos: telaContatos, atividades: telaAtividades, ajustes: telaAjustes }[aba] || telaHoje;
    $('#view').innerHTML = tela();
  }

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
  function linksRapidos(c) {
    const out = [];
    const w = linkWhats(c.telefone);
    const l = linkLinkedin(c.linkedin);
    if (w) out.push(`<a class="chip" href="${esc(w)}" target="_blank" rel="noopener">WhatsApp</a>`);
    if (c.email) out.push(`<a class="chip" href="mailto:${esc(c.email)}">E-mail</a>`);
    if (l) out.push(`<a class="chip" href="${esc(l)}" target="_blank" rel="noopener">LinkedIn</a>`);
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
  const bloco = (titulo, sub, itens) => `<section class="bloco"><div class="bloco-h"><h2>${titulo}</h2><p>${sub}</p></div>
    <div class="lista">${itens.map((x) => cartao(x.c, x.p)).join('')}</div></section>`;

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

  function telaHoje() {
    if (!contatos.length) return telaVazia();
    const ord = ordenar(contatos);
    const fila = ord.filter((x) => x.p.q === 'agir' || x.p.q === 'rapido');
    const semana = ord.filter((x) => x.p.q === 'agendar' && x.p.dias !== null && x.p.dias <= 7);
    const esfriando = ord.filter((x) => x.p.esfriando && !fila.includes(x) && !semana.includes(x));
    return `<section class="metrics">
        ${metrica('Contatos', contatos.length)}
        ${metrica('Follow-ups atrasados', ord.filter((x) => x.p.dias !== null && x.p.dias < 0).length, 'hot')}
        ${metrica('Para hoje', ord.filter((x) => x.p.dias === 0).length)}
        ${metrica('Esfriando', ord.filter((x) => x.p.esfriando).length)}
      </section>
      <section class="bloco"><div class="bloco-h"><h2>Sua fila de hoje</h2><p>O que é urgente, com o que é importante na frente.</p></div>
        ${fila.length ? `<div class="lista">${fila.map((x) => cartao(x.c, x.p)).join('')}</div>`
          : '<p class="nada">Nada urgente agora. Bom momento para cuidar de quem está esfriando.</p>'}
      </section>
      ${semana.length ? bloco('Nesta semana', 'Contatos importantes com follow-up nos próximos 7 dias.', semana) : ''}
      ${esfriando.length ? bloco('Esfriando', `Sem conversa há mais de ${aj.diasEsfriando} dias.`, esfriando) : ''}`;
  }

  function telaFunil() {
    if (!contatos.length) return telaVazia();
    const ord = ordenar(contatos);
    const kcard = (x) => `<article class="kcard q-${x.p.q}" draggable="true" data-action="abrir" data-id="${esc(x.c.id)}" tabindex="0">
        <div class="k-top"><span class="avatar sm">${esc(iniciais(x.c.nome))}</span>
          <div><b>${esc(x.c.nome)}</b><small>${esc(x.c.organizacao || x.c.evento)}</small></div></div>
        ${x.c.proximoPasso ? `<p>${esc(x.c.proximoPasso)}</p>` : ''}
        <div class="k-pe"><span class="badge q-${x.p.q}">${QUAD[x.p.q].nome}</span>${x.c.followUp ? `<small>${fmtCurta(x.c.followUp)}</small>` : ''}</div>
      </article>`;
    return `<section class="regra"><p>Arraste um contato para outra coluna para mudar a situação. Cada mudança entra na linha do tempo da pessoa.</p></section>
      <section class="funil">${aj.etapas.map((e) => {
        const l = ord.filter((x) => etapaDe(x.c) === e);
        return `<div class="coluna" data-etapa="${esc(e)}"><div class="col-h"><h3>${esc(e)}</h3><b>${l.length}</b></div>
          ${l.map(kcard).join('') || '<p class="vazia">Arraste para cá</p>'}</div>`;
      }).join('')}</section>`;
  }

  function telaMatriz() {
    const ord = ordenar(contatos);
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
        <b>Urgente</b> quando o follow-up é em até ${aj.diasUrgente} dias, existe prazo externo ou um contato importante está há mais de ${aj.diasEsfriando} dias sem conversa.</p>
        <button class="btn sm" type="button" data-go="ajustes">Mudar as regras</button>
      </section>
      <section class="matriz">${caixa('agir')}${caixa('agendar')}${caixa('rapido')}${caixa('depois')}</section>`;
  }

  function telaContatos() {
    const opts = (lista, atual, todos) => `<option value="">${todos}</option>` +
      lista.map(([v, l]) => `<option value="${esc(v)}"${v === atual ? ' selected' : ''}>${esc(l)}</option>`).join('');
    return `<section class="filtros">
        <input id="busca" type="search" placeholder="Buscar por nome, organização, evento ou tag" value="${esc(filtro.q)}" aria-label="Buscar contatos">
        <select id="fTipo" aria-label="Filtrar por tipo">${opts(aj.tipos.map((t) => [t.id, t.nome]), filtro.tipo, 'Todos os tipos')}</select>
        <select id="fEtapa" aria-label="Filtrar por situação">${opts(aj.etapas.map((e) => [e, e]), filtro.etapa, 'Todas as situações')}</select>
      </section>
      <div id="lista">${linhas()}</div>`;
  }

  function linhas() {
    if (!contatos.length) return telaVazia();
    const q = chave(filtro.q);
    const l = ordenar(contatos).filter(({ c }) =>
      (!filtro.tipo || c.tipo === filtro.tipo) &&
      (!filtro.etapa || c.etapa === filtro.etapa) &&
      (!q || chave([c.nome, c.cargo, c.organizacao, c.evento, c.tags.join(' '), c.notas].join(' ')).includes(q)));
    if (!l.length) return '<p class="nada">Nenhum contato com esse filtro.</p>';
    return `<div class="tabela"><div class="tr th"><span>Pessoa</span><span>Situação</span><span>Última interação</span><span>Follow-up</span><span>Prioridade</span></div>
      ${l.map(({ c, p }) => {
        const ult = ultimaInteracao(c);
        return `<button class="tr q-${p.q}" type="button" data-action="abrir" data-id="${esc(c.id)}">
        <span class="pessoa"><span class="avatar sm">${esc(iniciais(c.nome))}</span><span><b>${esc(c.nome)}</b><small>${esc(c.organizacao || c.evento)}</small></span></span>
        <span>${esc(c.etapa)}</span>
        <span>${ult ? `${esc(nomeInt(ult.tipo))}, ${esc(relativo(ult.data))}` : 'Nenhuma'}</span>
        <span>${c.followUp ? fmtData(c.followUp) : 'Sem data'}</span>
        <span><span class="badge q-${p.q}">${QUAD[p.q].nome}</span></span></button>`;
      }).join('')}</div>`;
  }

  function telaAtividades() {
    if (!contatos.length) return telaVazia();
    const lim = filtroAt.dias ? somarDias(-Number(filtroAt.dias)) : '';
    const todas = [];
    contatos.forEach((c) => c.interacoes.forEach((i, idx) => { if (i.tipo !== 'sistema') todas.push({ c, i, idx }); }));
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

  function telaAjustes() {
    const temExemplos = contatos.some((c) => c.tags.includes('exemplo'));
    return `<section class="bloco"><div class="bloco-h"><h2>A regra é sua</h2>
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
              <small>Dias sem nenhuma interação registrada.</small></label>
          </div>
          <h3>Nome do app</h3>
          <label class="campo"><span>Como você quer chamar o seu CRM</span><input name="nomeApp" maxlength="40" value="${esc(aj.nomeApp)}"></label>
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
      </section>`;
  }

  /* 6. Janelas --------------------------------------------------------- */

  const dlg = $('#dlg');
  function abrirJanela(html, foco, largo) {
    $('#dlgBody').innerHTML = html;
    dlg.classList.toggle('largo', !!largo);
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
  const atalhosData = (alvo, limpar) => `<div class="atalhos">${[['Amanhã', 1], ['Em 3 dias', 3], ['Em 1 semana', 7], ['Em 2 semanas', 14], ['Em 1 mês', 30]]
    .map(([l, d]) => `<button type="button" class="chip" data-action="dataRapida" data-dias="${d}" data-alvo="${alvo}">${l}</button>`).join('')}
    ${limpar ? `<button type="button" class="chip" data-action="dataRapida" data-dias="" data-alvo="${alvo}">Sem data</button>` : ''}</div>`;
  const cabecalho = (rotulo, titulo) => `<header class="dlg-h"><div><span class="vol">${rotulo}</span><h2>${titulo}</h2></div>
    <button type="button" class="x" data-action="fechar" aria-label="Fechar">×</button></header>`;

  function fichaContato(c) {
    const novo = !c;
    c = c || { tipo: aj.tipos[0] ? aj.tipos[0].id : '', potencial: 'medio', etapa: aj.etapas[0], conheciEm: hojeISO(), tags: [] };
    const opt = (lista, val) => lista.map(([v, l]) => `<option value="${esc(v)}"${v === val ? ' selected' : ''}>${esc(l)}</option>`).join('');
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
        </div></fieldset>
        <fieldset><legend>Onde se conheceram</legend><div class="grid2">
          ${campo('evento', 'Evento ou reunião', c.evento, { ph: 'Workshop IA na prática' })}
          ${campo('conheciEm', 'Data', c.conheciEm, { type: 'date' })}
        </div></fieldset>
        <fieldset><legend>Prioridade</legend><div class="grid3">
          <label class="campo"><span>Tipo de relação</span><select name="tipo">${opt(tipos, c.tipo)}</select></label>
          <label class="campo"><span>Potencial</span><select name="potencial">${opt([['alto', 'Alto'], ['medio', 'Médio'], ['baixo', 'Baixo']], c.potencial)}</select></label>
          <label class="campo"><span>Situação</span><select name="etapa">${opt(aj.etapas.map((e) => [e, e]), c.etapa)}</select></label>
        </div>
        <label class="check"><input type="checkbox" name="prazoExterno"${c.prazoExterno ? ' checked' : ''}> Tem prazo externo (edital, orçamento, janela de decisão)</label>
        </fieldset>
        <fieldset><legend>Contexto</legend><div class="grid2">
          ${area('precisa', 'O que a pessoa precisa', c.precisa, 'Avaliar o impacto do programa')}
          ${area('oferece', 'O que a pessoa oferece ou eu posso oferecer', c.oferece, 'Um modelo de indicadores')}
        </div>
          ${area('notas', 'Anotações gerais', c.notas)}
          ${campo('tags', 'Tags (separadas por vírgula)', (c.tags || []).join(', '), { ph: 'educação, avaliação, SP' })}
        </fieldset>
        ${novo ? `<fieldset><legend>Primeira interação</legend>
          ${area('primeiraInt', 'O que conversaram (opcional, entra na linha do tempo)', '', 'Nos conhecemos no intervalo. Ela quer entender o piloto.')}
        </fieldset>` : ''}
        <fieldset><legend>Follow-up</legend><div class="grid2">
          ${campo('proximoPasso', 'Próximo passo', c.proximoPasso, { ph: 'Mandar a proposta do piloto' })}
          ${campo('followUp', 'Quando retomar', c.followUp, { type: 'date' })}
        </div>${atalhosData('followUp')}</fieldset>
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
    const tempo = linhaDoTempo(c);
    const nInt = tempo.filter((i) => i.tipo !== 'sistema').length;
    const inicio = { tipo: 'inicio', data: c.conheciEm || c.criadoEm, texto: '' };
    const txtInicio = `Primeiro contato${c.evento ? ` em ${c.evento}` : ''}`;
    return `<div class="det q-${p.q}">
      <header class="dlg-h"><div class="pessoa-h"><div class="avatar lg">${esc(iniciais(c.nome))}</div>
        <div><span class="badge q-${p.q}">${QUAD[p.q].nome}</span><h2>${esc(c.nome)}</h2>
        <p class="meta">${esc([c.cargo, c.organizacao].filter(Boolean).join(' · '))}</p></div></div>
        <button type="button" class="x" data-action="fechar" aria-label="Fechar">×</button></header>
      <div class="det-grid">
        <aside class="det-lado">
          <p class="why big">Por que está aqui: ${esc(p.motivos.join(' · '))}.</p>
          <label class="campo"><span>Situação</span><select id="etapaDet" data-id="${esc(c.id)}">
            ${aj.etapas.map((e) => `<option${e === c.etapa ? ' selected' : ''}>${esc(e)}</option>`).join('')}</select></label>
          <div class="row acoes">${linksRapidos(c)}
            ${c.followUp ? `<button class="chip" type="button" data-action="ics" data-id="${esc(c.id)}">Pôr na agenda</button>` : ''}
            <button class="chip" type="button" data-action="promptFollow" data-id="${esc(c.id)}">Pedir mensagem à IA</button>
          </div>
          <dl class="dados">
            ${linha('Próximo passo', c.proximoPasso)}
            ${linha('Follow-up', c.followUp ? `${fmtData(c.followUp)} (${relativo(c.followUp)})` : '')}
            ${linha('Tipo de relação', tipoDe(c).nome)}
            ${linha('Potencial', POT_NOME[c.potencial])}
            ${linha('Telefone', c.telefone)}
            ${linha('E-mail', c.email)}
            ${linha('LinkedIn', c.linkedin, li ? `<a href="${esc(li)}" target="_blank" rel="noopener">${esc(c.linkedin)}</a>` : '')}
            ${linha('Onde se conheceram', [c.evento, fmtData(c.conheciEm)].filter(Boolean).join(', '))}
            ${linha('Precisa', c.precisa)}
            ${linha('Oferece', c.oferece)}
            ${linha('Prazo externo', c.prazoExterno ? 'Sim' : '')}
            ${linha('Anotações', c.notas)}
            ${linha('Tags', c.tags.join(', '))}
          </dl>
          <div class="row">
            <button class="btn sm" type="button" data-action="editar" data-id="${esc(c.id)}">Editar dados</button>
            <button class="btn sm danger" type="button" data-action="excluir" data-id="${esc(c.id)}">Excluir contato</button>
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
          <div class="tempo-h"><h3>Linha do tempo</h3><span>${nInt} ${nInt === 1 ? 'interação' : 'interações'}</span></div>
          <ol class="timeline">
            ${tempo.map((i) => itemTempo(c, i)).join('')}
            ${itemTempo(c, Object.assign(inicio, { tipo: 'inicio' }), true).replace('<b>Primeiro contato</b>', `<b>${esc(txtInicio)}</b>`)}
          </ol>
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
    "evento": "",
    "conheciEm": "AAAA-MM-DD",
    "tipo": "",
    "potencial": "medio",
    "etapa": "${aj.etapas[0]}",
    "precisa": "",
    "oferece": "",
    "notas": "",
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
- "interacoes": uma entrada para cada conversa que aparecer no material. O "tipo" de cada uma deve ser um destes: ${CFG.tiposInteracao.map((t) => t.id).join(', ')}. Se não houver conversa descrita, deixe a lista vazia.
- Hoje é ${fmtData(hojeISO())}. Converta datas relativas (como "semana que vem") para AAAA-MM-DD.
- "prazoExterno" é true só se eu mencionar edital, orçamento ou prazo de decisão.

Meu material:
`;
  }

  function promptFollow(c) {
    const hist = linhaDoTempo(c).filter((i) => i.tipo !== 'sistema').slice(0, 6)
      .map((i) => `- ${fmtData(i.data)} (${nomeInt(i.tipo)}): ${i.texto}`).join('\n') || '- Ainda não registrei interações.';
    const canal = linkWhats(c.telefone) ? 'WhatsApp' : c.email ? 'e-mail' : 'LinkedIn';
    return `Me ajude a escrever uma mensagem curta de follow-up.

Para quem: ${[c.nome, c.cargo, c.organizacao].filter(Boolean).join(', ')}
Onde nos conhecemos: ${c.evento || 'não anotei'}${c.conheciEm ? ` (${fmtData(c.conheciEm)})` : ''}
Situação da relação: ${c.etapa}
O que a pessoa precisa: ${c.precisa || 'não anotei'}
O que eu posso oferecer ou a pessoa ofereceu: ${c.oferece || 'não anotei'}
Histórico de interações (mais recente primeiro):
${hist}
O que eu quero agora: ${c.proximoPasso || 'retomar a conversa'}
Canal: ${canal}

Regras:
- Use só as informações acima. Não invente fatos, números ou combinados.
- Tom cordial e direto, sem bajulação.
- Termine com um pedido claro e fácil de responder.
- Me dê 2 versões: uma bem curta e uma um pouco mais completa.`;
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
    let row = [], cur = '', aspas = false;
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
    const cols = ['nome', 'cargo', 'organizacao', 'telefone', 'email', 'linkedin', 'evento', 'conheciEm', 'tipo', 'potencial',
      'etapa', 'prazoExterno', 'precisa', 'oferece', 'notas', 'proximoPasso', 'followUp', 'tags', 'totalInteracoes', 'ultimaInteracao', 'prioridade'];
    const linhasCSV = ordenar(contatos).map(({ c, p }) => {
      const ult = ultimaInteracao(c);
      return cols.map((k) => ({
        tipo: tipoDe(c).nome,
        prazoExterno: c.prazoExterno ? 'sim' : 'não',
        tags: c.tags.join('; '),
        totalInteracoes: c.interacoes.filter((i) => i.tipo !== 'sistema').length,
        ultimaInteracao: ult ? `${fmtData(ult.data)} (${nomeInt(ult.tipo)}): ${ult.texto}` : '',
        prioridade: QUAD[p.q].nome
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
    const e = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, (m) => '\\' + m);
    const ini = c.followUp.replace(/-/g, '');
    const fim = somarDias(1, c.followUp).replace(/-/g, '');
    const agora = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const txt = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Minha Rede//CRM pessoal//PT', 'BEGIN:VEVENT',
      `UID:${c.id}-${ini}@minha-rede`, `DTSTAMP:${agora}`, `DTSTART;VALUE=DATE:${ini}`, `DTEND;VALUE=DATE:${fim}`,
      `SUMMARY:${e('Follow-up: ' + c.nome)}`, `DESCRIPTION:${e(c.proximoPasso)}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    baixar(`follow-up-${slug(c.nome)}.ics`, txt, 'text/calendar;charset=utf-8');
  }

  /* 9. Contatos de exemplo (todos fictícios) --------------------------- */

  function exemplos() {
    const d = (n) => somarDias(n);
    return [
      { nome: 'Marina Costa', cargo: 'Coordenadora de avaliação', organizacao: 'Instituto Ponte', email: 'marina@example.org',
        evento: 'Encontro de lideranças', conheciEm: d(-12), tipo: 'parceiro', potencial: 'alto', etapa: 'Em conversa',
        precisa: 'Entender o desenho do piloto', oferece: 'Modelo de indicadores de avaliação',
        proximoPasso: 'Pedir o modelo de indicadores', followUp: d(-3),
        interacoes: [
          { data: d(-12), tipo: 'evento', texto: 'Conversamos no intervalo do encontro. Ofereceu mandar o modelo de indicadores.' },
          { data: d(-9), tipo: 'email', texto: 'Mandei o resumo do piloto e pedi o modelo.' },
          { data: d(-5), tipo: 'whatsapp', texto: 'Disse que manda até sexta.' }] },
      { nome: 'João Nascimento', cargo: 'Articulação territorial', organizacao: 'Rede Cedro', email: 'joao@example.org',
        evento: 'Reunião de planejamento', conheciEm: d(-8), tipo: 'decisor', potencial: 'medio', etapa: 'Em conversa',
        precisa: 'Critérios de seleção e calendário', oferece: 'Consultar duas escolas sobre interesse',
        proximoPasso: 'Confirmar se a consulta às escolas aconteceu', followUp: d(1), prazoExterno: true,
        notas: 'O orçamento do próximo ano fecha no fim do mês.',
        interacoes: [
          { data: d(-8), tipo: 'reuniao', texto: 'Reunião de planejamento. Pode consultar duas escolas sobre interesse.' },
          { data: d(-2), tipo: 'ligacao', texto: 'Avisou que o orçamento do próximo ano fecha no fim do mês.' }] },
      { nome: 'Beatriz Lima', cargo: 'Analista de dados', organizacao: 'Observatório Serra', email: 'beatriz@example.org',
        evento: 'Reunião de planejamento', conheciEm: d(-8), tipo: 'especialista', potencial: 'medio', etapa: 'Combinado',
        proximoPasso: 'Receber a base de dados com data de corte', followUp: d(0),
        interacoes: [{ data: d(-8), tipo: 'reuniao', texto: 'Combinamos a base de Serra com data de corte.' }] },
      { nome: 'Camila Rocha', cargo: 'Gerente de parcerias', organizacao: 'Empresa Vértice', email: 'camila@example.org',
        evento: 'Feira de inovação', conheciEm: d(-60), tipo: 'cliente', potencial: 'alto', etapa: 'Em conversa',
        precisa: 'Projeto social para patrocinar no próximo semestre', proximoPasso: 'Retomar a conversa sobre patrocínio',
        interacoes: [
          { data: d(-60), tipo: 'evento', texto: 'Feira de inovação. Procura um projeto social para patrocinar.' },
          { data: d(-52), tipo: 'cafe', texto: 'Café para apresentar o programa. Gostou do recorte de educação.' },
          { data: d(-45), tipo: 'email', texto: 'Mandei a apresentação. Pediu para retomar depois do fechamento do trimestre.' }] },
      { nome: 'Luiza Prado', cargo: 'Diretora de programas', organizacao: 'Fundo Aurora', email: 'luiza@example.org',
        evento: 'Workshop IA na prática', conheciEm: d(-2), tipo: 'financiador', potencial: 'alto', etapa: 'Novo contato',
        oferece: 'Edital anual para projetos de educação', proximoPasso: 'Mandar a apresentação do programa', followUp: d(10),
        interacoes: [{ data: d(-2), tipo: 'evento', texto: 'Contou do edital anual para projetos de educação.' }] },
      { nome: 'Rafael Souza', cargo: 'Consultor de tecnologia', organizacao: 'Autônomo', evento: 'Workshop IA na prática',
        conheciEm: d(-2), tipo: 'rede', potencial: 'baixo', etapa: 'Novo contato',
        proximoPasso: 'Mandar o artigo que comentei', followUp: d(20),
        interacoes: [{ data: d(-2), tipo: 'evento', texto: 'Comentei um artigo sobre IA na gestão.' }] }
    ].map((o) => normalizar(Object.assign(o, { tags: ['exemplo'], criadoEm: o.conheciEm })));
  }

  /* 10. Eventos -------------------------------------------------------- */

  function toast(msg) {
    const t = $('#toast');
    (dlg && dlg.open ? dlg : document.body).appendChild(t);
    t.textContent = msg;
    t.classList.add('on');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => t.classList.remove('on'), 3400);
  }

  function salvarFicha(form) {
    const fd = new FormData(form);
    const o = Object.fromEntries(fd);
    o.prazoExterno = fd.has('prazoExterno');
    if (!String(o.nome || '').trim()) {
      $('#erroForm').textContent = 'Coloque pelo menos o nome da pessoa.';
      form.elements.nome.focus();
      return;
    }
    const id = form.dataset.id;
    let c;
    if (id) {
      const antigo = achar(id);
      c = normalizar(Object.assign({}, antigo, o, { id, interacoes: antigo.interacoes, criadoEm: antigo.criadoEm }));
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

  const acoes = {
    abrir: (el) => abrirDetalhe(el.dataset.id),
    feito: (el) => abrirDetalhe(el.dataset.id, true),
    editar: (el) => abrirJanela(fichaContato(achar(el.dataset.id)), '[name=nome]'),
    fechar: fecharJanela,
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
    excluir: (el) => {
      const c = achar(el.dataset.id);
      if (!confirm(`Excluir ${c.nome} e todo o histórico? Não dá para desfazer.`)) return;
      contatos = contatos.filter((x) => x.id !== c.id);
      salvar();
      fecharJanela();
      render();
      toast('Contato excluído.');
    },
    ics: (el) => exportarICS(achar(el.dataset.id)),
    promptFollow: (el) => copiar(promptFollow(achar(el.dataset.id)), 'Pedido copiado. Cole na sua IA e revise antes de enviar.'),
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
      if (!confirm('Voltar todas as regras para o padrão?')) return;
      aj = ajustesPadrao();
      salvarAjustes();
      render();
      toast('Regras de volta ao padrão.');
    },
    exportJSON: () => baixar(`minha-rede-backup-${hojeISO()}.json`,
      JSON.stringify({ app: 'minha-rede', versao: 2, exportadoEm: new Date().toISOString(), ajustes: aj, contatos }, null, 2), 'application/json'),
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
    if (id === 'fAtTipo') { filtroAt.tipo = e.target.value; render(); }
    if (id === 'fAtDias') { filtroAt.dias = e.target.value; render(); }
    if (id === 'etapaDet') {
      const c = achar(e.target.dataset.id);
      if (mudarEtapa(c, e.target.value)) { salvar(); render(); abrirDetalhe(c.id); toast(`Situação agora é "${c.etapa}".`); }
    }
    if (id === 'arquivoBackup' && e.target.files[0]) { restaurarBackup(e.target.files[0]); e.target.value = ''; }
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

  // Atalhos pelo endereço: index.html#exemplos carrega os fictícios numa base vazia; ?aba=funil abre direto numa aba.
  if (location.hash === '#exemplos' && !contatos.length) { contatos = exemplos(); salvar(); }
  const abaUrl = new URLSearchParams(location.search).get('aba');
  if (ABAS.includes(abaUrl)) aba = abaUrl;
  if (!ABAS.includes(aba)) aba = 'hoje';

  render();

  // ?contato=marina abre direto a ficha de quem tem esse nome.
  const alvoUrl = chave(new URLSearchParams(location.search).get('contato') || '');
  const alvo = alvoUrl && contatos.find((c) => chave(c.nome).includes(alvoUrl));
  if (alvo) abrirDetalhe(alvo.id);
})();
