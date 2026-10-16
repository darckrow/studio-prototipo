# Studio — gestão do estúdio

Plataforma local para organizar clientes, projetos, tarefas, planejamento de conteúdo, aprovações e entregas de um estúdio criativo. A interface abre no navegador e os dados ficam no SQLite deste computador.

## Instalação e execução

Requer Node.js 24 ou superior e npm. Após baixar ou clonar este repositório, abra o terminal na pasta do projeto:

```sh
npm ci
npm run build
npm start
```

Acesse http://127.0.0.1:3000 e mantenha o servidor aberto enquanto usa a plataforma. Encerre com Ctrl+C. No Windows, depois de instalar as dependências, também é possível abrir **Iniciar Studio.cmd**. O iniciador gera o build caso ele ainda não exista; depois de alterar o código, execute novamente `npm run build`.

Para desenvolvimento, use `npm run dev`. A aplicação inicia vazia e cria o banco e aplica as migrações automaticamente. Os exemplos são opcionais e só estão disponíveis quando a base está vazia.

## Como utilizar

1. Clique no nome ou avatar para configurar seu perfil, nome do estúdio e preferências.
2. Cadastre os **clientes**, que serão vinculados aos projetos e planejamentos.
3. Crie os **projetos**, preenchendo briefing, serviço, prazo, valor contratado e valor recebido.
4. Adicione tarefas ao projeto e acompanhe o progresso, os filtros, a agenda e os indicadores da visão geral. As tarefas são salvas imediatamente; os campos do projeto exigem **Salvar alterações**.
5. Em **Planejamento → Novo planejamento**, escolha cliente e semana. Adicione conteúdos com título, canal, formato, data, legenda, miniatura opcional e link do material. O vínculo com um projeto é opcional.
6. Solicite aprovação pelo arquivo HTML ou pelo Google Forms, conforme os fluxos abaixo.
7. No projeto, atualize o **Processo de produção**: briefing, roteiro, aprovação do roteiro, gravação, edição, aprovação do filme completo e finalização. Para finalizar, conclua as seis etapas anteriores.
8. Quando o projeto estiver concluído, registre **Já foi postado**, a data e o link, e clique em **Salvar publicação**. Esse registro não publica conteúdo nas redes sociais.
9. Faça backups periódicos em **Dados e backup**.

Arquivar preserva o histórico. Clientes com projetos em andamento precisam ter esses projetos concluídos ou arquivados antes. Para restaurar um projeto, restaure primeiro seu cliente.

## Aprovação por arquivo

No planejamento, clique em **Baixar para aprovação** e envie o HTML ao cliente. Ele deve baixar e abrir o arquivo no navegador, informar seu nome, aprovar os conteúdos ou solicitar ajustes e clicar em **Baixar respostas**. Receba o JSON devolvido e use **Importar respostas** no planejamento correspondente.

A troca dos arquivos é manual. O HTML não depende do servidor e não inclui financeiro, contatos, briefing interno ou outros clientes. O nome do revisor não passa por autenticação. Alterar um conteúdo cria uma nova versão e o devolve a Rascunho; exporte um novo envio. Respostas antigas ou já importadas não podem ser reutilizadas.

Veja [o guia de planejamento](docs/como-usar-planejamento.md).

## Integrações Google opcionais

Em **Perfil e integrações**, importe as credenciais OAuth e autorize a conta do estúdio. A configuração exige um projeto Google Cloud com Calendar API, Forms API e Drive API habilitadas. Siga [o guia completo de configuração](docs/guia-configuracao-google.md), também disponível [em HTML](public/guia-configuracao-google.html).

- **Agenda:** envia os prazos do Studio para um calendário Google separado. A sincronização é Studio → Google; alterações feitas no Google não atualizam o projeto local.
- **Forms:** gera um formulário para aprovação dos conteúdos e recupera decisões e comentários para o planejamento. O cliente responde online mesmo com o computador do estúdio desligado; o Studio precisa estar aberto e conectado para enviar atualizações e buscar respostas.
- **Miniaturas:** quando habilitadas, cópias são enviadas ao Drive e ficam acessíveis por link. Essa preferência começa desativada.

O cliente não configura APIs nem recebe credenciais. Envie apenas o link de resposta e, se necessário, [o guia de aprovação](public/guia-aprovacao-cliente.html). A integração depende da autorização real da conta Google.

## Dados, backup e restauração

O banco fica em `data/studio.sqlite`. Fechar ou trocar o navegador não apaga os dados. A pasta de dados pode ser alterada pela variável `STUDIO_DATA_DIR`; a porta, por `PORT` (padrão: 3000).

Baixe um backup pela interface ou execute:

```sh
npm run backup
```

Para restaurar, feche o Studio e execute:

```sh
npm run restore -- "caminho/backup.sqlite"
```

O restaurador aceita backups das versões 1, 2 e 3 e preserva o banco anterior. Migrações pendentes são aplicadas na próxima abertura. Guarde cópias concluídas fora do computador e mantenha o banco ativo fora de pastas sincronizadas.

As credenciais e tokens Google são criptografados. Guarde também a chave `data/google-secrets.key` em local privado, separada do backup SQLite; o backup do banco sozinho não substitui essa chave.

## Estrutura e funcionamento

- `app/`: página React, layout e rotas da API Next.js.
- `public/app.js` e `public/styles.css`: comportamento da interface e estilos.
- `lib/`: persistência, validações, planejamento, documentos de aprovação, perfil e integração Google.
- `migrations/`: evolução do esquema SQLite, aplicada automaticamente.
- `scripts/backup.mjs` e `scripts/restore.mjs`: manutenção dos dados.
- `server.mjs`: servidor local Next.js, restrito a 127.0.0.1.
- `docs/`: guias de uso e configuração.

A aplicação usa Next.js 16, React 19 e SQLite nativo do Node.js. O perfil não constitui login nem suporte a múltiplos usuários. Esta versão foi feita para uso local; publicar o código no GitHub não hospeda a plataforma nem transfere seus dados. O financeiro registra valor contratado, recebido e saldo; não inclui despesas, parcelas ou histórico de recebimentos.

## Arquivos publicados

O repositório deve conter código, migrações, configurações, lockfile e guias necessários. Fotos, capturas de tela, testes, artefatos, banco de dados, backups, credenciais, dependências instaladas e builds ficam fora da publicação. Ícones ou elementos visuais definidos no próprio código fazem parte da interface.
