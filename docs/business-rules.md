# Regras de negócio reais

## Usuários e organizações

- Usuário possui role `admin` ou `user`.
- Rotas administrativas exigem role `admin`.
- Organizações possuem membros e `memberIds`.
- Uma solicitação de acesso é identificada pelo usuário dentro da subcoleção `accessRequests`.
- A aprovação de acesso adiciona membro à organização, remove solicitação e atualiza o documento do usuário.
- Domínio de e-mail normalizado pode ser usado para associação automática à organização.

## Lojas

- Loja pertence a uma organização por `organizationId`.
- Loja possui colunas de ambiente; quando ausentes, o código normaliza para colunas padrão.
- Contadores de cenários (`scenarioCount`, `automatedScenarioCount`, `notAutomatedScenarioCount`) são mantidos durante criação/atualização/exclusão de cenários.
- Cenário possui automação e criticidade normalizadas por utilitários compartilhados.
- Categoria possui `searchName` para ordenação/busca normalizada.
- Categoria não é removida se existir cenário usando aquela categoria.
- Suites agrupam cenários por `scenarioIds`.

## Ambientes

- Status de ambiente: `backlog`, `in_progress`, `done`.
- Status de cenário em ambiente: `pendente`, `em_andamento`, `bloqueado`, `concluido`, `concluido_automatizado`, `nao_se_aplica`.
- Ambientes registram participantes, usuários presentes, responsável por conclusão e controle de tempo.
- Evidência de cenário pode ser link ou arquivo; arquivo é enviado ao Storage e gravado como URL.
- Compartilhamento público usa `/environments/public` e parâmetro de consulta para localizar ambiente.
- Exportação/cópia de resumo usa dados do ambiente, participantes, loja e organização.

## Preferências

- Preferências incluem tema `light`, `dark` ou `system` e idioma `pt` ou `en`.
- Preferências são persistidas localmente e no perfil quando há usuário autenticado.

## Integrações

- Webhook Slack deve estar configurado; se ausente, o envio lança erro.
- Credenciais BrowserStack são apenas armazenadas; não há execução de automação BrowserStack neste código.
