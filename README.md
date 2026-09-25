# Minha Rede · CRM pessoal

Um CRM simples para quem conhece muita gente em eventos e reuniões.

Você registra quem é a pessoa, como falar com ela, o que combinaram e quando retomar. O app mostra quem merece sua atenção primeiro.

Criado para o workshop **IA na prática para lideranças**, de Amanda Graciano. Feito para você baixar, usar e melhorar com a sua IA.

## O que ele faz

- **Ficha completa:** nome, cargo, organização, telefone, e-mail, LinkedIn, onde se conheceram, o que a pessoa precisa, o que ela oferece, anotações e tags.
- **Prioridade automática:** cada contato cai em uma de quatro caixas (agir hoje, agendar, resolver rápido, deixar para depois) e o app mostra o motivo.
- **Trazer da IA:** copie o pedido pronto, cole na sua IA junto com a anotação, o print do LinkedIn ou a foto do cartão de visita, e importe a ficha que ela devolver.
- **Mensagem de follow-up:** um botão copia um pedido para a IA escrever a mensagem usando só o que você registrou.
- **Linha do tempo de interações:** cada reunião, ligação, WhatsApp, e-mail, LinkedIn, evento ou café fica registrado com data e resumo, como num CRM de empresa. Mudanças de situação entram sozinhas.
- **Funil:** colunas por situação da relação (novo contato, em conversa, combinado, relação ativa, pausado). É só arrastar.
- **Atividades:** o feed de todas as interações, com filtro por tipo e período.
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
| `styles.css` | Cores, fontes e layout |
| `config.js` | Tipos de relação, pesos e regras. O mais fácil de mudar |
| `app.js` | Toda a lógica do app |
| `AGENTS.md` | Instruções para a IA que for mexer no código |
| `MELHORIAS.md` | Ideias de evolução com pedidos prontos |

Os contatos de exemplo do app são todos fictícios.
