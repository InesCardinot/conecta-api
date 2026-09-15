# Origem e evolução

## Bases fornecidas pela equipe

| Uso                              | Repositório                                                                                                                       | Revisão consultada                       |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| Frontend preservado              | [SouBeatrizKaroline/HackathonConexaoAncestral_Equipe05](https://github.com/SouBeatrizKaroline/HackathonConexaoAncestral_Equipe05) | 65a0705c7e9ae1a98ce9396b204cef268b0997eb |
| Backend e conceitos de analytics | [InesCardinot/HackathonConexaoAncestral_Equipe05](https://github.com/InesCardinot/HackathonConexaoAncestral_Equipe05)             | bd01e4ad6b2e3d0b95eda9f5a182d0d96628a744 |

Os links de origem podem exigir acesso. Os três novos repositórios contêm a implementação/documentação necessária para a banca, sem depender da abertura desses links. O histórico Git do conecta-app preserva a origem; API e Analytics documentam a linhagem, com novos históricos para as novas estruturas.

## Mapeamento da refatoração

| Base anterior                                 | Nova organização                                          | Motivo                                                               |
| --------------------------------------------- | --------------------------------------------------------- | -------------------------------------------------------------------- |
| app-integrado.js monolítico                   | src/app.js + services/analytics.js + validation.js        | Fronteiras HTTP e regras separadas                                   |
| database.js com conexão MariaDB e root padrão | db/database.js + schema.sql SQLite                        | Demo local reproduzível sem servidor externo                         |
| usuarios, representantes, CPF/CNPJ/email      | profiles fictícios                                        | Minimizar o escopo ao desafio de jornada                             |
| acessos, cliques e login_history              | sessions + events                                         | Capturar primeiro clique, sequência e frequência de modo consistente |
| preferencias e aceita_lgpd                    | consentimento explícito da sessão + preference events     | Separar coleta de interesses e evitar falsa alegação de conformidade |
| SQL montado por interpolação de filtros       | validação e placeholders SQL                              | Impedir injeção e erros de filtro                                    |
| express.static('.') e exports automáticos     | nenhuma raiz estática na API; CSV autenticado sob demanda | Evitar exposição de fontes, configuração e relatórios                |
| telas cadastrais sem Analytics separado       | frontend Analytics com API própria                        | Gestão independente da experiência do usuário                        |

A base original não possuía frontend administrativo funcional separado. O novo Analytics foi criado para consumir a API refatorada, derivando as categorias de acesso, clique, interesse e relatório da base de Ines. Não copiamos endpoints de cadastro para aparentar identificação real no protótipo.

Não há migração automática nem compatibilidade com /api/usuarios, /api/rastrear-clique ou /api/dashboard-1. O contrato atual começa em /api/v1. Clientes antigos precisam do adaptador documentado.
