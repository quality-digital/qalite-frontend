# Banco de dados

## Tecnologia

Firestore é o banco persistente. `src/infrastructure/database/firebase.ts` inicializa Firestore com cache local persistente multiaba.

## Coleções e subcoleções reais

### `users`

Usada por autenticação, busca de usuários e vínculo com organizações.

Campos observados pelo código:

- `uid`/id do documento.
- `email`, `displayName`, `firstName`, `lastName`, `photoURL`.
- `role`: `admin` ou `user`.
- `organizationId`.
- `browserstackCredentials`.
- `preferences` com `theme` e `language`.
- `isEmailVerified` derivado do Firebase Auth.
- timestamps de criação/atualização conforme persistência do perfil.

### `organizations`

Campos mapeados:

- `name`, `description`, `logoUrl`, `slackWebhookUrl`, `emailDomain`.
- `browserstackCredentials`.
- `members` e `memberIds`.
- `createdAt`, `updatedAt`.

Subcoleção:

- `organizations/{organizationId}/accessRequests` com `organizationId`, `userId`, `email`, `displayName`, `photoURL`, `createdAt`, `updatedAt`.

### `stores`

Campos mapeados:

- `organizationId`, `name`, `site`, `stage`, `environmentColumns`, `logoUrl`, `slackWebhookUrl`.
- `scenarioCount`, `automatedScenarioCount`, `notAutomatedScenarioCount`.
- `createdAt`, `updatedAt`.

Subcoleções:

- `stores/{storeId}/scenarios`: `title`, `category`, `automation`, `criticality`, `observation`, `bdd`, timestamps.
- `stores/{storeId}/suites`: `name`, `description`, `scenarioIds`, timestamps.
- `stores/{storeId}/categories`: `name`, `searchName`, timestamps.

### `environments`

Campos mapeados:

- `identificador`, `storeId`, `suiteId`, `suiteName`.
- `urls`, `jiraTask`, `tipoAmbiente`, `tipoTeste`, `momento`, `release`.
- `status`: `backlog`, `in_progress`, `done`.
- `timeTracking`: `start`, `end`, `totalMs`.
- `presentUsersIds`, `concludedBy`, `participants`.
- `scenarios`: mapa de cenários copiados para a execução.
- `totalCenarios`, `publicShareLanguage`, `environmentColumns`.
- `createdAt`, `updatedAt`.

## Storage

O código usa Firebase Storage para uploads de fotos/logos/evidências. O helper `uploadFileAndGetUrl` cria nome de arquivo seguro e retorna URL pública via `getDownloadURL`.

## ERD

Veja [database-erd.puml](./diagrams/database-erd.puml).
