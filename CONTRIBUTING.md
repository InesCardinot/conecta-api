# Como contribuir

Este repositório faz parte do Conecta, da Equipe 05. Abra uma issue com problema, comportamento esperado e evidência. Não publique dados pessoais, tokens, credenciais ou registros reais.

## Branches e revisão

- **main:** versão demonstrável e documentação coerente.
- **develop:** integração da equipe quando houver mudanças coordenadas.
- **feat/descricao-curta**, **fix/descricao-curta**, **docs/descricao-curta**: mudanças pequenas e revisáveis, partindo de develop.
- Abra PR para develop, vincule os PRs de outros repositórios e execute a CI. Promova develop para main após validar o fluxo integrado.
- Preferência por squash merge com título Conventional Commits. Tags v0.x.y por repositório identificam marcos demonstráveis.

As branches são publicadas; revisão obrigatória e proteção de branch são recomendações, não configurações presumidas. Nenhuma aprovação individual da equipe foi atribuída automaticamente.

## Conventional Commits

Formato: tipo(escopo): descrição curta. Exemplos:

```text
feat(events): adiciona coleta de preferência
fix(analytics): corrige primeiro clique por sessão
docs(readme): esclarece limites da demonstração
test(api): cobre retirada de coleta
chore(ci): configura verificação no Node 24
```

Use feat, fix, docs, refactor, test, style, perf, build, ci, chore ou revert. Uma alteração incompatível deve usar ! e explicar BREAKING CHANGE no corpo, além de plano de migração. Commits herdados mantêm sua autoria e mensagem originais.

## Padrões de código

- Node 24 e módulos ES nas adições; JavaScript para comportamento, HTML para estrutura e CSS para apresentação. JavaScript não é Java.
- UTF-8, duas posições de indentação, nomes descritivos, funções curtas e fronteiras explícitas.
- Valide entrada no servidor, use consultas parametrizadas e não exponha mensagens internas do banco.
- Use textContent para dados da API; não renderize dados como HTML.
- Não coloque token administrativo no bundle, em query string, localStorage ou arquivos versionados.
- Preserve a enumeração de eventos e documente mudanças do contrato antes de instrumentar novas interações.
- No conecta-app, mantenha o frontend herdado sem alterações amplas enquanto estiver em desenvolvimento; use integration/ e PRs separados.

## Antes de abrir PR

Execute npm ci, npm run check e npm test. No backend os testes exercitam requisições HTTP e persistência. Nos frontends, verifique também o fluxo com a API, teclado, estados de erro/vazio, CSV e telas em desktop/mobile. Um teste de sintaxe não comprova funcionalidade visual. Descreva exatamente o que foi verificado e o que não foi.
