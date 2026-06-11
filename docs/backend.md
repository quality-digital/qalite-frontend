# Backend

## Situação real

Não existe backend próprio no repositório. Não há pasta de servidor, controllers, middlewares HTTP, models ORM, migrations ou endpoints Node/Express/Nest.

## Serviços externos usados como backend

- Firebase Auth para autenticação.
- Firestore para banco de dados.
- Firebase Storage para arquivos.
- Slack Webhook para notificações.

## Variável de serviço não utilizada

`.env.example` declara `VITE_QALITE_SERVICE_URL`, mas nenhuma referência a essa variável existe no código `src`. Portanto ela não representa uma integração ativa documentável além de potencial resíduo/configuração futura.

## Implicações

- Regras de segurança críticas devem estar nas regras Firebase, que não estão versionadas neste repositório.
- Webhooks Slack são chamados diretamente do navegador, o que expõe a URL ao cliente quando configurada.
- Não há camada server-side para sanitização adicional, auditoria ou rate limiting além do que Firebase/Slack oferecem.
