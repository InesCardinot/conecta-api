# Verificação da entrega

Verificação local em 15/09/2026, Node.js 24.19.0, Windows. Os resultados descrevem o protótipo e não certificam um ambiente produtivo.

## Testes automatizados

| Sistema   | Resultado                                                                                                                                                             |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API       | 8 testes aprovados: fluxo de eventos, idempotência, autorização, isolamento de sessões, retirada de coleta, validação, limites, persistência, CSV, sinais e auditoria |
| App       | 1 teste aprovado: cliente só coleta após iniciar sessão, usa token próprio e interrompe após retirada                                                                 |
| Analytics | 1 teste aprovado: cliente envia Bearer no cabeçalho e trata erro de autenticação                                                                                      |
| Sintaxe   | npm run check aprovado nos três repositórios                                                                                                                          |

Execute npm ci, npm run check, npm test e npm run format:check para repetir as verificações automatizadas. Os testes HTTP sobem servidores temporários e não alteram a base de demonstração.

## Navegador e dados reais do protótipo

- API com seed: 37 eventos, 6 perfis fictícios e 9 sessões.
- App: sessão iniciada e dois cliques em Ajuda aumentaram a base para 40 eventos e 10 sessões.
- O primeiro clique dessa sessão apareceu como Ajuda, com 9 primeiros cliques anteriores em Explorar oportunidades.
- Retirada da coleta pela interface removeu os três eventos da sessão; a base voltou a 37 eventos e 9 sessões.
- Analytics: conexão com token local, gráficos e jornadas carregados da API.
- Filtro Tecnologia: 12 eventos, 2 perfis, 3 sessões e 1 perfil com retorno.
- Ação alterada de Aberta para Planejada pela interface, com registro correspondente na auditoria.
- Exportação CSV acionada pela interface e resposta confirmada; conteúdo e ausência de dados cadastrais também cobertos pelo teste da API.
- Telas novas inspecionadas em desktop e largura móvel de 390px; nenhuma rolagem horizontal detectada nessa largura.
- Nenhum erro de JavaScript reportado pelo navegador durante os fluxos executados.

## Preservação e limites

Os cinco arquivos de código do frontend de origem foram comparados com o conteúdo Git da revisão 65a0705c7e9ae1a98ce9396b204cef268b0997eb. O manifesto de hashes está no conecta-app em docs/source-baseline.json. A documentação e os novos módulos ficam separados.

Não foram verificados login real, integração Petronect, envio de mensagens, dados reais, carga produtiva, migração MariaDB ou hospedagem online porque não estão implementados. As telas originais permanecem em desenvolvimento; a evidência ponta a ponta usa demo.html.

Os checks do GitHub Actions são publicados junto com os repositórios; consulte a aba Actions para o resultado remoto de cada commit.
