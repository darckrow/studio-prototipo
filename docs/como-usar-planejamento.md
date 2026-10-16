# Planejamento e aprovação

1. Abra **Planejamento → Novo planejamento**. Escolha cliente, semana, título e a orientação que o cliente receberá.
2. Clique **Adicionar conteúdo** ou **+ Adicionar** no dia desejado. Informe título, canal, formato e data. Inclua legenda, miniatura e link do material. O vínculo com um projeto é opcional.
3. Use **Baixar para aprovação**. Envie o HTML baixado como arquivo ao cliente por WhatsApp/e-mail. Cada novo envio substitui o anterior.
4. Oriente o cliente a baixar o HTML e abri-lo no navegador. Ele informa o nome, aprova conteúdos ou solicita ajustes com comentário, e clica **Baixar respostas**. As prévias de alguns mensageiros não executam os controles; nesse caso, abrir no navegador de um computador.
5. Receba o JSON devolvido e use **Importar respostas** no planejamento correspondente. Os cards mostram as decisões e comentários.

O arquivo é independente do servidor local. Não inclui financeiro, contatos, briefing interno ou outros clientes. Não é um link online: a troca dos arquivos é manual. Respostas não são enviadas automaticamente, e o nome informado pelo revisor não passa por autenticação.

Alterar um conteúdo cria nova versão e volta a situação para **Rascunho**. Salvar sem mudanças preserva a aprovação. Se um conteúdo ou orientação mudar, exporte novamente antes de pedir outra revisão. Respostas de envios antigos não são aceitas. Uma resposta importada não pode ser reutilizada; para responder os conteúdos restantes, faça um novo envio.

## Produção e publicação

Abra um projeto e localize **Processo de produção**. Marque as etapas conforme forem concluídas: briefing, roteiro, aprovação do roteiro, gravação, edição, aprovação do filme completo e finalização. As marcações são salvas imediatamente. O card mostra a primeira pendência e o total concluído, e a etapa geral do quadro acompanha o processo.

Para marcar **Finalizado**, conclua as seis etapas anteriores. Desmarcar uma etapa reabre o processo e retira Finalizado; preserva as demais marcações e as tarefas livres.

Em **Publicação**, marque **Já foi postado**, informe data e link se desejar e clique **Salvar publicação**. O projeto precisa estar Concluído. Para reabrir a produção de algo já publicado, salve primeiro como não postado. Este controle não publica conteúdo nas redes sociais.

Projetos antigos conservam a etapa geral, com checklist inicialmente vazio. O Studio não presume que etapas antigas foram cumpridas. Clientes/projetos arquivados precisam ser restaurados antes de editar seus dados.

## Dados e backup

Tudo permanece no SQLite local, incluindo miniaturas, processos e aprovações. A migração para a versão 2 guarda automaticamente uma cópia anterior em `data/backups/antes-migracao-v2-*.sqlite`. O backup normal inclui os novos dados. O restaurador aceita backups v1, v2 e v3; bases antigas são migradas na abertura seguinte.
