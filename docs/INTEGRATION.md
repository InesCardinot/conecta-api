# Executar os três sistemas

## Requisitos

Git, Node.js 24.x e npm. Banco SQLite embutido no Node: não é necessário instalar MariaDB para esta versão. Alguns Node 24 emitem aviso de API experimental para node:sqlite; mantenha a versão documentada. Os frontends novos não exigem build ou CDN; as telas herdadas dependem de CDNs externos para Tailwind/Lucide/fontes.

```sh
git clone https://github.com/SouBeatrizKaroline/conecta-app.git
git clone https://github.com/SouBeatrizKaroline/conecta-api.git
git clone https://github.com/SouBeatrizKaroline/conecta-analytics.git
```

### Terminal 1: API

```sh
cd conecta-api
npm ci
npm run setup
npm run seed
npm test
npm start
```

setup cria .env com token aleatório e escrita local, sem sobrescrever arquivo existente. Abra o .env local para copiar ADMIN_TOKEN ao painel. O token não é exibido em logs nem enviado ao GitHub. seed insere 37 eventos de seis empresas fictícias apenas quando a base não tem eventos. A idade dos eventos é relativa ao dia de execução, para demonstrar sinais.

### Terminal 2: frontend do usuário

```sh
cd conecta-app
npm ci
npm start
```

Abra http://127.0.0.1:8080/demo.html. Escolha perfil fictício e habilite coleta, depois explore oportunidades ou ajuda. home.html, index.html, oportunidades.html, script.js e styles.css mantêm o conteúdo original. A página demo.html e integration/ fazem a integração sem alterar esses arquivos.

### Terminal 3: Analytics

```sh
cd conecta-analytics
npm ci
npm start
```

Abra http://127.0.0.1:8081, informe a API e ADMIN_TOKEN e conecte. Atualize após interagir com a jornada. Abra um perfil para ver a sequência, altere um sinal para “Planejada” e exporte CSV.

## Roteiro demonstrável de ponta a ponta

1. Com a base inicial: 37 eventos, 6 perfis, 9 sessões, 3 perfis com retorno e 1 com conclusão.
2. Na página demonstrativa, inicie uma sessão: um page_view é registrado.
3. Clique duas vezes em ajuda ou oportunidades e atualize o Analytics.
4. Observe a nova sessão, o primeiro clique e a timeline do perfil.
5. Revise a recomendação e registre o estado da ação. Consulte a auditoria no painel.
6. Exporte CSV com o mesmo período/segmento; os dados vêm da API.
7. Volte à jornada e desative a coleta. Atualize o painel: os eventos daquela sessão foram removidos; a carga inicial continua disponível.

## Modo de leitura para apresentação pública

No backend, use DEMO_READ_ONLY=true com uma base exclusivamente fictícia. GET administrativos passam a dispensar token e todas as gravações ficam bloqueadas. A API deve estar atrás de HTTPS; configure HOST/PORT e ALLOWED_ORIGINS no provedor. Não inclua .env, banco ou tokens em hospedagem estática. A publicação de aplicação/hospedagem é uma etapa separada da publicação dos repositórios.

## Problemas comuns

| Sintoma                                 | Verificação                                                                                     |
| --------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Dados indisponíveis / Failed to fetch   | API iniciada? Endereço correto? Origem e porta incluídas em ALLOWED_ORIGINS?                    |
| 401 no Analytics                        | Use o ADMIN_TOKEN do .env da API em execução; não o token de sessão                             |
| 403 ao iniciar jornada                  | DEMO_READ_ONLY deve ser false na demonstração local de escrita                                  |
| Cadastro original não aparece no painel | Integração deliberadamente isolada em demo.html; formulários originais não enviam eventos à API |
| Nenhum evento no painel                 | Execute seed numa base vazia, ajuste filtros ou registre a jornada demonstrativa                |
| Contagens não mudam                     | Clique em Atualizar análise; o painel não faz atualização em tempo real                         |
| Porta ocupada                           | Defina PORT e atualize as origens/endereços correspondentes                                     |
