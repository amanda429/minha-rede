# Instruções para agentes de IA

Você está ajudando alguém a usar ou melhorar o **My Network Effects** (antes chamado Minha Rede), um CRM pessoal que roda inteiro no navegador.

## Quem provavelmente está pedindo

Uma liderança que participou de um workshop de IA. Pode nunca ter programado. Então:

- Responda em português do Brasil, com linguagem simples.
- Antes de mudar qualquer coisa, explique em 2 ou 3 linhas o que vai fazer.
- Depois de mudar, abra o `index.html` no navegador para a pessoa ver o resultado.
- Lembre a pessoa de baixar um backup (aba Ajustes) antes de mudanças grandes.

## Regras que não podem ser quebradas

1. **Sem instalação e sem build.** O app abre com dois cliques no `index.html`. Nada de npm, frameworks ou etapas de compilação.
2. **Sem `type="module"` nem `import`.** Módulos ES não funcionam quando o arquivo é aberto direto do disco (`file://`). Use scripts comuns.
3. **Os dados não saem do navegador.** Não adicione envio para servidor, analytics ou APIs externas sem a pessoa pedir explicitamente e entender o que será enviado.
4. **Compatibilidade dos dados.** Os contatos ficam no `localStorage`, na chave `minha-rede:dados:v1` (as chaves continuam com o nome antigo para ninguém perder dados). Se mudar o formato, escreva uma migração que leia o formato antigo. Nunca apague os dados da pessoa.
5. **Nunca coloque dados reais de contatos no repositório.** Exemplos são sempre fictícios.
6. **Todo texto que vem do usuário passa por `esc()`** antes de entrar no HTML.
7. **Textos da interface em português do Brasil.**

## Mapa do código

| Arquivo | O que tem |
|---|---|
| `config.js` | `window.CRM_CONFIG`: tipos de relação com peso, potencial, limites de urgência e esfriamento, etapas, tipos de interação e presets por setor |
| `app.js` | Toda a lógica, em 10 seções numeradas nos comentários |
| `styles.css` | Design system Noite: fundo escuro com brilhos, cartões de vidro fosco, anéis, barras e linhas com brilho. Todos os tokens no `:root`. Variáveis de cor no `:root`, cores dos quadrantes em `.q-agir`, `.q-agendar`, `.q-rapido`, `.q-depois` e de cada tipo de interação em `.ti-reuniao`, `.ti-ligacao` etc. |
| `design-system.html` | A página do design system: cores, tipografia, componentes e regras de uso. Siga esta página ao criar telas novas. |
| `index.html` | Estrutura fixa: cabeçalho, abas, `<main id="view">`, um `<dialog>` reutilizado |

Funções principais do `app.js`:

- `normalizar(o)`: transforma qualquer objeto (formulário, IA, CSV) num contato válido. **Campo novo começa aqui.**
- `prioridade(c)`: a regra da matriz. Devolve o quadrante e a lista de motivos mostrada na tela.
- `telaHoje`, `telaFunil`, `telaMatriz`, `telaContatos`, `telaConexoes`, `telaAtividades`, `telaAjustes`: cada aba é uma função que devolve HTML.
- `relacao(a, b)` e `todasConexoes(lista)`: as regras visíveis que ligam duas pessoas (temas em comum, mesma organização, mesmo evento, uma oferece o que a outra precisa).
- `montarRede(lista)`, `forcas(...)` e `iniciarRede()`: o mapa da aba Conexões, desenhado num `<canvas>` no estilo do gráfico do Obsidian. `iniciarRede()` roda depois de `render()` quando a aba é Conexões e para sozinho ao trocar de aba.
- `perfil()`, `janelaPerfil()` e `sobreMim()`: o perfil da pessoa dona do app, guardado em `aj.perfil`. `sobreMim()` coloca esse contexto nos pedidos para a IA.
- `linhaDoTempo(c)`, `mudarEtapa(c, nova)` e `registrarSistema(c, texto)`: o fluxo de interações. Toda mudança de situação passa por `mudarEtapa`, que deixa o registro na linha do tempo.
- `fichaContato(c)`: formulário de criar e editar.
- `detalhe(c)`: janela do contato em duas colunas (dados à esquerda, registro de interação e linha do tempo à direita).
- `promptImportar()`, `promptFollow(c)` e `promptApresentacao(a, b, motivos)`: os pedidos prontos que o usuário copia para a IA.
- `acoes`: cada botão tem `data-action="nome"` e a função correspondente mora neste objeto.

Os ajustes feitos pela pessoa na aba Ajustes (inclusive o perfil, em `perfil`) ficam em `minha-rede:ajustes:v1` e valem mais do que o `config.js`. O tema escolhido fica em `minha-rede:tema`. Se você mudar o `config.js` e nada acontecer, oriente a pessoa a clicar em **Voltar ao padrão** na aba Ajustes.

## Modelo de dados de um contato

```json
{
  "id": "texto único",
  "nome": "", "cargo": "", "organizacao": "",
  "telefone": "", "email": "", "linkedin": "", "instagram": "",
  "canal": "whatsapp | instagram | linkedin | email | telefone | outro",
  "evento": "", "conheciEm": "AAAA-MM-DD",
  "tipo": "id de um tipo do config", "potencial": "alto | medio | baixo",
  "etapa": "uma das etapas do config", "prazoExterno": false,
  "precisa": "", "oferece": "", "notas": "",
  "familia": "", "gosta": "", "naoGosta": "", "aniversario": "MM-DD",
  "cadencia": "0 | 7 | 14 | 30 | 60 | 90 | 180 (dias)",
  "proximoPasso": "", "followUp": "AAAA-MM-DD", "arquivado": false,
  "tags": ["texto"],
  "interacoes": [{ "id": "", "data": "AAAA-MM-DD", "tipo": "reuniao | ligacao | whatsapp | email | linkedin | evento | cafe | nota | sistema", "texto": "" }],
  "criadoEm": "AAAA-MM-DD"
}
```

## Como adicionar um campo novo (exemplo: "quem me apresentou")

1. Em `normalizar`, adicione `apresentadoPor: t(o.apresentadoPor)`.
2. Em `fichaContato`, adicione o campo com `campo('apresentadoPor', 'Quem me apresentou', c.apresentadoPor)`.
3. Em `detalhe`, mostre o campo junto dos outros dados da pessoa.
4. Em `exportarCSV`, inclua `'apresentadoPor'` na lista de colunas.
5. Em `promptImportar`, inclua a chave no modelo de JSON.
6. Se o campo afetar a prioridade, mude `prioridade(c)` e atualize o texto da tela Prioridade (`telaMatriz`) para a regra continuar visível.

## App instalável e cache

O `sw.js` guarda os arquivos para o app abrir sem internet na versão publicada (https). Ao publicar uma mudança, troque o número em `const VERSAO` para os celulares baixarem a versão nova. Se criar um arquivo novo que o app precisa, inclua na lista `ARQUIVOS`.

## Como testar

Abra `index.html`, clique em **Ver com exemplos fictícios** e confira as sete abas. Os exemplos cobrem os quatro quadrantes e vários tipos de interação.

Atalhos úteis para testar: `index.html#exemplos` carrega os fictícios numa base vazia, `?aba=funil` abre direto numa aba e `?contato=marina` abre a ficha da Marina.
