/*
  Configuração do Minha Rede.

  Este é o arquivo mais fácil de mudar. Você pode pedir para a sua IA:
  "Troque os tipos de relação do config.js para o meu contexto: ..."

  Quase tudo aqui também pode ser ajustado dentro do app, na aba Ajustes.
  O que você salvar na aba Ajustes vale mais do que este arquivo.
*/
(function () {
  var presets = {
    misto: {
      nome: 'Misto (padrão)',
      tipos: [
        { id: 'cliente', nome: 'Cliente potencial', peso: 3 },
        { id: 'financiador', nome: 'Financiador', peso: 3 },
        { id: 'decisor', nome: 'Decisor', peso: 3 },
        { id: 'parceiro', nome: 'Parceiro', peso: 2 },
        { id: 'mentor', nome: 'Mentor', peso: 2 },
        { id: 'especialista', nome: 'Especialista', peso: 1 },
        { id: 'rede', nome: 'Rede geral', peso: 1 }
      ]
    },
    privado: {
      nome: 'Setor privado',
      tipos: [
        { id: 'cliente', nome: 'Cliente potencial', peso: 3 },
        { id: 'investidor', nome: 'Investidor', peso: 3 },
        { id: 'parceiro', nome: 'Parceiro de negócio', peso: 2 },
        { id: 'mentor', nome: 'Mentor', peso: 2 },
        { id: 'fornecedor', nome: 'Fornecedor', peso: 1 },
        { id: 'especialista', nome: 'Especialista', peso: 1 },
        { id: 'rede', nome: 'Rede geral', peso: 1 }
      ]
    },
    publico: {
      nome: 'Setor público',
      tipos: [
        { id: 'decisor', nome: 'Decisor', peso: 3 },
        { id: 'financiador', nome: 'Orçamento ou financiador', peso: 3 },
        { id: 'parceiro', nome: 'Parceiro técnico', peso: 2 },
        { id: 'sociedade', nome: 'Sociedade civil', peso: 2 },
        { id: 'especialista', nome: 'Especialista', peso: 1 },
        { id: 'imprensa', nome: 'Imprensa', peso: 1 },
        { id: 'rede', nome: 'Rede geral', peso: 1 }
      ]
    },
    social: {
      nome: 'Terceiro setor',
      tipos: [
        { id: 'financiador', nome: 'Financiador', peso: 3 },
        { id: 'poder-publico', nome: 'Poder público', peso: 3 },
        { id: 'parceiro', nome: 'Parceiro de campo', peso: 2 },
        { id: 'mentor', nome: 'Mentor ou voluntário', peso: 2 },
        { id: 'especialista', nome: 'Especialista', peso: 1 },
        { id: 'rede', nome: 'Rede geral', peso: 1 }
      ]
    }
  };

  window.CRM_CONFIG = {
    nomeApp: 'Minha Rede',

    // Usado no link do WhatsApp quando o telefone foi salvo sem código do país.
    codigoPais: '55',

    // Peso de 1 a 3: quanto esse tipo de relação pesa na sua prioridade.
    tipos: presets.misto.tipos,

    // Quanto o potencial soma (ou tira) do peso do tipo.
    potencial: { alto: 1, medio: 0, baixo: -1 },

    // A partir de quantos pontos (peso do tipo + potencial) o contato é "importante".
    limiteImportante: 3,

    // Follow-up em até quantos dias conta como "urgente".
    diasUrgente: 2,

    // Depois de quantos dias sem conversa o contato está "esfriando".
    diasEsfriando: 30,

    // As situações possíveis de uma relação, na ordem.
    etapas: ['Novo contato', 'Em conversa', 'Combinado', 'Relação ativa', 'Pausado'],

    // Contatos nesta situação nunca ficam urgentes.
    etapaPausada: 'Pausado',

    // Tipos de interação que aparecem na linha do tempo de cada pessoa.
    tiposInteracao: [
      { id: 'reuniao', nome: 'Reunião' },
      { id: 'ligacao', nome: 'Ligação' },
      { id: 'whatsapp', nome: 'WhatsApp' },
      { id: 'email', nome: 'E-mail' },
      { id: 'linkedin', nome: 'LinkedIn' },
      { id: 'evento', nome: 'Evento' },
      { id: 'cafe', nome: 'Café ou almoço' },
      { id: 'nota', nome: 'Anotação' }
    ],

    // Conjuntos prontos de tipos de relação, escolhidos na aba Ajustes.
    presets: presets
  };
})();
