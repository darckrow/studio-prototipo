# Studio — guia completo de perfil, Google Agenda e aprovação pelo Google Forms

Versão: 16/10/2026. Guia da aplicação Next.js local, para uma conta Gmail pessoal. Pode ser compartilhado com a pessoa que vai instalar/configurar o Studio. Não contém credenciais reais.

## 1. O que esta integração faz

- Envia os prazos dos projetos para um calendário Google separado chamado **Studio**.
- Atualiza título, data e etapa dos eventos criados pelo Studio, usando vínculos estáveis para não duplicá-los.
- Gera um Google Forms com os conteúdos de um planejamento e um link de resposta para enviar ao cliente.
- Recupera as aprovações e os comentários do Google Forms para os cards do planejamento.
- Mantém clientes, financeiro, briefing interno e tarefas no banco local. Somente dados necessários à agenda/aprovação são enviados ao Google.

A sincronização da agenda é **Studio → Google Agenda**. Editar um evento no Google não altera o projeto local. Se o Studio detectar diferença, sinaliza um conflito e deixa você escolher se deseja republicar os dados locais.

O cliente responde no Google mesmo com seu computador desligado. O Studio precisa estar aberto e conectado à internet para enviar atualizações ou buscar as respostas. Não é necessário hospedar a aplicação para este fluxo.

Este guia descreve a configuração e o comportamento implementados. A ativação real precisa ser concluída na conta Google do estúdio; os testes automatizados usam respostas simuladas e não substituem o teste com sua conta.

## 2. Quem precisa fazer o quê

| Pessoa | Responsabilidade |
| --- | --- |
| Responsável pelo estúdio | Configurar o Google Cloud, importar credenciais e autorizar a conta |
| Pessoa que opera o Studio | Criar projetos/planejamentos, sincronizar e enviar links |
| Cliente que aprova conteúdo | Abrir o link de resposta e preencher suas decisões |

O cliente final **não precisa criar projeto Google Cloud, receber Client secret ou configurar APIs**. Envie a ele o arquivo `public/guia-aprovacao-cliente.html`, que contém somente as instruções para responder.

## 3. Antes de começar

1. Tenha uma conta Gmail pessoal controlada pelo estúdio. Evite usar uma conta de terceiros que possa perder acesso depois.
2. Confirme que o Studio abre em `http://127.0.0.1:3000` ou `http://localhost:3000`.
3. Use a aplicação iniciada por **Iniciar Studio.cmd** ou `npm start`. O `index.html` estático não conecta contas reais.
4. Mantenha uma cópia de segurança dos dados em **Dados e backup → Baixar backup**.
5. Use um navegador atualizado, acesso à internet e permissão para acessar Google Cloud, Agenda, Forms e Drive.

Na pasta do projeto, uma instalação nova usa:

```text
npm install
npm run build
npm start
```

Se o servidor foi iniciado em outra porta, os endereços de retorno mudam. A tela **Perfil e integrações** mostra os endereços exatos da execução atual.

## 4. Editar o perfil e as preferências

Clique no seu nome, no canto inferior esquerdo, ou no avatar no canto superior direito.

Em **Meu perfil**, preencha:

- Seu nome: aparece no menu e define as iniciais do avatar.
- Nome do estúdio: aparece na área de trabalho.
- Função: por exemplo, Editora, Videomaker ou Social media.
- E-mail de contato: uma preferência local; não escolhe a conta Google que será conectada.
- Cor de destaque: verde, lilás ou azul.
- Espaçamento: confortável ou compacto.
- Sincronização automática: permite tentativas ao abrir a aplicação, depois de alterações e periodicamente com a tela visível.
- Miniaturas nos formulários: habilita o envio das imagens ao Google Drive ao gerar formulários novos.

Clique **Salvar perfil e preferências**. O perfil é salvo no SQLite. Ele não é um sistema de login/senha ou de múltiplos usuários.

### Atenção às miniaturas

Por padrão, o envio de imagens está desativado. O Forms recebe título, legenda, data, canal, formato e link do material, quando houver.

Se você ativar **Incluir miniaturas nos formulários**, o Studio enviará cópias das miniaturas para o Drive da conta conectada e dará acesso de leitura por link para que o Forms possa incorporá-las. Não envie uma imagem que precise permanecer estritamente privada. O envio não publica outros arquivos do seu Drive.

Encerrar um formulário interrompe suas respostas; não apaga automaticamente as cópias das miniaturas do Drive. Para remover essas cópias, localize os arquivos com nomes começando em **Studio —** na sua conta Drive, depois de verificar que não serão mais necessários.

## 5. Criar o projeto no Google Cloud

1. Acesse [Google Cloud Console](https://console.cloud.google.com/) usando o Gmail do estúdio.
2. No seletor de projetos, escolha **Novo projeto / New project**.
3. Dê um nome, por exemplo **Studio — Gestão e aprovações**.
4. Conclua a criação e selecione esse projeto no topo da página.

Os nomes de menus podem variar conforme idioma e atualizações do Google. Confirme sempre qual projeto está selecionado antes de alterar APIs ou credenciais.

## 6. Ativar as APIs

Abra **APIs e serviços → Biblioteca / APIs & Services → Library**. Ative, uma de cada vez:

1. **Google Calendar API** — criar o calendário e gerenciar os eventos do Studio.
2. **Google Forms API** — criar formulários e ler as respostas.
3. **Google Drive API** — gerenciar o acesso dos respondentes e enviar miniaturas quando habilitadas.

Não basta possuir uma conta Google: essas APIs precisam estar ativadas no projeto associado às credenciais. [Orientação oficial de configuração OAuth](https://developers.google.com/identity/protocols/oauth2/web-server).

Não é usada uma chave API comum, senha do Gmail, senha de aplicativo nem conta de serviço. Esta integração usa um **cliente OAuth do tipo Aplicativo da Web**.

## 7. Configurar o consentimento para Gmail pessoal

Abra **Google Auth Platform**. Se o Console mostrar **Tela de consentimento OAuth / OAuth consent screen**, entre por essa opção.

### Branding / Marca

Preencha o nome do aplicativo, e-mail de suporte e e-mail de contato do desenvolvedor. Use endereços que você controla. Salve.

### Audience / Público

Para Gmail pessoal, configure como **Externo / External**. Durante a validação, mantenha em **Testing / Teste** e adicione seu próprio Gmail à lista de usuários de teste.

Essa lista corresponde a quem **conecta uma conta ao Studio**. Não é a lista de clientes que respondem aos formulários.

### Data Access / Acesso aos dados

Adicione os escopos usados pelo aplicativo. A autorização solicitará:

```text
openid
email
https://www.googleapis.com/auth/calendar.app.created
https://www.googleapis.com/auth/forms.body
https://www.googleapis.com/auth/forms.responses.readonly
https://www.googleapis.com/auth/drive.file
```

| Escopo | Uso no Studio |
| --- | --- |
| openid e email | Identificar qual conta foi conectada |
| calendar.app.created | Criar calendários secundários do aplicativo e gerenciar seus eventos |
| forms.body | Criar e configurar os formulários |
| forms.responses.readonly | Consultar respostas |
| drive.file | Trabalhar com os arquivos criados/usados pela integração, incluindo compartilhamento do formulário e miniaturas |

Não substitua esses escopos por acesso irrestrito a todos os calendários ou a todo o Drive. [Escopos do Calendar](https://developers.google.com/workspace/calendar/api/auth).

### Expiração no modo de teste

Aplicativos externos em Testing podem receber refresh tokens com validade de sete dias quando pedem permissões além das básicas de identificação. O Studio pedirá reconexão quando a autorização expirar ou for revogada. Para uso contínuo/distribuição, avalie mover para Production e seguir a eventual verificação exigida pelo Google; não presuma que publicar remove todos os requisitos. [Regras de expiração](https://developers.google.com/identity/protocols/oauth2#expiration).

## 8. Criar as credenciais OAuth

1. Em **Google Auth Platform → Clients / Clientes**, escolha **Create client / Criar cliente**.
2. Selecione **Web application / Aplicativo da Web**.
3. Dê um nome, por exemplo **Studio local**.
4. Em **Authorized redirect URIs / URIs de redirecionamento autorizados**, adicione exatamente:

```text
http://127.0.0.1:3000/api/google/callback
http://localhost:3000/api/google/callback
```

5. Não acrescente barra final, não mude http para https na execução local e não remova o caminho `/api/google/callback`.
6. Para outra porta, copie os valores mostrados na tela do Studio em vez dos exemplos acima.
7. Crie o cliente e baixe o JSON de credenciais. Guarde esse arquivo em local privado. Não o envie ao cliente final, em conversas ou no repositório do projeto.

Neste fluxo, a troca é feita no backend. Não é necessário configurar JavaScript origins para uma biblioteca de login no navegador.

O Client ID costuma terminar em `.apps.googleusercontent.com`. O Client secret vem no arquivo baixado. Você pode precisar guardar o segredo quando ele for apresentado, pois o Google pode não permitir consultá-lo novamente. [Credenciais OAuth Web](https://developers.google.com/identity/protocols/oauth2/web-server).

## 9. Importar as credenciais no Studio

1. Volte ao Studio e clique no nome/avatar → **Perfil e integrações**.
2. Na área **Conexão Google**, escolha o JSON em **Importar credenciais OAuth**.
3. Confira que o Client ID foi preenchido. O segredo fica em um campo de senha.
4. Clique **Salvar credenciais**.
5. O botão **Conectar Google** será habilitado.

Se preferir preencher manualmente, use o Client ID e Client secret do mesmo cliente Web. Não cole o JSON inteiro em um desses campos. Para manter um segredo já salvo, deixe o campo Client secret vazio.

Importar um JSON de cliente Desktop/Installed não funciona neste fluxo. Crie um cliente Web.

## 10. Autorizar a conta

1. Clique **Conectar Google**.
2. Escolha o Gmail do estúdio, o mesmo adicionado como usuário de teste.
3. Confira o aplicativo/projeto antes de continuar.
4. Autorize as permissões solicitadas para Agenda, Forms, respostas e arquivos do Studio. Se uma permissão necessária for desmarcada, a conexão não será concluída.
5. Aguarde o retorno ao Studio. A tela mostrará a conta conectada.

O aplicativo usa uma tentativa de conexão com validade de dez minutos, cookie local e código de uso único. Se expirar ou se você trocar de endereço durante o fluxo, inicie de novo pela tela de perfil.

Em aplicativos ainda não verificados, o Google pode exibir um aviso. Confirme que se trata do seu próprio projeto de teste e siga as políticas indicadas pelo Google; para distribuição, trate a publicação/verificação antes de pedir que outras pessoas conectem suas contas.

## 11. Primeiro teste do Google Agenda

1. Cadastre um cliente e um projeto com data de entrega próxima.
2. Abra **Agenda → Sincronizar Google Agenda**.
3. O Studio cria o calendário **Studio** na primeira sincronização.
4. Use **Abrir calendário** e confirme o evento de dia inteiro.
5. Altere a entrega no Studio e sincronize outra vez: o mesmo evento deve mudar de data, sem criar cópia.
6. Marque o projeto como Concluído: o evento será identificado com `[Concluído]` na próxima atualização.

O evento recebe título do projeto, nome do cliente, etapa e prazo. Valores, observações internas e lista de tarefas não são enviados.

Arquivar um projeto remove seu evento gerenciado na próxima sincronização. Restaurar o projeto permite republicá-lo. Compromissos pessoais e eventos que não pertencem ao Studio não são alterados.

### Conflitos

Se o evento for alterado ou excluído no Google, o Studio sinaliza o conflito em vez de sobrescrever silenciosamente. Abra Agenda, confira a mensagem e use **Republicar versão do Studio** somente se quiser substituir os dados do evento pelos dados locais.

Essa ação não transforma a integração em sincronização de duas vias. Caso queira conservar a nova data, atualize primeiro o projeto no Studio.

## 12. Gerar o primeiro link de aprovação

1. Abra **Planejamento → Novo planejamento**.
2. Escolha cliente, semana, título e orientação.
3. Adicione conteúdos com data, canal, formato, legenda e link do material, se houver.
4. Se desejar imagens no Forms, salve antes a preferência de miniaturas no perfil.
5. Clique **Gerar link Google Forms**.
6. Aguarde o link aparecer. Copie o link ou clique **Abrir**.
7. Teste em uma janela anônima ou em outro celular antes de enviar ao cliente.

O formulário é criado na conta conectada. Cada conteúdo recebe sua identificação e decisão. “Solicitar ajustes” leva a um comentário obrigatório; “Aprovar” ou “Ainda não revisei” segue para o próximo conteúdo. O visual será o do Google Forms.

O Studio configura o acesso de resposta por link. Ele não compartilha o link de edição. Se uma política da conta impedir essa configuração, a criação falhará com orientação para conferir permissões. [Publicação e respondentes](https://developers.google.com/workspace/forms/api/guides/publish-form).

### O que enviar ao cliente

Envie somente o link que aparece em **Link para enviar ao cliente**. Não envie o endereço de edição do formulário, credenciais ou backup do Studio.

Exemplo de mensagem para você copiar e enviar manualmente:

> Olá! Organizei os conteúdos da semana neste link: [cole o link]. Confira as miniaturas, datas e legendas. Em cada conteúdo, marque Aprovar, Solicitar ajustes ou Ainda não revisei. Ao solicitar ajustes, explique o que gostaria de mudar. No final, envie o formulário. Obrigado!

O aplicativo não envia mensagens ou e-mails automaticamente.

## 13. Como o cliente responde

1. Abrir o link recebido.
2. Informar o nome.
3. Conferir o conteúdo, a legenda, a data e o material.
4. Escolher uma decisão por conteúdo.
5. Descrever os ajustes quando solicitados.
6. Chegar ao final e clicar **Enviar / Submit** no Google Forms.

Não é necessário baixar/devolver arquivos. O formulário não é configurado para coletar e-mail verificado; o nome é declarado. Quem receber o link poderá responder, portanto compartilhe-o somente com as pessoas certas. Para aprovações que exijam identificação formal do revisor, será necessário acrescentar uma política de acesso/autenticação.

## 14. Receber e conferir as respostas

Abra o planejamento e clique **Atualizar aprovações**. Com a sincronização automática habilitada, o Studio também tenta buscar respostas periodicamente com a tela visível.

O card passa para **Aprovado** ou **Ajustes solicitados**, com nome, comentário e data. “Ainda não revisei” mantém o item sem uma decisão nova. Uma resposta inválida/incompleta é ignorada e sinalizada. A integração guarda um registro da importação para não reaplicar a mesma resposta repetidamente.

Se houver mais de uma resposta válida para o mesmo conteúdo e versão, prevalece a decisão com a data de envio mais recente. Aprovar no Forms não conclui automaticamente o processo de produção nem marca a publicação como postada.

## 15. Revisões, novos links e encerramento

- Alterar conteúdo cria uma nova revisão e invalida a aprovação daquele item.
- Alterar a orientação do planejamento também torna o formulário antigo desatualizado.
- O fechamento de um envio antigo no Google acontece quando o Studio consegue sincronizar. Se estiver offline, o link pode continuar aceitando respostas, mas essas respostas não aprovarão revisões novas no Studio.
- Gere um novo link e envie-o ao cliente após alterações.
- Gerar novamente um formulário que já corresponde ao mesmo conteúdo/versão e à mesma preferência de imagens reutiliza seu link.
- Use **Encerrar recebimento de respostas** para fechar um envio manualmente.

Um formulário antigo pode continuar no seu Drive como registro, e um formulário cuja criação falhou pode ficar como rascunho fechado. Exclua esses arquivos manualmente quando não precisar mais deles; o Studio não apaga seus documentos do Google silenciosamente.

## 16. Segurança, backup e troca de computador

Credenciais e tokens são criptografados no SQLite. A chave local fica em:

```text
data/google-secrets.key
```

O backup SQLite inclui perfil, dados, vínculos e os valores criptografados. Ele **não contém a chave como arquivo separado**. Para migrar a conexão para outro computador, guarde também uma cópia privada de `google-secrets.key`. Não compartilhe esse arquivo, o banco ou o JSON OAuth com o cliente final.

Sem a chave correspondente, restaure os dados normalmente, importe as credenciais novamente e reconecte a conta. Antes de sincronizar um banco restaurado, confira os vínculos e os conflitos, pois o Google pode conter eventos/respostas mais recentes que o backup.

Ao desconectar, o Studio remove o acesso local e tenta revogar a autorização no Google. Eventos, calendário, formulários e miniaturas já criados permanecem. Se houver falha de rede na revogação, remova o acesso também em [Conexões da conta Google](https://myaccount.google.com/connections).

Para trocar de Gmail, encerre primeiro os formulários ativos com a conta anterior se não quiser deixar links abertos. Formulários de outra conta ficam como histórico e não são consultados com a conta nova. A agenda da nova conta recebe seus próprios vínculos; a agenda antiga permanece na conta anterior.

O servidor atual é restrito ao computador local. Hospedar o projeto exige uma revisão própria de autenticação, banco persistente, URLs HTTPS e proteção de credenciais; não basta publicar a pasta inteira.

## 17. Resolver problemas

| Mensagem/sintoma | Verificação e solução |
| --- | --- |
| `redirect_uri_mismatch` | Compare o retorno mostrado no Studio com o registrado no cliente OAuth: protocolo, host, porta e caminho precisam coincidir. Registre localhost e 127.0.0.1 se usar ambos. |
| Acesso bloqueado em Testing | Confira se o Gmail que conecta foi adicionado como usuário de teste no projeto correto. |
| “O Google recusou o acesso” / HTTP 403 | Ative Calendar, Forms e Drive APIs no projeto do Client ID. Reconecte e autorize todos os escopos. Confira políticas de compartilhamento. |
| Reconexão solicitada depois de alguns dias | Pode ser expiração do token de teste, revogação ou mudança de credenciais. Clique Reconectar Google e revise o status de publicação do projeto. |
| “Nem todas as permissões foram autorizadas” | Refaça a conexão e permita Agenda, Forms, respostas e arquivos criados pelo Studio. |
| JSON recusado | Use credenciais OAuth Web; não Desktop, API key ou conta de serviço. |
| “A tentativa de conexão expirou” | Recomece pelo perfil. Evite trocar de navegador, host ou porta no meio do fluxo. |
| “Sem resposta do Google” | Confira internet, proxy, firewall, bloqueios do ambiente que iniciou o servidor e tente novamente. Se necessário, inicie o Studio pelo arquivo Iniciar Studio.cmd fora de uma ferramenta que restrinja rede. |
| Limite de requisições / HTTP 429 | Aguarde e tente novamente. Evite repetir cliques de sincronização. |
| Evento em conflito | Confira o evento externo; ajuste o projeto local ou republique a versão do Studio conscientemente. |
| Cliente não consegue abrir o Forms | Confirme que enviou o link de resposta e que o formulário está publicado/aceitando respostas. Teste fora da conta dona. |
| Miniatura não aparece ou geração falha com imagem | Confira a preferência, a Drive API e o compartilhamento. Tente gerar sem imagens para isolar a falha e faça um teste real com o Google antes de enviar ao cliente. |
| Aprovação não mudou o card | Clique Atualizar aprovações; confira se é o formulário da revisão atual e se o cliente clicou Enviar no final. |
| Depois de restaurar, credenciais não abrem | Restaure também a chave correspondente ou reconfigure e reconecte. |
| Perfil mudou, mas a conta Google não | O e-mail de contato do perfil é independente. Use desconectar/conectar para trocar a integração. |

## 18. Checklist antes do primeiro uso com cliente

- [ ] APIs ativadas no projeto correto.
- [ ] Cliente OAuth Web com os dois retornos registrados.
- [ ] Gmail do estúdio autorizado e exibido no Studio.
- [ ] Evento de teste criado e prazo atualizado sem duplicação.
- [ ] Conflito externo compreendido e resolvido em um projeto de teste.
- [ ] Formulário aberto em janela anônima ou celular fora da conta do estúdio.
- [ ] Miniaturas conferidas, se habilitadas.
- [ ] Resposta com aprovação recebida pelo Studio.
- [ ] Resposta com ajustes recebida com comentário.
- [ ] Revisão alterada e link antigo invalidado.
- [ ] Backup e chave guardados de forma privada.
- [ ] Cliente recebeu somente o link de resposta e o guia de uso.

## Referências oficiais

- [OAuth para aplicações Web](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Expiração de tokens](https://developers.google.com/identity/protocols/oauth2#expiration)
- [Escopos do Calendar](https://developers.google.com/workspace/calendar/api/auth)
- [Criação de eventos](https://developers.google.com/workspace/calendar/api/v3/reference/events/insert)
- [Criação de formulários](https://developers.google.com/workspace/forms/api/reference/rest/v1/forms/create)
- [Alterações em lote no Forms](https://developers.google.com/workspace/forms/api/reference/rest/v1/forms/batchUpdate)
- [Publicação e acesso de respondentes](https://developers.google.com/workspace/forms/api/guides/publish-form)
- [Consulta das respostas](https://developers.google.com/workspace/forms/api/reference/rest/v1/forms.responses/list)
- [Upload de imagens no Drive](https://developers.google.com/workspace/drive/api/guides/manage-uploads)
