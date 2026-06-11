# Integrações

## Firebase Auth

Usado para:

- Registro com e-mail/senha.
- Login com e-mail/senha.
- Login com Google.
- Login com GitHub.
- Logout.
- Reset de senha.
- Observação de sessão com `onAuthStateChanged`.
- Atualização de perfil do Firebase Auth e persistência complementar em `users`.

## Firestore

Usado para dados de usuários, organizações, solicitações de acesso, lojas, cenários, suites, categorias e ambientes. Há leituras cache-first/cache-then-server em `infrastructure/external/firestoreCache.ts` e cache em memória/local em `infrastructure/cache`.

## Firebase Storage

Usado para:

- Foto de perfil.
- Logo de organização.
- Logo de loja quando fornecido por upload.
- Evidência de cenário quando a evidência é um arquivo.

## Slack Webhook

`sendEnvironmentSummaryToSlack` envia um `POST` para o webhook configurado. O payload final é `{ text }`, onde o texto é mensagem explícita ou resultado de `formatExecutionReportToSlack`.

## BrowserStack

O código atual define e armazena `BrowserstackCredentials` em usuário/organização. Não há chamada HTTP/API para BrowserStack no repositório.

## Exportações locais

- Excel: `src/utils/exportExcel.ts` usa ExcelJS e file-saver.
- PDF/print: `openScenarioPdf` monta HTML em uma janela e chama `print()`.
- Markdown: ambientes podem ser copiados como Markdown.
