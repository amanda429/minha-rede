# My Network Effects · Personal CRM

Um CRM pessoal para quem conhece muita gente em eventos e reuniões.

Você registra quem é a pessoa, como falar com ela, o que combinaram e quando retomar. O app mostra quem merece sua atenção primeiro.

Criado para o workshop **IA na prática para lideranças**, de Amanda Graciano ([@gracianoamanda](https://www.instagram.com/gracianoamanda/)). Feito para você baixar, usar e melhorar com a sua IA.

## Por que "network effects"

Efeito de rede (*network effects*, em inglês) é quando cada nova conexão aumenta o valor da rede inteira. É o que faz um aplicativo de mensagens valer mais a cada pessoa que entra: você não ganha só um contato, ganha acesso ao que aquela pessoa pode trazer.

Com as suas relações acontece o mesmo. Alguém que você conheceu num evento te apresenta a outra pessoa, que abre uma parceria, que vira um projeto. O valor não está em cada contato sozinho, está nas ligações entre eles.

Só que esse efeito não acontece por conta própria. Relação que ninguém cuida esfria: o cartão fica na gaveta, o follow-up não sai e a oportunidade passa. Por isso a gestão importa:

- **Registrar** quem é a pessoa, o que ela precisa e o que ela oferece, logo depois de conhecer.
- **Retomar** no tempo certo, com um próximo passo claro.
- **Priorizar** com critério: nem toda relação pede a mesma atenção agora.
- **Conectar** pessoas que podem se ajudar, sempre perguntando antes se as duas topam.
- **Oferecer antes de pedir:** o que você oferece conta tanto quanto o que você busca.

O My Network Effects foi feito para isso: tirar da cabeça (e da gaveta) o trabalho de lembrar, para sobrar energia para o que importa, que é a conversa.

## O que ele faz

- **Seu perfil:** quem é a pessoa dona do app (foto, nome, cargo, redes, interesses, aniversário, o que oferece e o que busca). A foto ou a sigla aparece no alto da barra lateral e o perfil entra nos pedidos para a IA.
- **Ficha completa:** nome, cargo, organização, telefone, e-mail, LinkedIn, Instagram, canal preferido, onde se conheceram, o que a pessoa precisa, o que ela oferece, temas e interesses, anotações e um bloco pessoal (família, gosta, não gosta, aniversário).
- **Cadência:** diga de quanto em quanto tempo quer falar com cada pessoa. Sem data marcada, o app calcula o próximo contato sozinho.
- **Hoje:** painel com a fila do dia (toque no círculo quando fizer, com opção de desfazer), follow-ups, atividade da semana, saúde da rede e aniversários.
- **Prioridade automática:** cada contato cai em uma de quatro caixas (agir hoje, agendar, resolver rápido, deixar para depois) e o app mostra o motivo.
- **Trazer da IA:** copie o pedido pronto, cole na sua IA junto com a anotação, o print do LinkedIn ou a foto do cartão de visita, e importe a ficha que ela devolver.
- **Mensagem de follow-up:** um botão copia um pedido para a IA escrever a mensagem usando só o que você registrou.
- **Linha do tempo de interações:** cada reunião, ligação, WhatsApp, e-mail, LinkedIn, evento ou café fica registrado com data e resumo, como num CRM de empresa. Mudanças de situação entram sozinhas.
- **Funil:** colunas por situação da relação (novo contato, em conversa, combinado, relação ativa, pausado). É só arrastar.
- **Conexões:** o mapa da rede que se forma (pessoas ligadas por temas, eventos e trocas), quem combina com você, quem pode ajudar quem e o pedido pronto para a IA escrever uma apresentação, sempre perguntando antes se as duas pessoas topam.
- **Atividades:** o feed de todas as interações, com filtro por tipo e período.
- **Arquivar:** tire da frente quem não está mais ativo sem perder o histórico.
- **Escuro ou claro:** escolha no alto de qualquer tela.
- **Instalável no celular:** pela página publicada, dá para adicionar à tela de início e usar como aplicativo.
- **Agenda:** baixa o follow-up como evento para Google Agenda, Outlook ou Apple.
- **Backup:** exporta tudo em JSON, uma planilha de contatos e uma planilha de interações.

## Como usar

### Jeito 1: abrir direto no navegador

Abra **https://amanda429.github.io/minha-rede/** no navegador do computador ou do celular. Não precisa instalar nada.

### Jeito 2: baixar e abrir no seu computador

1. Nesta página do GitHub, clique no botão verde **Code** e depois em **Download ZIP**.
2. Descompacte o arquivo.
3. Dê dois cliques em `index.html`. Pronto. Não precisa instalar nada.

### Jeito 3: pedir para a sua IA

Se você usa uma IA que mexe em arquivos no seu computador (Claude Code, Codex, Cursor), cole isto:

```
Clone o repositório https://github.com/amanda429/minha-rede numa pasta chamada minha-rede,
leia o AGENTS.md para entender como o app funciona
e abra o index.html no meu navegador.
```

## Seus dados

- Os contatos ficam **só no navegador** em que você cadastrou. Nada é enviado para servidor nenhum, nem para o GitHub.
- Cada navegador e cada computador tem a própria base. Para levar para outro lugar, use **Ajustes > Baixar backup** e depois **Restaurar backup**.
- Se você limpar os dados do navegador, os contatos somem. Faça backup de vez em quando.
- Antes de registrar dados de outras pessoas, pense se elas se sentiriam confortáveis com isso.

## Como a prioridade funciona

- **Importância** vem de quem a pessoa é para você. Cada tipo de relação tem um peso de 1 a 3. O potencial soma 1 (alto) ou tira 1 (baixo). A partir de 3 pontos, o contato é importante.
- **Urgência** vem do tempo: follow-up em até 2 dias, um prazo externo (edital, orçamento, janela de decisão) ou um contato importante há mais de 30 dias sem conversa.
- Tudo isso é seu para mudar, na aba **Ajustes** ou no arquivo `config.js`. Existem conjuntos prontos para setor privado, setor público e terceiro setor.

## Melhore com a sua IA

O app foi feito para ser mexido. O arquivo [MELHORIAS.md](MELHORIAS.md) tem ideias com o pedido pronto para colar na sua IA, do mais simples ao mais ousado.

Antes de pedir qualquer mudança, baixe um backup dos seus contatos.

## Arquivos

| Arquivo | Para que serve |
|---|---|
| `index.html` | A página do app |
| `styles.css` | Cores, fontes e layout (design system Noite) |
| `design-system.html` | A página que mostra cores, tipografia e componentes do app |
| `manifest.webmanifest`, `sw.js`, `img/` | O que faz o app ser instalável no celular e abrir sem internet |
| `config.js` | Tipos de relação, pesos e regras. O mais fácil de mudar |
| `app.js` | Toda a lógica do app |
| `AGENTS.md` | Instruções para a IA que for mexer no código |
| `MELHORIAS.md` | Ideias de evolução com pedidos prontos |

Os contatos de exemplo do app são todos fictícios. O endereço do app continua **amanda429.github.io/minha-rede**, e os dados do navegador continuam guardados com o nome antigo, para ninguém perder nada.
